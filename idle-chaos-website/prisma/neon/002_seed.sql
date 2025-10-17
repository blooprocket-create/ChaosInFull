-- Seed baseline content for Chaos In Full

-- Items
insert into "ItemDef" (id, name, description, rarity, stackable, maxStack, buy, sell)
values
  ('copper', 'Copper Ore', 'A common reddish ore.', 'common', true, 999, 5, 2),
  ('tin', 'Tin Ore', 'A pale ore used in bronze.', 'common', true, 999, 6, 2),
  ('copper_bar', 'Copper Bar', 'Refined copper.', 'common', true, 999, 20, 8),
  ('bronze_bar', 'Bronze Bar', 'Alloy of copper and tin.', 'uncommon', true, 999, 35, 14),
  ('plank', 'Plank', 'Processed lumber.', 'common', true, 999, 8, 3)
on conflict (id) do nothing;

-- Enemy templates
insert into "EnemyTemplate" (id, name, level, baseHp, expBase, goldMin, goldMax, tags)
values
  ('slime_green', 'Green Slime', 1, 26, 4, 1, 2, 'slime,meadow'),
  ('slime_field', 'Field Slime', 2, 34, 6, 1, 3, 'slime,field')
on conflict (id) do nothing;

-- Zones
insert into "ZoneDef" (id, name, sceneKey, width, height)
values
  ('town', 'Town', 'TownScene', 1200, 680),
  ('cave', 'Cave', 'CaveScene', 1400, 720),
  ('slime', 'Slime Field', 'SlimeFieldScene', 1400, 720),
  ('slime_meadow', 'Slime Meadow', 'SlimeMeadowScene', 1600, 800)
on conflict (id) do nothing;

-- Portals (simple graph)
insert into "PortalDef" (id, zoneId, targetZoneId, x, y, radius, label)
values
  (gen_random_uuid()::text, 'town', 'cave', 980, 540, 32, 'To Cave'),
  (gen_random_uuid()::text, 'town', 'slime', 220, 540, 32, 'To Slime Field'),
  (gen_random_uuid()::text, 'slime', 'slime_meadow', 750, 480, 32, 'To Slime Meadow'),
  (gen_random_uuid()::text, 'cave', 'town', 60, 540, 32, 'To Town'),
  (gen_random_uuid()::text, 'slime', 'town', 60, 540, 32, 'To Town'),
  (gen_random_uuid()::text, 'slime_meadow', 'slime', 60, 540, 32, 'To Slime Field')
on conflict do nothing;

-- Drop tables
insert into "DropTable" (id, templateId) values
  ('dt_slime_green', 'slime_green'),
  ('dt_slime_field', 'slime_field')
on conflict (id) do nothing;

insert into "DropEntry" (id, dropTableId, itemId, weight, minQty, maxQty, uniqueRoll) values
  (gen_random_uuid()::text, 'dt_slime_green', 'copper', 7, 1, 2, false),
  (gen_random_uuid()::text, 'dt_slime_green', 'plank', 2, 1, 1, false),
  (gen_random_uuid()::text, 'dt_slime_field', 'tin', 6, 1, 2, false)
on conflict do nothing;

-- Spawns
insert into "SpawnConfig" (id, zoneId, templateId, budget, respawnMs, phaseType)
values
  (gen_random_uuid()::text, 'slime', 'slime_field', 6, 1200, 'personal'),
  (gen_random_uuid()::text, 'slime_meadow', 'slime_green', 8, 1100, 'personal')
on conflict do nothing;

-- NPCs and a basic tutorial quest (Grimsley)
insert into "NpcDef" (id, name) values ('grimsley', 'Grimsley') on conflict (id) do nothing;

insert into "Quest" (
  id, name, description, objectiveType, objectiveTarget, objectiveCount, giverNpcId, minLevel, rewardGold, rewardExp, rewardCraftingExp
) values (
  'tutorial_craft_copper_dagger',
  'Make Your First Dagger',
  'Grimsley wants you to craft a Copper Dagger at the Workbench.',
  'craft', 'copper_dagger', 1, 'grimsley', 1, 10, 25, 4
) on conflict (id) do nothing;

-- Patch notes
insert into "PatchNote" (id, date, version, title, highlights)
values (gen_random_uuid()::text, current_date, '0.0.11', 'Public Playtest Seed', '["Status chip, SEO/JSON-LD, telemetry, tutorial gate"]')
on conflict do nothing;
