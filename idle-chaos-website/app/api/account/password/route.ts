import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession, verifyPassword, hashPassword } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const currentPassword = String(form.get("currentPassword") || "");
  const newPassword = String(form.get("newPassword") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");
  if (newPassword.length < 8 || newPassword.length > 100) return NextResponse.json({ error: "Password must be 8-100 chars" }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash: hashed } });
  return NextResponse.json({ ok: true, message: "Password updated" });
}
