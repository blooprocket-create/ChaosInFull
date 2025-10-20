export const RECIPE_DEFS = {
    // furnace recipes (already implemented in scene logic) kept for reference
    'copper_bar': {
        id: 'copper_bar',
        name: 'Copper Bar',
        tool: 'furnace',
        category: 'material',
        requires: [ { id: 'copper_ore', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 12
    },
    'bronze_bar': {
        id: 'bronze_bar',
        name: 'Bronze Bar',
        tool: 'furnace',
        category: 'material',
        requires: [ { id: 'copper_ore', qty: 1 }, { id: 'tin_ore', qty: 1 } ],
        reqLevel: 1,
        smithingXp: 15
    },
    // workbench recipes (craft weapons)
    'copper_dagger': {
        id: 'copper_dagger',
        name: 'Copper Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'copper_bar', qty: 1 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_dagger': {
        id: 'bronze_dagger',
        name: 'Bronze Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'bronze_bar', qty: 1 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_armor': {
        id: 'copper_armor',
        name: 'Copper Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'copper_bar', qty: 4 } ],
        reqLevel: 2,
        smithingXp: 40
    },
    'bronze_armor': {
        id: 'bronze_armor',
        name: 'Bronze Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'bronze_bar', qty: 4 } ],
        reqLevel: 2,
        smithingXp: 70
    },
    'copper_sword': {
        id: 'copper_sword',
        name: 'Copper Sword',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_sword': {
        id: 'bronze_sword',
        name: 'Bronze Sword',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_helmet': {
        id: 'copper_helmet',
        name: 'Copper Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_helmet': {
        id: 'bronze_helmet',
        name: 'Bronze Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_legs': {
        id: 'copper_legs',
        name: 'Copper Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_legs': {
        id: 'bronze_legs',
        name: 'Bronze Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_boots': {
        id: 'copper_boots',
        name: 'Copper Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_boots': {
        id: 'bronze_boots',
        name: 'Bronze Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'slime_ring': {
        id: 'slime_ring',
        name: 'Slime Ring',
        tool: 'workbench',
        category: 'rings',
        requires: [ { id: 'slime_core', qty: 1 }, { id: 'slime_gel', qty: 5 } ],
        reqLevel: 5,
        smithingXp: 150
    },
    'slime_amulet': {
        id: 'slime_amulet',
        name: 'Slime Amulet',
        tool: 'workbench',
        category: 'amulets',
        requires: [ { id: 'slime_core', qty: 1 }, { id: 'slime_gel', qty: 5 }, { id: 'copper_bar', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 180
    },
    'sticky_dice': {
        id: 'sticky_dice',
        name: 'Sticky Dice',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'slime_core', qty: 6 }, { id: 'slime_gel', qty: 6 } ],
        reqLevel: 5,
        smithingXp: 250
    },
    'green_staff': {
        id: 'green_staff',
        name: 'Green Staff',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'slime_core', qty: 1 }, { id: 'spectral_essence', qty: 3 }, { id: 'normal_log', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 150
    },
};
