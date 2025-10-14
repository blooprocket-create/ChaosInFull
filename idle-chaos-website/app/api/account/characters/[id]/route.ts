import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const client = prisma as unknown as {
    character: { deleteMany: (args: { where: { id: string; userId: string } }) => Promise<{ count: number }> };
  };
  const res = await client.character.deleteMany({ where: { id, userId: session.userId } });
  if (res.count === 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
