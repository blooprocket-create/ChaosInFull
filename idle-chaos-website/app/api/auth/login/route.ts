import { NextResponse } from "next/server";
import { z } from "zod";
import { q, UserRow } from "@/src/lib/db";
import { createSession, verifyPassword } from "@/src/lib/auth";

const schema = z.object({
  emailOrUsername: z.string().min(3).max(255),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { emailOrUsername, password } = parsed.data;
    const rows = await q<UserRow>`
      select id, email, username, passwordhash, isadmin
      from "User"
      where email = ${emailOrUsername} or username = ${emailOrUsername}
      limit 1
    `;
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const ok = await verifyPassword(password, user.passwordhash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    await createSession({ userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("/api/auth/login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
