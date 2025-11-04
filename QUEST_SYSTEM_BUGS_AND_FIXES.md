# Quest System Bugs & Fixes (Client-Side)

## Current Bugs

### 1. **Race Condition in Auto-Complete**
**Location:** `updateQuestProgress()` lines 444-490

**Problem:**
```javascript
character.activeQuests.forEach(quest => {
    // ... update progress ...
    
    // Check completion and auto-complete
    if (done && questDef && !questDef.handInNpc) toAutoComplete.push(quest.id);
});

// Later, complete the quests
for (const qid of toAutoComplete) {
    completeQuest(character, qid); // This modifies character.activeQuests!
}
```

**Bug:** While iterating `activeQuests`, we're marking quests for completion. Then we call `completeQuest()` which **splices items from the array we just iterated**. This works only by luck (we already finished the forEach).

**Issues:**
- Hard to reason about
- If multiple quests complete at once, order is unpredictable
- Character state modified multiple times in one call

---

### 2. **Objective Matching is Fragile**
**Location:** `updateQuestProgress()` lines 458-463

**Problem:**
```javascript
quest.progress.forEach(obj => {
    if (obj.type !== type) return;
    const target = obj.itemId;
    let matches = !target || target === itemId;
    if (!matches && type === 'kill' && target && itemId) {
        matches = itemId === target || itemId.startsWith(target + '_');
    }
    if (matches) {
        obj.current = Math.min(obj.required, obj.current + amount);
    }
});
```

**Bugs:**
- `obj.itemId` is used for enemies too (should check `obj.enemyId`)
- String prefix matching (`startsWith`) is fragile - what if you have 'slime' and 'slime_king'?
- No validation that `itemId` was passed correctly

---

### 3. **Dual Source of Truth for Progress**
**Location:** `getQuestObjectiveState()` lines 563-632

**Problem:**
```javascript
let current = storedCurrent;
if (usesInventory) {
    const inInventory = getInventoryQty(character, obj.itemId);
    current = Math.max(current, inInventory);
}
```

**Issues:**
- For mining/smelting, checks inventory COUNT
- If you mine 20 copper, then sell 10, it still shows 20/20 (takes max)
- For equip, checks equipment slots
- For talents, checks allocations
- **4 different sources of truth** for what counts as "progress"
- Very confusing for players and developers

---

### 4. **Inventory Objectives Never Decrement**
**Location:** `INVENTORY_OBJECTIVE_TYPES` constant

**Problem:**
```javascript
const INVENTORY_OBJECTIVE_TYPES = ['mine', 'smelt', 'gather', 'collect', 'chop'];
```

For these types, completion is based on `Math.max(stored, inventory)`. This means:
- ✅ Mine 20 copper → Progress is 20
- ❌ Sell 10 copper → Progress is still 20 (takes max)
- ❌ Craft all copper into bars → Progress is still 20 (takes max)

**Result:** Once you hit the target, you can never "lose" progress even if you consume the items.

**Edge case:** What if a quest requires "Have 20 copper ore" but another quest requires "Smelt 20 copper bars"? You craft the ore, lose the ore from inventory, but the first quest still shows 20/20 because it takes the `max()`.

---

### 5. **Progress Data Structure Mismatch**
**Location:** Quest definition vs stored progress

**Quest Definition:**
```javascript
objectives: [
    { type: 'kill', enemyId: 'slime', required: 5 },
    { type: 'mine', itemId: 'copper_ore', required: 20 }
]
```

**Stored Progress:**
```javascript
progress: [
    { type: 'kill', itemId: 'slime', current: 3, required: 5 },  // Uses itemId not enemyId!
    { type: 'mine', itemId: 'copper_ore', current: 10, required: 20 }
]
```

**Bugs:**
- Field name inconsistency (`enemyId` → `itemId`)
- Required is duplicated (in def and in progress)
- Easy to get out of sync

---

### 6. **No Validation or Error Recovery**
**Location:** Throughout the file

**Problems:**
```javascript
character.activeQuests.forEach(quest => {
    const questDef = getQuestById(quest.id);
    if (!questDef) return; // Silent failure
    
    quest.progress.forEach(obj => {
        // What if quest.progress is undefined?
        // What if obj is null?
        // What if obj.current is NaN?
    });
});
```

**Missing validations:**
- No check that character is valid
- No check that activeQuests is an array
- No check that progress matches objectives
- No recovery if data is corrupted

---

### 7. **Auto-Complete Breaks Immersion**
**Location:** `updateQuestProgress()` auto-complete logic

