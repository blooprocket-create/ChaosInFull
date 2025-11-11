// Server-side mirror of src/game/phaser/data/classes.js for stat progression
// Keep in sync with client definitions. Class base/perLevel can include fractional values.

export type StatBlock = { str: number; int: number; agi: number; luk: number };
export interface ClassDef { id: string; name: string; description?: string; base: StatBlock; perLevel: StatBlock; tier: number; requiredClass?: string }

export const CLASS_DEFS: Record<string, ClassDef> = {
  beginner: {
    id: 'beginner',
    name: 'Beginner',
    description: 'Fresh, fragile, and armed with optimism + splintered wood. Chooses corruption flavor later.',
    base: { str: 0, int: 0, agi: 0, luk: 0 },
    perLevel: { str: 1, int: 1, agi: 1, luk: 1 },
    tier: 0
  },
  horror: {
    id: 'horror',
    name: 'Horror',
    description: 'Not a "warrior"—a guilt-powered wrecking suit that monetizes collision.',
    base: { str: 5, int: 1, agi: 2, luk: 1 },
    perLevel: { str: 3, int: 1, agi: 1, luk: 1 },
    tier: 1,
    requiredClass: 'beginner'
  },
  occultist: {
    id: 'occultist',
    name: 'Occultist',
    description: 'Refuses normal spell schools. Trades stability for layered hex engines.',
    base: { str: 2, int: 5, agi: 1, luk: 1 },
    perLevel: { str: 1, int: 3, agi: 1, luk: 1 },
    tier: 1,
    requiredClass: 'beginner'
  },
  stalker: {
    id: 'stalker',
    name: 'Stalker',
    description: 'Thrives on motion debt. High crit windows gated by positional discipline.',
    base: { str: 1, int: 2, agi: 5, luk: 1 },
    perLevel: { str: 1, int: 1, agi: 3, luk: 1 },
    tier: 1,
    requiredClass: 'beginner'
  },
  ravager: {
    id: 'ravager',
    name: 'Ravager',
    description: 'Brutal frontline combatant. Excels at sustained damage and armor disruption.',
    base: { str: 10, int: 4, agi: 4, luk: 5 },
    perLevel: { str: 5, int: 2, agi: 2, luk: 2 },
    tier: 2,
    requiredClass: 'horror'
  },
  hexweaver: {
    id: 'hexweaver',
    name: 'Hexweaver',
    description: 'Master of layered curses and battlefield manipulation. Fragile but deadly.',
    base: { str: 4, int: 10, agi: 4, luk: 5 },
    perLevel: { str: 2, int: 5, agi: 2, luk: 2 },
    tier: 2,
    requiredClass: 'occultist'
  },
  nightblade: {
    id: 'nightblade',
    name: 'Nightblade',
    description: 'Stealthy assassin leveraging speed and critical strikes to eliminate targets swiftly.',
    base: { str: 4, int: 4, agi: 10, luk: 5 },
    perLevel: { str: 2, int: 2, agi: 5, luk: 2 },
    tier: 2,
    requiredClass: 'stalker'
  },
  sanguine: {
    id: 'sanguine',
    name: 'Sanguine',
    description: 'Blood magic specialist. Sacrifices health for powerful spells and life-stealing abilities.',
    base: { str: 3, int: 3, agi: 1, luk: 1 },
    perLevel: { str: 0.7, int: 0.7, agi: 0.4, luk: 0.4 },
    tier: 2,
    requiredClass: 'horror'
  },
  astral_scribe: {
    id: 'astral_scribe',
    name: 'Astral Scribe',
    description: 'Wields cosmic energies to manipulate time and space, excelling in control and utility.',
    base: { str: 1, int: 4, agi: 2, luk: 2 },
    perLevel: { str: 0.2, int: 0.8, agi: 0.5, luk: 0.5 },
    tier: 2,
    requiredClass: 'occultist'
  },
  shade_dancer: {
    id: 'shade_dancer',
    name: 'Shade Dancer',
    description: 'Master of shadow and deception. Utilizes stealth and illusions to outmaneuver enemies.',
    base: { str: 2, int: 2, agi: 4, luk: 3 },
    perLevel: { str: 0.5, int: 0.5, agi: 0.6, luk: 0.6 },
    tier: 2,
    requiredClass: 'stalker'
  }
};

export function resolveClassKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const key = v.toLowerCase();
  if (CLASS_DEFS[key]) return key;
  // Try matching by name case-insensitive
  const found = Object.values(CLASS_DEFS).find(c => c.name.toLowerCase() === key);
  return found ? found.id : null;
}

export function computeClassStats(klass: string | null | undefined, level: number): StatBlock {
  const key = resolveClassKey(klass);
  const def = key ? CLASS_DEFS[key] : null;
  if (!def) return { str: 0, int: 0, agi: 0, luk: 0 };
  const lvl = Math.max(1, Math.floor(level));
  if (lvl === 1) return { ...def.base };
  return {
    str: def.base.str + def.perLevel.str * (lvl - 1),
    int: def.base.int + def.perLevel.int * (lvl - 1),
    agi: def.base.agi + def.perLevel.agi * (lvl - 1),
    luk: def.base.luk + def.perLevel.luk * (lvl - 1)
  };
}

export function combineRaceClass(raceStats: StatBlock, classStats: StatBlock): StatBlock {
  return {
    str: raceStats.str + classStats.str,
    int: raceStats.int + classStats.int,
    agi: raceStats.agi + classStats.agi,
    luk: raceStats.luk + classStats.luk
  };
}
