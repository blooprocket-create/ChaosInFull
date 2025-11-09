// Dynamic world data: merges WORLD_SCENES from game with zone metadata
// This ensures the website automatically reflects all game scenes

import { WORLD_SCENES } from "@/src/game/worldMeta";

export type ZoneMetadata = {
  features?: string[];
  resources?: string[];
  connections?: string[];
  enemyIds?: string[];
  npcs?: string[];
};

// Zone-specific metadata that can't be inferred from scenes
// When you add a new scene to the game, it will appear automatically;
// add an entry here only if you need custom features/connections/enemies
const ZONE_METADATA: Record<string, ZoneMetadata> = {
  Town: {
    features: ["Workbench", "Furnace", "Account Storage", "Shop", "Quest Board"],
    connections: ["Cave", "InnerField"],
    npcs: ["Mayor Grimsley"],
  },
  Cave: {
    features: ["Furnace", "Mining (continuous)", "Ambient cave effects"],
    connections: ["Town"],
    // Resources loaded dynamically from ORE_DEFS in WorldExplorer
    npcs: ["Wayne Mineson"],
  },
  InnerField: {
    features: ["Intro combat", "Obstacles", "Ambient field effects"],
    connections: ["Town", "OuterField"],
    enemyIds: ["slime_common", "slime_uncommon", "slime_rare", "slime_epic", "slime_legendary", "slime_boss"],
  },
  OuterField: {
    features: ["Rats and variants", "Obstacles", "Portals to Goblin Camp and Grave Forest"],
    connections: ["InnerField", "GoblinCamp", "GraveForest"],
    enemyIds: ["rat", "rat_uncommon", "rat_rare", "rat_epic", "rat_legendary", "zombie_rat", "ghost_rat"],
  },
  GoblinCamp: {
    features: ["Goblin variants", "Obstacles", "Portal toward Gloamway Bastion"],
    connections: ["OuterField", "GloamwayBastion"],
    enemyIds: ["goblin_common", "goblin_uncommon", "goblin_rare", "goblin_girl", "goblin_epic", "goblin_legendary", "goblin_boss"],
  },
  GraveForest: {
    features: ["Woodcutting (trees)", "Ambient fog", "Portals to Outer Field and Broken Dock"],
    connections: ["OuterField", "BrokenDock"],
    // Resources loaded dynamically from LOG_DEFS in WorldExplorer
    npcs: ["Rowan Boneaxe"],
  },
  GloamwayBastion: {
    features: ["Elite goblins", "Choke points", "Harder patrol loops"],
    connections: ["GoblinCamp", "GloamwaySwamp", "FlameRoad"],
    enemyIds: ["goblin_epic", "goblin_legendary", "goblin_flamebinder", "goblin_ironhowl", "goblin_boss"],
  },
  GloamwaySwamp: {
    features: ["Undead and rats", "Poison threats"],
    connections: ["GloamwayBastion"],
    enemyIds: ["rat_uncommon", "rat_rare", "rat_epic", "rat_legendary", "rat_boss"],
  },
  FlameRoad: {
    features: ["Fire variants", "Mobility checks"],
    connections: ["GloamwayBastion"],
    enemyIds: ["goblin_flamebinder"],
  },
  BrokenDock: {
    features: ["Exploration", "Ambient shoreline"],
    connections: ["GraveForest"],
    resources: ["Driftwood (planned)", "Fishing (planned)"],
  },
};

export type WorldZone = {
  key: string;
  name: string;
  description: string;
  features: string[];
  resources: string[];
  connections: string[];
  enemyIds: string[];
  npcs: string[];
};

// Build complete zone list from game scenes + metadata
export function getWorldZones(): WorldZone[] {
  return WORLD_SCENES.map((scene) => {
    const meta = ZONE_METADATA[scene.key] || {};
    return {
      key: scene.key,
      name: scene.label,
      description: scene.description || "",
      features: meta.features || [],
      resources: meta.resources || [],
      connections: meta.connections || [],
      enemyIds: meta.enemyIds || [],
      npcs: meta.npcs || [],
    };
  });
}

export function getZone(key: string): WorldZone | undefined {
  return getWorldZones().find((z) => z.key === key);
}

// Convert scene key to kebab-case for URLs (e.g., "InnerField" -> "inner-field")
export function sceneKeyToSlug(key: string): string {
  return key
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

// Reverse: slug to scene key
export function slugToSceneKey(slug: string): string {
  return slug
    .split("-")
    .map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}
