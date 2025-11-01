// Type declarations for Phaser data JS modules used by the Next.js site

export interface Stats {
  str: number; int: number; agi: number; luk: number;
}

export interface GameClassDef {
  id: string;
  name: string;
  description?: string;
  base?: Partial<Stats>;
  perLevel?: Partial<Stats>;
  tier?: number;
  requiredClass?: string | null;
}

export interface TalentScaling {
  type: 'flat' | 'percent';
  target: string;
  base: number;
  perRank: number;
}

export interface TalentDef {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  kind?: 'passive' | 'active';
  activeType?: 'offensive' | 'defensive' | 'buff' | 'utility' | string | null;
  cooldownMs?: number;
  cooldownSeconds?: number;
  manaCost?: number;
  scaling?: TalentScaling | null;
  secondScaling?: TalentScaling | null;
}

export type TalentTabType = 'universal' | 'class' | 'subclass' | 'star';

export interface TalentTab {
  id: string;
  slot: number;
  label: string;
  description?: string;
  type: TalentTabType;
  classIds?: string[];
  talents: TalentDef[];
}

// Module declarations for JS data files (paths must match imports exactly)

declare module "@/src/game/phaser/data/classes.js" {
  import type { GameClassDef } from "@/src/types/phaser-data";
  export const CLASS_DEFS: Record<string, GameClassDef>;
  export default CLASS_DEFS;
}

declare module "@/src/game/phaser/data/talents.js" {
  import type { TalentTab } from "@/src/types/phaser-data";
  export const TALENT_TABS: Record<string, TalentTab>;
  export function getTabsForClass(classId: string): string[];
}

// Enemy data (JS module) and types used by the website
export interface EnemyDrop {
  // Some entries use itemId, one uses itemID; tolerate both to keep type-safe.
  itemId?: string;
  itemID?: string;
  minQty: number;
  maxQty: number;
  baseChance?: number; // 0..1
  luckBonus?: number;  // per-luck percent in 0..1
}

export interface EnemyGoldDrop {
  min: number;
  max: number;
  chance?: number;   // 0..1
  luckBonus?: number; // 0..1
}

export interface EnemyDef {
  id: string;
  name: string;
  tier?: string;
  dynamicStats?: boolean;
  level?: number;
  maxhp?: number;
  moveSpeed?: number;
  attackRange?: number;
  attackCooldown?: number;
  damage?: number | [number, number];
  exp?: number;
  drops?: EnemyDrop[];
  gold?: EnemyGoldDrop | null;
}

declare module "@/src/game/phaser/data/enemies.js" {
  import type { EnemyDef } from "@/src/types/phaser-data";
  export const ENEMY_DEFS: Record<string, EnemyDef>;
  export default ENEMY_DEFS;
}
