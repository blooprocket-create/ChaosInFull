// Ore definitions for procedural cave generation (Professional MMO-style)
// New system: Guaranteed success, node health/depletion, clear level gates, predictable mechanics
const ORE_DEFS = {
    tin: {
        id: 'tin',
        label: 'Tin',
        sprite: 'tin',
        color: 0x9bb7c9,
        itemId: 'tin_ore',
        // Level and requirements
        reqLevel: 1,
        // Node health (hits to deplete)
        maxHealth: 3,
        // Guaranteed yield per hit
        yieldPerHit: 1,
        // XP per successful hit (balanced for smooth 1-10 progression)
        xpPerHit: 25, // Increased from 10 (75 XP per node)
        // Base mining speed (ms per hit) - reduced by efficiency
        baseSpeed: 2800,
        // Respawn time after depletion (ms)
        respawnTime: 45000, // 45 seconds
        // Generation settings
        clusters: 3,
        perCluster: 5,
        clusterRadius: 90
    },
    copper: {
        id: 'copper',
        label: 'Copper',
        sprite: 'copper',
        color: 0x8a7766,
        itemId: 'copper_ore',
        reqLevel: 1,
        maxHealth: 4,
        yieldPerHit: 1,
        xpPerHit: 35, // Increased from 15 (140 XP per node)
        baseSpeed: 3000,
        respawnTime: 50000,
        clusters: 2,
        perCluster: 4,
        clusterRadius: 110
    },
    iron: {
        id: 'iron',
        label: 'Iron',
        sprite: 'iron',
        color: 0x7d7f7d,
        itemId: 'iron_ore',
        reqLevel: 15,
        maxHealth: 5,
        yieldPerHit: 1,
        xpPerHit: 80, // Increased from 35 (400 XP per node)
        baseSpeed: 3200,
        respawnTime: 60000,
        clusters: 2,
        perCluster: 3,
        clusterRadius: 120
    },
    coal: {
        id: 'coal',
        label: 'Coal',
        sprite: 'coal',
        color: 0x4e4e4e,
        itemId: 'coal_ore',
        reqLevel: 10,
        maxHealth: 4,
        yieldPerHit: 1,
        xpPerHit: 55, // Increased from 25 (220 XP per node)
        baseSpeed: 2900,
        respawnTime: 55000,
        clusters: 2,
        perCluster: 3,
        clusterRadius: 130
    },
    mythril: {
        id: 'mythril',
        label: 'Mythril',
        sprite: 'mythril',
        color: 0x9b7c9b,
        itemId: 'mythril_ore',
        reqLevel: 30,
        maxHealth: 6,
        yieldPerHit: 1,
        xpPerHit: 200, // Increased from 80 (1200 XP per node)
        baseSpeed: 3500,
        respawnTime: 90000,
        clusters: 1,
        perCluster: 2,
        clusterRadius: 140
    },
    gold: {
        id: 'gold',
        label: 'Gold',
        sprite: 'gold',
        color: 0xffd700,
        itemId: 'gold_ore',
        reqLevel: 40,
        maxHealth: 7,
        yieldPerHit: 1,
        xpPerHit: 350, // Increased from 120 (2450 XP per node)
        baseSpeed: 3800,
        respawnTime: 120000,
        clusters: 1,
        perCluster: 1,
        clusterRadius: 160
    },
    // Gems: Higher level, rare, faster to mine but fewer nodes
    emerald: {
        id: 'emerald',
        label: 'Emerald',
        sprite: 'emerald',
        color: 0x50c878,
        itemId: 'emerald',
        reqLevel: 50,
        maxHealth: 2,
        yieldPerHit: 1,
        xpPerHit: 500, // Increased from 150 (1000 XP per node)
        baseSpeed: 2500,
        respawnTime: 180000, // 3 minutes
        clusters: 1,
        perCluster: 1,
        clusterRadius: 180
    },
    ruby: {
        id: 'ruby',
        label: 'Ruby',
        sprite: 'ruby',
        color: 0xe0115f,
        itemId: 'ruby',
        reqLevel: 55,
        maxHealth: 2,
        yieldPerHit: 1,
        xpPerHit: 600, // Increased from 180 (1200 XP per node)
        baseSpeed: 2500,
        respawnTime: 180000,
        clusters: 1,
        perCluster: 1,
        clusterRadius: 200
    },
    sapphire: {
        id: 'sapphire',
        label: 'Sapphire',
        sprite: 'sapphire',
        color: 0x0f52ba,
        itemId: 'sapphire',
        reqLevel: 55,
        maxHealth: 2,
        yieldPerHit: 1,
        xpPerHit: 600, // Increased from 180 (1200 XP per node)
        baseSpeed: 2500,
        respawnTime: 180000,
        clusters: 1,
        perCluster: 1,
        clusterRadius: 200
    },
    opal: {
        id: 'opal',
        label: 'Opal',
        sprite: 'opal',
        color: 0xA8C3BC,
        itemId: 'opal',
        reqLevel: 70,
        maxHealth: 3,
        yieldPerHit: 1,
        xpPerHit: 900, // Increased from 250 (2700 XP per node)
        baseSpeed: 2800,
        respawnTime: 240000, // 4 minutes
        clusters: 1,
        perCluster: 1,
        clusterRadius: 200
    },
    diamond: {
        id: 'diamond',
        label: 'Diamond',
        sprite: 'diamond',
        color: 0xb9f2ff,
        itemId: 'diamond',
        reqLevel: 85,
        maxHealth: 3,
        yieldPerHit: 1,
        xpPerHit: 1400, // Increased from 350 (4200 XP per node)
        baseSpeed: 3000,
        respawnTime: 300000, // 5 minutes
        clusters: 1,
        perCluster: 1,
        clusterRadius: 220
    }

};

if (typeof window !== 'undefined') window.ORE_DEFS = ORE_DEFS;
export default ORE_DEFS;