**Problem:**
When you kill the 5th slime, the quest **immediately completes** in the middle of combat:
- Rewards granted
- Character gains XP/items/gold
- Might level up
- Quest removed from active list
- All during `updateQuestProgress()` call

**Result:**
- No "quest complete" celebration moment
- Rewards appear randomly mid-combat
- Multiple quests can complete at once
- Confusing for player

---

## Proposed Fixes

### Fix 1: Remove Auto-Complete Logic

**Change:** All quests require manual turn-in at NPCs.

**Implementation:**
```javascript
// In quests.js - ADD handInNpc to all quests
export const QUEST_DEFS = {
    tutorial_kill_slimes: {
        id: 'tutorial_kill_slimes',
        name: 'Slime Extermination',
        // ... other fields
        handInNpc: 'mayor_grimsley',  // ← Every quest must have this
    }
};

// In updateQuestProgress - REMOVE auto-complete
export function updateQuestProgress(character, type, itemId, amount = 1) {
    if (!character.activeQuests) return;

    character.activeQuests.forEach(quest => {
        const questDef = getQuestById(quest.id);
        if (!questDef) return;

        quest.progress.forEach(obj => {
            if (obj.type !== type) return;
            const target = obj.itemId;
            let matches = !target || target === itemId;
            if (!matches && type === 'kill' && target && itemId) {
                matches = itemId === target || itemId.startsWith(target + '_');
            }
            if (matches) {
                obj.current = Math.min(obj.required, obj.current + amount);
            }
        });
    });

    // REMOVED: toAutoComplete logic
    // Quests stay in activeQuests until player manually turns in
}
```

**Benefits:**
- ✅ No mid-combat completions
- ✅ Player gets satisfying turn-in moment
- ✅ Simpler code
- ✅ No character mutation during progress tracking

---

### Fix 2: Consistent Field Names

**Change:** Use `target` for all objective identifiers.

**Implementation:**
```javascript
// Quest definitions - use 'target' instead of itemId/enemyId
objectives: [
    { type: 'kill', target: 'slime', required: 5, description: 'Kill 5 Slimes' },
    { type: 'mine', target: 'copper_ore', required: 20, description: 'Mine 20 Copper Ore' },
    { type: 'talk', target: 'wayne_mineson', required: 1, description: 'Talk to Wayne' }
]

// Progress storage - use 'target' too
progress: [
    { type: 'kill', target: 'slime', current: 3, required: 5 },
    { type: 'mine', target: 'copper_ore', current: 10, required: 20 }
]

// Update matching logic
quest.progress.forEach(obj => {
    if (obj.type !== type) return;
    if (obj.target !== target) return;  // Simple equality check
    obj.current = Math.min(obj.required, obj.current + amount);
});
```

**Benefits:**
- ✅ Clear what field to use
- ✅ Simpler matching
- ✅ Less error-prone

---

### Fix 3: Single Source of Truth for Progress

**Change:** Only track stored progress. Don't check inventory/equipment/talents.

**Rationale:**
- Mining quest tracks "copper ore mined" not "copper ore in inventory"
- Crafting quest tracks "items crafted" not "items owned"
- This is clearer and more predictable

**Implementation:**
```javascript
export function getQuestObjectiveState(character, questId) {
    if (!character) return [];
    const quest = getQuestById(questId);
    if (!quest) return [];
    const activeQuest = character.activeQuests?.find(q => q.id === questId);
    const progressEntries = Array.isArray(activeQuest?.progress) ? activeQuest.progress : [];

    return quest.objectives.map((obj, idx) => {
        const stored = progressEntries[idx];  // Use index, not search
        const current = (stored && typeof stored.current === 'number') ? stored.current : 0;
        const required = obj.required || 1;

        return {
            type: obj.type,
            target: obj.target,
            description: obj.description || '',
            current,
            required
        };
    });
}
```

**Benefits:**
- ✅ Simple and predictable
- ✅ No max() confusion
- ✅ Progress can't change without explicit update
- ✅ Matches player expectations

**Note:** For "equip" quests, change to:
```javascript
objectives: [
    { type: 'equip', target: 'copper_helmet', required: 1 }
]

// When player equips item:
updateQuestProgress(character, 'equip', 'copper_helmet', 1);

// Only counts ONCE (Math.min prevents going over)
```

---

### Fix 4: Add Validation and Safety Checks

