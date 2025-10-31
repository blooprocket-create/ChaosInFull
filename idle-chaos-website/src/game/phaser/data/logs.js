// Definitions for tree types / log nodes used by GraveForest and similar scenes
// Mirrors the structure used by ores.js to allow procedural cluster generation.
export default {
    normal: {
        id: 'normal',
        label: 'Tree',
        // use the new spritesheet key (1 row, 8 frames)
        sprite: 'normal_tree',
        color: 0x2e8b57,
        baseChance: 0.75,
        minEfficiency: 10,
        baseExp: 10,
        baseYield: 1,
        itemId: 'normal_log',
        clusters: 3,
        perCluster: 4,
        clusterRadius: 120
    },
    oak: {
        id: 'oak',
        label: 'Oak Tree',
        sprite: 'oak_tree',
        color: 0x6b8e23,
        baseChance: 0.45,
        minEfficiency: 22,
        baseExp: 22,
        baseYield: 1,
        itemId: 'oak_log',
        clusters: 2,
        perCluster: 3,
        clusterRadius: 140
    },
    pine: {
        id: 'pine',
        label: 'Pine',
        // optional sprite key; will fallback to drawn circle
        sprite: 'pine_tree',
        color: 0x1f6f3a,
        baseChance: 0.5,
        minEfficiency: 28,
        baseExp: 28,
        baseYield: 1,
        itemId: 'pine_log',
        clusters: 2,
        perCluster: 3,
        clusterRadius: 100
    },
    birch: {
        id: 'birch',
        label: 'Birch',
        sprite: 'birch_tree',
        color: 0xaad7a6,
        baseChance: 0.35,
        minEfficiency: 34,
        baseExp: 34,
        baseYield: 1,
        itemId: 'birch_log',
        clusters: 1,
        perCluster: 3,
        clusterRadius: 80
    },
    maple: {
        id: 'maple',
        label: 'Maple',
        sprite: 'maple_tree',
        color: 0xff4500,
        baseChance: 0.25,
        minEfficiency: 40,
        baseExp: 40,
        baseYield: 1,
        itemId: 'maple_log',
        clusters: 1,
        perCluster: 2,
        clusterRadius: 70
    }
};
