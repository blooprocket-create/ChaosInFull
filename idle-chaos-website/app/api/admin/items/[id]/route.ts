import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const row = await prisma.itemDef.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const allowed = ["name", "description", "rarity", "stackable", "maxStack", "buy", "sell"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) (data as any)[k] = body[k];
  const row = await prisma.itemDef.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  await prisma.itemDef.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
