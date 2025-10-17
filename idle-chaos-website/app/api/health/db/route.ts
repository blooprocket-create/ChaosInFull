import { NextResponse } from "next/server";
import { sql } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const one = await sql<{ one: number }[]>`select 1 as one`;
    const users = await sql<{ count: number }[]>`select count(*)::int as count from "User"`;
    return NextResponse.json({
      ok: true,
      select1: one?.[0]?.one ?? null,
      userCount: users?.[0]?.count ?? null,
      provider: "postgresql",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
