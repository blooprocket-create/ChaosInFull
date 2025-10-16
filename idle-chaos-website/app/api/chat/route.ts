import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

// Simple in-memory rate limiter per user: allow 3 messages per 5 seconds
// Note: In-memory limits reset on server restart and are per-instance. For production,
// use a shared store (Redis) or database-backed counters.
const rateMap: Map<string, { count: number; resetAt: number }> = new Map();

// GET /api/chat?since=timestamp&scene=Town
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");
  const scene = searchParams.get("scene") || undefined;
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);
  const msgs = await prisma.chatMessage.findMany({
    where: { createdAt: { gt: since }, ...(scene ? { scene } : {}) },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, text: true, createdAt: true, characterId: true, userId: true, scene: true, character: { select: { name: true } } },
  });
  const out = msgs.map(m => ({
    id: m.id,
    text: m.text,
    createdAt: m.createdAt,
    characterId: m.characterId,
    userId: m.userId,
    scene: m.scene,
    characterName: m.character?.name || null,
  }));
  return NextResponse.json({ ok: true, messages: out });
}

// POST { characterId, text, scene }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  // Rate limiting: 3 per 5s per user
  const now = Date.now();
  const key = session.userId;
  const windowMs = 5000; const max = 3;
  const entry = rateMap.get(key);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    if (entry.count >= max) {
      const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
      return NextResponse.json({ ok: false, error: "rate_limited", retryAfter }, { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } });
    }
    entry.count += 1;
  }
  const body = await req.json().catch(() => ({} as { characterId?: string; text?: string; scene?: string }));
  const { characterId, text, scene } = body;
  if (!text || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const trimmed = text.trim();
  if (!trimmed) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  // Validate ownership
  const owner = await prisma.character.findFirst({ where: { id: characterId, userId: session.userId }, select: { id: true } });
  if (!owner) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const created = await prisma.chatMessage.create({
    data: { userId: session.userId, characterId, text: trimmed, scene: scene || "Town" },
    select: { id: true, text: true, createdAt: true, characterId: true, scene: true, character: { select: { name: true } } },
  });
  return NextResponse.json({ ok: true, message: { id: created.id, text: created.text, createdAt: created.createdAt, characterId: created.characterId, scene: created.scene, characterName: created.character?.name || null } });
}
