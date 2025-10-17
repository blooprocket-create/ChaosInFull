import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = params;
  const rows = await q<{ id: string; zoneid: string; targetzoneid: string; x: number; y: number; radius: number; label: string }>`
    select id, zoneid, targetzoneid, x, y, radius, label from "PortalDef" where zoneid = ${id} order by createdat asc
  `;
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.targetZoneId !== 'string') return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const x = typeof b.x === 'number' ? b.x : 0;
  const y = typeof b.y === 'number' ? b.y : 0;
  const radius = typeof b.radius === 'number' ? b.radius : 32;
  const label = typeof b.label === 'string' ? b.label : '';
  const rows = await q<{ id: string; zoneid: string; targetzoneid: string; x: number; y: number; radius: number; label: string }>`
    insert into "PortalDef" (zoneid, targetzoneid, x, y, radius, label)
    values (${id}, ${b.targetZoneId as string}, ${x}, ${y}, ${radius}, ${label})
    returning id, zoneid, targetzoneid, x, y, radius, label
  `;
  return NextResponse.json({ ok: true, row: rows[0] });
}
