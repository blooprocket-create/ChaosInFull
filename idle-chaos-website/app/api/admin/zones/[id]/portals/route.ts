import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const client = prisma as unknown as { portalDef: { findMany: (args: { where: { zoneId: string }, orderBy: { createdAt: 'asc' } }) => Promise<unknown[]> } };
  const rows = await client.portalDef.findMany({ where: { zoneId: params.id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.targetZoneId !== 'string') return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const data: Record<string, unknown> = { zoneId: params.id, targetZoneId: b.targetZoneId, x: typeof b.x === 'number' ? b.x : 0, y: typeof b.y === 'number' ? b.y : 0 };
  if (typeof b.radius === 'number') data.radius = b.radius;
  if (typeof b.label === 'string') data.label = b.label;
  const client = prisma as unknown as { portalDef: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } };
  const row = await client.portalDef.create({ data });
  return NextResponse.json({ ok: true, row });
}
