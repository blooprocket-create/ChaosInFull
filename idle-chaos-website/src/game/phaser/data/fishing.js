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
    // Additional fish to cover more bait/range combinations
    pond_roach: { id: 'pond_roach', name: 'Pond Roach', rarity: 'common', baseValue: 3, difficulty: 5, allowedBaits: ['worm_bait','foil_bait'], minRodRarity: 'common', baitModifiers: { worm_bait: 1.3, foil_bait: 1.0 } },
    reed_perch: { id: 'reed_perch', name: 'Reed Perch', rarity: 'common', baseValue: 5, difficulty: 7, allowedBaits: ['worm_bait','shrimp_bait'], minRodRarity: 'common', baitModifiers: { worm_bait: 1.15, shrimp_bait: 1.2 } },
    sunfish: { id: 'sunfish', name: 'Sunfish', rarity: 'common', baseValue: 4, difficulty: 6, allowedBaits: ['foil_bait','worm_bait'], minRodRarity: 'common', baitModifiers: { foil_bait: 1.1, worm_bait: 1.05 } },
    pond_crablet: { id: 'pond_crablet', name: 'Crablet', rarity: 'common', baseValue: 6, difficulty: 9, allowedBaits: ['shrimp_bait','crab_bait'], minRodRarity: 'common', baitModifiers: { shrimp_bait: 1.2, crab_bait: 1.05 } },

    // Uncommon varieties tuned to different baits
    rock_trout: { id: 'rock_trout', name: 'Rock Trout', rarity: 'uncommon', baseValue: 9, difficulty: 18, allowedBaits: ['worm_bait','foil_bait'], minRodRarity: 'uncommon', baitModifiers: { worm_bait: 1.2, foil_bait: 1.25 } },
    river_pike: { id: 'river_pike', name: 'River Pike', rarity: 'uncommon', baseValue: 16, difficulty: 26, allowedBaits: ['insect_bait','foil_bait'], minRodRarity: 'uncommon', baitModifiers: { insect_bait: 1.35, foil_bait: 1.05 } },
    silver_mullet: { id: 'silver_mullet', name: 'Silver Mullet', rarity: 'uncommon', baseValue: 11, difficulty: 20, allowedBaits: ['shrimp_bait','insect_bait'], minRodRarity: 'uncommon', baitModifiers: { shrimp_bait: 1.15, insect_bait: 1.2 } },
    coastal_snapper: { id: 'coastal_snapper', name: 'Coastal Snapper', rarity: 'uncommon', baseValue: 13, difficulty: 24, allowedBaits: ['foil_bait','shrimp_bait'], minRodRarity: 'uncommon', baitModifiers: { foil_bait: 1.2, shrimp_bait: 1.15 } },

    // Rare fish tuned to higher-tier baits
    silvercarp: { id: 'silvercarp', name: 'Silver Carp', rarity: 'rare', baseValue: 28, difficulty: 40, allowedBaits: ['shrimp_bait','crab_bait'], minRodRarity: 'rare', baitModifiers: { shrimp_bait: 1.2, crab_bait: 1.35 } },
    shadow_eel: { id: 'shadow_eel', name: 'Shadow Eel', rarity: 'rare', baseValue: 34, difficulty: 48, allowedBaits: ['night_bait','squid_bait'], minRodRarity: 'rare', baitModifiers: { night_bait: 1.5, squid_bait: 1.1 } },
    river_wyrm: { id: 'river_wyrm', name: 'River Wyrm', rarity: 'rare', baseValue: 30, difficulty: 44, allowedBaits: ['worm_bait','crab_bait'], minRodRarity: 'rare', baitModifiers: { worm_bait: 1.05, crab_bait: 1.3 } },
    storm_clam: { id: 'storm_clam', name: 'Storm Clam', rarity: 'rare', baseValue: 38, difficulty: 52, allowedBaits: ['crab_bait','shrimp_bait'], minRodRarity: 'rare', baitModifiers: { crab_bait: 1.4, shrimp_bait: 1.05 } },

    // Epic catches for specialty baits
    abyssal_grouper: { id: 'abyssal_grouper', name: 'Abyssal Grouper', rarity: 'epic', baseValue: 180, difficulty: 110, allowedBaits: ['squid_bait','mystery_bait'], minRodRarity: 'epic', baitModifiers: { squid_bait: 1.4, mystery_bait: 2.0 } },
    moon_shrike: { id: 'moon_shrike', name: 'Moon Shrike', rarity: 'epic', baseValue: 210, difficulty: 130, allowedBaits: ['night_bait','mystery_bait'], minRodRarity: 'epic', baitModifiers: { night_bait: 1.8, mystery_bait: 2.1 } },
    deep_sabre: { id: 'deep_sabre', name: 'Deep Sabrefish', rarity: 'epic', baseValue: 260, difficulty: 150, allowedBaits: ['mystery_bait','squid_bait'], minRodRarity: 'epic', baitModifiers: { mystery_bait: 2.2, squid_bait: 1.35 } },

    // Legendary / unique sea creatures for mystery bait and rare combinations
    leviathan_spawn: { id: 'leviathan_spawn', name: 'Leviathan Spawn', rarity: 'legendary', baseValue: 1200, difficulty: 400, allowedBaits: ['mystery_bait'], minRodRarity: 'legendary', baitModifiers: { mystery_bait: 3.0 } },
    celestial_whale: { id: 'celestial_whale', name: 'Celestial Whale', rarity: 'legendary', baseValue: 1500, difficulty: 480, allowedBaits: ['mystery_bait'], minRodRarity: 'legendary', baitModifiers: { mystery_bait: 3.2 } },

    // Specialty small/novel catches for more bait variety
    glowshrimp: { id: 'glowshrimp', name: 'Glow Shrimp', rarity: 'uncommon', baseValue: 18, difficulty: 16, allowedBaits: ['shrimp_bait','foil_bait'], minRodRarity: 'common', baitModifiers: { shrimp_bait: 1.6, foil_bait: 1.0 } },
    tinny_nautilus: { id: 'tinny_nautilus', name: 'Tinny Nautilus', rarity: 'rare', baseValue: 46, difficulty: 56, allowedBaits: ['crab_bait','squid_bait'], minRodRarity: 'rare', baitModifiers: { crab_bait: 1.25, squid_bait: 1.45 } },
    nightling: { id: 'nightling', name: 'Nightling', rarity: 'rare', baseValue: 52, difficulty: 58, allowedBaits: ['night_bait','mystery_bait'], minRodRarity: 'rare', baitModifiers: { night_bait: 1.7, mystery_bait: 2.0 } },
};

// make accessible globally for scenes
if (typeof window !== 'undefined') window.FISHING_DEFS = FISHING_DEFS;

export default FISHING_DEFS;
