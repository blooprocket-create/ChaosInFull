"use client";
import React, { useMemo, useState } from "react";
import { zones, ZoneDefinition } from "@/src/data/zones";
import { ENEMY_DEFS } from "@/src/game/phaser/data/enemies.js";
import type { EnemyDef, EnemyDrop } from "@/src/types/phaser-data";
import { itemByKey } from "@/src/data/items";

function formatMobStat(v: number | null, unit?: string) {
  if (v == null) return "?";
  return unit ? `${v} ${unit}` : String(v);
}

export default function WorldExplorer() {
  const [active, setActive] = useState<ZoneDefinition>(zones[0]);
  const [openEnemyId, setOpenEnemyId] = useState<string | null>(null);

  const enemiesForZone = useMemo<EnemyDef[]>(() => {
    const ids = active.enemyIds || [];
    const enemyMap = ENEMY_DEFS as unknown as Record<string, EnemyDef>;
    return ids
      .map((id) => enemyMap[id])
      .filter((e): e is EnemyDef => Boolean(e));
  }, [active]);

  // Human-friendly item name resolution for loot tables
  const ITEM_NAME_ALIASES: Record<string, string> = {
    slime_gel: "Slime Gel",
    slime_goop: "Slime Goop",
    slime_core: "Slime Core",
    slime_whip: "Slime Whip",
    minor_health_potion: "Minor Health Potion",
    minor_mana_potion: "Minor Mana Potion",
    major_health_potion: "Major Health Potion",
    major_mana_potion: "Major Mana Potion",
    copper_ore: "Copper Ore",
    tin_ore: "Tin Ore",
    rat_tail: "Rat Tail",
    rat_meat: "Rat Meat",
    toxic_essence: "Toxic Essence",
    rotting_fang: "Rotting Fang",
    spectral_essence: "Spectral Essence",
    shadow_essence: "Shadow Essence",
    slime_crown_shard: "Slime Crown Shard",
    strange_slime_egg: "Strange Slime Egg",
  };

  const titleCase = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const friendlyItemName = (id?: string) => {
    if (!id) return "?";
    const fromCatalog = itemByKey[id]?.name;
    if (fromCatalog) return fromCatalog;
    const alias = ITEM_NAME_ALIASES[id];
    if (alias) return alias;
    return titleCase(id);
  };
  const itemCategoryBadge = (id?: string) => {
    if (!id) return null;
    const def = itemByKey[id];
    if (!def) return null;
    const color = def.category === 'ore' ? 'bg-amber-600/20 border-amber-500/30 text-amber-200'
      : def.category === 'bar' ? 'bg-amber-500/20 border-amber-400/30 text-amber-100'
      : def.category === 'weapon' ? 'bg-red-600/20 border-red-500/30 text-red-200'
      : def.category === 'armor' ? 'bg-blue-600/20 border-blue-500/30 text-blue-200'
      : 'bg-white/10 border-white/20 text-gray-200';
    return <span className={`ml-2 inline-block rounded px-1 py-0.5 text-[10px] border ${color}`}>{def.category}</span>;
  };
  return (
    <div className="mt-8 grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        {zones.map(z => {
          const selected = z.key === active.key;
          return (
            <button
              key={z.key}
              onClick={() => setActive(z)}
              className={`w-full text-left rounded-lg border p-4 transition-all duration-200 ${selected ? 'border-violet-500 bg-violet-600/10' : 'border-white/10 bg-black/30 hover:border-violet-400 hover:bg-violet-500/10'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white/90">{z.name}</span>
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300">{z.connections.length} portals</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{z.description}</p>
            </button>
          );
        })}
      </div>
      <div className="lg:col-span-7 rounded-xl border border-white/10 bg-black/40 p-6 flex flex-col gap-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 size-32 rounded-full blur-2xl bg-violet-500/10" />
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold blood-underline inline-block">{active.name}</h3>
          <div className="flex gap-2">
            {active.connections.map(c => (
              <button key={c}
                      onClick={() => { const next = zones.find(z => z.key === c); if (next) setActive(next); }}
                      className="text-xs px-2 py-1 rounded bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30">
                Portal → {zones.find(z => z.key === c)?.name || c}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-300 max-w-prose">{active.description}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-black/30 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Features</div>
            <ul className="space-y-1 text-sm text-gray-200 list-disc pl-5">
              {active.features.map(f => <li key={f}>{f}</li>)}
              {active.features.length === 0 && <li className="italic text-gray-400">None</li>}
            </ul>
          </div>
          <div className="rounded-lg bg-black/30 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Resources</div>
            <ul className="space-y-1 text-sm text-gray-200 list-disc pl-5">
              {active.resources.map(r => <li key={r}>{r}</li>)}
              {active.resources.length === 0 && <li className="italic text-gray-400">None</li>}
            </ul>
          </div>
        </div>
        {active.npcs && (
          <div className="rounded-lg bg-black/30 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">NPCs</div>
            <ul className="space-y-1 text-sm text-gray-200 list-disc pl-5">
              {active.npcs.map(n => <li key={n}>{n}</li>)}
              {active.npcs.length === 0 && <li className="italic text-gray-400">None</li>}
            </ul>
          </div>
        )}
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Mobs</div>
          {active.mobs.length === 0 ? (
            <p className="text-sm text-gray-400">No mobs present.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left font-medium">Name</th>
                  <th className="text-left font-medium">HP</th>
                  <th className="text-left font-medium">DMG</th>
                  <th className="text-left font-medium">Spawn/min</th>
                  <th className="text-left font-medium">Max</th>
                </tr>
              </thead>
              <tbody>
                {active.mobs.map(m => (
                  <tr key={m.name} className="border-t border-white/5">
                    <td className="py-1 pr-2 text-gray-200">{m.name}</td>
                    <td className="py-1 pr-2 text-gray-300">{formatMobStat(m.hp)}</td>
                    <td className="py-1 pr-2 text-gray-300">{formatMobStat(m.damage)}</td>
                    <td className="py-1 pr-2 text-gray-300">{formatMobStat(m.spawnRatePerMin)}</td>
                    <td className="py-1 pr-2 text-gray-300">{formatMobStat(m.maxConcurrent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-gray-500">Values marked ? will populate once systems are implemented.</p>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Enemies</div>
          {enemiesForZone.length === 0 ? (
            <p className="text-sm text-gray-400">No enemy data mapped yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left font-medium">Name</th>
                  <th className="text-left font-medium">Tier</th>
                  <th className="text-left font-medium">Lvl</th>
                  <th className="text-left font-medium">HP</th>
                  <th className="text-left font-medium">DMG</th>
                  <th className="text-left font-medium">EXP</th>
                  <th className="text-left font-medium">Drops</th>
                </tr>
              </thead>
              <tbody>
                {enemiesForZone.map((e: EnemyDef) => (
                  <>
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="py-1 pr-2 text-gray-200">{e.name}</td>
                      <td className="py-1 pr-2 text-gray-300 capitalize">{e.tier}</td>
                      <td className="py-1 pr-2 text-gray-300">{e.level ?? '-'}</td>
                      <td className="py-1 pr-2 text-gray-300">{e.maxhp ?? '-'}</td>
                      <td className="py-1 pr-2 text-gray-300">{Array.isArray(e.damage) ? `${e.damage[0]}–${e.damage[1]}` : (e.damage ?? '-')}</td>
                      <td className="py-1 pr-2 text-gray-300">{e.exp ?? '-'}</td>
                      <td className="py-1 pr-2 text-gray-300">
                        <button
                          className="text-xs px-2 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => setOpenEnemyId((prev) => prev === e.id ? null : e.id)}
                        >{openEnemyId === e.id ? 'Hide' : 'View'}</button>
                      </td>
                    </tr>
                    {openEnemyId === e.id && (
                      <tr className="border-t border-white/5 bg-black/20">
                        <td colSpan={7} className="p-3">
                          <div className="text-xs text-gray-400">Loot Table</div>
                          <table className="w-full text-xs mt-1">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="text-left font-medium">Item</th>
                                <th className="text-left font-medium">Qty</th>
                                <th className="text-left font-medium">Chance</th>
                                <th className="text-left font-medium">Luck Bonus</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(e.drops || []).map((d: EnemyDrop, idx: number) => (
                                <tr key={`${e.id}-drop-${idx}`} className="border-t border-white/5">
                                  <td className="py-1 pr-2 text-gray-200">
                                    {friendlyItemName(d.itemId || d.itemID)}
                                    {itemCategoryBadge(d.itemId || d.itemID)}
                                  </td>
                                  <td className="py-1 pr-2 text-gray-300">{d.minQty}–{d.maxQty}</td>
                                  <td className="py-1 pr-2 text-gray-300">{d.baseChance != null ? `${Math.round(d.baseChance * 1000)/10}%` : '-'}</td>
                                  <td className="py-1 pr-2 text-gray-300">{d.luckBonus != null ? `+${Math.round(d.luckBonus * 10000)/100}%/luck` : '-'}</td>
                                </tr>
                              ))}
                              {e.gold && (
                                <tr className="border-t border-white/5">
                                  <td className="py-1 pr-2 text-yellow-300">Gold</td>
                                  <td className="py-1 pr-2 text-gray-300">{e.gold.min}–{e.gold.max}</td>
                                  <td className="py-1 pr-2 text-gray-300">{e.gold.chance != null ? `${Math.round(e.gold.chance * 1000)/10}%` : '-'}</td>
                                  <td className="py-1 pr-2 text-gray-300">{e.gold.luckBonus != null ? `+${Math.round(e.gold.luckBonus * 10000)/100}%/luck` : '-'}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
