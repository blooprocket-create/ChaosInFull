# Quest System Revamp Analysis

## Current State

Your quest system is **entirely client-side** in Phaser:
- Quest definitions in `src/game/phaser/data/quests.js`
- Character state (including `activeQuests` and `completedQuests`) stored in **localStorage**
- All quest logic runs in the browser
- Database quest system at `app/api/quest/route.ts` is **legacy/unused** from an older version

## Current Problems

### 1. **localStorage = No Server Authority**
Everything lives in the browser:
```javascript
_persistCharacter(username) {
  const key = 'cif_user_' + username;
  localStorage.setItem(key, JSON.stringify(userObj));
}
```

**Issues:**
- No validation - players can edit localStorage
- No sync across devices
- Lost on browser clear/different computer
- Can't implement server-side quest events
- No way to fix corrupted quest states remotely

### 2. **Mutable State Everywhere**
The character object is mutated directly:
```javascript
// In updateQuestProgress
character.activeQuests.forEach(quest => {
  quest.progress.forEach(obj => {
    obj.current = Math.min(obj.required, obj.current + amount);
  });
});
```

**Issues:**
- Hard to track what changed
- No undo/rollback capability
- Race conditions when multiple events fire
- Difficult to debug "how did this get into this state?"

### 3. **Progress Tracking Ambiguity**
```javascript
// Some objectives check inventory, some check stored progress
const usesInventory = INVENTORY_OBJECTIVE_TYPES.includes(obj.type);
```
This creates confusion: Did I mine 20 copper or do I HAVE 20 copper?

### 4. **Auto-Complete Logic is Fragile**
```javascript
if (done && questDef && !questDef.handInNpc) toAutoComplete.push(quest.id);
```

Quests auto-complete if they don't have a `handInNpc`, but this happens **during** `updateQuestProgress`, which means:
- Rewards granted immediately in the middle of combat
- No chance for dramatic "quest complete" moment
- Can complete multiple quests at once in weird order
- Character object modified multiple times in one function call

### 5. **Complex Objective State Resolution**
`getQuestObjectiveState()` is 100+ lines and checks:
- Stored progress counters
- Inventory counts (for some objective types)
- Equipment slots (for equip objectives)
- Talent allocations (for learn_talent objectives)

**Issues:**
- Multiple sources of truth
- Hard to predict what counts toward completion
- Checking inventory means crafting 20 then selling 10 still shows 20/20
- Order-dependent (check stored first, then inventory, take max)

---

## Proposed Solution: Server-Authoritative Quest System

