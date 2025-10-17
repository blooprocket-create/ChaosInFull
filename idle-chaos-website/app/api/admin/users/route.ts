import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await q<{ id: string; email: string; username: string | null; isadmin: boolean; createdat: Date }>`
    select id, email, username, isadmin, createdat from "User" order by createdat desc
  `;
  const shaped = rows.map(r => ({ id: r.id, email: r.email, username: r.username, isAdmin: r.isadmin, createdAt: r.createdat instanceof Date ? r.createdat.toISOString() : String(r.createdat) }));
  return NextResponse.json({ ok: true, rows: shaped });
}
