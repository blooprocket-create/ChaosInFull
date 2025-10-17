import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  const rows = await q<{ id: string; email: string; username: string | null; isadmin: boolean; createdat: Date }>`
    select id, email, username, isadmin, createdat from "User" where id = ${id}
  `;
  const r = rows[0];
  if (!r) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const row = { id: r.id, email: r.email, username: r.username, isAdmin: r.isadmin, createdAt: r.createdat instanceof Date ? r.createdat.toISOString() : String(r.createdat) };
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const b = body as Record<string, unknown>;
  const { id } = await params;
  const rows = await q<{ id: string; email: string; username: string | null; isadmin: boolean; createdat: Date }>`
    update "User" set
      email = coalesce(${typeof b.email === 'string' ? b.email : null}::text, email),
      username = coalesce(${typeof b.username === 'string' ? b.username : null}::text, username),
      isadmin = coalesce(${typeof b.isAdmin === 'boolean' ? b.isAdmin : null}::boolean, isadmin)
    where id = ${id}
    returning id, email, username, isadmin, createdat
  `;
  const r = rows[0];
  if (!r) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const row = { id: r.id, email: r.email, username: r.username, isAdmin: r.isadmin, createdAt: r.createdat instanceof Date ? r.createdat.toISOString() : String(r.createdat) };
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const { id } = await params;
  await q`delete from "User" where id = ${id}`;
  return NextResponse.json({ ok: true });
}
