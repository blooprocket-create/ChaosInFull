import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { hashPassword, createSession } from "@/src/lib/auth";
import { Prisma } from "@prisma/client";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, username, password } = parsed.data;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, stats: { create: {} } },
    });
    await createSession({ userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Common Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
      }
    }
    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("Prisma init error during signup:", err.message);
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    console.error("/api/auth/signup error:", err);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
