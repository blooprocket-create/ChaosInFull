export type PatchNote = {
  date: string; // ISO
  version: string; // semantic or incremental
  title: string;
  highlights: string[];
  notes?: string[];
};

export const patchNotes: PatchNote[] = [
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
      "Sunset the old Prisma connection in favor of Neon; lighter, faster, deploy-friendly database wiring",
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
      "Seed endpoint now sources items from src/data/items to keep prices consistent",
  "Serverless Postgres via Neon; remove Prisma runtime",
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
