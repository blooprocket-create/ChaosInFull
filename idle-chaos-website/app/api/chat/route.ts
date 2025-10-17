import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensurePgcrypto } from "@/src/lib/db";

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
  let msgs: { id: string; text: string; createdat: string; characterid: string | null; userid: string; scene: string; charactername: string | null }[] = [];
  if (scene) {
    msgs = await q<{ id: string; text: string; createdat: string; characterid: string | null; userid: string; scene: string; charactername: string | null }>`
      select cm.id, cm.text, cm.createdat, cm.characterid, cm.userid, cm.scene, c.name as charactername
      from "ChatMessage" cm
      left join "Character" c on c.id = cm.characterid
      where cm.createdat > ${since} and cm.scene = ${scene}
      order by cm.createdat asc
      limit 100
    `;
  } else {
    msgs = await q<{ id: string; text: string; createdat: string; characterid: string | null; userid: string; scene: string; charactername: string | null }>`
      select cm.id, cm.text, cm.createdat, cm.characterid, cm.userid, cm.scene, c.name as charactername
      from "ChatMessage" cm
      left join "Character" c on c.id = cm.characterid
      where cm.createdat > ${since}
      order by cm.createdat asc
      limit 100
    `;
  }
  const out = msgs.map(m => ({
    id: m.id,
    text: m.text,
    createdAt: m.createdat,
    characterId: m.characterid,
    userId: m.userid,
    scene: m.scene,
    characterName: m.charactername,
  }));
  return NextResponse.json({ ok: true, messages: out });
}

// POST { characterId, text, scene }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  await ensurePgcrypto();
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
  const owns = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1`;
  if (!owns[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const created = await q<{ id: string; text: string; createdat: string; characterid: string | null; scene: string; name: string | null }>`
    with ins as (
      insert into "ChatMessage" (id, userid, characterid, text, scene)
      values (gen_random_uuid()::text, ${session.userId}, ${characterId}, ${trimmed}, ${scene || "Town"})
      returning id, text, createdat, characterid, scene
    )
    select ins.id, ins.text, ins.createdat, ins.characterid, ins.scene, c.name
    from ins left join "Character" c on c.id = ins.characterid
  `;
  const m = created[0];
  return NextResponse.json({ ok: true, message: { id: m.id, text: m.text, createdAt: m.createdat, characterId: m.characterid, scene: m.scene, characterName: m.name } });
}
