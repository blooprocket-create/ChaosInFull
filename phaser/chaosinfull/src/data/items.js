export const ITEM_DEFS = {
    'copper_ore': { id: 'copper_ore', name: 'Copper Ore', rarity: 'common', stackable: true, maxStack: 9999 },
    'tin_ore': { id: 'tin_ore', name: 'Tin Ore', rarity: 'common', stackable: true, maxStack: 9999 },
    'copper_bar': { id: 'copper_bar', name: 'Copper Bar', rarity: 'common', stackable: true, maxStack: 9999 },
    'bronze_bar': { id: 'bronze_bar', name: 'Bronze Bar', rarity: 'common', stackable: true, maxStack: 9999 },
    'copper_dagger': { id: 'copper_dagger', name: 'Copper Dagger', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,3], statBonus: { agi: 1 } },
    'bronze_dagger': { id: 'bronze_dagger', name: 'Bronze Dagger', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [2,4], statBonus: { agi: 1 } },
    'copper_armor': { id: 'copper_armor', name: 'Copper Armor', rarity: 'common', stackable: false, maxStack: 1, armor: true, defense: 3 },
    // Starter weapons (used as item defs for starting choices)
    'starter_sword': { id: 'starter_sword', name: 'Sword', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { str: 3 } },
    'starter_staff': { id: 'starter_staff', name: 'Staff', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { int: 3 } },
    'starter_dagger': { id: 'starter_dagger', name: 'Dagger', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { agi: 3 } },
    'starter_dice': { id: 'starter_dice', name: 'Dice in a Bag', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { luk: 3 } },
    // Slime drops
    'slime_gel': { id: 'slime_gel', name: 'Slime Gel', rarity: 'common', stackable: true, maxStack: 999, description: 'Sticky residue left behind by common slimes.' },
    'slime_core': { id: 'slime_core', name: 'Glowing Slime Core', rarity: 'rare', stackable: true, maxStack: 99, description: 'A pulsing core that hums with condensed mana.' },
    'slime_crown_shard': { id: 'slime_crown_shard', name: 'Royal Slime Crown Shard', rarity: 'epic', stackable: false, maxStack: 1, description: 'A fragment of a monarch slime crown. It radiates confidence.', statBonus: { luk: 2 } },
    'slime_whip': { id: 'slime_whip', name: 'Gel Lash', rarity: 'rare', stackable: false, maxStack: 1, weapon: true, damage: [3,6], statBonus: { agi: 2, luk: 1 } },
};
