// Server-side mirror of src/game/phaser/data/races.js for stat progression
// Keep in sync with client definitions. Each race defines base stats and per-level increments.

export type RaceStats = { str: number; int: number; agi: number; luk: number };
export interface RaceDef { name: string; description?: string; base: RaceStats; perLevel: RaceStats; }

export const RACE_DEFS: Record<string, RaceDef> = {
  Human: {
    name: 'Human',
    description: 'Balanced and adaptable.',
    base: { str: 2, int: 2, agi: 2, luk: 3 },
    perLevel: { str: 1, int: 1, agi: 1, luk: 3 }
  },
  Elf: {
    name: 'Elf',
    description: 'Naturally gifted with agility and intelligence.',
    base: { str: 2, int: 2, agi: 3, luk: 2 },
    perLevel: { str: 1, int: 2, agi: 2, luk: 1 }
  },
  Demonoid: {
    name: 'Demonoid',
    description: 'Brutish and strong.',
    base: { str: 3, int: 2, agi: 1, luk: 3 },
    perLevel: { str: 3, int: 1, agi: 1, luk: 1 }
  },
  Angel: {
    name: 'Angel',
    description: 'Blessed with magic and luck.',
    base: { str: 1, int: 3, agi: 2, luk: 3 },
    perLevel: { str: 1, int: 3, agi: 1, luk: 1 }
  }
};

export function computeRaceStats(race: string | null | undefined, level: number): RaceStats {
  const def = race && RACE_DEFS[race] ? RACE_DEFS[race] : null;
  if (!def) {
    // fallback minimal scaling
    return { str: 1 + Math.max(0, level - 1), int: 1 + Math.max(0, level - 1), agi: 1 + Math.max(0, level - 1), luk: 1 + Math.max(0, level - 1) };
  }
  const lvl = Math.max(1, Math.floor(level));
  if (lvl === 1) return { ...def.base };
  // Base + (level-1)*perLevel increments
  return {
    str: def.base.str + def.perLevel.str * (lvl - 1),
    int: def.base.int + def.perLevel.int * (lvl - 1),
    agi: def.base.agi + def.perLevel.agi * (lvl - 1),
    luk: def.base.luk + def.perLevel.luk * (lvl - 1)
  };
}
