-- Fix existing characters that were created before the schema had extra columns
-- Run this in your Neon database console or via psql

-- First ensure the extra columns exist
ALTER TABLE "Character"
ADD COLUMN IF NOT EXISTS gold int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flags jsonb,
ADD COLUMN IF NOT EXISTS fishing jsonb,
ADD COLUMN IF NOT EXISTS equipment jsonb,
ADD COLUMN IF NOT EXISTS talents jsonb,
ADD COLUMN IF NOT EXISTS lastx double precision,
ADD COLUMN IF NOT EXISTS lasty double precision;

-- Set default values for any NULL columns in existing characters
UPDATE "Character"
SET 
  gold = COALESCE(gold, 0),
  flags = COALESCE(flags, '{}'::jsonb)
WHERE gold IS NULL OR flags IS NULL;

-- Show all characters to verify
SELECT id, name, class, level, gold, flags FROM "Character";
