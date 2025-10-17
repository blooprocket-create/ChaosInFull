export type ItemDef = {
  key: string;
  name: string;
  buy: number; // shop buy price
  sell: number; // shop sell price
  category: "ore" | "bar" | "wood" | "plank" | "weapon" | "armor" | "misc";
};

export const items: ItemDef[] = [
  { key: "copper", name: "Copper Ore", buy: 5, sell: 2, category: "ore" },
  { key: "tin", name: "Tin Ore", buy: 6, sell: 3, category: "ore" },
  { key: "copper_bar", name: "Copper Bar", buy: 15, sell: 8, category: "bar" },
  { key: "bronze_bar", name: "Bronze Bar", buy: 24, sell: 12, category: "bar" },
  { key: "log", name: "Log", buy: 4, sell: 2, category: "wood" },
  { key: "oak_log", name: "Oak Log", buy: 8, sell: 4, category: "wood" },
  { key: "normal_planks", name: "Plank", buy: 8, sell: 4, category: "plank" },
  { key: "oak_plank", name: "Oak Plank", buy: 14, sell: 7, category: "plank" },
  { key: "copper_dagger", name: "Copper Dagger", buy: 30, sell: 16, category: "weapon" },
  { key: "copper_armor", name: "Copper Armor", buy: 42, sell: 24, category: "armor" },
  { key: "slime_goop", name: "Slime Goop", buy: 10, sell: 5, category: "misc" },
];

export const itemByKey = Object.fromEntries(items.map(i => [i.key, i] as const)) as Record<string, ItemDef>;
