import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";
import { prisma } from "@/src/lib/prisma";

async function awardExp(characterId: string, exp: number, cookie: string | null) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/account/characters/exp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({ characterId, exp })
    });
  } catch {}
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  type CmdBody = { zone?: string; characterId?: string; action?: string; value?: unknown };
  const body: CmdBody = await req.json().catch(() => ({} as CmdBody));
  const { zone, characterId, action, value } = body;
  if (!zone || !characterId || !action) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const room = getZoneRoom(zone);
  if (action === "auto") {
    room.toggleAuto(characterId, !!value);
    return NextResponse.json({ ok: true });
  }
  if (action === "basic") {
    let hintX: number | undefined = undefined;
    if (value && typeof value === "object" && (value as { x?: unknown }).x !== undefined) {
      const vx = (value as { x?: unknown }).x;
      if (typeof vx === "number") hintX = vx;
    }
    const res = room.basicAttack(characterId, hintX);
    if (res.killed && res.mobId) {
      const harvested = room.harvestRewardsIfDead(res.mobId);
      const rw = harvested ? harvested.rewards : [];
      // MVP: award only EXP via internal endpoint
      const cookie = req.headers.get("cookie");
      await Promise.all(rw.map(r => awardExp(r.characterId, r.exp, cookie)));
      // Minimal gold + loot for killer
      try {
        const killerId = characterId;
        const client = prisma as unknown as {
          character: { findUnique: (args: { where: { id: string } }) => Promise<{ id: string; userId: string } | null> };
          playerStat: { findUnique: (args: { where: { userId: string } }) => Promise<{ gold: number } | null>; update: (args: { where: { userId: string }; data: { gold: number } }) => Promise<void> };
          itemStack: { findUnique: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<{ count: number } | null>; upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<void> };
        };
        const killer = await client.character.findUnique({ where: { id: killerId } });
        if (killer) {
          const ps = await client.playerStat.findUnique({ where: { userId: killer.userId } });
          const goldDelta = 1 + Math.floor(Math.random() * 3); // 1-3 gold
          const newGold = (ps?.gold ?? 0) + goldDelta;
          await client.playerStat.update({ where: { userId: killer.userId }, data: { gold: newGold } });
          // 35% chance for slime_goop
          if (Math.random() < 0.35) {
            const curr = await client.itemStack.findUnique({ where: { characterId_itemKey: { characterId: killerId, itemKey: "slime_goop" } } });
            const count = (curr?.count ?? 0) + 1;
            await client.itemStack.upsert({ where: { characterId_itemKey: { characterId: killerId, itemKey: "slime_goop" } }, update: { count }, create: { characterId: killerId, itemKey: "slime_goop", count } });
          }
        }
      } catch {}
      // Quest progress hook: if killed a slime, progress tutorial quest by +1 for the killer
      try {
        if (harvested && harvested.templateId === "slime") {
          const cookie = req.headers.get("cookie");
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/quest`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ action: "progress", characterId, progressDelta: 1 }) });
        }
      } catch {}
      return NextResponse.json({ ok: true, result: res, rewards: rw });
    }
    return NextResponse.json({ ok: true, result: res });
  }
  return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
}
