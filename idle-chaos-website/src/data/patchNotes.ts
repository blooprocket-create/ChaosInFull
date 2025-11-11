export type PatchNote = {
  date: string; // ISO
  version: string; // semantic or incremental
  title: string;
  highlights: string[];
  notes?: string[];
};

export const patchNotes: PatchNote[] = [
  {
    date: "2025-11-11",
    version: "0.0.22",
    title: "Global User Settings: server-backed preferences, client hydration, and API",
    highlights: [
      "New API: /api/account/settings (GET/PATCH/PUT) to load and save user preferences",
      "Schema auto-provision: 'User.settings' JSONB column ensured on demand (no manual migration)",
      "Settings modal now persists globally across characters — saves to server and hydrates on boot",
      "Client bridge gains loadUserSettings/saveUserSettingsPatch; window.__game_settings stays authoritative",
      "'settings:changed' event broadcasts to scenes/UI for immediate re-apply (volumes, always run, range indicator)",
      "Input sanitation + clamping: volumes 0..1, thresholds 1..99; unknown keys ignored",
      "Character position persistence hardening: COALESCE protects lastX/lastY when only scene patches; portal and HUD 'Return' now persist scene + coords before switching",
      "Quality: removed explicit any casts and fixed short-circuit call to satisfy lint rules; quick typecheck/lint pass"
    ],
    notes: [
      "Allowed settings keys (extendable): musicVolume, sfxVolume, alwaysRun, showAtkRange, autoUseHP (+Threshold), autoUseMana (+Threshold).",
      "PATCH shallow-merges sanitized values into existing settings; PUT replaces the entire object (sanitized).",
      "On client boot, settings hydrate from server (if authenticated) and merge over localStorage; local remains an offline fallback.",
      "Saving inside the Settings modal updates localStorage, posts a PATCH, updates window.__game_settings, and dispatches 'settings:changed'.",
      "Scenes can listen for 'settings:changed' to re-apply volumes and toggles; background music volume is adjusted immediately.",
      "DB helper: ensureUserSettingsColumn() adds the JSONB column with default '{}' — no separate migration step.",
      "Character patch route: positional update preserves unspecified fields and avoids nulling coordinates during portal transitions.",
      "HUD enhancement: 'Return to Character Select' patches current scene and coordinates prior to scene handover to prevent stale spawns.",
      "Type/Lint: Extended Window typing with __game_settings to avoid any; replaced onSkillLevelUp short-circuit call with an if-guard.",
      "Developer ergonomics: persistence bridge gains strongly-typed methods and telemetry events for settings and XP batching."
    ]
  },
  {
    date: "2025-11-08",
    version: "0.0.21",
    title: "Harborwright Finn, Fishing Mastery Tree, Dock Repair Questline & Hotspot Economy",
    highlights: [
      "New NPC: Harborwright Finn (Broken Dock) with branching dialogue for repairs, bait shop, and fishing advice",
      "Four-stage Dock Repair questline unlocking fishing hotspots and visual dock upgrades",
      "Fishing Mastery system added (node-based progression with retroactive point backfill and mastery overlay UI)",
      "Click-to-cast fishing revamp: directional line, bobber animation, bite tension model, abort on distance",
      "Dynamic fishing hotspots spawn post Stage 1 — higher bite rates and rarity weighting",
      "Bait shop integrated into Finn's dialogue (replaces legacy ground bucket prompt)",
      "Telemetry bridge added for granular fishing events (cast, bite, catch, rod stats, tension outcomes)",
      "Event Board structure appears after dock fully repaired (stage ≥4) with layered art & subtle notice pulse",
      "Rowan sprite reused/tinted for Finn with idle/walk animations and fallback circle if assets missing",
      "Quest/dialogue UI extended: multi-page NPC dialogue with themed color (#6fa9ff) and objective lists"
    ],
    notes: [
      "Harborwright Finn uses window.__shared_ui.renderDialogue flow similar to Steward; supports pages: root, repairs, bait_shop, advice.",
      "Dock Repair Questline: 4 stages; each stage unlocks incremental fishing perks (hotspots on stage 1, board visibility on stage 4). Completion increments char.flags.dockStage and triggers visual refresh + hotspots warmup.",
      "Fishing Mastery: Added data/fishingMastery.ts; mastery nodes grant bonuses (e.g., improved bite frequency, tension forgiveness). Retroactive point backfill routine awards unclaimed points on first load post-change.",
      "Casting Revamp: Replaced node-interact E-based fishing with click-to-cast anywhere on water. Line tension model tracks bite windows; abort triggers when player moves outside distance or cancels. Persistent cast line visuals retained between updates.",
      "Bobber Animation: Bite events animate bobber + tension feedback; catching logic now factors rod stats piped via telemetryBridge for balance analytics.",
      "Telemetry Bridge: shared/telemetryBridge.js funnels structured events (fishing_cast, fishing_bite, fishing_catch) including rod power, range, and modifiers. Enables external performance dashboards.",
      "Hotspot Spawning: On first stage completion, schedule initial hotspot + delayed second spawn (2s). _spawnHotspot sets _nextHotspotAt for periodic respawn logic and rarity weighting adjustments.",
      "Dialogue-Shop Integration: Finn's 'Open Bait Shop' route calls the existing _openBucketShop logic; legacy ground-based bait bucket prompt removed for cleaner UX.",
      "Event Board Art: Rebuilt from simple rectangle to multi-layer structure (shadow, post, framed board, header plank, notices, nails) with depth layering and subtle alpha tween pulse.",
      "NPC Animation Helper: _playNpcAnimation selects rowan_idle vs rowan_walk if spritesheets loaded; falls back gracefully if missing.",
      "Quest Objective Lists: Repairs page dynamically builds objective list via ui.buildObjectiveList using questDef + current state to show materials / tasks.",
      "Character State Persistence: Completing a repair stage updates dockStage, persists character, refreshes quest log modal, triggers toast messaging (stage-specific).",
      "Safety / Error Guards: Extensive try/catch blocks ensure missing textures or UI modules don't break scene initialization (e.g., harborwright sprite fallback).",
      "Visual Prompt Adjust: Finn's interact prompt elevated to account for sprite origin shift (from circle baseline).",
      "Cleanup: Removed legacy fishingNode & baitBucket prompt logic; replaced with centralized interaction via Finn dialogue tree.",
      "Performance Considerations: Depth updates constrained; hotspot scheduling avoids redundant timers; NPC animation creation guarded by this.textures.exists checks.",
      "Tooling: Added FishingController system file orchestrating active fishing states (casting, waiting, tension) and integrating mastery bonuses.",
      "Analytics Prep: Rod stats integrated into telemetry to support later balancing (distance cast, bite latency, catch success).",
      "User Feedback: Toasts for quest accept, repair completion, hotspot unlock; dialogue variants update contextually based on dockStage.",
      "Fallback Behavior: If quest already fully complete (stage ≥4), repairs page shows completion messaging; bait shop and advice remain accessible.",
      "Board Visibility Toggle: Event board objects group toggled visible only when dockStage ≥4; nails, notices, shadow all share unified visibility state." 
    ]
  },
  {
    date: "2025-11-08",
    version: "0.0.20",
    title: "Click-to-Strike Combat, Directional Skill Brain, Percent Potions & Armor That Actually Matters",
    highlights: [
      "Primary combat input overhauled: hold / click to attack — spacebar retires to emote duty",
      "All dash / projectile skills now share a unified directional priority (target → nearest → mouse → movement vector → facing → last rotation)",
      "Enemy Defense stat is live and persisted per spawn: damage math finally has a second dimension",
      "Health & Mana potions reworked to percentage based (Minor 15%, Major 35%) with smarter auto‑use minimizing overheal",
      "New weapon families scaffolded: Bows, Crossbows, and Polearms (range + future niche scaling)",
      "Needle Rain actually hits things; Knife Swarm partially tuned (still flagged for tighter cone)",
      "Shadowstep, Ghastly Drive, Hex Engine, Eagle Shot all speak the same aiming dialect",
      "Console noise diet: CSS preload spam, stray ping warnings, and missing audio 404 chatter suppressed",
      "Dialogue polish: typos & runaway punctuation cleaned; NPC lines stop desyncing mid-scroll",
      "Light performance wins: fewer duplicate Phaser boots, leaner animation resolution, reduced overdraw from mining / targeting"
    ],
    notes: [
      "Click / Hold Attack: Replaced keydown polling with pointer down → sustained attack loop. Auto‑attack respects target lock and cancels cleanly on pointer up or movement outside range.",
      "Directional Priority Core: A single resolver now powers Ghastly Drive, Hex Engine, Eagle Shot, Shadowstep (and future actives). Order: explicit selected target → closest valid enemy in arc → mouse world position → current velocity vector → facing direction → preserved last rotation. This eliminates ‘dash south because reasons’.",
      "Enemy Defense: computeEnemyStats now derives defense from level + rarity curves (with overrides). Each enemy instance stores a frozen defense value (enemy.setData('defense', n)) so multi‑scene transitions & tooltips are consistent. Tooltip line shows DEF n alongside HP / DMG cues.",
      "Damage & Mitigation: Existing formulas read defense before critical application; future talents can scale off percentPen or flat shred without retrofitting spawn code.",
      "Animation Direction Fix: Player sprite row mapping restored to ULDR (up/left/down/right). Incorrect ‘down while walking north’ glitch resolved; idle/mine placeholders rebuilt per scene for timing sync.",
      "Potion Percent Rework: Minor / Major potions now scale with your max pools. Auto‑use algorithm selects the smallest potion covering ≥60% of the deficit to avoid wasting a Major at 5% missing HP. PotionEffect modifiers now multiplicatively boost the computed heal/mana chunk.",
      "Inventory Use Feedback: Updated toasts show actual heal / mana amount plus percent source when relevant (e.g. “+128 HP / 15%”).",
      "Needle Rain: Projectile fan recalculated using the unified resolver angle; now samples collision frames instead of trusting spawn-only overlap → reliable multi‑hit contact (within per‑target cap).",
      "Knife Swarm: Converted to shared angle baseline; current spread uses conservative radial offset. Marked for Phase 2 refinement (tighter clustering + crit synergy).",
      "Shadowstep Restoration: Removed accidental dash‑only branch that broke stealth. Teleport now: compute target point via resolver → apply stealth state + post‑stealth buff timers → optional dash trail particles for clarity.",
      "Eagle Shot: Chooses locked target first, else nearest valid in LOS, else mouse; gracefully degrades to movement/facing so you never fire behind yourself while kiting.",
      "Console Hygiene: Patched CSS preload warnings, gated PostHog disabled logs, throttled /api/ping noise, and added dev‑mode audio fallback loading (preload only *_fallback in dev to stop 404 spam).",
      "Audio Fallback Logic: Boot scene now conditionally loads only “*_off” tracks in development unless NEXT_PUBLIC_AUDIO_PREFER_FALLBACK is overridden; runtime playBackgroundMusic will probe primary then downgrade silently.",
      "Phaser Singleton: Creation lock + refcount prevents duplicate canvas + doubled input listeners when React strict/dev remounts occur.",
      "Mining Guard: Pre‑start validation aborts ‘mine air’ attempts on depleted nodes; initial swing animation skipped if node empties between intent and first tick.",
      "Dialogue Pass: Normalized capitalization, removed duplicated punctuation, ensured quest markers pause NPC wander so text doesn’t slide off screen mid‑conversation.",
      "Performance Notes: Fewer redundant animation exists() checks, shielded quest indicator logs (state‑delta only), reduced early ref measurements in HUD construction.",
      "Tech Hooks for Upcoming Gear: Bow / Crossbow / Polearm categories recognized in weapon range calculation and future talent gating (no live drops yet; seeding incoming).",
      "Housekeeping: Purged lingering explicit anys in game bootstrap; replaced ts‑ignore suppressions with narrow types; ensured lint + typecheck pass post‑refactor."
    ]
  },
  {
    date: "2025-11-05",
    version: "0.0.19",
    title: "Town Gossip: Steward Fenric, bench glow‑ups, and shortcut buttons",
    highlights: [
      "Steward Fenric arrives — the Mayor’s cooler, tidier shadow with wandering feet and actual manners",
      "Workbench, Storage, and Shop had a glow‑up: less ‘grey rectangle,’ more ‘I belong in a town’",
      "Newcomer perks: from Fenric’s Advice, pop open Shop/Storage/Workbench without walking a single tile",
      "Pacing problem solved: NPCs stop roaming while you’re mid‑conversation; bushes stop photobombing the furniture",
      "New: Buffs panel lives in the skill bar — see active effects with timers at a glance"
    ],
    notes: [
      "Fenric reuses Grimsley’s rig with a tasteful blue tint (0x88b4ff) and a smaller wander radius — tidy steward, tidy orbits.",
      "He’s chatty at ~56px: press E to be judged politely. ‘Advice’ includes quick‑open buttons for Shop, Storage, and the Workbench.",
      "Visuals: Workbench sports a highlighted plank and visible bolts; Chest has a band + lock; Shop gets counter trim, a stripey awning, and a proper sign.",
      "Depth sorting cleaned so foliage sits behind fixtures; prompts track NPC heads like loyal birds; roaming pauses during dialogue so no one moonwalks off‑screen mid‑sentence.",
      "Town shutdown tidies after itself — modals, prompts, and indicators don’t linger like a dragon’s hoard of UI.",
      "Bug fixes: Fenric now actually animates (idle/walk in four directions) instead of striking a single dramatic pose.",
      "Bug fixes: Dialogue options no longer auto‑dismiss the conversation. Only explicit ‘Leave’/‘Thanks’ buttons close the window; in‑dialog choices keep it open.",
      "Buffs panel: integrated into the global skill bar. Pulls from your character’s active buffs and skill effects (e.g., stealth dodge, mana shield) and shows countdowns."
    ]
  },
  {
    date: "2025-11-05",
    version: "0.0.18",
    title: "Rarity ladders, legendary glow, and spawn refresh",
    highlights: [
      "Full rarity ladders added: Slimes (common→boss), Rats (common→boss), Goblins (common→boss), Skeletons (common→legendary), Demon Spawn (common→legendary)",
      "Legendaries now pop: radiant halo, gold ring, and starbursts on fallback textures",
      "Scenes updated to spawn the new tiers: Inner Field (slimes), Outer Field (rats), Goblin Camp (goblins), Swamp (skeletons), Flame Road (demon spawn)",
      "Shared enemy death animations added for clearer feedback",
      "Slight difficulty bump: HP and damage scaling increased",
      "Slime visuals fixed: regular slimes render green again; flame variants stay fiery"
    ],
    notes: [
      "New enemy IDs (examples): slime_uncommon/rare/legendary, rat_uncommon/rare/epic/legendary/boss, goblin_uncommon/rare/legendary, skeleton_uncommon/rare/epic/legendary, demon_spawn_common/uncommon/rare/epic/legendary.",
      "Inner Field now rolls across the full slime ladder with sensible respawn times; Outer Field mixes in rat tiers with occasional zombie/ghost rats.",
      "Goblin Camp includes uncommon/rare/legendary goblins alongside the existing epics and boss; Gloamway Swamp favors skeleton tiers with a sprinkle of zombies, goblin skeletons, and a brute.",
      "Flame Road blends flaming slimes with Demon Spawn from common to legendary; devil_spawn is rare and The Lurker is ultra-rare.",
      "Legendary visual pass: fallback art overlays a soft halo, bright gold ring, and four-point starbursts — instantly noticeable in the crowd.",
      "Enemy death animation: fade+shrink with an impact ring and debris burst; physics disabled post-kill to prevent jitter.",
      "Balance: computeEnemyStats base curves nudged upward (HP and damage) for a tougher feel without spiking TTK too hard.",
      "Bug fix: default slimes are green again; flame/lava variants only appear in fire-aspected scenes.",
      "Tech notes: scenes use ensureEnemyTexture() for clean fallback art; drawVariantOverlay() now detects 'legendary' for the new glow."
    ]
  },
  {
    date: "2025-11-05",
    version: "0.0.17",
    title: "New Zones: Gloamway Swamp → Flame Road, portal network, and Mother Lumen parity",
    highlights: [
      "New zone: Gloamway Swamp — undead and bone-goblins stalk the marsh",
      "New zone: Flame Road — fire-aspected threats and a lurking apex",
      "Portals: Bastion bottom-right → Swamp, Swamp mid-bottom → Flame Road, return portals wired",
      "Flame Road shows three dormant portals (left/bottom/right) as non-interactive placeholders",
      "Mother Lumen’s dialogue now uses the centralized quest availability flow (markers and offers match)",
    ],
    notes: [
      "Swamp enemies: skeleton, zombie, goblin_skeleton (also accepts goblin_skeleteon), brute_skeleton. Fallback enemy visuals included until art lands.",
      "Flame Road enemies: flaming_slime, big_flaming_slime, devil_spawn, and the_lurker. Expect tighter detection and faster engagements.",
      "Portals: In Gloamway Bastion, a new bottom-right portal leads to Swamp. In Swamp, the top-left portal returns to Bastion and the middle-bottom portal enters Flame Road. In Flame Road, the middle-top portal returns to Swamp.",
      "Dormant portals on Flame Road (mid-left, mid-bottom, mid-right) are rendered semi-faint with a 'Dormant' label—no prompt or interaction yet.",
      "Mother Lumen parity: her dialogue in Bastion now uses getAvailableQuests like Town/Cave/Grave Forest. Indicators (❓/❗) and her offers/turn-ins are consistent. Intro/class-gate flows remain intact, including the class requirement for the special chieftain request.",
      "World metadata updated so the World page and tools can reflect the new Swamp and Flame Road scenes.",
      "Tech notes: scenes registered in the Phaser bootstrap; typecheck/lint/build pass.",
    ],
  },
  {
    date: "2025-11-04",
    version: "0.0.16b",
    title: "Quest Indicator Polish & Tracker Reliability",
    highlights: [
      "Quest indicators now show ❗ when you need to talk to an NPC (not just when quest is 100% complete)",
      "Quest tracker updates every 3 seconds as a fallback—no more stale progress displays",
      "Fixed quest indicators reading wrong scene location (was null, now uses scene key)",
      "Auto-finds active scene when quest actions trigger—tracker/modal update even without explicit scene reference",
      "Reduced log spam: indicators only log when they change state, not every frame"
    ],
    notes: [
      "Quest indicators (❓/❗) now check for two conditions: (1) quest fully complete OR (2) active quest has a 'talk' objective for this NPC. This means Wayne shows ❗ when you need to speak to him, even if other objectives aren't done yet.",
      "Quest tracker refreshes every 3 seconds automatically via setInterval—ensures progress stays visible even if event-driven updates fail. Timer cleaned up on scene shutdown.",
      "Fixed registerQuestIndicators to use scene.sys.settings.key (e.g., 'Town', 'Cave') instead of scene.sys.settings.data.location (which was always null). Now getAvailableQuests correctly filters by location.",
      "updateQuestTracker() and refreshQuestLogModal() now auto-detect the active scene when called with null. They search window.__phaserGame.scene.scenes for the first active scene with a tracker/modal, so quest functions (startQuest, updateQuestProgress, completeQuest) can trigger UI updates without passing a scene.",
      "Added state tracking (Map) to quest indicator update function: only logs when indicator visibility, text, or quest name changes—eliminates console spam from every-frame updates.",
      "Initial quest indicator update now logs character data (hasChar, activeQuests count, completedQuests count, level) for debugging on registration.",
      "All quest UI updates now work immediately on action (equip item, complete objective, start quest) PLUS have the 3-second polling fallback for reliability."
    ]
  },
  {
    date: "2025-11-04",
    version: "0.0.16",
    title: "Quest Renaissance: The NPCs Actually Remember You Now",
    highlights: [
      "Quest tracker updates in real-time—no more lying to yourself about progress",
      "NPCs flaunt quest markers (❓ for new quests, ❗ for completion) like they're proud of it",
      "Equipment finally registers for quest objectives—pickaxes aren't just decorative anymore",
      "Every NPC now speaks with their own personality—Grimsley's formal, Wayne curses like a miner, Mother Lumen waxes poetic, and Rowan grunts about duty",
      "Mining revamped: guaranteed ore per swing, level-based node access, and respawning nodes with proper depletion",
      "Centralized quest system across all scenes—one truth to rule them all"
    ],
    notes: [
      "Quest tracker (top-right) now refreshes automatically when you complete objectives, start quests, or turn them in. No more opening the Q modal to see if you're done.",
      "NPC quest indicators update on every scene tick: ❓ means \"I have something for you,\" ❗ means \"turn this in before I change my mind\"",
      "Equipment quest objectives (equip pickaxe, equip armor, etc.) now actually track when you equip items. Tools, weapons, armor—all of it counts.",
      "Quest descriptions rewritten with NPC personality: Mayor Grimsley gives orders like a bureaucrat, Wayne \"The Vein\" Mineson speaks in mining slang (\"these veins won't mine themselves\"), Mother Lumen channels mystical cryptic energy (\"the lantern will guide your blade\"), and Rowan Boneaxe keeps it brief and gruff (\"Grimsley trusts you. That counts for something\").",
      "Mining system overhaul: no more RNG failure—every swing yields ore. Mining speed scales with level, strength, tool bonuses, and talents. Nodes have level requirements, guaranteed yields per hit, and respawn timers when depleted.",
      "Procedural mining node generation: copper and tin nodes spawn along cave walls with proper colliders, proximity prompts (\"Press E to Mine\"), and visual feedback (particles, sprite scaling).",
      "Mining nodes deplete after a set number of hits and show \"Node depleted - it will respawn soon\" messages. Lower-level nodes respawn faster than high-level ones.",
      "Mining interval calculation: base speed - (mining level × 20 + strength × 8 + tool speed reduction). Talents further modify gather speed (flat ms reduction + percent bonuses).",
      "Continuous mining mode: press E to start auto-mining, movement or opening modals stops it. Mining animation syncs with actual swing speed and respects character facing direction.",
      "Mining progress bar appears in HUD during mining sessions, showing time until next ore drop with smooth progress animation.",
      "Centralized dialogue system upgraded: all quest dialogue now uses window.__shared_ui functions from shared/ui.js with NPC portraits (👔 Grimsley, ⛏️ Wayne, 🔮 Mother Lumen, 🪓 Rowan) and theme colors (gold, bronze, blue, wood).",
      "Quest module exposed as window.__questModule with updateQuestProgress, startQuest, completeQuest, getQuestById, and other utilities accessible across the entire game.",
      "startQuest() and updateQuestProgress() now trigger UI refreshes automatically—tracker and modal stay synced without manual intervention.",
      "registerQuestIndicators() fixed to use the quest module properly (was looking for window.getAvailableQuests when it should've been window.__questModule.getAvailableQuests).",
      "All four scenes (Town, Cave, GraveForest, GloamwayBastion) confirmed using centralized quest logic with no duplicate code.",
      "Equipment slot detection improved: tools (pickaxe, hatchet, fishing rod) now properly recognized even when they only have tool:true without weapon/armor flags.",
      "Quest progress logs added for debugging: console shows exactly when equipment tracking fires and whether it matched an active objective.",
      "UI polish: quest names, NPC names, and objective descriptions all render with consistent styling across tracker and modal.",
      "Under the hood: removed all references to old window.getQuestById/window.startQuest patterns; everything routes through the centralized module now."
    ]
  },
  {
    date: "2025-11-01",
    version: "0.0.15",
    title: "Login/Character-Select HUD cleanup, New Setting Options, Styling for the setting panel",
    highlights: [
      "Cleanup HUD and skill bar DOM on Login/Character-Select scene shutdown to prevent leaks",
      "New settings: toggle Auto-Use Potions",
      "New settings: toggle Auto-Eat Food",
      "Styling improvements for the Settings panel to match site aesthetics"
    ],
    notes: [
      "Login and Character-Select scenes now remove their DOM elements when the scene ends or is destroyed, ensuring no lingering UI artifacts remain when transitioning between scenes or when the game instance is destroyed.",
      "Added a new setting that allows players to enable or disable automatic potion usage during gameplay, providing more control over their character's health management.",
      "Added a new setting that allows players to enable or disable automatic food consumption, giving players the option to manage their character's health more effectively.",
      "The Settings panel has been restyled to align with the overall site design, featuring improved layout, typography, and color schemes for a more cohesive user experience."
    ]
  },
  {
    date: "2025-11-01",
    version: "0.0.14",
    title: "HUD makeover, DnD inventory, dbl‑click use, and fog/nav fix",
    highlights: [
      "HUD moved to bottom‑center above the skill bar with Login/Character‑Select styling (dark panel, red accent, mono font)",
      "Inventory and Equipment modals restyled to match site panels without breaking layout",
      "Drag‑and‑drop reordering for inventory slots (swap items in the grid)",
      "Usable items can be double‑clicked to use; Enter/Space works too — no more tiny Use button",
      "Navbar links are clickable again on Login/Character‑Select (overlays sit below the header)",
      "Buffs clean up across scene transitions — no more frozen/lingering buff displays"
    ],
    notes: [
      "HUD shows name, level, and class; bars are larger with centered labels; theme left border adjusts for Hellscape",
      "HUD and skill bar DOM are removed on scene shutdown; HUD recreated cleanly per scene",
      "Inventory drag handlers use native HTML5 DnD with visual feedback and index‑swap logic",
      "Double‑click handler calls useItemFromSlot directly; keyboard Enter/Space triggers use and refreshes UI",
      "Login/Character‑Select overlays/container z‑index lowered so site header (z‑20) is always above",
      "Expired buffs are pruned on HUD/skill‑bar refresh and on HUD creation to handle missed timers after scene changes"
    ]
  },
  {
    date: "2025-10-31",
    version: "0.0.13",
    title: "World revamp, scene-accurate data, Classes wiki, and UI polish",
    highlights: [
      "World page rebuilt to reflect the actual game scenes (Town, Cave, Inner Field, Outer Field, Goblin Camp, Grave Forest) with correct portals, NPCs, enemies, and resources",
      "New world graph surfaced: Town ↔ Cave/Inner Field, Inner Field ↔ Outer Field, Outer Field ↔ Goblin Camp/Grave Forest, Grave Forest ↔ Broken Dock, Goblin Camp ↔ Gloamway Bastion",
      "Classes page becomes a wiki-style explorer with an interactive talent rank simulator (0–5) that previews real scaling bonuses",
      "Game UI polish: Inventory and Equipment modals moved to screen edges with glassy site styling; HUD is navbar-aware and resizes cleanly",
      "Enemy tables upgraded: expandable loot with friendlier item names, category badges, and gold entries"
    ],
    notes: [
      "World data source replaced: zones now mirror the authoritative scene definitions so portals, NPCs, and enemies match gameplay",
      "Zones mapped: Inner Field → Slimes (common/epic/boss); Outer Field → Rats (rat/zombie/ghost); Cave and Grave Forest show resources and NPCs only",
      "ClassesExplorer pulls talent scaling from live data (scaling/secondScaling) and computes bonus text per simulated rank",
      "Inventory (I) and Equipment (U) modals: anchored at middle-right and middle-left respectively; layout preserved; site glass panel styling applied",
      "HUD offset respects the site header; resizes on viewport changes and cleans up on scene shutdown",
      "Cave scene polish: organic wall colliders, centered furnace with smelting loop, mining prompts and yield/XP tuned; Wayne Mineson dialogue and quest hooks",
      "Grave Forest scene: clustered trees with colliders, ambient fog/decor, Rowan Boneaxe dialogue and tutorial woodcutting; portal to Broken Dock",
      "Enemies table: expand a row to see loot ranges and luck bonuses; gold drop shows min–max and chance",
      "Portals show consistent proximity prompts and spawn you in sensible entry points per scene",
      "Refactor note: removed stale world shims; the World page now stays accurate as scenes evolve"
    ]
  },
  {
    date: "2025-10-17",
    version: "0.0.12",
    title: "Neon nights, bug stomps, and quest triage",
    highlights: [
  "Sunset the old database connection in favor of Neon; lighter, faster, deploy-friendly database wiring",
      "Players can now smack the new “Report Bug” button to capture a screenshot, add context, and send it straight to the team",
      "Admin dashboard gains a Bug Reports view with screenshots, reporter metadata, and a single-click complete flow",
      "Rebuilt the Grimsley quest flow (again) so acceptance, progress, and completion survive real traffic instead of imploding combat",
      "Combat snapshot and inventory sync polling now back off intelligently instead of DDOSing our own API during outages"
    ],
    notes: [
      "Database helper exports dropped the unused Neon fetch cache flag (the option is always on upstream, so the warning spam is gone)",
      "Bug report API stores descriptions, optional screenshots, and links to user/character IDs with resolvable statuses",
      "Play scene captures the current canvas, hydrates a modal, and posts to `/api/bug-report`; failed uploads show inline feedback",
      "Admin bug desk lists open tickets chronologically, previews screenshots inline, and revalidates the list after resolving",
      "Combat polling in Slime/Meadow scenes uses exponential backoff; client side wander tweens were removed so server snapshots stay authoritative",
      "Inventory sync now diffs payloads, filters zero-count stacks, and skips redundant POSTs to keep the DB calm",
      "Quest completion and loot drops generate IDs server-side to avoid duplicate-key 500s that previously broke combat rewards"
    ]
  },
  {
    date: "2025-10-16",
    version: "0.0.11",
    title: "Beta Prep: Admin overhaul, inventory grid, batch shop, BigInt prices",
    highlights: [
      "Admin polish: shared layout, Enter-to-save, rarity dropdown with centralized colors",
      "Items API hardened: BigInt buy/sell, validation + clear error messages",
      "Inventory overhaul: fixed-slot grid UI + split stack modal (partial moves)",
      "Shop upgrade: batch buy/sell in one transaction; gold tracked per character",
      "Zero-pruning: stacks at 0 are deleted server-side to keep DB clean",
  "Deployment ready: Postgres schema, Neon connection, Vercel config + envs"
    ],
    notes: [
      "Centralized rarity mapping and colors; consistent across admin and UI",
      "Admin items list shows proper empty and error states instead of disappearing",
      "Split-stack modal supports moving partial counts to storage; right-click to split",
      "Inventory sort/filter controls added (view-only for now)",
      "Shop uses bulk endpoints; client toasts and validations added",
      "Character.gold is the single source of truth for gold changes from shop",
  "DB schema migrated: ItemDef.buy/sell are numeric to prevent overflow",
      "APIs serialize BigInt safely when returning JSON",
  "Seed endpoint now sources items from Phaser ITEM_DEFS and derives buy/sell from value for consistency",
  "Serverless Postgres via Neon; removed legacy ORM runtime",
      "Added vercel.json and deployment docs; .env.example updated for Postgres",
      "General cleanup: removed any types in routes, corrected Next.js route params typing"
    ]
  },
  {
    date: "2025-10-16",
    version: "0.0.10",
    title: "New Zone: Slime Meadow + Portal UX Pass",
    highlights: [
      "Slime Meadow added: a brighter, multi-spawn, AFK-friendly extension of the Slime ecosystem",
      "Unified E-to-enter portals across zones with proximity prompts (no more portal clicking)",
      "Slime visuals and labels updated: Epic Slimes are purple, Big Slimes are larger; names show with level",
      "World page updated with Slime Meadow and concrete Slime Field/Meadow mob stats",
    ],
    notes: [
      "Removed stray Town portal from Slime Meadow; back portal now behaves like other zones",
      "Portals show a \"Press E to Enter\" prompt when you're close enough (tunable radius)",
      "Slime Field → Slime Meadow and return transitions preserve your scene state",
      "Minor polish: consistent mob name formatting and prompt placement on resize",
    ],
  },
  {
    date: "2025-10-15",
    version: "0.0.9",
    title: "Combat Awakens, Quests Begin, and Grimsley Lives",
    highlights: [
      "Real-time combat arrives in the Slime Field with basic attacks, health bars, and live snapshots",
      "Auto-battle toggle for effortless goo-farming and steady EXP",
      "Quest system foundation: accept, track, and complete tasks for rewards",
      "Grimsley now actually talks, guides, and silently judges your choices",
    ],
    notes: [
      "Join/leave combat seamlessly; the server keeps your phase sane",
      "Tutorial flow wired into quests—Grimsley points, you click, the world approves",
      "EXP and loot are tallied server-side; inventory stays in sync",
      "Under the hood: scenes extracted and network calls centralized for smoother updates",
    ],
  },
  {
    date: "2025-10-14",
    version: "0.0.8",
    title: "Chat Possession, Rainbow Whispers, and Shiny Things",
    highlights: [
      "Global chat added with a dedicated chat box and overhead messages",
      "Chat effects: :wave:, :shake:, :ripple:, :rainbow:, plus inline :red::green::blue::yellow::purple: coloring",
      "Gold and Premium now flaunt themselves in the HUD, Shop, Inventory, and Storage",
    ],
    notes: [
      "Press '/' to commune with the void (type), Enter to cast your words, then you're tossed back to reality",
      "Overhead messages ripple and wave one letter at a time—like your sanity",
      "Inline color tags paint words exactly as you demand, mortal",
      "We rate limit chat (3 msgs/5s), because demons despise spam",
    ],
  },
  {
    date: "2025-10-14",
    version: "0.0.7",
    title: "Town Shop, Sawmill, and Account Controls",
    highlights: [
      "Shop is now a Town interactable on the upper platform (not a HUD button)",
      "Sawmill crafting: Logs → Planks and Oak Logs → Oak Planks with offline fast-forward",
      "Delete Account flow (username + password + captcha) with full cascade delete",
      "Classes page polish: keyboard navigation and animated panels",
      "Tutorial NPC finally has a name: Grimsley",
    ],
    notes: [
      "Shop modal opens when you press E near the stall",
      "Sawmill awards crafting EXP per output and resumes after reload",
      "Storage and inventory reconciliation guard while queues run",
      "Minor UI smoothing on Cards and modals",
    ],
  },
  {
    date: "2025-10-10",
    version: "0.0.1",
    title: "Initial Backend & Auth",
    highlights: ["Account creation & login", "JWT session cookies", "Character creation basics"],
    notes: ["Added User + Character models", "Basic Town scene stub"],
  },
  {
    date: "2025-10-12",
    version: "0.0.2",
    title: "Persistence Foundations",
    highlights: ["Inventory persistence (Character ItemStacks)", "Scene lastSeen tracking"],
    notes: ["Fast periodic inventory saves", "SendBeacon on navigation/unload"],
  },
  {
    date: "2025-10-13",
    version: "0.0.3",
    title: "Crafting & AFK Queues",
    highlights: ["Furnace queue with offline fast-forward", "Workbench crafting queue", "Mining EXP progression"],
    notes: ["EXP award per output", "HUD exp bar contexts"],
  },
  {
    date: "2025-10-14",
    version: "0.0.4",
    title: "Shared Account Storage & Atomic Transfers",
    highlights: ["Account-wide storage (AccountItemStack)", "Atomic transfer endpoint eliminating duplication", "Full-stack drag & drop UI"],
    notes: ["Storage modal on upper Town platform", "Inventory reconciliation improvements"],
  },
  {
    date: "2025-10-14",
    version: "0.0.5",
    title: "Dashboard & AFK Tracking",
    highlights: ["Enhanced dashboard character cards", "Live AFK timer", "Skill level surfacing"],
    notes: ["Added mining/crafting/fishing/woodcutting levels display", "AFK duration derived from lastSeenAt"],
  }
  ,{
    date: "2025-10-14",
    version: "0.0.6",
    title: "Site-wide Flavor & Interactive Classes",
    highlights: [
      "Dark humor tone across About/Classes/News/World",
      "Interactive Classes Explorer component",
      "Centralized flavor constants module",
      "Dashboard AFK microcopy & character flavor",
      "Login/Signup playful error messaging"
    ],
    notes: [
      "Zone description flavor pass",
      "Patch Notes intro rewrite",
      "AFK phrase variants on character cards"
    ],
  }
];
