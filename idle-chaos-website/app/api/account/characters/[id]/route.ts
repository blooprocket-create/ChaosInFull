import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  // Ownership check
  const owner = await q<{ id: string }>`select id from "Character" where id = ${id} and userid = ${session.userId}`;
  if (!owner.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  // Delete dependents and character
  await q`delete from "ItemStack" where characterid = ${id}`;
  await q`delete from "CraftQueue" where characterid = ${id}`;
  await q`delete from "CharacterQuest" where characterid = ${id}`;
  await q`update "ChatMessage" set characterid = null where characterid = ${id}`;
  const res = await q<{ count: number }>`
    with del as (delete from "Character" where id = ${id} and userid = ${session.userId} returning 1)
    select count(*)::int as count from del
  `;
  if (!res.length || res[0].count === 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
