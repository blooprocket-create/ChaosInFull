# ChaosInFull / Veil Keeper – Current Game Overview

This document summarizes the live Phaser game as it exists today under `idle-chaos-website/src/game` and the public assets in `public/phaser-game`. It focuses on scene flow, data‑driven content, gameplay loops, UI/HUD, persistence, and notable legacy/deprecated areas.

---
## 1. High-Level Concept
A top‑down action RPG / idle hybrid (“Veil Keeper”) embedded inside a Next.js site. Players create a character, explore world scenes, fight enemies, gather resources, fish, progress quests, and allocate talents. The game client is a Phaser singleton reused across React mounts. Data (items, quests, classes, enemies) is defined in JS modules and exposed globally for legacy scene code.

---
## 2. Scene & World Structure
Scenes are dynamically imported in `createPhaserGame.ts` and enumerated in `worldMeta.ts` for website discovery.

System / Flow Scenes:
- Boot – Preloads assets & installs diagnostics.
- Tutorial – Onboarding mechanics.
- Login – Auth connect point (legacy; website handles modern auth UI but scene still exists for fallback).
- CharacterSelect – Character choice/start.
- Start – Entry gateway / transitional staging.

World (Gameplay) Scenes (progressive difficulty/pacing):
- Town – Hub: storage UI, portals, workbench/furnace UIs (crafting largely deprecated backend). Quest givers (Mayor Grimsley, etc.).
- Cave – Early mining + initial combat.
- InnerField / OuterField – Open leveling zones (slimes baseline → density/range increases).
- GoblinCamp – Focused enemy cluster; coordinated goblin ranks.
- GloamwayBastion – Defensive layouts; vision pressure and attrition pacing.
- GloamwaySwamp – Undead + mixed vermin; status pressure.
- FlameRoad – Fire‑aspected foes; mobility & burst checks.
- GraveForest – DoT threats / pathing discipline; advanced quest chain step.
- BrokenDock – Edge pocket, environmental hazards; includes staged dock repair contribution quests.

Additional imported (future expansion hooks): GloamwaySwamp, FlameRoad included in dynamic import list; some scenes (e.g., swamps/roads) extend mid‑game progression.

Scene Lifecycle:
- A single Phaser `Game` instance is reused (`window.GAME` with refcount). React mounts call `createPhaserGame()` passing parent DOM node and optional character metadata; unmounts call `releasePhaserGame()`.

---
## 3. Data-Driven Content
All definitions are loaded then published to `window` for legacy JS scenes.

### Classes (`data/classes.js`)
Tiered progression:
- Tier 0: `beginner` (neutral starter; balanced fractional per‑level gains).
- Tier 1: `horror`, `occultist`, `stalker` – Distinct stat focus (STR collision / INT hex / AGI crit mobility).
- Tier 2: `ravager`, `hexweaver`, `nightblade`, `sanguine`, `astral_scribe`, `shade_dancer` – Unlocks gated by required base class; higher per‑level stat scaling.

Stats: `base` immediate allocation; `perLevel` fractional growth aggregated with race modifiers via level‑up routine.

### Enemies (`data/enemies.js`)
Families with rarity tiers: slimes, goblins, rats, skeletons, demons. Each entry includes:
- `dynamicStats` flag (runtime scaling + baseline numbers).
- Combat params: `level`, `maxhp`, `moveSpeed`, `attackRange`, `attackCooldown`, `damage[min,max]`.
- Rewards: `exp`, item `drops[]` with baseChance + luckBonus, structured `gold` bag (range/chance).
- Boss entries (e.g., `slime_boss`, `goblin_boss`, `the_lurker`) with elevated stats and multi‑item drop tables.
Pattern: Rarity increases HP/damage, lowers cooldown, improves drop chance and gold range.

### Quests (`data/quests.js`)
Refactored system with explicit objective records:
- Objective types: `travel`, `talk`, `equip`, `mine`, `smelt`, `craft`, `kill`, `chop`, `learn_talent`, `contribute_gold`, `contribute_item`.
- Progress stored solely in `character.activeQuests[].progress[]` (each has `current/required`).
- Manual completion: player must turn in at `handInNpc` (no auto completion).
- Tutorial chain: mining intro → smelt → craft → equip → talents → early combat → meet Rowan → woodcutting.
- Mother Lumen chain (Bastion): multi‑stage culls culminating in goblin boss request.
- Broken Dock staged restoration (4 contribution quests combining gold + materials leading to reward item `sea_rod`).
Helper exports: lifecycle functions (`startQuest`, `updateQuestProgress`, `checkQuestCompletion`, `completeQuest`) plus `getQuestObjectiveState`.

### Items (partial – `data/items.js`)
Extensive definitions covering:
- Weapons / Armor (stat bonuses, damage ranges, rarity, potential special fields like `range` or class synergy).
- Tools: pickaxe, hatchet, fishing rods (with `fishingBonus` / `fishingStats` controlling minigame parameters).
- Resources: ores, logs, essences.
- Potions: HP/mana (flat or percent), rarity scaling, `usable` flags, optional buff sub‑objects.
- Baits & Fish: Items drive fishing eligibility and catch rewards.
Inventory representation: 50 slot array (`null | { id, name, qty }`). Stackable vs non‑stackable per item definition.

