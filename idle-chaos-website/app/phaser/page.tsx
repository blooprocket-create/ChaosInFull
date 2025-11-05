import { getSession } from "@/src/lib/auth";
import PhaserGameCanvas from "@/src/game/PhaserGameCanvas";
import JsonLd from "@/src/components/JsonLd";

export const metadata = { 
  title: "Veil Keeper • Play", 
  description: "Play Veil Keeper in your browser.", 
  openGraph: { title: "Veil Keeper", images: ["/og/play.png"] } 
};

export const dynamic = "force-dynamic";

export default async function PhaserGamePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  const sp = searchParams ? await searchParams : undefined;
  const rawCh = sp?.ch;
  const ch = Array.isArray(rawCh) ? rawCh[0] : rawCh;
  
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

      <div className="mb-4">
        <PhaserGameCanvas 
          character={ch ? {
            // Pass through the selected character id from the dashboard link.
            // Scene code will fetch the full character state once the game boots.
            id: ch,
            name: "",
            class: "",
            level: 0,
          } : (session ? {
            // Fallback: logged-in session with no explicit character selection
            id: session.userId,
            name: "Player",
            class: "Beginner",
            level: 1,
          } : undefined)}
          initialScene="Boot"
        />
      </div>
    </section>
  );
}
