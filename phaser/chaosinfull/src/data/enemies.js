export const ENEMY_DEFS = {
    slime_common: {
        id: 'slime_common',
        name: 'Slime',
        tier: 'common',
        level: 2,
        maxhp: 45,
        moveSpeed: 80,
        attackRange: 48,
        attackCooldown: 1400,
        damage: [3, 6],
        exp: 18,
        drops: [
            { itemId: 'slime_gel', minQty: 1, maxQty: 2, baseChance: 0.92, luckBonus: 0.01 },
            { itemId: 'slime_whip', minQty: 1, maxQty: 1, baseChance: 0.05, luckBonus: 0.003 }
        ]
    },
    slime_epic: {
        id: 'slime_epic',
        name: 'Glowing Slime',
        tier: 'epic',
        level: 5,
        maxhp: 110,
        moveSpeed: 95,
        attackRange: 56,
        attackCooldown: 1200,
        damage: [6, 11],
        exp: 55,
        drops: [
            { itemId: 'slime_gel', minQty: 1, maxQty: 3, baseChance: 0.96, luckBonus: 0.015 },
            { itemId: 'slime_core', minQty: 1, maxQty: 2, baseChance: 0.35, luckBonus: 0.01 },
            { itemId: 'slime_whip', minQty: 1, maxQty: 1, baseChance: 0.12, luckBonus: 0.006 }
        ]
    },
    slime_boss: {
        id: 'slime_boss',
        name: 'Royal Slime',
        tier: 'boss',
        level: 10,
        maxhp: 320,
        moveSpeed: 70,
        attackRange: 64,
        attackCooldown: 900,
        damage: [12, 20],
        exp: 220,
        drops: [
            { itemId: 'slime_gel', minQty: 1, maxQty: 9, baseChance: 1.0, luckBonus: 0.02 },
            { itemId: 'slime_core', minQty: 2, maxQty: 4, baseChance: 0.6, luckBonus: 0.015 },
            { itemId: 'slime_crown_shard', minQty: 1, maxQty: 1, baseChance: 0.25, luckBonus: 0.01 }
        ]
    }
};

export default ENEMY_DEFS;
