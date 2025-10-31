const ITEM_DEFS = {
    "admin_godmode": {
        "id": "admin_godmode",
        "name": "God Mode Toggle",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "value": 100000,
        "description": "An omnipotent artifact that grants the wielder invincibility and the ability to ignore game rules. Use with caution, as it may lead to existential boredom."
    },
    "admin_weapon": {
        "id": "admin_weapon",
        "name": "Admin Weapon",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            100,
            200
        ],
        "statBonus": {
            "str": 100,
            "int": 100,
            "agi": 100,
            "luk": 100
        },
        "defense": 100,
        "value": 100000,
        "description": "A weapon of unparalleled power, capable of obliterating any foe with a single strike. Wielded only by those who command the very fabric of the game world."
    },
    "copper_ore": {
        "id": "copper_ore",
        "name": "Copper Ore",
        "rarity": "common",
        "stackable": true,
        "maxStack": 9999,
        "value": 1,
        "description": "Dull rocks with delusions of metal grandeur. Smelts into something that vaguely resembles a tool."
    },
    "tin_ore": {
        "id": "tin_ore",
        "name": "Tin Ore",
        "rarity": "common",
        "stackable": true,
        "maxStack": 9999,
        "value": 1,
        "description": "A soft, panicked metal that melted before it could make better life choices."
    },
    "copper_bar": {
        "id": "copper_bar",
        "name": "Copper Bar",
        "rarity": "common",
        "stackable": true,
        "maxStack": 9999,
        "value": 3,
        "description": "Forged from ore and broken promises. Good for crafting and dulling your enemies' expectations."
    },
    "bronze_bar": {
        "id": "bronze_bar",
        "name": "Bronze Bar",
        "rarity": "common",
        "stackable": true,
        "maxStack": 9999,
        "value": 3,
        "description": "Alloyed from two metals and one existential crisis. Holds together until it doesn't."
    },
    "steel_bar": {
        "id": "steel_bar",
        "name": "Steel Bar",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 9999,
        "value": 19,
        "description": "Tempered with fire and the tears of blacksmiths. Strong enough to make your enemies reconsider their life choices."
    },
    "iron_bar": {
        "id": "iron_bar",
        "name": "Iron Bar",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 9999,
        "value": 12,
        "description": "A sturdy bar that's as reliable as your morning coffee. Good for crafting and bashing things."
    },
    "iron_ore": {
        "id": "iron_ore",
        "name": "Iron Ore",
        "rarity": "common",
        "stackable": true,
        "maxStack": 9999,
        "value": 2,
        "description": "Heavy rocks that dream of becoming something more. Smelts into a dependable metal."
    },
    "dragon_scale": {
        "id": "dragon_scale",
        "name": "Dragon Scale",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 99,
        "value": 500,
        "description": "A shimmering scale from a legendary dragon. Said to possess magical properties and a stubborn refusal to be ignored."
    },
    "mythril_bar": {
        "id": "mythril_bar",
        "name": "Mythril Bar",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 999,
        "value": 2167,
        "description": "A rare and lightweight metal that glows faintly in the dark. Perfect for crafting gear that makes you look cool while being deadly."
    },
    "mythril_ore": {
        "id": "mythril_ore",
        "name": "Mythril Ore",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 999,
        "value": 150,
        "description": "A rare ore that shimmers with an otherworldly light. Smelts into mythril bars, coveted by adventurers and blacksmiths alike."
    },
    "gold_ingot": {
        "id": "gold_ingot",
        "name": "Gold Ingot",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 999,
        "value": 244,
        "description": "A shiny bar of gold. Valuable for trading, crafting, or impressing people at parties."
    },
    "gold_ore": {
        "id": "gold_ore",
        "name": "Gold Ore",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 999,
        "value": 60,
        "description": "A chunk of rock that glimmers with the promise of wealth. Smelts into gold ingots, perfect for those looking to strike it rich."
    },
    "emerald": {
        "id": "emerald",
        "name": "Emerald",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 99,
        "value": 300,
        "description": "A dazzling green gem that sparkles with inner fire. Coveted by jewelers and adventurers alike for its beauty and value."
    },
    "ruby": {
        "id": "ruby",
        "name": "Ruby",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 99,
        "value": 350,
        "description": "A fiery red gem that seems to pulse with life. Highly sought after for its rarity and stunning appearance."
    },
    "sapphire": {
        "id": "sapphire",
        "name": "Sapphire",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 99,
        "value": 320,
        "description": "A deep blue gem that glows with an inner light. Prized for its beauty and mystical properties."
    },
    "opal": {
        "id": "opal",
        "name": "Opal",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 99,
        "value": 200,
        "description": "A mesmerizing gem that shimmers with a rainbow of colors. Valued for its unique appearance and enchanting qualities."
    },
    "diamond": {
        "id": "diamond",
        "name": "Diamond",
        "rarity": "legendary",
        "stackable": true,
        "maxStack": 99,
        "value": 1000,
        "description": "The hardest and most precious of gems. Symbolizes strength and eternal love, often used in the finest jewelry."
    },
    "coal_ore": {
        "id": "coal_ore",
        "name": "Coal Ore",
        "rarity": "common",
        "stackable": true,
        "maxStack": 9999,
        "value": 1,
        "description": "Black rocks that are great for fueling fires and forging dreams into reality."
    },
    "toxic_essence": {
        "id": "toxic_essence",
        "name": "Toxic Essence",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 99,
        "value": 50,
        "description": "A vial of concentrated toxic essence. Used in crafting poisonous weapons and armor."
    },
    "healing_essence": {
        "id": "healing_essence",
        "name": "Healing Essence",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 99,
        "value": 120,
        "description": "A vial of concentrated healing essence. Used in crafting restorative items and armor."
    },
    "poison_essence": {
        "id": "poison_essence",
        "name": "Poison Essence",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 99,
        "value": 50,
        "description": "A vial of concentrated poison essence. Used in crafting venomous weapons and armor."
    },
    "shadow_essence": {
        "id": "shadow_essence",
        "name": "Shadow Essence",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 99,
        "value": 150,
        "description": "A vial of concentrated shadow essence. Used in crafting stealthy weapons and armor."
    },
    "copper_dagger": {
        "id": "copper_dagger",
        "name": "Copper Dagger",
        "icon": "assets/items/Copper Dagger.png",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            1,
            3
        ],
        "statBonus": {
            "agi": 1
        },
        "value": 6,
        "description": "Sharp enough to ruin someone's day, but still mostly useful for opening suspiciously labeled crates."
    },
    "bronze_dagger": {
        "id": "bronze_dagger",
        "name": "Bronze Dagger",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            2,
            4
        ],
        "statBonus": {
            "agi": 2
        },
        "value": 10,
        "description": "A stabby object with commitment issues — looks menacing until it meets armor."
    },
    "copper_armor": {
        "id": "copper_armor",
        "name": "Copper Armor",
        "icon": "assets/items/Copper Armor.png",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 4,
        "value": 26,
        "description": "Fashioned to protect you from insults and low-level goblin attacks. Slightly mismatched to your soul."
    },
    "bronze_armor": {
        "id": "bronze_armor",
        "name": "Bronze Armor",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 8,
        "value": 58,
        "description": "Sturdy enough to withstand a slap from reality. Provides moderate protection against both physical and emotional harm."
    },
    "copper_sword": {
        "id": "copper_sword",
        "name": "Copper Sword",
        "icon": "assets/items/Copper Sword.png",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            3,
            5
        ],
        "statBonus": {
            "str": 2
        },
        "value": 13,
        "description": "A basic sword that gets the job done, mostly. Perfect for beginners and those who enjoy a good clang."
    },
    "bronze_sword": {
        "id": "bronze_sword",
        "name": "Bronze Sword",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            4,
            7
        ],
        "statBonus": {
            "str": 4
        },
        "value": 29,
        "description": "A reliable blade that slices through enemies and existential dread alike. A solid choice for aspiring heroes."
    },
    "slime_amulet": {
        "id": "slime_amulet",
        "name": "Slime Amulet",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "value": 376,
        "armor": true,
        "slot": "amulet",
        "defense": 1,
        "description": "A mystical amulet imbued with the essence of a slime. It glows faintly and seems to offer a small amount of luck.",
        "statBonus": {
            "luk": 3
        }
    },
    "slime_ring": {
        "id": "slime_ring",
        "name": "Slime Ring",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "value": 360,
        "armor": true,
        "slot": "ring",
        "defense": 1,
        "description": "A squishy ring that feels oddly comforting. Wearing it is said to bring good fortune and a slight increase in agility.",
        "statBonus": {
            "agi": 3
        }
    },
    "copper_helmet": {
        "id": "copper_helmet",
        "name": "Copper Helmet",
        "icon": "assets/items/Copper Helmet.png",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 2,
        "value": 13,
        "description": "A basic helmet that offers minimal protection. Great for those who want to look the part without risking too much."
    },
    "bronze_helmet": {
        "id": "bronze_helmet",
        "name": "Bronze Helmet",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 6,
        "value": 29,
        "description": "A sturdy helmet that provides solid defense. Ideal for adventurers who take their headgear seriously."
    },
    "copper_legs": {
        "id": "copper_legs",
        "name": "Copper Leggings",
        "rarity": "common",
        "icon": "assets/items/Copper Legs.png",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 3,
        "value": 13,
        "description": "Basic leggings that offer minimal protection. Great for those who want to look the part without risking too much."
    },
    "bronze_legs": {
        "id": "bronze_legs",
        "name": "Bronze Leggings",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 7,
        "value": 29,
        "description": "Sturdy leggings that provide solid defense. Ideal for adventurers who take their legwear seriously."
    },
    "copper_boots": {
        "id": "copper_boots",
        "name": "Copper Boots",
        "rarity": "common",
        "icon": "assets/items/Copper Boots.png",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 2,
        "value": 13,
        "description": "Basic boots that offer minimal protection. Great for those who want to look the part without risking too much."
    },
    "bronze_boots": {
        "id": "bronze_boots",
        "name": "Bronze Boots",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 6,
        "value": 29,
        "description": "Sturdy bronze boots that provide solid defense. Ideal for those who take their footwear seriously."
    },
    "sticky_dice": {
        "id": "sticky_dice",
        "name": "Sticky Dice",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            2,
            5
        ],
        "statBonus": {
            "luk": 3
        },
        "value": 1181,
        "description": "A pair of dice that seem to favor the user. Perfect for those who believe in luck and the occasional rigged game."
    },
    "lucky_dagger": {
        "id": "lucky_dagger",
        "name": "Lucky Dagger",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            3,
            6
        ],
        "statBonus": {
            "luk": 4
        },
        "value": 1920,
        "description": "A dagger that brings fortune to its wielder. Ideal for those who like to live on the edge and roll the dice."
    },
    "iron_sword": {
        "id": "iron_sword",
        "name": "Iron Sword",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            5,
            8
        ],
        "statBonus": {
            "str": 5
        },
        "value": 58,
        "description": "A reliable iron sword that balances strength and durability. A favorite among seasoned adventurers."
    },
    "iron_dagger": {
        "id": "iron_dagger",
        "name": "Iron Dagger",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            4,
            7
        ],
        "statBonus": {
            "agi": 4
        },
        "value": 130,
        "description": "A sharp iron dagger that strikes quickly and efficiently. Perfect for those who value speed in combat."
    },
    "iron_armor": {
        "id": "iron_armor",
        "name": "Iron Armor",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 15,
        "value": 144,
        "description": "Sturdy iron armor that offers solid protection. Ideal for adventurers who face danger head-on."
    },
    "iron_helmet": {
        "id": "iron_helmet",
        "name": "Iron Helmet",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 12,
        "value": 86,
        "description": "A robust iron helmet that provides excellent defense. Perfect for warriors who value their head."
    },
    "iron_legs": {
        "id": "iron_legs",
        "name": "Iron Leggings",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 14,
        "value": 144,
        "description": "Durable iron leggings that offer solid protection. Ideal for adventurers who want to keep their legs safe."
    },
    "iron_boots": {
        "id": "iron_boots",
        "name": "Iron Boots",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 12,
        "value": 86,
        "description": "Sturdy iron boots that provide excellent defense. Perfect for those who want to keep their feet firmly planted in safety."
    },
    "steel_sword": {
        "id": "steel_sword",
        "name": "Steel Sword",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            6,
            10
        ],
        "statBonus": {
            "str": 6
        },
        "value": 200,
        "description": "A finely crafted steel sword that cuts through enemies and doubts alike. A must-have for serious adventurers."
    },
    "steel_dagger": {
        "id": "steel_dagger",
        "name": "Steel Dagger",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            5,
            9
        ],
        "statBonus": {
            "agi": 5
        },
        "value": 100,
        "description": "A sharp steel dagger that strikes swiftly and accurately. Perfect for those who prefer speed over brute strength."
    },
    "steel_armor": {
        "id": "steel_armor",
        "name": "Steel Armor",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 20,
        "value": 500,
        "description": "Heavy steel armor that offers excellent protection. Perfect for those who prefer to face danger head-on."
    },
    "steel_helmet": {
        "id": "steel_helmet",
        "name": "Steel Helmet",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 15,
        "value": 300,
        "description": "A robust steel helmet that provides superior defense. Ideal for warriors who value their head."
    },
    "steel_legs": {
        "id": "steel_legs",
        "name": "Steel Leggings",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 18,
        "value": 500,
        "description": "Durable steel leggings that offer excellent protection. Perfect for adventurers who want to keep their legs safe."
    },
    "steel_boots": {
        "id": "steel_boots",
        "name": "Steel Boots",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 15,
        "value": 300,
        "description": "Sturdy steel boots that provide superior defense. Ideal for those who want to keep their feet firmly planted in safety."
    },
    "mythril_sword": {
        "id": "mythril_sword",
        "name": "Mythril Sword",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            20,
            40
        ],
        "statBonus": {
            "str": 10
        },
        "value": 3600,
        "description": "A legendary sword forged from mythril. Light as a feather yet sharp enough to slice through the toughest foes. A true hero's weapon."
    },
    "mythril_armor": {
        "id": "mythril_armor",
        "name": "Mythril Armor",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 40,
        "value": 9000,
        "description": "Armor crafted from rare mythril, offering unparalleled protection without sacrificing mobility. Worn by those destined for greatness."
    },
    "mythril_helmet": {
        "id": "mythril_helmet",
        "name": "Mythril Helmet",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 30,
        "value": 5400,
        "description": "A lightweight helmet made of mythril, providing exceptional defense while allowing for agility. Favored by elite warriors."
    },
    "mythril_legs": {
        "id": "mythril_legs",
        "name": "Mythril Leggings",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 36,
        "value": 9000,
        "description": "Leggings forged from mythril, combining strength and flexibility. Perfect for adventurers who demand the best."
    },
    "mythril_boots": {
        "id": "mythril_boots",
        "name": "Mythril Boots",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 30,
        "value": 5400,
        "description": "Boots made from mythril that offer superior protection and comfort. Ideal for those who traverse dangerous terrains."
    },
    "dragon_slayer": {
        "id": "dragon_slayer",
        "name": "Dragon Slayer",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            250,
            350
        ],
        "statBonus": {
            "str": 15,
            "agi": 5
        },
        "value": 5000,
        "description": "A mythical sword said to have slain ancient dragons. Wielding it fills the bearer with courage and a slight sense of impending doom."
    },
    "dragon_armor": {
        "id": "dragon_armor",
        "name": "Dragon Armor",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 100,
        "value": 8000,
        "description": "Armor crafted from the scales of a dragon. It radiates power and offers unmatched protection against all forms of harm."
    },
    "dragon_helmet": {
        "id": "dragon_helmet",
        "name": "Dragon Helmet",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 75,
        "value": 4000,
        "description": "A helmet made from dragon scales, providing exceptional defense and a fearsome appearance. Worn by those who dare to face dragons."
    },
    "dragon_legs": {
        "id": "dragon_legs",
        "name": "Dragon Leggings",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 90,
        "value": 4000,
        "description": "Leggings forged from dragon scales, offering superior protection and mobility. Perfect for dragon slayers and adventurers alike."
    },
    "dragon_boots": {
        "id": "dragon_boots",
        "name": "Dragon Boots",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 75,
        "value": 4000,
        "description": "Boots made from dragon scales that provide exceptional defense and comfort. Ideal for those who walk the path of legends."
    },
    "dragon_amulet": {
        "id": "dragon_amulet",
        "name": "Dragon Amulet",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "amulet",
        "defense": 5,
        "value": 2000,
        "description": "An amulet imbued with the essence of a dragon. Wearing it grants the bearer increased resilience and a touch of draconic power.",
        "statBonus": {
            "str": 5
        }
    },
    "dragon_ring": {
        "id": "dragon_ring",
        "name": "Dragon Ring",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "ring",
        "defense": 5,
        "value": 1800,
        "description": "A ring forged in dragon fire. Wearing it enhances the wearer's strength and grants a fiery aura.",
        "statBonus": {
            "str": 4
        }
    },
    "alchemist_staff": {
        "id": "alchemist_staff",
        "name": "Alchemist's Staff",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            20,
            35
        ],
        "statBonus": {
            "int": 12
        },
        "value": 7927,
        "description": "A staff imbued with alchemical energies. Enhances the wielder's intelligence and magical prowess, making it a favorite among scholars and mages."
    },
    "twisted_dagger": {
        "id": "twisted_dagger",
        "name": "Twisted Dagger",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            60,
            90
        ],
        "statBonus": {
            "agi": 5,
            "luk": 2
        },
        "value": 2600,
        "description": "A dagger with a wicked curve, perfect for swift and unexpected strikes. Favored by rogues and those who enjoy a bit of chaos."
    },
    "dior_dice": {
        "id": "dior_dice",
        "name": "Dior Dice",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            100,
            150
        ],
        "statBonus": {
            "luk": 8
        },
        "value": 4104,
        "description": "A luxurious set of dice crafted by the finest artisans. Grants the wielder enhanced luck and the occasional stylish flair."
    },
    "enchanted_staff": {
        "id": "enchanted_staff",
        "name": "Enchanted Staff",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            50,
            80
        ],
        "statBonus": {
            "int": 8
        },
        "value": 3204,
        "description": "A staff imbued with magical enchantments. Boosts the wielder's intelligence and spellcasting abilities."
    },
    "shadow_sword": {
        "id": "shadow_sword",
        "name": "Shadow Sword",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            200,
            300
        ],
        "statBonus": {
            "str": 12,
            "agi": 8
        },
        "value": 9360,
        "description": "A sword forged in the depths of darkness. It grants the wielder enhanced strength and agility, allowing them to strike swiftly and decisively."
    },
    "shadow_armor": {
        "id": "shadow_armor",
        "name": "Shadow Armor",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 90,
        "value": 11520,
        "description": "Armor crafted from the essence of shadows. It provides exceptional protection while allowing the wearer to move with stealth and grace."
    },
    "shadow_helmet": {
        "id": "shadow_helmet",
        "name": "Shadow Helmet",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 70,
        "value": 9360,
        "description": "A helmet made from shadow essence, offering superior defense and a mysterious aura. Perfect for those who operate in the shadows."
    },
    "shadow_legs": {
        "id": "shadow_legs",
        "name": "Shadow Leggings",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 85,
        "value": 11520,
        "description": "Leggings forged from shadow essence, providing excellent protection and agility. Ideal for stealthy adventurers."
    },
    "shadow_boots": {
        "id": "shadow_boots",
        "name": "Shadow Boots",
        "rarity": "legendary",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 70,
        "value": 9360,
        "description": "Boots made from shadow essence that offer superior defense and silent movement. Perfect for those who tread lightly."
    },
    "shadow_dagger": {
        "id": "shadow_dagger",
        "name": "Shadow Dagger",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            120,
            180
        ],
        "statBonus": {
            "agi": 10,
            "luk": 5
        },
        "value": 4680,
        "description": "A dagger forged from shadows, ideal for swift and silent strikes. Favored by assassins and those who thrive in darkness."
    },
    "healing_staff": {
        "id": "healing_staff",
        "name": "Healing Staff",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            30,
            50
        ],
        "statBonus": {
            "int": 10
        },
        "value": 3704,
        "description": "A staff imbued with restorative magic. Enhances the wielder's intelligence and healing abilities, making it a favorite among clerics and healers."
    },
    "healing_amulet": {
        "id": "healing_amulet",
        "name": "Healing Amulet",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "amulet",
        "defense": 2,
        "value": 2480,
        "description": "An amulet that radiates healing energy. Wearing it boosts the wearer's vitality and resilience.",
        "statBonus": {
            "int": 5
        }
    },
    "healing_ring": {
        "id": "healing_ring",
        "name": "Healing Ring",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "ring",
        "defense": 2,
        "value": 2480,
        "description": "A ring that channels restorative magic. Wearing it enhances the wearer's healing capabilities and overall well-being.",
        "statBonus": {
            "int": 4
        }
    },
    "healing_robe": {
        "id": "healing_robe",
        "name": "Healing Robe",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 15,
        "value": 2960,
        "description": "A robe woven with healing enchantments. Provides decent protection while boosting the wearer's healing powers.",
        "statBonus": {
            "int": 6
        }
    },
    "healing_hat": {
        "id": "healing_hat",
        "name": "Healing Hat",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 10,
        "value": 2480,
        "description": "A hat imbued with restorative magic. Wearing it enhances the wearer's healing abilities and mental clarity.",
        "statBonus": {
            "int": 4
        }
    },
    "healing_pants": {
        "id": "healing_pants",
        "name": "Healing Pants",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 12,
        "value": 2960,
        "description": "Pants that channel healing energy. Wearing them boosts the wearer's vitality and resilience.",
        "statBonus": {
            "int": 5
        }
    },
    "healing_boots": {
        "id": "healing_boots",
        "name": "Healing Boots",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 10,
        "value": 2480,
        "description": "Boots imbued with restorative magic. Wearing them enhances the wearer's healing capabilities and overall well-being.",
        "statBonus": {
            "int": 4
        }
    },
    "toxic_dagger": {
        "id": "toxic_dagger",
        "name": "Toxic Dagger",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            15,
            25
        ],
        "statBonus": {
            "agi": 4
        },
        "value": 1320,
        "description": "A dagger coated in deadly toxins. Ideal for swift strikes that leave enemies feeling unwell."
    },
    "toxic_armor": {
        "id": "toxic_armor",
        "name": "Toxic Armor",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 25,
        "value": 1440,
        "description": "Armor infused with poisonous substances. Provides solid protection while slowly weakening attackers."
    },
    "toxic_helmet": {
        "id": "toxic_helmet",
        "name": "Toxic Helmet",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 18,
        "value": 1320,
        "description": "A helmet that emits a faint toxic aura. Offers good defense while deterring close-range attackers."
    },
    "toxic_legs": {
        "id": "toxic_legs",
        "name": "Toxic Leggings",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 22,
        "value": 1440,
        "description": "Leggings that release toxic fumes. Provide solid protection while discouraging pursuers."
    },
    "toxic_boots": {
        "id": "toxic_boots",
        "name": "Toxic Boots",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 18,
        "value": 1320,
        "description": "Boots that leave a trail of toxic residue. Offer good defense while making enemies think twice about following."
    },
    "poison_staff": {
        "id": "poison_staff",
        "name": "Poison Staff",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            25,
            40
        ],
        "statBonus": {
            "int": 7
        },
        "value": 300,
        "description": "A staff that channels poisonous magic. Ideal for mages who prefer to weaken their foes over time."
    },
    "poison_amulet": {
        "id": "poison_amulet",
        "name": "Poison Amulet",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "amulet",
        "defense": 3,
        "value": 1320,
        "description": "An amulet that radiates toxic energy. Wearing it boosts the wearer's resistance to poisons and enhances their own toxic abilities.",
        "statBonus": {
            "int": 3
        }
    },
    "poison_ring": {
        "id": "poison_ring",
        "name": "Poison Ring",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "ring",
        "defense": 3,
        "value": 1320,
        "description": "A ring that channels poisonous magic. Wearing it enhances the wearer's toxic abilities and provides resistance to poisons.",
        "statBonus": {
            "int": 2
        }
    },
    "poison_cloak": {
        "id": "poison_cloak",
        "name": "Poison Cloak",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "armor",
        "defense": 20,
        "value": 1440,
        "description": "A cloak infused with toxic substances. Provides good protection while slowly weakening attackers.",
        "statBonus": {
            "int": 4
        }
    },
    "poison_hat": {
        "id": "poison_hat",
        "name": "Poison Hat",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "head",
        "defense": 15,
        "value": 1320,
        "description": "A hat that emits a faint toxic aura. Offers decent defense while deterring close-range attackers.",
        "statBonus": {
            "int": 2
        }
    },
    "poison_pants": {
        "id": "poison_pants",
        "name": "Poison Pants",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "legs",
        "defense": 18,
        "value": 160,
        "description": "Pants that release toxic fumes. Provide good protection while discouraging pursuers.",
        "statBonus": {
            "int": 3
        }
    },
    "poison_boots": {
        "id": "poison_boots",
        "name": "Poison Boots",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "armor": true,
        "slot": "boots",
        "defense": 15,
        "value": 1320,
        "description": "Boots that leave a trail of toxic residue. Offer decent defense while making enemies think twice about following.",
        "statBonus": {
            "int": 2
        }
    },
    "green_staff": {
        "id": "green_staff",
        "name": "Green Staff",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            2,
            4
        ],
        "statBonus": {
            "int": 3
        },
        "value": 847,
        "description": "A staff imbued with the essence of nature. It hums softly and feels alive to the touch."
    },
    "starter_sword": {
        "id": "starter_sword",
        "name": "Sword",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            1,
            1
        ],
        "statBonus": {
            "str": 3
        },
        "value": 5,
        "description": "Your first lesson in brutally honest conflict resolution. Also great for slicing cake."
    },
    "starter_staff": {
        "id": "starter_staff",
        "name": "Staff",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            1,
            1
        ],
        "statBonus": {
            "int": 3
        },
        "value": 5,
        "description": "A stick with opinions. Channels magic and passive-aggressive commentary."
    },
    "starter_dagger": {
        "id": "starter_dagger",
        "name": "Dagger",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            1,
            1
        ],
        "statBonus": {
            "agi": 3
        },
        "value": 5,
        "description": "Small, angular, and excellent at popping egos and balloons."
    },
    "starter_dice": {
        "id": "starter_dice",
        "name": "Dice in a Bag",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            1,
            1
        ],
        "statBonus": {
            "luk": 3
        },
        "value": 5,
        "description": "Fate in soft, rattly form. Roll well and maybe the universe will owe you one."
    },
    "slime_gel": {
        "id": "slime_gel",
        "name": "Slime Gel",
        "rarity": "common",
        "stackable": true,
        "maxStack": 999,
        "value": 2,
        "description": "Sticky residue left behind by common slimes. Smells faintly of regret and old socks."
    },
    "slime_core": {
        "id": "slime_core",
        "name": "Glowing Slime Core",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 99,
        "value": 80,
        "description": "A pulsing core that hums with condensed mana. Slightly warm, like a tiny sun of poor decisions."
    },
    "slime_crown_shard": {
        "id": "slime_crown_shard",
        "name": "Royal Slime Crown Shard",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "value": 500,
        "slot": "head",
        "description": "A fragment of a monarch slime crown. It radiates confidence and the faint whiff of tyranny.",
        "statBonus": {
            "luk": 4
        }
    },
    "slime_whip": {
        "id": "slime_whip",
        "name": "Gel Lash",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "weapon": true,
        "slot": "weapon",
        "damage": [
            3,
            6
        ],
        "statBonus": {
            "agi": 3,
            "luk": 1
        },
        "value": 220,
        "description": "A whip that slaps enemies and occasionally apologizes in gooey tones."
    },
    "rat_tail": {
        "id": "rat_tail",
        "name": "Rat Tail",
        "rarity": "common",
        "stackable": true,
        "maxStack": 99,
        "value": 2,
        "description": "A scruffy tail from a common rat. Surprisingly flexible and mildly unsettling."
    },
    "rotting_fang": {
        "id": "rotting_fang",
        "name": "Rotting Fang",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 99,
        "value": 12,
        "description": "A fang that has been left to rot. It's sharp and slightly toxic.",
        "statBonus": {
            "str": 1
        },
        "slot": "weapon"
    },
    "spectral_essence": {
        "id": "spectral_essence",
        "name": "Spectral Essence",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 99,
        "value": 90,
        "description": "A ghostly essence that crackles with otherworldly energy. It's faintly cold and gives off an eerie glow."
    },
    "normal_log": {
        "id": "normal_log",
        "name": "Normal Log",
        "rarity": "common",
        "stackable": true,
        "maxStack": 999,
        "value": 1,
        "description": "A sturdy log, perfect for building fires or impromptu furniture."
    },
    "oak_log": {
        "id": "oak_log",
        "name": "Oak Log",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 999,
        "value": 6,
        "description": "A strong oak log, ideal for crafting durable items and structures."
    },
    "birch_log": {
        "id": "birch_log",
        "name": "Birch Log",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 999,
        "value": 5,
        "description": "A light birch log, perfect for crafting lightweight items and furniture."
    },
    "pine_log": {
        "id": "pine_log",
        "name": "Pine Log",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 999,
        "value": 4,
        "description": "A fragrant pine log, great for crafting aromatic items and structures."
    },
    "maple_log": {
        "id": "maple_log",
        "name": "Maple Log",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 999,
        "value": 7,
        "description": "A sturdy maple log, ideal for crafting high-quality items and furniture."
    },
    "minor_health_potion": {
        "id": "minor_health_potion",
        "name": "Minor Health Potion",
        "rarity": "common",
        "stackable": true,
        "maxStack": 99,
        "icon": "assets/items/Minor Health Potion.png",
        "healAmount": 20,
        "value": 8,
        "usable": true,
        "description": "A small vial of red liquid that tastes like cherry-flavored hope. Restores a modest amount of health."
    },
    "major_health_potion": {
        "id": "major_health_potion",
        "name": "Major Health Potion",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 99,
        "icon": "assets/items/Major Health Potion.png",
        "healAmount": 75,
        "value": 35,
        "usable": true,
        "description": "A large bottle of crimson concoction that smells like victory. Heals a significant portion of health."
    },
    "minor_mana_potion": {
        "id": "minor_mana_potion",
        "name": "Minor Mana Potion",
        "rarity": "common",
        "stackable": true,
        "maxStack": 99,
        "manaAmount": 15,
        "icon": "assets/items/Minor Mana Potion.png",
        "value": 8,
        "usable": true,
        "description": "A small vial of blue liquid that tastes like blueberry dreams. Restores a modest amount of mana."
    },
    "major_mana_potion": {
        "id": "major_mana_potion",
        "name": "Major Mana Potion",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 99,
        "manaAmount": 60,
        "icon": "assets/items/Major Mana Potion.png",
        "value": 35,
        "usable": true,
        "description": "A large bottle of azure elixir that smells like arcane triumph. Replenishes a significant portion of mana."
    },
    "blue_bull": {
        "id": "blue_bull",
        "name": "Blue Bull Energy Drink",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "usable": true,
        "description": "A can of energy drink that promises to boost your stamina and focus. Side effects may include jitteriness and spontaneous dance outbreaks.",
        "buff": {
            "statBonus": {
                "agi": 6
            },
            "duration": 45000
        }
    },
    "manster_energy": {
        "id": "manster_energy",
        "name": "MANster Energy Drink",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 7,
        "usable": true,
        "description": "A can of energy drink that claims to unleash your inner beast. May cause sudden bursts of strength and uncontrollable howling.",
        "buff": {
            "statBonus": {
                "str": 6
            },
            "duration": 45000
        }
    },
    "cellulix": {
        "id": "cellulix",
        "name": "Cellulix Energy Drink",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 7,
        "usable": true,
        "description": "A can of energy drink that advertises enhanced mental clarity and focus. Side effects may include overthinking and existential dread.",
        "buff": {
            "statBonus": {
                "int": 6
            },
            "duration": 45000
        }
    },
    "lucky_clover": {
        "id": "lucky_clover",
        "name": "Lucky Clover Energy Drink",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "usable": true,
        "description": "A can of energy drink that promises to enhance your luck and fortune. Side effects may include sudden bursts of confidence and an uncanny ability to find four-leaf clovers.",
        "buff": {
            "statBonus": {
                "luk": 6
            },
            "duration": 45000
        }
    },
    "star_talent_potion": {
        "id": "star_talent_potion",
        "name": "Star Talent Potion",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 500,
        "usable": true,
        "description": "Use this potion to gain 1 star talent point, allowing you to unlock or enhance special abilities and skills.",
        "grantTalentPoint": 1,
    },
    "good_rod": {
        "id": "good_rod",
        "name": "Good Fishing Rod",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "fishing",
        "value": 120,
        "description": "A well-made rod that makes fishing easier and quicker.",
        "statBonus": {
            "luk": 2
        },
        "fishingBonus": {
            "skill": 4,
            "speedReductionMs": 150
        }
    },
    "strange_slime_egg": {
        "id": "strange_slime_egg",
        "name": "Strange Slime Egg",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "value": 800,
        "description": "An egg pulsating with mysterious energy. It's warm to the touch and occasionally jiggles on its own. What could be inside?"
    },
    "teleport_scroll": {
        "id": "teleport_scroll",
        "name": "Teleportation Scroll",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 10,
        "value": 120,
        "usable": true,
        "description": "A magical scroll that allows instant travel to a known location. Perfect for avoiding awkward social situations or dangerous monsters."
    },
    "bag_of_gold": {
        "id": "bag_of_gold",
        "name": "Bag of Gold",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 100,
        "usable": true,
        "description": "A hefty bag filled with gleaming gold coins. Heavy enough to make you feel wealthy, but light enough to carry without a mule."
    },
    "rat_meat": {
        "id": "rat_meat",
        "name": "Rat Meat",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 5,
        "description": "Freshly obtained rat meat. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_rat_meat": {
        "id": "cooked_rat_meat",
        "name": "Cooked Rat Meat",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 8,
        "healAmount": 25,
        "usable": true,
        "description": "Tender rat meat cooked to perfection. Restores a small amount of health when eaten."
    },
    "minnow": {
        "id": "minnow",
        "name": "Minnow",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 4,
        "description": "A small, slippery minnow. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_minnow": {
        "id": "cooked_minnow",
        "name": "Cooked Minnow",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "healAmount": 20,
        "usable": true,
        "description": "A perfectly cooked minnow. Restores a small amount of health when eaten."
    },
    "salmon": {
        "id": "salmon",
        "name": "Salmon",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 10,
        "description": "A fresh salmon fillet. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_salmon": {
        "id": "cooked_salmon",
        "name": "Cooked Salmon",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 24,
        "healAmount": 50,
        "usable": true,
        "description": "A deliciously cooked salmon fillet. Restores a moderate amount of health when eaten."
    },
    "shrimp": {
        "id": "shrimp",
        "name": "Shrimp",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "description": "A fresh shrimp. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_shrimp": {
        "id": "cooked_shrimp",
        "name": "Cooked Shrimp",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 18,
        "healAmount": 30,
        "usable": true,
        "description": "A succulent cooked shrimp. Restores a small amount of health when eaten."
    },
    "tuna": {
        "id": "tuna",
        "name": "Tuna",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 12,
        "description": "A fresh tuna steak. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_tuna": {
        "id": "cooked_tuna",
        "name": "Cooked Tuna",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 29,
        "healAmount": 60,
        "usable": true,
        "description": "A perfectly cooked tuna steak. Restores a moderate amount of health when eaten."
    },
    "bass": {
        "id": "bass",
        "name": "Bass",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 14,
        "description": "A fresh bass fish. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_bass": {
        "id": "cooked_bass",
        "name": "Cooked Bass",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 34,
        "healAmount": 70,
        "usable": true,
        "description": "A deliciously cooked bass fish. Restores a moderate amount of health when eaten."
    },
    "catfish": {
        "id": "catfish",
        "name": "Catfish",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 20,
        "description": "A fresh catfish. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_catfish": {
        "id": "cooked_catfish",
        "name": "Cooked Catfish",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 80,
        "healAmount": 90,
        "usable": true,
        "description": "A perfectly cooked catfish. Restores a large amount of health when eaten."
    },
    "lobster": {
        "id": "lobster",
        "name": "Lobster",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 25,
        "description": "A fresh lobster. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_lobster": {
        "id": "cooked_lobster",
        "name": "Cooked Lobster",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 100,
        "healAmount": 100,
        "usable": true,
        "description": "A succulent cooked lobster. Restores a large amount of health when eaten."
    },
    "crab": {
        "id": "crab",
        "name": "Crab",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 22,
        "description": "A fresh crab. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_crab": {
        "id": "cooked_crab",
        "name": "Cooked Crab",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 88,
        "healAmount": 95,
        "usable": true,
        "description": "A deliciously cooked crab. Restores a large amount of health when eaten."
    },
    "marlin": {
        "id": "marlin",
        "name": "Marlin",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 20,
        "value": 420,
        "description": "A massive marlin with a shiny bill. Needs to be cooked before consumption."
    },
    "cooked_marlin": {
        "id": "cooked_marlin",
        "name": "Cooked Marlin",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 20,
        "value": 3024,
        "healAmount": 260,
        "usable": true,
        "description": "A perfectly grilled marlin steak. Restores a very large amount of health when eaten."
    },
    "giant_turtle": {
        "id": "giant_turtle",
        "name": "Giant Turtle (Raw)",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 560,
        "description": "A rare and enormous sea turtle. Needs careful cooking before consumption."
    },
    "cooked_giant_turtle": {
        "id": "cooked_giant_turtle",
        "name": "Cooked Giant Turtle",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 4032,
        "healAmount": 360,
        "usable": true,
        "description": "A hearty serving from a giant turtle. Restores a huge amount of health when eaten."
    },
    "pond_roach": {
        "id": "pond_roach",
        "name": "Pond Roach",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 3,
        "description": "A small pond roach. Needs to be cooked before consumption."
    },
    "cooked_pond_roach": {
        "id": "cooked_pond_roach",
        "name": "Cooked Pond Roach",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 5,
        "healAmount": 15,
        "usable": true,
        "description": "A simple cooked pond roach. Restores a small amount of health when eaten."
    },
    "reed_perch": {
        "id": "reed_perch",
        "name": "Reed Perch",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 5,
        "description": "A reed-dwelling perch. Needs to be cooked before consumption."
    },
    "cooked_reed_perch": {
        "id": "cooked_reed_perch",
        "name": "Cooked Reed Perch",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 8,
        "healAmount": 20,
        "usable": true,
        "description": "A nicely cooked reed perch. Restores a small amount of health when eaten."
    },
    "sunfish": {
        "id": "sunfish",
        "name": "Sunfish",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 4,
        "description": "A bright sunfish. Needs to be cooked before consumption."
    },
    "cooked_sunfish": {
        "id": "cooked_sunfish",
        "name": "Cooked Sunfish",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "healAmount": 18,
        "usable": true,
        "description": "A tasty cooked sunfish. Restores a small amount of health when eaten."
    },
    "pond_crablet": {
        "id": "pond_crablet",
        "name": "Crablet",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "description": "A tiny crab found in ponds. Needs to be cooked before consumption."
    },
    "cooked_pond_crablet": {
        "id": "cooked_pond_crablet",
        "name": "Cooked Crablet",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 10,
        "healAmount": 25,
        "usable": true,
        "description": "A small cooked crablet. Restores a modest amount of health when eaten."
    },
    "rock_trout": {
        "id": "rock_trout",
        "name": "Rock Trout",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 9,
        "description": "A hardy trout found among rocks. Needs to be cooked before consumption."
    },
    "cooked_rock_trout": {
        "id": "cooked_rock_trout",
        "name": "Cooked Rock Trout",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 22,
        "healAmount": 45,
        "usable": true,
        "description": "A well-cooked rock trout. Restores a moderate amount of health when eaten."
    },
    "river_pike": {
        "id": "river_pike",
        "name": "River Pike",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 16,
        "description": "A fierce pike from fast-flowing rivers. Needs to be cooked before consumption."
    },
    "cooked_river_pike": {
        "id": "cooked_river_pike",
        "name": "Cooked River Pike",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 38,
        "healAmount": 80,
        "usable": true,
        "description": "A substantial cooked river pike. Restores a good amount of health when eaten."
    },
    "silver_mullet": {
        "id": "silver_mullet",
        "name": "Silver Mullet",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 11,
        "description": "A silvery mullet common in estuaries. Needs to be cooked before consumption."
    },
    "cooked_silver_mullet": {
        "id": "cooked_silver_mullet",
        "name": "Cooked Silver Mullet",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 26,
        "healAmount": 40,
        "usable": true,
        "description": "A well-prepared silver mullet. Restores a moderate amount of health when eaten."
    },
    "coastal_snapper": {
        "id": "coastal_snapper",
        "name": "Coastal Snapper",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 13,
        "description": "A snapper from coastal waters. Needs to be cooked before consumption."
    },
    "cooked_coastal_snapper": {
        "id": "cooked_coastal_snapper",
        "name": "Cooked Coastal Snapper",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 31,
        "healAmount": 55,
        "usable": true,
        "description": "A delightful cooked coastal snapper. Restores a moderate amount of health when eaten."
    },
    "silvercarp": {
        "id": "silvercarp",
        "name": "Silver Carp",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 28,
        "description": "A large silver carp. Needs to be cooked before consumption."
    },
    "cooked_silvercarp": {
        "id": "cooked_silvercarp",
        "name": "Cooked Silver Carp",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 112,
        "healAmount": 110,
        "usable": true,
        "description": "A hefty cooked silver carp. Restores a large amount of health when eaten."
    },
    "shadow_eel": {
        "id": "shadow_eel",
        "name": "Shadow Eel",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 34,
        "description": "A slippery eel that prefers the dark. Needs to be cooked before consumption."
    },
    "cooked_shadow_eel": {
        "id": "cooked_shadow_eel",
        "name": "Cooked Shadow Eel",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 136,
        "healAmount": 140,
        "usable": true,
        "description": "A rich cooked shadow eel. Restores a large amount of health when eaten."
    },
    "river_wyrm": {
        "id": "river_wyrm",
        "name": "River Wyrm",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 30,
        "description": "A worm-like river creature. Needs to be cooked before consumption."
    },
    "cooked_river_wyrm": {
        "id": "cooked_river_wyrm",
        "name": "Cooked River Wyrm",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 120,
        "healAmount": 120,
        "usable": true,
        "description": "A cooked river wyrm. Restores a large amount of health when eaten."
    },
    "storm_clam": {
        "id": "storm_clam",
        "name": "Storm Clam",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 38,
        "description": "A clam infused with stormy brine. Needs to be cooked before consumption."
    },
    "cooked_storm_clam": {
        "id": "cooked_storm_clam",
        "name": "Cooked Storm Clam",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 152,
        "healAmount": 130,
        "usable": true,
        "description": "A richly flavored cooked storm clam. Restores a large amount of health when eaten."
    },
    "abyssal_grouper": {
        "id": "abyssal_grouper",
        "name": "Abyssal Grouper",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 180,
        "description": "A deep-sea grouper from the abyss. Needs to be cooked before consumption."
    },
    "cooked_abyssal_grouper": {
        "id": "cooked_abyssal_grouper",
        "name": "Cooked Abyssal Grouper",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 1296,
        "healAmount": 220,
        "usable": true,
        "description": "A sumptuous cooked abyssal grouper. Restores a very large amount of health when eaten."
    },
    "moon_shrike": {
        "id": "moon_shrike",
        "name": "Moon Shrike",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 210,
        "description": "An ethereal fish that feeds by moonlight. Needs to be cooked before consumption."
    },
    "cooked_moon_shrike": {
        "id": "cooked_moon_shrike",
        "name": "Cooked Moon Shrike",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 1512,
        "healAmount": 240,
        "usable": true,
        "description": "A rare cooked moon shrike. Restores a very large amount of health when eaten."
    },
    "deep_sabre": {
        "id": "deep_sabre",
        "name": "Deep Sabrefish",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 260,
        "description": "A sharp-toothed fish from the deep. Needs to be cooked before consumption."
    },
    "cooked_deep_sabre": {
        "id": "cooked_deep_sabre",
        "name": "Cooked Deep Sabrefish",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 10,
        "value": 1872,
        "healAmount": 300,
        "usable": true,
        "description": "A powerful cooked deep sabrefish. Restores a very large amount of health when eaten."
    },
    "leviathan_spawn": {
        "id": "leviathan_spawn",
        "name": "Leviathan Spawn (Raw)",
        "rarity": "legendary",
        "stackable": true,
        "maxStack": 2,
        "value": 1200,
        "description": "A dangerous, colossal spawn of the leviathan. Only the bravest attempt to cook it."
    },
    "cooked_leviathan_spawn": {
        "id": "cooked_leviathan_spawn",
        "name": "Cooked Leviathan Spawn",
        "rarity": "legendary",
        "stackable": true,
        "maxStack": 2,
        "value": 17280,
        "healAmount": 800,
        "usable": true,
        "description": "A legendary meal from leviathan spawn. Restores an enormous amount of health when eaten."
    },
    "celestial_whale": {
        "id": "celestial_whale",
        "name": "Celestial Whale (Raw)",
        "rarity": "legendary",
        "stackable": true,
        "maxStack": 2,
        "value": 1500,
        "description": "A whale suffused with celestial light. Its meat is said to grant visions when cooked properly."
    },
    "cooked_celestial_whale": {
        "id": "cooked_celestial_whale",
        "name": "Cooked Celestial Whale",
        "rarity": "legendary",
        "stackable": true,
        "maxStack": 2,
        "value": 21600,
        "healAmount": 900,
        "usable": true,
        "description": "A transcendent cooked celestial whale. Restores an enormous amount of health when eaten."
    },
    "glowshrimp": {
        "id": "glowshrimp",
        "name": "Glow Shrimp",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 18,
        "description": "A bioluminescent shrimp that glows faintly. Needs to be cooked before consumption."
    },
    "cooked_glowshrimp": {
        "id": "cooked_glowshrimp",
        "name": "Cooked Glow Shrimp",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 43,
        "healAmount": 60,
        "usable": true,
        "description": "A savory cooked glow shrimp. Restores a moderate amount of health when eaten."
    },
    "tinny_nautilus": {
        "id": "tinny_nautilus",
        "name": "Tinny Nautilus",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 46,
        "description": "A small nautilus with spiraled shell. Needs to be cooked before consumption."
    },
    "cooked_tinny_nautilus": {
        "id": "cooked_tinny_nautilus",
        "name": "Cooked Tinny Nautilus",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 184,
        "healAmount": 150,
        "usable": true,
        "description": "A delicate cooked tinny nautilus. Restores a large amount of health when eaten."
    },
    "nightling": {
        "id": "nightling",
        "name": "Nightling",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 52,
        "description": "A nocturnal fish that shimmers under moonlight. Needs to be cooked before consumption."
    },
    "cooked_nightling": {
        "id": "cooked_nightling",
        "name": "Cooked Nightling",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 50,
        "value": 208,
        "healAmount": 170,
        "usable": true,
        "description": "A rare cooked nightling. Restores a large amount of health when eaten."
    },
    "sardine": {
        "id": "sardine",
        "name": "Sardine",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 5,
        "description": "A small sardine fish. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_sardine": {
        "id": "cooked_sardine",
        "name": "Cooked Sardine",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 8,
        "healAmount": 25,
        "usable": true,
        "description": "A perfectly cooked sardine. Restores a small amount of health when eaten."
    },
    "herring": {
        "id": "herring",
        "name": "Herring",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "description": "A fresh herring fish. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_herring": {
        "id": "cooked_herring",
        "name": "Cooked Herring",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 10,
        "healAmount": 30,
        "usable": true,
        "description": "A deliciously cooked herring. Restores a small amount of health when eaten."
    },
    "mackerel": {
        "id": "mackerel",
        "name": "Mackerel",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 7,
        "description": "A fresh mackerel fish. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_mackerel": {
        "id": "cooked_mackerel",
        "name": "Cooked Mackerel",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 11,
        "healAmount": 35,
        "usable": true,
        "description": "A perfectly cooked mackerel. Restores a small amount of health when eaten."
    },
    "anchovy": {
        "id": "anchovy",
        "name": "Anchovy",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 4,
        "description": "A tiny anchovy fish. Needs to be cooked before consumption to avoid unpleasant side effects."
    },
    "cooked_anchovy": {
        "id": "cooked_anchovy",
        "name": "Cooked Anchovy",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 6,
        "healAmount": 20,
        "usable": true,
        "description": "A deliciously cooked anchovy. Restores a small amount of health when eaten."
    },
    "seaweed": {
        "id": "seaweed",
        "name": "Seaweed",
        "rarity": "common",
        "stackable": true,
        "maxStack": 100,
        "value": 3,
        "description": "Fresh seaweed harvested from the ocean. Can be eaten raw or used in cooking."
    },
    "dried_seaweed": {
        "id": "dried_seaweed",
        "name": "Dried Seaweed",
        "rarity": "common",
        "stackable": true,
        "maxStack": 100,
        "value": 5,
        "manaAmount": 15,
        "usable": true,
        "description": "Seaweed that has been dried for preservation. Restores a small amount of mana when eaten."
    },
    "kelp_salad": {
        "id": "kelp_salad",
        "name": "Kelp Salad",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 50,
        "value": 36,
        "manaAmount": 40,
        "usable": true,
        "description": "A fresh salad made from kelp and other sea vegetables. Restores a moderate amount of mana when eaten."
    },
    "burnt_fish": {
        "id": "burnt_fish",
        "name": "Burnt Fish",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 1,
        "healAmount": 5,
        "usable": true,
        "description": "A fish that has been overcooked to the point of being inedible. Restores a tiny amount of health when eaten, mostly just disappointment."
    },
    "burnt_meat": {
        "id": "burnt_meat",
        "name": "Burnt Meat",
        "rarity": "common",
        "stackable": true,
        "maxStack": 50,
        "value": 1,
        "healAmount": 5,
        "usable": true,
        "description": "Meat that has been charred beyond recognition. Restores a tiny amount of health when eaten, mostly just regret."
    },
    "worm_bait": {
        "id": "worm_bait",
        "name": "Worm Bait",
        "rarity": "common",
        "stackable": true,
        "maxStack": 200,
        "value": 25,
        "description": "A wriggling worm, perfect for attracting common fish."
    },
    "insect_bait": {
        "id": "insect_bait",
        "name": "Insect Bait",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 150,
        "value": 75,
        "description": "A crunchy insect, ideal for luring in larger predatory fish."
    },
    "shrimp_bait": {
        "id": "shrimp_bait",
        "name": "Shrimp Bait",
        "rarity": "common",
        "stackable": true,
        "maxStack": 120,
        "value": 40,
        "description": "Small shrimp pieces that attract bottom-feeders like catfish and crab."
    },
    "foil_bait": {
        "id": "foil_bait",
        "name": "Shiny Foil Bait",
        "rarity": "uncommon",
        "stackable": true,
        "maxStack": 100,
        "value": 95,
        "description": "Reflective foil that imitates small baitfish. Good for predatory species."
    },
    "night_bait": {
        "id": "night_bait",
        "name": "Night Worm",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 80,
        "value": 160,
        "description": "A nocturnal bait that works better at night. Slight boost to rare catches."
    },
    "squid_bait": {
        "id": "squid_bait",
        "name": "Squid Bait",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 60,
        "value": 180,
        "description": "A potent bait favored by large sea creatures like tuna and lobster."
    },
    "crab_bait": {
        "id": "crab_bait",
        "name": "Crustacean Bait",
        "rarity": "rare",
        "stackable": true,
        "maxStack": 60,
        "value": 140,
        "description": "Chunky bait made from shells and meat. Effective for crustaceans and big catfish."
    },
    "mystery_bait": {
        "id": "mystery_bait",
        "name": "Mystery Jar",
        "rarity": "epic",
        "stackable": true,
        "maxStack": 20,
        "value": 520,
        "description": "A jar of odd-smelling bait. Very rare fish may be attracted to it."
    },
    "basic_rod": {
        "id": "basic_rod",
        "name": "Basic Fishing Rod",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "fishing",
        "value": 40,
        "description": "A simple rod for catching small fish. Slightly improves fishing skill.",
        "statBonus": {
            "luk": 1
        },
        "fishingBonus": {
            "skill": 2,
            "speedReductionMs": 50
        }
    },
    "rusty_rod": {
        "id": "rusty_rod",
        "name": "Rusty Rod",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "fishing",
        "value": 20,
        "description": "A salvaged rod from old docks. A usable starter rod.",
        "statBonus": {
            "luk": 1
        },
        "fishingBonus": {
            "skill": 1,
            "speedReductionMs": 40
        }
    },
    "iron_rod": {
        "id": "iron_rod",
        "name": "Iron Rod",
        "rarity": "uncommon",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "fishing",
        "value": 240,
        "description": "A sturdy iron rod that helps reel in bigger fish.",
        "statBonus": {
            "luk": 2
        },
        "fishingBonus": {
            "skill": 6,
            "speedReductionMs": 210
        }
    },
    "sea_rod": {
        "id": "sea_rod",
        "name": "Sea Rod",
        "rarity": "rare",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "fishing",
        "value": 520,
        "description": "A rod built for saltwater and large catches. Increases catch variety.",
        "statBonus": {
            "luk": 3
        },
        "fishingBonus": {
            "skill": 10,
            "speedReductionMs": 340
        }
    },
    "trawler_rod": {
        "id": "trawler_rod",
        "name": "Trawler Rod",
        "rarity": "epic",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "fishing",
        "value": 1400,
        "description": "Professional-grade rod used by serious fishers. Greatly improves rare catch odds.",
        "statBonus": {
            "luk": 6
        },
        "fishingBonus": {
            "skill": 18,
            "speedReductionMs": 520
        }
    },
    "bait_bucket": {
        "id": "bait_bucket",
        "name": "Fishing Bucket",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "usable": false,
        "value": 0,
        "description": "A bucket used to deposit bait at fishing spots."
    },
    "copper_pickaxe": {
        "id": "copper_pickaxe",
        "name": "Copper Pickaxe",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "mining",
        "value": 50,
        "description": "A basic pickaxe made of copper. Suitable for mining soft ores.",
        "statBonus": {
            "str": 1
        },
        "miningBonus": {
            "skill": 2,
            "speedReductionMs": 100
        }
    },
    "copper_hatchet": {
        "id": "copper_hatchet",
        "name": "Copper Hatchet",
        "rarity": "common",
        "stackable": false,
        "maxStack": 1,
        "tool": true,
        "slot": "woodcutting",
        "value": 50,
        "description": "A basic hatchet made of copper. Suitable for chopping soft wood.",
        "statBonus": {
            "str": 1
        },
        "woodcuttingBonus": {
            "skill": 2,
            "speedReductionMs": 100
        }
    }
};

if (typeof window !== 'undefined') window.ITEM_DEFS = ITEM_DEFS;

// Exports: provide both named and default exports so existing imports work.
export { ITEM_DEFS };
export default ITEM_DEFS;