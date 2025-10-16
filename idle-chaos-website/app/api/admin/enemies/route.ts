import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await prisma.enemyTemplate.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const { id, name, level = 1, baseHp = 30, expBase = 5, goldMin = 1, goldMax = 3, tags = "" } = body;
  if (!id || !name) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const row = await prisma.enemyTemplate.create({ data: { id, name, level, baseHp, expBase, goldMin, goldMax, tags } });
  return NextResponse.json({ ok: true, row });
}
