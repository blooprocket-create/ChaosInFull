// Data-driven class definitions
export const CLASS_DEFS = {
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

export default CLASS_DEFS;
