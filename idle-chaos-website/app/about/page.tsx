export const metadata = { title: "About • Chaos In Full", description: "Tech, roadmap, and the questionable vision behind Chaos In Full.", openGraph: { title: "About Chaos In Full", images: ["/og/about.png"] } };
export default function AboutPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      {/* ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_15%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_85%_25%,rgba(239,68,68,0.2),transparent_45%)]" />

      <header className="mb-8">
        <h1 className="text-3xl font-bold glitch" data-text="About">About</h1>
        <p className="mt-2 text-gray-300 max-w-3xl text-sm md:text-base">
          Chaos In Full is one stubborn human attempting to weaponize nostalgia. It borrows the dopamine scaffolding of classic MMOs and stitches it to an idle loop that keeps progressing while you pretend you’ve moved on. Cute zones, questionable NPC advice, and numbers that climb politely until they suddenly don’t.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1" style={{ boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}>
          <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
          <h3 className="font-semibold blood-underline inline-block">Vision</h3>
          <p className="text-gray-300 text-sm mt-2">A living browser-native RPG that behaves like a haunted productivity app: lightweight, reactive, and mildly concerned about how long you’ve been mining copper.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-red-900/20 to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1" style={{ boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}>
          <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
          <h3 className="font-semibold blood-underline inline-block">Gameplay</h3>
          <p className="text-gray-300 text-sm mt-2">Platform, craft, wander off. Return to neatly counted gains and an EXP bar that progressed without asking how your day went. Branch classes into increasingly unhinged specializations.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-900/20 to-black p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1" style={{ boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}>
          <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5" />
          <h3 className="font-semibold blood-underline inline-block">Roadmap</h3>
          <ul className="mt-2 text-gray-300 text-sm list-disc pl-5 space-y-1">
            <li>Town polish + tutorial NPC finally learns a name</li>
            <li>Combat loop graduates from polite taps to expressive overkill</li>
            <li>More zones with resource guilt and seasonal map anomalies</li>
            <li>Class advancement trees that look like tax evasion flowcharts</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-white/10 bg-black/40 p-6">
          <h2 className="text-xl font-semibold blood-underline inline-block">Tech Stack (Why It Loads Fast)</h2>
          <ul className="mt-3 text-gray-300 text-sm list-disc pl-5 space-y-1">
            <li>Next.js 15 + TypeScript + Tailwind: readable, themable, occasionally refactored at 2am</li>
            <li>Neon Postgres + typed SQL: small, fast, and serverless-friendly</li>
            <li>JWT cookie auth: secure enough not to embarrass us publicly</li>
            <li>Phaser: the stage where gravity therapy happens under <span className="text-white/90">/play</span></li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-6">
          <h2 className="text-xl font-semibold blood-underline inline-block">Credits</h2>
          <p className="text-gray-300 text-sm mt-2">Made by a solo dev mainlining patch notes. Thanks to open source maintainers for the tools—and for not breaking everything this week.</p>
        </div>
      </div>
    </section>
  );
}
