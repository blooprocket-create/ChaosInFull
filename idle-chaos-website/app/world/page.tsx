export const metadata = { title: "World • Chaos In Full" };
const zones = [
  { name: "Town", desc: "Your cursed comfort zone. Crafting, storage, tasks, and NPC banter." },
  { name: "Cave", desc: "Mine ore in echoing dark. Don’t listen back when the walls speak." },
  { name: "Slime Field", desc: "Bouncy chaos. Perfect for warming up your click-to-attack fingers." },
];
export default function WorldPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">World</h1>
      <p className="mt-2 text-gray-300">Zones connect through portals—push forward, or retreat to Town through return gates.</p>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {zones.map((z) => (
          <div key={z.name} className="rounded-xl border border-white/10 bg-black/40 p-6">
            <h3 className="font-semibold">{z.name}</h3>
            <p className="text-gray-300 text-sm mt-1">{z.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
