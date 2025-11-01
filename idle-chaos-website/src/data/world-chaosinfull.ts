// Dynamic-ish world data adapter reflecting the authoritative chaosinfull runtime.
// This mirrors the actual scene graph, NPCs, features, and enemies declared in
// chaosinfull/src/scenes and chaosinfull/src/data/enemies.js.

export type ZoneMobStats = {
  name: string;
  hp: number | null;
  damage: number | null;
  spawnRatePerMin: number | null; // spawns per minute
  maxConcurrent: number | null;
};

export type ZoneNpc = { id: string; name: string; role?: string };

export type ZoneDefinition = {
  key: string; // scene key in Phaser
  name: string;
  description: string;
  features: string[];
  mobs: ZoneMobStats[]; // legacy lightweight table (kept for UI fallbacks)
  resources: string[]; // nodes or gatherables
  connections: string[]; // scene keys reachable via portal
  npcs?: ZoneNpc[];
  enemyIds?: string[]; // references into ENEMY_DEFS for richer data
};

// Notes:
// - We intentionally keep enemyIds aligned with chaosinfull/src/data/enemies.js ids
// - Connections reflect portals observed in each scene file

export const zones: ZoneDefinition[] = [
  {
    key: "Town",
    name: "Town",
    description:
      "Central refuge: Mayor Grimsley, shop/storage, workbench and furnace. Portals to Cave and Inner Field.",
    features: [
      "Workbench",
      "Furnace",
      "Account Storage",
      "Shop (buy/sell by item value)",
      "Safe-zone regen",
    ],
    mobs: [],
    resources: [],
    connections: ["Cave", "InnerField"],
    npcs: [{ id: "mayor_grimsley", name: "Mayor Grimsley", role: "Quest giver" }],
  },
  {
    key: "Cave",
    name: "Cave",
    description:
      "Ore-rich darkness for early mining progression; right-side portal back to Town.",
    features: ["Mining nodes", "Furnace (scene center)", "Safe-zone regen"],
    mobs: [],
    resources: ["Tin Ore", "Copper Ore"],
    connections: ["Town"],
    npcs: [{ id: "wayne_mineson", name: "Wayne Mineson", role: "Mining tutor" }],
  },
  {
    key: "InnerField",
    name: "Inner Field",
    description:
      "Intro combat area populated by slimes; portal from Town and onward to Outer Field.",
    features: ["Intro combat", "Obstacles"],
    mobs: [],
    resources: [],
    connections: ["Town", "OuterField"],
    enemyIds: ["slime_common", "slime_epic", "slime_boss"],
  },
  {
    key: "OuterField",
    name: "Outer Field",
    description:
      "Rats of varying types roam here; portals to Inner Field, Goblin Camp, and Grave Forest.",
    features: ["Wider combat area", "Obstacles"],
    mobs: [],
    resources: [],
    connections: ["InnerField", "GoblinCamp", "GraveForest"],
    enemyIds: ["rat", "zombie_rat", "ghost_rat"],
  },
  {
    key: "GoblinCamp",
    name: "Goblin Camp",
    description:
      "Goblin territory; connects back to Outer Field and forward to Gloamway Bastion.",
    features: ["Goblin waves", "Decorative flora", "Obstacles"],
    mobs: [],
    resources: [],
    connections: ["OuterField", "GloamwayBastion"],
    enemyIds: ["goblin_common", "goblin_girl", "goblin_epic", "goblin_boss"],
  },
  {
    key: "GloamwayBastion",
    name: "Gloamway Bastion",
    description:
      "Advanced goblins and Mother Lumen’s quest chain reside here; portal back to Goblin Camp.",
    features: ["Safe-zone areas", "Quest chain (Mother Lumen)"],
    mobs: [],
    resources: [],
    connections: ["GoblinCamp"],
    npcs: [{ id: "mother_lumen", name: "Mother Lumen", role: "Quest chain / class upgrades" }],
    enemyIds: ["goblin_slicer", "goblin_flamebinder", "goblin_ironhowl"],
  },
  {
    key: "GraveForest",
    name: "Grave Forest",
    description:
      "Woodcutting zone with Rowan Boneaxe; portals to Outer Field and the Broken Dock.",
    features: ["Woodcutting nodes", "Fog overlay", "Safe-zone regen"],
    mobs: [],
    resources: ["Timber"],
    connections: ["OuterField", "BrokenDock"],
    npcs: [{ id: "rowan_boneaxe", name: "Rowan Boneaxe", role: "Woodcutting quests" }],
  },
  // Placeholder for upcoming destination referenced by GraveForest portal
  {
    key: "BrokenDock",
    name: "Broken Dock",
    description: "A dilapidated dock shrouded in mist. (Placeholder zone)",
    features: [],
    mobs: [],
    resources: [],
    connections: ["GraveForest"],
  },
];

export function getZone(key: string) {
  return zones.find((z) => z.key === key);
}
