export type PatchNote = {
  date: string; // ISO
  version: string; // semantic or incremental
  title: string;
  highlights: string[];
  notes?: string[];
};

export const patchNotes: PatchNote[] = [
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
