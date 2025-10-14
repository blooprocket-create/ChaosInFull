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
    description: "Central refuge: crafting, storage, tutorial guidance.",
    features: ["Workbench", "Furnace", "Account Storage", "Tutorial NPC (name TBD)", "Portals to Cave & Slime Field (when unlocked)"],
    mobs: [],
    resources: [],
    connections: ["cave", "slime"],
  },
  {
    key: "cave",
    name: "Cave",
    description: "Ore-rich darkness. Echoes carry more than sound.",
    features: ["Passive mining (AFK)", "Copper Node", "Tin Node"],
    mobs: [],
    resources: ["Copper Ore", "Tin Ore"],
    connections: ["town"],
  },
  {
    key: "slime",
    name: "Slime Field",
    description: "Viscous clearing of low-tier monsters.",
    features: ["Intro combat area"],
    mobs: [{ name: "Green Slime", hp: null, damage: null, spawnRatePerMin: null, maxConcurrent: null }],
    resources: [],
    connections: ["town"],
  },
];

export function getZone(key: string) { return zones.find(z => z.key === key); }