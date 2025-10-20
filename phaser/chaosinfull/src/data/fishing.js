// Fishing definitions: expanded dataset with rarities, base value, difficulty, allowed baits and bait modifiers
export const FISHING_DEFS = {
    // common school
    minnow: { id: 'minnow', name: 'Minnow', rarity: 'common', baseValue: 4, difficulty: 6, allowedBaits: ['worm_bait','foil_bait'], minRodRarity: 'common', baitModifiers: { worm_bait: 1.2, foil_bait: 1.0 } },
    sardine: { id: 'sardine', name: 'Sardine', rarity: 'common', baseValue: 5, difficulty: 8, allowedBaits: ['worm_bait','foil_bait'], minRodRarity: 'common', baitModifiers: { worm_bait: 1.1, foil_bait: 1.2 } },
    anchovy: { id: 'anchovy', name: 'Anchovy', rarity: 'common', baseValue: 4, difficulty: 7, allowedBaits: ['foil_bait','worm_bait'], minRodRarity: 'common', baitModifiers: { foil_bait: 1.25, worm_bait: 1.0 } },
    herring: { id: 'herring', name: 'Herring', rarity: 'common', baseValue: 6, difficulty: 9, allowedBaits: ['worm_bait','shrimp_bait'], minRodRarity: 'common', baitModifiers: { worm_bait: 1.1, shrimp_bait: 1.2 } },

    // uncommon catches
    mackerel: { id: 'mackerel', name: 'Mackerel', rarity: 'uncommon', baseValue: 7, difficulty: 12, allowedBaits: ['foil_bait','insect_bait'], minRodRarity: 'common', baitModifiers: { foil_bait: 1.15, insect_bait: 1.2 } },
    bass: { id: 'bass', name: 'Bass', rarity: 'uncommon', baseValue: 14, difficulty: 22, allowedBaits: ['worm_bait','foil_bait'], minRodRarity: 'uncommon', baitModifiers: { worm_bait: 1.1, foil_bait: 1.25 } },
    salmon: { id: 'salmon', name: 'Salmon', rarity: 'uncommon', baseValue: 10, difficulty: 24, allowedBaits: ['insect_bait','shrimp_bait'], minRodRarity: 'uncommon', baitModifiers: { insect_bait: 1.25, shrimp_bait: 1.1 } },
    tuna: { id: 'tuna', name: 'Tuna', rarity: 'uncommon', baseValue: 12, difficulty: 28, allowedBaits: ['squid_bait','insect_bait'], minRodRarity: 'uncommon', baitModifiers: { squid_bait: 1.35, insect_bait: 1.05 } },

    // rare catches
    catfish: { id: 'catfish', name: 'Catfish', rarity: 'rare', baseValue: 20, difficulty: 36, allowedBaits: ['shrimp_bait','crab_bait','worm_bait'], minRodRarity: 'rare', baitModifiers: { shrimp_bait: 1.25, crab_bait: 1.35, worm_bait: 0.9 } },
    crab: { id: 'crab', name: 'Crab', rarity: 'rare', baseValue: 22, difficulty: 46, allowedBaits: ['crab_bait','shrimp_bait'], minRodRarity: 'rare', baitModifiers: { crab_bait: 1.4, shrimp_bait: 1.05 } },
    lobster: { id: 'lobster', name: 'Lobster', rarity: 'rare', baseValue: 25, difficulty: 50, allowedBaits: ['squid_bait','crab_bait'], minRodRarity: 'rare', baitModifiers: { squid_bait: 1.45, crab_bait: 1.2 } },

    // epic / exotic
    marlin: { id: 'marlin', name: 'Blue Marlin', rarity: 'epic', baseValue: 250, difficulty: 120, allowedBaits: ['mystery_bait','squid_bait'], minRodRarity: 'epic', baitModifiers: { mystery_bait: 2.0, squid_bait: 1.3 } },
    giant_turtle: { id: 'giant_turtle', name: 'Giant Turtle', rarity: 'epic', baseValue: 320, difficulty: 160, allowedBaits: ['mystery_bait'], minRodRarity: 'epic', baitModifiers: { mystery_bait: 2.2 } },
};

// make accessible globally for scenes
if (typeof window !== 'undefined') window.FISHING_DEFS = FISHING_DEFS;

export default FISHING_DEFS;
