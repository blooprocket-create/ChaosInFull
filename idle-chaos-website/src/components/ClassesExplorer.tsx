"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface ClassArchetype {
  key: string;
  name: string;
  synopsis: string;
  blurb: string;
  color: string; // tailwind gradient from-*
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

export default function ClassesExplorer() {
  const [active, setActive] = useState<ClassArchetype>(archetypes[0]);
  const [activePathKey, setActivePathKey] = useState<string | null>(null);
  const activePath = active.paths.find(p => p.key === activePathKey) || null;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = useMemo(() => archetypes.findIndex(a => a.key === active.key), [active]);
  // Keyboard navigation between archetypes and paths
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        const next = (activeIndex - 1 + archetypes.length) % archetypes.length;
        setActive(archetypes[next]); setActivePathKey(null);
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        const next = (activeIndex + 1) % archetypes.length;
        setActive(archetypes[next]); setActivePathKey(null);
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
  }, [activeIndex, active, activePathKey]);
  return (
    <div ref={containerRef} className="mt-8 grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        {archetypes.map(a => {
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
            </button>
          );
        })}
      </div>
      <div className="lg:col-span-7 rounded-xl border border-white/10 bg-black/40 p-6 flex flex-col gap-5 relative overflow-hidden animate-scale-in">
        <div className="absolute -right-10 -top-10 size-32 rounded-full blur-2xl bg-violet-500/10" />
        <div className="flex items-start justify-between">
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
        <div className="rounded-lg bg-black/30 border border-white/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Advancement Notes</div>
          <p className="text-xs text-gray-400">Further branches (Tier 2+) unlock after meeting zone milestones & stat gates. Numbers subject to ritual balancing.</p>
        </div>
      </div>
    </div>
  );
}
