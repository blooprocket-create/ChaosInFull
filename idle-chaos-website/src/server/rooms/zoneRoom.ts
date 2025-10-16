// In-memory ZoneRoom manager. Authoritative for combat state in this MVP.
// Not clustered; single-process only. For production, move to a real server + shared store.

export type PhaseType = "personal" | "party" | "event";

type Vec2 = { x: number; y: number };
export type Mob = { id: string; templateId: string; hp: number; maxHp: number; level: number; pos: Vec2 };
type Contribution = { damage: number; healing: number; timeActive: number };

type PlayerState = {
  characterId: string;
  zone: string;
  phaseId: string;
  hp: number;
  maxHp: number;
  auto: boolean;
  lastBasicAt: number;
};

type Phase = {
  id: string;
  type: PhaseType;
  zone: string;
  members: Set<string>; // characterIds
  mobs: Map<string, Mob>;
  contrib: Map<string, Map<string, Contribution>>; // mobId -> (charId -> contribution)
  budget: number;
};

type Party = { id: string; leaderId: string; members: Set<string>; phaseId: string };

class ZoneRoom {
  zone: string;
  players = new Map<string, PlayerState>();
  phases = new Map<string, Phase>();
  parties = new Map<string, Party>();
  tickHandle: NodeJS.Timeout | null = null;

  constructor(zone: string) {
    this.zone = zone;
    this.tickHandle = setInterval(() => this.tick(), 100); // 10 Hz logic
  }

  private uid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

  private ensurePersonalPhase(charId: string): Phase {
    const p = Array.from(this.phases.values()).find(ph => ph.type === "personal" && ph.members.has(charId));
    if (p) return p;
    const id = this.uid("phase");
    const phase: Phase = { id, type: "personal", zone: this.zone, members: new Set([charId]), mobs: new Map(), contrib: new Map(), budget: 6 };
    this.phases.set(id, phase);
    return phase;
  }

  join(charId: string) {
    const phase = this.ensurePersonalPhase(charId);
    const ps: PlayerState = { characterId: charId, zone: this.zone, phaseId: phase.id, hp: 100, maxHp: 100, auto: false, lastBasicAt: 0 };
    this.players.set(charId, ps);
    return ps;
  }

  createParty(leaderId: string) {
    const leader = this.players.get(leaderId) || this.join(leaderId);
    // Create a party phase and move leader into it
    const partyId = this.uid("pty");
    const phaseId = this.uid("phase");
    const partyPhase: Phase = { id: phaseId, type: "party", zone: this.zone, members: new Set([leaderId]), mobs: new Map(), contrib: new Map(), budget: 8 };
    this.phases.set(phaseId, partyPhase);
    const p: Party = { id: partyId, leaderId, members: new Set([leaderId]), phaseId };
    this.parties.set(partyId, p);
    leader.phaseId = phaseId;
    return { partyId, phaseId };
  }

  joinParty(partyId: string, charId: string) {
    const party = this.parties.get(partyId); if (!party) throw new Error("party_not_found");
    party.members.add(charId);
    const member = this.players.get(charId) || this.join(charId);
    member.phaseId = party.phaseId;
    const phase = this.phases.get(party.phaseId)!; phase.members.add(charId);
    // Slightly raise budget with size
    phase.budget = 6 + Math.min(4, party.members.size * 2);
    return true;
  }

  toggleAuto(charId: string, v: boolean) {
    const ps = this.players.get(charId); if (!ps) return false;
    ps.auto = v; return true;
  }

  private ensureSpawnsForPhase(phase: Phase) {
    // Drip spawns until budget met
    if (phase.mobs.size >= phase.budget) return;
    const need = phase.budget - phase.mobs.size;
    for (let i = 0; i < need; i++) {
      const id = this.uid("mob");
      const lvl = 1; // MVP: static level
      const hp = 30;
      // Spawn at fixed slots to avoid visible teleport jitter; keep Y at ground (- for client animation)
      const slot = (phase.mobs.size + i) % 5;
      const x = 100 + slot * 80; // evenly spaced baseline
      const mob: Mob = { id, templateId: "slime", hp, maxHp: hp, level: lvl, pos: { x, y: 0 } };
      phase.mobs.set(id, mob);
      phase.contrib.set(id, new Map());
    }
  }

