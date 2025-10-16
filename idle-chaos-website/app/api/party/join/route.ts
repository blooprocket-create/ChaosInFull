import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { zone, partyId, characterId } = await req.json().catch(() => ({ zone: "", partyId: "", characterId: "" }));
  if (!zone || !partyId || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const room = getZoneRoom(zone);
  try {
    room.joinParty(partyId, characterId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
