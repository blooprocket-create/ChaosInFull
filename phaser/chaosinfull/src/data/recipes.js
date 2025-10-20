export const RECIPE_DEFS = {
    // furnace recipes
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
    'cooked_rat_meat': {
        id: 'cooked_rat_meat',
        name: 'Cooked Rat Meat',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'rat_meat', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_minnow': {
        id: 'cooked_minnow',
        name: 'Cooked Minnow',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'minnow', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_salmon': {
        id: 'cooked_salmon',
        name: 'Cooked Salmon',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'salmon', qty: 1 } ],
        reqLevel: 5,
        cookingXp: 40
    },
    'cooked_tuna': {
        id: 'cooked_tuna',
        name: 'Cooked Tuna',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'tuna', qty: 1 } ],
        reqLevel: 5,
        cookingXp: 42
    },
    'cooked_bass': {
        id: 'cooked_bass',
        name: 'Cooked Bass',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'bass', qty: 1 } ],
        reqLevel: 3,
        cookingXp: 18
    },
    'cooked_mackerel': {
        id: 'cooked_mackerel',
        name: 'Cooked Mackerel',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'mackerel', qty: 1 } ],
        reqLevel: 2,
        cookingXp: 12
    },
    'cooked_sardine': {
        id: 'cooked_sardine',
        name: 'Cooked Sardine',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'sardine', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_anchovy': {
        id: 'cooked_anchovy',
        name: 'Cooked Anchovy',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'anchovy', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_herring': {
        id: 'cooked_herring',
        name: 'Cooked Herring',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'herring', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 10
    },
    'cooked_catfish': {
        id: 'cooked_catfish',
        name: 'Cooked Catfish',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'catfish', qty: 1 } ],
        reqLevel: 4,
        cookingXp: 30
    },
    'cooked_crab': {
        id: 'cooked_crab',
        name: 'Cooked Crab',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'crab', qty: 1 } ],
        reqLevel: 4,
        cookingXp: 32
    },
    'cooked_lobster': {
        id: 'cooked_lobster',
        name: 'Cooked Lobster',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'lobster', qty: 1 } ],
        reqLevel: 6,
        cookingXp: 45
    },
    'cooked_marlin': {
        id: 'cooked_marlin',
        name: 'Cooked Marlin',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'marlin', qty: 1 } ],
        reqLevel: 10,
        cookingXp: 120
    },
    'cooked_giant_turtle': {
        id: 'cooked_giant_turtle',
        name: 'Cooked Giant Turtle',
        tool: 'furnace',
        category: 'food',
        requires: [ { id: 'giant_turtle', qty: 1 } ],
        reqLevel: 12,
        cookingXp: 160
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
