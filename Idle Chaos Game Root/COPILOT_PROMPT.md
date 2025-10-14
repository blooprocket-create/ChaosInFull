Chaos In Full - Developer Prompt

Tone and Theme
- Dark fantasy, horror with deadpan humor. Creepy but playful.
- Visual palette: deep blacks, muted purples, crimson highlights; glowing UI accents.

Game Direction
- 2D browser-playable platformer idle RPG inspired by MapleStory, IdleOn, and RuneScape.
- Multiplayer but non-hostile by default; later PvP zones.
- Zone-based progression (town → mining cave → Zone 1 slime field → ...).

Must-Haves (MVP)
1) Class system
   - Base: Beginner
   - Branches: Warrior (Horror twist), Mage (Occultist), Rogue (Stalker/Assassin)
   - Evolution tree with branches per class, active skills triggered via hotkeys 1..0.
2) Playable town zone
   - Two portals: Cave (mining), Zone1 (slime field); return portals back to town.
3) Tutorial NPC with popup dialogue guide.
4) Town stations: Workbench, Anvil, Furnace, Storage Box, Task Board, Tutorial NPC, vendors.
5) Combat
   - Click to attack: character auto-moves into range then attacks.
   - Active skills on keybind slots; cooldowns and mana costs.
6) Talent tree
   - Earn points by leveling; passive and active unlocks.
7) Website
   - Account creation, login, stats display.

Technical Targets
- Website: Next.js (App Router) + Tailwind + Prisma; auth via JWT cookies.
- Game: Start web-first. Favor engines/libraries that can export to WebGL/Canvas and desktop/mobile later (Phaser 3/4, Godot 4 HTML5 export, or Unity WebGL if licensing OK). Prefer Phaser for fastest web prototyping.
- Realtime: Start with authoritative server optional; MVP can simulate single-player with eventual sync, then upgrade to proper server.

Data Model Seed (Website/Backend)
- User { id, email, username, passwordHash, createdAt }
- PlayerStat { userId, level, class, exp, gold, hp, mp, str, agi, int, luk }

Gameplay Contracts
- Movement: A/D to move, Space to jump. Click to attack; if out of range, path short move.
- Skills: JSON config defining id, name, minRange, maxRange, mpCost, cooldownMs, damage formula.
- Monsters: JSON config with hp, defense, damage, exp, drops per zone.
- Zones: JSON tilemaps with spawn points and portals.

Edge Cases to Consider
- Input buffering while moving into range.
- Cooldown and mana validation on server.
- AFK/idle loop ticks when window hidden.
- Anti-cheat basics: rate limiting skill usage, server-side validation hooks.

Coding Guidelines
- Keep systems data-driven (JSON configs for skills, classes, monsters, zones).
- Small pure functions for formulas; unit tests where possible.
- Decouple rendering (engine) from core game logic where feasible.

Stretch Goals
- Cosmetics, guilds, seasonal events, leaderboard, PvP arenas later.