### Design Principles
1. **Database is Single Source of Truth**: No more localStorage for quest state
2. **Immutable Events**: Track progress as a log of events, not mutable state
3. **Server Validates Everything**: Client requests progress, server confirms
4. **Clear Separation**: 
   - Quest **definitions** can stay in Phaser (they're read-only)
   - Quest **state** moves to database
5. **Explicit Completion**: Player must manually turn in quests (no auto-complete during combat)

### New Database Schema

**Option A: Keep Quest Definitions in Code (Simpler Migration)**
```sql
-- Character's quest state (quest definitions stay in Phaser)
CREATE TABLE "CharacterQuest" (
  id                TEXT PRIMARY KEY DEFAULT concat('cq_', substr(md5(random()::text), 1, 16)),
  character_id      TEXT NOT NULL REFERENCES "Character"(id) ON DELETE CASCADE,
  quest_id          TEXT NOT NULL,  -- References QUEST_DEFS in code
  
  status            TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'TURNED_IN')),
  
  -- Progress for each objective
  -- Example: [
  --   {"type": "kill", "target": "slime", "current": 3, "required": 5},
  --   {"type": "mine", "target": "copper_ore", "current": 10, "required": 20}
  -- ]
  progress          JSONB NOT NULL DEFAULT '[]',
  
  accepted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,      -- When all objectives met
  turned_in_at      TIMESTAMPTZ,      -- When rewards claimed
  
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(character_id, quest_id)
);

CREATE INDEX idx_cq_character ON "CharacterQuest"(character_id);
CREATE INDEX idx_cq_active ON "CharacterQuest"(character_id, status) WHERE status = 'ACTIVE';

-- Quest progress events (audit log - optional but highly recommended)
CREATE TABLE "QuestProgressEvent" (
  id                BIGSERIAL PRIMARY KEY,
  character_quest_id TEXT NOT NULL REFERENCES "CharacterQuest"(id) ON DELETE CASCADE,
  
  event_type        TEXT NOT NULL,  -- 'ACCEPTED', 'PROGRESS', 'COMPLETED', 'TURNED_IN'
  objective_type    TEXT,           -- 'kill', 'mine', 'craft', etc.
  objective_target  TEXT,           -- 'slime', 'copper_ore', etc.
  delta             INTEGER,        -- How much progress added
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qpe_character_quest ON "QuestProgressEvent"(character_quest_id, created_at DESC);
```

**Option B: Full Database-Driven (More Flexible Long-Term)**
```sql
-- Quest definition in database
CREATE TABLE "Quest" (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  giver_npc_id      TEXT,
  location          TEXT,
  hand_in_npc_id    TEXT,
  min_level         INTEGER DEFAULT 1,
  
  -- Rewards (stored as JSONB for flexibility)
  rewards           JSONB NOT NULL DEFAULT '{}',
  -- Example: {"gold": 100, "exp": 250, "items": [{"id": "copper_bar", "qty": 5}]}
  
  prerequisites     TEXT[] DEFAULT '{}',  -- Quest IDs that must be completed
  
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Quest objectives
CREATE TABLE "QuestObjective" (
  id                BIGSERIAL PRIMARY KEY,
  quest_id          TEXT NOT NULL REFERENCES "Quest"(id) ON DELETE CASCADE,
  order_index       INTEGER NOT NULL,
  
  type              TEXT NOT NULL,
  target            TEXT,
  count_required    INTEGER NOT NULL DEFAULT 1,
  description       TEXT,
  
  UNIQUE(quest_id, order_index)
);

-- (CharacterQuest and QuestProgressEvent same as Option A)
```

### API Endpoints Redesign

```typescript
// GET /api/character/[characterId]/quests
// Returns quest state for this character
export async function GET(req: Request, { params }: { params: { characterId: string } }) {
  const { characterId } = params;
  
  // Get character's quest state from DB
  const characterQuests = await db.query(
    'SELECT * FROM "CharacterQuest" WHERE character_id = $1',
    [characterId]
  );
  
  // Get quest definitions from code
  const QUEST_DEFS = (await import('@/src/game/phaser/data/quests')).QUEST_DEFS;
  
  // Combine DB state with quest definitions
  const quests = characterQuests.map(cq => {
    const def = QUEST_DEFS[cq.quest_id];
    return {
      id: cq.quest_id,
      name: def.name,
      description: def.description,
      status: cq.status,
      objectives: def.objectives.map((objDef, idx) => {
        const progress = cq.progress[idx] || { current: 0 };
        return {
          type: objDef.type,
          target: objDef.itemId || objDef.enemyId,
          required: objDef.required,
          current: progress.current,
          description: objDef.description
        };
      }),
      rewards: def.rewards,
      canTurnIn: cq.status === 'COMPLETED' && def.handInNpc,
      completedAt: cq.completed_at,
      acceptedAt: cq.accepted_at
    };
  });
  
  // Find available quests
  const completed = characterQuests
    .filter(q => q.status === 'TURNED_IN')
    .map(q => q.quest_id);
  
  const available = Object.values(QUEST_DEFS)
    .filter(def => {
      // Not already active or completed
      const hasQuest = characterQuests.some(q => q.quest_id === def.id);
      if (hasQuest) return false;
      
      // Prerequisites met
      return def.prerequisites.every(pre => completed.includes(pre));
    })
    .map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      status: 'AVAILABLE' as const,
      location: def.location,
      giver: def.giver
    }));
  
  return NextResponse.json({ 
    active: quests.filter(q => q.status === 'ACTIVE'),
    completed: quests.filter(q => q.status === 'COMPLETED'),
    available
  });
}

// POST /api/character/[characterId]/quests/[questId]/accept
export async function POST(req: Request, { params }: { params: { characterId: string; questId: string } }) {
  const { characterId, questId } = params;
  
  // Validate character can accept this quest
  const QUEST_DEFS = (await import('@/src/game/phaser/data/quests')).QUEST_DEFS;
  const def = QUEST_DEFS[questId];
  
  // Check prerequisites, level, etc.
  // ...
  
  // Create character quest record
  const progress = def.objectives.map(obj => ({
    type: obj.type,
    target: obj.itemId || obj.enemyId,
    current: 0,
    required: obj.required
  }));
  
  await db.query(`
    INSERT INTO "CharacterQuest" (character_id, quest_id, status, progress, accepted_at)
    VALUES ($1, $2, 'ACTIVE', $3, NOW())
  `, [characterId, questId, JSON.stringify(progress)]);
  
  return NextResponse.json({ ok: true });
}

// POST /api/character/[characterId]/quests/[questId]/progress
export async function POST(req: Request, { params }: { params: { characterId: string; questId: string } }) {
  const { characterId, questId } = params;
  const body = await req.json();
  const { type, target, amount = 1 } = body;
  
  // Get current quest state
  const cq = await db.query(
    'SELECT * FROM "CharacterQuest" WHERE character_id = $1 AND quest_id = $2 AND status = $3',
    [characterId, questId, 'ACTIVE']
  );
  
  if (!cq[0]) {
    return NextResponse.json({ ok: false, error: 'quest_not_active' }, { status: 400 });
  }
  
  // Update progress
  const progress = cq[0].progress;
  let updated = false;
  let allComplete = true;
  
  for (const obj of progress) {
    if (obj.type === type && obj.target === target) {
      obj.current = Math.min(obj.required, obj.current + amount);
      updated = true;
    }
    if (obj.current < obj.required) allComplete = false;
  }
  
  if (!updated) {
    return NextResponse.json({ ok: false, error: 'invalid_objective' }, { status: 400 });
  }
  
  // Check if quest is now complete
  const newStatus = allComplete ? 'COMPLETED' : 'ACTIVE';
  const completedAt = allComplete ? new Date() : null;
  
  await db.query(`
    UPDATE "CharacterQuest" 
    SET progress = $1, status = $2, completed_at = $3, updated_at = NOW()
    WHERE character_id = $4 AND quest_id = $5
  `, [JSON.stringify(progress), newStatus, completedAt, characterId, questId]);
  
  // Log event
  await db.query(`
    INSERT INTO "QuestProgressEvent" (character_quest_id, event_type, objective_type, objective_target, delta)
    VALUES ($1, 'PROGRESS', $2, $3, $4)
  `, [cq[0].id, type, target, amount]);
  
  return NextResponse.json({ 
    ok: true, 
    progress,
    completed: allComplete
  });
}

// POST /api/character/[characterId]/quests/[questId]/turn-in
export async function POST(req: Request, { params }: { params: { characterId: string; questId: string } }) {
  const { characterId, questId } = params;
  
  // Verify quest is complete
  const cq = await db.query(
    'SELECT * FROM "CharacterQuest" WHERE character_id = $1 AND quest_id = $2 AND status = $3',
    [characterId, questId, 'COMPLETED']
  );
  
  if (!cq[0]) {
    return NextResponse.json({ ok: false, error: 'not_ready' }, { status: 400 });
  }
  
  // Get quest definition
  const QUEST_DEFS = (await import('@/src/game/phaser/data/quests')).QUEST_DEFS;
  const def = QUEST_DEFS[questId];
  
  // Grant rewards in transaction
  await db.transaction(async (tx) => {
    // Gold
    if (def.rewards.gold) {
      await tx.query(
        'UPDATE "Character" SET gold = gold + $1 WHERE id = $2',
        [def.rewards.gold, characterId]
      );
    }
    
    // XP (call your existing XP endpoint)
    // ...
    
    // Items
    for (const item of def.rewards.items || []) {
      await tx.query(`
        INSERT INTO "ItemStack" (id, character_id, item_key, count)
        VALUES (gen_random_uuid(), $1, $2, $3)
        ON CONFLICT (character_id, item_key) 
        DO UPDATE SET count = "ItemStack".count + $3
      `, [characterId, item.id, item.qty]);
    }
    
    // Mark quest as turned in
    await tx.query(`
      UPDATE "CharacterQuest"
      SET status = 'TURNED_IN', turned_in_at = NOW()
      WHERE character_id = $1 AND quest_id = $2
    `, [characterId, questId]);
  });
  
  return NextResponse.json({ ok: true, rewards: def.rewards });
}
```

### Phaser Integration

**Step 1: Remove localStorage dependency for quests**

```javascript
// OLD: Everything in memory/localStorage
character.activeQuests = [...]
_persistCharacter(username) {
  localStorage.setItem('cif_user_' + username, JSON.stringify(userObj));
}

// NEW: Quest state lives in database, fetch as needed
async function loadQuestState(characterId) {
  const res = await fetch(`/api/character/${characterId}/quests`);
  return await res.json();
}
```

**Step 2: Create Quest API wrapper**

```javascript
// src/game/services/questApi.js
export class QuestAPI {
  constructor(characterId) {
    this.characterId = characterId;
    this.cache = null;
    this.lastFetch = 0;
  }
  
  async fetchQuests(forceRefresh = false) {
    // Cache for 5 seconds to avoid spam
    if (!forceRefresh && this.cache && (Date.now() - this.lastFetch < 5000)) {
      return this.cache;
    }
    
    const res = await fetch(`/api/character/${this.characterId}/quests`);
    const data = await res.json();
    this.cache = data;
    this.lastFetch = Date.now();
    return data;
  }
  
  async acceptQuest(questId) {
    const res = await fetch(`/api/character/${this.characterId}/quests/${questId}/accept`, {
      method: 'POST'
    });
    
    if (res.ok) {
      this.cache = null; // Invalidate cache
    }
    
    return await res.json();
  }
  
  async updateProgress(questId, type, target, amount = 1) {
    const res = await fetch(`/api/character/${this.characterId}/quests/${questId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, target, amount })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      this.cache = null; // Invalidate cache
      
      // Emit event for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('questProgress', { 
          detail: { questId, completed: data.completed }
        }));
      }
    }
    
    return data;
  }
  
  async turnInQuest(questId) {
    const res = await fetch(`/api/character/${this.characterId}/quests/${questId}/turn-in`, {
      method: 'POST'
    });
    
    const data = await res.json();
    
    if (data.ok) {
      this.cache = null;
      
      // Emit event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('questTurnedIn', { 
          detail: { questId, rewards: data.rewards }
        }));
      }
    }
    
    return data;
  }
}
```

**Step 3: Update scenes to use API**

```javascript
// In Cave.js, GraveForest.js, etc.