**Implementation:**
```javascript
export function updateQuestProgress(character, type, target, amount = 1) {
    // Validation
    if (!character) {
        console.warn('[Quest] No character provided');
        return false;
    }
    if (!Array.isArray(character.activeQuests)) {
        console.warn('[Quest] character.activeQuests is not an array');
        character.activeQuests = [];
        return false;
    }
    if (!type || !target) {
        console.warn('[Quest] Missing type or target', { type, target });
        return false;
    }

    let progressMade = false;

    character.activeQuests.forEach(quest => {
        if (!quest || !quest.id) return;
        
        const questDef = getQuestById(quest.id);
        if (!questDef) {
            console.warn('[Quest] Quest definition not found:', quest.id);
            return;
        }

        if (!Array.isArray(quest.progress)) {
            console.warn('[Quest] quest.progress is not an array for:', quest.id);
            return;
        }

        quest.progress.forEach(obj => {
            if (!obj) return;
            if (obj.type !== type) return;
            if (obj.target !== target) return;

            const before = obj.current || 0;
            obj.current = Math.min(obj.required || 1, before + amount);
            
            if (obj.current > before) {
                progressMade = true;
                console.debug('[Quest] Progress:', quest.id, type, target, `${before} → ${obj.current}`);
            }
        });
    });

    return progressMade;
}
```

**Benefits:**
- ✅ Catches corrupted data
- ✅ Provides useful debug info
- ✅ Prevents crashes
- ✅ Returns whether progress was actually made

---

### Fix 5: Simplify Quest Completion Check

**Implementation:**
```javascript
export function checkQuestCompletion(character, questId) {
    if (!character || !questId) return false;
    
    const activeQuest = character.activeQuests?.find(q => q.id === questId);
    if (!activeQuest) return false;

    const questDef = getQuestById(questId);
    if (!questDef) return false;

    // Check if all progress entries meet their requirements
    if (!Array.isArray(activeQuest.progress)) return false;
    
    return activeQuest.progress.every((obj, idx) => {
        const required = questDef.objectives[idx]?.required || 1;
        const current = obj.current || 0;
        return current >= required;
    });
}
```

**Benefits:**
- ✅ Simple logic
- ✅ No getQuestObjectiveState complexity
- ✅ Clear what it's checking

---

### Fix 6: Improve startQuest to Match Progress Structure

**Implementation:**
```javascript
export function startQuest(character, questId) {
    const quest = getQuestById(questId);
    if (!quest || !canStartQuest(character, questId)) return false;

    // Create progress matching objectives exactly
    const activeQuest = {
        id: quest.id,
        progress: quest.objectives.map(obj => ({
            type: obj.type,
            target: obj.target,  // Use consistent field name
            current: 0,
            required: obj.required || 1
        })),
        acceptedAt: Date.now()  // Track when accepted
    };

    character.activeQuests = character.activeQuests || [];
    character.activeQuests.push(activeQuest);
    
    console.log('[Quest] Started:', quest.name);
    return true;
}
```

---

## Migration Plan

### Step 1: Add Validation (Low Risk)
- Add validation to `updateQuestProgress`
- Add validation to `completeQuest`
- Add validation to `startQuest`
- Test with existing quests

### Step 2: Fix Field Names (Medium Risk)
- Update all quest definitions to use `target`
- Update `startQuest` to use `target`
- Update progress matching to use `target`
- Test all quest types (kill, mine, craft, etc.)

### Step 3: Remove Auto-Complete (Medium Risk)
- Add `handInNpc` to all quest definitions
- Remove auto-complete logic from `updateQuestProgress`
- Update NPC dialogues to show turn-in options
- Test quest chains

### Step 4: Simplify Progress Tracking (Low Risk)
- Remove inventory checking from `getQuestObjectiveState`
- Remove equipment checking
- Remove talent checking
- Update UI to show stored progress only
- Test with players

### Step 5: Clean Up Code (Low Risk)
- Remove unused functions
- Add JSDoc comments
- Add unit tests
- Update documentation

---

## Testing Checklist

After each fix:

- [ ] Accept quest from NPC
- [ ] Progress tracked correctly (kill, mine, craft, etc.)
- [ ] Multiple objectives in one quest work
- [ ] Quest completion detected correctly
- [ ] Turn in quest at NPC
- [ ] Rewards granted (gold, XP, items)
- [ ] Quest chains work (next quest unlocks)
- [ ] No console errors
- [ ] Character persists correctly in localStorage
- [ ] Quest UI refreshes properly

---

## Quick Win: Minimal Fix

If you just want to fix the worst bugs quickly:

1. **Add handInNpc to all quests** (15 min)
2. **Remove auto-complete logic** (5 min)
3. **Add validation to updateQuestProgress** (10 min)

This gives you:
- ✅ No mid-combat completions
- ✅ Satisfying turn-in moment
- ✅ Safer code
- ✅ ~30 minutes of work

Would you like me to implement this quick fix now?
