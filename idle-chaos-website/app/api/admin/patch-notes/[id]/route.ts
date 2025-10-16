import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const client = prisma as unknown as { patchNote: { findUnique: (args: { where: { id: string } }) => Promise<unknown | null> } };
  const row = await client.patchNote.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const data: { date?: Date; version?: string; title?: string; highlights?: string[]; notes?: string[] } = {};
  const b = body as Record<string, unknown>;
  if (typeof b.date === 'string') data.date = new Date(b.date);
  if (b.date instanceof Date) data.date = b.date;
  if (typeof b.version === 'string') data.version = b.version;
  if (typeof b.title === 'string') data.title = b.title;
  if (Array.isArray(b.highlights)) data.highlights = b.highlights.map((s) => String(s));
  if (Array.isArray(b.notes)) data.notes = b.notes.map((s) => String(s));
  const client = prisma as unknown as { patchNote: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> } };
  const row = await client.patchNote.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const client = prisma as unknown as { patchNote: { delete: (args: { where: { id: string } }) => Promise<void> } };
  await client.patchNote.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
