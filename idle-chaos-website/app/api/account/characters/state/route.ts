import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, scene } = body as { characterId?: string; scene?: string };
  if (!characterId || !scene) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as {
    character: { updateMany: (args: { where: { id: string; userId: string }; data: { lastScene: string; lastSeenAt: Date } }) => Promise<{ count: number }> };
  };
  const res = await client.character.updateMany({ where: { id: characterId, userId: session.userId }, data: { lastScene: scene, lastSeenAt: new Date() } });
  if (res.count === 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
