export const ENEMY_DEFS = {
    slime_common: {
        id: 'slime_common',
        name: 'Slime',
        tier: 'common',
        dynamicStats: true,
        level: 1,
        maxhp: 30,
        moveSpeed: 80,
        attackRange: 48,
        attackCooldown: 1400,
    damage: [3, 6],
    exp: 9,
        drops: [
            { itemId: 'slime_gel', minQty: 1, maxQty: 2, baseChance: 0.92, luckBonus: 0.001 },
            { itemId: 'slime_whip', minQty: 1, maxQty: 1, baseChance: 0.005, luckBonus: 0.0003 },
            { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.008 },
            { itemId: 'minor_mana_potion', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.008 }
        ]
        ,
        // numeric gold drop (min, max, chance, luckBonus)
        gold: { min: 1, max: 3, chance: 0.8, luckBonus: 0.002 }
    },
    slime_epic: {
        id: 'slime_epic',
        name: 'Glowing Slime',
        tier: 'epic',
        dynamicStats: true,
        level: 5,
        maxhp: 180,
        moveSpeed: 95,
        attackRange: 56,
        attackCooldown: 1200,
    damage: [13, 25],
    exp: 88,
        drops: [
            { itemId: 'slime_gel', minQty: 1, maxQty: 3, baseChance: 0.96, luckBonus: 0.0015 },
            { itemId: 'slime_core', minQty: 1, maxQty: 2, baseChance: 0.035, luckBonus: 0.001 },
            { itemId: 'slime_whip', minQty: 1, maxQty: 1, baseChance: 0.012, luckBonus: 0.0006 },
            { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.008 },
            { itemId: 'minor_mana_potion', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.008 }
        ]
        ,
        gold: { min: 4, max: 9, chance: 0.9, luckBonus: 0.002 }
    },
    slime_boss: {
        id: 'slime_boss',
        name: 'Royal Slime',
        tier: 'boss',
        dynamicStats: true,
        level: 10,
        maxhp: 750,
        moveSpeed: 70,
        attackRange: 64,
        attackCooldown: 900,
    damage: [28, 60],
    exp: 500,
        drops: [
            { itemId: 'slime_gel', minQty: 1, maxQty: 9, baseChance: 1.0, luckBonus: 0.002 },
            { itemId: 'slime_core', minQty: 2, maxQty: 4, baseChance: 0.6, luckBonus: 0.0015 },
            { itemId: 'slime_whip', minQty: 1, maxQty: 1, baseChance: 0.036, luckBonus: 0.0012 },
            { itemId: 'slime_crown_shard', minQty: 1, maxQty: 1, baseChance: 0.025, luckBonus: 0.001 },
            { itemId: 'strange_slime_egg', minQty: 1, maxQty: 1, baseChance: 0.005, luckBonus: 0.0002 },
            { itemId: 'major_health_potion', minQty: 1, maxQty: 1, baseChance: 0.08, luckBonus: 0.01 },
            { itemId: 'major_mana_potion', minQty: 1, maxQty: 1, baseChance: 0.08, luckBonus: 0.01 }
        ]
        ,
        gold: { min: 40, max: 90, chance: 1.0, luckBonus: 0.003 }
    },
    goblin_common: {
        id: 'goblin_common',
        name: 'Goblin',
        tier: 'common',
        dynamicStats: true,
        level: 5,
        maxhp: 160,
        moveSpeed: 90,
        attackRange: 40,
        attackCooldown: 1300,
    damage: [34, 48],
    exp: 64,
        drops: [
            { itemId: 'copper_ore', minQty: 1, maxQty: 3, baseChance: 0.85, luckBonus: 0.001 },
            { itemId: 'copper_sword', minQty: 1, maxQty: 1, baseChance: 0.01, luckBonus: 0.0004 }
        ]
        ,
        gold: { min: 2, max: 6, chance: 0.85, luckBonus: 0.001 }
    },
    goblin_epic: {
        id: 'goblin_epic',
        name: 'Goblin Warrior',
        tier: 'epic',
        dynamicStats: true,
        level: 7,
        maxhp: 300,
        moveSpeed: 100,
        attackRange: 48,
        attackCooldown: 1100,
    damage: [38, 54],
    exp: 172,
        drops: [
            { itemId: 'bronze_bar', minQty: 1, maxQty: 4, baseChance: 0.9, luckBonus: 0.0015 },
            { itemId: 'bronze_sword', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0006 },
            { itemId: 'copper_armor', minQty: 1, maxQty: 1, baseChance: 0.03, luckBonus: 0.0006 }
        ]
        ,
        gold: { min: 8, max: 18, chance: 0.9, luckBonus: 0.0018 }
    },
    goblin_boss: {
        id: 'goblin_boss',
        name: 'Goblin Chieftain',
        tier: 'boss',
        dynamicStats: true,
        level: 18,
        maxhp: 4400,
        moveSpeed: 80,
        attackRange: 56,
        attackCooldown: 800,
    damage: [150, 250],
    exp: 1500,
        drops: [
            { itemId: 'bronze_bar', minQty: 2, maxQty: 6, baseChance: 1.0, luckBonus: 0.002 },
            { itemId: 'bronze_sword', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.0012 }
        ]
        ,
        // prefer direct numeric gold instead of bag_of_gold item
        gold: { min: 60, max: 140, chance: 1.0, luckBonus: 0.004 }
    },
    goblin_girl: {
        id: 'goblin_girl',
        name: 'Goblinette',
        tier: 'rare',
        dynamicStats: true,
        level: 6,
        maxhp: 170,
        moveSpeed: 95,
        attackRange: 42,
        attackCooldown: 1250,
    damage: [25, 29],
    exp: 66,
        drops: [
            { itemId: 'copper_ore', minQty: 1, maxQty: 2, baseChance: 0.9, luckBonus: 0.001 },
            { itemId: 'copper_dagger', minQty: 1, maxQty: 1, baseChance: 0.015, luckBonus: 0.0005 },
            { itemId: 'healing_essence', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0003 },
        ]
        ,
        gold: { min: 3, max: 8, chance: 0.9, luckBonus: 0.001 }
    },
    goblin_slicer: {
        id: 'goblin_slicer',
        name: 'Goblin Slicer',
        tier: 'rare',
        dynamicStats: true,
        level: 8,
        maxhp: 180,
        moveSpeed: 120,
        attackRange: 54,
        attackCooldown: 900,
    damage: [19, 35],
    exp: 188,
        drops: [
            { itemId: 'copper_ore', minQty: 2, maxQty: 4, baseChance: 0.92, luckBonus: 0.001 },
            { itemId: 'copper_dagger', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0006 },
            { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.08, luckBonus: 0.009 }
        ]
        ,
        gold: { min: 6, max: 16, chance: 0.92, luckBonus: 0.0018 }
    },
    goblin_flamebinder: {
        id: 'goblin_flamebinder',
        name: 'Goblin Flamebinder',
        tier: 'epic',
        dynamicStats: true,
        level: 10,
        maxhp: 230,
        moveSpeed: 90,
        attackRange: 68,
        attackCooldown: 820,
    damage: [32, 38],
    exp: 260,
        drops: [
            { itemId: 'bronze_bar', minQty: 2, maxQty: 5, baseChance: 0.88, luckBonus: 0.0015 },
            { itemId: 'minor_mana_potion', minQty: 1, maxQty: 2, baseChance: 0.12, luckBonus: 0.008 },
            { itemId: 'major_mana_potion', minQty: 1, maxQty: 1, baseChance: 0.08, luckBonus: 0.01 }
        ]
        ,
        gold: { min: 14, max: 34, chance: 0.95, luckBonus: 0.0022 }
    },
    goblin_ironhowl: {
        id: 'goblin_ironhowl',
        name: 'Goblin Ironhowl Vanguard',
        tier: 'epic',
        dynamicStats: true,
        level: 11,
        maxhp: 320,
        moveSpeed: 80,
        attackRange: 52,
        attackCooldown: 860,
    damage: [34, 52],
    exp: 340,
        drops: [
            { itemId: 'bronze_bar', minQty: 2, maxQty: 5, baseChance: 0.94, luckBonus: 0.0018 },
            { itemId: 'copper_armor', minQty: 1, maxQty: 1, baseChance: 0.04, luckBonus: 0.0007 },
            { itemId: 'bronze_sword', minQty: 1, maxQty: 1, baseChance: 0.03, luckBonus: 0.0006 },
            { itemId: 'major_health_potion', minQty: 1, maxQty: 1, baseChance: 0.1, luckBonus: 0.012 }
        ]
        ,
        gold: { min: 26, max: 58, chance: 0.97, luckBonus: 0.0026 }
    },
    rat: {
        id: 'rat',
        name: 'Giant Rat',
        tier: 'common',
        dynamicStats: true,
        level: 2,
        maxhp: 45,
        moveSpeed: 70,
        attackRange: 30,
        attackCooldown: 1500,
    damage: [2, 4],
    exp: 16,
        drops: [
            { itemId: 'rat_tail', minQty: 1, maxQty: 2, baseChance: 0.9, luckBonus: 0.001 },
            { itemId: 'rat_meat', minQty: 1, maxQty: 1, baseChance: 0.5, luckBonus: 0.0005 },
            { itemId: 'toxic_essence', minQty: 1, maxQty: 1, baseChance: 0.01, luckBonus: 0.0002 }
        ]
        ,
        gold: { min: 1, max: 2, chance: 0.75, luckBonus: 0.0008 }
    },
    zombie_rat: {
        id: 'zombie_rat',
        name: 'Zombie Rat',
        tier: 'uncommon',
        dynamicStats: true,
        level: 7,
        maxhp: 135,
        moveSpeed: 60,
        attackRange: 30,
        attackCooldown: 1400,
    damage: [13, 35],
    exp: 64,
        drops: [
            { itemId: 'rat_tail', minQty: 1, maxQty: 3, baseChance: 0.95, luckBonus: 0.0012 },
            { itemId: 'rotting_fang', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0005 },
            { itemId: 'rat_meat', minQty: 1, maxQty: 1, baseChance: 0.4, luckBonus: 0.0004 },
            { itemId: 'toxic_essence', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0003 },
            { itemId: 'poison_essence', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0003 },
        ]
        ,
        gold: { min: 2, max: 4, chance: 0.8, luckBonus: 0.001 }
    },
    ghost_rat: {
        id: 'ghost_rat',
        name: 'Ghost Rat',
        tier: 'rare',
        dynamicStats: true,
        level: 5,
        maxhp: 180,
        moveSpeed: 90,
        attackRange: 35,
        attackCooldown: 1300,
    damage: [36, 40],
    exp: 60,
        drops: [
            { itemId: 'rat_tail', minQty: 2, maxQty: 4, baseChance: 1.0, luckBonus: 0.0015 },
            { itemId: 'rotting_fang', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.0008 },
            { itemId: 'spectral_essence', minQty: 1, maxQty: 1, baseChance: 0.03, luckBonus: 0.0007 },
            { itemId: 'rat_meat', minQty: 1, maxQty: 1, baseChance: 0.4, luckBonus: 0.0004 },
            { itemID: 'shadow_essence', minQty: 1, maxQty: 1, baseChance: 0.03, luckBonus: 0.0006 }
        ]
        ,
        gold: { min: 6, max: 15, chance: 0.9, luckBonus: 0.0016 }
    }
};

export default ENEMY_DEFS;
