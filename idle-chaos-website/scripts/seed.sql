-- Seed data for Idle Chaos (pure SQL)
-- This mirrors scripts/seed.ts and is idempotent via ON CONFLICT upserts.

-- Optional: enable pgcrypto if available (safe no-op on Neon if unsupported)
-- Note: Not creating pgcrypto here to avoid permission issues in serverless Postgres

BEGIN;

-- Zones
INSERT INTO "ZoneDef" (id, name, scenekey, width, height) VALUES
  ('Town', 'Town', 'Town', 800, 600),
  ('Cave', 'Cave', 'Cave', 800, 600),
  ('Slime', 'Slime Field', 'Slime', 800, 600),
  ('Slime Meadow', 'Slime Meadow', 'Slime Meadow', 800, 600)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  scenekey = EXCLUDED.scenekey,
  width = EXCLUDED.width,
  height = EXCLUDED.height;

-- Items (with descriptions)
INSERT INTO "ItemDef" (id, name, description, rarity, stackable, maxstack, buy, sell) VALUES
  ('copper', 'Copper Ore', 'Shiny rocks that think they''re metal. They''re right.', 'common', TRUE, 999, 5, 2),
  ('tin', 'Tin Ore', 'Soft metal that insists on being helpful.', 'common', TRUE, 999, 6, 3),
  ('copper_bar', 'Copper Bar', 'Smelted ambition. Warm to the touch, metaphorically.', 'common', TRUE, 999, 15, 8),
  ('bronze_bar', 'Bronze Bar', 'A cooperative effort between copper and tin. Polyamorous metallurgy.', 'common', TRUE, 999, 24, 12),
  ('log', 'Log', 'Fallen tree segment, still processing its feelings.', 'common', TRUE, 999, 4, 2),
  ('normal_planks', 'Plank', 'A log that went to finishing school.', 'common', TRUE, 999, 8, 4),
  ('oak_log', 'Oak Log', 'Heavier, moodier wood. Smells like confidence.', 'common', TRUE, 999, 8, 4),
  ('oak_plank', 'Oak Plank', 'Premium plank with faint notes of superiority.', 'common', TRUE, 999, 14, 7),
  ('slime_goop', 'Slime Goop', 'Jiggly residue. Surprisingly marketable.', 'common', TRUE, 999, 10, 5),
  ('slime_bones', 'Slime Bones', 'Brittle remains of a colossal slime.', 'rare', TRUE, 99, 0, 50),
  ('copper_dagger', 'Copper Dagger', 'Pointy encouragement for beginner heroes.', 'common', FALSE, 1, 30, 16),
  ('copper_armor', 'Copper Armor', 'Clanky confidence booster.', 'common', FALSE, 1, 42, 24),
  ('admins_hammer', 'Admin''s Hammer', 'Wielded by legends (and admins). Handle with godmode.', 'legendary', FALSE, 1, 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  stackable = EXCLUDED.stackable,
  maxstack = EXCLUDED.maxstack,
  buy = EXCLUDED.buy,
  sell = EXCLUDED.sell;

-- Enemy templates (undead included for future content; not spawned yet)
INSERT INTO "EnemyTemplate" (id, name, level, basehp, expbase, goldmin, goldmax, tags) VALUES
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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  basehp = EXCLUDED.basehp,
  expbase = EXCLUDED.expbase,
  goldmin = EXCLUDED.goldmin,
  goldmax = EXCLUDED.goldmax,
  tags = EXCLUDED.tags;

-- Drop tables
INSERT INTO "DropTable" (id, templateid) VALUES
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
ON CONFLICT (id) DO UPDATE SET
  templateid = EXCLUDED.templateid;

-- Drop entries (slime family)
INSERT INTO "DropEntry" (id, droptableid, itemid, weight, minqty, maxqty, uniqueroll) VALUES
  ('de_slime_goop', 'dt_slime', 'slime_goop', 35, 1, 1, FALSE),
  ('de_slime_big_goop', 'dt_slime_big', 'slime_goop', 50, 1, 2, FALSE),
  ('de_slime_epic_goop', 'dt_slime_epic', 'slime_goop', 25, 1, 2, FALSE),
  ('de_slime_epic_big_goop', 'dt_slime_epic_big', 'slime_goop', 40, 2, 3, FALSE),
  ('de_slime_boss_goop', 'dt_slime_boss', 'slime_goop', 80, 2, 5, FALSE),
  ('de_slime_boss_bones', 'dt_slime_boss', 'slime_bones', 10, 1, 2, FALSE),
  ('de_slime_boss_hammer', 'dt_slime_boss', 'admins_hammer', 1, 1, 1, TRUE)
ON CONFLICT (id) DO UPDATE SET
  weight = EXCLUDED.weight,
  minqty = EXCLUDED.minqty,
  maxqty = EXCLUDED.maxqty,
  uniqueroll = EXCLUDED.uniqueroll;

-- Spawns: Slime Field
INSERT INTO "SpawnConfig" (id, zoneid, templateid, budget, respawnms, slots, phasetype) VALUES
  ('sp_slime_slime', 'Slime', 'slime', 6, 1200, '[100,180,260,340,420]'::jsonb, 'personal'),
  ('sp_slime_big',   'Slime', 'slime_big', 2, 1600, '[140,220,300,380]'::jsonb, 'personal'),
  ('sp_slime_epic',  'Slime', 'slime_epic', 1, 2400, '[260,340]'::jsonb, 'personal')
ON CONFLICT (id) DO UPDATE SET
  budget = EXCLUDED.budget,
  respawnms = EXCLUDED.respawnms,
  slots = EXCLUDED.slots,
  phasetype = EXCLUDED.phasetype;

-- Spawns: Slime Meadow
INSERT INTO "SpawnConfig" (id, zoneid, templateid, budget, respawnms, slots, phasetype) VALUES
  ('sp_meadow_slime',        'Slime Meadow', 'slime', 4, 1100, '[120,200,280,360,440]'::jsonb, 'personal'),
  ('sp_meadow_slime_big',    'Slime Meadow', 'slime_big', 3, 1400, '[160,240,320,400]'::jsonb, 'personal'),
  ('sp_meadow_slime_epic',   'Slime Meadow', 'slime_epic', 2, 2200, '[240,320]'::jsonb, 'personal'),
  ('sp_meadow_slime_epicbg', 'Slime Meadow', 'slime_epic_big', 1, 2600, '[280,360]'::jsonb, 'personal')
ON CONFLICT (id) DO UPDATE SET
  budget = EXCLUDED.budget,
  respawnms = EXCLUDED.respawnms,
  slots = EXCLUDED.slots,
  phasetype = EXCLUDED.phasetype;

-- Spawns: Cave intentionally empty (mining area only for now)

-- NPCs
INSERT INTO "NpcDef" (id, name) VALUES
  ('grimsley', 'Grimsley'),
  ('cavernous_richard', 'Cavernous Richard')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

-- Quests
INSERT INTO "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, givernpcid, nextquestid, rewardgold, rewardexp, minlevel) VALUES
  ('tutorial_kill_slimes_5', 'Can you punch?', 'Kill 5 slimes in the field.', 'KILL', 'slime', 5, 'grimsley', 'tutorial_craft_copper_dagger', 500, 250, 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  objectivetype = EXCLUDED.objectivetype,
  objectivetarget = EXCLUDED.objectivetarget,
  objectivecount = EXCLUDED.objectivecount,
  givernpcid = EXCLUDED.givernpcid,
  nextquestid = EXCLUDED.nextquestid,
  rewardgold = EXCLUDED.rewardgold,
  rewardexp = EXCLUDED.rewardexp,
  minlevel = EXCLUDED.minlevel;

INSERT INTO "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, rewardcraftingexp, rewardexp, requiresquestid, minlevel) VALUES
  ('tutorial_craft_copper_dagger', 'Can you craft?', 'Craft one copper dagger at the workbench.', 'CRAFT', 'copper_dagger', 1, 150, 150, 'tutorial_kill_slimes_5', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  objectivetype = EXCLUDED.objectivetype,
  objectivetarget = EXCLUDED.objectivetarget,
  objectivecount = EXCLUDED.objectivecount,
  rewardcraftingexp = EXCLUDED.rewardcraftingexp,
  rewardexp = EXCLUDED.rewardexp,
  requiresquestid = EXCLUDED.requiresquestid,
  minlevel = EXCLUDED.minlevel;

INSERT INTO "QuestRewardItem" (id, questid, itemid, qty) VALUES
  ('tutorial_kill_slimes_5__copper_bar', 'tutorial_kill_slimes_5', 'copper_bar', 1),
  ('tutorial_kill_slimes_5__normal_planks', 'tutorial_kill_slimes_5', 'normal_planks', 2)
ON CONFLICT (id) DO UPDATE SET
  itemid = EXCLUDED.itemid,
  qty = EXCLUDED.qty;

-- Portals: reset for involved zones then insert fresh set
DELETE FROM "PortalDef" WHERE zoneid IN ('Town','Cave','Slime','Slime Meadow');
INSERT INTO "PortalDef" (zoneid, targetzoneid, x, y, radius, label) VALUES
  ('Town', 'Cave', 80, 520, 50, 'Cave'),
  ('Town', 'Slime', 720, 520, 50, 'Slime Field'),
  ('Slime', 'Town', 60, 520, 60, 'To Town'),
  ('Slime', 'Slime Meadow', 740, 520, 60, 'To Slime Meadow'),
  ('Slime Meadow', 'Slime', 60, 520, 60, 'To Slime Field'),
  ('Cave', 'Town', 720, 520, 60, 'To Town')
ON CONFLICT DO NOTHING;

COMMIT;
