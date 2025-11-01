"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface ClassArchetype {
  key: string;
  name: string;
  synopsis: string;
  blurb: string;
  color: string; // tailwind gradient from-*
  // Optional stat hints (from game data)
  base?: { str?: number; int?: number; agi?: number; luk?: number };
  perLevel?: { str?: number; int?: number; agi?: number; luk?: number };
  talentsByTab?: Array<{
    tabId: string;
    label: string;
    talents: Array<{
      id: string;
      name: string;
      kind?: string;
      activeType?: string;
      description?: string;
      scaling?: { type: 'flat' | 'percent'; target: string; base: number; perRank: number } | null;
      secondScaling?: { type: 'flat' | 'percent'; target: string; base: number; perRank: number } | null;
    }>;
  }>;
  paths: Array<{
    key: string;
    name: string;
    focus: string; // short flavor
    talents: string[]; // starter / notable early talents
  }>;
  starterTalents: string[];
}

export const archetypes: ClassArchetype[] = [
  {
    key: "beginner",
    name: "Beginner",
    synopsis: "Soft stats. High curiosity. Possesses wooden optimism.",
    blurb: "Fresh, fragile, and armed with optimism + splintered wood. Chooses corruption flavor later.",
    color: "from-gray-700/40",
    starterTalents: ["Quick Jab", "Pack Mule", "Curiosity"],
    paths: [
      { key: "horror", name: "Horror", focus: "Aggressive melee fueled by whispering plate.", talents: ["Cleave", "Iron Will", "Blood Oath"] },
      { key: "occultist", name: "Occultist", focus: "Forbidden glyphs, ward weaving, astral siphoning.", talents: ["Hex Bolt", "Runic Ward", "Astral Tap"] },
      { key: "stalker", name: "Stalker", focus: "Precision bursts, positional bleed stacking.", talents: ["Lacerate", "Backstep", "Veil"] },
    ],
  },
  {
    key: "horror",
    name: "Horror",
    synopsis: "A guilt-powered wrecking suit. Armor mutters market advice.",
    blurb: "Not a 'warrior'—a guilt-powered wrecking suit that monetizes collision.",
    color: "from-red-900/40",
    starterTalents: ["Cleave", "Iron Will", "Blood Oath"],
    paths: [
      { key: "ravager", name: "Ravager", focus: "Area denial, durability, sustained bleed pressure.", talents: ["Hemorrhage Field", "Bone Grind", "Unyielding Frame"] },
      { key: "sanguine", name: "Sanguine", focus: "Self-sustain via vampiric overkill + risk loops.", talents: ["Crimson Draw", "Pulse Feast", "Last Drop"] },
    ],
  },
  {
    key: "occultist",
    name: "Occultist",
    synopsis: "Subscribes only to banned quarterly journals.",
    blurb: "Refuses normal spell schools. Trades stability for layered hex engines.",
    color: "from-purple-900/40",
    starterTalents: ["Hex Bolt", "Runic Ward", "Astral Tap"],
    paths: [
      { key: "hexweaver", name: "Hexweaver", focus: "Stacking curses, debuff propagation, control.", talents: ["Curse Stitch", "Hex Bloom", "Bind Thread"] },
      { key: "astral", name: "Astral Scribe", focus: "Glyph scripting, delayed burst sigils, mana cycling.", talents: ["Glyph Etch", "Void Margin", "Astral Recompile"] },
    ],
  },
  {
    key: "stalker",
    name: "Stalker",
    synopsis: "Speed as a personality disorder. Presence measured in heart rate spikes.",
    blurb: "Thrives on motion debt. High crit windows gated by positional discipline.",
    color: "from-emerald-900/40",
    starterTalents: ["Lacerate", "Backstep", "Veil"],
    paths: [
      { key: "nightblade", name: "Nightblade", focus: "Shadow tagging, burst chains, mark detonation.", talents: ["Umbral Tag", "Pierce Chain", "Night Debt"] },
      { key: "shade", name: "Shade Dancer", focus: "Evasion loops, after-image strikes, soft crowd drift.", talents: ["Silhouette", "Phase Musk", "Echo Step"] },
    ],
  },
];

export interface ClassesExplorerProps {
  data?: ClassArchetype[];
}

