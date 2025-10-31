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
    'iron_bar':{
        id: 'iron_bar',
        name: 'Iron Bar',
        tool: 'furnace',
        category: 'material',
        requires: [ { id: 'iron_ore', qty: 2 }, { id: 'coal_ore', qty: 1 } ],
        reqLevel: 3,
        smithingXp: 40
    },
    'iron_sword': {
        id: 'iron_sword',
        name: 'Iron Sword',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'iron_bar', qty: 2 } ],
        reqLevel: 3,
        smithingXp: 60
    },
    'iron_armor': {
        id: 'iron_armor',
        name: 'Iron Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'iron_bar', qty: 5 } ],
        reqLevel: 4,
        smithingXp: 120
    },
    'iron_helmet': {
        id: 'iron_helmet',
        name: 'Iron Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'iron_bar', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 75
    },
    'iron_legs': {
        id: 'iron_legs',
        name: 'Iron Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'iron_bar', qty: 5 } ],
        reqLevel: 5,
        smithingXp: 100
    },
    'iron_boots': {
        id: 'iron_boots',
        name: 'Iron Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'iron_bar', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 75
    },
    'steel_bar':{
        id: 'steel_bar',
        name: 'Steel Bar',
        tool: 'furnace',
        category: 'material',
        requires: [ { id: 'iron_ore', qty: 3 }, { id: 'coal_ore', qty: 2 } ],
        reqLevel: 6,
        smithingXp: 80
    },
    'steel_sword': {
        id: 'steel_sword',
        name: 'Steel Sword',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'steel_bar', qty: 2 } ],
        reqLevel: 6,
        smithingXp: 140
    },
    'steel_dagger': {
        id: 'steel_dagger',
        name: 'Steel Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'steel_bar', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'steel_armor': {
        id: 'steel_armor',
        name: 'Steel Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'steel_bar', qty: 5 } ],
        reqLevel: 6,
        smithingXp: 260
    },
    'steel_helmet': {
        id: 'steel_helmet',
        name: 'Steel Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'steel_bar', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 75
    },
    'steel_legs': {
        id: 'steel_legs',
        name: 'Steel Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'steel_bar', qty: 5 } ],
        reqLevel: 5,
        smithingXp: 100
    },
    'steel_boots': {
        id: 'steel_boots',
        name: 'Steel Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'steel_bar', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 75
    },
    'mythril_bar':{
        id: 'mythril_bar',
        name: 'Mythril Bar',
        tool: 'furnace',
        category: 'material',
        requires: [ { id: 'mythril_ore', qty: 2 }, { id: 'coal_ore', qty: 1 } ],
        reqLevel: 10,
        smithingXp: 220
    },
    'mythril_sword': {
        id: 'mythril_sword',
        name: 'Mythril Sword',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 } ],
        reqLevel: 10,
        smithingXp: 360
    },
    'mythril_armor': {
        id: 'mythril_armor',
        name: 'Mythril Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'mythril_bar', qty: 5 } ],
        reqLevel: 10,
        smithingXp: 700
    },
    'mythril_helmet': {
        id: 'mythril_helmet',
        name: 'Mythril Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'mythril_bar', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 75
    },
    'mythril_legs': {
        id: 'mythril_legs',
        name: 'Mythril Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'mythril_bar', qty: 5 } ],
        reqLevel: 5,
        smithingXp: 100
    },
    'mythril_boots': {
        id: 'mythril_boots',
        name: 'Mythril Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'mythril_bar', qty: 3 } ],
        reqLevel: 5,
        smithingXp: 75
    },
    'lucky_dagger': {
        id: 'lucky_dagger',
        name: 'Lucky Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'emerald', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'alchemist_staff': {
        id: 'alchemist_staff',
        name: 'Alchemist Staff',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 3 }, { id: 'ruby', qty: 1 }, { id: 'normal_log', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'dragon_amulet': {
        id: 'dragon_amulet',
        name: 'Dragon Amulet',
        tool: 'workbench',
        category: 'amulets',
        requires: [ { id: 'dragon_scale', qty: 2 }, { id: 'gold_ingot', qty: 1 } ],
        reqLevel: 25,
        smithingXp: 500
    },
    'dragon_ring': {
        id: 'dragon_ring',
        name: 'Dragon Ring',
        tool: 'workbench',
        category: 'rings',
        requires: [ { id: 'dragon_scale', qty: 1 }, { id: 'gold_ingot', qty: 1 } ],
        reqLevel: 25,
        smithingXp: 500
    },
    'twisted_dagger': {
        id: 'twisted_dagger',
        name: 'Twisted Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'dior_dice': {
        id: 'dior_dice',
        name: 'Dior Dice',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'steel_bar', qty: 2 }, { id: 'gold_ingot', qty: 2 },{ id: 'gold_ore', qty: 2 }, { id: 'opal', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'gold_ingot':{
        id: 'gold_ingot',
        name: 'Gold Ingot',
        tool: 'furnace',
        category: 'material',
        requires: [ { id: 'gold_ore', qty: 1 }, { id: 'coal_ore', qty: 1 } ],
        reqLevel: 6,
        smithingXp: 70
    },
    'enchanted_staff': {
        id: 'enchanted_staff',
        name: 'Enchanted Staff',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'emerald', qty: 1 }, { id: 'normal_log', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'shadow_dagger': {
        id: 'shadow_dagger',
        name: 'Shadow Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'shadow_armor': {
        id: 'shadow_armor',
        name: 'Shadow Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'shadow_helmet': {
        id: 'shadow_helmet',
        name: 'Shadow Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'shadow_legs': {
        id: 'shadow_legs',
        name: 'Shadow Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'shadow_boots': {
        id: 'shadow_boots',
        name: 'Shadow Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'shadow_sword': {
        id: 'shadow_sword',
        name: 'Shadow Sword',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'shadow_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'healing_staff': {
        id: 'healing_staff',
        name: 'Healing Staff',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 1 }, { id: 'emerald', qty: 1 }, { id: 'oak_log', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'healing_amulet': {
        id: 'healing_amulet',
        name: 'Healing Amulet',
        tool: 'workbench',
        category: 'amulets',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 1 } ],
        reqLevel: 15,
        smithingXp: 250
    },
    'healing_ring': {
        id: 'healing_ring',
        name: 'Healing Ring',
        tool: 'workbench',
        category: 'rings',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 1 } ],
        reqLevel: 15,
        smithingXp: 250
    },
    'healing_robe': {
        id: 'healing_robe',
        name: 'Healing Robe',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'healing_hat': {
        id: 'healing_hat',
        name: 'Healing Hat',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'healing_pants': {
        id: 'healing_pants',
        name: 'Healing Pants',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'healing_boots': {
        id: 'healing_boots',
        name: 'Healing Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'healing_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'toxic_dagger': {
        id: 'toxic_dagger',
        name: 'Toxic Dagger',
        tool: 'workbench',
        category: 'weapon',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'toxic_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'toxic_armor': {
        id: 'toxic_armor',
        name: 'Toxic Armor',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'toxic_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'toxic_helmet': {
        id: 'toxic_helmet',
        name: 'Toxic Helmet',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'toxic_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'toxic_legs': {
        id: 'toxic_legs',
        name: 'Toxic Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'toxic_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'toxic_boots': {
        id: 'toxic_boots',
        name: 'Toxic Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'toxic_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'poison_amulet': {
        id: 'poison_amulet',
        name: 'Poison Amulet',
        tool: 'workbench',
        category: 'amulets',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'poison_essence', qty: 1 } ],
        reqLevel: 15,
        smithingXp: 250
    },
    'poison_ring': {
        id: 'poison_ring',
        name: 'Poison Ring',
        tool: 'workbench',
        category: 'rings',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'poison_essence', qty: 1 } ],
        reqLevel: 15,
        smithingXp: 250
    },
    'poison_cloak': {
        id: 'poison_cloak',
        name: 'Poison Cloak',
        tool: 'workbench',
        category: 'armor',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'poison_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'poison_hat': {
        id: 'poison_hat',
        name: 'Poison Hat',
        tool: 'workbench',
        category: 'helm',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'poison_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'poison_legs': {
        id: 'poison_legs',
        name: 'Poison Leggings',
        tool: 'workbench',
        category: 'legs',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'poison_essence', qty: 2 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    'poison_boots': {
        id: 'poison_boots',
        name: 'Poison Boots',
        tool: 'workbench',
        category: 'boots',
        requires: [ { id: 'mythril_bar', qty: 2 }, { id: 'poison_essence', qty: 1 } ],
        reqLevel: 5,
        smithingXp: 50
    },
    

};