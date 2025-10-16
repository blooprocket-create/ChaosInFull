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
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { characterId } = await req.json().catch(() => ({ characterId: "" }));
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  try { await assertCharacterOwner(session.userId, characterId); }
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }

  // Load AFK state
  const state = await (prisma as any).afkCombatState.findUnique?.({ where: { characterId } });
  if (!state || !state.zone) return NextResponse.json({ ok: false, error: "not_afk" }, { status: 404 });

  const now = new Date();
  const from = state.lastSnapshot ? new Date(state.lastSnapshot) : (state.startedAt ? new Date(state.startedAt) : null);
  if (!from) return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });

  // Only award if auto was on
  if (!state.auto) {
    // Stamp snapshot for next time and return nothing
    await (prisma as any).afkCombatState.update({ where: { characterId }, data: { lastSnapshot: now } }).catch(() => {});
    return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });
  }

  const elapsedSec = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  const killsPerMin = 6;
  const kills = Math.floor((elapsedSec / 60) * killsPerMin);
  if (kills <= 0) return NextResponse.json({ ok: true, kills: 0, exp: 0, gold: 0, loot: [] });

  // Fetch slime template for exp
  const slime = await prisma.enemyTemplate.findUnique({ where: { id: "slime" } }).catch(() => null);
  const expPer = slime?.expBase ?? 5;
  const expTotal = kills * expPer;
  // Gold: 1-3 average ~2
  const goldTotal = kills * 2;
  // Loot: roughly 50% chance goop per kill
  const goop = Math.floor(kills * 0.5);

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
  await (prisma as any).afkCombatState.update({ where: { characterId }, data: { lastSnapshot: now } }).catch(() => {});

  // Return applied rewards
  return NextResponse.json({ ok: true, kills, exp: expTotal, gold: goldTotal, loot: goop > 0 ? [{ itemId: "slime_goop", qty: goop }] : [] });
}
