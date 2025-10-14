export type PatchNote = {
  date: string; // ISO
  version: string; // semantic or incremental
  title: string;
  highlights: string[];
  notes?: string[];
};

export const patchNotes: PatchNote[] = [
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
