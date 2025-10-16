// In-memory ZoneRoom manager. Authoritative for combat state in this MVP.
import { prisma } from "@/src/lib/prisma";
// Local minimal types to avoid `any` while not depending on generated Prisma types at build-time
type DropEntryRow = { itemId: string; weight: number; minQty: number; maxQty: number };
type EnemyTemplateRow = { id: string; name: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number; dropTable?: { id: string; entries?: DropEntryRow[] } | null };
type SpawnConfigRow = { templateId: string; budget: number; respawnMs: number; slots: unknown; phaseType: string };
type PrismaLoose = {
  zoneDef: {
    findUnique: (args: { where: { id: string }; include?: { spawns: boolean } }) => Promise<{ id: string; spawns?: SpawnConfigRow[] } | null>;
    upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; name: string; sceneKey: string } }) => Promise<void>;
  };
  enemyTemplate: {
    upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; name: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number } }) => Promise<void>;
    findMany: (args: { include: { dropTable: { include: { entries: boolean } } } }) => Promise<EnemyTemplateRow[]>;
  };
  dropTable: {
    upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; templateId: string } }) => Promise<void>;
  };
  itemDef: {
    upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; name: string; sell: number; description: string } }) => Promise<void>;
  };
  dropEntry: {
    findMany: (args: { where: { dropTableId: string; itemId: string } }) => Promise<Array<{ id: string }>>;
    create: (args: { data: { dropTableId: string; itemId: string; weight: number; minQty: number; maxQty: number } }) => Promise<void>;
  };
  spawnConfig: {
    create: (args: { data: { zoneId: string; templateId: string; budget: number; respawnMs: number; slots: number[]; phaseType: string } }) => Promise<void>;
  };
};
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
  lastSeenAt: number; // for idle cleanup
  dmgPerHit: number; // derived from class/main stat/level/weapon
  atkMs: number; // basic attack cooldown in ms
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
  // Cached content
  private contentLoaded = false;
  private spawnCfg: Array<{ templateId: string; budget: number; respawnMs: number; slots: number[]; phaseType: PhaseType }> = [];
  private templates = new Map<string, { id: string; name: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number; dropTableId?: string | null }>();
  private drops = new Map<string, Array<{ itemId: string; weight: number; minQty: number; maxQty: number }>>();

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

  private detachFromCurrentPhase(charId: string) {
    const ps = this.players.get(charId);
    if (!ps) return;
    const oldPhaseId = ps.phaseId;
    if (!oldPhaseId) return;
    const oldPhase = this.phases.get(oldPhaseId);
    if (!oldPhase) return;
    // Remove the member from the previous phase
    oldPhase.members.delete(charId);
    // If the previous phase is now empty, drop it to avoid leaking unreachable phases
    if (oldPhase.members.size === 0) {
      this.phases.delete(oldPhaseId);
    }
  }

  join(charId: string) {
    // Lazy-load content once
    if (!this.contentLoaded) {
      // Fire and forget; first snapshot/attack will await if needed
      void this.loadContent().catch(()=>{});
    }
    // If the room had idled and cleared the interval, re-arm it on first join
    if (!this.tickHandle) {
      this.tickHandle = setInterval(() => this.tick(), 100);
    }
    const phase = this.ensurePersonalPhase(charId);
    const ps: PlayerState = { characterId: charId, zone: this.zone, phaseId: phase.id, hp: 100, maxHp: 100, auto: false, lastBasicAt: 0, lastSeenAt: Date.now(), dmgPerHit: 8, atkMs: 600 };
    this.players.set(charId, ps);
    // Compute damage using a simple formula based on class and stats; cache on PlayerState
    void this.computeAndCacheDamage(charId).catch(()=>{});
    return ps;
  }

  private async computeAndCacheDamage(charId: string) {
    const ps = this.players.get(charId); if (!ps) return;
    try {
      // Load character for class/userId
      const ch = await prisma.character.findUnique({ where: { id: charId }, select: { userId: true, class: true, level: true, id: true } });
      if (!ch) return;
      const stats = await prisma.playerStat.findUnique({ where: { userId: ch.userId }, select: { strength: true, agility: true, intellect: true, luck: true } });
      const cls = (ch.class || "Beginner").toLowerCase();
      const main = cls.includes("horror") ? (stats?.strength ?? 1)
                 : cls.includes("occult") ? (stats?.intellect ?? 1)
                 : cls.includes("shade") ? (stats?.agility ?? 1)
                 : (stats?.luck ?? 1);
      // Basic weapon bonus: if the player has a copper dagger, add a small damage bonus
      const hasDagger = !!(await prisma.itemStack.findUnique({ where: { characterId_itemKey: { characterId: charId, itemKey: "copper_dagger" } }, select: { count: true } }))?.count;
      const weaponBonus = hasDagger ? 3 : 1; // 1 if bare hands, +3 if dagger present
      // Level scaling keeps early damage near previous static 8
      const levelBonus = Math.floor((ch.level ?? 1) / 2);
      const dmg = Math.max(1, Math.floor(6 + main + levelBonus + weaponBonus));
      ps.dmgPerHit = dmg;
      ps.atkMs = 600;
    } catch {}
  }

  private async loadContent() {
    if (this.contentLoaded) return;
  const client = prisma as unknown as PrismaLoose;
  const zone = await client.zoneDef.findUnique({ where: { id: this.zone }, include: { spawns: true } }).catch(()=>null);
    if (!zone) {
      // Fallback: create defaults for Slime zone
  await client.zoneDef.upsert({ where: { id: this.zone }, update: {}, create: { id: this.zone, name: `${this.zone} Zone`, sceneKey: this.zone } });
  await client.enemyTemplate.upsert({ where: { id: "slime" }, update: {}, create: { id: "slime", name: "Slime", level: 1, baseHp: 30, expBase: 5, goldMin: 1, goldMax: 3 } });
  await client.dropTable.upsert({ where: { id: "slime_default" }, update: {}, create: { id: "slime_default", templateId: "slime" } });
  await client.itemDef.upsert({ where: { id: "slime_goop" }, update: {}, create: { id: "slime_goop", name: "Slime Goop", sell: 1, description: "Jiggly residue" } });
      // Ensure an entry exists (id is cuid, skip if exists)
      const entries = await client.dropEntry.findMany({ where: { dropTableId: "slime_default", itemId: "slime_goop" } });
      if (!entries.length) {
        await client.dropEntry.create({ data: { dropTableId: "slime_default", itemId: "slime_goop", weight: 35, minQty: 1, maxQty: 1 } });
      }
      await client.spawnConfig.create({ data: { zoneId: this.zone, templateId: "slime", budget: 6, respawnMs: 1200, slots: [100,180,260,340,420], phaseType: "personal" } }).catch(()=>{});
    }
    const z = await client.zoneDef.findUnique({ where: { id: this.zone }, include: { spawns: true } });
    const spawns = (z?.spawns as SpawnConfigRow[]) ?? [];
    this.spawnCfg = spawns.map(s => ({ templateId: s.templateId, budget: s.budget, respawnMs: s.respawnMs, slots: (Array.isArray(s.slots) ? (s.slots as number[]) : [100,180,260,340,420]), phaseType: ((s.phaseType || "personal") as PhaseType) }));
    const tpls = await client.enemyTemplate.findMany({ include: { dropTable: { include: { entries: true } } } });
    for (const t of tpls) {
      const tpl = t as EnemyTemplateRow;
      this.templates.set(tpl.id, { id: tpl.id, name: tpl.name, level: tpl.level ?? 1, baseHp: tpl.baseHp, expBase: tpl.expBase, goldMin: tpl.goldMin, goldMax: tpl.goldMax, dropTableId: tpl.dropTable?.id ?? null });
      if (tpl.dropTable?.entries && tpl.dropTable.entries.length) {
        this.drops.set(tpl.dropTable.id, tpl.dropTable.entries.map((e: DropEntryRow) => ({ itemId: e.itemId, weight: e.weight, minQty: e.minQty, maxQty: e.maxQty })));
      }
    }
    this.contentLoaded = true;
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
    // Detach from any existing phase (commonly a personal phase created on join)
    if (leader.phaseId !== phaseId) {
      this.detachFromCurrentPhase(leaderId);
    }
    leader.phaseId = phaseId;
    return { partyId, phaseId };
  }

  joinParty(partyId: string, charId: string) {
    const party = this.parties.get(partyId); if (!party) throw new Error("party_not_found");
    party.members.add(charId);
    const member = this.players.get(charId) || this.join(charId);
    // Remove the member from any existing phase before transitioning them into the party phase
    if (member.phaseId !== party.phaseId) {
      this.detachFromCurrentPhase(charId);
    }
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
    if (phase.mobs.size >= phase.budget) return;
    const matching = this.spawnCfg.filter(c => c.phaseType === phase.type);
    const configs = matching.length ? matching : this.spawnCfg;
    for (const cfg of configs) {
      if (!cfg) continue;
      const tpl = this.templates.get(cfg.templateId);
      const budget = cfg.budget ?? 0;
      if (budget <= 0) continue;
      const existing = Array.from(phase.mobs.values()).filter(m => m.templateId === cfg.templateId).length;
      let remainingForTemplate = Math.max(0, budget - existing);
      let spawnOffset = 0;
      while (remainingForTemplate > 0 && phase.mobs.size < phase.budget) {
        const id = this.uid("mob");
        const hp = tpl?.baseHp ?? 30;
        const lvl = tpl?.level ?? 1;
        const slots = cfg.slots ?? [100, 180, 260, 340, 420];
        const slotIndex = (existing + spawnOffset) % Math.max(1, slots.length);
        const x = slots[slotIndex];
        const mob: Mob = { id, templateId: tpl?.id || cfg.templateId, hp, maxHp: hp, level: lvl, pos: { x, y: 0 } };
        phase.mobs.set(id, mob);
        phase.contrib.set(id, new Map());
        remainingForTemplate -= 1;
        spawnOffset += 1;
      }
      if (phase.mobs.size >= phase.budget) break;
    }
  }

  // Positioning is client-relative; we don't simulate map pathing in MVP
  snapshot(charId: string) {
    const ps = this.players.get(charId); if (!ps) throw new Error("not_joined");
    ps.lastSeenAt = Date.now();
    const phase = this.phases.get(ps.phaseId)!;
    this.ensureSpawnsForPhase(phase);
    const mobs = Array.from(phase.mobs.values());
    return { player: { hp: ps.hp, maxHp: ps.maxHp }, mobs };
  }

  basicAttack(charId: string, hintX?: number) {
    const now = Date.now();
    const ps = this.players.get(charId); if (!ps) throw new Error("not_joined");
    ps.lastSeenAt = now;
    if (now - ps.lastBasicAt < (ps.atkMs || 600)) return { hit: false, reason: "cooldown" };
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
      // Require proximity to prevent sniping across the map
      if (Math.abs(target.pos.x - hintX) > 80) {
        return { hit: false, reason: "out_of_range" };
      }
    } else {
      target = candidates[0];
    }
    if (!target) return { hit: false, reason: "no_target" };
  const dmg = Math.max(1, ps.dmgPerHit || 8);
    target.hp = Math.max(0, target.hp - dmg);
    // Contributions
    const contribMap = phase.contrib.get(target.id)!;
    const c = contribMap.get(charId) || { damage: 0, healing: 0, timeActive: 0 };
    c.damage += dmg; contribMap.set(charId, c);
    const killed = target.hp <= 0;
    return { hit: true, dmg, killed, mobId: target.id };
  }

  harvestRewardsIfDead(mobId: string): { templateId: string; rewards: Array<{ characterId: string; exp: number }>; loot: Array<{ itemId: string; qty: number }> } | null {
    // Compute contribution shares and remove mob
    let phase: Phase | undefined;
    for (const ph of this.phases.values()) { if (ph.mobs.has(mobId)) { phase = ph; break; } }
    if (!phase) return null;
    const mob = phase.mobs.get(mobId)!;
    if (mob.hp > 0) return null;
  const contrib = phase.contrib.get(mobId) || new Map<string, Contribution>();
    const total = Array.from(contrib.values()).reduce((s, v) => s + v.damage, 0) || 1;
    const tpl = this.templates.get(mob.templateId);
    const expBase = tpl?.expBase ?? 5;
    const rewards = Array.from(contrib.entries()).map(([charId, v]) => {
      // Floor for supports (MVP: treat low damage as floor 10%)
      const ratio = Math.max(0.1, v.damage / total);
      return { characterId: charId, exp: Math.round(expBase * ratio) };
    });
    // 100% to owner if personal
    if (phase.type === "personal") {
      const ownerId = Array.from(phase.members)[0];
      // Remove the mob and its contrib before returning to avoid budget lock
      phase.mobs.delete(mobId);
      phase.contrib.delete(mobId);
      // Delayed respawn to avoid instant pop-in
      setTimeout(() => this.ensureSpawnsForPhase(phase), (this.spawnCfg.find(c=>c.phaseType===phase.type)?.respawnMs ?? 1200));
      // Roll drops
      const loot = this.rollDrops(tpl?.dropTableId || null);
      return { templateId: mob.templateId, rewards: [{ characterId: ownerId, exp: expBase }], loot };
    }
    // Party/event: proportional rewards
    phase.mobs.delete(mobId); phase.contrib.delete(mobId);
    const loot = this.rollDrops(tpl?.dropTableId || null);
    return { templateId: mob.templateId, rewards, loot };
  }

  private rollDrops(dropTableId: string | null) {
    if (!dropTableId) return [] as Array<{ itemId: string; qty: number }>;
    const entries = this.drops.get(dropTableId) || [];
    if (!entries.length) return [];
    // Simple weighted single-pick; extend to multiple rolls if desired
    const total = entries.reduce((s, e) => s + Math.max(0, e.weight), 0) || 0;
    if (total <= 0) return [];
    let r = Math.floor(Math.random() * total) + 1;
    for (const e of entries) {
      r -= Math.max(0, e.weight);
      if (r <= 0) {
        const qty = e.minQty === e.maxQty ? e.minQty : (e.minQty + Math.floor(Math.random() * Math.max(1, e.maxQty - e.minQty + 1)));
        return [{ itemId: e.itemId, qty }];
      }
    }
    return [];
  }

  tick() {
    // Minimal bounce animation state on server could be added later. For now, also prune idle players.
    const now = Date.now();
    // Remove players idle for > 2 minutes
    const idleCutoff = now - 2 * 60 * 1000;
    for (const [cid, ps] of this.players) {
      if ((ps.lastSeenAt || 0) < idleCutoff) {
        this.leave(cid);
      }
    }
    // If room empty, clear interval to avoid memory leaks
    if (this.players.size === 0 && this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  leave(charId: string) {
    const ps = this.players.get(charId);
    if (!ps) return;
    this.players.delete(charId);
    // Remove from phase membership
    const phase = this.phases.get(ps.phaseId);
    if (phase) {
      phase.members.delete(charId);
      if (phase.members.size === 0) {
        // Clean up empty phase state
        this.phases.delete(phase.id);
      }
    }
    // Remove from any party membership and clean up party if empty; reassign leader if needed
    for (const [pid, party] of this.parties) {
      if (party.members.has(charId)) {
        party.members.delete(charId);
        if (party.leaderId === charId) {
          // Reassign leader to first remaining member if any
          const nextLeader = party.members.values().next().value as string | undefined;
          if (nextLeader) party.leaderId = nextLeader;
        }
        if (party.members.size === 0) {
          this.parties.delete(pid);
        } else {
          // Recalculate associated phase budget based on party size
          const ph = this.phases.get(party.phaseId);
          if (ph) {
            ph.budget = 6 + Math.min(4, party.members.size * 2);
          }
        }
      }
    }
    // If no players remain, stop ticking
    if (this.players.size === 0 && this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }
}

const rooms = new Map<string, ZoneRoom>();
export function getZoneRoom(zone: string) {
  let r = rooms.get(zone);
  if (!r) { r = new ZoneRoom(zone); rooms.set(zone, r); }
  return r;
}
