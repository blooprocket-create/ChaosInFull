import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  // Optional whitelist via env
  const allowList = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowList.length && allowList.includes(session.email.toLowerCase())) return session;
  // Avoid tight coupling to generated types during migration by using a loose cast
  const client = prisma as unknown as { user: { findUnique: (args: { where: { id: string } }) => Promise<{ isAdmin?: boolean } | null> } };
  const user = await client.user.findUnique({ where: { id: session.userId } });
  if (user?.isAdmin) return session;
  return null;
}

export async function assertAdmin() {
  const session = await requireAdmin();
  if (!session) throw new Error("forbidden");
  return session;
}
