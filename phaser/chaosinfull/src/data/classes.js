// Data-driven class definitions
export const CLASS_DEFS = {
    beginner: {
        id: 'beginner',
        name: 'Beginner',
        description: 'A fresh start. No bonuses.',
        base: { str: 0, int: 0, agi: 0, luk: 0 },
        perLevel: { str: 0.1, int: 0.1, agi: 0.1, luk: 0.1 }
    },
    horror: {
        id: 'horror',
        name: 'Horror',
        description: 'Ferocious melee fighter.',
        base: { str: 2, int: 0, agi: 1, luk: 0 },
        perLevel: { str: 0.6, int: 0.05, agi: 0.2, luk: 0.05 }
    },
    occultis: {
        id: 'occultis',
        name: 'Occultis',
        description: 'Master of arcane arts.',
        base: { str: 0, int: 3, agi: 0, luk: 0 },
        perLevel: { str: 0.05, int: 0.7, agi: 0.05, luk: 0.1 }
    },
    shade: {
        id: 'shade',
        name: 'Shade',
        description: 'Stealthy and quick.',
        base: { str: 0, int: 0, agi: 3, luk: 1 },
        perLevel: { str: 0.05, int: 0.05, agi: 0.6, luk: 0.2 }
    }
};

export default CLASS_DEFS;
