import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

// Returns summary of all characters for the logged in user including skill levels and last scene/AFK duration basis
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await q<{
    id: string; name: string; class: string; level: number;
    mininglevel: number; woodcuttinglevel: number; craftinglevel: number; fishinglevel: number;
    lastscene: string; lastseenat: string; createdat: string
  }>`
    select id, name, class, level, mininglevel, woodcuttinglevel, craftinglevel, fishinglevel, lastscene, lastseenat, createdat
    from "Character" where userid = ${session.userId} order by createdat asc
  `;
  const now = Date.now();
  const mapped = rows.map(c => {
    const lastSeen = new Date(c.lastseenat).getTime();
    const afkMs = Math.max(0, now - lastSeen);
    return {
      id: c.id, name: c.name, class: c.class, level: c.level,
      miningLevel: c.mininglevel, woodcuttingLevel: c.woodcuttinglevel, craftingLevel: c.craftinglevel, fishingLevel: c.fishinglevel,
      lastScene: c.lastscene, lastSeenAt: c.lastseenat, afkMs,
    };
  });
  return NextResponse.json({ characters: mapped });
}
