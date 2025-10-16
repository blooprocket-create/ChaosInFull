import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

// Some environments might not have Prisma client typings for PortalDef under prisma.portalDef at build time.
// Use a loose cast to avoid type errors while keeping the actual calls unchanged.
const portalClient = prisma as unknown as { portalDef: { findMany: (args: { where: { zoneId: string }, orderBy?: { createdAt: 'asc' | 'desc' } }) => Promise<unknown[]>; create: (args: { data: { zoneId: string; targetZoneId: string; x: number; y: number; radius?: number; label?: string } }) => Promise<unknown> } };

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await ctx.params;
  const rows = await portalClient.portalDef.findMany({ where: { zoneId: id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request, ctx: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.targetZoneId !== 'string') return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const data: { zoneId: string; targetZoneId: string; x: number; y: number; radius?: number; label?: string } = {
    zoneId: id,
    targetZoneId: b.targetZoneId,
    x: typeof b.x === 'number' ? b.x : 0,
    y: typeof b.y === 'number' ? b.y : 0,
    ...(typeof b.radius === 'number' ? { radius: b.radius } : {}),
    ...(typeof b.label === 'string' ? { label: b.label } : {}),
  };
  const row = await portalClient.portalDef.create({ data });
  return NextResponse.json({ ok: true, row });
}
