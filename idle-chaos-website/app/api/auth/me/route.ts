import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { requireAdmin } from "@/src/lib/authz";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, user: null }, { status: 200 });
  const adminSession = await requireAdmin();
  return NextResponse.json({ ok: true, user: { ...session, isAdmin: !!adminSession } }, { status: 200 });
}
