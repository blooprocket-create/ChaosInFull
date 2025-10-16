import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type Ctx = { params: Promise<{ id: string; portalId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { x?: number; y?: number; radius?: number; label?: string; targetZoneId?: string } = {};
  if (typeof b.x === 'number') data.x = b.x;
  if (typeof b.y === 'number') data.y = b.y;
  if (typeof b.radius === 'number') data.radius = b.radius;
  if (typeof b.label === 'string') data.label = b.label;
  if (typeof b.targetZoneId === 'string') data.targetZoneId = b.targetZoneId;
  const { portalId } = await params;
  const row = await prisma.portalDef.update({ where: { id: portalId }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { portalId } = await params;
  await prisma.portalDef.delete({ where: { id: portalId } });
  return NextResponse.json({ ok: true });
}
