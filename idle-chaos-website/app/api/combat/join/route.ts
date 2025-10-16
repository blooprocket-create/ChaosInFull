import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { zone, characterId } = await req.json().catch(() => ({ zone: "", characterId: "" }));
  if (!zone || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const room = getZoneRoom(zone);
  const ps = room.join(characterId);
  const snap = room.snapshot(characterId);
  return NextResponse.json({ ok: true, phaseId: ps.phaseId, snapshot: snap });
}
