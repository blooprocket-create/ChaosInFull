import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, scene } = body as { characterId?: string; scene?: string };
  if (!characterId || !scene) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const res = await q<{ count: number }>`
    with upd as (
      update "Character" set lastscene = ${scene}, lastseenat = now()
      where id = ${characterId} and userid = ${session.userId}
      returning 1
    ) select count(*)::int as count from upd
  `;
  if ((res[0]?.count ?? 0) === 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
