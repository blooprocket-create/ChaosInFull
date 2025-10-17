import { q } from "../src/lib/db";

async function main() {
  // Zones
  await q`
    insert into "ZoneDef" (id, name, scenekey, width, height) values
      ('Town', 'Town', 'Town', 800, 600),
      ('Cave', 'Cave', 'Cave', 800, 600),
      ('Slime', 'Slime Field', 'Slime', 800, 600),
      ('Slime Meadow', 'Slime Meadow', 'Slime Meadow', 800, 600)
    on conflict (id) do update set name = excluded.name, scenekey = excluded.scenekey, width = excluded.width, height = excluded.height
  `;

  // Items (with descriptions in site flavor)
  await q`
    insert into "ItemDef" (id, name, description, rarity, stackable, maxstack, buy, sell) values
      ('copper', 'Copper Ore', 'Shiny rocks that think they''re metal. They''re right.', 'common', true, 999, 5, 2),
      ('tin', 'Tin Ore', 'Soft metal that insists on being helpful.', 'common', true, 999, 6, 3),
      ('copper_bar', 'Copper Bar', 'Smelted ambition. Warm to the touch, metaphorically.', 'common', true, 999, 15, 8),
      ('bronze_bar', 'Bronze Bar', 'A cooperative effort between copper and tin. Polyamorous metallurgy.', 'common', true, 999, 24, 12),
      ('log', 'Log', 'Fallen tree segment, still processing its feelings.', 'common', true, 999, 4, 2),
      ('plank', 'Plank', 'A log that went to finishing school.', 'common', true, 999, 8, 4),
      ('oak_log', 'Oak Log', 'Heavier, moodier wood. Smells like confidence.', 'common', true, 999, 8, 4),
      ('oak_plank', 'Oak Plank', 'Premium plank with faint notes of superiority.', 'common', true, 999, 14, 7),
      ('slime_goop', 'Slime Goop', 'Jiggly residue. Surprisingly marketable.', 'common', true, 999, 10, 5),
  ('slime_bones', 'Slime Bones', 'Brittle remains of a colossal slime.', 'rare', true, 99, 0, 50),
      ('copper_dagger', 'Copper Dagger', 'Pointy encouragement for beginner heroes.', 'common', false, 1, 30, 16),
      ('copper_armor', 'Copper Armor', 'Clanky confidence booster.', 'common', false, 1, 42, 24),
      ('admins_hammer', 'Admin''s Hammer', 'Wielded by legends (and admins). Handle with godmode.', 'legendary', false, 1, 0, 0)
    on conflict (id) do update set name = excluded.name, description = excluded.description, rarity = excluded.rarity, stackable = excluded.stackable, maxstack = excluded.maxstack, buy = excluded.buy, sell = excluded.sell
  `;

  // Enemy templates (include undead for future content; not spawned yet)
  await q`
    insert into "EnemyTemplate" (id, name, level, basehp, expbase, goldmin, goldmax, tags) values
      ('slime', 'Regular Slime', 1, 30, 5, 1, 3, 'slime'),
      ('slime_big', 'Big Slime', 2, 55, 8, 2, 4, 'slime,big'),
      ('slime_epic', 'Epic Slime', 3, 80, 12, 3, 5, 'slime,epic'),
      ('slime_epic_big', 'Epic Big Slime', 4, 120, 18, 4, 7, 'slime,epic,big'),
      ('slime_boss', 'Boss Slime', 8, 450, 60, 25, 60, 'slime,boss'),
      ('ghost', 'Ghost', 5, 110, 20, 4, 8, 'undead,ghost'),
      ('ghost_epic', 'Epic Ghost', 7, 180, 32, 6, 12, 'undead,ghost,epic'),
      ('skeleton', 'Skeleton', 6, 140, 25, 5, 10, 'undead,skeleton'),
      ('skeleton_epic', 'Epic Skeleton', 8, 220, 38, 7, 14, 'undead,skeleton,epic'),
      ('zombie', 'Zombie', 5, 120, 22, 4, 9, 'undead,zombie'),
      ('zombie_epic', 'Epic Zombie', 7, 190, 34, 6, 13, 'undead,zombie,epic')
    on conflict (id) do update set name = excluded.name, level = excluded.level, basehp = excluded.basehp, expbase = excluded.expbase, goldmin = excluded.goldmin, goldmax = excluded.goldmax, tags = excluded.tags
  `;

  // Drop tables
  await q`
    insert into "DropTable" (id, templateid) values
      ('dt_slime', 'slime'),
      ('dt_slime_big', 'slime_big'),
      ('dt_slime_epic', 'slime_epic'),
      ('dt_slime_epic_big', 'slime_epic_big'),
      ('dt_slime_boss', 'slime_boss'),
      ('dt_ghost', 'ghost'),
      ('dt_ghost_epic', 'ghost_epic'),
      ('dt_skeleton', 'skeleton'),
      ('dt_skeleton_epic', 'skeleton_epic'),
      ('dt_zombie', 'zombie'),
      ('dt_zombie_epic', 'zombie_epic')
    on conflict (id) do update set templateid = excluded.templateid
  `;

  // Drop entries (slime family)
  await q`insert into "DropEntry" (id, droptableid, itemid, weight, minqty, maxqty, uniqueroll) values ('de_slime_goop', 'dt_slime', 'slime_goop', 35, 1, 1, false)
          on conflict (id) do update set weight = excluded.weight, minqty = excluded.minqty, maxqty = excluded.maxqty, uniqueroll = excluded.uniqueroll`;
  await q`insert into "DropEntry" (id, droptableid, itemid, weight, minqty, maxqty, uniqueroll) values ('de_slime_big_goop', 'dt_slime_big', 'slime_goop', 50, 1, 2, false)
          on conflict (id) do update set weight = excluded.weight, minqty = excluded.minqty, maxqty = excluded.maxqty, uniqueroll = excluded.uniqueroll`;
  await q`insert into "DropEntry" (id, droptableid, itemid, weight, minqty, maxqty, uniqueroll) values ('de_slime_epic_goop', 'dt_slime_epic', 'slime_goop', 25, 1, 2, false)
          on conflict (id) do update set weight = excluded.weight, minqty = excluded.minqty, maxqty = excluded.maxqty, uniqueroll = excluded.uniqueroll`;
  await q`insert into "DropEntry" (id, droptableid, itemid, weight, minqty, maxqty, uniqueroll) values ('de_slime_epic_big_goop', 'dt_slime_epic_big', 'slime_goop', 40, 2, 3, false)
          on conflict (id) do update set weight = excluded.weight, minqty = excluded.minqty, maxqty = excluded.maxqty, uniqueroll = excluded.uniqueroll`;
  await q`
    insert into "DropEntry" (id, droptableid, itemid, weight, minqty, maxqty, uniqueroll) values
      ('de_slime_boss_goop', 'dt_slime_boss', 'slime_goop', 80, 2, 5, false),
      ('de_slime_boss_bones', 'dt_slime_boss', 'slime_bones', 10, 1, 2, false),
      ('de_slime_boss_hammer', 'dt_slime_boss', 'admins_hammer', 1, 1, 1, true)
    on conflict (id) do update set weight = excluded.weight, minqty = excluded.minqty, maxqty = excluded.maxqty, uniqueroll = excluded.uniqueroll
  `;

  // Spawns: Slime Field
  await q`
    insert into "SpawnConfig" (id, zoneid, templateid, budget, respawnms, slots, phasetype) values
      ('sp_slime_slime', 'Slime', 'slime', 6, 1200, '[100,180,260,340,420]'::jsonb, 'personal'),
      ('sp_slime_big',   'Slime', 'slime_big', 2, 1600, '[140,220,300,380]'::jsonb, 'personal'),
      ('sp_slime_epic',  'Slime', 'slime_epic', 1, 2400, '[260,340]'::jsonb, 'personal')
    on conflict (id) do update set budget = excluded.budget, respawnms = excluded.respawnms, slots = excluded.slots, phasetype = excluded.phasetype
  `;

  // Spawns: Slime Meadow
  await q`
    insert into "SpawnConfig" (id, zoneid, templateid, budget, respawnms, slots, phasetype) values
      ('sp_meadow_slime',        'Slime Meadow', 'slime', 4, 1100, '[120,200,280,360,440]'::jsonb, 'personal'),
      ('sp_meadow_slime_big',    'Slime Meadow', 'slime_big', 3, 1400, '[160,240,320,400]'::jsonb, 'personal'),
      ('sp_meadow_slime_epic',   'Slime Meadow', 'slime_epic', 2, 2200, '[240,320]'::jsonb, 'personal'),
      ('sp_meadow_slime_epicbg', 'Slime Meadow', 'slime_epic_big', 1, 2600, '[280,360]'::jsonb, 'personal')
    on conflict (id) do update set budget = excluded.budget, respawnms = excluded.respawnms, slots = excluded.slots, phasetype = excluded.phasetype
  `;
  // Spawns: Cave (mining area only for now – no undead here yet)
  // Intentionally no enemy spawns in Cave in this seed. Cave is for mining in this content drop.

  // NPCs
  await q`
    insert into "NpcDef" (id, name) values
      ('grimsley', 'Grimsley'),
      ('cavernous_richard', 'Cavernous Richard')
    on conflict (id) do update set name = excluded.name
  `;

  // Quests: seed to match API ensure behavior
  await q`
    insert into "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, givernpcid, nextquestid, rewardgold, rewardexp, minlevel)
    values ('tutorial_kill_slimes_5', 'Can you punch?', 'Kill 5 slimes in the field.', 'KILL', 'slime', 5, 'grimsley', 'tutorial_craft_copper_dagger', 500, 250, 1)
    on conflict (id) do update set name = excluded.name, description = excluded.description, objectivetype = excluded.objectivetype, objectivetarget = excluded.objectivetarget, objectivecount = excluded.objectivecount, givernpcid = excluded.givernpcid, nextquestid = excluded.nextquestid, rewardgold = excluded.rewardgold, rewardexp = excluded.rewardexp, minlevel = excluded.minlevel
  `;
  await q`
    insert into "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, rewardcraftingexp, rewardexp, requiresquestid, minlevel)
    values ('tutorial_craft_copper_dagger', 'Can you craft?', 'Craft one copper dagger at the workbench.', 'CRAFT', 'copper_dagger', 1, 150, 150, 'tutorial_kill_slimes_5', 1)
    on conflict (id) do update set name = excluded.name, description = excluded.description, objectivetype = excluded.objectivetype, objectivetarget = excluded.objectivetarget, objectivecount = excluded.objectivecount, rewardcraftingexp = excluded.rewardcraftingexp, rewardexp = excluded.rewardexp, requiresquestid = excluded.requiresquestid, minlevel = excluded.minlevel
  `;
  await q`
    insert into "QuestRewardItem" (id, questid, itemid, qty) values
      ('tutorial_kill_slimes_5__copper_bar', 'tutorial_kill_slimes_5', 'copper_bar', 1),
      ('tutorial_kill_slimes_5__normal_planks', 'tutorial_kill_slimes_5', 'plank', 2)
    on conflict (id) do update set itemid = excluded.itemid, qty = excluded.qty
  `;

  // Portals: Town <-> Cave, Town <-> Slime, Slime <-> Slime Meadow
  await q`delete from "PortalDef" where zoneid in ('Town','Cave','Slime','Slime Meadow')`;
  await q`
    insert into "PortalDef" (zoneid, targetzoneid, x, y, radius, label) values
      ('Town', 'Cave', 80, 520, 50, 'Cave'),
      ('Town', 'Slime', 720, 520, 50, 'Slime Field'),
      ('Slime', 'Town', 60, 520, 60, 'To Town'),
      ('Slime', 'Slime Meadow', 740, 520, 60, 'To Slime Meadow'),
      ('Slime Meadow', 'Slime', 60, 520, 60, 'To Slime Field'),
      ('Cave', 'Town', 720, 520, 60, 'To Town')
    on conflict do nothing
  `;

  console.log('Seed completed');
}

main().catch(err => { console.error(err); process.exit(1); });
