import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await q<{ id: string; name: string; level: number; basehp: number; expbase: number; goldmin: number; goldmax: number; tags: string | null }>`
    select id, name, level, basehp, expbase, goldmin, goldmax, tags from "EnemyTemplate" order by id asc
  `;
  // shape to expected camelCase
  const shaped = rows.map(r => ({ id: r.id, name: r.name, level: r.level, baseHp: r.basehp, expBase: r.expbase, goldMin: r.goldmin, goldMax: r.goldmax, tags: r.tags ?? "" }));
  return NextResponse.json({ ok: true, rows: shaped });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const bodyUnknown = await req.json().catch(() => ({}));
  const b = (typeof bodyUnknown === 'object' && bodyUnknown !== null) ? (bodyUnknown as Record<string, unknown>) : {};
  const id = typeof b.id === 'string' ? b.id : undefined;
  const name = typeof b.name === 'string' ? b.name : undefined;
  const level = typeof b.level === 'number' ? b.level : 1;
  const baseHp = typeof b.baseHp === 'number' ? b.baseHp : 30;
  const expBase = typeof b.expBase === 'number' ? b.expBase : 5;
  const goldMin = typeof b.goldMin === 'number' ? b.goldMin : 1;
  const goldMax = typeof b.goldMax === 'number' ? b.goldMax : 3;
  const tags = typeof b.tags === 'string' ? b.tags : '';
  if (typeof id !== 'string' || typeof name !== 'string') return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const rows = await q<{ id: string; name: string; level: number; basehp: number; expbase: number; goldmin: number; goldmax: number; tags: string | null }>`
    insert into "EnemyTemplate" (id, name, level, basehp, expbase, goldmin, goldmax, tags)
    values (${id}, ${name}, ${level}, ${baseHp}, ${expBase}, ${goldMin}, ${goldMax}, ${tags})
    returning id, name, level, basehp, expbase, goldmin, goldmax, tags
  `;
  const r = rows[0];
  const row = { id: r.id, name: r.name, level: r.level, baseHp: r.basehp, expBase: r.expbase, goldMin: r.goldmin, goldMax: r.goldmax, tags: r.tags ?? '' };
  return NextResponse.json({ ok: true, row });
}
