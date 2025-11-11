import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, sql, ensureItemStackTable, ensureCharacterTable } from "@/src/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, items } = body as { characterId?: string; items?: Record<string, number> };
  if (!characterId || !items) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  await ensureCharacterTable();
  await ensureItemStackTable();
  // Verify ownership
  const owner = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1`;
  if (!owner.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const entries = Object.entries(items);
  try {
    // Use Neon transaction to ensure BEGIN/COMMIT runs on the same connection
    await (sql as any).begin(async (tx: typeof sql) => {
      // Lock the character row to serialize inventory writers
      await tx`select id from "Character" where id = ${characterId} and userid = ${session.userId} for update`;
      // Full replacement of stacks
      await tx`delete from "ItemStack" where characterid = ${characterId}`;
      for (const [itemKey, count] of entries) {
        const safe = Math.max(0, Math.floor(count));
        if (safe > 0) {
          await tx`
            insert into "ItemStack" (characterid, itemkey, count)
            values (${characterId}, ${itemKey}, ${safe})
          `;
        }
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }
  // Return updated snapshot
  const rows = await q<{ itemkey: string; count: number }>`select itemkey, count from "ItemStack" where characterid = ${characterId}`;
  const next: Record<string, number> = {};
  for (const r of rows) if (r.count > 0) next[r.itemkey] = r.count;
  return NextResponse.json({ ok: true, items: next });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  await ensureCharacterTable();
  await ensureItemStackTable();
  const owner = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1`;
  if (!owner.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const rows = await q<{ itemkey: string; count: number }>`select itemkey, count from "ItemStack" where characterid = ${characterId}`;
  const items: Record<string, number> = {};
  for (const r of rows) {
    if (r.count > 0) items[r.itemkey] = r.count;
  }
  return NextResponse.json({ ok: true, items });
}
