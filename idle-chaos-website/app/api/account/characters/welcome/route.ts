import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { characterId } = await req.json().catch(() => ({}));
  if (!characterId) return NextResponse.json({ ok: false, error: "characterId required" }, { status: 400 });
  const result = await q<{ count: number }>`
    update "Character" set seenwelcome = true where id = ${characterId} and userid = ${session.userId}
    returning 1 as count
  `;
  if (!result[0]) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
