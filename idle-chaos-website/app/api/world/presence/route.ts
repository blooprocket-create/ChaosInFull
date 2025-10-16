import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { assertCharacterOwner } from "@/src/lib/ownership";
import { heartbeat, list } from "@/src/server/presence";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const zone = searchParams.get("zone") || "";
  const characterId = searchParams.get("characterId") || "";
  if (!zone || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  try { await assertCharacterOwner(session.userId, characterId); }
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const others = list(zone, { excludeId: characterId });
  return NextResponse.json({ ok: true, players: others });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as { zone?: string; characterId?: string; name?: string; x?: number; y?: number }));
  const zone = String(body.zone || "");
  const characterId = String(body.characterId || "");
  const name = String(body.name || "");
  const x = Number.isFinite(body.x) ? Number(body.x) : 0;
  const y = Number.isFinite(body.y) ? Number(body.y) : 0;
  if (!zone || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  try { await assertCharacterOwner(session.userId, characterId); }
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  heartbeat(zone, { characterId, name, x, y });
  return NextResponse.json({ ok: true });
}
