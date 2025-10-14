import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Access via a narrowed client shape to avoid type issues if Prisma types are stale
  type AccountItemStackClient = {
    findMany: (args: { where: { userId: string } }) => Promise<Array<{ itemKey: string; count: number }>>;
    deleteMany: (args: { where: { userId: string; itemKey: string } }) => Promise<unknown>;
    upsert: (args: {
      where: { userId_itemKey: { userId: string; itemKey: string } };
      update: { count: number };
      create: { userId: string; itemKey: string; count: number };
    }) => Promise<unknown>;
  };
  const client = (prisma as unknown as { accountItemStack?: AccountItemStackClient });
  if (!client.accountItemStack) {
    return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
  }
  const stacks = await client.accountItemStack.findMany({ where: { userId: session.userId } });
  const items: Record<string, number> = {};
  for (const s of stacks) items[s.itemKey] = s.count;
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { items?: Record<string, number> } | null;
  if (!body || typeof body.items !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const items = body.items as Record<string, number>;
  const userId = session.userId;
  // Upsert each key; delete when count <= 0
  const ops: Promise<unknown>[] = [];
  type AccountItemStackClient = {
    findMany: (args: { where: { userId: string } }) => Promise<Array<{ itemKey: string; count: number }>>;
    deleteMany: (args: { where: { userId: string; itemKey: string } }) => Promise<unknown>;
    upsert: (args: {
      where: { userId_itemKey: { userId: string; itemKey: string } };
      update: { count: number };
      create: { userId: string; itemKey: string; count: number };
    }) => Promise<unknown>;
  };
  const client = (prisma as unknown as { accountItemStack?: AccountItemStackClient });
  if (!client.accountItemStack) {
    return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
  }
  for (const [key, count] of Object.entries(items)) {
    if (typeof count !== "number") continue;
    if (count <= 0) {
      ops.push(client.accountItemStack.deleteMany({ where: { userId, itemKey: key } }));
    } else {
      ops.push(client.accountItemStack.upsert({
        where: { userId_itemKey: { userId, itemKey: key } },
        update: { count },
        create: { userId, itemKey: key, count },
      }));
    }
  }
  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}
