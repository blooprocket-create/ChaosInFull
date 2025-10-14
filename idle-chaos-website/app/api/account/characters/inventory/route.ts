import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, items } = body as { characterId?: string; items?: Record<string, number> };
  if (!characterId || !items) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  // Verify ownership
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    itemStack: {
      upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<unknown>
    };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const entries = Object.entries(items);
  for (const [itemKey, count] of entries) {
    const safe = Math.max(0, Math.floor(count));
    await client.itemStack.upsert({
      where: { characterId_itemKey: { characterId, itemKey } },
      update: { count: safe },
      create: { characterId, itemKey, count: safe },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    itemStack: { findMany: (args: { where: { characterId: string } }) => Promise<Array<{ itemKey: string; count: number }>> };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const rows = await client.itemStack.findMany({ where: { characterId } });
  const items: Record<string, number> = {};
  for (const r of rows) items[r.itemKey] = r.count;
  return NextResponse.json({ ok: true, items });
}
