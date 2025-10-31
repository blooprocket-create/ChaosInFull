export const metadata = { title: "Classes • Veil Keeper", description: "A wiki-style overview of archetypes and talent paths.", openGraph: { title: "Veil Keeper Classes", images: ["/og/classes.png"] } };
import ClassesExplorer from "@/src/components/ClassesExplorer";

export default function ClassesPage() {
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
        <ClassesExplorer />
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
