import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await prisma.itemDef.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const { id, name, description = "", rarity = "common", stackable = true, maxStack = 999, buy = 0, sell = 0 } = body;
  if (!id || !name) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const row = await prisma.itemDef.create({ data: { id, name, description, rarity, stackable, maxStack, buy, sell } });
  return NextResponse.json({ ok: true, row });
}