export default function ClassesExplorer(props: ClassesExplorerProps = {}) {
  const dataList = (props.data && props.data.length ? props.data : archetypes);
  // Search/filter state for wiki-like navigation
  const [query, setQuery] = useState("");
  const [showActives, setShowActives] = useState(true);
  const [showPassives, setShowPassives] = useState(true);
  const [collapsedTabs, setCollapsedTabs] = useState<Record<string, boolean>>({});

  const [active, setActive] = useState<ClassArchetype>(dataList[0]);
  const [activePathKey, setActivePathKey] = useState<string | null>(null);
  const activePath = active.paths.find(p => p.key === activePathKey) || null;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = useMemo(() => dataList.findIndex(a => a.key === active.key), [active, dataList]);
  // Ephemeral rank allocation for previewing talent bonuses (0..5)
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const maxRank = 5;
  const valueAtRank = (base: number, perRank: number, r: number) => {
    if (!r || r <= 0) return 0;
    return base + (r - 1) * perRank;
  };
  const describeScaling = (s: { type: 'flat' | 'percent'; target: string; base: number; perRank: number } | null | undefined, r: number) => {
    if (!s) return null;
    const v = valueAtRank(s.base, s.perRank, r);
    if (r <= 0) return `(+0 ${s.type === 'percent' ? '%' : ''} ${s.target})`;
    return s.type === 'percent' ? `(+${v}% ${s.target})` : `(+${v} ${s.target})`;
  };
  // Compute filtered left-hand list
  const visibleList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dataList;
    return dataList.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.synopsis.toLowerCase().includes(q) ||
      a.paths.some(p => p.name.toLowerCase().includes(q))
    );
  }, [dataList, query]);
  // Ensure selection stays valid when filtering by hash or search
  useEffect(() => {
    if (!visibleList.length) return; // don't change if nothing visible
    if (!visibleList.find(a => a.key === active.key)) {
      setActive(visibleList[0]);
      setActivePathKey(null);
    }
  }, [visibleList, active.key]);
  // Hash navigation: #class-<key>[-path-<pathKey>]
  useEffect(() => {
    const parseHash = () => {
      const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '';
      const m = raw.match(/^#class-([a-z0-9_-]+)(?:-path-([a-z0-9_-]+))?$/i);
      if (!m) return;
      const [, cKey, pKey] = m;
      const found = dataList.find(a => a.key === cKey);
      if (found) {
        setActive(found);
        if (pKey && found.paths.find(p => p.key === pKey)) setActivePathKey(pKey);
        else setActivePathKey(null);
      }
    };
    parseHash();
    const onHash = () => parseHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [dataList]);
  useEffect(() => {
    // Update hash when selection changes (avoid scroll jump with replaceState)
    const hash = `#class-${active.key}${activePathKey ? `-path-${activePathKey}` : ''}`;
    try {
      history.replaceState(null, "", hash);
    } catch {
      window.location.hash = hash;
    }
  }, [active.key, activePathKey]);
  // Keyboard navigation between archetypes and paths
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        const next = (activeIndex - 1 + dataList.length) % dataList.length;
        setActive(dataList[next]); setActivePathKey(null);
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        const next = (activeIndex + 1) % dataList.length;
        setActive(dataList[next]); setActivePathKey(null);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        if (!active.paths.length) return;
        e.preventDefault();
        const idx = Math.max(0, active.paths.findIndex(p => p.key === activePathKey));
        const next = active.paths[(idx + 1) % active.paths.length];
        setActivePathKey(next.key);
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        if (!active.paths.length) return;
        e.preventDefault();
        const idx = Math.max(0, active.paths.findIndex(p => p.key === activePathKey));
        const prev = active.paths[(idx - 1 + active.paths.length) % active.paths.length];
        setActivePathKey(prev.key);
      }
    };
    el.addEventListener("keydown", onKey);
    el.tabIndex = 0;
    el.focus({ preventScroll: true });
    return () => el.removeEventListener("keydown", onKey);
  }, [activeIndex, active, activePathKey, dataList]);
  // Utility for tag chips based on class key (lightweight wiki hinting)
  const roleChips = (key: string): string[] => {
    if (key === 'horror' || key === 'ravager' || key === 'sanguine') return ['frontline', 'control'];
    if (key === 'occultist' || key === 'hexweaver' || key === 'astral') return ['caster', 'debuff'];
    if (key === 'stalker' || key === 'nightblade' || key === 'shade') return ['dps', 'mobility'];
    return ['generalist'];
  };
  // Talent filters
  const talentVisible = (t: { kind?: string }) => {
    const isActive = t.kind === 'active';
    if (isActive && !showActives) return false;
    if (!isActive && !showPassives) return false;
    return true;
  };
  // Bulk rank helpers for visible talents
  const currentVisibleTalentIds = useMemo(() => {
    if (!active.talentsByTab) return [] as string[];
    const ids: string[] = [];
    for (const group of active.talentsByTab) {
      if (collapsedTabs[group.tabId]) continue;
      for (const t of group.talents) {
        if (talentVisible(t)) ids.push(t.id);
      }
    }
    return ids;
  }, [active.talentsByTab, collapsedTabs, showActives, showPassives, talentVisible]);
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
    <div ref={containerRef} className="mt-8 grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4 lg:sticky lg:self-start top-24">
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <label htmlFor="class-search" className="block text-[11px] text-gray-400 mb-1">Search classes</label>
          <input
            id="class-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an archetype or path..."
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        {visibleList.map(a => {
          const selected = a.key === active.key;
          return (
            <button
              key={a.key}
              onClick={() => { setActive(a); setActivePathKey(null); }}
              className={`w-full text-left rounded-lg border p-4 transition-all duration-300 ease-out bg-gradient-to-br ${a.color} to-black ${selected ? 'border-violet-500 ring-1 ring-violet-400/30 shadow-[0_8px_30px_rgba(139,92,246,0.08)] scale-[1.01]' : 'border-white/10 hover:border-violet-400 hover:scale-[1.01]'} relative overflow-hidden will-change-transform`}
            >
              <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white/90">{a.name}</span>
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300">{a.paths.length} paths</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{a.synopsis}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {roleChips(a.key).map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-white/5 border border-white/10 text-gray-300">{tag}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div id={`class-${active.key}`} className="lg:col-span-7 rounded-xl border border-white/10 bg-black/40 p-6 flex flex-col gap-5 relative overflow-hidden animate-scale-in">
        <div className="absolute -right-10 -top-10 size-32 rounded-full blur-2xl bg-violet-500/10" />
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold blood-underline inline-block">{active.name}</h3>
          <div className="flex gap-2 flex-wrap justify-end">
            {active.paths.map(p => (
              <button
                key={p.key}
                onClick={() => setActivePathKey(p.key)}
                className={`text-xs px-2 py-1 rounded border transition-colors duration-200 ${activePathKey === p.key ? 'bg-violet-600/30 border-violet-500' : 'bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20'}`}
              >Path → {p.name}</button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-300 max-w-prose">{active.blurb}</p>
        <div className="flex flex-wrap items-center gap-2 justify-between">
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
                  const hash = `#class-${active.key}${activePathKey ? `-path-${activePathKey}` : ''}`;
                  const url = `${window.location.origin}${window.location.pathname}${hash}`;
                  await navigator.clipboard.writeText(url);
                } catch { /* noop */ }
              }}
              className="rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-gray-200"
            >Copy link</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-black/30 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Starter Talents</div>
            <ul className="space-y-1 text-sm text-gray-200 list-disc pl-5">
              {active.starterTalents.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div className="rounded-lg bg-black/30 border border-white/10 p-4 animate-fade-in" key={activePathKey || 'none'}>
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
        {(active.base || active.perLevel) && (
          <div className="rounded-lg bg-black/30 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Stats</div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
              <div>
                <div className="text-gray-400 mb-1">Base</div>
                <ul className="space-y-0.5">
                  <li>STR: {active.base?.str ?? 0}</li>
                  <li>INT: {active.base?.int ?? 0}</li>
                  <li>AGI: {active.base?.agi ?? 0}</li>
                  <li>LUK: {active.base?.luk ?? 0}</li>
                </ul>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Per Level</div>
                <ul className="space-y-0.5">
                  <li>STR: {active.perLevel?.str ?? 0}</li>
                  <li>INT: {active.perLevel?.int ?? 0}</li>
                  <li>AGI: {active.perLevel?.agi ?? 0}</li>
                  <li>LUK: {active.perLevel?.luk ?? 0}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {active.talentsByTab && active.talentsByTab.length > 0 && (
          <div className="rounded-lg bg-black/30 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">All Talents</div>
            <div className="grid sm:grid-cols-2 gap-4">
              {active.talentsByTab.map(group => {
                const collapsed = !!collapsedTabs[group.tabId];
                return (
                  <div key={group.tabId} className="text-xs">
                    <button
                      className="w-full flex items-center justify-between mb-1 font-medium text-gray-200 hover:text-white"
                      onClick={() => setCollapsedTabs(prev => ({ ...prev, [group.tabId]: !prev[group.tabId] }))}
                      aria-expanded={!collapsed}
                      aria-controls={`tab-${group.tabId}`}
                    >
                      <span>{group.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">{collapsed ? 'show' : 'hide'}</span>
                    </button>
                    {!collapsed && (
                      <ul id={`tab-${group.tabId}`} className="space-y-1 text-gray-300">
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
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Advancement Notes</div>
          <p className="text-xs text-gray-400">Further branches (Tier 2+) unlock after meeting zone milestones & stat gates. Numbers subject to ritual balancing.</p>
        </div>
      </div>
    </div>
  );
}
