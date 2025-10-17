import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";
import { assertCharacterOwner } from "@/src/lib/ownership";

// Simple AFK combat rewards calculator for the Slime zone
// Assumptions:
// - Kills per minute: 6
// - Per-kill base EXP: derived from level 1 slime via EnemyTemplate.expBase
// - Gold per kill: 1-3 average ~2
// - Loot: ensure slime_goop drop with weight similar to live combat
type AfkRow = { characterid: string; zone: string | null; auto: boolean; lastsnapshot: string | null; startedat: string | null };

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { characterId } = await req.json().catch(() => ({ characterId: "" }));
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  try { await assertCharacterOwner(session.userId, characterId); }
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }

  // Load AFK state
  const state = (await q<AfkRow>`select characterid, zone, auto, lastsnapshot, startedat from "AfkCombatState" where characterid = ${characterId}`)[0];
  if (!state || !state.zone) return NextResponse.json({ ok: false, error: "not_afk" }, { status: 404 });

  const now = new Date();
  const from = state.lastsnapshot ? new Date(state.lastsnapshot) : (state.startedat ? new Date(state.startedat) : null);
  if (!from) return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });

  // Only award if auto was on
  if (!state.auto) {
    // Stamp snapshot for next time and return nothing
    await q`update "AfkCombatState" set lastsnapshot = ${now.toISOString()} where characterid = ${characterId}`;
    return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });
  }

  const elapsedSec = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  // Only calculate AFK simulation if at least 60 seconds have elapsed
  if (elapsedSec < 60) {
    await q`update "AfkCombatState" set lastsnapshot = ${now.toISOString()} where characterid = ${characterId}`;
    return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });
  }
  // Character damage model (MVP): pull class and a baseline weaponless damage similar to server basicAttack
  const ch = (await q<{ level: number; class: string; userid: string }>`select level, class, userid from "Character" where id = ${characterId}`).at(0) ?? null;
  // Damage formula mirrors ZoneRoom.computeAndCacheDamage
  let dmgPerHit = 8;
  try {
  const stats = ch?.userid ? (await q<{ strength: number; agility: number; intellect: number; luck: number }>`select strength, agility, intellect, luck from "PlayerStat" where userid = ${ch.userid}`).at(0) ?? null : null;
    const cls = (ch?.class || "Beginner").toLowerCase();
    const main = cls.includes("horror") ? (stats?.strength ?? 1)
               : cls.includes("occult") ? (stats?.intellect ?? 1)
               : cls.includes("shade") ? (stats?.agility ?? 1)
               : (stats?.luck ?? 1);
  const hasDagger = !!(await q<{ count: number }>`select count from "ItemStack" where characterid = ${characterId} and itemkey = 'copper_dagger'`).at(0)?.count;
    const weaponBonus = hasDagger ? 3 : 1;
    const levelBonus = Math.floor(((ch?.level ?? 1)) / 2);
    dmgPerHit = Math.max(1, Math.floor(6 + main + levelBonus + weaponBonus));
  } catch {}
  const atkPerSec = 1000 / 600; // one hit every 600ms
  const dps = dmgPerHit * atkPerSec;

  // Load zone spawn composition and enemy templates
  const zoneId = String(state.zone);
  const spawns = await q<{ templateid: string; budget: number; respawnms: number }>`select templateid, budget, respawnms from "SpawnConfig" where zoneid = ${zoneId}`;
  type EnemyTpl = { id: string; basehp: number; expbase: number; goldmin: number; goldmax: number };
  const tpls: EnemyTpl[] = await q<EnemyTpl>`select id, basehp, expbase, goldmin, goldmax from "EnemyTemplate"`;
  const byId = new Map<string, EnemyTpl>();
  for (const t of tpls) byId.set(t.id, t);
  // Derive a simple weighted kill rate: budget approximates concurrent targets; we assume constant uptime
  // Time to kill for a template: baseHp / dps; kills per second for that template: budget / ttk
  type Part = { templateId: string; budget: number };
  const parts: Part[] = spawns.map(s => ({ templateId: s.templateid, budget: s.budget }));
  if (!parts.length) {
    // Fallback to Slime-only composition if zone not configured
    parts.push({ templateId: "slime", budget: 6 });
  }
  let killsPerSec = 0;
  for (const p of parts) {
    const tpl = byId.get(p.templateId);
  const hp = tpl?.basehp ?? 30;
    const ttk = Math.max(0.1, hp / dps); // seconds
    killsPerSec += (p.budget / ttk);
  }
  // Personal phases have respawn times; cap by total budget/respawn window roughly
  // Average respawn from spawn config; use median-ish 1.5s if absent
  const avgRespawnMs = spawns.length ? Math.max(300, Math.floor(spawns.reduce((s, x) => s + (x.respawnms || 1200), 0) / spawns.length)) : 1200;
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
  const tpl = byId.get(p.templateId) || { basehp: 30, expbase: 5, goldmin: 1, goldmax: 3 } as EnemyTpl;
  const ttk = Math.max(0.1, (tpl.basehp) / dps);
    const share = (p.budget / ttk) / Math.max(1e-6, killsPerSec);
    const killsHere = Math.floor(kills * share);
  expTotal += killsHere * (tpl.expbase);
  const goldAvg = Math.round((tpl.goldmin + tpl.goldmax) / 2);
    goldTotal += killsHere * goldAvg;
    // Slime Goop drops from slimes and big slimes; assume ~50% rate per kill for slime-family
    if (/slime/.test(p.templateId)) goop += Math.floor(killsHere * 0.5);
  }

  // Apply EXP via the central endpoint (forwarding the user's cookie so auth passes)
  let newTotals: { level?: number; exp?: number } = {};
  try {
    const getAbsoluteBase = () => {
      const env = process.env.NEXT_PUBLIC_BASE_URL;
      if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
      const origin = req.headers.get("origin") || req.headers.get("x-forwarded-origin") || "";
      if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, "");
      const xfProto = req.headers.get("x-forwarded-proto");
      const xfHost = req.headers.get("x-forwarded-host");
      if (xfHost) {
        const proto = xfProto && /https/i.test(xfProto || "") ? "https" : "http";
        return `${proto}://${xfHost}`;
      }
      const host = req.headers.get("host");
      if (host) {
        const guessHttps = /:443$/.test(host) || /https/i.test(xfProto || "");
        return `${guessHttps ? "https" : "http"}://${host}`;
      }
      return "http://localhost:3000";
    };
    const origin = getAbsoluteBase();
    const cookie = req.headers.get("cookie");
    const resp = await fetch(`${origin}/api/account/characters/exp`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ characterId, exp: expTotal }) });
    if (resp.ok) {
      const payload = await resp.json().catch(()=>null);
      if (payload && typeof payload.level === 'number' && typeof payload.exp === 'number') {
        newTotals = { level: payload.level, exp: payload.exp };
      }
    }
  } catch {}

  // Apply gold and loot
  await q`update "Character" set gold = gold + ${goldTotal} where id = ${characterId}`;
  if (goop > 0) {
    const curr = (await q<{ count: number }>`select count from "ItemStack" where characterid = ${characterId} and itemkey = 'slime_goop'`).at(0)?.count ?? 0;
    const count = curr + goop;
    await q`insert into "ItemStack" (characterid, itemkey, count)
      values (${characterId}, 'slime_goop', ${count})
      on conflict (characterid, itemkey) do update set count = excluded.count`;
  }

  // Update snapshot
  await q`update "AfkCombatState" set lastsnapshot = ${now.toISOString()} where characterid = ${characterId}`;

  // Return applied rewards
  return NextResponse.json({ ok: true, zone: zoneId, kills, exp: expTotal, gold: goldTotal, loot: goop > 0 ? [{ itemId: "slime_goop", qty: goop }] : [], newLevel: newTotals.level, newExp: newTotals.exp });
}
