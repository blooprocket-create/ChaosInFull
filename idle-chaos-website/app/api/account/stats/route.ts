import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type CharacterLite = {
  id: string;
  userId: string;
  level: number;
  class: string;
  miningLevel?: number | null;
  miningExp?: number | null;
  woodcuttingLevel?: number | null;
  woodcuttingExp?: number | null;
  fishingLevel?: number | null;
  fishingExp?: number | null;
  craftingLevel?: number | null;
  craftingExp?: number | null;
};
type PlayerStatLite = {
  level: number;
  class: string;
  exp: number;
  gold: number;
  premiumGold?: number;
  hp: number;
  mp: number;
  strength: number;
  agility: number;
  intellect: number;
  luck: number;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ ok: false, error: "missing characterId" }, { status: 400 });

  // Verify character ownership and fetch skill fields
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<CharacterLite | null> };
    user: { findUnique: (args: { where: { id: string }; include: { stats: true } }) => Promise<{ stats: PlayerStatLite | null } | null> };
  };
  const ch = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!ch) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const user = await client.user.findUnique({ where: { id: session.userId }, include: { stats: true } });
  const s: PlayerStatLite | null = user?.stats ?? null;
  const data = {
    base: s ? {
      level: s.level,
      class: s.class,
      exp: s.exp,
      gold: s.gold,
      premiumGold: ((): number => {
        const rs = s as unknown as Record<string, unknown>;
        const v = rs["premiumGold"];
        return typeof v === "number" ? v : 0;
      })(),
      hp: s.hp,
      mp: s.mp,
      strength: s.strength,
      agility: s.agility,
      intellect: s.intellect,
      luck: s.luck,
    } : null,
    skills: {
      mining: { level: ch.miningLevel ?? 1, exp: ch.miningExp ?? 0 },
      woodcutting: { level: ch.woodcuttingLevel ?? 1, exp: ch.woodcuttingExp ?? 0 },
      crafting: { level: ch.craftingLevel ?? 1, exp: ch.craftingExp ?? 0 },
      fishing: { level: ch.fishingLevel ?? 1, exp: ch.fishingExp ?? 0 },
    },
    character: { level: ch.level, class: ch.class },
  };
  return NextResponse.json({ ok: true, ...data });
}
