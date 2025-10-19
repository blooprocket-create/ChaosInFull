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
    }
    ,
    'copper_armor': {
        id: 'copper_armor',
        name: 'Copper Armor',
        tool: 'workbench',
        requires: [ { id: 'copper_bar', qty: 4 } ],
        reqLevel: 2,
        smithingXp: 40
    }
};
