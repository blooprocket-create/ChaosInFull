"use client";
import React, { useState } from "react";
import { zones, ZoneDefinition } from "@/src/data/zones";

function formatMobStat(v: number | null, unit?: string) {
  if (v == null) return "?";
  return unit ? `${v} ${unit}` : String(v);
}

export default function WorldExplorer() {
  const [active, setActive] = useState<ZoneDefinition>(zones[0]);
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
      </div>
    </div>
  );
}
