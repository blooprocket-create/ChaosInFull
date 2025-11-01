import type { EnemyDef, EnemyGoldDrop } from "@/src/types/phaser-data";

export type ScaledEnemy = EnemyDef & {
  // Fields guaranteed by computeEnemyStats
  maxhp: number;
  damage: [number, number];
  exp: number;
  gold: EnemyGoldDrop;
  attackCooldown?: number;
  moveSpeed?: number;
  attackRange?: number;
};

declare module "../../chaosinfull/src/data/statFormulas.js" {
  import type { EnemyDef } from "@/src/types/phaser-data";
  import type { ScaledEnemy } from "@/src/types/stat-formulas";
  export function computeEnemyStats(def: EnemyDef): ScaledEnemy;
}