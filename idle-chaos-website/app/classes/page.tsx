export const metadata = { title: "Classes • Chaos In Full" };
const classes = [
  { name: "Beginner", blurb: "Everyone starts somewhere. Usually with a stick.", color: "from-gray-700/40" },
  { name: "Warrior (Horror)", blurb: "A knight whose armor whispers. Heavy hits, heavier debts.", color: "from-red-900/40" },
  { name: "Mage (Occultist)", blurb: "Arcane scholar who reads the wrong books on purpose.", color: "from-purple-900/40" },
  { name: "Rogue (Stalker)", blurb: "Blink and you’ll… still get stabbed. Fast, precise, unnerving.", color: "from-emerald-900/40" },
];
export default function ClassesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Classes</h1>
      <p className="mt-2 text-gray-300">Evolve down branching paths. Unlock active skills, passives, and very questionable fashion choices.</p>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {classes.map((c)=> (
          <div key={c.name} className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.color} to-black p-5`}>
            <h3 className="font-semibold">{c.name}</h3>
            <p className="text-gray-300 text-sm mt-1">{c.blurb}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Evolution Tree</h2>
        <p className="text-gray-300 mt-2">Progression mirrors MapleStory branching: multiple job advancements per base class, each unlocking new active skills (bind to 1–0) and passives via a talent tree.</p>
      </div>
    </section>
  );
}
