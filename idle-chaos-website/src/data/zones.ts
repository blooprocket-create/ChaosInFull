export type ZoneMobStats = {
  name: string;
  hp: number | null;
  damage: number | null;
  spawnRatePerMin: number | null; // spawns per minute
  maxConcurrent: number | null;
};

export type ZoneDefinition = {
  key: string;
  name: string;
  description: string;
  features: string[];
  mobs: ZoneMobStats[];
  resources: string[]; // nodes or gatherables
  connections: string[]; // zone keys reachable via portal
  // Optional expansions for richer world wiki
  enemyIds?: string[]; // ids from ENEMY_DEFS for this zone
  npcs?: string[]; // notable NPCs present
};

export const zones: ZoneDefinition[] = [
  {
    key: "town",
    name: "Town",
  description: "Central refuge: crafting, storage, tutorial guidance, mild existential onboarding.",
    features: ["Workbench", "Furnace", "Account Storage", "Tutorial NPC (name TBD)", "Portals to Cave & Slime Field (when unlocked)"],
    mobs: [],
    resources: [],
    connections: ["cave", "slime"],
    npcs: ["Blacksmith", "Quartermaster", "Tutorial Guide"],
  },
  {
    key: "cave",
    name: "Cave",
  description: "Ore-rich darkness. Echoes occasionally file complaints about ergonomics.",
    features: ["Passive mining (AFK)", "Copper Node", "Tin Node"],
    mobs: [],
    resources: ["Copper Ore", "Tin Ore"],
    connections: ["town"],
    enemyIds: ["rat", "zombie_rat", "ghost_rat"],
  },
  {
    key: "slime",
    name: "Slime Field",
  description: "Viscous clearing where low-tier monsters debate unionizing and still get farmed.",
    features: ["Intro combat area"],
    mobs: [
      { name: "Green Slime", hp: 30, damage: null, spawnRatePerMin: 50, maxConcurrent: 6 },
    ],
    resources: [],
    connections: ["town", "slime-meadow"],
    enemyIds: ["slime_common"],
  },
  {
    key: "slime-meadow",
    name: "Slime Meadow",
    description: "Brighter, rolling meadow of slimes. Multi-spawn, AFK-friendly pacing, and the occasional chonk or epic jelly.",
    features: ["Multi-spawn waves", "AFK combat friendly", "Portal back to Slime Field"],
    mobs: [
      { name: "Green Slime", hp: 30, damage: null, spawnRatePerMin: 50, maxConcurrent: 6 },
      { name: "Big Slime", hp: 60, damage: null, spawnRatePerMin: 25, maxConcurrent: 2 },
      { name: "Epic Slime", hp: 120, damage: null, spawnRatePerMin: 10, maxConcurrent: 1 },
    ],
    resources: [],
    connections: ["slime"],
    enemyIds: ["slime_common", "slime_epic"],
  },
];

export function getZone(key: string) { return zones.find(z => z.key === key); }