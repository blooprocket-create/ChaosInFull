import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const zone = searchParams.get("zone") || "";
  const characterId = searchParams.get("characterId") || "";
  if (!zone || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const room = getZoneRoom(zone);
  try {
    const snap = room.snapshot(characterId);
    return NextResponse.json({ ok: true, snapshot: snap });
  } catch {
    return NextResponse.json({ ok: false, error: "not_joined" }, { status: 400 });
  }
}
