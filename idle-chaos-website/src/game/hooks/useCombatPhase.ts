// Legacy hook removed. This stub remains only to keep TypeScript from failing when including all files under src.
// Do not import this file. It will throw if executed.
export type Mob = { id: string; hp: number; maxHp: number; level: number; pos: { x: number; y: number } };
export type CombatSnapshot = { snapshot?: { mobs?: Mob[] } };
export type UseCombatPhaseArgs = { zone: "Slime"; characterId?: string; pollMs?: number };

export function useCombatPhase(): never {
  throw new Error("useCombatPhase is deprecated and has been removed. Use the Phaser game flow instead.");
}

export default useCombatPhase;
