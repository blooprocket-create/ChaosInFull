"use client";
import { useEffect, useRef, useState } from "react";

export default function StatusChip({ className = "" }: { className?: string }) {
  const [latency, setLatency] = useState<number | null>(null);
  const [region, setRegion] = useState<string>("-");
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const tick = async () => {
      const since = Date.now();
      try {
        const res = await fetch(`/api/ping?since=${since}&t=${Math.random().toString(36).slice(2)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!aliveRef.current) return;
        const rtt = typeof data?.rtt === 'number' ? data.rtt : (Date.now() - since);
        setLatency(rtt);
        setRegion(String(data?.region || "-"));
      } catch {
        if (!aliveRef.current) return;
        setLatency(null);
        setRegion("-");
      }
    };
    tick();
    const id = setInterval(tick, 7000);
    return () => { aliveRef.current = false; clearInterval(id); };
  }, []);

  const dot = latency === null ? "⚪" : latency < 120 ? "🟢" : latency < 250 ? "🟡" : "🔴";
  const text = latency === null ? "…" : `~${latency}ms`;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] text-gray-300 ${className}`} aria-live="polite" aria-label={`Server status ${region}, latency ${latency ?? 0} ms`}>
      <span role="img" aria-hidden>{dot}</span>
      <span className="text-gray-400">Servers:</span>
      <span className="text-white/90">{region}</span>
      <span>{text}</span>
    </span>
  );
}
