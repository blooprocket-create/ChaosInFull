import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { createSession, verifyPassword } from "@/src/lib/auth";
import { Prisma } from "@prisma/client";

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
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
    });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    await createSession({ userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("Prisma init error during login:", err.message);
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    console.error("/api/auth/login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
