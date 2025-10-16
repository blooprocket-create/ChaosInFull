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
  const data: Record<string, unknown> = {};
  for (const k of ["date", "version", "title", "highlights", "notes"]) if (k in body) (data as any)[k] = k === "date" ? new Date(body[k]) : body[k];
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
