export const metadata = { title: "Classes • Chaos In Full" };
const classes = [
  { name: "Beginner", blurb: "Everyone starts somewhere. Usually with a stick.", color: "from-gray-700/40",
    paths: ["Horror", "Occultist", "Stalker"],
    talents: ["Quick Jab", "Pack Mule", "Curiosity"] },
  { name: "Warrior (Horror)", blurb: "A knight whose armor whispers. Heavy hits, heavier debts.", color: "from-red-900/40",
    paths: ["Ravager", "Sanguine"], talents: ["Cleave", "Iron Will", "Blood Oath"] },
  { name: "Mage (Occultist)", blurb: "Arcane scholar who reads the wrong books on purpose.", color: "from-purple-900/40",
    paths: ["Hexweaver", "Astral Scribe"], talents: ["Hex Bolt", "Runic Ward", "Astral Tap"] },
  { name: "Rogue (Stalker)", blurb: "Blink and you’ll… still get stabbed. Fast, precise, unnerving.", color: "from-emerald-900/40",
    paths: ["Nightblade", "Shade Dancer"], talents: ["Lacerate", "Backstep", "Veil"] },
];

export default function ClassesPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      {/* Spooky overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.3),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(239,68,68,0.25),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="Classes">Classes</h1>
      <p className="mt-2 text-gray-300">Evolve down branching paths. Unlock active skills, passives, and very questionable fashion choices.</p>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {classes.map((c)=> (
          <details key={c.name}
               className={`group rounded-xl border border-white/10 bg-gradient-to-br ${c.color} to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1`}
               style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5 group-hover:bg-white/10 transition-colors" />
            {/* bobbing icon */}
            <div className="absolute right-3 top-3 size-6 rounded-full bg-white/10 border border-white/20 animate-[bob_2.2s_ease-in-out_infinite]" />
            <summary className="list-none cursor-pointer select-none">
              <h3 className="font-semibold blood-underline inline-block">{c.name}</h3>
              <p className="text-gray-300 text-sm mt-1">{c.blurb}</p>
            </summary>
            <div className="mt-3 grid gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-400">Paths</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {c.paths?.map(p => (<span key={p} className="rounded-full px-2 py-0.5 bg-white/10 border border-white/20">{p}</span>))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Starter Talents</div>
                <ul className="mt-1 list-disc pl-5 text-gray-300">
                  {c.talents?.map(t => (<li key={t}>{t}</li>))}
                </ul>
              </div>
            </div>
            <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/5">
              <div className="h-full w-0 group-hover:w-full transition-[width] duration-500 bg-gradient-to-r from-purple-600 to-red-500" />
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold blood-underline inline-block">Evolution Tree</h2>
        <p className="text-gray-300 mt-2">Progression mirrors MapleStory branching: multiple job advancements per base class, each unlocking new active skills (bind to 1–0) and passives via a talent tree.</p>
      </div>
    </section>
  );
}
