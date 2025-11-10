# Character Database Migration - Flexible JSONB Schema

## What Changed

The character database now uses a **flexible JSONB column** (`data`) that can store ANY character fields from your JavaScript code. No more missing columns!

### Key Benefits:
- ✅ **No schema changes needed** - Add any new character fields from JS
- ✅ **Automatic field storage** - Whatever you send from the client gets saved
- ✅ **Backward compatible** - Old dedicated columns still work

## How It Works

### Before (Old Way):
- Character had separate columns: `gold`, `flags`, `equipment`, `talents`, etc.
- If JS code tried to save a new field (like `woodcutting` or `cooking`), it would fail
- You'd need to add a new column to the database schema

### After (New Way):
- Character has a single `data` JSONB column that stores EVERYTHING
- JS can send ANY fields and they'll automatically be saved
- Example: `{ gold: 100, flags: {...}, customField: "anything", newSkill: {...} }`

## Migration Steps

### 1. Run the Fix Endpoint
Visit this URL in your browser (while logged in):
```
http://localhost:3000/api/account/characters/fix-schema
```

This will:
- Add the new `data` column to your Character table
- Migrate all existing character data into the flexible JSONB format
- Set proper defaults for missing fields

### 2. Test It
1. Refresh your game page
2. The 404 errors should be gone
3. Your character state will now save to the database

### 3. Create a New Character (Optional)
New characters automatically use the flexible schema with all fields initialized.

## For Developers

### Saving Character Data (Client Side)
```javascript
// Before: Had to know exact field names
window.__cif_persist.saveCharacterPatch(characterId, {
  gold: 100,
  flags: {},
  equipment: {}
});

// After: Can save ANY fields!
window.__cif_persist.saveCharacterPatch(characterId, {
  gold: 100,
  flags: {},
  equipment: {},
  cooking: { level: 5, exp: 200 },    // NEW FIELD - just works!
  customData: { anything: "you want" } // NEW FIELD - just works!
});
```

### Database Schema
```sql
CREATE TABLE "Character" (
  id text PRIMARY KEY,
  userid text,
  name text NOT NULL,
  class text NOT NULL,
  level int DEFAULT 1,
  
  -- Flexible JSONB column stores ALL character state
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Legacy columns (kept for queries/indexes)
  gold int DEFAULT 0,
  lastscene text,
  lastx double precision,
  lasty double precision,
  
  -- ... other metadata columns
);
```

## Notes

- The `patch` endpoint now accepts ANY fields and merges them into the `data` column
- Special fields like `gold`, `lastScene`, `lastX`, `lastY` are also stored in dedicated columns for query performance
- The `full` endpoint returns all fields from both the `data` column and dedicated columns
- No more 404 errors from missing columns!
