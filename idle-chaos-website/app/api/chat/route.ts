import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

// GET /api/chat?since=timestamp&scene=Town
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");
  const scene = searchParams.get("scene") || undefined;
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);
  const chatClient = prisma as unknown as {
    chatMessage: {
      findMany: (args: { where: { createdAt: { gt: Date }; scene?: string }; orderBy: { createdAt: "asc" | "desc" }; take: number; select: { id: true; text: true; createdAt: true; characterId: true; userId: true; scene: true } }) => Promise<Array<{ id: string; text: string; createdAt: Date; characterId: string | null; userId: string; scene: string }>>
    }
  };
  const msgs = await chatClient.chatMessage.findMany({
    where: { createdAt: { gt: since }, ...(scene ? { scene } : {}) },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, text: true, createdAt: true, characterId: true, userId: true, scene: true },
  });
  return NextResponse.json({ ok: true, messages: msgs });
}

// POST { characterId, text, scene }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as { characterId?: string; text?: string; scene?: string }));
  const { characterId, text, scene } = body;
  if (!text || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const trimmed = text.trim();
  if (!trimmed) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  // Validate ownership
  const owner = await prisma.character.findFirst({ where: { id: characterId, userId: session.userId }, select: { id: true } });
  if (!owner) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const chatClient2 = prisma as unknown as {
    chatMessage: {
      create: (args: { data: { userId: string; characterId: string; text: string; scene: string }; select: { id: true; text: true; createdAt: true; characterId: true; scene: true } }) => Promise<{ id: string; text: string; createdAt: Date; characterId: string; scene: string }>
    }
  };
  const created = await chatClient2.chatMessage.create({
    data: { userId: session.userId, characterId, text: trimmed, scene: scene || "Town" },
    select: { id: true, text: true, createdAt: true, characterId: true, scene: true },
  });
  return NextResponse.json({ ok: true, message: created });
}
