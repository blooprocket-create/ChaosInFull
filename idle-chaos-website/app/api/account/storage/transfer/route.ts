import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

/*
POST /api/account/storage/transfer
Body: {
  characterId: string;
  direction: "toStorage" | "toInventory";
  itemKey: string;
  count?: number; // optional; defaults to full stack available on source
}
Atomic behavior:
- Fetch character ownership and existing per-character stack + account stack.
- Determine transfer amount (min(requested, available)).
- Apply within a single transaction: update/delete source stack; upsert target stack.
- Return updated inventory and storage snapshot.
*/

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as {
    characterId?: string;
    direction?: "toStorage" | "toInventory";
    itemKey?: string;
    count?: number;
  } | null;
  if (!body || !body.characterId || !body.direction || !body.itemKey) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { characterId, direction, itemKey } = body;
  let { count } = body;
  // Verify character belongs to user
  // Defensive narrowed typing (Prisma client not regenerated yet)
  interface CharacterLite { id: string; userId: string; }
  interface StackLite { id: string; count: number; itemKey?: string; }
  interface PrismaLite {
    character: { findUnique: (args: { where: { id: string } }) => Promise<CharacterLite | null> };
    itemStack: {
      findUnique: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<StackLite | null>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
      update: (args: { where: { id: string }; data: { count: number } }) => Promise<unknown>;
      upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<unknown>;
      findMany: (args: { where: { characterId: string } }) => Promise<Array<{ itemKey: string; count: number }>>;
    };
    accountItemStack: {
      findUnique: (args: { where: { userId_itemKey: { userId: string; itemKey: string } } }) => Promise<StackLite | null>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
      update: (args: { where: { id: string }; data: { count: number } }) => Promise<unknown>;
      upsert: (args: { where: { userId_itemKey: { userId: string; itemKey: string } }; update: { count: number }; create: { userId: string; itemKey: string; count: number } }) => Promise<unknown>;
      findMany: (args: { where: { userId: string } }) => Promise<Array<{ itemKey: string; count: number }>>;
    };
    $transaction: <T>(fn: (tx: Omit<PrismaLite, '$transaction'>) => Promise<T>) => Promise<T>;
  }
  const client = prisma as unknown as PrismaLite;
  const character = await client.character.findUnique({ where: { id: characterId } });
  if (!character || character.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Load source stacks
  const [charStack, acctStack] = await Promise.all([
    client.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey } } }),
    client.accountItemStack.findUnique({ where: { userId_itemKey: { userId: session.userId, itemKey } } })
  ]);
  if (direction === "toStorage") {
    const available = charStack?.count ?? 0;
    if (available <= 0) return NextResponse.json({ error: "No items" }, { status: 400 });
    if (count == null || count > available) count = available;
  await client.$transaction(async (tx) => {
      // decrement / delete character stack
      const amt = count ?? available;
      if (available - amt <= 0) {
        if (charStack) await tx.itemStack.delete({ where: { id: charStack.id } });
      } else {
        await tx.itemStack.update({ where: { id: charStack!.id }, data: { count: available - amt } });
      }
      // upsert account stack
      const acctCount = acctStack?.count ?? 0;
      const newCount = acctCount + amt;
      await tx.accountItemStack.upsert({
        where: { userId_itemKey: { userId: session.userId, itemKey } },
        update: { count: newCount },
        create: { userId: session.userId, itemKey, count: newCount }
      });
    });
  } else {
    const available = acctStack?.count ?? 0;
    if (available <= 0) return NextResponse.json({ error: "No items" }, { status: 400 });
    if (count == null || count > available) count = available;
  await client.$transaction(async (tx) => {
      // decrement / delete account stack
      const amt = count ?? available;
      if (available - amt <= 0) {
        if (acctStack) await tx.accountItemStack.delete({ where: { id: acctStack.id } });
      } else {
        await tx.accountItemStack.update({ where: { id: acctStack!.id }, data: { count: available - amt } });
      }
      // upsert character stack
      const charCount = charStack?.count ?? 0;
      const newCount = charCount + amt;
      await tx.itemStack.upsert({
        where: { characterId_itemKey: { characterId, itemKey } },
        update: { count: newCount },
        create: { characterId, itemKey, count: newCount }
      });
    });
  }
  // Return updated snapshot
  const [newCharStacks, newAcctStacks] = await Promise.all([
    client.itemStack.findMany({ where: { characterId } }),
    client.accountItemStack.findMany({ where: { userId: session.userId } })
  ]);
  const inv: Record<string, number> = {};
  for (const s of newCharStacks) inv[s.itemKey] = s.count;
  const storage: Record<string, number> = {};
  for (const s of newAcctStacks) storage[s.itemKey] = s.count;
  return NextResponse.json({ inventory: inv, storage });
}
