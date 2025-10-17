import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";


export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ ok: false, error: "missing characterId" }, { status: 400 });

  // Ownership + character fields
  const chRows = await q<{
    id: string; userid: string; level: number; class: string;
    miningexp: number; mininglevel: number; woodcuttingexp: number; woodcuttinglevel: number;
    craftingexp: number; craftinglevel: number; fishingexp: number; fishinglevel: number; gold: number;
  }>`
    select id, userid, level, class, miningexp, mininglevel, woodcuttingexp, woodcuttinglevel, craftingexp, craftinglevel, fishingexp, fishinglevel, gold
    from "Character" where id = ${characterId} and userid = ${session.userId}
  `;
  const ch = chRows[0];
  if (!ch) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const sRows = await q<{
    level: number; class: string; exp: number; premiumgold: number; hp: number; mp: number; strength: number; agility: number; intellect: number; luck: number;
  }>`
    select level, class, exp, premiumgold, hp, mp, strength, agility, intellect, luck from "PlayerStat" where userid = ${session.userId}
  `;
  const s = sRows[0] || null;

  const data = {
    base: s ? {
      level: s.level,
      class: s.class,
      exp: s.exp,
      gold: ch.gold,
      premiumGold: s.premiumgold,
      hp: s.hp,
      mp: s.mp,
      strength: s.strength,
      agility: s.agility,
      intellect: s.intellect,
      luck: s.luck,
    } : null,
    skills: {
      mining: { level: ch.mininglevel ?? 1, exp: ch.miningexp ?? 0 },
      woodcutting: { level: ch.woodcuttinglevel ?? 1, exp: ch.woodcuttingexp ?? 0 },
      crafting: { level: ch.craftinglevel ?? 1, exp: ch.craftingexp ?? 0 },
      fishing: { level: ch.fishinglevel ?? 1, exp: ch.fishingexp ?? 0 },
    },
    character: { level: ch.level, class: ch.class },
  };
  return NextResponse.json({ ok: true, ...data });
}