class CaveScene extends Phaser.Scene {
  create() {
    // Initialize quest API
    const characterId = this.char.id; // Assuming character has an ID from DB
    this.questAPI = new QuestAPI(characterId);
    
    // Load quest state
    this.loadQuestState();
    
    // Listen for progress events
    window.addEventListener('questProgress', this.onQuestProgress.bind(this));
  }
  
  async loadQuestState() {
    const { active, completed, available } = await this.questAPI.fetchQuests();
    
    // Store for UI rendering
    this.activeQuests = active;
    this.completedQuestIds = completed.map(q => q.id);
    this.availableQuests = available;
    
    // Refresh UI
    this.refreshQuestUI();
  }
  
  async onEnemyKilled(enemyType) {
    // Find active quests with kill objectives for this enemy
    for (const quest of this.activeQuests) {
      const hasKillObjective = quest.objectives.some(
        obj => obj.type === 'kill' && obj.target === enemyType && obj.current < obj.required
      );
      
      if (hasKillObjective) {
        // Update progress on server
        try {
          const result = await this.questAPI.updateProgress(quest.id, 'kill', enemyType, 1);
          
          if (result.completed) {
            this._showToast(`Quest Complete: ${quest.name}`, 3000);
          }
        } catch (e) {
          console.error('Failed to update quest progress', e);
        }
      }
    }
    
    // Refresh quest state
    await this.loadQuestState();
  }
  
