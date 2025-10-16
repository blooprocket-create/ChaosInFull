export const RARITY_OPTIONS = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = typeof RARITY_OPTIONS[number];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#d1d5db",       // gray-300
  uncommon: "#34d399",     // emerald-400
  rare: "#60a5fa",         // blue-400
  epic: "#a78bfa",         // violet-400
  legendary: "#f59e0b",    // amber-500
};

export function getRarityColor(r: string): string {
  const key = r?.toLowerCase?.() as Rarity | undefined;
  return (key && (RARITY_COLORS as Record<string,string>)[key]) || "#d1d5db";
}
