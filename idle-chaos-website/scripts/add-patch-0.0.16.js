/**
 * Script to insert patch note 0.0.16 into the database
 * Run with: node scripts/add-patch-0.0.16.js
 */

const { neon } = require('@neondatabase/serverless');

async function insertPatchNote() {
  const sql = neon(process.env.DATABASE_URL);
  
  const patchNote = {
    date: new Date('2025-11-04'),
    version: '0.0.16',
    title: 'Quest Renaissance: The NPCs Actually Remember You Now',
    highlights: [
      'Quest tracker updates in real-time—no more lying to yourself about progress',
      'NPCs flaunt quest markers (❓ for new quests, ❗ for completion) like they\'re proud of it',
      'Equipment finally registers for quest objectives—pickaxes aren\'t just decorative anymore',
      'Every NPC now speaks with their own personality—Grimsley\'s formal, Wayne curses like a miner, Mother Lumen waxes poetic, and Rowan grunts about duty',
      'Mining revamped: guaranteed ore per swing, level-based node access, and respawning nodes with proper depletion',
      'Centralized quest system across all scenes—one truth to rule them all'
    ],
    notes: [
      'Quest tracker (top-right) now refreshes automatically when you complete objectives, start quests, or turn them in. No more opening the Q modal to see if you\'re done.',
      'NPC quest indicators update on every scene tick: ❓ means "I have something for you," ❗ means "turn this in before I change my mind"',
      'Equipment quest objectives (equip pickaxe, equip armor, etc.) now actually track when you equip items. Tools, weapons, armor—all of it counts.',
      'Quest descriptions rewritten with NPC personality: Mayor Grimsley gives orders like a bureaucrat, Wayne "The Vein" Mineson speaks in mining slang ("these veins won\'t mine themselves"), Mother Lumen channels mystical cryptic energy ("the lantern will guide your blade"), and Rowan Boneaxe keeps it brief and gruff ("Grimsley trusts you. That counts for something").',
      'Mining system overhaul: no more RNG failure—every swing yields ore. Mining speed scales with level, strength, tool bonuses, and talents. Nodes have level requirements, guaranteed yields per hit, and respawn timers when depleted.',
      'Procedural mining node generation: copper and tin nodes spawn along cave walls with proper colliders, proximity prompts ("Press E to Mine"), and visual feedback (particles, sprite scaling).',
      'Mining nodes deplete after a set number of hits and show "Node depleted - it will respawn soon" messages. Lower-level nodes respawn faster than high-level ones.',
      'Mining interval calculation: base speed - (mining level × 20 + strength × 8 + tool speed reduction). Talents further modify gather speed (flat ms reduction + percent bonuses).',
      'Continuous mining mode: press E to start auto-mining, movement or opening modals stops it. Mining animation syncs with actual swing speed and respects character facing direction.',
      'Mining progress bar appears in HUD during mining sessions, showing time until next ore drop with smooth progress animation.',
      'Centralized dialogue system upgraded: all quest dialogue now uses window.__shared_ui functions from shared/ui.js with NPC portraits (👔 Grimsley, ⛏️ Wayne, 🔮 Mother Lumen, 🪓 Rowan) and theme colors (gold, bronze, blue, wood).',
      'Quest module exposed as window.__questModule with updateQuestProgress, startQuest, completeQuest, getQuestById, and other utilities accessible across the entire game.',
      'startQuest() and updateQuestProgress() now trigger UI refreshes automatically—tracker and modal stay synced without manual intervention.',
      'registerQuestIndicators() fixed to use the quest module properly (was looking for window.getAvailableQuests when it should\'ve been window.__questModule.getAvailableQuests).',
      'All four scenes (Town, Cave, GraveForest, GloamwayBastion) confirmed using centralized quest logic with no duplicate code.',
      'Equipment slot detection improved: tools (pickaxe, hatchet, fishing rod) now properly recognized even when they only have tool:true without weapon/armor flags.',
      'Quest progress logs added for debugging: console shows exactly when equipment tracking fires and whether it matched an active objective.',
      'UI polish: quest names, NPC names, and objective descriptions all render with consistent styling across tracker and modal.',
      'Under the hood: removed all references to old window.getQuestById/window.startQuest patterns; everything routes through the centralized module now.'
    ]
  };

  try {
    const result = await sql`
      INSERT INTO "PatchNote" (date, version, title, highlights, notes)
      VALUES (
        ${patchNote.date},
        ${patchNote.version},
        ${patchNote.title},
        ${patchNote.highlights},
        ${patchNote.notes}
      )
      RETURNING *
    `;
    
    console.log('✅ Patch note 0.0.16 inserted successfully:');
    console.log(result[0]);
  } catch (error) {
    console.error('❌ Failed to insert patch note:', error);
    process.exit(1);
  }
}

insertPatchNote().then(() => {
  console.log('\n🎉 Done! The quest system remembers you now.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
