import Link from "next/link";
import { patchNotes as staticNotes } from "@/src/data/patchNotes";
import { sql } from "@/src/lib/db";
import BloodLinkButton from "@/src/components/BloodLinkButton";
import FlickerOnView from "@/src/components/FlickerOnView";
import EventsCarousel from "@/src/components/EventsCarousel";
import ParallaxHero from "@/src/components/ParallaxHero";
import JsonLd from "@/src/components/JsonLd";
export const metadata = { title: "Veil Keeper • Action RPG", description: "A dark, fast, and slightly unhinged browser ARPG.", openGraph: { title: "Veil Keeper", description: "A dark, fast, and slightly unhinged browser ARPG", images: ["/og/home.png"] } };

export default async function Home() {
  let latest = staticNotes[0];
  try {
    const rows = await (sql`
      select to_char(date, 'YYYY-MM-DD') as date, version, title
      from "PatchNote"
      order by date desc, version desc
      limit 1
    ` as unknown as Array<{ date: string; version: string; title: string }>);
    if (rows.length) {
      latest = { date: rows[0].date, version: rows[0].version, title: rows[0].title, highlights: [], notes: [] };
    }
  } catch {}
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: "Veil Keeper",
        url: "https://chaos-in-full.vercel.app/",
        operatingSystem: "Web",
        applicationCategory: "Game",
        genre: ["Idle", "Action", "RPG"],
      }} />
      {/* Latest Patch banner */}
      {(() => { return latest ? (
        <div className="bg-gradient-to-r from-emerald-900/40 to-black border-b border-emerald-700/30">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-600/30 border border-emerald-500/40 text-emerald-300">v{latest.version}</span>
              <span className="text-gray-200">{latest.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/news" className="text-emerald-300 hover:text-emerald-200 underline">Read</Link>
              <Link href="/world" className="text-emerald-300 hover:text-emerald-200 underline">Explore</Link>
            </div>
          </div>
        </div>
      ) : null; })()}

      <ParallaxHero />
      <FlickerOnView />

      {/* Feature pitch */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Veil Keeper — A Dark Action RPG for the Browser
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Cross the threshold, brave twisted regions, and stitch power from what you survive. Robust offline progress,
            crafting loops, and talent-driven builds—made to be picked up, put down, and obsessed over.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[{
            title: "Evolve Your Build",
            text: "Begin humbly and branch into specialized archetypes. Synergize stats, talents, and gear to bend the Veil.",
          },{
            title: "Offline Progress",
            text: "Leave characters in safe pockets and return to rewards. Time advances—even when you don’t.",
          },{
            title: "Portals & Regions",
            text: "Town, Cave, Slime Meadows, Goblin Camp and beyond—each region with resources, threats, and secrets.",
          },{
            title: "Crafting, Refined",
            text: "Smelt, forge, and assemble. Furnaces and benches keep ticking while you’re away.",
          },{
            title: "Shared Stash",
            text: "Move resources and gear across characters. Plan builds; gear them fast.",
          },{
            title: "Talents That Matter",
            text: "Active and passive choices that meaningfully change moment-to-moment play and long-term scaling.",
          }].map(card => (
            <div key={card.title} className="rounded-xl border border-white/10 bg-black/40 p-6 hover:border-purple-500/60 transition-colors">
              <h3 className="text-xl font-semibold text-white/90">{card.title}</h3>
              <p className="mt-2 text-gray-300 text-sm leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Callout */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-purple-800/40 bg-gradient-to-br from-purple-950/40 to-black p-8 text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 size-40 rounded-full blur-3xl bg-purple-700/10" />
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide blood-underline inline-block">Town: Anchor Beyond the Veil</h2>
          <p className="mt-3 text-gray-300 max-w-2xl mx-auto text-sm md:text-base">
            Craft gear, stash loot, and choose the next portal. Town is where plans are made and mistakes are funded.
          </p>
          <div className="mt-6"><BloodLinkButton href="/classes">Browse Classes and Talents</BloodLinkButton></div>
        </div>
      </section>

      {/* Events */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold blood-underline inline-block">Events & Unrest</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2"><EventsCarousel /></div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
            <div className="text-xs text-gray-400">Spotlight</div>
            <h3 className="text-lg font-semibold mt-1">Patch Notes</h3>
            <p className="text-gray-300 text-sm mt-1">{latest?.title || "Fresh features, accidental balance decisions, and ritual apologies."}</p>
            <div className="mt-3"><Link href="/news" className="text-purple-400 hover:text-purple-300 underline">Witness Updates</Link></div>
          </div>
        </div>
      </section>

      {/* Footer with socials and newsletter stub */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-lg font-bold tracking-widest">VEIL KEEPER</div>
            <p className="text-gray-400 mt-2">A browser ARPG built for momentum and tinkering. Crafted in TypeScript, tested against the unknown.</p>
          </div>
          <div>
            <div className="font-semibold">Follow</div>
            <ul className="mt-2 space-y-1 text-gray-300">
              <li><a className="hover:text-white" href="#">Twitter/X</a></li>
              <li><a className="hover:text-white" href="#">Discord</a></li>
              <li><a className="hover:text-white" href="#">YouTube</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold">Newsletter</div>
            <form className="mt-2 flex gap-2">
              <input type="email" placeholder="you@domain" className="flex-1 rounded bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-purple-500" />
              <button className="rounded bg-purple-600 hover:bg-purple-500 px-4">Join</button>
            </form>
            <p className="mt-2 text-[11px] text-gray-500">No spam. Just ethically questionable design updates.</p>
          </div>
        </div>
      </section>

      {/* Keyframes moved to globals.css */}
    </>
  );
}
