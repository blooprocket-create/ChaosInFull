import { NextResponse } from "next/server";
import { q, sql, ensureCharacterTable, ensureItemStackTable, ensureCharacterGoldColumn } from "@/src/lib/db";
import { getSession } from "@/src/lib/auth";
import { itemByKey } from "../../../src/data/items";

type Action = "buy" | "sell";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, action, itemKey, quantity } = body as { characterId?: string; action?: Action; itemKey?: string; quantity?: number };
  if (!characterId || !action || !itemKey) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const qty = Math.max(1, Math.min(999, Math.floor(Number.isFinite(Number(quantity)) ? Number(quantity) : 1)));
  const item = itemByKey[itemKey];
  if (!item) return NextResponse.json({ ok: false, error: "unknown item" }, { status: 400 });
  const ownerRows = await q<{ id: string; gold: number }>`select id, gold from "Character" where id = ${characterId} and userid = ${session.userId}`;
  const owner = ownerRows[0];
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  // Ensure required tables/columns exist (best-effort)
  await ensureCharacterTable();
  await ensureCharacterGoldColumn();
  await ensureItemStackTable();
  const rawPrice = action === "buy" ? item.buy : item.sell;
  // Validate presence of price; guard against undefined leading to NaN math
  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice < 0) {
    return NextResponse.json({ ok: false, error: "unpriced item", message: `No ${action} price configured for ${itemKey}` }, { status: 400 });
  }
  const price = Math.floor(rawPrice);
  const deltaGold = price * qty * (action === "buy" ? -1 : 1);
  // Pre-check current counts and gold
  const currentStacks = await q<{ count: number }>`
    select count from "ItemStack" where characterid = ${characterId} and itemkey = ${itemKey}
  `;
  const currentCount = currentStacks[0]?.count ?? 0;
  if (action === "sell" && currentCount < qty) return NextResponse.json({ ok: false, error: "insufficient items" }, { status: 400 });
  if (action === "buy" && (owner.gold + deltaGold) < 0) return NextResponse.json({ ok: false, error: "insufficient gold" }, { status: 400 });
  const newGold = owner.gold + deltaGold;
  const nextCount = Math.max(0, currentCount + (action === "buy" ? qty : -qty));
  // Apply updates atomically inside a transaction to avoid partial state on failure
  try {
    type SqlTag = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<unknown>;
    type SqlClient = SqlTag & { begin?: (cb: (tx: SqlTag) => Promise<void>) => Promise<void> };
    const sqlClient = sql as unknown as SqlClient;
    const beginFn = sqlClient.begin;
    if (beginFn) {
      await beginFn(async (tx: SqlTag) => {
        await tx`update "Character" set gold = ${newGold} where id = ${characterId}`;
        if (nextCount <= 0) {
          await tx`delete from "ItemStack" where characterid = ${characterId} and itemkey = ${itemKey}`;
        } else {
          await tx`
            insert into "ItemStack" (characterid, itemkey, count)
            values (${characterId}, ${itemKey}, ${nextCount})
            on conflict (characterid, itemkey) do update set count = excluded.count
          `;
        }
      });
    } else {
      // Fallback: best-effort non-transactional update
      await q`update "Character" set gold = ${newGold} where id = ${characterId}`;
      if (nextCount <= 0) {
        await q`delete from "ItemStack" where characterid = ${characterId} and itemkey = ${itemKey}`;
      } else {
        await q`
          insert into "ItemStack" (characterid, itemkey, count)
          values (${characterId}, ${itemKey}, ${nextCount})
          on conflict (characterid, itemkey) do update set count = excluded.count
        `;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[shop] transaction failed', { characterId, action, itemKey, qty, error: message });
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, gold: newGold, itemKey, count: nextCount, qty });
}
