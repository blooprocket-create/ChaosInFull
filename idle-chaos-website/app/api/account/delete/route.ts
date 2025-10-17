import { NextResponse } from "next/server";
import { q } from "@/src/lib/db";
import { getSession, verifyPassword, destroySession } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { email, username, password, captcha, expected } = body as {
    email?: string;
    username?: string;
    password?: string;
    captcha?: string;
    expected?: string;
  };

  if (!email || !username || !password || !captcha || !expected) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (captcha !== expected) {
    return NextResponse.json({ ok: false, error: "captcha_failed" }, { status: 400 });
  }

  // Fetch user by session id and verify username + password
  const user = (await q<{ id: string; email: string; username: string; passwordhash: string }>`
    select id, email, username, passwordhash from "User" where id = ${session.userId}
  `)[0];
  if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  // Require BOTH email and username to match (case-insensitive)
  const typedUser = String(username).trim().toLowerCase();
  const typedEmail = String(email).trim().toLowerCase();
  const matchesUsername = user.username.toLowerCase() === typedUser;
  const matchesEmail = user.email.toLowerCase() === typedEmail;
  if (!matchesUsername || !matchesEmail) {
    return NextResponse.json({ ok: false, error: "identity_mismatch" }, { status: 400 });
  }

  const ok = await verifyPassword(password, user.passwordhash as unknown as string);
  if (!ok) return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 403 });

  // Cascade delete everything related to this user inside a single transaction
  // Delete related rows; FK constraints may cascade for some tables, but we clear explicitly.
  await q`delete from "ItemStack" where characterid in (select id from "Character" where userid = ${user.id})`;
  await q`delete from "CraftQueue" where characterid in (select id from "Character" where userid = ${user.id})`;
  await q`delete from "CharacterQuest" where characterid in (select id from "Character" where userid = ${user.id})`;
  await q`update "ChatMessage" set characterid = null where characterid in (select id from "Character" where userid = ${user.id})`;
  await q`delete from "Character" where userid = ${user.id}`;
  await q`delete from "AccountItemStack" where userid = ${user.id}`;
  await q`delete from "PlayerStat" where userid = ${user.id}`;
  await q`delete from "User" where id = ${user.id}`;

  await destroySession();
  return NextResponse.json({ ok: true, message: "account_deleted" });
}
