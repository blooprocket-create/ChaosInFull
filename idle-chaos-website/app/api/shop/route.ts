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
  type CharLite = { id: string; userId: string; gold: number };
  type StackLite = { id: string; count: number } | null;
  const client = prisma as unknown as {
    character: {
      findFirst: (args: { where: { id: string; userId: string } }) => Promise<CharLite | null>;
      update: (args: { where: { id: string }; data: { gold?: number } }) => Promise<unknown>;
    };
    itemStack: {
      findUnique: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<StackLite>;
      upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<unknown>;
      delete: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<unknown>;
    };
    $transaction: <T>(fn: (tx: Omit<typeof client, '$transaction'>) => Promise<T>) => Promise<T>;
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const price = action === "buy" ? item.buy : item.sell;
  const deltaGold = price * qty * (action === "buy" ? -1 : 1);
  // Pre-check current counts and gold
  const currentInv = await client.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey } } });
  if (action === "sell" && (currentInv?.count ?? 0) < qty) return NextResponse.json({ ok: false, error: "insufficient items" }, { status: 400 });
  if (action === "buy" && (owner.gold + deltaGold) < 0) return NextResponse.json({ ok: false, error: "insufficient gold" }, { status: 400 });
  // Atomic apply using a single transaction and zero-prune item stacks
  const result = await client.$transaction(async (tx) => {
    // Update character gold
    const newGold = owner.gold + deltaGold;
    await tx.character.update({ where: { id: characterId }, data: { gold: newGold } });
    // Compute new count and apply delete or upsert
    const current = await tx.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey } } });
    const nextCount = Math.max(0, (current?.count ?? 0) + (action === "buy" ? qty : -qty));
    if (nextCount <= 0) {
      // Delete stack if exists
      await tx.itemStack.delete({ where: { characterId_itemKey: { characterId, itemKey } } }).catch(() => {});
    } else {
      await tx.itemStack.upsert({ where: { characterId_itemKey: { characterId, itemKey } }, update: { count: nextCount }, create: { characterId, itemKey, count: nextCount } });
    }
    return { gold: newGold, count: nextCount } as const;
  });
  return NextResponse.json({ ok: true, gold: result.gold, itemKey, count: result.count, qty });
}
