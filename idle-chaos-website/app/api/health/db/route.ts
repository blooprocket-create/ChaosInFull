import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const one = (await prisma.$queryRawUnsafe("SELECT 1")) as Array<Record<string, number>>;
    const userCount = await prisma.user.count().catch(() => -1);
    return NextResponse.json({
      ok: true,
      select1: one?.[0]?.["?column?"] ?? null,
      userCount,
      provider: "postgresql",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
