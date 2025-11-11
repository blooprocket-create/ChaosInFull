// Data-driven race definitions
export const RACE_DEFS = {
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

export default RACE_DEFS;
