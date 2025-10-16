export const metadata = { title: "World • Chaos In Full", description: "Survey the embryonic map and zones.", openGraph: { title: "Chaos In Full World", images: ["/og/world.png"] } };
import WorldExplorer from "@/src/components/WorldExplorer";

export default function WorldPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(239,68,68,0.2),transparent_45%)]" />
  <h1 className="text-3xl font-bold glitch" data-text="World">World</h1>
  <p className="mt-2 text-gray-300 text-sm md:text-base max-w-prose">Survey the embryonic map. Portals shuffle you between fledgling resource pockets and a slime union negotiation space. Stats with <span className="text-white/80">?</span> are waiting for combat systems to stop changing every other commit.</p>
      <WorldExplorer />
      <div className="mt-12 rounded-xl border border-white/10 bg-black/40 p-6">
  <h2 className="text-xl font-semibold blood-underline inline-block">Expansion Roadmap</h2>
  <p className="text-gray-300 mt-2 text-sm">Upcoming regions: lumber groves (arboreal XP therapy), fungal estuaries, faction hubs that pretend to offer moral choice, and seasonal anomaly pockets. <span className="text-white/80">?</span> values will harden once balancing escapes spreadsheet purgatory.</p>
      </div>
    </section>
  );
}
