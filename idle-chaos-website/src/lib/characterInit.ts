export type BaseStats = { str: number; int: number; agi: number; luk: number };

// Race -> base stats mapping aligned with src/game/phaser/data/races.js
// Keep this in sync if race definitions change.
const RACE_BASE: Record<string, BaseStats> = {
  Human: { str: 2, int: 2, agi: 2, luk: 3 },
  Elf: { str: 2, int: 2, agi: 3, luk: 2 },
  Demonoid: { str: 3, int: 2, agi: 1, luk: 3 },
  Angel: { str: 1, int: 3, agi: 2, luk: 3 },
  // Fallback if unknown
  default: { str: 1, int: 1, agi: 1, luk: 1 },
};

export function baseStatsForRace(race?: string | null): BaseStats {
  if (!race) return RACE_BASE.default;
  const key = String(race);
  return RACE_BASE[key] || RACE_BASE.default;
}

// Prefer using server-side races/classes helpers for accurate combined stats at level 1
import { computeRaceStats } from '@/src/lib/races';
import { computeClassStats, combineRaceClass } from '@/src/lib/classes';

export function computeInitialCharacterData(params: {
  race?: string | null;
  className?: string | null;
  weapon?: string | null;
}) {
  const { race, className, weapon } = params;
  const raceStats = computeRaceStats(race || null, 1);
  const classStats = computeClassStats(className || 'Beginner', 1);
  const combined = combineRaceClass(raceStats, classStats);
  const stats: BaseStats = {
    str: Math.floor(combined.str),
    int: Math.floor(combined.int),
    agi: Math.floor(combined.agi),
    luk: Math.floor(combined.luk)
  };
  return {
    gold: 0,
    level: 1,
    defense: 0,
    race: race || null,
    weapon: weapon || null,
    // Seed inventory and equipment
    startingEquipment: weapon ? [{ id: weapon, qty: 1 }] : [],
    equipment: weapon ? { weapon: { id: weapon, qty: 1 } } : {},
  stats, // str,int,agi,luk derived from race+class (columns will store these when present)
    mining: { level: 1, exp: 0, expToLevel: 100 },
    woodcutting: { level: 1, exp: 0, expToLevel: 100 },
    smithing: { level: 1, exp: 0, expToLevel: 100 },
    fishing: { level: 1, exp: 0, expToLevel: 100 },
    cooking: { level: 1, exp: 0, expToLevel: 100 },
    flags: {},
    inventory: [],
    activeQuests: [],
    completedQuests: [],
  } as Record<string, unknown>;
}
