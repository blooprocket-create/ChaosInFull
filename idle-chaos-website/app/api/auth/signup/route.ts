import { NextResponse } from "next/server";
import { z } from "zod";
import { q, ensurePgcrypto } from "@/src/lib/db";
import { hashPassword, createSession } from "@/src/lib/auth";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    await ensurePgcrypto();
    const data = await req.json();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, username, password } = parsed.data;
    const dup = await q<{ exists: boolean }>`
      select exists(
        select 1 from "User" where email = ${email} or username = ${username}
      ) as exists
    `;
    if (dup[0]?.exists) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const rows = await q<{ id: string; email: string }>`
      with ins as (
        insert into "User" (id, email, username, passwordhash, isadmin)
        values (gen_random_uuid()::text, ${email}, ${username}, ${passwordHash}, false)
        returning id, email
      )
      insert into "PlayerStat" (id, userid)
      select gen_random_uuid()::text, id from ins
      returning (select id from ins limit 1) as id, (select email from ins limit 1) as email;
    `;
    const user = rows[0];
    await createSession({ userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("/api/auth/signup error:", err);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
