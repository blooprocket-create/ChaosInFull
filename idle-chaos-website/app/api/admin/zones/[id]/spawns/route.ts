import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = params;
  const rows = await q<{ id: string; zoneid: string; templateid: string; budget: number; respawnms: number; slots: unknown; phasetype: string }>`
    select id, zoneid, templateid, budget, respawnms, slots, phasetype from "SpawnConfig" where zoneid = ${id} order by createdat asc
  `;
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.templateId !== 'string') return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const budget = typeof b.budget === 'number' ? b.budget : 6;
  const respawn = typeof b.respawnMs === 'number' ? b.respawnMs : 1200;
  const slots = Array.isArray(b.slots) ? b.slots : null;
  const rows = await q<{ id: string; zoneid: string; templateid: string; budget: number; respawnms: number; slots: unknown; phasetype: string }>`
    insert into "SpawnConfig" (zoneid, templateid, budget, respawnms, slots, phasetype)
    values (${id}, ${b.templateId as string}, ${budget}, ${respawn}, ${slots}, 'personal')
    returning id, zoneid, templateid, budget, respawnms, slots, phasetype
  `;
  return NextResponse.json({ ok: true, row: rows[0] });
}
