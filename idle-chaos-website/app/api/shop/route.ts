import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";
import { itemByKey } from "@/src/data/items";

type Action = "buy" | "sell";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, action, itemKey, quantity } = body as { characterId?: string; action?: Action; itemKey?: string; quantity?: number };
  if (!characterId || !action || !itemKey) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const qty = Math.max(1, Math.min(999, Math.floor(quantity ?? 1)));
  const item = itemByKey[itemKey];
  if (!item) return NextResponse.json({ ok: false, error: "unknown item" }, { status: 400 });
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    playerStat: { findUnique: (args: { where: { userId: string } }) => Promise<{ gold: number } | null>; update: (args: { where: { userId: string }; data: { gold: number } }) => Promise<unknown> };
    itemStack: { findUnique: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<{ count: number } | null>; upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<unknown> };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  // Ensure stats row exists
  const stats = await client.playerStat.findUnique({ where: { userId: session.userId } });
  if (!stats) return NextResponse.json({ ok: false, error: "no stats" }, { status: 400 });
  const price = action === "buy" ? item.buy : item.sell;
  const deltaGold = price * qty * (action === "buy" ? -1 : 1);
  const currentInv = await client.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey } } });
  const newCount = Math.max(0, (currentInv?.count ?? 0) + (action === "buy" ? qty : -qty));
  if (action === "sell" && (currentInv?.count ?? 0) < qty) return NextResponse.json({ ok: false, error: "insufficient items" }, { status: 400 });
  if (action === "buy" && stats.gold + deltaGold < 0) return NextResponse.json({ ok: false, error: "insufficient gold" }, { status: 400 });
  // Update within transaction-like sequence (single-threaded sqlite)
  await client.playerStat.update({ where: { userId: session.userId }, data: { gold: stats.gold + deltaGold } });
  await client.itemStack.upsert({ where: { characterId_itemKey: { characterId, itemKey } }, update: { count: newCount }, create: { characterId, itemKey, count: newCount } });
  return NextResponse.json({ ok: true, gold: stats.gold + deltaGold, itemKey, count: newCount });
}
