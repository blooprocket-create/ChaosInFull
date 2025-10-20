// Data-driven class definitions
export const CLASS_DEFS = {
    beginner: {
        id: 'beginner',
        name: 'Beginner',
        description: 'Fresh, fragile, and armed with optimism + splintered wood. Chooses corruption flavor later.',
        base: { str: 0, int: 0, agi: 0, luk: 0 },
        perLevel: { str: 0.1, int: 0.1, agi: 0.1, luk: 0.1 }
    },
    horror: {
        id: 'horror',
        name: 'Horror',
        description: 'Not a "warrior"—a guilt-powered wrecking suit that monetizes collision.',
        base: { str: 2, int: 0, agi: 1, luk: 0 },
        perLevel: { str: 0.6, int: 0.05, agi: 0.2, luk: 0.05 }
    },
    occultis: {
        id: 'occultis',
        name: 'Occultis',
        description: 'Refuses normal spell schools. Trades stability for layered hex engines.',
        base: { str: 0, int: 3, agi: 0, luk: 0 },
        perLevel: { str: 0.05, int: 0.7, agi: 0.05, luk: 0.1 }
    },
    stalker: {
        id: 'stalker',
        name: 'Stalker',
        description: 'Thrives on motion debt. High crit windows gated by positional discipline.',
        base: { str: 0, int: 0, agi: 3, luk: 1 },
        perLevel: { str: 0.05, int: 0.05, agi: 0.6, luk: 0.2 }
    },
    ravager: {
        id: 'ravager',
        name: 'Ravager',
        description: 'Brutal frontline combatant. Excels at sustained damage and armor disruption.',
        base: { str: 5, int: 1, agi: 2, luk: 1 },
        perLevel: { str: 0.9, int: 0.1, agi: 0.4, luk: 0.4 }
    },
    hexweaver: {
        id: 'hexweaver',
        name: 'Hexweaver',
        description: 'Master of layered curses and battlefield manipulation. Fragile but deadly.',
        base: { str: 1, int: 5, agi: 1, luk: 2 },
        perLevel: { str: 0.1, int: 0.9, agi: 0.3, luk: 0.6 }
    },
    nightblade: {
        id: 'nightblade',
        name: 'Nightblade',
        description: 'Stealthy assassin leveraging speed and critical strikes to eliminate targets swiftly.',
        base: { str: 2, int: 1, agi: 5, luk: 2 },
        perLevel: { str: 0.4, int: 0.1, agi: 0.9, luk: 0.4 }
    },
    sanguine: {
        id: 'sanguine',
        name: 'Sanguine',
        description: 'Blood magic specialist. Sacrifices health for powerful spells and life-stealing abilities.',
        base: { str: 3, int: 3, agi: 1, luk: 1 },
        perLevel: { str: 0.7, int: 0.7, agi: 0.4, luk: 0.4 }
    },
    astral_scribe: {
        id: 'astral_scribe',
        name: 'Astral Scribe',
        description: 'Wields cosmic energies to manipulate time and space, excelling in control and utility.',
        base: { str: 1, int: 4, agi: 2, luk: 2 },
        perLevel: { str: 0.2, int: 0.8, agi: 0.5, luk: 0.5 }
    },
    shade_dancer: {
        id: 'shade_dancer',
        name: 'Shade Dancer',
        description: 'Master of shadow and deception. Utilizes stealth and illusions to outmaneuver enemies.',
        base: { str: 2, int: 2, agi: 4, luk: 3 },
        perLevel: { str: 0.5, int: 0.5, agi: 0.6, luk: 0.6 }
    }
};

export default CLASS_DEFS;
