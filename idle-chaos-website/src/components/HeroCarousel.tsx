"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Slide = { title: string; subtitle: string; cta: { label: string; href: string } };

const slides: Slide[] = [
  { title: "Town Awaits", subtitle: "Workbench, Anvil, Furnace, Storage, and the Tutorial NPC who knows too much.", cta: { label: "Explore World", href: "/world" } },
  { title: "Choose Your Path", subtitle: "Beginner to Warrior, Occultist, or Stalker—evolve or else.", cta: { label: "View Classes", href: "/classes" } },
  { title: "Click. Move. Strike.", subtitle: "MapleStory-style skills bound to 1–0 with auto-move into range.", cta: { label: "Create Account", href: "/signup" } },
];

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);
  const s = slides[i];
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="p-8 md:p-12">
        <h3 className="text-2xl md:text-3xl font-bold">{s.title}</h3>
        <p className="text-gray-300 mt-2">{s.subtitle}</p>
        <div className="mt-4">
          <Link href={s.cta.href} className="inline-block rounded bg-purple-600 hover:bg-purple-500 px-4 py-2 font-semibold">{s.cta.label}</Link>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2">
        {slides.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} aria-label={`Go to slide ${idx+1}`} className={`w-2.5 h-2.5 rounded-full ${idx===i?"bg-purple-500":"bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}
