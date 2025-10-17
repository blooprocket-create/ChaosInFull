import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

// Increment character EXP fields (character exp and/or miningExp)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, exp, miningExp, craftingExp } = body as { characterId?: string; exp?: number; miningExp?: number; craftingExp?: number };
  if (!characterId || (typeof exp !== "number" && typeof miningExp !== "number" && typeof craftingExp !== "number")) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // Clamp deltas to avoid abuse per request
  const clamp = (n: number) => Math.max(0, Math.min(50000, Math.floor(n)));
  const expDelta = typeof exp === "number" ? clamp(exp) : 0;
  const miningDelta = typeof miningExp === "number" ? clamp(miningExp) : 0;
  const craftingDelta = typeof craftingExp === "number" ? clamp(craftingExp) : 0;

  // Fetch character with ownership + current exp/levels
  const rows = await q<{ id: string; userid: string; level: number; exp: number; miningexp: number; mininglevel: number; craftingexp: number; craftinglevel: number }>`
    select id, userid, level, exp, miningexp, mininglevel, craftingexp, craftinglevel from "Character"
    where id = ${characterId} and userid = ${session.userId}
  `;
  const ch = rows[0];
  if (!ch) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // Geometric growth thresholds
  const charReq = (lvl: number) => Math.floor(100 * Math.pow(1.25, Math.max(0, lvl - 1)));
  const mineReq = (lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1)));
  const craftReq = (lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1)));

  // XP rate multipliers that scale faster at high levels
  const charMult = 1 + Math.pow(Math.max(1, ch.level) - 1, 1.2) / 30; // grows with level
  const mineMult = 1 + Math.pow(Math.max(1, ch.mininglevel ?? 1) - 1, 1.2) / 25; // grows with miningLevel
  const craftMult = 1 + Math.pow(Math.max(1, ch.craftinglevel ?? 1) - 1, 1.2) / 25;

  let newCharExp = ch.exp + Math.floor(expDelta * charMult);
  let newMineExp = ch.miningexp + Math.floor(miningDelta * mineMult);
  let newCraftExp = ch.craftingexp + Math.floor(craftingDelta * craftMult);
  let newLevel = ch.level;
  let newMiningLevel = ch.mininglevel ?? 1;
  let newCraftingLevel = ch.craftinglevel ?? 1;

  // Apply character level-ups
  let charReqNeeded = charReq(newLevel);
  // Support overflow into multiple levels
  while (newCharExp >= charReqNeeded) {
    newCharExp -= charReqNeeded;
    newLevel += 1;
    charReqNeeded = charReq(newLevel);
    // hard cap to avoid runaway
    if (newLevel > 999) { newCharExp = 0; break; }
  }

  // Apply mining level-ups
  let mineReqNeeded = mineReq(newMiningLevel);
  while (newMineExp >= mineReqNeeded) {
    newMineExp -= mineReqNeeded;
    newMiningLevel += 1;
    mineReqNeeded = mineReq(newMiningLevel);
    if (newMiningLevel > 999) { newMineExp = 0; break; }
  }

  // Apply crafting level-ups
  let craftReqNeeded = craftReq(newCraftingLevel);
  while (newCraftExp >= craftReqNeeded) {
    newCraftExp -= craftReqNeeded;
    newCraftingLevel += 1;
    craftReqNeeded = craftReq(newCraftingLevel);
    if (newCraftingLevel > 999) { newCraftExp = 0; break; }
  }

  await q`
    update "Character" set
      exp = ${newCharExp},
      level = ${newLevel},
      miningexp = ${newMineExp},
      mininglevel = ${newMiningLevel},
      craftingexp = ${newCraftExp},
      craftinglevel = ${newCraftingLevel}
    where id = ${ch.id}
  `;

  return NextResponse.json({ ok: true, level: newLevel, exp: newCharExp, miningLevel: newMiningLevel, miningExp: newMineExp, craftingLevel: newCraftingLevel, craftingExp: newCraftExp });
}
