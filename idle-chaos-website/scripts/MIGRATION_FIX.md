# Character Migration Fix - Preserving All Data

## Problem
When migrating localStorage characters to the database, the JSONB data was only getting initialized with defaults instead of the actual game state. For example, a character with Mining level 5 (174/243 exp) was being saved as Mining level 1 (0 exp).

## Root Cause
In `CharacterSelect.js`, the migration code was using fallback values:
```javascript
mining: char.mining || { level: 1, exp: 0 }
```

This meant if `char.mining` existed, it would send the actual data, BUT the JSONB was still getting defaults because we weren't sending the complete character state.

## Solution
Updated the migration code to send ALL character properties without defaults:
- Skills: `mining`, `woodcutting`, `fishing`, `crafting`, `smithing`, `cooking`
- Stats: `stats`, `equipment`, `talents`
- Progress: `level`, `exp`, `expToLevel`, `gold`
- State: `flags`, `lastLocation`, `tutorialCompleted`, `activeQuests`, `completedQuests`
- Character: `gender`, `hat`, `race`, `weapon`

## Files Modified
1. **src/game/phaser/scenes/CharacterSelect.js** (lines 402-428)
   - Changed from using `||` fallbacks to sending actual values
   - Added ALL character properties to patchData object
   - This ensures complete state migration

## Testing
To verify the fix works:
1. Create a character and level up some skills (e.g., mine until level 5)
2. Save and exit
3. Log back in and play that character (triggers migration)
4. Check the database: `SELECT data FROM "Character" WHERE name = 'YourCharacterName';`
5. Verify the JSONB contains actual skill levels, not defaults

## Database Cleanup
Run `scripts/drop-legacy-columns.sql` to remove redundant columns:
- ~~gender~~, ~~hat~~, ~~level~~
- ~~mininglevel~~, ~~woodcuttinglevel~~, ~~craftinglevel~~, ~~fishinglevel~~
- ~~lastscene~~, ~~lastseenat~~

After cleanup, Character table will only have:
- `id` - character UUID
- `userid` - owner UUID
- `name` - character name
- `class` - character class/race
- `createdat` - creation timestamp
- `data` - JSONB with ALL game state

## Why This Matters
The stats/skills modal reads directly from `scene.char.mining`, `scene.char.woodcutting`, etc. If the database doesn't have the correct values, players will lose their progress when moving between localStorage and database storage.
