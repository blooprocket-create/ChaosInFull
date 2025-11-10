-- Drop Legacy Columns from Character Table
-- This script removes the redundant columns now that we're using pure JSONB storage

-- These columns are no longer needed as all data is stored in the 'data' jsonb column
ALTER TABLE "Character" DROP COLUMN IF EXISTS gender;
ALTER TABLE "Character" DROP COLUMN IF EXISTS hat;
ALTER TABLE "Character" DROP COLUMN IF EXISTS level;
ALTER TABLE "Character" DROP COLUMN IF EXISTS mininglevel;
ALTER TABLE "Character" DROP COLUMN IF EXISTS woodcuttinglevel;
ALTER TABLE "Character" DROP COLUMN IF EXISTS craftinglevel;
ALTER TABLE "Character" DROP COLUMN IF EXISTS fishinglevel;
ALTER TABLE "Character" DROP COLUMN IF EXISTS lastscene;
ALTER TABLE "Character" DROP COLUMN IF EXISTS lastseenat;

-- After dropping these columns, the Character table will have:
-- - id (text, primary key) - unique character ID
-- - userid (text, foreign key) - links to User table
-- - name (text) - character name for display
-- - class (text) - character class/race
-- - createdat (timestamptz) - when character was created
-- - data (jsonb) - ALL game state stored here

-- Note: The 'data' column should contain everything the game needs:
-- {
--   "gold": 1000,
--   "level": 5,
--   "stats": {...},
--   "equipment": {...},
--   "mining": { "level": 5, "exp": 174, "expToLevel": 243 },
--   "woodcutting": { "level": 1, "exp": 0, "expToLevel": 100 },
--   "fishing": { "level": 1, "exp": 0, "expToLevel": 100 },
--   "crafting": { "level": 1, "exp": 0, "expToLevel": 100 },
--   "flags": {...},
--   "talents": {...},
--   "lastLocation": {...}
--   ... and any other game state
-- }
