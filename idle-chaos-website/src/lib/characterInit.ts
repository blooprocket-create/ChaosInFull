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

export function computeInitialCharacterData(params: {
  race?: string | null;
  weapon?: string | null;
}) {
  const { race, weapon } = params;
  const stats = baseStatsForRace(race);
  return {
    gold: 0,
    level: 1,
    race: race || null,
    weapon: weapon || null,
    startingEquipment: weapon ? [{ id: weapon, qty: 1 }] : [],
    stats, // str,int,agi,luk derived from race
    mining: { level: 1, exp: 0, expToLevel: 100 },
    woodcutting: { level: 1, exp: 0, expToLevel: 100 },
    smithing: { level: 1, exp: 0, expToLevel: 100 },
    fishing: { level: 1, exp: 0, expToLevel: 100 },
    cooking: { level: 1, exp: 0, expToLevel: 100 },
    flags: {},
    inventory: [],
    equipment: {},
    activeQuests: [],
    completedQuests: [],
  } as Record<string, unknown>;
}
