import { getSession } from "@/src/lib/auth";
import PhaserGameCanvas from "@/src/game/PhaserGameCanvas";
import HideFooter from "@/src/components/HideFooter";
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
      {/* Hide global footer on the Play (Phaser) page to maximize canvas area */}
      <HideFooter />
      <JsonLd data={[{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
  name: "Veil Keeper",
  applicationCategory: "Game",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: 5000, priceCurrency: "USD" },
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
            id: ch,
            name: "Selected", // placeholder; scene will hydrate real name
            class: "Unknown",
            level: 1,
          } : (session ? {
            id: session.userId,
            name: session.userId.slice(0, 6),
            class: "Traveler",
            level: 1,
          } : undefined)}
          initialScene="Boot"
        />
      </div>
    </section>
  );
}
