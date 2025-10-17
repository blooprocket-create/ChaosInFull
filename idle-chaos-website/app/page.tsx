import Link from "next/link";
import { patchNotes as staticNotes } from "@/src/data/patchNotes";
import { sql } from "@/src/lib/db";
import BloodLinkButton from "@/src/components/BloodLinkButton";
import FlickerOnView from "@/src/components/FlickerOnView";
import EventsCarousel from "@/src/components/EventsCarousel";
import ParallaxHero from "@/src/components/ParallaxHero";
import JsonLd from "@/src/components/JsonLd";
export const metadata = { title: "Chaos In Full • Idle RPG", description: "A darkly humorous idle RPG in your browser.", openGraph: { title: "Chaos In Full", description: "A darkly humorous idle RPG", images: ["/og/home.png"] } };

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
        name: "Chaos In Full",
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
            A Cheerfully Miserable Idle Action RPG
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Build a dysfunctional roster of characters, abandon them in hostile maps, then return for ores, bars,
            and existential questions. Your progress doesn’t pause—only your willingness to look at the EXP bars again.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[{
            title: "Mutate Your Class",
            text: "Start as a harmless Beginner and branch toward something the gods would immediately patch out if they could.",
          },{
            title: "AFK With Consequences",
            text: "Log off in the Cave and come back rich. Or come back and find a mining pick lodged where hope used to be.",
          },{
            title: "Portals & Punchlines",
            text: "Town, Cave, Slime Field, and the new Slime Meadow—each a lovingly unbalanced stage for leveling, crafting, and poorly timed jumps.",
          },{
            title: "Crafting Grind (Refined)",
            text: "Queue bars and gear: furnace ticks, workbench clinks. Offline fast-forward means time still hurts productively.",
          },{
            title: "Account Storage",
            text: "Drop entire stacks into the abyss we call ‘shared stash’. Atomic, reliable, disappointingly organized.",
          },{
            title: "Skills That Escalate",
            text: "Mining, Crafting and more climbing from ‘meh’ to ‘mildly superhuman’. Numbers go up; standards go down.",
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide blood-underline inline-block">Town: Your Questionable Sanctuary</h2>
          <p className="mt-3 text-gray-300 max-w-2xl mx-auto text-sm md:text-base">
            Craft gear, stash loot, poke the Tutorial NPC (he’s still buffering a name), and decide which portal looks least fatal today.
            Everything you build here fuels your next ill-advised expedition.
          </p>
          <div className="mt-6"><BloodLinkButton href="/classes">View Classes Before They Nerf Themselves</BloodLinkButton></div>
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
            <div className="text-lg font-bold tracking-widest">CHAOS IN FULL</div>
            <p className="text-gray-400 mt-2">An earnest attempt to automate your obsession. Crafted in TypeScript, seasoned with regret.</p>
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
