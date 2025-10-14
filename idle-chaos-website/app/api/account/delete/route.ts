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
  await prisma.$transaction(async (tx) => {
    const client = tx as unknown as {
      character: { findMany: (args: { where: { userId: string }; select: { id: boolean } }) => Promise<Array<{ id: string }>>; deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<unknown> };
      itemStack: { deleteMany: (args: { where: { characterId: { in: string[] } } }) => Promise<unknown> };
      craftQueue: { deleteMany: (args: { where: { characterId: { in: string[] } } }) => Promise<unknown> };
      accountItemStack: { deleteMany: (args: { where: { userId: string } }) => Promise<unknown> };
      playerStat: { deleteMany: (args: { where: { userId: string } }) => Promise<unknown> };
      user: { delete: (args: { where: { id: string } }) => Promise<unknown> };
    };
    // Collect character IDs for this user
    const chars: Array<{ id: string }> = await client.character.findMany({ where: { userId: user.id }, select: { id: true } });
    const charIds: string[] = chars.map((c: { id: string }) => c.id);

    if (charIds.length > 0) {
      await client.itemStack.deleteMany({ where: { characterId: { in: charIds } } });
      await client.craftQueue.deleteMany({ where: { characterId: { in: charIds } } });
      await client.character.deleteMany({ where: { id: { in: charIds } } });
    }

    await client.accountItemStack.deleteMany({ where: { userId: user.id } });
    await client.playerStat.deleteMany({ where: { userId: user.id } });
    await client.user.delete({ where: { id: user.id } });
  });

  await destroySession();
  return NextResponse.json({ ok: true, message: "account_deleted" });
}
