export const ITEM_DEFS = {
    'copper_ore': { id: 'copper_ore', name: 'Copper Ore', rarity: 'common', stackable: true, maxStack: 9999, description: 'Dull rocks with delusions of metal grandeur. Smelts into something that vaguely resembles a tool.' },
    'tin_ore': { id: 'tin_ore', name: 'Tin Ore', rarity: 'common', stackable: true, maxStack: 9999, description: 'A soft, panicked metal that melted before it could make better life choices.' },
    'copper_bar': { id: 'copper_bar', name: 'Copper Bar', rarity: 'common', stackable: true, maxStack: 9999, description: 'Forged from ore and broken promises. Good for crafting and dulling your enemies\' expectations.' },
    'bronze_bar': { id: 'bronze_bar', name: 'Bronze Bar', rarity: 'common', stackable: true, maxStack: 9999, description: 'Alloyed from two metals and one existential crisis. Holds together until it doesn\'t.' },
    'copper_dagger': { id: 'copper_dagger', name: 'Copper Dagger', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,3], statBonus: { agi: 1 }, description: 'Sharp enough to ruin someone\'s day, but still mostly useful for opening suspiciously labeled crates.' },
    'bronze_dagger': { id: 'bronze_dagger', name: 'Bronze Dagger', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [2,4], statBonus: { agi: 1 }, description: 'A stabby object with commitment issues — looks menacing until it meets armor.' },
    'copper_armor': { id: 'copper_armor', name: 'Copper Armor', rarity: 'common', stackable: false, maxStack: 1, armor: true, defense: 3, description: 'Fashioned to protect you from insults and low-level goblin attacks. Slightly mismatched to your soul.' },
    // Starter weapons (used as item defs for starting choices)
    'starter_sword': { id: 'starter_sword', name: 'Sword', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { str: 3 }, description: 'Your first lesson in brutally honest conflict resolution. Also great for slicing cake.' },
    'starter_staff': { id: 'starter_staff', name: 'Staff', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { int: 3 }, description: 'A stick with opinions. Channels magic and passive-aggressive commentary.' },
    'starter_dagger': { id: 'starter_dagger', name: 'Dagger', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { agi: 3 }, description: 'Small, angular, and excellent at popping egos and balloons.' },
    'starter_dice': { id: 'starter_dice', name: 'Dice in a Bag', rarity: 'common', stackable: false, maxStack: 1, weapon: true, damage: [1,1], statBonus: { luk: 3 }, description: 'Fate in soft, rattly form. Roll well and maybe the universe will owe you one.' },
    // Slime drops
    'slime_gel': { id: 'slime_gel', name: 'Slime Gel', rarity: 'common', stackable: true, maxStack: 999, description: 'Sticky residue left behind by common slimes. Smells faintly of regret and old socks.' },
    'slime_core': { id: 'slime_core', name: 'Glowing Slime Core', rarity: 'rare', stackable: true, maxStack: 99, description: 'A pulsing core that hums with condensed mana. Slightly warm, like a tiny sun of poor decisions.' },
    'slime_crown_shard': { id: 'slime_crown_shard', name: 'Royal Slime Crown Shard', rarity: 'epic', stackable: false, maxStack: 1, description: 'A fragment of a monarch slime crown. It radiates confidence and the faint whiff of tyranny.', statBonus: { luk: 2 } },
    'slime_whip': { id: 'slime_whip', name: 'Gel Lash', rarity: 'rare', stackable: false, maxStack: 1, weapon: true, damage: [3,6], statBonus: { agi: 2, luk: 1 }, description: 'A whip that slaps enemies and occasionally apologizes in gooey tones.' },
};
