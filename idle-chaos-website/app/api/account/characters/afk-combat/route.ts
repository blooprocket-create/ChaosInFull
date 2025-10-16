import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { assertCharacterOwner } from "@/src/lib/ownership";

// Simple AFK combat rewards calculator for the Slime zone
// Assumptions:
// - Kills per minute: 6
// - Per-kill base EXP: derived from level 1 slime via EnemyTemplate.expBase
// - Gold per kill: 1-3 average ~2
// - Loot: ensure slime_goop drop with weight similar to live combat
type AfkCombatState = { characterId: string; zone: string | null; auto: boolean; lastSnapshot: Date | null; startedAt: Date | null };
type AfkDelegate = {
  findUnique: (args: { where: { characterId: string } }) => Promise<AfkCombatState | null>;
  update: (args: { where: { characterId: string }; data: Partial<Pick<AfkCombatState, "zone" | "auto" | "lastSnapshot" | "startedAt">> }) => Promise<void>;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { characterId } = await req.json().catch(() => ({ characterId: "" }));
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  try { await assertCharacterOwner(session.userId, characterId); }
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }

  // Load AFK state
  const afk = (prisma as unknown as { afkCombatState: AfkDelegate }).afkCombatState;
  const state = await afk.findUnique({ where: { characterId } });
  if (!state || !state.zone) return NextResponse.json({ ok: false, error: "not_afk" }, { status: 404 });

  const now = new Date();
  const from = state.lastSnapshot ? new Date(state.lastSnapshot) : (state.startedAt ? new Date(state.startedAt) : null);
  if (!from) return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });

  // Only award if auto was on
  if (!state.auto) {
    // Stamp snapshot for next time and return nothing
    await afk.update({ where: { characterId }, data: { lastSnapshot: now } }).catch(() => {});
    return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });
  }

  const elapsedSec = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  if (elapsedSec <= 0) return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });
  // Character damage model (MVP): pull class and a baseline weaponless damage similar to server basicAttack
  const ch = await prisma.character.findUnique({ where: { id: characterId }, select: { level: true, class: true, userId: true } }).catch(()=>null);
  // Damage formula mirrors ZoneRoom.computeAndCacheDamage
  let dmgPerHit = 8;
  try {
    const stats = ch?.userId ? await prisma.playerStat.findUnique({ where: { userId: ch.userId }, select: { strength: true, agility: true, intellect: true, luck: true } }) : null;
    const cls = (ch?.class || "Beginner").toLowerCase();
    const main = cls.includes("horror") ? (stats?.strength ?? 1)
               : cls.includes("occult") ? (stats?.intellect ?? 1)
               : cls.includes("shade") ? (stats?.agility ?? 1)
               : (stats?.luck ?? 1);
    const hasDagger = !!(await prisma.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey: "copper_dagger" } }, select: { count: true } }))?.count;
    const weaponBonus = hasDagger ? 3 : 1;
    const levelBonus = Math.floor(((ch?.level ?? 1)) / 2);
    dmgPerHit = Math.max(1, Math.floor(6 + main + levelBonus + weaponBonus));
  } catch {}
  const atkPerSec = 1000 / 600; // one hit every 600ms
  const dps = dmgPerHit * atkPerSec;

  // Load zone spawn composition and enemy templates
  const zoneId = String(state.zone);
  const spawns = await prisma.spawnConfig.findMany({ where: { zoneId: zoneId } }).catch(() => []);
  type EnemyTpl = { id: string; baseHp: number; expBase: number; goldMin: number; goldMax: number };
  const tpls: EnemyTpl[] = await prisma.enemyTemplate.findMany({ select: { id: true, baseHp: true, expBase: true, goldMin: true, goldMax: true } }).catch(() => [] as EnemyTpl[]);
  const byId = new Map<string, EnemyTpl>();
  for (const t of tpls) byId.set(t.id, t);
  // Derive a simple weighted kill rate: budget approximates concurrent targets; we assume constant uptime
  // Time to kill for a template: baseHp / dps; kills per second for that template: budget / ttk
  type Part = { templateId: string; budget: number };
  const parts: Part[] = spawns.map(s => ({ templateId: s.templateId, budget: s.budget }));
  if (!parts.length) {
    // Fallback to Slime-only composition if zone not configured
    parts.push({ templateId: "slime", budget: 6 });
  }
  let killsPerSec = 0;
  for (const p of parts) {
    const tpl = byId.get(p.templateId);
    const hp = tpl?.baseHp ?? 30;
    const ttk = Math.max(0.1, hp / dps); // seconds
    killsPerSec += (p.budget / ttk);
  }
  // Personal phases have respawn times; cap by total budget/respawn window roughly
  // Average respawn from spawn config; use median-ish 1.5s if absent
  const avgRespawnMs = spawns.length ? Math.max(300, Math.floor(spawns.reduce((s, x) => s + (x.respawnMs || 1200), 0) / spawns.length)) : 1200;
  const budgetTotal = parts.reduce((s, p) => s + p.budget, 0) || 6;
  const respawnCapPerSec = budgetTotal / (avgRespawnMs / 1000);
  const effectiveKps = Math.min(killsPerSec, respawnCapPerSec);
  const kills = Math.floor(effectiveKps * elapsedSec);
  if (kills <= 0) return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });

  // Expected rewards aggregate across composition proportional to their share of kills
  let expTotal = 0;
  let goldTotal = 0;
  let goop = 0;
  for (const p of parts) {
    const tpl = byId.get(p.templateId) || { baseHp: 30, expBase: 5, goldMin: 1, goldMax: 3 };
    const ttk = Math.max(0.1, (tpl.baseHp) / dps);
    const share = (p.budget / ttk) / Math.max(1e-6, killsPerSec);
    const killsHere = Math.floor(kills * share);
    expTotal += killsHere * (tpl.expBase);
    const goldAvg = Math.round((tpl.goldMin + tpl.goldMax) / 2);
    goldTotal += killsHere * goldAvg;
    // Slime Goop drops from slimes and big slimes; assume ~50% rate per kill for slime-family
    if (/slime/.test(p.templateId)) goop += Math.floor(killsHere * 0.5);
  }

  // Apply EXP via the central endpoint
  try {
    const origin = (() => {
      const env = process.env.NEXT_PUBLIC_BASE_URL;
      if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
      return "http://localhost:3000";
    })();
    await fetch(`${origin}/api/account/characters/exp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, exp: expTotal }) });
  } catch {}

  // Apply gold and loot
  await prisma.character.update({ where: { id: characterId }, data: { gold: { increment: goldTotal } } }).catch(() => {});
  if (goop > 0) {
    const curr = await prisma.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey: "slime_goop" } } }).catch(() => null);
    const count = (curr?.count ?? 0) + goop;
    await prisma.itemStack.upsert({ where: { characterId_itemKey: { characterId, itemKey: "slime_goop" } }, update: { count }, create: { characterId, itemKey: "slime_goop", count } }).catch(() => {});
  }

  // Update snapshot
  await afk.update({ where: { characterId }, data: { lastSnapshot: now } }).catch(() => {});

  // Return applied rewards
  return NextResponse.json({ ok: true, zone: zoneId, kills, exp: expTotal, gold: goldTotal, loot: goop > 0 ? [{ itemId: "slime_goop", qty: goop }] : [] });
}
