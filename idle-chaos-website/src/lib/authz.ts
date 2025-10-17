import { sql } from "@/src/lib/db";
import { getSession } from "@/src/lib/auth";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  // Optional whitelist via env
  const allowList = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowList.length && allowList.includes(session.email.toLowerCase())) return session;
  const rows = await sql<{ isadmin: boolean }[]>`select isadmin from "User" where id = ${session.userId} limit 1`;
  if (rows[0]?.isadmin) return session;
  return null;
}

export async function assertAdmin() {
  const session = await requireAdmin();
  if (!session) throw new Error("forbidden");
  return session;
}
