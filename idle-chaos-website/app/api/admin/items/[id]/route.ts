import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  const rows = await q<{ id: string; name: string; description: string | null; rarity: string; stackable: boolean; maxstack: number; buy: string; sell: string }>`
    select id, name, description, rarity, stackable, maxstack, buy::text as buy, sell::text as sell
    from "ItemDef" where id = ${id} limit 1
  `;
  const r = rows[0];
  if (!r) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const safe = { id: r.id, name: r.name, description: r.description ?? "", rarity: r.rarity, stackable: r.stackable, maxStack: r.maxstack, buy: r.buy, sell: r.sell };
  return NextResponse.json({ ok: true, row: safe });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const b = body as Record<string, unknown>;
  const { id } = await params;
  const parseNumText = (v: unknown): string | null => {
    if (typeof v === 'number') return String(Math.max(0, Math.floor(v)));
    if (typeof v === 'string' && v.trim() !== '') return v;
    return null;
  };
  const name = typeof b.name === 'string' ? b.name : undefined;
  const description = typeof b.description === 'string' ? b.description : undefined;
  const rarity = typeof b.rarity === 'string' ? b.rarity : undefined;
  const stackable = typeof b.stackable === 'boolean' ? b.stackable : undefined;
  const maxStack = typeof b.maxStack === 'number' ? b.maxStack : undefined;
  const buyTxt = parseNumText(b.buy);
  const sellTxt = parseNumText(b.sell);
  const rows = await q<{ id: string; name: string; description: string | null; rarity: string; stackable: boolean; maxstack: number; buy: string; sell: string }>`
    update "ItemDef"
    set
      name = coalesce(${name}, name),
      description = coalesce(${description}, description),
      rarity = coalesce(${rarity}, rarity),
      stackable = coalesce(${stackable}, stackable),
      maxstack = coalesce(${maxStack}, maxstack),
      buy = coalesce(${buyTxt}::numeric, buy),
      sell = coalesce(${sellTxt}::numeric, sell)
    where id = ${id}
    returning id, name, description, rarity, stackable, maxstack, buy::text as buy, sell::text as sell
  `;
  const r = rows[0];
  const safe = { id: r.id, name: r.name, description: r.description ?? "", rarity: r.rarity, stackable: r.stackable, maxStack: r.maxstack, buy: r.buy, sell: r.sell };
  return NextResponse.json({ ok: true, row: safe });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  await q`delete from "ItemDef" where id = ${id}`;
  return NextResponse.json({ ok: true });
}
