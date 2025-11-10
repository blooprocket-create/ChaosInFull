import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterExtraColumns, ensureItemStackTable, ensureCharacterQuestTable } from "@/src/lib/db";

// Fetch a full hydrated character snapshot (core row + inventory stacks + quests).
// GET /api/account/characters/full?characterId=XYZ
// Response shape:
// { ok: true, character: { id, name, class, level, gold, flags, fishing, equipment, talents, lastScene, lastX, lastY, inventory: Record<string,number>, quests: { active:[{id,progress}], completed:[string] } } }
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  await ensureCharacterTable();
  await ensureCharacterExtraColumns();
  await ensureItemStackTable();
  await ensureCharacterQuestTable();

  // Ownership & core row (with flexible JSONB data)
  const rows = await q<{
    id: string; name: string; class: string; level: number;
    data: Record<string, unknown>;
  }>`
    select id, name, class, level, data
    from "Character"
    where id = ${characterId} and userid = ${session.userId}
    limit 1
  `;
  if (!rows.length) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const c = rows[0];
  
  // All character state comes from the flexible JSONB data column
  const characterData = c.data || {};

  // Inventory stacks
  const stacks = await q<{ itemkey: string; count: number }>`
    select itemkey, count from "ItemStack" where characterid = ${characterId}
  `;
  const inventory: Record<string, number> = {};
  for (const s of stacks) inventory[s.itemkey] = s.count;

  // Quests
  const questRows = await q<{ questid: string; status: string; progress: unknown }>`
    select questid, status, progress from "CharacterQuest" where characterid = ${characterId}
  `;
  const active: Array<{ id: string; progress?: unknown }> = [];
  const completed: string[] = [];
  for (const qRow of questRows) {
    if (qRow.status === 'completed') completed.push(qRow.questid);
    else active.push({ id: qRow.questid, progress: qRow.progress });
  }

  return NextResponse.json({
    ok: true,
    character: {
      id: c.id,
      name: c.name,
      class: c.class,
      level: c.level,
      // Spread ALL data from JSONB column - includes everything your JS sent!
      ...characterData,
      // Add inventory and quests from their dedicated tables
      inventory,
      quests: { active, completed }
    }
  });
}
