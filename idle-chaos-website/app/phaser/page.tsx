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
    </section>
  );
}
