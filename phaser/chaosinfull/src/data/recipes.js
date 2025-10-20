export const RECIPE_DEFS = {
    // furnace recipes (already implemented in scene logic) kept for reference
    'copper_bar': {
        id: 'copper_bar',
        name: 'Copper Bar',
        tool: 'furnace',
        requires: [ { id: 'copper_ore', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 12
    },
    'bronze_bar': {
        id: 'bronze_bar',
        name: 'Bronze Bar',
        tool: 'furnace',
        requires: [ { id: 'copper_ore', qty: 1 }, { id: 'tin_ore', qty: 1 } ],
        reqLevel: 1,
        smithingXp: 15
    },
    // workbench recipes (craft weapons)
    'copper_dagger': {
        id: 'copper_dagger',
        name: 'Copper Dagger',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 1 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_dagger': {
        id: 'bronze_dagger',
        name: 'Bronze Dagger',
        tool: 'workbench',
        requires: [ { id: 'bronze_bar', qty: 1 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_armor': {
        id: 'copper_armor',
        name: 'Copper Armor',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 4 } ],
        reqLevel: 2,
        smithingXp: 40
    },
    'bronze_armor': {
        id: 'bronze_armor',
        name: 'Bronze Armor',
        tool: 'workbench',
        requires: [ { id: 'bronze_bar', qty: 4 } ],
        reqLevel: 2,
        smithingXp: 70
    },
    'copper_sword': {
        id: 'copper_sword',
        name: 'Copper Sword',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_sword': {
        id: 'bronze_sword',
        name: 'Bronze Sword',
        tool: 'workbench',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_helmet': {
        id: 'copper_helmet',
        name: 'Copper Helmet',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_helmet': {
        id: 'bronze_helmet',
        name: 'Bronze Helmet',
        tool: 'workbench',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_legs': {
        id: 'copper_legs',
        name: 'Copper Leggings',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_legs': {
        id: 'bronze_legs',
        name: 'Bronze Leggings',
        tool: 'workbench',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'copper_boots': {
        id: 'copper_boots',
        name: 'Copper Boots',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 20
    },
    'bronze_boots': {
        id: 'bronze_boots',
        name: 'Bronze Boots',
        tool: 'workbench',
        requires: [ { id: 'bronze_bar', qty: 2 } ],
        reqLevel: 1,
        smithingXp: 25
    },
    'slime_ring': {
        id: 'slime_ring',
        name: 'Slime Ring',
        tool: 'workbench',
        requires: [ { id: 'slime_core', qty: 1 }, { id: 'slime_gel', qty: 5 } ],
        reqLevel: 5,
        smithingXp: 150
    },
    'slime_amulet': {
        id: 'slime_amulet',
        name: 'Slime Amulet',
        tool: 'workbench',
        requires: [ { id: 'slime_core', qty: 1 }, { id: 'slime_gel', qty: 5 }, { id: 'copper_bar', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 180
    }
};
