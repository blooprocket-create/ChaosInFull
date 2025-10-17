import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

type Ctx = { params: Promise<{ id: string; portalId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (typeof b.x === 'number') { sets.push(`x = ${'${'}${vals.push(b.x) && ''}}`); }
  if (typeof b.y === 'number') { sets.push(`y = ${'${'}${vals.push(b.y) && ''}}`); }
  if (typeof b.radius === 'number') { sets.push(`radius = ${'${'}${vals.push(b.radius) && ''}}`); }
  if (typeof b.label === 'string') { sets.push(`label = ${'${'}${vals.push(b.label) && ''}}`); }
  if (typeof b.targetZoneId === 'string') { sets.push(`targetzoneid = ${'${'}${vals.push(b.targetZoneId) && ''}}`); }
  if (!sets.length) return NextResponse.json({ ok: false, error: 'no_changes' }, { status: 400 });
  const { portalId } = await params;
  const rows = await q<{ id: string; zoneid: string; targetzoneid: string; x: number; y: number; radius: number; label: string }>(
    [
      `update "PortalDef" set ${sets.join(', ')} where id = `,
      ` returning id, zoneid, targetzoneid, x, y, radius, label`
    ] as unknown as TemplateStringsArray,
    ...vals, portalId
  );
  return NextResponse.json({ ok: true, row: rows[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { portalId } = await params;
  await q`delete from "PortalDef" where id = ${portalId}`;
  return NextResponse.json({ ok: true });
}