  async onMineOre(oreType, amount) {
    // Similar to onEnemyKilled
    for (const quest of this.activeQuests) {
      const hasMineObjective = quest.objectives.some(
        obj => obj.type === 'mine' && obj.target === oreType
      );
      
      if (hasMineObjective) {
        await this.questAPI.updateProgress(quest.id, 'mine', oreType, amount);
      }
    }
    
    await this.loadQuestState();
  }
  
  onQuestProgress(event) {
    const { questId, completed } = event.detail;
    
    if (completed) {
      // Play completion animation/sound
      this.sound.play('quest_complete');
      
      // Show notification
      this._showToast('Quest objectives complete! Return to the quest giver.', 3000);
    }
    
    // Refresh UI
    this.refreshQuestUI();
  }
  
  async onNPCInteraction(npcId) {
    // Check if NPC has quests to give
    const questsFromNPC = this.availableQuests.filter(q => q.giver === npcId);
    
    // Check if NPC can accept turn-ins
    const turnInQuests = this.activeQuests.filter(
      q => q.status === 'COMPLETED' && QUEST_DEFS[q.id].handInNpc === npcId
    );
    
    // Build dialogue options
    const options = [];
    
    for (const quest of questsFromNPC) {
      options.push({
        label: `[Quest] ${quest.name}`,
        onClick: async () => {
          await this.questAPI.acceptQuest(quest.id);
          await this.loadQuestState();
          this._showToast(`Quest accepted: ${quest.name}`, 2000);
          this._closeDialogue();
        }
      });
    }
    
    for (const quest of turnInQuests) {
      options.push({
        label: `[Turn In] ${quest.name}`,
        onClick: async () => {
          const result = await this.questAPI.turnInQuest(quest.id);
          await this.loadQuestState();
          
          // Show rewards
          const rewardText = [];
          if (result.rewards.gold) rewardText.push(`${result.rewards.gold} gold`);
          if (result.rewards.xp) rewardText.push(`${result.rewards.xp} XP`);
          
          this._showToast(`Quest Complete! Received: ${rewardText.join(', ')}`, 3000);
          this._closeDialogue();
        }
      });
    }
    
    // Show dialogue with options
    this._showDialogue(npcId, options);
  }
}
```

**Step 4: Simplify quest definitions (remove auto-complete logic)**

```javascript
// src/game/phaser/data/quests.js

