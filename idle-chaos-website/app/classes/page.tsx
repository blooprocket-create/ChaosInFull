export const metadata = { title: "Classes • Veil Keeper", description: "A wiki-style overview of archetypes and talent paths.", openGraph: { title: "Veil Keeper Classes", images: ["/og/classes.png"] } };
import ClassesExplorer, { ClassArchetype } from "@/src/components/ClassesExplorer";
import ClassDetails from "@/src/components/ClassDetails";

// Import live game class definitions (pure data module)
// Note: this .js data file exports CLASS_DEFS as a plain object
import type { GameClassDef, TalentTab, TalentDef } from "@/src/types/phaser-data";
import { CLASS_DEFS as GAME_CLASS_DEFS } from "@/src/game/phaser/data/classes.js";
import { TALENT_TABS, getTabsForClass } from "@/src/game/phaser/data/talents.js";

function toArchetypesFromGame(): ClassArchetype[] {
  // Normalize game class defs into the explorer shape
  const defs: Record<string, GameClassDef> = GAME_CLASS_DEFS || {};
  const roots: GameClassDef[] = Object.values(defs).filter((d) => !d.requiredClass);
  const t1: GameClassDef[] = Object.values(defs).filter((d) => d.requiredClass === "beginner");

  // Helper to children of a given parent id
  const childrenOf = (pid: string): GameClassDef[] => Object.values(defs).filter((d) => d.requiredClass === pid);

  const colorForTier = (tier: number) => tier >= 2 ? "from-violet-900/40" : tier === 1 ? "from-red-900/40" : "from-gray-700/40";

  const computeTalentsByTab = (classId: string) => {
    try {
  const tabIds: string[] = getTabsForClass(classId) || [];
      return tabIds
        .map((tid) => {
          const tab: TalentTab | undefined = (TALENT_TABS as unknown as Record<string, TalentTab>)[tid];
          if (!tab || !Array.isArray(tab.talents)) return null;
          return {
            tabId: tab.id,
            label: tab.label || tid,
            talents: (tab.talents as TalentDef[]).map((t) => ({
              id: t.id,
              name: t.name,
              kind: t.kind,
              activeType: t.activeType || undefined,
              description: t.description,
              // include scaling metadata for simulator
              scaling: t.scaling || null,
              secondScaling: t.secondScaling || null,
            })),
          };
        })
        .filter((g): g is NonNullable<typeof g> => Boolean(g));
    } catch {
      return [] as { tabId: string; label: string; talents: { id: string; name: string; kind?: string; activeType?: string; description?: string }[] }[];
    }
  };

  const makePath = (d: GameClassDef) => ({
    key: d.id,
    name: d.name,
    focus: d.description || "",
    talents: [] as string[],
  });

  const out: ClassArchetype[] = [];
  // Beginner first, then tier-1 classes, each with their children as paths
  const beginner = roots.find((r) => r.id === "beginner");
  if (beginner) {
    out.push({
      key: beginner.id,
      name: beginner.name,
      synopsis: beginner.description || "",
      blurb: beginner.description || "",
      color: colorForTier(beginner.tier || 0),
      base: beginner.base || undefined,
      perLevel: beginner.perLevel || undefined,
      talentsByTab: computeTalentsByTab(beginner.id),
      starterTalents: [],
      paths: t1.map(makePath),
    });
  }
  // Each T1 class section, with Tier-2 children as paths
  for (const d of t1) {
    out.push({
      key: d.id,
      name: d.name,
      synopsis: d.description || "",
      blurb: d.description || "",
      color: colorForTier(d.tier || 1),
      base: d.base || undefined,
      perLevel: d.perLevel || undefined,
      talentsByTab: computeTalentsByTab(d.id),
      starterTalents: [],
      paths: childrenOf(d.id).map(makePath),
    });
  }
  return out;
}

export default function ClassesPage() {
  const liveData = toArchetypesFromGame();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12 animate-fade-in">
      {/* Spooky overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.3),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(239,68,68,0.25),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="Classes">Classes</h1>
      <p className="mt-2 text-gray-300">A field guide to Veil Keeper archetypes. Start basic, specialize through talents, and combine gear with stats to define your loop.</p>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Archetypes at a Glance</h2>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {liveData.map((a) => (
            <div key={a.key} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-white/90 truncate" title={a.name}>{a.name}</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{a.paths.length} paths</span>
              </div>
              <p className="mt-1 text-xs text-gray-400 line-clamp-2" title={a.synopsis}>{a.synopsis}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wiki layout: sticky contents + full class sections */}
      <div className="mt-8 grid lg:grid-cols-12 gap-6">
        <nav className="lg:col-span-4 xl:col-span-3 lg:sticky lg:self-start top-24">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="text-sm font-semibold text-white/90">Contents</div>
            <ul className="mt-2 space-y-1 text-sm text-violet-200/90">
              {liveData.map((a) => (
                <li key={a.key}>
                  <a className="hover:underline" href={`#class-${a.key}`}>{a.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Tips</div>
            <ul className="mt-2 list-disc list-inside text-gray-300 text-sm">
              <li>Use the anchor links to share exact class sections.</li>
              <li>See the simulator at the bottom to preview talent ranks.</li>
            </ul>
          </div>
        </nav>
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {liveData.map((a) => (
            // Render per-class wiki section
            <ClassDetails key={a.key} archetype={a} />
          ))}

          {/* Optional: Interactive simulator remains available */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-6">
            <h2 className="text-xl font-semibold blood-underline inline-block">Interactive Talent Simulator</h2>
            <p className="text-sm text-gray-400 mt-1">Use this panel to quickly test rank allocations and read scaling numbers.</p>
            <div className="mt-4">
              <ClassesExplorer data={liveData} />
            </div>
          </div>
        </div>
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
