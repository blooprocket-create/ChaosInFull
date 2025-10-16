import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await prisma.zoneDef.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.id !== 'string' || typeof b.name !== 'string' || typeof b.sceneKey !== 'string') return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const row = await prisma.zoneDef.create({ data: { id: b.id, name: b.name, sceneKey: b.sceneKey } });
  return NextResponse.json({ ok: true, row });
}
