import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await prisma.spawnConfig.findMany({ where: { zoneId: params.id }, orderBy: { id: 'asc' } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.templateId !== 'string') return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const data: { zoneId: string; templateId: string; budget: number; respawnMs: number; slots?: number[] } = {
    zoneId: params.id,
    templateId: b.templateId,
    budget: typeof b.budget === 'number' ? b.budget : 6,
    respawnMs: typeof b.respawnMs === 'number' ? b.respawnMs : 1200,
    slots: Array.isArray(b.slots) ? (b.slots as number[]) : undefined,
  };
  const row = await prisma.spawnConfig.create({ data });
  return NextResponse.json({ ok: true, row });
}
