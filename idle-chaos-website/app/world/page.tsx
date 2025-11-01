export const metadata = { title: "World • Veil Keeper", description: "A field guide to regions, portals, and resources.", openGraph: { title: "Veil Keeper World", images: ["/og/world.png"] } };
import WorldExplorer from "@/src/components/WorldExplorer";

export default function WorldPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(239,68,68,0.2),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="World">World</h1>
      <p className="mt-2 text-gray-300 text-sm md:text-base max-w-prose">
        A quick-reference wiki for Veil Keeper’s regions. Portals link pockets of the world; each pocket prioritizes
        certain resources, enemies, and leveling loops. Town anchors your progression with crafting and storage.
      </p>

      <div className="mt-6">
        <WorldExplorer />
      </div>

      <div className="mt-12 rounded-xl border border-white/10 bg-black/40 p-6">
        <h3 className="text-lg font-semibold">Portal & Progress Tips</h3>
        <ul className="mt-2 list-disc list-inside text-gray-300 text-sm">
          <li>Leave characters in safe pockets to accumulate resources while offline.</li>
          <li>Use Town to convert raw ores to gear power spikes before pushing new areas.</li>
          <li>Keybind talents (1–9) and open Equipment (U), Talents (T), Inventory (I), Stats (X) to iterate quickly.</li>
        </ul>
      </div>
    </section>
  );
}
