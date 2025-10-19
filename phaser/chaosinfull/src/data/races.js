// Data-driven race definitions
export const RACE_DEFS = {
    Human: {
        name: 'Human',
        description: 'Balanced and adaptable.',
        base: { str: 2, int: 2, agi: 2, luk: 2 },
        perLevel: { str: 0.3, int: 0.3, agi: 0.3, luk: 0.3 }
    },
    Elf: {
        name: 'Elf',
        description: 'Naturally gifted with agility and intelligence.',
        base: { str: 1, int: 3, agi: 3, luk: 1 },
        perLevel: { str: 0.2, int: 0.4, agi: 0.4, luk: 0.2 }
    },
    Demonoid: {
        name: 'Demonoid',
        description: 'Brutish and strong.',
        base: { str: 3, int: 2, agi: 1, luk: 2 },
        perLevel: { str: 0.5, int: 0.25, agi: 0.15, luk: 0.25 }
    },
    Angel: {
        name: 'Angel',
        description: 'Blessed with magic and luck.',
        base: { str: 1, int: 3, agi: 2, luk: 3 },
        perLevel: { str: 0.15, int: 0.45, agi: 0.25, luk: 0.45 }
    }
};

export default RACE_DEFS;
