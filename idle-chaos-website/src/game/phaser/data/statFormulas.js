// statFormulas.js
// Compute enemy stats from level and rarity (tier). New enemies can set `dynamicStats: true`
// in their definition to use these formulas, or enable globally with window.USE_DYNAMIC_ENEMY_STATS = true

export const RARITY_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.15,
    rare: 1.35,
    epic: 1.6,
    legendary: 2.5,
    boss: 6.0,
    'world boss': 12.0,
    world_boss: 12.0
};

function clampInt(v, min = 0) { return Math.max(min, Math.floor(v)); }

export function computeEnemyStats(def = {}) {
    // def should include at least: level (number) and tier (string)
    const level = Math.max(1, parseInt(def.level || 1, 10));
    const tier = (def.tier || 'common').toLowerCase();
    const mult = RARITY_MULTIPLIERS[tier] || 1.0;

    // Base HP formula: scales roughly exponentially with level, modulated by rarity
    // tuned to produce reasonable numbers for low levels while allowing bosses to spike
    const baseHp = 18; // baseline per-level constant
    const hp = clampInt((baseHp * Math.pow(level, 1.18)) * mult, 1);

    // Damage: produce a min/max around a scaled average from level and rarity
    const dmgBase = Math.max(1, (Math.pow(level, 1.02) * 1.4) * mult);
    // variance scales with level too so higher level enemies have wider ranges
    const dmgVariance = Math.max(1, Math.round(dmgBase * 0.45));
    const dmgMin = Math.max(1, Math.round(dmgBase - dmgVariance));
    const dmgMax = Math.max(dmgMin + 1, Math.round(dmgBase + dmgVariance));

    // Exp reward scales with level and rarity
    const exp = clampInt(Math.round(8 * Math.pow(level, 1.1) * mult));

    // Gold drops: create a small range scaled by level and rarity
    const goldAvg = Math.max(0, Math.round((level * 0.9) * (mult / 1.2)));
    const goldMin = Math.max(0, Math.floor(goldAvg * 0.6));
    const goldMax = Math.max(goldMin, Math.ceil(goldAvg * 1.6));

    // Attack cooldown: faster for higher-agi/low-tier mobs — prefer preserving explicit value if present
    const attackCooldown = (typeof def.attackCooldown === 'number') ? def.attackCooldown : Math.max(420, Math.round(1400 - (level * 18) * Math.min(1.4, mult)));

    // Move speed: preserve explicit moveSpeed if present otherwise derive a simple value
    const moveSpeed = (typeof def.moveSpeed === 'number') ? def.moveSpeed : Math.round(60 + (level * 3) + (mult - 1) * 8);

    // Attack range: preserve if present
    const attackRange = (typeof def.attackRange === 'number') ? def.attackRange : Math.round(36 + (Math.min(level, 12) * 2));

    return Object.assign({}, def, {
        maxhp: hp,
        damage: [dmgMin, dmgMax],
        exp: exp,
        gold: def.gold || { min: goldMin, max: goldMax, chance: 0.9 },
        attackCooldown,
        moveSpeed,
        attackRange
    });
}

export default { RARITY_MULTIPLIERS, computeEnemyStats };
