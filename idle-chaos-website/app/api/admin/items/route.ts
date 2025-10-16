import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await prisma.itemDef.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const b = body as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id.trim() : '';
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const description = typeof b.description === 'string' ? b.description : '';
  const rarity = typeof b.rarity === 'string' ? b.rarity : 'common';
  const stackable = typeof b.stackable === 'boolean' ? b.stackable : true;
  const maxStack = typeof b.maxStack === 'number' ? b.maxStack : 999;
  const buy = typeof b.buy === 'number' ? b.buy : 0;
  const sell = typeof b.sell === 'number' ? b.sell : 0;
  if (!id || !name) return NextResponse.json({ ok: false, error: "missing_id_or_name" }, { status: 400 });
  if (!/^[-a-z0-9_]+$/i.test(id)) return NextResponse.json({ ok: false, error: "invalid_id_format" }, { status: 400 });
  if (maxStack < 1) return NextResponse.json({ ok: false, error: "invalid_maxStack" }, { status: 400 });
  try {
    const row = await prisma.itemDef.create({ data: { id, name, description, rarity, stackable, maxStack, buy, sell } });
    return NextResponse.json({ ok: true, row });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2002') {
      // Unique constraint violation (id already exists)
      return NextResponse.json({ ok: false, error: 'conflict', message: 'Item id already exists' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: 'db_error', message: e?.message || 'Unknown error' }, { status: 500 });
  }
}
