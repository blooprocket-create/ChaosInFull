import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureItemStackTable, ensureCharacterQuestTable, ensureCharacterSkillExpColumns, ensureCharacterEquipmentColumn, ensureCharacterTalentsColumn, ensureCharacterGoldColumn, ensureCharacterFlagsColumn } from "@/src/lib/db";
import { deriveSkillProgressFromExp } from "@/src/lib/skills";

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
  await ensureItemStackTable();
  await ensureCharacterQuestTable();
  await ensureCharacterSkillExpColumns();
  await ensureCharacterEquipmentColumn();
  await ensureCharacterGoldColumn();
  await ensureCharacterTalentsColumn();
  await ensureCharacterFlagsColumn();

  // Ownership & core row (with flexible JSONB data)
  const rows = await q<{
    id: string; name: string; class: string; level: number; gold?: number;
    // base stats persisted on the character row (server-authoritative)
    str?: number | null; int?: number | null; agi?: number | null; luk?: number | null;
    currentscene?: string | null; lastx?: number | null; lasty?: number | null;
    mining_exp?: number; woodcutting_exp?: number; fishing_exp?: number; cooking_exp?: number; smithing_exp?: number;
    equipment?: Record<string, unknown>;
    talents?: Record<string, unknown>;
    flags?: Record<string, unknown> | null;
  }>`
    select id, name, class, level, gold, currentscene, lastx, lasty,
           coalesce(str, 0) as str,
           coalesce(int, 0) as int,
           coalesce(agi, 0) as agi,
           coalesce(luk, 0) as luk,
           coalesce(mining_exp, 0) as mining_exp,
           coalesce(woodcutting_exp, 0) as woodcutting_exp,
           coalesce(fishing_exp, 0) as fishing_exp,
           coalesce(cooking_exp, 0) as cooking_exp,
           coalesce(smithing_exp, 0) as smithing_exp,
           equipment,
            talents,
            flags
    from "Character"
    where id = ${characterId} and userid = ${session.userId}
    limit 1
  `;
  if (!rows.length) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const c = rows[0];
  const equipment = (c.equipment && typeof c.equipment === 'object') ? c.equipment : null;
  const talents = (c.talents && typeof c.talents === 'object') ? c.talents : null;
  // Derive skill progress from raw exp columns (preferred over any JSONB blocks)
  const mining = deriveSkillProgressFromExp(Number(c.mining_exp || 0));
  const woodcutting = deriveSkillProgressFromExp(Number(c.woodcutting_exp || 0));
  const fishing = deriveSkillProgressFromExp(Number(c.fishing_exp || 0));
  const cooking = deriveSkillProgressFromExp(Number(c.cooking_exp || 0));
  const smithing = deriveSkillProgressFromExp(Number(c.smithing_exp || 0));

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
      gold: typeof c.gold === 'number' ? c.gold : 0,
      flags: (c.flags && typeof c.flags === 'object') ? c.flags : {},
      // expose server-authoritative base stats under a nested stats object the client UI expects
      stats: { str: Number(c.str || 0), int: Number(c.int || 0), agi: Number(c.agi || 0), luk: Number(c.luk || 0) },
  ...(c.currentscene ? { currentScene: c.currentscene } : {}),
  ...(typeof c.lastx === 'number' ? { lastX: c.lastx } : {}),
  ...(typeof c.lasty === 'number' ? { lastY: c.lasty } : {}),
      // Prefer dedicated equipment column if present
      ...(equipment ? { equipment } : {}),
    // Prefer dedicated talents column if present
    ...(talents ? { talents } : {}),
  // Derived skills
  mining,
  woodcutting,
  fishing,
  cooking,
  smithing,
      // Add inventory and quests from their dedicated tables
      inventory,
      quests: { active, completed }
    }
  });
}
