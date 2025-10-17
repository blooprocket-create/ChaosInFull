import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";
import { assertCharacterOwner } from "@/src/lib/ownership";
import { sql } from "@/src/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { zone, characterId } = await req.json().catch(() => ({ zone: "", characterId: "" }));
  if (!zone || !characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  // Ownership check
  try { await assertCharacterOwner(session.userId, characterId); } 
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const room = getZoneRoom(zone);
  const ps = room.join(characterId);
  const snap = room.snapshot(characterId);
  // If AFK was previously on, refresh startedAt to now when rejoining
  try {
    const rows = await sql`
      select auto from "AfkCombatState" where characterid = ${characterId} limit 1
    ` as unknown as Array<{ auto: boolean }>;
    const state = rows[0];
    if (state?.auto) {
      await sql`
        update "AfkCombatState" set startedat = now() where characterid = ${characterId}
      `;
    }
  } catch {}
  return NextResponse.json({ ok: true, phaseId: ps.phaseId, snapshot: snap });
}
