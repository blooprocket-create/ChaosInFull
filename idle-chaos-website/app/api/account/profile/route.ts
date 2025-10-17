import { NextResponse } from "next/server";
import { q } from "@/src/lib/db";
import { getSession } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const username = String(form.get("username") || "").trim();
  if (username.length < 3 || username.length > 32) {
    return NextResponse.json({ error: "Name must be 3-32 characters" }, { status: 400 });
  }
  // Enforce uniqueness by checking case-insensitively
  const dup = await q<{ exists: boolean }>`
    select exists(select 1 from "User" where lower(username) = lower(${username}) and id <> ${session.userId}) as exists
  `;
  if (dup[0]?.exists) return NextResponse.json({ error: "Name is taken" }, { status: 400 });
  await q`update "User" set username = ${username} where id = ${session.userId}`;
  return NextResponse.json({ ok: true, message: "Display name updated" });
}
