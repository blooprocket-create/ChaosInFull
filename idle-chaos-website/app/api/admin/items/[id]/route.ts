import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  const row = await prisma.itemDef.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const safe = { ...row, buy: (row as any).buy?.toString?.() ?? "0", sell: (row as any).sell?.toString?.() ?? "0" };
  return NextResponse.json({ ok: true, row: safe });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  let data: {
    name?: string;
    description?: string;
    rarity?: string;
    stackable?: boolean;
    maxStack?: number;
    buy?: bigint;
    sell?: bigint;
  } = {};
  const b = body as Record<string, unknown>;
  if (typeof b.name === 'string') data.name = b.name;
  if (typeof b.description === 'string') data.description = b.description;
  if (typeof b.rarity === 'string') data.rarity = b.rarity;
  if (typeof b.stackable === 'boolean') data.stackable = b.stackable;
  if (typeof b.maxStack === 'number') data.maxStack = b.maxStack;
  const parseBig = (v: unknown): bigint | undefined => {
    try {
      if (typeof v === 'number') return BigInt(Math.max(0, Math.floor(v)));
      if (typeof v === 'string' && v.trim() !== '') return BigInt(v);
    } catch {}
    return undefined;
  };
  const buy = parseBig(b.buy);
  const sell = parseBig(b.sell);
  if (typeof buy === 'bigint') data.buy = buy;
  if (typeof sell === 'bigint') data.sell = sell;
  const { id } = await params;
  // Coerce BigInt fields to expected types for Prisma client
  const updateData: any = { ...data };
  if (typeof data.buy === 'bigint') updateData.buy = data.buy as any;
  if (typeof data.sell === 'bigint') updateData.sell = data.sell as any;
  const row = await prisma.itemDef.update({ where: { id }, data: updateData });
  const safe = { ...row, buy: (row as any).buy?.toString?.() ?? "0", sell: (row as any).sell?.toString?.() ?? "0" };
  return NextResponse.json({ ok: true, row: safe });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  await prisma.itemDef.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
