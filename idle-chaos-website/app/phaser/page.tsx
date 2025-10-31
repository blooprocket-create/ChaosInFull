import { getSession } from "@/src/lib/auth";
import PhaserGameCanvas from "@/src/game/PhaserGameCanvas";
import JsonLd from "@/src/components/JsonLd";

export const metadata = { 
  title: "Veil Keeper • Play", 
  description: "Play Veil Keeper in your browser.", 
  openGraph: { title: "Veil Keeper", images: ["/og/play.png"] } 
};

export const dynamic = "force-dynamic";

export default async function PhaserGamePage() {
  const session = await getSession();
  
  // Optional: require login to play
  // if (!session) redirect("/login");

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd data={[{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
  name: "Veil Keeper",
  applicationCategory: "Game",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
        url: "https://chaos-in-full.vercel.app/phaser"
      },{
        "@context": "https://schema.org",
        "@type": "VideoGame",
  name: "Veil Keeper",
  gamePlatform: "Web",
        url: "https://chaos-in-full.vercel.app/phaser"
      }]} />
      
      <div className="mb-6">
        <h1 className="text-4xl font-bold">Veil Keeper</h1>
        <p className="mt-2 text-gray-300">
          A Phaser-powered adventure game. Explore zones, battle enemies, and complete quests.
        </p>
      </div>

      <div className="mb-4">
        <PhaserGameCanvas 
          character={session ? {
            id: session.userId,
            name: "Player",
            class: "Beginner",
            level: 1
          } : undefined}
          initialScene="Boot"
        />
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4">
        <h2 className="text-xl font-semibold mb-3">Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <h3 className="font-semibold text-white mb-2">Movement</h3>
            <ul className="space-y-1">
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">W</kbd> Move Up</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">A</kbd> Move Left</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">S</kbd> Move Down</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">D</kbd> Move Right</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Actions</h3>
            <ul className="space-y-1">
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">Space</kbd> Basic Attack</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">1-0</kbd> Active Skills</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">I</kbd> Inventory</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">U</kbd> Equipment</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">T</kbd> Talents</li>
              <li><kbd className="px-2 py-1 bg-black/40 rounded border border-white/10">X</kbd> Stats &amp; Skills</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
