"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventItem = { title: string; endsAt: string; blurb: string };

// Use fixed durations, then compute absolute endsAt on the client to avoid SSR hydration mismatches
const EVENTS_SOURCE: { title: string; blurb: string; durationMs: number }[] = [
  { title: "Spooky Season", durationMs: 1000 * 60 * 60 * 24 * 5, blurb: "Limited cosmetics, slime hunts, and a haunted task board." },
  { title: "Cave Echoes", durationMs: 1000 * 60 * 60 * 24 * 10, blurb: "Ore boons and a mysterious miner’s note." },
  { title: "Laughing Shadows", durationMs: 1000 * 60 * 60 * 24 * 14, blurb: "Pranks, surprises, and shadow puppets that bite." },
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
  const [events, setEvents] = useState<EventItem[]>([]);
  // Trigger a re-render every second so the countdown stays live
  useTicker(1000);
  const [hover, setHover] = useState(false);
  const [progress, setProgress] = useState(0);

  // Compute absolute end times on the client after mount
  useEffect(() => {
    const now = Date.now();
    setEvents(
      EVENTS_SOURCE.map(({ title, blurb, durationMs }) => ({
        title,
        blurb,
        endsAt: new Date(now + durationMs).toISOString(),
      }))
    );
  }, []);

  const ev = useMemo(() => {
    const current = events[i];
    if (current) return current;
    // Fallback for SSR: stable, non-time-based placeholder
    return { title: EVENTS_SOURCE[i].title, blurb: EVENTS_SOURCE[i].blurb, endsAt: "" };
  }, [events, i]);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const dur = 6000;
    const loop = (ts: number) => {
      if (hover) { raf = requestAnimationFrame(loop); return; }
      if (start == null) start = ts;
      const t = ts - start;
      const p = Math.min(1, t / dur);
      setProgress(p);
      if (p >= 1) {
        setI((v) => (v + 1) % EVENTS_SOURCE.length);
        start = ts;
        setProgress(0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="text-xs text-gray-400">Event</div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">{ev.title}</div>
          <p className="text-gray-300 text-sm max-w-prose">{ev.blurb}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Ends in</div>
          <div className="font-mono text-sm" suppressHydrationWarning>
            {ev.endsAt ? formatCountdown(ev.endsAt) : "—"}
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2">
        {EVENTS_SOURCE.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} className={`w-2.5 h-2.5 rounded-full ${idx===i?"bg-purple-500":"bg-white/20"}`} aria-label={`Go to event ${idx+1}`} />
        ))}
      </div>
      {/* Progress bar */}
      <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/5">
        <div className="h-full bg-gradient-to-r from-purple-600 to-red-500 transition-[width] duration-200" style={{ width: `${Math.round(progress*100)}%` }} />
      </div>
      <div className="mt-4"><Link href="/news" className="text-purple-400 hover:text-purple-300 underline">View all news</Link></div>
    </div>
  );
}
