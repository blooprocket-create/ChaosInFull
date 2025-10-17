import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

// GET: list patch notes (admin view can use this; News page reads DB directly elsewhere)
export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await q<{ id: string; date: string; version: string; title: string; highlights: string[]; notes: string[] | null }>`
    select id, to_char(date, 'YYYY-MM-DD') as date, version, title, highlights, notes from "PatchNote"
    order by date desc, version desc
  `;
  return NextResponse.json({ ok: true, rows });
}

// POST: create a new patch note
export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const { date, version, title, highlights, notes } = body as { date?: string; version?: string; title?: string; highlights?: string[]; notes?: string[] };
  if (!date || !version || !title || !Array.isArray(highlights)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const rows = await q<{ id: string; date: string; version: string; title: string; highlights: string[]; notes: string[] | null }>`
    insert into "PatchNote" (id, date, version, title, highlights, notes)
    values (gen_random_uuid()::text, ${date}::date, ${version}, ${title}, ${JSON.stringify(highlights)}::jsonb, ${notes ? JSON.stringify(notes) : null}::jsonb)
    returning id, to_char(date, 'YYYY-MM-DD') as date, version, title, highlights, notes
  `;
  return NextResponse.json({ ok: true, row: rows[0] });
}
