import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const row = await prisma.itemDef.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const data: {
    name?: string;
    description?: string;
    rarity?: string;
    stackable?: boolean;
    maxStack?: number;
    buy?: number;
    sell?: number;
  } = {};
  const b = body as Record<string, unknown>;
  if (typeof b.name === 'string') data.name = b.name;
  if (typeof b.description === 'string') data.description = b.description;
  if (typeof b.rarity === 'string') data.rarity = b.rarity;
  if (typeof b.stackable === 'boolean') data.stackable = b.stackable;
  if (typeof b.maxStack === 'number') data.maxStack = b.maxStack;
  if (typeof b.buy === 'number') data.buy = b.buy;
  if (typeof b.sell === 'number') data.sell = b.sell;
  const row = await prisma.itemDef.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  await prisma.itemDef.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
