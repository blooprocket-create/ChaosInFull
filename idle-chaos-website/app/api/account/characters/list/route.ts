import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

// Returns summary of all characters for the logged in user including skill levels and last scene/AFK duration basis
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = prisma as unknown as {
    character: { findMany: (args: { where: { userId: string }; orderBy: { createdAt: "asc" | "desc" } }) => Promise<Array<{ id: string; name: string; class: string; level: number; miningLevel: number; woodcuttingLevel: number; craftingLevel: number; fishingLevel: number; lastScene: string; lastSeenAt: Date }> > };
  };
  const chars = await client.character.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "asc" } });
  const now = Date.now();
  const mapped = chars.map(c => {
    const lastSeen = new Date(c.lastSeenAt).getTime();
    const afkMs = Math.max(0, now - lastSeen);
    return { ...c, afkMs };
  });
  return NextResponse.json({ characters: mapped });
}