### Fishing (Controller)
`tension` minigame states: `idle → waiting → bite → tension → resolve → idle`.
Mechanics:
- Casting picks fish candidate (weighted by difficulty, rarity, bait, rod rarity, mastery, time of day, hotspot tag).
- Wait duration influenced by rod sensitivity & mastery.
- Tension phase: maintain pointer inside moving zone (width influenced by difficulty, rod control, mastery). Progress accrues faster near center; perfect segments tracked for XP multiplier.
- Failure via line tension max or missed bite window.
- XP formula blends difficulty * rarity multiplier * performance * (precision mastery + gear skill).
- Bait consumption chance reduced by mastery `baitEfficiency`.
Telemetry events: `cast`, `bite`, `hook`, `tension_tick`, `catch`, `fail`, distance abort, with rod + mastery snapshots.
HUD overlay: dynamic zone (blue gradient), perfect band, progress bar, strain (line tension) bar, focus pulses.

---
## 4. Core Systems & UI
### Shared UI (`scenes/shared/ui.js`)
Provides DOM modals & HUD overlays for inventory, equipment, stats, quest log, settings, workbench, furnace, storage. Exposes a global `window.__shared_ui` bundle of helpers:
- Inventory management: slot init, add/remove, tooltips, drag rearrange, double‑click use/equip.
- Equipment grid (3×4 layout with dedicated mining/woodcutting/fishing slots).
- Quest tracker + NPC quest indicators (❓ available, ❗ hand‑in / completion) updated each scene tick.
- Buffs panel integrated into global skill bar showing active skill/buff states (stealth, shields, auras).
- Auto‑use potion system governed by saved settings (HP/Mana thresholds).
- Background music management (play/stop/set volume, fallback keys).
- Settings modal with persisted `localStorage` values (`chaosinfull_settings_v1`): music/sfx volume, always run, attack range indicator, auto‑use thresholds.
- Attack range indicator dynamic circle following player.
- Tooltips: Items, stats, skills (with ETA estimation for next skill level).

### Key Bindings (`scenes/shared/keys.js`)
Central attachment: WASD movement, E interact, I inventory, U equipment, X stats, Q quest log, T talents, Shift run toggle. Handlers toggle modals, auto cleanup on scene shutdown.

### Persistence Bridge (New Integration)
Legacy scenes still call `_persistCharacter` (writes localStorage) and inventory/storage update helpers. A new client bridge (added earlier in session) wraps server APIs for character state, inventory, and account storage. LocalStorage fallback maintained for non‑breaking migration; background one‑time migration of slot arrays to account item stack map.

### Quest Progress Events
Scene/UI wrappers dispatch `questProgressChanged` and detailed variant events; React `QuestPanel` polls registry counter (`questDirtyCount`) for fast sync.

### Buff & Talent Integration
Talent definitions (separate file) processed via `ensureCharTalents`, `processTalentAllocation`. Buff items apply temporary stat bonuses with expiries; skill bar collects ephemeral combat state objects.

---
## 5. Controls & Player Feedback
- Movement: WASD (Shift modifies run state; optional always‑run from settings).
- Interaction: E (resource nodes, workbench, furnace, portals, NPC dialogue triggers). 
- Combat: Click or ability triggers (talent skills attached in separate systems; auto combat temporarily removed from main import). Attack range indicator optional.
- Inventory & Equipment: UI modals with drag‑drop reordering; double‑click to use/equip; tooltips display stats and rarity tint.
- Potions & Buffs: Auto‑use thresholds plus manual activation; buff HUD tile with ETA.
- Music & Audio: Background track controlled via settings; volume persisted.
- Fishing: HUD mini‑game overlay; textual status messaging + toast feedback on catch/fail.

---
## 6. Progression Loops
1. Tutorial chain seeds mining → smelting → crafting → equipping → talents → combat → woodcutting.
2. Resource Gathering (Mine / Chop / Fish) feeds crafting + contribution quests.
3. Combat → XP → level → stat growth (race + class fractional increments aggregated at level‑up) → talent allocation gating higher‑tier play.
4. Quests supply directed goals, unlocks (e.g., class expectation for `mother_lumen_request`), and injection of specialized rewards.
5. Fishing mastery + rod progression modifies mechanical difficulty & yield.
6. Dock restoration staged investment culminating in advanced rod reward `sea_rod`.

---
## 7. Persistence & Data Flow
- Global definitions published to `window` early (items, recipes, races, classes, enemies, quests, plot) for legacy JS scenes referencing them directly.
- Character data mutated in memory (`scene.char`) then persisted via bridge; quest updates trigger immediate persistence.
- Inventory: 50 slots array; server sync merges slot stacks into item map; localStorage maintained for backward compatibility until flag removal.
- Account storage: server‑backed item map (migrated from legacy blob); Town UI still reflects slot grid abstraction for continuity.

