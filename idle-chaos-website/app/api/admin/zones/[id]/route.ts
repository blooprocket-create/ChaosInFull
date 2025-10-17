import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = params;
  const rows = await q<{ id: string; name: string; scenekey: string; width: number; height: number }>`
    select id, name, scenekey, width, height from "ZoneDef" where id = ${id}
  `;
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];
  // dynamic set clauses
  if (typeof b.name === 'string') { updates.push(`name = ${'${'}${values.push(b.name) && ''}}`); }
  if (typeof b.sceneKey === 'string') { updates.push(`scenekey = ${'${'}${values.push(b.sceneKey) && ''}}`); }
  if (typeof b.width === 'number') { updates.push(`width = ${'${'}${values.push(b.width) && ''}}`); }
  if (typeof b.height === 'number') { updates.push(`height = ${'${'}${values.push(b.height) && ''}}`); }
  if (updates.length === 0) return NextResponse.json({ ok: false, error: 'no_changes' }, { status: 400 });
  const { id } = params;
  // Build the SQL with parameter placeholders via template tag by reusing q and spreading params
  const rows = await q<{ id: string; name: string; scenekey: string; width: number; height: number }>(
    [
      `update "ZoneDef" set ${updates.join(', ')} where id = `,
      ` returning id, name, scenekey, width, height`
    ] as unknown as TemplateStringsArray,
    ...values, id
  );
  return NextResponse.json({ ok: true, row: rows[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = params;
  await q`delete from "ZoneDef" where id = ${id}`;
  return NextResponse.json({ ok: true });
}
