import { NextResponse } from "next/server";
import { ensureBugReportTable, q } from "@/src/lib/db";
import { assertAdmin } from "@/src/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  await ensureBugReportTable();
  const body = await req.json().catch(() => ({})) as { status?: string };
  const { id } = await params;
  const status = typeof body.status === "string" ? body.status : "resolved";
  const now = new Date().toISOString();
  const rows = await q<{ id: string; status: string }>`
    update "BugReport"
    set status = ${status}, resolvedat = ${status === "resolved" ? now : null}
    where id = ${id}
    returning id, status
  `;
  if (!rows.length) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row: rows[0] });
}
