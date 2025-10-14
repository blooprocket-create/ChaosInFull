import Link from "next/link";
import HeroCarousel from "@/src/components/HeroCarousel";

export default function Home() {
  return (
    <>
      {/* Hero with fog */}
      <section className="relative overflow-hidden">
        {/* Fog layers (CSS gradients) */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-[-50%] w-[200%] h-full opacity-20 blur-md animate-[fogmove1_60s_linear_infinite] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.04),transparent_60%)]" />
          <div className="absolute top-0 left-[-60%] w-[220%] h-full opacity-14 blur-lg animate-[fogmove2_90s_linear_infinite] bg-[radial-gradient(ellipse_at_30%_60%,rgba(255,255,255,0.05),transparent_60%),radial-gradient(ellipse_at_70%_40%,rgba(255,255,255,0.04),transparent_60%)]" />
          <div className="absolute top-0 left-[-40%] w-[180%] h-full opacity-10 blur-xl animate-[fogmove3_120s_linear_infinite] bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,0.05),transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(255,255,255,0.03),transparent_60%)]" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-widest leading-[1.05]">Chaos In Full</h1>
            <p className="mt-6 text-lg text-gray-300 max-w-prose">
              A 2D platformer idle RPG where darkness has a sense of humor. Carve your path through haunted mines, gooey fields, and absurd monstrosities.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/signup" className="px-6 py-3 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold">Create Account</Link>
              <Link href="/login" className="px-6 py-3 rounded border border-white/20 hover:border-white/40">Sign In</Link>
              <Link href="/news" className="px-6 py-3 rounded border border-white/10 hover:border-white/30">News</Link>
            </div>
            <p className="mt-6 text-xs text-gray-500">Inspired by MapleStory • IdleOn • RuneScape</p>
          </div>
          <div>
            <HeroCarousel />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-gray-400">
              <div className="rounded border border-white/10 p-3">Town Hub</div>
              <div className="rounded border border-white/10 p-3">Cave Mining</div>
              <div className="rounded border border-white/10 p-3">Slime Fields</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-3 gap-6">
        {[{
          title: "Evolve or Else",
          text: "Beginner to twisted Warrior, Occultist Mage, or Stalker Rogue—branch into deeper horrors as you level.",
        },{
          title: "Idle That Bites Back",
          text: "Progress while AFK. Return to spoils, tasks, and maybe… a note from the mysterious Tutorial NPC.",
        },{
          title: "Click. Move. Strike.",
          text: "Click-to-attack like MapleStory: your character slides into range and unleashes skills bound to 1–0.",
        }].map((c)=> (
          <div key={c.title} className="rounded-xl border border-white/10 bg-black/40 p-6">
            <h3 className="text-xl font-semibold">{c.title}</h3>
            <p className="mt-2 text-gray-300">{c.text}</p>
          </div>
        ))}
      </section>

      {/* Callout */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-purple-800/40 bg-gradient-to-br from-purple-950/40 to-black p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide">Prepare for the Town</h2>
          <p className="mt-2 text-gray-300">Workbench, Anvil, Furnace, Storage, Task Board, and NPCs—in one cozy, cursed plaza.</p>
          <div className="mt-6"><Link href="/classes" className="px-6 py-3 inline-block rounded bg-purple-600 hover:bg-purple-500 font-semibold">Explore Classes</Link></div>
        </div>
      </section>

      {/* Keyframes moved to globals.css */}
    </>
  );
}