---
## 8. Assets Overview (`public/phaser-game`)
Key folders:
- `assets/` – Item icons, character sprites (`dude/`), NPC folders (`Grimsley/`, `Mother/`, `Rowan/`), talent icons per class, skills icons, trees/environment, furnace & nodes sprite sheet.
- `TiledScenes/` – Scene tilemaps (e.g., `Cave.json`) plus tilesets.
- `sound/` – Music/SFX referenced by Boot/loaders and background music helper.
- Root images: `town_bg.png`, `cave_bg.png`, portal art (`Dimensional_Portal.png`), environment props (clouds, ore icons `copper.png`, etc.).

Loader config in `createPhaserGame.ts`: `baseURL: '/phaser-game/'` so asset requests resolve relative to that path.

---
## 9. UI/UX Patterns
- Dark glass + accent borders (rusted red) consistent with site login aesthetic for modals.
- Scrollbars themed and rarity‑responsive (inventory hover tints scrollbar thumb to item rarity color).
- Quest indicators (❓ / ❗) hover above NPC sprites with supplemental bubble naming active/available quest.
- Debug panel in legacy `phaser/main.js` shows physics gravity + current scene + player velocity for development.

---
## 10. Removed / Legacy / Deprecated Areas
- Crafting Queue: Backend endpoints removed (returns 410 Gone). Workbench/furnace UI remains for future refactor (currently front‑end only; smelt/craft objectives still exist in tutorial chain but server no longer manages a queue table).
- AutoCombat: Temporarily removed side‑effect import in `phaser/main.js` (planned reassessment).
- LocalStorage Persistence: Transitional—still written for safety; scheduled for eventual removal once telemetry confirms migrations stable.

---
## 11. Extension Points & Next Steps
Potential near-term improvements:
- Server‑side quest persistence endpoints (table ensure already present – `CharacterQuest`).
- Telemetry enrichment: per-zone combat performance, quest acceptance funnel.
- Feature flag to phase out localStorage writes post migration, with rollback toggle.
- Formal crafting revamp (replace legacy workbench/furnace UI with server recipes & action resolution events).
- Combat ability system re‑enable with typed definitions + cooldown telemetry.
- Balance pass: enemy stat progression vs expected player stat/talent curve (particularly demon & late slime variants).

---
## 12. Key Global Objects
Published to `window`:
- `ITEM_DEFS`, `RECIPE_DEFS`, `RACE_DEFS`, `CLASS_DEFS`, `ENEMY_DEFS`, `QUEST_DEFS`, `PLOT_DEFS`.
- Quest functions: `getQuestById`, `startQuest`, `updateQuestProgress`, `checkQuestCompletion`, `completeQuest`, `getQuestObjectiveState`.
- Shared UI namespace `__shared_ui` (inventory/equipment/talents/music/settings/quest tracker helpers).
- Phaser lifecycle: `GAME`, `__GAME_CREATING__`, `__GAME_REFCOUNT__`.

---
## 13. Core Gameplay Edge Cases & Safeguards
- Quest progress validation prevents silent failures (objectives matched by type + target; kill objectives allow prefix match for variant IDs).
- Fishing HUD auto-aborts if player moves > `abortDistance` from start position.
- Potion auto-use rate limited (1500ms) and selects smallest beneficial potion to reduce waste.
- Inventory double-click prioritizes consumable use; falls back to equip only when item is not usable.
- Settings application handles absence of Phaser sound gracefully; concurrency guarded by `_bgMusicCreating` flags.
- Attack range indicator cleans up on scene shutdown.

---
## 14. Glossary (Quick Reference)
- Slot Array: 50-element inventory representation (`null | {id,name,qty}`).
- Mastery (Fishing): Derived stats (stability, control, sensitivity, precision, baitEfficiency, rarityBoost) affecting tension mechanics.
- Perfect Segment: Tension pointer within center mint band; boosts XP performance multiplier.
- Quest Indicator: NPC overlay showing availability (`❓`) or hand‑in/completion (`❗`).
- Talent Tabs: Ordered sets of class talents gating passive/active skills (see `talents.js`).

---
## 15. Current Known Gaps
- No persistence of buff state or temporary combat effects server‑side (pure client ephemeral).
- Combat ability cooldown/balance telemetry limited (fishing has full coverage; combat gaps remain).
- Furnace/workbench interactions not backed by server logic; risk of desync if players expect persistence.
- Resource nodes (mining/woodcutting) server authority not enforced (client-driven increments).

---
## 16. Summary
The game presently operates as a rich client with server-backed character/inventory/storage and a refactored quest pipeline, while retaining legacy localStorage bridges for stability. Systems emphasize data-driven extensibility (classes, enemies, quests) and a layered UI toolkit offering modular overlays. Fishing stands out as a modernized, telemetry-rich subsystem. Crafting backend removal marks a transition point toward leaner, persistent mechanics still to be formalized.

---
*Document generated to reflect repository state at time of analysis.*
