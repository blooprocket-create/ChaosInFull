export type SkillProgress = {
  level: number;
  exp: number;        // exp into current level
  expToLevel: number; // required exp to next level (0 if capped)
};

// Compute derived skill level and progress from a raw exp counter.
// base: exp required for level 1->2; growth: multiplicative growth per level; maxLevel: cap
export function deriveSkillProgressFromExp(
  rawExp: number,
  opts?: { base?: number; growth?: number; maxLevel?: number }
): SkillProgress {
  const base = Math.max(1, Math.floor(opts?.base ?? 100));
  const growth = Math.max(1.0, opts?.growth ?? 1.25);
  const maxLevel = Math.max(1, Math.floor(opts?.maxLevel ?? 200));
  let level = 1;
  let expRemaining = Math.max(0, Math.floor(rawExp || 0));
  let required = base;
  while (level < maxLevel) {
    if (expRemaining < required) break;
    expRemaining -= required;
    level += 1;
    required = Math.floor(required * growth);
    if (required < 1) required = 1;
  }
  // If at cap, there is no next level; show 0 to avoid ticking bars
  const expToLevel = level >= maxLevel ? 0 : required;
  return { level, exp: expRemaining, expToLevel };
}
