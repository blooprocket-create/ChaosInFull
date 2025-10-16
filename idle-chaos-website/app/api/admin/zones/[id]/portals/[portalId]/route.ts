import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type Ctx = { params: Promise<{ id: string; portalId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.x === 'number') data.x = b.x;
  if (typeof b.y === 'number') data.y = b.y;
  if (typeof b.radius === 'number') data.radius = b.radius;
  if (typeof b.label === 'string') data.label = b.label;
  if (typeof b.targetZoneId === 'string') data.targetZoneId = b.targetZoneId;
  const client = prisma as unknown as { portalDef: { update: (args: { where: { id: string }, data: Record<string, unknown> }) => Promise<unknown> } };
  const { portalId } = await params;
  const row = await client.portalDef.update({ where: { id: portalId }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const client = prisma as unknown as { portalDef: { delete: (args: { where: { id: string } }) => Promise<void> } };
  const { portalId } = await params;
  await client.portalDef.delete({ where: { id: portalId } });
  return NextResponse.json({ ok: true });
}
