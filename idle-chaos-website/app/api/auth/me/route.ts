import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, user: null }, { status: 200 });
  return NextResponse.json({ ok: true, user: session }, { status: 200 });
}
