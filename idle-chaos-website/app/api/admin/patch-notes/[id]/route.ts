import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  const rows = await q<{ id: string; date: string; version: string; title: string; highlights: string[]; notes: string[] | null }>`
    select id, to_char(date, 'YYYY-MM-DD') as date, version, title, highlights, notes
    from "PatchNote" where id = ${id} limit 1
  `;
  if (!rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row: rows[0] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const b = body as Record<string, unknown>;
  const { id } = await params;
  const date = typeof b.date === 'string' ? b.date : undefined;
  const version = typeof b.version === 'string' ? b.version : undefined;
  const title = typeof b.title === 'string' ? b.title : undefined;
  const highlights = Array.isArray(b.highlights) ? (b.highlights as unknown[]).map(String) : undefined;
  const notes = Array.isArray(b.notes) ? (b.notes as unknown[]).map(String) : undefined;
  const rows = await q<{ id: string; date: string; version: string; title: string; highlights: string[]; notes: string[] | null }>`
    update "PatchNote"
    set
      date = coalesce(${date}::date, date),
      version = coalesce(${version}, version),
      title = coalesce(${title}, title),
      highlights = coalesce(${highlights ? JSON.stringify(highlights) : null}::jsonb, highlights),
      notes = coalesce(${notes ? JSON.stringify(notes) : null}::jsonb, notes)
    where id = ${id}
    returning id, to_char(date, 'YYYY-MM-DD') as date, version, title, highlights, notes
  `;
  return NextResponse.json({ ok: true, row: rows[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  await q`delete from "PatchNote" where id = ${id}`;
  return NextResponse.json({ ok: true });
}
