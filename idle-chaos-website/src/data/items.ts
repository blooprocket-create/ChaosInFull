// Minimal item catalog restored after legacy file removal.
// Provides definitions used by shop API, admin seed, and world explorer loot display.

export type ItemDef = {
  key: string;
  name: string;
  // Canonical base value used for price derivation in UI and server.
  // Buy price = floor(value * 1.1), Sell price = floor(value * 0.8)
  value?: number;
  // Legacy explicit prices. If provided and value is missing, server falls back to these.
  buy?: number; // purchase price
  sell?: number; // sell price
  category?: string; // optional categorization for UI badges
};

// NOTE: Prices & categories are placeholder; adjust for balancing.
export const items: ItemDef[] = [ 
  // Legacy items with explicit prices (no base value available at the time)
  { key: 'slime_goop', name: 'Slime Goop', buy: 12, sell: 2, category: 'material' },
  { key: 'slime_gel', name: 'Slime Gel', buy: 14, sell: 3, category: 'material' },
  { key: 'slime_core', name: 'Slime Core', buy: 75, sell: 15, category: 'material' },
  { key: 'slime_whip', name: 'Slime Whip', buy: 120, sell: 30, category: 'weapon' },
  { key: 'minor_health_potion', name: 'Minor Health Potion', buy: 40, sell: 10, category: 'potion' },
  { key: 'minor_mana_potion', name: 'Minor Mana Potion', buy: 40, sell: 10, category: 'potion' },
  { key: 'major_health_potion', name: 'Major Health Potion', buy: 160, sell: 40, category: 'potion' },
  { key: 'major_mana_potion', name: 'Major Mana Potion', buy: 160, sell: 40, category: 'potion' },
  { key: 'copper_ore', name: 'Copper Ore', buy: 22, sell: 5, category: 'ore' },
  { key: 'tin_ore', name: 'Tin Ore', buy: 26, sell: 6, category: 'ore' },
  { key: 'copper_bar', name: 'Copper Bar', buy: 55, sell: 18, category: 'bar' },
  { key: 'normal_planks', name: 'Planks', buy: 35, sell: 9, category: 'material' },
  { key: 'copper_dagger', name: 'Copper Dagger', buy: 220, sell: 55, category: 'weapon' },
  { key: 'rat_tail', name: 'Rat Tail', buy: 20, sell: 4, category: 'material' },
  { key: 'rat_meat', name: 'Rat Meat', buy: 28, sell: 6, category: 'material' },
  { key: 'toxic_essence', name: 'Toxic Essence', buy: 90, sell: 22, category: 'material' },
  { key: 'rotting_fang', name: 'Rotting Fang', buy: 55, sell: 14, category: 'material' },
  { key: 'spectral_essence', name: 'Spectral Essence', buy: 130, sell: 32, category: 'material' },
  { key: 'shadow_essence', name: 'Shadow Essence', buy: 160, sell: 40, category: 'material' },
  { key: 'slime_crown_shard', name: 'Slime Crown Shard', buy: 300, sell: 75, category: 'material' },
  { key: 'strange_slime_egg', name: 'Strange Slime Egg', buy: 500, sell: 125, category: 'material' },

  // Shop items used by Town scene — use value so UI/server derive the same price
  { key: 'copper_pickaxe', name: 'Copper Pickaxe', value: 50, category: 'tool' }, // buy 143, sell 104
  { key: 'copper_hatchet', name: 'Copper Hatchet', value: 50, category: 'tool' }, // buy 132, sell 96
  { key: 'basic_rod', name: 'Basic Rod', value: 40, category: 'tool' }, // buy 110, sell 80
  { key: 'rusty_rod', name: 'Rusty Rod', value: 20, category: 'tool' }, 
  { key: 'good_rod', name: 'Good Rod', value: 120, category: 'tool' }, 
  { key: 'twisted_dagger', name: 'Twisted Dagger', value: 2600, category: 'weapon' }, 
  { key: 'bronze_polearm', name: 'Bronze Polearm', value: 350, category: 'weapon' }, 
  { key: 'basic_bow', name: 'Basic Bow', value: 130, category: 'weapon' }, 
];

export const itemByKey: Record<string, ItemDef> = Object.fromEntries(items.map(i => [i.key, i]));
