export const metadata = { title: "Classes • Chaos In Full" };
import ClassesExplorer from "@/src/components/ClassesExplorer";

export default function ClassesPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      {/* Spooky overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.3),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(239,68,68,0.25),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="Classes">Classes</h1>
      <p className="mt-2 text-gray-300">Select an archetype and then drill into its darker forks. Each path is a mutation—stats and talents still subject to ritual balancing.</p>
      <ClassesExplorer />
      <div className="mt-12 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold blood-underline inline-block">Design Notes</h2>
        <p className="text-gray-300 mt-2 text-sm">Archetypes lean into exaggerated resource identities (sustain, control, burst, evasion). Later tiers will splice mechanics from adjacent paths, enabling hybrid loadouts if you survive the math.</p>
      </div>
    </section>
  );
}
