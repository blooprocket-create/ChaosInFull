// Centralized enemy definitions (organized by family with consistent formatting)
// Note: dynamicStats=true indicates runtime scaling via computeEnemyStats; static hp/damage serve as baselines.

export const ENEMY_DEFS = {
    // ---------------- Slimes ----------------
        slime_uncommon: {
            id: 'slime_uncommon',
            name: 'Viscous Slime',
            tier: 'uncommon',
            dynamicStats: true,
            level: 3,
            maxhp: 60,
            moveSpeed: 82,
            attackRange: 50,
            attackCooldown: 1360,
            damage: [5, 9],
            exp: 18,
            drops: [
                { itemId: 'slime_gel', minQty: 1, maxQty: 3, baseChance: 0.94, luckBonus: 0.0011 },
                { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.06, luckBonus: 0.008 },
                { itemId: 'minor_mana_potion', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.008 }
            ],
            gold: { min: 1, max: 4, chance: 0.85, luckBonus: 0.002 }
        },
        slime_rare: {
            id: 'slime_rare',
            name: 'Hardened Slime',
            tier: 'rare',
            dynamicStats: true,
            level: 4,
            maxhp: 110,
            moveSpeed: 90,
            attackRange: 52,
            attackCooldown: 1300,
            damage: [9, 14],
            exp: 40,
            drops: [
                { itemId: 'slime_gel', minQty: 1, maxQty: 3, baseChance: 0.96, luckBonus: 0.0012 },
                { itemId: 'slime_core', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0008 }
            ],
            gold: { min: 2, max: 6, chance: 0.9, luckBonus: 0.0022 }
        },
        slime_legendary: {
            id: 'slime_legendary',
            name: 'Elder Slime',
            tier: 'legendary',
            dynamicStats: true,
            level: 8,
            maxhp: 420,
            moveSpeed: 100,
            attackRange: 58,
            attackCooldown: 1100,
            damage: [22, 40],
            exp: 200,
            drops: [
                { itemId: 'slime_core', minQty: 1, maxQty: 2, baseChance: 0.15, luckBonus: 0.001 },
                { itemId: 'major_health_potion', minQty: 1, maxQty: 1, baseChance: 0.08, luckBonus: 0.01 }
            ],
            gold: { min: 14, max: 28, chance: 0.95, luckBonus: 0.0026 }
        },
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
        ],
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
        ],
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
        ],
        gold: { min: 40, max: 90, chance: 1.0, luckBonus: 0.003 }
    },

    // ---------------- Goblins ----------------
        goblin_uncommon: {
            id: 'goblin_uncommon',
            name: 'Goblin Scout',
            tier: 'uncommon',
            dynamicStats: true,
            level: 6,
            maxhp: 180,
            moveSpeed: 95,
            attackRange: 42,
            attackCooldown: 1260,
            damage: [24, 38],
            exp: 92,
            drops: [
                { itemId: 'copper_ore', minQty: 1, maxQty: 3, baseChance: 0.88, luckBonus: 0.001 },
                { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.06, luckBonus: 0.009 }
            ],
            gold: { min: 3, max: 8, chance: 0.88, luckBonus: 0.0012 }
        },
        goblin_rare: {
            id: 'goblin_rare',
            name: 'Goblin Raider',
            tier: 'rare',
            dynamicStats: true,
            level: 8,
            maxhp: 220,
            moveSpeed: 110,
            attackRange: 50,
            attackCooldown: 1000,
            damage: [28, 42],
            exp: 188,
            drops: [
                { itemId: 'bronze_bar', minQty: 1, maxQty: 3, baseChance: 0.9, luckBonus: 0.0012 }
            ],
            gold: { min: 8, max: 16, chance: 0.92, luckBonus: 0.0016 }
        },
        goblin_legendary: {
            id: 'goblin_legendary',
            name: 'Goblin Warmaster',
            tier: 'legendary',
            dynamicStats: true,
            level: 14,
            maxhp: 600,
            moveSpeed: 105,
            attackRange: 58,
            attackCooldown: 900,
            damage: [60, 90],
            exp: 520,
            drops: [
                { itemId: 'bronze_sword', minQty: 1, maxQty: 1, baseChance: 0.03, luckBonus: 0.0008 },
                { itemId: 'major_health_potion', minQty: 1, maxQty: 1, baseChance: 0.12, luckBonus: 0.012 },
                { itemId: 'bag_of_gold', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.001 }
            ],
            gold: { min: 28, max: 60, chance: 0.96, luckBonus: 0.0024 }
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
        ],
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
        ],
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
            { itemId: 'iron_bar', minQty: 2, maxQty: 6, baseChance: 1.0, luckBonus: 0.002 },
            { itemId: 'steel_sword', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.0012 },
                { itemId: 'bag_of_gold', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.001 }
        ],
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
            { itemId: 'healing_essence', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0003 }
        ],
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
        ],
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
        ],
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
        ],
        gold: { min: 26, max: 58, chance: 0.97, luckBonus: 0.0026 }
    },

    // ---------------- Rats ----------------
        rat_uncommon: {
            id: 'rat_uncommon',
            name: 'Swamp Rat',
            tier: 'uncommon',
            dynamicStats: true,
            level: 4,
            maxhp: 80,
            moveSpeed: 74,
            attackRange: 32,
            attackCooldown: 1440,
            damage: [6, 10],
            exp: 28,
            drops: [
                { itemId: 'rat_tail', minQty: 1, maxQty: 2, baseChance: 0.92, luckBonus: 0.001 }
            ],
            gold: { min: 1, max: 3, chance: 0.8, luckBonus: 0.001 }
        },
        rat_rare: {
            id: 'rat_rare',
            name: 'Dire Rat',
            tier: 'rare',
            dynamicStats: true,
            level: 5,
            maxhp: 120,
            moveSpeed: 82,
            attackRange: 34,
            attackCooldown: 1380,
            damage: [10, 16],
            exp: 44,
            drops: [
                { itemId: 'rat_tail', minQty: 1, maxQty: 3, baseChance: 0.95, luckBonus: 0.0012 }
            ],
            gold: { min: 2, max: 5, chance: 0.85, luckBonus: 0.0012 }
        },
        rat_epic: {
            id: 'rat_epic',
            name: 'Plague Rat',
            tier: 'epic',
            dynamicStats: true,
            level: 7,
            maxhp: 200,
            moveSpeed: 86,
            attackRange: 36,
            attackCooldown: 1300,
            damage: [16, 26],
            exp: 90,
            drops: [
                { itemId: 'toxic_essence', minQty: 1, maxQty: 1, baseChance: 0.06, luckBonus: 0.001 }
            ],
            gold: { min: 3, max: 8, chance: 0.88, luckBonus: 0.0014 }
        },
        rat_legendary: {
            id: 'rat_legendary',
            name: 'Ancient Rat',
            tier: 'legendary',
            dynamicStats: true,
            level: 9,
            maxhp: 320,
            moveSpeed: 92,
            attackRange: 38,
            attackCooldown: 1200,
            damage: [24, 40],
            exp: 160,
            drops: [
                { itemId: 'toxic_essence', minQty: 1, maxQty: 2, baseChance: 0.08, luckBonus: 0.0012 }
            ],
            gold: { min: 6, max: 12, chance: 0.92, luckBonus: 0.0016 }
        },
        rat_boss: {
            id: 'rat_boss',
            name: 'Plague King',
            tier: 'boss',
            dynamicStats: true,
            level: 11,
            maxhp: 900,
            moveSpeed: 88,
            attackRange: 44,
            attackCooldown: 1000,
            damage: [40, 70],
            exp: 600,
            drops: [
                { itemId: 'poison_essence', minQty: 1, maxQty: 2, baseChance: 0.12, luckBonus: 0.002 }
            ],
            gold: { min: 40, max: 90, chance: 0.98, luckBonus: 0.003 }
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
        ],
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
            { itemId: 'poison_essence', minQty: 1, maxQty: 1, baseChance: 0.02, luckBonus: 0.0003 }
        ],
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
            { itemId: 'shadow_essence', minQty: 1, maxQty: 1, baseChance: 0.03, luckBonus: 0.0006 }
        ],
        gold: { min: 6, max: 15, chance: 0.9, luckBonus: 0.0016 }
    },

    // ---------------- Post-Bastion / Themed ----------------
        skeleton_uncommon: {
            id: 'skeleton_uncommon',
            name: 'Faded Skeleton',
            tier: 'uncommon',
            dynamicStats: true,
            level: 13,
            maxhp: 440,
            moveSpeed: 86,
            attackRange: 52,
            attackCooldown: 1180,
            damage: [30, 46],
            exp: 340,
            drops: [
                { itemId: 'bone', minQty: 1, maxQty: 3, baseChance: 0.88, luckBonus: 0.0016 }
            ],
            gold: { min: 22, max: 44, chance: 0.9, luckBonus: 0.002 }
        },
        skeleton_rare: {
            id: 'skeleton_rare',
            name: 'Bladebone',
            tier: 'rare',
            dynamicStats: true,
            level: 15,
            maxhp: 560,
            moveSpeed: 90,
            attackRange: 54,
            attackCooldown: 1120,
            damage: [36, 56],
            exp: 420,
            drops: [
                { itemId: 'bone', minQty: 2, maxQty: 4, baseChance: 0.92, luckBonus: 0.0018 }
            ],
            gold: { min: 26, max: 52, chance: 0.92, luckBonus: 0.0022 }
        },
        skeleton_epic: {
            id: 'skeleton_epic',
            name: 'Deathguard',
            tier: 'epic',
            dynamicStats: true,
            level: 18,
            maxhp: 780,
            moveSpeed: 80,
            attackRange: 60,
            attackCooldown: 1000,
            damage: [50, 78],
            exp: 600,
            drops: [
                { itemId: 'bone', minQty: 3, maxQty: 6, baseChance: 0.95, luckBonus: 0.0024 }
            ],
            gold: { min: 40, max: 80, chance: 0.95, luckBonus: 0.003 }
        },
        skeleton_legendary: {
            id: 'skeleton_legendary',
            name: 'Grave Sovereign',
            tier: 'legendary',
            dynamicStats: true,
            level: 22,
            maxhp: 1200,
            moveSpeed: 85,
            attackRange: 65,
            attackCooldown: 920,
            damage: [78, 120],
            exp: 1100,
            drops: [
                { itemId: 'major_health_potion', minQty: 1, maxQty: 2, baseChance: 0.2, luckBonus: 0.02 }
            ],
            gold: { min: 70, max: 120, chance: 0.95, luckBonus: 0.004 }
        },
    skeleton: {
        id: 'skeleton',
        name: 'Skeleton Warrior',
        tier: 'common',
        dynamicStats: true,
        level: 12,
        maxhp: 400,
        moveSpeed: 85,
        attackRange: 50,
        attackCooldown: 1200,
        damage: [28, 44],
        exp: 320,
        drops: [
            { itemId: 'bone', minQty: 1, maxQty: 3, baseChance: 0.85, luckBonus: 0.0015 },
            { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.1, luckBonus: 0.01 }
        ],
        gold: { min: 20, max: 40, chance: 0.9, luckBonus: 0.002 }
    },
    zombie: {
        id: 'zombie',
        name: 'Zombie',
        tier: 'common',
        dynamicStats: true,
        level: 14,
        maxhp: 480,
        moveSpeed: 75,
        attackRange: 45,
        attackCooldown: 1300,
        damage: [32, 48],
        exp: 360,
        drops: [
            { itemId: 'rotting_flesh', minQty: 1, maxQty: 3, baseChance: 0.85, luckBonus: 0.0015 },
            { itemId: 'minor_health_potion', minQty: 1, maxQty: 1, baseChance: 0.1, luckBonus: 0.01 }
        ],
        gold: { min: 25, max: 50, chance: 0.9, luckBonus: 0.002 }
    },
    goblin_skeleton: {
        id: 'goblin_skeleton',
        name: 'Goblin Skeleton',
        tier: 'rare',
        dynamicStats: true,
        level: 16,
        maxhp: 600,
        moveSpeed: 90,
        attackRange: 55,
        attackCooldown: 1100,
        damage: [40, 60],
        exp: 480,
        drops: [
            { itemId: 'bone', minQty: 2, maxQty: 5, baseChance: 0.9, luckBonus: 0.002 },
            { itemId: 'minor_health_potion', minQty: 1, maxQty: 2, baseChance: 0.15, luckBonus: 0.015 }
        ],
        gold: { min: 30, max: 60, chance: 0.95, luckBonus: 0.003 }
    },
    flaming_slime: {
        id: 'flaming_slime',
        name: 'Flaming Slime',
        tier: 'rare',
        dynamicStats: true,
        level: 15,
        maxhp: 520,
        moveSpeed: 85,
        attackRange: 50,
        attackCooldown: 1250,
        damage: [38, 55],
        exp: 460,
        drops: [
            { itemId: 'flame_essence', minQty: 1, maxQty: 3, baseChance: 0.85, luckBonus: 0.002 },
            { itemId: 'minor_mana_potion', minQty: 1, maxQty: 1, baseChance: 0.1, luckBonus: 0.01 }
        ],
        gold: { min: 25, max: 55, chance: 0.9, luckBonus: 0.0025 }
    },
    brute_skeleton: {
        id: 'brute_skeleton',
        name: 'Brute Skeleton',
        tier: 'epic',
        dynamicStats: true,
        level: 18,
        maxhp: 800,
        moveSpeed: 70,
        attackRange: 60,
        attackCooldown: 1000,
        damage: [50, 80],
        exp: 600,
        drops: [
            { itemId: 'bone', minQty: 3, maxQty: 6, baseChance: 0.95, luckBonus: 0.0025 },
            { itemId: 'major_health_potion', minQty: 1, maxQty: 1, baseChance: 0.15, luckBonus: 0.015 }
        ],
        gold: { min: 40, max: 80, chance: 0.95, luckBonus: 0.003 }
    },
    big_flaming_slime: {
        id: 'big_flaming_slime',
        name: 'Big Flaming Slime',
        tier: 'epic',
        dynamicStats: true,
        level: 20,
        maxhp: 900,
        moveSpeed: 80,
        attackRange: 65,
        attackCooldown: 900,
        damage: [55, 85],
        exp: 700,
        drops: [
            { itemId: 'flame_essence', minQty: 2, maxQty: 5, baseChance: 0.9, luckBonus: 0.003 },
            { itemId: 'major_mana_potion', minQty: 1, maxQty: 2, baseChance: 0.2, luckBonus: 0.02 }
        ],
        gold: { min: 50, max: 100, chance: 0.95, luckBonus: 0.004 }
    },
        devil_spawn: {
        id: 'devil_spawn',
        name: 'Devil Spawn',
        tier: 'legendary',
        dynamicStats: true,
        level: 25,
        maxhp: 1200,
        moveSpeed: 75,
        attackRange: 70,
        attackCooldown: 800,
        damage: [70, 110],
        exp: 1000,
        drops: [
            { itemId: 'demonic_essence', minQty: 3, maxQty: 7, baseChance: 0.95, luckBonus: 0.004 },
            { itemId: 'major_mana_potion', minQty: 1, maxQty: 3, baseChance: 0.25, luckBonus: 0.025 },
            { itemId: 'major_health_potion', minQty: 1, maxQty: 2, baseChance: 0.2, luckBonus: 0.02 },
            { itemId: 'devil_horn', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.001 }
        ],
        gold: { min: 70, max: 140, chance: 0.95, luckBonus: 0.005 }
    },
        // Demon Spawn family (parallel naming, all tiers up to legendary)
        demon_spawn_common: {
            id: 'demon_spawn_common',
            name: 'Demon Spawn',
            tier: 'common',
            dynamicStats: true,
            level: 20,
            maxhp: 520,
            moveSpeed: 70,
            attackRange: 56,
            attackCooldown: 1200,
            damage: [28, 44],
            exp: 360,
            drops: [ { itemId: 'demonic_essence', minQty: 1, maxQty: 2, baseChance: 0.6, luckBonus: 0.002 } ],
            gold: { min: 24, max: 44, chance: 0.9, luckBonus: 0.002 }
        },
        demon_spawn_uncommon: {
            id: 'demon_spawn_uncommon',
            name: 'Demon Fledgling',
            tier: 'uncommon',
            dynamicStats: true,
            level: 22,
            maxhp: 680,
            moveSpeed: 72,
            attackRange: 58,
            attackCooldown: 1160,
            damage: [36, 56],
            exp: 460,
            drops: [ { itemId: 'demonic_essence', minQty: 1, maxQty: 2, baseChance: 0.7, luckBonus: 0.002 } ],
            gold: { min: 28, max: 56, chance: 0.92, luckBonus: 0.0022 }
        },
        demon_spawn_rare: {
            id: 'demon_spawn_rare',
            name: 'Demon Acolyte',
            tier: 'rare',
            dynamicStats: true,
            level: 23,
            maxhp: 820,
            moveSpeed: 74,
            attackRange: 60,
            attackCooldown: 1100,
            damage: [44, 72],
            exp: 620,
            drops: [ { itemId: 'demonic_essence', minQty: 2, maxQty: 4, baseChance: 0.8, luckBonus: 0.0024 } ],
            gold: { min: 36, max: 72, chance: 0.94, luckBonus: 0.0024 }
        },
        demon_spawn_epic: {
            id: 'demon_spawn_epic',
            name: 'Demon Adept',
            tier: 'epic',
            dynamicStats: true,
            level: 25,
            maxhp: 1000,
            moveSpeed: 76,
            attackRange: 66,
            attackCooldown: 980,
            damage: [60, 96],
            exp: 800,
            drops: [ { itemId: 'demonic_essence', minQty: 3, maxQty: 6, baseChance: 0.9, luckBonus: 0.003 } ],
            gold: { min: 50, max: 100, chance: 0.95, luckBonus: 0.003 }
        },
        demon_spawn_legendary: {
            id: 'demon_spawn_legendary',
            name: 'Demon Prime',
            tier: 'legendary',
            dynamicStats: true,
            level: 27,
            maxhp: 1300,
            moveSpeed: 78,
            attackRange: 70,
            attackCooldown: 860,
            damage: [80, 120],
            exp: 1200,
            drops: [
                { itemId: 'demonic_essence', minQty: 4, maxQty: 8, baseChance: 0.96, luckBonus: 0.004 },
                { itemId: 'major_mana_potion', minQty: 1, maxQty: 2, baseChance: 0.28, luckBonus: 0.02 },
                { itemId: 'major_health_potion', minQty: 1, maxQty: 2, baseChance: 0.24, luckBonus: 0.02 }
            ],
            gold: { min: 80, max: 160, chance: 0.96, luckBonus: 0.005 }
        },
    the_lurker: {
        id: 'the_lurker',
        name: 'The Lurker',
        tier: 'boss',
        dynamicStats: true,
        level: 30,
        maxhp: 5000,
        moveSpeed: 60,
        attackRange: 80,
        attackCooldown: 1500,
        damage: [100, 150],
        exp: 5000,
        drops: [
            { itemId: 'lurker_eye', minQty: 1, maxQty: 2, baseChance: 0.75, luckBonus: 0.005 },
            { itemId: 'major_health_potion', minQty: 2, maxQty: 4, baseChance: 0.5, luckBonus: 0.01 }
        ],
        gold: { min: 200, max: 400, chance: 1.0, luckBonus: 0.01 }
    }
};

export default ENEMY_DEFS;
