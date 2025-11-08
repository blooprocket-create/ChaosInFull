// Fishing Mastery Tree Definitions (Phase 3)
// Provides node-based progression enhancing active fishing mechanics.
// Nodes grant additive integer ranks; bonuses are scaled when applied.

export interface FishingMasteryNode {
  id: string;
  name: string;
  description: string;
  tier: number; // Higher tier may require more level or prior nodes
  cost: number; // mastery points required to unlock
  requires?: string[]; // prerequisite node IDs
  bonuses: Partial<FishingMasteryBonuses>; // raw ranks added
}

export interface FishingMasteryBonuses {
  stability: number;       // Reduces pointer random drift (line wobble)
  control: number;         // Widens initial safe zone & slows shrink
  sensitivity: number;     // Shortens bite wait duration
  precision: number;       // Increases progress gain per successful reel tap
  baitEfficiency: number;  // Chance to preserve bait on successful catch
  rarityBoost: number;     // Slight weight bias toward higher rarity fish
  hotspotInsight: number;  // Extends hotspot lifetime / detection radius
}

// Base node set (can expand later; keep numeric progression gentle)
export const FISHING_MASTERY_NODES: FishingMasteryNode[] = [
  {
    id: 'root_stability_1',
    name: 'Balanced Grip I',
    description: 'Reduce random tension drift slightly.',
    tier: 1,
    cost: 1,
    bonuses: { stability: 1 }
  },
  {
    id: 'root_control_1',
    name: 'Measured Cast I',
    description: 'Broaden initial safe zone a little.',
    tier: 1,
    cost: 1,
    bonuses: { control: 1 }
  },
  {
    id: 'root_sensitivity_1',
    name: 'Sharp Sense I',
    description: 'Reduce average bite wait time.',
    tier: 1,
    cost: 1,
    bonuses: { sensitivity: 1 }
  },
  {
    id: 'root_precision_1',
    name: 'Efficient Reels I',
    description: 'Increase progress per successful reel.',
    tier: 1,
    cost: 1,
    bonuses: { precision: 1 }
  },
  // Tier 2 (requires any tier 1)
  {
    id: 'stability_2',
    name: 'Balanced Grip II',
    description: 'Further reduce tension drift.',
    tier: 2,
    cost: 2,
    requires: ['root_stability_1'],
    bonuses: { stability: 1 }
  },
  {
    id: 'control_2',
    name: 'Measured Cast II',
    description: 'Broaden initial safe zone further.',
    tier: 2,
    cost: 2,
    requires: ['root_control_1'],
    bonuses: { control: 1 }
  },
  {
    id: 'sensitivity_2',
    name: 'Sharp Sense II',
    description: 'Shorten bite wait more.',
    tier: 2,
    cost: 2,
    requires: ['root_sensitivity_1'],
    bonuses: { sensitivity: 1 }
  },
  {
    id: 'precision_2',
    name: 'Efficient Reels II',
    description: 'More progress per successful reel.',
    tier: 2,
    cost: 2,
    requires: ['root_precision_1'],
    bonuses: { precision: 1 }
  },
  // Utility / specialty
  {
    id: 'bait_efficiency_1',
    name: 'Frugal Bait I',
    description: 'Small chance to preserve bait on catch.',
    tier: 2,
    cost: 2,
    bonuses: { baitEfficiency: 1 }
  },
  {
    id: 'rarity_boost_1',
    name: 'Selective Hook I',
    description: 'Slight weight bias toward rarer fish.',
    tier: 2,
    cost: 2,
    bonuses: { rarityBoost: 1 }
  },
  // Tier 3 advanced nodes
  {
    id: 'stability_3',
    name: 'Balanced Grip III',
    description: 'Notably reduce tension drift.',
    tier: 3,
    cost: 3,
    requires: ['stability_2'],
    bonuses: { stability: 2 }
  },
  {
    id: 'precision_3',
    name: 'Efficient Reels III',
    description: 'Further increase progress per reel.',
    tier: 3,
    cost: 3,
    requires: ['precision_2'],
    bonuses: { precision: 2 }
  },
  {
    id: 'hotspot_insight_1',
    name: 'Hotspot Insight I',
    description: 'Hotspots last a little longer.',
    tier: 3,
    cost: 3,
    bonuses: { hotspotInsight: 1 }
  },
];