// REMOVE: updateQuestProgress, completeQuest, checkQuestCompletion
// These now happen server-side

// KEEP: Quest definitions (they're read-only reference data)
export const QUEST_DEFS = {
  tutorial_meet_wayne: {
    id: 'tutorial_meet_wayne',
    name: 'Copper Mining Basics',
    description: 'Learn the basics of mining...',
    objectives: [
      { type: 'travel', itemId: 'Cave', required: 1, description: 'Travel to the Cave' },
      { type: 'talk', itemId: 'wayne_mineson', required: 1, description: 'Speak with Wayne' }
    ],
    rewards: {
      items: [{ id: 'copper_pickaxe', qty: 1 }],
      xp: { mining: 50 },
      gold: 10
    },
    prerequisites: [],
    giver: 'mayor_grimsley',
    location: 'Town',
    handInNpc: 'wayne_mineson'
  },
  // ... rest of quests
};

// KEEP: Helper functions that don't mutate state
export function getQuestById(questId) {
  return QUEST_DEFS[questId] || null;
}

// REMOVE: Functions that modify character state
// export function startQuest(character, questId) { ... }
// export function updateQuestProgress(character, type, itemId, amount) { ... }
// export function completeQuest(character, questId) { ... }
```

---

## Migration Path

### Phase 1: Database Setup (Week 1)
1. **Create CharacterQuest table** (start with Option A - quest defs in code)
2. **Create QuestProgressEvent table** for audit trail
3. **Add character.id to database** if not already there (for foreign keys)
4. **Migration script**: Convert localStorage quest data to database
   ```javascript
   // scripts/migrate-quests-to-db.js
   // For each user in localStorage:
   //   - Read character data
   //   - Extract activeQuests and completedQuests
   //   - Insert into CharacterQuest table
   //   - Preserve progress arrays as JSONB
   ```

### Phase 2: API Implementation (Week 1-2)
1. **Create new API routes**:
   - `GET /api/character/[id]/quests`
   - `POST /api/character/[id]/quests/[questId]/accept`
   - `POST /api/character/[id]/quests/[questId]/progress`
   - `POST /api/character/[id]/quests/[questId]/turn-in`
2. **Import quest definitions from Phaser code** (`QUEST_DEFS`)
3. **Add transaction handling** for reward distribution
4. **Test endpoints** with Postman/curl

### Phase 3: Phaser Refactor (Week 2-3)
1. **Create `QuestAPI` service class**
2. **Update one scene at a time**:
   - Start with Town (simplest - just quest acceptance)
   - Then Cave (has NPC interactions + mining)
   - Then combat scenes (kill objectives)
   - Finally crafting scenes (craft objectives)
3. **Remove old functions** from `quests.js`:
   - Keep `QUEST_DEFS` and `getQuestById()`
   - Remove `startQuest`, `updateQuestProgress`, `completeQuest`
4. **Update `_persistCharacter`** to NOT save quest state

### Phase 4: UI Updates (Week 3)
1. **Update QuestPanel.tsx** to use new API format
2. **Remove `questDirtyCount` polling** - use API cache instead
3. **Add event listeners** for quest progress notifications
4. **Create toast/modal** for quest completion celebrations

### Phase 5: Testing & Cleanup (Week 4)
1. **Test all quest chains end-to-end**
2. **Verify progress tracking** for each objective type
3. **Check reward distribution** (gold, XP, items)
4. **Remove old API route** (`app/api/quest/route.ts`)
5. **Update documentation**
6. **Deploy** 🎉

---

## Benefits of New System

### Reliability
- ✅ **Server validates all progress** - no cheating via localStorage editing
- ✅ **Database transactions** ensure rewards aren't lost or duplicated
- ✅ **Audit trail** via QuestProgressEvent table
- ✅ **Rollback capability** if something goes wrong

### Data Integrity
- ✅ **Quest state survives** browser clears, computer changes
- ✅ **Cross-device sync** - play on desktop, continue on mobile
- ✅ **Admin tools possible** - fix stuck quests remotely
- ✅ **Analytics** - track which quests players complete, where they get stuck

### Developer Experience
- ✅ **Clear separation** - quest definitions (code) vs quest state (DB)
- ✅ **Immutable progress** - events logged, not state mutated
- ✅ **Easier debugging** - check database to see exact state
- ✅ **Testing** - can set up quest states in test DB

### Player Experience
- ✅ **Manual turn-in** creates satisfying quest complete moment
- ✅ **Progress visible** in real-time across all UI
- ✅ **No weird auto-complete** during combat
- ✅ **Clear quest log** showing exactly what's active/complete/available

---

## Alternative: Minimal Fix (If Full Rewrite Too Much)

If you want to keep the client-side system but fix the worst bugs:

### Quick Fixes:
1. **Stop auto-completing quests** - require all quests to have `handInNpc`
2. **Simplify objective tracking** - don't check inventory, only track stored progress
3. **Add safety checks** in `updateQuestProgress`:
   ```javascript
   if (!character?.activeQuests) return;
   if (!Array.isArray(character.activeQuests)) return;
   ```
4. **Debounce `_persistCharacter`** - don't save on every progress tick:
   ```javascript
   _persistCharacterDebounced = debounce(() => {
     this._persistCharacter(this.username);
   }, 1000);
   ```
5. **Add validation** when loading from localStorage:
   ```javascript
   if (!Array.isArray(character.activeQuests)) character.activeQuests = [];
   if (!Array.isArray(character.completedQuests)) character.completedQuests = [];
   ```

### Pros:
- ✅ Minimal code changes
- ✅ Can do in 1-2 days

### Cons:
- ❌ Still vulnerable to localStorage manipulation
- ❌ Still client-side only (no cross-device)
- ❌ Still hard to debug
- ❌ Technical debt remains

---

## Recommendation

**Do the full server-authoritative rewrite** because:

1. **Security**: localStorage can be edited - players WILL find exploits
2. **Persistence**: Browser cache clears = lost progress = angry players
3. **Future-proof**: You'll need server-side quests for multiplayer features anyway
4. **Debuggability**: Can inspect/fix quest states from admin panel
5. **Analytics**: Track quest completion rates, optimize game flow

The migration is about 3-4 weeks of work but sets up a solid foundation. The alternative "minimal fix" will just delay the inevitable and leave you with technical debt.

**Start with Phase 1 (database setup) this week.** Even if you don't finish the full migration, having quest state in the database gives you:
- Backup of player progress
- Admin visibility
- Foundation for future work

Want me to start implementing Phase 1 (database schema + migration script)?
