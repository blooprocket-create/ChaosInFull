import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";
import { items as SHOP_ITEMS } from "@/src/data/items";

const ENEMIES: Array<{ id: string; name: string; level: number; basehp: number; expbase: number; goldmin: number; goldmax: number }> = [
  { id: "slime", name: "Slime", level: 1, basehp: 30, expbase: 5, goldmin: 1, goldmax: 3 },
  { id: "slime_epic", name: "Slime (Epic)", level: 3, basehp: 80, expbase: 12, goldmin: 3, goldmax: 6 },
  { id: "big_slime", name: "Big Slime", level: 5, basehp: 160, expbase: 24, goldmin: 4, goldmax: 9 },
  { id: "big_slime_epic", name: "Big Slime (Epic)", level: 7, basehp: 260, expbase: 36, goldmin: 6, goldmax: 12 },
  { id: "boss_slime", name: "Boss Slime", level: 10, basehp: 500, expbase: 100, goldmin: 15, goldmax: 30 },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }

  // Reset AFK combat state for clean local seeds
  await q`delete from "AfkCombatState"`;

  // Items
  for (const it of SHOP_ITEMS) {
    await q`insert into "ItemDef" (id, name, description, rarity, stackable, maxstack, buy, sell)
            values (${it.key}, ${it.name}, '', 'common', true, 999, ${String(it.buy)}, ${String(it.sell)})
            on conflict (id) do update set name = excluded.name, description = excluded.description, buy = excluded.buy, sell = excluded.sell`;
  }
  // NPCs
  await q`insert into "NpcDef" (id, name) values ('grimsley', 'Grimsley') on conflict (id) do update set name = excluded.name`;
  // Zones
  await q`insert into "ZoneDef" (id, name, scenekey) values ('Slime', 'Slime Zone', 'Slime') on conflict (id) do nothing`;
  await q`insert into "ZoneDef" (id, name, scenekey) values ('Slime Meadow', 'Slime Meadow', 'Slime') on conflict (id) do nothing`;
  // Enemies and drops
  for (const e of ENEMIES) {
    await q`insert into "EnemyTemplate" (id, name, level, basehp, expbase, goldmin, goldmax)
            values (${e.id}, ${e.name}, ${e.level}, ${e.basehp}, ${e.expbase}, ${e.goldmin}, ${e.goldmax})
            on conflict (id) do update set name = excluded.name, level = excluded.level, basehp = excluded.basehp, expbase = excluded.expbase, goldmin = excluded.goldmin, goldmax = excluded.goldmax`;
    const dtId = `${e.id}_drops`;
    await q`insert into "DropTable" (id, templateid) values (${dtId}, ${e.id}) on conflict (templateid) do update set id = excluded.id`;
    const exists = await q<{ id: string }>`select id from "DropEntry" where droptableid = ${dtId} and itemid = 'slime_goop'`;
    if (!exists.length) {
      await q`insert into "DropEntry" (droptableid, itemid, weight, minqty, maxqty) values (${dtId}, 'slime_goop', 35, 1, 1)`;
    }
  }
  // Spawns
  await q`insert into "SpawnConfig" (zoneid, templateid, budget, respawnms, slots, phasetype) values ('Slime', 'slime', 6, 1200, ${[100,180,260,340,420]}, 'personal')`;
  await q`insert into "SpawnConfig" (zoneid, templateid, budget, respawnms, slots, phasetype) values ('Slime Meadow', 'slime', 4, 1100, ${[100,180,260,340,420]}, 'personal')`;
  await q`insert into "SpawnConfig" (zoneid, templateid, budget, respawnms, slots, phasetype) values ('Slime Meadow', 'slime_epic', 1, 1500, ${[140,220,300,380,460]}, 'personal')`;
  await q`insert into "SpawnConfig" (zoneid, templateid, budget, respawnms, slots, phasetype) values ('Slime Meadow', 'big_slime', 1, 2000, ${[180,260,340,420,500]}, 'personal')`;
  // Quests
  await q`insert into "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, givernpcid, nextquestid, minlevel, requiresquestid, rewardgold, rewardexp)
          values ('tutorial_kill_slimes_5', 'Can you punch?', 'Kill 5 slimes in the field.', 'KILL', 'slime', 5, 'grimsley', 'tutorial_craft_copper_dagger', 1, null, 500, 250)
          on conflict (id) do update set name = excluded.name, description = excluded.description, objectivetype = excluded.objectivetype, objectivetarget = excluded.objectivetarget, objectivecount = excluded.objectivecount, givernpcid = excluded.givernpcid, nextquestid = excluded.nextquestid, minlevel = excluded.minlevel, requiresquestid = excluded.requiresquestid, rewardgold = excluded.rewardgold, rewardexp = excluded.rewardexp`;
  const rewards: Array<{ itemid: string; qty: number }> = [ { itemid: 'copper_bar', qty: 1 }, { itemid: 'plank', qty: 1 } ];
  for (const r of rewards) {
    const exists = await q<{ id: string }>`select id from "QuestRewardItem" where questid = 'tutorial_kill_slimes_5' and itemid = ${r.itemid}`;
    if (!exists.length) {
      await q`insert into "QuestRewardItem" (questid, itemid, qty) values ('tutorial_kill_slimes_5', ${r.itemid}, ${r.qty})`;
    }
  }
  await q`insert into "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, givernpcid, minlevel, requiresquestid, rewardcraftingexp, rewardexp)
          values ('tutorial_craft_copper_dagger', 'Can you craft?', 'Craft one copper dagger at the workbench.', 'CRAFT', 'copper_dagger', 1, 'grimsley', 1, 'tutorial_kill_slimes_5', 150, 150)
          on conflict (id) do update set name = excluded.name, description = excluded.description, objectivetype = excluded.objectivetype, objectivetarget = excluded.objectivetarget, objectivecount = excluded.objectivecount, givernpcid = excluded.givernpcid, minlevel = excluded.minlevel, requiresquestid = excluded.requiresquestid, rewardcraftingexp = excluded.rewardcraftingexp, rewardexp = excluded.rewardexp`;

  return NextResponse.json({ ok: true, seeded: { items: SHOP_ITEMS.length, enemies: ENEMIES.length, npcs: 1, quests: 2, zone: 1 } });
}

export async function GET() {
  // Convenience: allow GET to trigger seed in dev
  return POST();
}
