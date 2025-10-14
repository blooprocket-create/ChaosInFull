import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const username = String(form.get("username") || "").trim();
  if (username.length < 3 || username.length > 32) {
    return NextResponse.json({ error: "Name must be 3-32 characters" }, { status: 400 });
  }
  try {
    await prisma.user.update({ where: { id: session.userId }, data: { username } });
    return NextResponse.json({ ok: true, message: "Display name updated" });
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Name is taken" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
