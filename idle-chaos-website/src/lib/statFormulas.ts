import type { EnemyDef, EnemyGoldDrop } from "@/src/types/phaser-data";

export const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1.0,
  uncommon: 1.15,
  rare: 1.35,
  epic: 1.6,
  legendary: 2.5,
  boss: 6.0,
  "world boss": 12.0,
  world_boss: 12.0,
};

function clampInt(v: number, min = 0): number { return Math.max(min, Math.floor(v)); }

export type ScaledEnemy = EnemyDef & {
  maxhp: number;
  damage: [number, number];
  exp: number;
  gold: EnemyGoldDrop;
  attackCooldown?: number;
  moveSpeed?: number;
  attackRange?: number;
};

export function computeEnemyStats(def: EnemyDef): ScaledEnemy {
  const level = Math.max(1, parseInt(String(def.level ?? 1), 10));
  const tier = String(def.tier ?? 'common').toLowerCase();
  const mult = RARITY_MULTIPLIERS[tier] ?? 1.0;

  const baseHp = 18; // baseline per-level constant
  const hp = clampInt((baseHp * Math.pow(level, 1.18)) * mult, 1);

  const dmgBase = Math.max(1, (Math.pow(level, 1.02) * 1.4) * mult);
  const dmgVariance = Math.max(1, Math.round(dmgBase * 0.45));
  const dmgMin = Math.max(1, Math.round(dmgBase - dmgVariance));
  const dmgMax = Math.max(dmgMin + 1, Math.round(dmgBase + dmgVariance));

  const exp = clampInt(Math.round(8 * Math.pow(level, 1.1) * mult));

  const goldAvg = Math.max(0, Math.round((level * 0.9) * (mult / 1.2)));
  const goldMin = Math.max(0, Math.floor(goldAvg * 0.6));
  const goldMax = Math.max(goldMin, Math.ceil(goldAvg * 1.6));

  const attackCooldown = (typeof def.attackCooldown === 'number') ? def.attackCooldown : Math.max(420, Math.round(1400 - (level * 18) * Math.min(1.4, mult)));
  const moveSpeed = (typeof def.moveSpeed === 'number') ? def.moveSpeed : Math.round(60 + (level * 3) + (mult - 1) * 8);
  const attackRange = (typeof def.attackRange === 'number') ? def.attackRange : Math.round(36 + (Math.min(level, 12) * 2));

  const gold: EnemyGoldDrop = def.gold ?? { min: goldMin, max: goldMax, chance: 0.9 };

  return {
    ...def,
    maxhp: hp,
    damage: [dmgMin, dmgMax],
    exp,
    gold,
    attackCooldown,
    moveSpeed,
    attackRange,
  };
}
