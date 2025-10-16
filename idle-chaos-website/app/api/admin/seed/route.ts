import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type PrismaLoose = {
  itemDef: { upsert: (args: { where: { id: string }; update: Partial<{ name: string; description: string; sell: number; buy: number }>; create: { id: string; name: string; description: string; sell: number; buy: number } }) => Promise<void> };
  npcDef: { upsert: (args: { where: { id: string }; update: Partial<{ name: string }>; create: { id: string; name: string } }) => Promise<void> };
  quest: { upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; name: string; description: string; objectiveType: string; objectiveTarget: string; objectiveCount: number; giverNpcId?: string | null; nextQuestId?: string | null; minLevel?: number; requiresQuestId?: string | null; rewardGold?: number; rewardExp?: number; rewardMiningExp?: number; rewardCraftingExp?: number } }) => Promise<void> };
  questRewardItem: { findFirst: (args: { where: { questId: string; itemId: string } }) => Promise<{ id: string } | null>; create: (args: { data: { questId: string; itemId: string; qty: number } }) => Promise<void> };
  zoneDef: { upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; name: string; sceneKey: string } }) => Promise<void> };
  enemyTemplate: { upsert: (args: { where: { id: string }; update: Record<string, unknown>; create: { id: string; name: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number } }) => Promise<void> };
  dropTable: { upsert: (args: { where: { id?: string; templateId?: string }; update: Record<string, unknown>; create: { id: string; templateId: string } }) => Promise<{ id: string }> };
  dropEntry: { findMany: (args: { where: { dropTableId: string; itemId: string } }) => Promise<Array<{ id: string }>>; create: (args: { data: { dropTableId: string; itemId: string; weight: number; minQty: number; maxQty: number } }) => Promise<void> };
  spawnConfig: { create: (args: { data: { zoneId: string; templateId: string; budget: number; respawnMs: number; slots: number[]; phaseType: string } }) => Promise<void> };
};

const ITEMS: Array<{ id: string; name: string; sell: number; buy?: number; description?: string }> = [
  { id: "copper", name: "Copper Ore", sell: 2 },
  { id: "tin", name: "Tin Ore", sell: 3 },
  { id: "copper_bar", name: "Copper Bar", sell: 8 },
  { id: "bronze_bar", name: "Bronze Bar", sell: 12 },
  { id: "log", name: "Log", sell: 2 },
  { id: "plank", name: "Plank", sell: 4 },
  { id: "oak_log", name: "Oak Log", sell: 4 },
  { id: "oak_plank", name: "Oak Plank", sell: 7 },
  { id: "copper_armor", name: "Copper Armor", sell: 24 },
  { id: "copper_dagger", name: "Copper Dagger", sell: 16 },
  { id: "slime_goop", name: "Slime Goop", sell: 5 },
];

