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
};
