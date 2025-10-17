import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

type Ctx = { params: { id: string; spawnId: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (typeof b.templateId === 'string') { sets.push(`templateid = ${'${'}${vals.push(b.templateId) && ''}}`); }
  if (typeof b.budget === 'number') { sets.push(`budget = ${'${'}${vals.push(b.budget) && ''}}`); }
  if (typeof b.respawnMs === 'number') { sets.push(`respawnms = ${'${'}${vals.push(b.respawnMs) && ''}}`); }
  if (Array.isArray(b.slots)) { sets.push(`slots = ${'${'}${vals.push(b.slots) && ''}}`); }
  if (!sets.length) return NextResponse.json({ ok: false, error: 'no_changes' }, { status: 400 });
  const { spawnId } = params;
  const rows = await q<{ id: string; zoneid: string; templateid: string; budget: number; respawnms: number; slots: unknown; phasetype: string }>(
    [
      `update "SpawnConfig" set ${sets.join(', ')} where id = `,
      ` returning id, zoneid, templateid, budget, respawnms, slots, phasetype`
    ] as unknown as TemplateStringsArray,
    ...vals, spawnId
  );
  return NextResponse.json({ ok: true, row: rows[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { spawnId } = params;
  await q`delete from "SpawnConfig" where id = ${spawnId}`;
  return NextResponse.json({ ok: true });
}