const ENEMIES: Array<{ id: string; name: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number }> = [
  { id: "slime", name: "Slime", level: 1, baseHp: 30, expBase: 5, goldMin: 1, goldMax: 3 },
  { id: "slime_epic", name: "Slime (Epic)", level: 3, baseHp: 80, expBase: 12, goldMin: 3, goldMax: 6 },
  { id: "big_slime", name: "Big Slime", level: 5, baseHp: 160, expBase: 24, goldMin: 4, goldMax: 9 },
  { id: "big_slime_epic", name: "Big Slime (Epic)", level: 7, baseHp: 260, expBase: 36, goldMin: 6, goldMax: 12 },
  { id: "boss_slime", name: "Boss Slime", level: 10, baseHp: 500, expBase: 100, goldMin: 15, goldMax: 30 },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = prisma as unknown as PrismaLoose;
  // Reset AFK combat state for clean local seeds
  try { await (prisma as any).afkCombatState.deleteMany({}); } catch {}
  // Items
  for (const it of ITEMS) {
    await client.itemDef.upsert({ where: { id: it.id }, update: { name: it.name, description: it.description ?? "", sell: it.sell, buy: it.buy ?? 0 }, create: { id: it.id, name: it.name, description: it.description ?? "", sell: it.sell, buy: it.buy ?? 0 } });
  }
  // NPCs
  await client.npcDef.upsert({ where: { id: "grimsley" }, update: { name: "Grimsley" }, create: { id: "grimsley", name: "Grimsley" } });
  // Zone and enemies
  await client.zoneDef.upsert({ where: { id: "Slime" }, update: {}, create: { id: "Slime", name: "Slime Zone", sceneKey: "Slime" } });
  for (const e of ENEMIES) {
    await client.enemyTemplate.upsert({ where: { id: e.id }, update: {}, create: e });
    // One drop table per template
    const dtId = `${e.id}_drops`;
    const dt = await client.dropTable.upsert({ where: { templateId: e.id }, update: {}, create: { id: dtId, templateId: e.id } });
    // Ensure at least Goop drops everywhere
    const existing = await client.dropEntry.findMany({ where: { dropTableId: dt.id, itemId: "slime_goop" } });
    if (!existing.length) {
      await client.dropEntry.create({ data: { dropTableId: dt.id, itemId: "slime_goop", weight: 35, minQty: 1, maxQty: 1 } });
    }
  }
  // Spawn config: default personal spawns for regular slime (others available for future variety)
  await client.spawnConfig.create({ data: { zoneId: "Slime", templateId: "slime", budget: 6, respawnMs: 1200, slots: [100,180,260,340,420], phaseType: "personal" } }).catch(() => {});
  // Quests
  // Tutorial: Can you punch?
  await client.quest.upsert({
    where: { id: "tutorial_kill_slimes_5" },
    update: { name: "Can you punch?", description: "Kill 5 slimes in the field.", objectiveType: "KILL", objectiveTarget: "slime", objectiveCount: 5, giverNpcId: "grimsley", nextQuestId: "tutorial_craft_copper_dagger", minLevel: 1, requiresQuestId: null, rewardGold: 500, rewardExp: 250 },
    create: { id: "tutorial_kill_slimes_5", name: "Can you punch?", description: "Kill 5 slimes in the field.", objectiveType: "KILL", objectiveTarget: "slime", objectiveCount: 5, giverNpcId: "grimsley", nextQuestId: "tutorial_craft_copper_dagger", minLevel: 1, requiresQuestId: null, rewardGold: 500, rewardExp: 250 }
  });
  // Rewards: copper_bar, plank
  const rewardItems: Array<{ itemId: string; qty: number }> = [
    { itemId: "copper_bar", qty: 1 },
    { itemId: "plank", qty: 1 },
  ];
  for (const it of rewardItems) {
    const exists = await client.questRewardItem.findFirst({ where: { questId: "tutorial_kill_slimes_5", itemId: it.itemId } });
    if (!exists) await client.questRewardItem.create({ data: { questId: "tutorial_kill_slimes_5", itemId: it.itemId, qty: it.qty } });
  }
  // Craft: Can you craft?
  await client.quest.upsert({
    where: { id: "tutorial_craft_copper_dagger" },
    update: { name: "Can you craft?", description: "Craft one copper dagger at the workbench.", objectiveType: "CRAFT", objectiveTarget: "copper_dagger", objectiveCount: 1, giverNpcId: "grimsley", minLevel: 1, requiresQuestId: "tutorial_kill_slimes_5", rewardCraftingExp: 150, rewardExp: 150 },
    create: { id: "tutorial_craft_copper_dagger", name: "Can you craft?", description: "Craft one copper dagger at the workbench.", objectiveType: "CRAFT", objectiveTarget: "copper_dagger", objectiveCount: 1, giverNpcId: "grimsley", minLevel: 1, requiresQuestId: "tutorial_kill_slimes_5", rewardCraftingExp: 150, rewardExp: 150 }
  });

  return NextResponse.json({ ok: true, seeded: { items: ITEMS.length, enemies: ENEMIES.length, npcs: 1, quests: 2, zone: 1 } });
}

export async function GET() {
  // Convenience: allow GET to trigger seed in dev
  return POST();
}
