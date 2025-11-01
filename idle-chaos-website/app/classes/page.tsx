export const metadata = { title: "Classes • Veil Keeper", description: "A wiki-style reference for classes, stats, and talents.", openGraph: { title: "Veil Keeper Classes", images: ["/og/classes.png"] } };
import ClassesWiki, { ClassWiki } from "@/src/components/ClassesWiki";

// Import live game class definitions (pure data module)
// Note: this .js data file exports CLASS_DEFS as a plain object
import type { GameClassDef, TalentTab, TalentDef } from "@/src/types/phaser-data";
import { CLASS_DEFS as GAME_CLASS_DEFS } from "@/src/game/phaser/data/classes.js";
import { TALENT_TABS, getTabsForClass } from "@/src/game/phaser/data/talents.js";

function buildWikiData(): ClassWiki[] {
  // Normalize game class defs into a wiki shape
  const defs: Record<string, GameClassDef> = GAME_CLASS_DEFS || {};
  const roots: GameClassDef[] = Object.values(defs).filter((d) => !d.requiredClass);
  const t1: GameClassDef[] = Object.values(defs).filter((d) => d.requiredClass === "beginner");

  // Helper to children of a given parent id
  const childrenOf = (pid: string): GameClassDef[] => Object.values(defs).filter((d) => d.requiredClass === pid);

  const computeGroups = (classId: string) => {
    try {
      const tabIds: string[] = getTabsForClass(classId) || [];
      return tabIds
        .map((tid) => {
          const tab: TalentTab | undefined = (TALENT_TABS as unknown as Record<string, TalentTab>)[tid];
          if (!tab || !Array.isArray(tab.talents)) return null;
          return {
            tabId: tab.id,
            label: tab.label || tid,
            type: tab.type as "universal" | "class" | "subclass" | "star",
            talents: (tab.talents as TalentDef[]).map((t) => ({
              id: t.id,
              name: t.name,
              kind: t.kind,
              activeType: t.activeType || undefined,
              description: t.description,
            })),
          };
        })
        .filter((g): g is NonNullable<typeof g> => Boolean(g));
    } catch (e) {
      return [] as { tabId: string; label: string; type: "universal" | "class" | "subclass" | "star"; talents: { id: string; name: string; kind?: "passive" | "active"; activeType?: string; description?: string }[] }[];
    }
  };

  const out: ClassWiki[] = [];
  // Beginner first, then tier-1 classes, each with their children as paths
  const beginner = roots.find((r) => r.id === "beginner");
  if (beginner) {
    out.push({
      id: beginner.id,
      name: beginner.name,
      description: beginner.description || "",
      base: beginner.base || undefined,
      perLevel: beginner.perLevel || undefined,
      paths: t1.map((p) => ({ id: p.id, name: p.name })),
      groups: computeGroups(beginner.id),
    });
  }
  // Each T1 class section, with Tier-2 children as paths
  for (const d of t1) {
    out.push({
      id: d.id,
      name: d.name,
      description: d.description || "",
      base: d.base || undefined,
      perLevel: d.perLevel || undefined,
      paths: childrenOf(d.id).map((p) => ({ id: p.id, name: p.name })),
      groups: computeGroups(d.id),
    });
  }
  return out;
}

export default function ClassesPage() {
  const wikiData = buildWikiData();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12 animate-fade-in">
      {/* Spooky overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.3),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(239,68,68,0.25),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="Classes">Classes</h1>
      <p className="mt-2 text-gray-300">A wiki-style reference for class stats and every talent, grouped by tab. Use the search to find talents quickly, and toggle to hide Star (account-wide) talents or show only active skills.</p>

      <div className="mt-6">
        <ClassesWiki classes={wikiData} />
      </div>

      <div className="mt-12 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold blood-underline inline-block">Talent & Stat Tips</h2>
        <ul className="mt-2 list-disc list-inside text-gray-300 text-sm">
          <li>Bind actives to 1–9 and practice on Slime Meadows before pushing harder pockets.</li>
          <li>Prioritize clear synergy: if your talent tree rewards DoT, stack duration/uptime before raw damage.</li>
          <li>Craft early power spikes in Town—bars into basic gear beats raw stat grinding.</li>
        </ul>
      </div>
    </section>
  );
}
