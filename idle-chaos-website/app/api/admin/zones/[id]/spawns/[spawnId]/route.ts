import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type Ctx = { params: Promise<{ id: string; spawnId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { templateId?: string; budget?: number; respawnMs?: number; slots?: number[] } = {};
  if (typeof b.templateId === 'string') data.templateId = b.templateId;
  if (typeof b.budget === 'number') data.budget = b.budget;
  if (typeof b.respawnMs === 'number') data.respawnMs = b.respawnMs;
  if (Array.isArray(b.slots)) data.slots = b.slots as number[];
  const { spawnId } = await params;
  const row = await prisma.spawnConfig.update({ where: { id: spawnId }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { spawnId } = await params;
  await prisma.spawnConfig.delete({ where: { id: spawnId } });
  return NextResponse.json({ ok: true });
}
