import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const client = prisma as unknown as { patchNote: { findMany: (args: { orderBy: Array<{ date?: "asc" | "desc"; version?: "asc" | "desc" }> }) => Promise<Array<{ id: string; date: string | Date; version: string; title: string; highlights: unknown; notes?: unknown }> > } };
  const rows = await client.patchNote.findMany({ orderBy: [{ date: "desc" }, { version: "desc" }] });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const body = await req.json().catch(() => ({}));
  const { date, version, title, highlights, notes } = body as { date?: string; version?: string; title?: string; highlights?: string[]; notes?: string[] };
  if (!date || !version || !title || !Array.isArray(highlights)) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as { patchNote: { create: (args: { data: { date: Date; version: string; title: string; highlights: string[]; notes?: string[] } }) => Promise<unknown> } };
  const row = await client.patchNote.create({ data: { date: new Date(date), version, title, highlights, notes } });
  return NextResponse.json({ ok: true, row });
}
