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
        category: 'meat',
        requires: [ { id: 'rat_meat', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_minnow': {
        id: 'cooked_minnow',
        name: 'Cooked Minnow',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'minnow', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_salmon': {
        id: 'cooked_salmon',
        name: 'Cooked Salmon',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'salmon', qty: 1 } ],
        reqLevel: 5,
        cookingXp: 40
    },
    'cooked_tuna': {
        id: 'cooked_tuna',
        name: 'Cooked Tuna',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'tuna', qty: 1 } ],
        reqLevel: 5,
        cookingXp: 42
    },
    'cooked_bass': {
        id: 'cooked_bass',
        name: 'Cooked Bass',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'bass', qty: 1 } ],
        reqLevel: 3,
        cookingXp: 18
    },
    'cooked_mackerel': {
        id: 'cooked_mackerel',
        name: 'Cooked Mackerel',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'mackerel', qty: 1 } ],
        reqLevel: 2,
        cookingXp: 12
    },
    'cooked_sardine': {
        id: 'cooked_sardine',
        name: 'Cooked Sardine',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'sardine', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_anchovy': {
        id: 'cooked_anchovy',
        name: 'Cooked Anchovy',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'anchovy', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 8
    },
    'cooked_herring': {
        id: 'cooked_herring',
        name: 'Cooked Herring',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'herring', qty: 1 } ],
        reqLevel: 1,
        cookingXp: 10
    },
    'cooked_catfish': {
        id: 'cooked_catfish',
        name: 'Cooked Catfish',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'catfish', qty: 1 } ],
        reqLevel: 4,
        cookingXp: 30
    },
    'cooked_crab': {
        id: 'cooked_crab',
        name: 'Cooked Crab',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'crab', qty: 1 } ],
        reqLevel: 4,
        cookingXp: 32
    },
    'cooked_lobster': {
        id: 'cooked_lobster',
        name: 'Cooked Lobster',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'lobster', qty: 1 } ],
        reqLevel: 6,
        cookingXp: 45
    },
    'cooked_marlin': {
        id: 'cooked_marlin',
        name: 'Cooked Marlin',
        tool: 'furnace',
        category: 'fish',
        requires: [ { id: 'marlin', qty: 1 } ],
        reqLevel: 10,
        cookingXp: 120
    },
    'cooked_giant_turtle': {
        id: 'cooked_giant_turtle',
        name: 'Cooked Giant Turtle',
        tool: 'furnace',
        category: 'meat',
        requires: [ { id: 'giant_turtle', qty: 1 } ],
        reqLevel: 12,
        cookingXp: 160
    },

    // additional cooking recipes for expanded fish list
    'cooked_pond_roach': { id: 'cooked_pond_roach', name: 'Cooked Pond Roach', tool: 'furnace', category: 'fish', requires: [ { id: 'pond_roach', qty: 1 } ], reqLevel: 1, cookingXp: 6 },
    'cooked_reed_perch': { id: 'cooked_reed_perch', name: 'Cooked Reed Perch', tool: 'furnace', category: 'fish', requires: [ { id: 'reed_perch', qty: 1 } ], reqLevel: 1, cookingXp: 8 },
    'cooked_sunfish': { id: 'cooked_sunfish', name: 'Cooked Sunfish', tool: 'furnace', category: 'fish', requires: [ { id: 'sunfish', qty: 1 } ], reqLevel: 1, cookingXp: 7 },
    'cooked_pond_crablet': { id: 'cooked_pond_crablet', name: 'Cooked Crablet', tool: 'furnace', category: 'fish', requires: [ { id: 'pond_crablet', qty: 1 } ], reqLevel: 1, cookingXp: 10 },
    'cooked_rock_trout': { id: 'cooked_rock_trout', name: 'Cooked Rock Trout', tool: 'furnace', category: 'fish', requires: [ { id: 'rock_trout', qty: 1 } ], reqLevel: 2, cookingXp: 18 },
    'cooked_river_pike': { id: 'cooked_river_pike', name: 'Cooked River Pike', tool: 'furnace', category: 'fish', requires: [ { id: 'river_pike', qty: 1 } ], reqLevel: 3, cookingXp: 28 },
    'cooked_silver_mullet': { id: 'cooked_silver_mullet', name: 'Cooked Silver Mullet', tool: 'furnace', category: 'fish', requires: [ { id: 'silver_mullet', qty: 1 } ], reqLevel: 2, cookingXp: 16 },
    'cooked_coastal_snapper': { id: 'cooked_coastal_snapper', name: 'Cooked Coastal Snapper', tool: 'furnace', category: 'fish', requires: [ { id: 'coastal_snapper', qty: 1 } ], reqLevel: 2, cookingXp: 20 },
    'cooked_silvercarp': { id: 'cooked_silvercarp', name: 'Cooked Silver Carp', tool: 'furnace', category: 'fish', requires: [ { id: 'silvercarp', qty: 1 } ], reqLevel: 4, cookingXp: 70 },
    'cooked_shadow_eel': { id: 'cooked_shadow_eel', name: 'Cooked Shadow Eel', tool: 'furnace', category: 'fish', requires: [ { id: 'shadow_eel', qty: 1 } ], reqLevel: 4, cookingXp: 75 },
    'cooked_river_wyrm': { id: 'cooked_river_wyrm', name: 'Cooked River Wyrm', tool: 'furnace', category: 'fish', requires: [ { id: 'river_wyrm', qty: 1 } ], reqLevel: 4, cookingXp: 68 },
    'cooked_storm_clam': { id: 'cooked_storm_clam', name: 'Cooked Storm Clam', tool: 'furnace', category: 'fish', requires: [ { id: 'storm_clam', qty: 1 } ], reqLevel: 4, cookingXp: 80 },
    'cooked_glowshrimp': { id: 'cooked_glowshrimp', name: 'Cooked Glow Shrimp', tool: 'furnace', category: 'fish', requires: [ { id: 'glowshrimp', qty: 1 } ], reqLevel: 3, cookingXp: 20 },
    'cooked_tinny_nautilus': { id: 'cooked_tinny_nautilus', name: 'Cooked Tinny Nautilus', tool: 'furnace', category: 'fish', requires: [ { id: 'tinny_nautilus', qty: 1 } ], reqLevel: 4, cookingXp: 60 },
    'cooked_nightling': { id: 'cooked_nightling', name: 'Cooked Nightling', tool: 'furnace', category: 'fish', requires: [ { id: 'nightling', qty: 1 } ], reqLevel: 4, cookingXp: 65 },
    // sea-vegetable salads
    'dried_seaweed': { id: 'dried_seaweed', name: 'Dried Seaweed', tool: 'furnace', category: 'salad', requires: [ { id: 'seaweed', qty: 1 } ], reqLevel: 1, cookingXp: 6 },
    'kelp_salad': { id: 'kelp_salad', name: 'Kelp Salad', tool: 'furnace', category: 'salad', requires: [ { id: 'seaweed', qty: 2 }, { id: 'dried_seaweed', qty: 1 } ], reqLevel: 2, cookingXp: 22 },
    'cooked_abyssal_grouper': { id: 'cooked_abyssal_grouper', name: 'Cooked Abyssal Grouper', tool: 'furnace', category: 'fish', requires: [ { id: 'abyssal_grouper', qty: 1 } ], reqLevel: 8, cookingXp: 220 },
    'cooked_moon_shrike': { id: 'cooked_moon_shrike', name: 'Cooked Moon Shrike', tool: 'furnace', category: 'fish', requires: [ { id: 'moon_shrike', qty: 1 } ], reqLevel: 8, cookingXp: 240 },
    'cooked_deep_sabre': { id: 'cooked_deep_sabre', name: 'Cooked Deep Sabrefish', tool: 'furnace', category: 'fish', requires: [ { id: 'deep_sabre', qty: 1 } ], reqLevel: 9, cookingXp: 300 },
    'cooked_leviathan_spawn': { id: 'cooked_leviathan_spawn', name: 'Cooked Leviathan Spawn', tool: 'furnace', category: 'meat', requires: [ { id: 'leviathan_spawn', qty: 1 } ], reqLevel: 15, cookingXp: 1000 },
    'cooked_celestial_whale': { id: 'cooked_celestial_whale', name: 'Cooked Celestial Whale', tool: 'furnace', category: 'meat', requires: [ { id: 'celestial_whale', qty: 1 } ], reqLevel: 16, cookingXp: 1200 },

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
