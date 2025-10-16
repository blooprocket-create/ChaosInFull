import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { token } = await req.json().catch(() => ({ token: "" }));
  const allowEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const hasEmail = allowEmails.includes(session.email.toLowerCase());
  const promoteToken = (process.env.PROMOTE_TOKEN || "").trim();
  const hasToken = promoteToken.length > 0 && token === promoteToken;
  if (!hasEmail && !hasToken) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const client = prisma as unknown as { user: { update: (args: { where: { id: string }; data: { isAdmin: boolean } }) => Promise<void> } };
  await client.user.update({ where: { id: session.userId }, data: { isAdmin: true } });
  return NextResponse.json({ ok: true });
}
