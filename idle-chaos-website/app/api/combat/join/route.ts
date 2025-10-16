import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";
import { assertCharacterOwner } from "@/src/lib/ownership";
import { prisma } from "@/src/lib/prisma";

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
    type AfkState = { auto: boolean } | null;
    type AfkDelegate = { findUnique: (args: { where: { characterId: string } }) => Promise<AfkState>; update: (args: { where: { characterId: string }; data: { startedAt: Date } }) => Promise<void> };
    const afk = (prisma as unknown as { afkCombatState: AfkDelegate }).afkCombatState;
    const state = await afk.findUnique({ where: { characterId } });
    if (state?.auto) {
      await afk.update({ where: { characterId }, data: { startedAt: new Date() } });
    }
  } catch {}
  return NextResponse.json({ ok: true, phaseId: ps.phaseId, snapshot: snap });
}
