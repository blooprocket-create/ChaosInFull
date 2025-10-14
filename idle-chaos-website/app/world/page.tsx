export const metadata = { title: "World • Chaos In Full" };
import WorldExplorer from "@/src/components/WorldExplorer";

export default function WorldPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(239,68,68,0.2),transparent_45%)]" />
      <h1 className="text-3xl font-bold glitch" data-text="World">World</h1>
      <p className="mt-2 text-gray-300">Explore current and planned zones. Click a portal tag to jump between connected areas and inspect features, resources, and upcoming mob stats.</p>
      <WorldExplorer />
      <div className="mt-12 rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold blood-underline inline-block">Expansion Roadmap</h2>
        <p className="text-gray-300 mt-2 text-sm">Future zones will introduce woodcutting, fishing, rare boss events, and faction hubs. Placeholder stats marked with ? will fill in as combat systems mature.</p>
      </div>
    </section>
  );
}
