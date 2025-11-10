# Simplified Schema - Pure JSONB Approach

## Current Schema (Hybrid)
```sql
CREATE TABLE "Character" (
  id text PRIMARY KEY,
  userid text,
  name text,                    -- Separate column
  class text,                   -- Separate column  
  level int,                    -- Separate column
  gold int,                     -- Separate column (duplicate)
  lastscene text,               -- Separate column (duplicate)
  lastx double precision,       -- Separate column (duplicate)
  lasty double precision,       -- Separate column (duplicate)
  data jsonb DEFAULT '{}'       -- Everything else
);
```

## Simplified Schema (Pure JSONB)
```sql
CREATE TABLE "Character" (
  id text PRIMARY KEY,
  userid text,
  name text NOT NULL,           -- Keep for queries (find by name)
  data jsonb NOT NULL DEFAULT '{}'::jsonb  -- EVERYTHING else goes here
);

-- Add indexes for common queries
CREATE INDEX character_userid_idx ON "Character"(userid);
CREATE INDEX character_name_idx ON "Character"(name);

-- You can even query inside JSONB!
CREATE INDEX character_level_idx ON "Character" ((data->>'level')::int);
CREATE INDEX character_lastscene_idx ON "Character" ((data->>'lastScene'));
```

## Benefits of Pure JSONB:

1. **No Schema Changes** - Add any field from JavaScript, just works
2. **Simpler Code** - One column to update, no special field mapping
3. **Flexibility** - Game features can evolve without database migrations
4. **Less Duplication** - No more syncing between `gold` column and `data.gold`

## Migration to Pure JSONB:

I can update the schema to remove all the duplicate columns and just use:
- `id` - character ID
- `userid` - which user owns this
- `name` - character name (for queries/display)
- `data` - JSONB blob with ALL character data

Want me to simplify it this way? It would make everything much cleaner!
