// levelRanges.js
// Randomized enemy level ranges per area and rarity tier.

function clampInt(v, min = 1, max = 999) {
    v = Math.floor(v);
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

function randInt(min, max) {
    min = Math.floor(min);
    max = Math.floor(max);
    if (max < min) [min, max] = [max, min];
    return clampInt(Math.floor(Math.random() * (max - min + 1)) + min, min, max);
}

// Mapping provided by design request
const AREA_LEVEL_RANGES = {
    innerfield: {
        common: [1, 2],
        uncommon: [1, 3],
        rare: [2, 4],
        epic: [3, 7],
        legendary: [7, 10],
        boss: [10, 15]
    },
    outerfield: {
        common: [2, 3],
        uncommon: [2, 5],
        rare: [3, 7],
        epic: [5, 10],
        legendary: [8, 12],
        boss: [10, 15]
    },
    goblincamp: {
        common: [3, 5],
        uncommon: [4, 7],
        rare: [4, 9],
        epic: [7, 10],
        legendary: [7, 13],
        boss: [15, 20]
    },
    gloamwaybastion: {
        common: [5, 10],
        uncommon: [7, 12],
        rare: [10, 15],
        epic: [13, 17],
        legendary: [15, 20],
        boss: [20, 22]
    },
    gloamwayswamp: {
        common: [15, 25],
        uncommon: [20, 30],
        rare: [20, 30],
        epic: [25, 30],
        legendary: [25, 35],
        boss: [30, 35]
    },
    flameroad: {
        common: [20, 30],
        uncommon: [20, 32],
        rare: [24, 32],
        epic: [28, 32],
        legendary: [30, 38],
        boss: [35, 40]
    }
};

// Normalize tier keys that may have variants (e.g., 'world boss' vs 'world_boss')
function normalizeTier(tier) {
    if (!tier) return 'common';
    const t = String(tier).toLowerCase().trim();
    if (t === 'world boss' || t === 'world_boss' || t === 'worldboss') return 'boss';
    return t;
}

// Normalize area keys passed from scene ids
function normalizeArea(area) {
    if (!area) return null;
    return String(area).toLowerCase().replace(/\s+/g, '');
}

export function getAreaEnemyLevel(area, tier, fallbackLevel = 1) {
    const a = normalizeArea(area);
    const t = normalizeTier(tier);
    const table = (a && AREA_LEVEL_RANGES[a]) ? AREA_LEVEL_RANGES[a] : null;
    const range = table ? table[t] : null;
    if (!range || range.length !== 2) return clampInt(fallbackLevel, 1, 999);
    const [min, max] = range;
    return randInt(min, max);
}

export default { getAreaEnemyLevel };
