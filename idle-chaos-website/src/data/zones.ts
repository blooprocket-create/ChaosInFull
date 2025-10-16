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
  },
  {
    key: "cave",
    name: "Cave",
  description: "Ore-rich darkness. Echoes occasionally file complaints about ergonomics.",
    features: ["Passive mining (AFK)", "Copper Node", "Tin Node"],
    mobs: [],
    resources: ["Copper Ore", "Tin Ore"],
    connections: ["town"],
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
  },
];

export function getZone(key: string) { return zones.find(z => z.key === key); }