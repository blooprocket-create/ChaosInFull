export const metadata = { title: "Classes • Veil Keeper", description: "A wiki-style overview of archetypes and talent paths.", openGraph: { title: "Veil Keeper Classes", images: ["/og/classes.png"] } };
import ClassesExplorer, { ClassArchetype } from "@/src/components/ClassesExplorer";

// Import live game class definitions (pure data module)
// Note: this .js data file exports CLASS_DEFS as a plain object
import { CLASS_DEFS as GAME_CLASS_DEFS } from "@/src/game/phaser/data/classes.js";
import { TALENT_TABS, getTabsForClass } from "@/src/game/phaser/data/talents.js";

function toArchetypesFromGame(): ClassArchetype[] {
  // Normalize game class defs into the explorer shape
  const defs: Record<string, any> = (GAME_CLASS_DEFS as any) || {};
  const byId = defs;
  const roots = Object.values(byId).filter((d: any) => !d.requiredClass);
  const t1 = Object.values(byId).filter((d: any) => d.requiredClass === "beginner");

  // Helper to children of a given parent id
  const childrenOf = (pid: string) => Object.values(byId).filter((d: any) => d.requiredClass === pid);

  const colorForTier = (tier: number) => tier >= 2 ? "from-violet-900/40" : tier === 1 ? "from-red-900/40" : "from-gray-700/40";

  const computeTalentsByTab = (classId: string) => {
    try {
      const tabIds = (getTabsForClass as any)(classId) as string[];
      return (tabIds || []).map(tid => {
        const tab: any = (TALENT_TABS as any)[tid];
        if (!tab || !Array.isArray(tab.talents)) return null as any;
        return {
          tabId: tab.id,
          label: tab.label || tid,
          talents: tab.talents.map((t: any) => ({ id: t.id, name: t.name, kind: t.kind, activeType: t.activeType, description: t.description }))
        };
      }).filter(Boolean);
    } catch (e) {
      return [] as any[];
    }
  };

  const makePath = (d: any) => ({
    key: d.id,
    name: d.name,
    focus: d.description || "",
    talents: [] as string[],
  });

  const out: ClassArchetype[] = [];
  // Beginner first, then tier-1 classes, each with their children as paths
  const beginner = roots.find((r: any) => r.id === "beginner") as any;
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
  for (const d of t1 as any[]) {
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
        <ul className="mt-2 grid md:grid-cols-2 gap-3 text-sm text-gray-300 list-disc list-inside">
          <li><span className="text-white">Vanguard</span> — front-line control and sustain; weapon and armor scaling.</li>
          <li><span className="text-white">Arcanist</span> — ranged damage, burst windows, and resource manipulation.</li>
          <li><span className="text-white">Stalker</span> — mobility, crit pressure, and evasion tools.</li>
          <li><span className="text-white">Warden</span> — defensive aura support and damage smoothing.</li>
          <li><span className="text-white">Artificer</span> — crafting synergies and utility actives woven into combat.</li>
        </ul>
      </div>

      <div className="mt-6">
        <ClassesExplorer data={liveData} />
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
