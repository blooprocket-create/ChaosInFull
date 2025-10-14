import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { characterId } = await req.json().catch(() => ({}));
  if (!characterId) return NextResponse.json({ ok: false, error: "characterId required" }, { status: 400 });
  const client = prisma as unknown as {
    character: {
      updateMany: (args: { where: { id: string; userId: string }; data: { seenWelcome: boolean } }) => Promise<{ count: number }>;
    };
  };
  const result = await client.character.updateMany({ where: { id: characterId, userId: session.userId }, data: { seenWelcome: true } });
  if (result.count === 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
