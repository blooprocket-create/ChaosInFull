"use client";
import React, { useMemo, useState } from "react";

export type TalentEntry = {
  id: string;
  name: string;
  description?: string;
  kind?: "passive" | "active";
  activeType?: string | null;
};

export type TalentGroup = {
  tabId: string;
  label: string;
  type: "universal" | "class" | "subclass" | "star";
  talents: TalentEntry[];
};

export type ClassWiki = {
  id: string;
  name: string;
  description?: string;
  base?: { str?: number; int?: number; agi?: number; luk?: number };
  perLevel?: { str?: number; int?: number; agi?: number; luk?: number };
  paths?: { id: string; name: string }[];
  groups: TalentGroup[];
};

export interface ClassesWikiProps {
  classes: ClassWiki[];
}

export default function ClassesWiki({ classes }: ClassesWikiProps) {
  const [query, setQuery] = useState("");
  const [hideStar, setHideStar] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);

  const normalized = useMemo(() => classes, [classes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterByTalent = (g: TalentGroup): TalentGroup => ({
      ...g,
      talents: g.talents.filter((t) => {
        if (activeOnly && t.kind !== "active") return false;
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
        );
      }),
    });

    return normalized
      .map((c) => {
        const groups = c.groups
          .filter((g) => (hideStar ? g.type !== "star" : true))
          .map(filterByTalent)
          .filter((g) => g.talents.length > 0);
        const matchClass = q
          ? c.name.toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q)
          : true;
        const hasTalentMatches = groups.some((g) => g.talents.length > 0);
        if (!matchClass && q && !hasTalentMatches) return null;
        return { ...c, groups };
      })
      .filter(Boolean) as ClassWiki[];
  }, [normalized, query, hideStar, activeOnly]);

  return (
    <div className="mt-8 grid lg:grid-cols-12 gap-6">
      {/* TOC */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Search & Filters</div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search class or talents..."
            className="w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-200 outline-none focus:border-violet-500"
          />
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={hideStar} onChange={(e) => setHideStar(e.target.checked)} />
              Hide Star tab
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Active talents only
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 sticky top-20">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Classes</div>
          <ul className="space-y-1 text-sm">
            {normalized.map((c) => (
              <li key={c.id}>
                <a href={`#class-${c.id}`} className="text-gray-300 hover:text-violet-300 transition-colors">{c.name}</a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      {/* Content */}
      <div className="lg:col-span-9 space-y-8">
        {filtered.map((c) => (
          <section key={c.id} id={`class-${c.id}`} className="rounded-xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h2 className="text-xl font-semibold blood-underline inline-block">{c.name}</h2>
              {c.paths && c.paths.length > 0 && (
                <div className="flex gap-2 flex-wrap text-[11px]">
                  {c.paths.map((p) => (
                    <span key={p.id} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300">{p.name}</span>
                  ))}
                </div>
              )}
            </div>
            {c.description && (
              <p className="text-sm text-gray-300 mt-1">{c.description}</p>
            )}
            {(c.base || c.perLevel) && (
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-black/40 border border-white/10 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Base</div>
                  <ul className="space-y-0.5 text-xs text-gray-300">
                    <li>STR: {c.base?.str ?? 0}</li>
                    <li>INT: {c.base?.int ?? 0}</li>
                    <li>AGI: {c.base?.agi ?? 0}</li>
                    <li>LUK: {c.base?.luk ?? 0}</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-black/40 border border-white/10 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Per Level</div>
                  <ul className="space-y-0.5 text-xs text-gray-300">
                    <li>STR: {c.perLevel?.str ?? 0}</li>
                    <li>INT: {c.perLevel?.int ?? 0}</li>
                    <li>AGI: {c.perLevel?.agi ?? 0}</li>
                    <li>LUK: {c.perLevel?.luk ?? 0}</li>
                  </ul>
                </div>
              </div>
            )}
            {/* Talent groups */}
            <div className="mt-4 space-y-3">
              {c.groups.map((g) => (
                <details key={g.tabId} className="rounded-lg bg-black/30 border border-white/10 p-4" open={g.type !== "star"}>
                  <summary className="cursor-pointer text-sm font-medium text-gray-200 flex items-center justify-between">
                    <span>{g.label}</span>
                    <span className="text-[11px] text-gray-400">{g.talents.length} talents</span>
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {g.talents.map((t) => (
                      <li key={t.id} className="text-xs text-gray-300">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-100">{t.name}</span>
                          {t.kind === "active" && (
                            <span className="inline-block rounded px-1 py-0.5 text-[10px] bg-violet-600/20 border border-violet-600/40 text-violet-200">active{t.activeType ? `/${t.activeType}` : ""}</span>
                          )}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{t.description}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-400">No classes or talents match your search.</div>
        )}
      </div>
    </div>
  );
}
