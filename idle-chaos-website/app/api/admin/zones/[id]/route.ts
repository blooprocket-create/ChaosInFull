import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  const row = await prisma.zoneDef.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Build a Prisma-compatible update payload without nulls
  const data: { name?: string; sceneKey?: string; width?: number; height?: number } = {};
  if (typeof b.name === 'string') data.name = b.name;
  if (typeof b.sceneKey === 'string') data.sceneKey = b.sceneKey;
  if (typeof b.width === 'number') data.width = b.width as number;
  if (typeof b.height === 'number') data.height = b.height as number;
  const { id } = await params;
  const row = await prisma.zoneDef.update({ where: { id }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  await prisma.zoneDef.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
