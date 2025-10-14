import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
// Note: Some Prisma versions in editors mis-type TransactionClient; using 'any' for tx to avoid false negatives.
import { getSession, verifyPassword, destroySession } from "@/src/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { username, password, captcha, expected } = body as {
    username?: string;
    password?: string;
    captcha?: string;
    expected?: string;
  };

  if (!username || !password || !captcha || !expected) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (captcha !== expected) {
    return NextResponse.json({ ok: false, error: "captcha_failed" }, { status: 400 });
  }

  // Fetch user by session id and verify username + password
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (user.username !== username) {
    return NextResponse.json({ ok: false, error: "username_mismatch" }, { status: 400 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 403 });

  // Cascade delete everything related to this user inside a single transaction
  await prisma.$transaction(async (tx: any) => {
    // Collect character IDs for this user
    const chars: Array<{ id: string }> = await tx.character.findMany({ where: { userId: user.id }, select: { id: true } });
    const charIds: string[] = chars.map((c: { id: string }) => c.id);

    if (charIds.length > 0) {
      await tx.itemStack.deleteMany({ where: { characterId: { in: charIds } } });
      await tx.craftQueue.deleteMany({ where: { characterId: { in: charIds } } });
      await tx.character.deleteMany({ where: { id: { in: charIds } } });
    }

    await tx.accountItemStack.deleteMany({ where: { userId: user.id } });
    await tx.playerStat.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  await destroySession();
  return NextResponse.json({ ok: true, message: "account_deleted" });
}
