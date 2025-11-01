"use client";
import React, { useMemo, useState } from "react";
import type { ClassArchetype } from "./ClassesExplorer";

export default function ClassDetails({ archetype }: { archetype: ClassArchetype }) {
  const a = archetype;
  const [activePathKey, setActivePathKey] = useState<string | null>(null);
  const activePath = a.paths.find(p => p.key === activePathKey) || null;
  const [showActives, setShowActives] = useState(true);
  const [showPassives, setShowPassives] = useState(true);
  const [collapsedTabs, setCollapsedTabs] = useState<Record<string, boolean>>({});
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const maxRank = 5;

  const valueAtRank = (base: number, perRank: number, r: number) => {
    if (!r || r <= 0) return 0;
    return base + (r - 1) * perRank;
  };
  const describeScaling = (
    s: { type: "flat" | "percent"; target: string; base: number; perRank: number } | null | undefined,
    r: number
  ) => {
    if (!s) return null;
    const v = valueAtRank(s.base, s.perRank, r);
    if (r <= 0) return `(+0 ${s.type === "percent" ? "%" : ""} ${s.target})`;
    return s.type === "percent" ? `(+${v}% ${s.target})` : `(+${v} ${s.target})`;
  };

  const talentVisible = (t: { kind?: string }) => {
    const isActive = t.kind === "active";
    if (isActive && !showActives) return false;
    if (!isActive && !showPassives) return false;
    return true;
  };

  const currentVisibleTalentIds = useMemo(() => {
    if (!a.talentsByTab) return [] as string[];
    const ids: string[] = [];
    for (const group of a.talentsByTab) {
      if (collapsedTabs[group.tabId]) continue;
      for (const t of group.talents) {
        if (talentVisible(t)) ids.push(t.id);
      }
    }
    return ids;
  }, [a.talentsByTab, collapsedTabs, showActives, showPassives]);

  const resetRanks = () => setRanks(prev => {
    const next = { ...prev };
    for (const id of currentVisibleTalentIds) next[id] = 0;
    return next;
  });
  const maxAllRanks = () => setRanks(prev => {
    const next = { ...prev };
    for (const id of currentVisibleTalentIds) next[id] = maxRank;
    return next;
  });

  return (
    <section id={`class-${a.key}`} className="rounded-xl border border-white/10 bg-black/40 p-6 flex flex-col gap-5 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 size-32 rounded-full blur-2xl bg-violet-500/10" />
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold blood-underline inline-block">{a.name}</h3>
        <div className="flex gap-2 flex-wrap justify-end">
          {a.paths.map(p => (
            <button
              key={p.key}
              onClick={() => setActivePathKey(p.key)}
              className={`text-xs px-2 py-1 rounded border transition-colors duration-200 ${activePathKey === p.key ? 'bg-violet-600/30 border-violet-500' : 'bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20'}`}
            >Path → {p.name}</button>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-300 max-w-prose">{a.blurb}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Starter Talents</div>
          <ul className="space-y-1 text-sm text-gray-200 list-disc pl-5">
            {a.starterTalents.map(t => <li key={t}>{t}</li>)}
          </ul>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/10 p-4" key={activePathKey || 'none'}>
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Selected Path</div>
          {activePath ? (
            <div>
              <div className="font-medium text-gray-200">{activePath.name}</div>
              <p className="text-xs text-gray-400 mt-1">{activePath.focus}</p>
              <ul className="mt-2 list-disc pl-5 text-gray-300 text-xs space-y-1">
                {activePath.talents.map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Select a path above to inspect its flavor & early talents.</p>
          )}
        </div>
      </div>
      {(a.base || a.perLevel) && (
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Stats</div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
            <div>
              <div className="text-gray-400 mb-1">Base</div>
              <ul className="space-y-0.5">
                <li>STR: {a.base?.str ?? 0}</li>
                <li>INT: {a.base?.int ?? 0}</li>
                <li>AGI: {a.base?.agi ?? 0}</li>
                <li>LUK: {a.base?.luk ?? 0}</li>
              </ul>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Per Level</div>
              <ul className="space-y-0.5">
                <li>STR: {a.perLevel?.str ?? 0}</li>
                <li>INT: {a.perLevel?.int ?? 0}</li>
                <li>AGI: {a.perLevel?.agi ?? 0}</li>
                <li>LUK: {a.perLevel?.luk ?? 0}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {a.talentsByTab && a.talentsByTab.length > 0 && (
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-gray-400">All Talents</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-300">
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" className="accent-violet-500" checked={showActives} onChange={e => setShowActives(e.target.checked)} />
                Actives
              </label>
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" className="accent-violet-500" checked={showPassives} onChange={e => setShowPassives(e.target.checked)} />
                Passives
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={resetRanks} className="rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-gray-200">Reset ranks</button>
              <button onClick={maxAllRanks} className="rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-gray-200">Max visible</button>
              <button
                onClick={async () => {
                  try {
                    const hash = `#class-${a.key}${activePathKey ? `-path-${activePathKey}` : ''}`;
                    const url = `${window.location.origin}${window.location.pathname}${hash}`;
                    await navigator.clipboard.writeText(url);
                  } catch { /* noop */ }
                }}
                className="rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-gray-200"
              >Copy link</button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {a.talentsByTab.map(group => {
              const collapsed = !!collapsedTabs[group.tabId];
              return (
                <div key={group.tabId} className="text-xs">
                  <button
                    className="w-full flex items-center justify-between mb-1 font-medium text-gray-200 hover:text-white"
                    onClick={() => setCollapsedTabs(prev => ({ ...prev, [group.tabId]: !prev[group.tabId] }))}
                    aria-expanded={!collapsed}
                    aria-controls={`tab-${a.key}-${group.tabId}`}
                  >
                    <span>{group.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">{collapsed ? 'show' : 'hide'}</span>
                  </button>
                  {!collapsed && (
                    <ul id={`tab-${a.key}-${group.tabId}`} className="space-y-1 text-gray-300">
                      {group.talents.filter(talentVisible).map(t => {
                        const r = ranks[t.id] ?? 0;
                        const primary = describeScaling(t.scaling, r);
                        const secondary = describeScaling(t.secondScaling, r);
                        return (
                          <li key={t.id} className="border border-white/5 rounded p-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-gray-200">
                                  {t.name}
                                  {t.kind === 'active' && (
                                    <span className="ml-2 inline-block rounded px-1 py-0.5 text-[10px] bg-violet-600/20 border border-violet-600/40 text-violet-200 align-middle">active{t.activeType ? `/${t.activeType}` : ''}</span>
                                  )}
                                </div>
                                {t.description && (<div className="text-[11px] text-gray-400 mt-0.5 line-clamp-3">{t.description}</div>)}
                                {(t.scaling || t.secondScaling) && (
                                  <div className="text-[11px] text-emerald-300/90 mt-1">
                                    <span className="mr-2">Rank {r}</span>
                                    {primary && <span className="mr-2">{primary}</span>}
                                    {secondary && <span>{secondary}</span>}
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-1">
                                <button
                                  className="size-6 grid place-content-center rounded border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                                  onClick={() => setRanks(prev => ({ ...prev, [t.id]: Math.max(0, (prev[t.id] ?? 0) - 1) }))}
                                  aria-label={`Decrease ${t.name} rank`}
                                >−</button>
                                <div className="text-xs w-6 text-center">{r}</div>
                                <button
                                  className="size-6 grid place-content-center rounded border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                                  onClick={() => setRanks(prev => ({ ...prev, [t.id]: Math.min(maxRank, (prev[t.id] ?? 0) + 1) }))}
                                  aria-label={`Increase ${t.name} rank`}
                                >+</button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
