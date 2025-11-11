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
  // Pre-sanitize entries to finite, non-negative integers within int32 range
  const MAX_INT32 = 2147483647;
  const sanitized: Array<{ key: string; count: number }> = [];
  for (const [itemKey, count] of entries) {
    const n = Number(count);
    const safe = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    if (safe > 0) sanitized.push({ key: String(itemKey), count: Math.min(safe, MAX_INT32) });
  }
  try {
    // Type-safe access to optional Neon transaction helper
    type SqlTag = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<unknown>;
    type SqlClient = SqlTag & { begin?: (cb: (tx: SqlTag) => Promise<void>) => Promise<void> };
    const sqlClient = sql as unknown as SqlClient;
    const beginFn = sqlClient.begin;
    if (typeof beginFn === 'function') {
      // Use Neon transaction to ensure BEGIN/COMMIT runs on the same connection
      await beginFn(async (tx: SqlTag) => {
        // Lock the character row to serialize inventory writers
        await tx`select id from "Character" where id = ${characterId} and userid = ${session.userId} for update`;
        // Full replacement of stacks
        await tx`delete from "ItemStack" where characterid = ${characterId}`;
        const errs: Array<{ key: string; error: string } > = [];
        for (const { key, count } of sanitized) {
          try {
            await tx`
              insert into "ItemStack" (characterid, itemkey, count)
              values (${characterId}, ${key}, ${count})
            `;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            errs.push({ key, error: message });
          }
        }
        if (errs.length) {
          console.error('[inventory] partial insert errors', { characterId, errors: errs.slice(0, 3), total: errs.length });
        }
      });
    } else {
      // Fallback: non-transactional replace (best-effort) if .begin is unavailable
      await q`delete from "ItemStack" where characterid = ${characterId}`;
      const errs: Array<{ key: string; error: string } > = [];
      for (const { key, count } of sanitized) {
        try {
          await q`
            insert into "ItemStack" (characterid, itemkey, count)
            values (${characterId}, ${key}, ${count})
          `;
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          errs.push({ key, error: message });
        }
      }
      if (errs.length) {
        console.error('[inventory] partial insert errors (fallback)', { characterId, errors: errs.slice(0, 3), total: errs.length });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Temporary server-side logging for diagnostics (can be replaced with structured telemetry)
    console.error('[inventory] POST failed', { characterId, error: message });
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
