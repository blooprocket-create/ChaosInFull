import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { ensurePgcrypto, q } from "@/src/lib/db";
import { ensureBugReportTable } from "@/src/lib/bugReports";

type BugPayload = {
  characterId?: string;
  description?: string;
  screenshot?: string;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as BugPayload;
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return NextResponse.json({ ok: false, error: "missing_description" }, { status: 400 });
  const screenshot = typeof body.screenshot === "string" && body.screenshot.startsWith("data:image/")
    ? body.screenshot
    : null;
  const characterId = typeof body.characterId === "string" ? body.characterId : null;
  await ensurePgcrypto();
  await ensureBugReportTable();
  try {
    await q`
      insert into "BugReport" (id, userid, characterid, description, screenshot, status)
      values (gen_random_uuid()::text, ${session.userId}, ${characterId}, ${description}, ${screenshot}, 'open')
    `;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
