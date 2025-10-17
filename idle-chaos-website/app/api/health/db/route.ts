import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const one = await prisma.$queryRawUnsafe<{ "?column?": number }[]>("SELECT 1");
    const userCount = await prisma.user.count().catch(() => -1);
    return NextResponse.json({
      ok: true,
      select1: one?.[0]?.["?column?"] ?? null,
      userCount,
      provider: "postgresql",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
