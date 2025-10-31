export const metadata = { title: "World • Veil Keeper", description: "A field guide to regions, portals, and resources.", openGraph: { title: "Veil Keeper World", images: ["/og/world.png"] } };

export default function WorldPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(239,68,68,0.2),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="World">World</h1>
      <p className="mt-2 text-gray-300 text-sm md:text-base max-w-prose">
        A quick-reference wiki for Veil Keeper’s regions. Portals link pockets of the world; each pocket prioritizes
        certain resources, enemies, and leveling loops. Town anchors your progression with crafting and storage.
      </p>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Town</h2>
          <p className="text-gray-300 text-sm mt-2">Hub for crafting, storage, and planning. Access furnaces, workbenches, and portals.</p>
          <ul className="mt-3 list-disc list-inside text-gray-300 text-sm">
            <li>Safe zone (no enemies)</li>
            <li>Furnace: smelt ores into bars</li>
            <li>Workbench: craft gear and components</li>
            <li>Storage: account-wide stash</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Cave</h2>
          <p className="text-gray-300 text-sm mt-2">Intro mining and early combat. Risk scales with how deep you wander.</p>
          <ul className="mt-3 list-disc list-inside text-gray-300 text-sm">
            <li>Primary: Copper, Tin</li>
            <li>Secondary: Slimes, narrow paths</li>
            <li>Offline-friendly resource pocket</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Slime Meadows</h2>
          <p className="text-gray-300 text-sm mt-2">Open fields for early leveling and testing builds against mobile targets.</p>
          <ul className="mt-3 list-disc list-inside text-gray-300 text-sm">
            <li>Primary: Slimes (varied pacing)</li>
            <li>Secondary: Basic materials</li>
            <li>Good for talent keybind practice</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Goblin Camp</h2>
          <p className="text-gray-300 text-sm mt-2">Hostile pocket with coordinated enemies and burst checks.</p>
          <ul className="mt-3 list-disc list-inside text-gray-300 text-sm">
            <li>Primary: Combat, coin</li>
            <li>Secondary: Specific drops for early crafting</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Gloamway Bastion</h2>
          <p className="text-gray-300 text-sm mt-2">Defensive layouts with vision pressure. Talent synergy matters.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Grave Forest</h2>
          <p className="text-gray-300 text-sm mt-2">Damage-over-time threats and pathing discipline checks.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-white">Broken Dock</h2>
          <p className="text-gray-300 text-sm mt-2">Edge-of-world pocket. Expect environmental hazards and tight windows.</p>
        </div>
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