export const fishingMasteryById: Record<string, FishingMasteryNode> = Object.fromEntries(
  FISHING_MASTERY_NODES.map(n => [n.id, n])
);

export interface FishingMasteryStateSummary extends FishingMasteryBonuses {
  takenNodes: string[];
  pointsSpent: number;
}

export function computeFishingMasteryBonuses(char: any): FishingMasteryStateSummary {
  const fishing = (char && (char.fishing = char.fishing || { level: 1, exp: 0, expToLevel: 100 })) || {};
  const taken: string[] = Array.isArray(fishing.masteryNodes) ? fishing.masteryNodes : [];
  const acc: FishingMasteryBonuses = {
    stability: 0,
    control: 0,
    sensitivity: 0,
    precision: 0,
    baitEfficiency: 0,
    rarityBoost: 0,
    hotspotInsight: 0,
  };
  for (const id of taken) {
    const node = fishingMasteryById[id];
    if (!node) continue;
    for (const [key, val] of Object.entries(node.bonuses)) {
      (acc as any)[key] = ((acc as any)[key] || 0) + (val || 0);
    }
  }
  const pointsSpent = taken.reduce((sum, id) => sum + (fishingMasteryById[id]?.cost || 0), 0);
  return { ...acc, takenNodes: taken.slice(), pointsSpent };
}

export function ensureFishingMastery(char: any) {
  if (!char) return;
  char.fishing = char.fishing || { level: 1, exp: 0, expToLevel: 100 };
  if (!Array.isArray(char.fishing.masteryNodes)) char.fishing.masteryNodes = [];
  if (typeof char.fishing.masteryPoints !== 'number') char.fishing.masteryPoints = 0;
}

// Simple leveling rule (hook XP already tracked): one mastery point every 5 fishing levels.
export function grantMasteryPointsIfNeeded(char: any) {
  try {
    ensureFishingMastery(char);
    const lvl = char.fishing.level || 1;
    const shouldHave = Math.floor(lvl / 5);
    if ((char.fishing.masteryPoints || 0) < shouldHave) {
      char.fishing.masteryPoints = shouldHave;
    }
  } catch {}
}

export function canUnlockMasteryNode(char: any, nodeId: string): boolean {
  ensureFishingMastery(char);
  const node = fishingMasteryById[nodeId];
  if (!node) return false;
  const fishing = char.fishing;
  if (fishing.masteryNodes.includes(nodeId)) return false; // already taken
  if ((fishing.masteryPoints || 0) < node.cost) return false;
  if (node.requires && node.requires.some(req => !fishing.masteryNodes.includes(req))) return false;
  return true;
}

export function unlockMasteryNode(char: any, nodeId: string): boolean {
  if (!canUnlockMasteryNode(char, nodeId)) return false;
  const node = fishingMasteryById[nodeId];
  char.fishing.masteryNodes.push(nodeId);
  char.fishing.masteryPoints -= node.cost;
  return true;
}

// Attach globals for Phaser scenes (BrokenDock, etc.) which access mastery functions dynamically.
// This avoids import friction between TS/JS mixed modules in the current build config.
try {
  if (typeof window !== 'undefined') {
    const w: any = window as any;
    w.computeFishingMasteryBonuses = computeFishingMasteryBonuses;
    w.ensureFishingMastery = ensureFishingMastery;
    w.grantMasteryPointsIfNeeded = grantMasteryPointsIfNeeded;
    w.canUnlockMasteryNode = canUnlockMasteryNode;
    w.unlockMasteryNode = unlockMasteryNode;
    w.FISHING_MASTERY_NODES = FISHING_MASTERY_NODES;
    w.fishingMasteryById = fishingMasteryById;
    w.__modules = w.__modules || {};
    w.__modules['fishingMastery'] = {
      computeFishingMasteryBonuses,
      ensureFishingMastery,
      grantMasteryPointsIfNeeded,
      canUnlockMasteryNode,
      unlockMasteryNode,
      FISHING_MASTERY_NODES,
      fishingMasteryById
    };
  }
} catch {}
