export const metadata = { title: "World • Chaos In Full" };
const zones = [
  { name: "Town", desc: "Your cursed comfort zone. Crafting, storage, tasks, and NPC banter." },
  { name: "Cave", desc: "Mine ore in echoing dark. Don’t listen back when the walls speak." },
  { name: "Slime Field", desc: "Bouncy chaos. Perfect for warming up your click-to-attack fingers." },
];
export default function WorldPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(239,68,68,0.2),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="World">World</h1>
      <p className="mt-2 text-gray-300">Zones connect through portals—push forward, or retreat to Town through return gates.</p>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {zones.map((z, idx) => (
          <div
            key={z.name}
            className={`group rounded-xl border border-white/10 bg-gradient-to-br ${idx===0?"from-emerald-900/20":idx===1?"from-gray-700/30":"from-red-900/20"} to-black p-6 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1`}
            style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
          >
            <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5 group-hover:bg-white/10 transition-colors" />
            {/* bobbing orb */}
            <div className="absolute right-3 top-3 size-6 rounded-full bg-white/10 border border-white/20 animate-[bob_2.2s_ease-in-out_infinite]" />
            <h3 className="font-semibold blood-underline inline-block">{z.name}</h3>
            <p className="text-gray-300 text-sm mt-1">{z.desc}</p>
            <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/5">
              <div className="h-full w-0 group-hover:w-full transition-[width] duration-500 bg-gradient-to-r from-purple-600 to-red-500" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold blood-underline inline-block">Portals</h2>
        <p className="text-gray-300 mt-2 text-sm">Each zone ends with a gate to the next. Events may temporarily open side paths—follow the glow, but don’t look too long.</p>
      </div>
    </section>
  );
}
