import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { ensureBugReportTable, q } from "@/src/lib/db";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  await ensureBugReportTable();
  const rows = await q<{
    id: string;
    userid: string | null;
    characterid: string | null;
    description: string;
    screenshot: string | null;
    status: string;
    createdat: string;
    resolvedat: string | null;
  }>`
    select id, userid, characterid, description, screenshot, status,
           to_char(createdat, 'YYYY-MM-DD"T"HH24:MI:SSZ') as createdat,
           to_char(resolvedat, 'YYYY-MM-DD"T"HH24:MI:SSZ') as resolvedat
    from "BugReport"
    where status <> 'resolved'
    order by createdat desc
  `;
  return NextResponse.json({ ok: true, rows });
}
