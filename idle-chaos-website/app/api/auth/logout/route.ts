import { NextResponse } from "next/server";
import { destroySession } from "@/src/lib/auth";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