  // Positioning is client-relative; we don't simulate map pathing in MVP
  snapshot(charId: string) {
    const ps = this.players.get(charId); if (!ps) throw new Error("not_joined");
    const phase = this.phases.get(ps.phaseId)!;
    this.ensureSpawnsForPhase(phase);
    const mobs = Array.from(phase.mobs.values());
    return { player: { hp: ps.hp, maxHp: ps.maxHp }, mobs };
  }

  basicAttack(charId: string, hintX?: number) {
    const now = Date.now();
    const ps = this.players.get(charId); if (!ps) throw new Error("not_joined");
    if (now - ps.lastBasicAt < 600) return { hit: false, reason: "cooldown" };
    ps.lastBasicAt = now;
    const phase = this.phases.get(ps.phaseId)!;
    // Pick the nearest alive mob to hintX if provided; else first
    const candidates = Array.from(phase.mobs.values()).filter(m => m.hp > 0);
    let target: Mob | undefined;
    if (hintX !== undefined && candidates.length) {
      target = candidates.reduce((best, m) => {
        const d = Math.abs(m.pos.x - hintX);
        const bd = Math.abs((best?.pos.x ?? m.pos.x) - hintX);
        return d < bd ? m : best;
      }, candidates[0]);
    } else {
      target = candidates[0];
    }
    if (!target) return { hit: false, reason: "no_target" };
    const dmg = 8; // MVP static damage
    target.hp = Math.max(0, target.hp - dmg);
    // Contributions
    const contribMap = phase.contrib.get(target.id)!;
    const c = contribMap.get(charId) || { damage: 0, healing: 0, timeActive: 0 };
    c.damage += dmg; contribMap.set(charId, c);
    const killed = target.hp <= 0;
    return { hit: true, dmg, killed, mobId: target.id };
  }

  harvestRewardsIfDead(mobId: string) {
    // Compute contribution shares and remove mob
    let phase: Phase | undefined;
    for (const ph of this.phases.values()) { if (ph.mobs.has(mobId)) { phase = ph; break; } }
    if (!phase) return null;
    const mob = phase.mobs.get(mobId)!;
    if (mob.hp > 0) return null;
    const contrib = phase.contrib.get(mobId) || new Map();
    const total = Array.from(contrib.values()).reduce((s, v) => s + v.damage, 0) || 1;
    const expBase = 5;
    const rewards = Array.from(contrib.entries()).map(([charId, v]) => {
      // Floor for supports (MVP: treat low damage as floor 10%)
      const ratio = Math.max(0.1, v.damage / total);
      return { characterId: charId, exp: Math.round(expBase * ratio) };
    });
    // 100% to owner if personal
    if (phase.type === "personal") {
      const ownerId = Array.from(phase.members)[0];
      // Remove the mob and its contrib before returning to avoid budget lock
      const removed = phase.mobs.get(mobId);
      phase.mobs.delete(mobId);
      phase.contrib.delete(mobId);
      // Delayed respawn to avoid instant pop-in
      setTimeout(() => this.ensureSpawnsForPhase(phase), 1200);
      return { templateId: mob.templateId, rewards: [{ characterId: ownerId, exp: expBase }] };
    }
    // Party/event: proportional rewards
    phase.mobs.delete(mobId); phase.contrib.delete(mobId);
    return { templateId: mob.templateId, rewards };
  }

  tick() {
    // Minimal bounce animation state on server could be added later. For now, no server-side AI.
  }
}

const rooms = new Map<string, ZoneRoom>();
export function getZoneRoom(zone: string) {
  let r = rooms.get(zone);
  if (!r) { r = new ZoneRoom(zone); rooms.set(zone, r); }
  return r;
}
