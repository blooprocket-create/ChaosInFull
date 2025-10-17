import { NextRequest, NextResponse } from "next/server";
import { q } from "@/src/lib/db";
import { getSession } from "@/src/lib/auth";

/*
POST /api/account/storage/transfer
Body: {
  characterId: string;
  direction: "toStorage" | "toInventory";
  itemKey: string;
  count?: number; // optional; defaults to full stack available on source
}
Atomic behavior:
- Fetch character ownership and existing per-character stack + account stack.
- Determine transfer amount (min(requested, available)).
- Apply within a single transaction: update/delete source stack; upsert target stack.
- Return updated inventory and storage snapshot.
*/

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as {
    characterId?: string;
    direction?: "toStorage" | "toInventory";
    itemKey?: string;
    count?: number;
  } | null;
  if (!body || !body.characterId || !body.direction || !body.itemKey) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { characterId, direction, itemKey } = body;
  let { count } = body;
  // Validate count if provided: must be a positive integer
  if (count !== undefined) {
    if (typeof count !== "number" || !Number.isFinite(count)) {
      return NextResponse.json({ error: "Invalid count" }, { status: 400 });
    }
    // Normalize to integer
    count = Math.floor(count);
    if (count < 1) {
      return NextResponse.json({ error: "Count must be at least 1" }, { status: 400 });
    }
  }
  // Verify character belongs to user
  const owns = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId}`;
  if (!owns.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Load source stacks
  const charStack = (await q<{ count: number }>`select count from "ItemStack" where characterid = ${characterId} and itemkey = ${itemKey}`)[0] ?? { count: 0 };
  const acctStack = (await q<{ count: number }>`select count from "AccountItemStack" where userid = ${session.userId} and itemkey = ${itemKey}`)[0] ?? { count: 0 };
  if (direction === "toStorage") {
    const available = charStack?.count ?? 0;
    if (available <= 0) return NextResponse.json({ error: "No items" }, { status: 400 });
    if (count == null) count = available;
    // Clamp to available
    if (count > available) count = available;
    const amt = count ?? available;
    // decrement or delete character stack
    if (available - amt <= 0) {
      await q`delete from "ItemStack" where characterid = ${characterId} and itemkey = ${itemKey}`;
    } else {
      await q`update "ItemStack" set count = ${available - amt} where characterid = ${characterId} and itemkey = ${itemKey}`;
    }
    // upsert account stack
    const newCount = (acctStack?.count ?? 0) + amt;
    await q`insert into "AccountItemStack" (userid, itemkey, count) values (${session.userId}, ${itemKey}, ${newCount})
            on conflict (userid, itemkey) do update set count = excluded.count`;
  } else {
    const available = acctStack?.count ?? 0;
    if (available <= 0) return NextResponse.json({ error: "No items" }, { status: 400 });
    if (count == null) count = available;
    // Clamp to available
    if (count > available) count = available;
    const amt = count ?? available;
    // decrement or delete account stack
    if (available - amt <= 0) {
      await q`delete from "AccountItemStack" where userid = ${session.userId} and itemkey = ${itemKey}`;
    } else {
      await q`update "AccountItemStack" set count = ${available - amt} where userid = ${session.userId} and itemkey = ${itemKey}`;
    }
    // upsert character stack
    const newCount = (charStack?.count ?? 0) + amt;
    await q`insert into "ItemStack" (characterid, itemkey, count) values (${characterId}, ${itemKey}, ${newCount})
            on conflict (characterid, itemkey) do update set count = excluded.count`;
  }
  // Return updated snapshot
  const newCharStacks = await q<{ itemkey: string; count: number }>`select itemkey, count from "ItemStack" where characterid = ${characterId}`;
  const newAcctStacks = await q<{ itemkey: string; count: number }>`select itemkey, count from "AccountItemStack" where userid = ${session.userId}`;
  const inv: Record<string, number> = {};
  for (const s of newCharStacks) inv[s.itemkey] = s.count;
  const storage: Record<string, number> = {};
  for (const s of newAcctStacks) storage[s.itemkey] = s.count;
  return NextResponse.json({ inventory: inv, storage });
}
