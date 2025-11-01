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
    description: "Central refuge with crafting, storage, and questing. Hub portals to Cave and Inner Field.",
    features: ["Workbench", "Furnace", "Account Storage", "Shop", "Quest Board"],
    mobs: [],
    resources: [],
    connections: ["cave", "inner-field"],
    npcs: ["Mayor Grimsley"],
  },
  {
    key: "cave",
    name: "Cave",
    description: "Ore-rich cave with a central furnace and nodes placed along the walls.",
    features: ["Furnace", "Mining (continuous)", "Ambient cave effects"],
    mobs: [],
    resources: ["Copper Ore", "Tin Ore"],
    connections: ["town"],
    enemyIds: [],
    npcs: ["Wayne Mineson"],
  },
  {
    key: "inner-field",
    name: "Inner Field",
    description: "Grassy combat area near town. Slimes roam; portals to Town and the Outer Field.",
    features: ["Intro combat", "Obstacles", "Ambient field effects"],
    mobs: [
      { name: "Common Slime", hp: 30, damage: null, spawnRatePerMin: 90, maxConcurrent: 6 },
      { name: "Epic Slime", hp: 120, damage: null, spawnRatePerMin: 13, maxConcurrent: 1 },
      { name: "Slime Boss", hp: 200, damage: null, spawnRatePerMin: 4, maxConcurrent: 1 },
    ],
    resources: [],
    connections: ["town", "outer-field"],
    enemyIds: ["slime_common", "slime_epic", "slime_boss"],
  },
  {
    key: "outer-field",
    name: "Outer Field",
    description: "Wider open field with rats and portals leading deeper into the wilds.",
    features: ["Rats and variants", "Obstacles", "Portals to Goblin Camp and Grave Forest"],
    mobs: [
      { name: "Rat", hp: 20, damage: null, spawnRatePerMin: 90, maxConcurrent: 6 },
      { name: "Zombie Rat", hp: 28, damage: null, spawnRatePerMin: 35, maxConcurrent: 3 },
      { name: "Ghost Rat", hp: 34, damage: null, spawnRatePerMin: 25, maxConcurrent: 2 },
    ],
    resources: [],
    connections: ["inner-field", "goblin-camp", "grave-forest"],
    enemyIds: ["rat", "zombie_rat", "ghost_rat"],
  },
  {
    key: "goblin-camp",
    name: "Goblin Camp",
    description: "A hostile encampment teeming with goblins. Expect tougher fights and denser obstacles.",
    features: ["Goblin variants", "Obstacles", "Portal toward Gloamway Bastion"],
    mobs: [
      { name: "Goblin", hp: null, damage: null, spawnRatePerMin: null, maxConcurrent: null },
      { name: "Goblin Girl", hp: null, damage: null, spawnRatePerMin: null, maxConcurrent: null },
      { name: "Epic Goblin", hp: null, damage: null, spawnRatePerMin: null, maxConcurrent: null },
      { name: "Goblin Boss", hp: null, damage: null, spawnRatePerMin: null, maxConcurrent: null },
    ],
    resources: [],
    connections: ["outer-field", "gloamway-bastion"],
    enemyIds: ["goblin_common", "goblin_girl", "goblin_epic", "goblin_boss"],
  },
  {
    key: "grave-forest",
    name: "Grave Forest",
    description: "A somber woodland with woodcutting nodes and bone-strewn paths. No combat here.",
    features: ["Woodcutting (trees)", "Ambient fog", "Portals to Outer Field and Broken Dock"],
    mobs: [],
    resources: ["Normal Log", "Oak Log"],
    connections: ["outer-field", "broken-dock"],
    enemyIds: [],
    npcs: ["Rowan Boneaxe"],
  },
  {
    key: "gloamway-bastion",
    name: "Gloamway Bastion",
    description: "Fortified goblin stronghold past the Camp. Expect elite patrols, tighter choke points, and the Chieftain's guards.",
    features: ["Elite goblins", "Choke points", "Harder patrol loops"],
    mobs: [],
    resources: [],
    connections: ["goblin-camp"],
    // Tougher goblin set lives here
    enemyIds: [
      "goblin_epic",
      "goblin_flamebinder",
      "goblin_ironhowl",
      "goblin_boss"
    ],
  },
  {
    key: "broken-dock",
    name: "Broken Dock",
    description: "A ruined shoreline off the Grave Forest. No active enemies; a quiet spot planned for future gathering routes.",
    features: ["Exploration", "Ambient shoreline"],
    mobs: [],
    resources: ["Driftwood (planned)", "Fishing (planned)"],
    connections: ["grave-forest"],
    enemyIds: [],
  },
];

export function getZone(key: string) { return zones.find(z => z.key === key); }