export const metadata = { title: "About • Chaos In Full" };
export default function AboutPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      {/* ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_15%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_85%_25%,rgba(239,68,68,0.2),transparent_45%)]" />

      <header className="mb-8">
        <h1 className="text-3xl font-bold glitch" data-text="About">About</h1>
        <p className="mt-2 text-gray-300 max-w-3xl">
          Chaos In Full is a solo passion project: a darkly humorous 2D platformer idle RPG inspired by MapleStory, IdleOn, and RuneScape. The goal is a cozy, cursed world that plays smoothly in a browser and can later ship to stores.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1" style={{ boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}>
          <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
          <h3 className="font-semibold blood-underline inline-block">Vision</h3>
          <p className="text-gray-300 text-sm mt-2">A living website and idle game that feels haunted but welcoming—animated, reactive, and always hinting at something lurking just off-screen.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-red-900/20 to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1" style={{ boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}>
          <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
          <h3 className="font-semibold blood-underline inline-block">Gameplay</h3>
          <p className="text-gray-300 text-sm mt-2">2D platforming with idle progression. Explore zones, craft, and build classes that branch into eccentric specialties. Minimal grind, maximal vibes.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-900/20 to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1" style={{ boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}>
          <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
          <h3 className="font-semibold blood-underline inline-block">Roadmap</h3>
          <ul className="mt-2 text-gray-300 text-sm list-disc pl-5 space-y-1">
            <li>Playable Town and basic combat loop</li>
            <li>Account stats sync to site dashboard</li>
            <li>World zones, events, and class advancements</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-white/10 bg-black/40 p-6">
          <h2 className="text-xl font-semibold blood-underline inline-block">Tech Stack</h2>
          <ul className="mt-3 text-gray-300 text-sm list-disc pl-5 space-y-1">
            <li>Next.js 15 (App Router) + TypeScript + Tailwind</li>
            <li>Prisma ORM (SQLite dev, Postgres prod)</li>
            <li>Auth with bcrypt + JWT (jose), httpOnly cookie session</li>
            <li>Phaser for the playable Town under <span className="text-white/90">/play</span></li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-6">
          <h2 className="text-xl font-semibold blood-underline inline-block">Credits</h2>
          <p className="text-gray-300 text-sm mt-2">Built by one very stubborn human. Thanks to the communities behind Next.js, Tailwind, Prisma, and Phaser for the tools that make this possible.</p>
        </div>
      </div>
    </section>
  );
}
