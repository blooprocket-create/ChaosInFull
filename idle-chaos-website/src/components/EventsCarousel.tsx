"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventItem = { title: string; endsAt: string; blurb: string };

const EVENTS: EventItem[] = [
  { title: "Spooky Season", endsAt: new Date(Date.now() + 1000*60*60*24*5).toISOString(), blurb: "Limited cosmetics, slime hunts, and a haunted task board." },
  { title: "Cave Echoes", endsAt: new Date(Date.now() + 1000*60*60*24*10).toISOString(), blurb: "Ore boons and a mysterious miner’s note." },
  { title: "Laughing Shadows", endsAt: new Date(Date.now() + 1000*60*60*24*14).toISOString(), blurb: "Pranks, surprises, and shadow puppets that bite." },
];

function useTicker(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((v)=>v+1), ms); return () => clearInterval(t); }, [ms]);
  return tick;
}

function formatCountdown(iso: string) {
  const end = new Date(iso).getTime();
  const now = Date.now();
  const d = Math.max(0, end - now);
  const days = Math.floor(d / (1000*60*60*24));
  const hours = Math.floor((d % (1000*60*60*24)) / (1000*60*60));
  const mins = Math.floor((d % (1000*60*60)) / (1000*60));
  const secs = Math.floor((d % (1000*60)) / 1000);
  return `${days}d ${hours}h ${mins}m ${secs}s`;
}

export default function EventsCarousel() {
  const [i, setI] = useState(0);
  const tick = useTicker(1000);
  const ev = useMemo(() => EVENTS[i], [i]);

  useEffect(() => { const t = setInterval(() => setI((v)=>(v+1)%EVENTS.length), 6000); return () => clearInterval(t); }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6">
      <div className="text-xs text-gray-400">Event</div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">{ev.title}</div>
          <p className="text-gray-300 text-sm max-w-prose">{ev.blurb}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Ends in</div>
          <div className="font-mono text-sm">{formatCountdown(ev.endsAt)}</div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2">
        {EVENTS.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} className={`w-2.5 h-2.5 rounded-full ${idx===i?"bg-purple-500":"bg-white/20"}`} aria-label={`Go to event ${idx+1}`} />
        ))}
      </div>
      <div className="mt-4"><Link href="/news" className="text-purple-400 hover:text-purple-300 underline">View all news</Link></div>
    </div>
  );
}
