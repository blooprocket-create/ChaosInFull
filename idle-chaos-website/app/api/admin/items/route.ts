import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await q<{
    id: string;
    name: string;
    description: string | null;
    rarity: string;
    stackable: boolean;
    maxstack: number;
    buy: string; // numeric as text
    sell: string; // numeric as text
    createdat: string;
    updatedat: string;
  }>`
    select id, name, description, rarity, stackable, maxstack,
           buy::text as buy, sell::text as sell,
           to_char(createdat, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as createdat,
           to_char(updatedat, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updatedat
    from "ItemDef"
    order by id asc
  `;
  const safe = rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    rarity: r.rarity,
    stackable: r.stackable,
    maxStack: r.maxstack,
    buy: r.buy,
    sell: r.sell,
    createdAt: r.createdat,
    updatedAt: r.updatedat,
  }));
  return NextResponse.json({ ok: true, rows: safe });
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
  const parseNumText = (v: unknown): string => {
    if (typeof v === 'number') return String(Math.max(0, Math.floor(v)));
    if (typeof v === 'string' && v.trim() !== '') return v;
    return '0';
  };
  const buyTxt = parseNumText(b.buy);
  const sellTxt = parseNumText(b.sell);
  if (!id || !name) return NextResponse.json({ ok: false, error: "missing_id_or_name" }, { status: 400 });
  if (!/^[-a-z0-9_]+$/i.test(id)) return NextResponse.json({ ok: false, error: "invalid_id_format" }, { status: 400 });
  if (maxStack < 1) return NextResponse.json({ ok: false, error: "invalid_maxStack" }, { status: 400 });
  try {
    const rows = await q<{ id: string; name: string; description: string | null; rarity: string; stackable: boolean; maxstack: number; buy: string; sell: string }>`
      insert into "ItemDef" (id, name, description, rarity, stackable, maxstack, buy, sell)
      values (${id}, ${name}, ${description}, ${rarity}, ${stackable}, ${maxStack}, ${buyTxt}::numeric, ${sellTxt}::numeric)
      returning id, name, description, rarity, stackable, maxstack, buy::text as buy, sell::text as sell
    `;
    const r = rows[0];
    const safe = {
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      rarity: r.rarity,
      stackable: r.stackable,
      maxStack: r.maxstack,
      buy: r.buy,
      sell: r.sell,
    };
    return NextResponse.json({ ok: true, row: safe });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/duplicate key/i.test(message)) {
      return NextResponse.json({ ok: false, error: 'conflict', message: 'Item id already exists' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: 'db_error', message }, { status: 500 });
  }
}
