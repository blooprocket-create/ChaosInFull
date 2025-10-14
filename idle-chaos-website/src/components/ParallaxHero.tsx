"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import BloodLinkButton from "@/src/components/BloodLinkButton";
import HeroCarousel from "@/src/components/HeroCarousel";

export default function ParallaxHero() {
  const layer1 = useRef<HTMLDivElement>(null); // nearest
  const layer2 = useRef<HTMLDivElement>(null);
  const layer3 = useRef<HTMLDivElement>(null); // far
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const nx = (e.clientX - vw / 2) / (vw / 2);
      const ny = (e.clientY - vh / 2) / (vh / 2);
      // Parallax amount
      const a1 = 12, a2 = 7, a3 = 4;
      if (layer1.current) layer1.current.style.transform = `translate3d(${(-nx * a1).toFixed(2)}px, ${(-ny * a1).toFixed(2)}px, 0)`;
      if (layer2.current) layer2.current.style.transform = `translate3d(${(-nx * a2).toFixed(2)}px, ${(-ny * a2).toFixed(2)}px, 0)`;
      if (layer3.current) layer3.current.style.transform = `translate3d(${(-nx * a3).toFixed(2)}px, ${(-ny * a3).toFixed(2)}px, 0)`;
      if (titleRef.current) titleRef.current.style.transform = `translate3d(${(nx * 2).toFixed(2)}px, ${(ny * 2).toFixed(2)}px, 0)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section className="relative overflow-hidden bg-sway">
      {/* Fog gradient layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div ref={layer1} className="absolute top-0 left-[-50%] w-[200%] h-full opacity-20 blur-md animate-[fogmove1_60s_linear_infinite] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.04),transparent_60%)] will-change-transform" />
        <div ref={layer2} className="absolute top-0 left-[-60%] w-[220%] h-full opacity-14 blur-lg animate-[fogmove2_90s_linear_infinite] bg-[radial-gradient(ellipse_at_30%_60%,rgba(255,255,255,0.05),transparent_60%),radial-gradient(ellipse_at_70%_40%,rgba(255,255,255,0.04),transparent_60%)] will-change-transform" />
        <div ref={layer3} className="absolute top-0 left-[-40%] w-[180%] h-full opacity-10 blur-xl animate-[fogmove3_120s_linear_infinite] bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,0.05),transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(255,255,255,0.03),transparent_60%)] will-change-transform" />
      </div>
      {/* Parallax orbs */}
      <div className="pointer-events-none absolute -top-10 right-10 size-64 rounded-full blur-3xl bg-purple-700/20" />
      <div className="pointer-events-none absolute top-40 -left-10 size-72 rounded-full blur-3xl bg-red-700/10" />
      <div className="mx-auto max-w-6xl px-4 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold tracking-widest leading-[1.05] glitch flicker-target will-change-transform" data-text="Chaos In Full">Chaos In Full</h1>
          <p className="mt-6 text-lg text-gray-300 max-w-prose">
            A 2D platformer idle RPG where darkness has a sense of humor. Carve your path through haunted mines, gooey fields, and absurd monstrosities.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <BloodLinkButton href="/signup" heartbeat>Create Account</BloodLinkButton>
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
  );
}
