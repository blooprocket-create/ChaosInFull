import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

// Increment character EXP fields (character exp and/or miningExp)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, exp, miningExp } = body as { characterId?: string; exp?: number; miningExp?: number };
  if (!characterId || (typeof exp !== "number" && typeof miningExp !== "number")) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // Clamp deltas to avoid abuse per request
  const clamp = (n: number) => Math.max(0, Math.min(50000, Math.floor(n)));
  const expDelta = typeof exp === "number" ? clamp(exp) : undefined;
  const miningDelta = typeof miningExp === "number" ? clamp(miningExp) : undefined;

  // Ownership guard and update
  const client = prisma as unknown as {
    character: {
      updateMany: (args: {
        where: { id: string; userId: string };
        data: { exp?: { increment: number }; miningExp?: { increment: number } };
      }) => Promise<{ count: number }>;
    };
  };

  const data: { exp?: { increment: number }; miningExp?: { increment: number } } = {};
  if (typeof expDelta === "number") data.exp = { increment: expDelta };
  if (typeof miningDelta === "number") data.miningExp = { increment: miningDelta };

  const res = await client.character.updateMany({ where: { id: characterId, userId: session.userId }, data });
  if (res.count === 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
