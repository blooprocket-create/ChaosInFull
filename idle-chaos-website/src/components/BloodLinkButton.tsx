"use client";
import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  heartbeat?: boolean;
};

export default function BloodLinkButton({ href, children, className = "", heartbeat = false }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [seed, setSeed] = useState(() => Math.random());

  // Create a small set of randomized drops; recompute occasionally to avoid monotony
  const drops = useMemo(() => {
    const rng = mulberry32(Math.floor(seed * 1e9));
    const count = 4 + Math.floor(rng() * 3); // 4-6 drops
    return new Array(count).fill(0).map((_, i) => {
      // Slight bias away from edges
      const left = 8 + rng() * 84; // percent
      const fall = 40 + rng() * 42; // px
      const dur = 1.6 + rng() * 1.1; // seconds
      const delay = -(rng() * (dur + 0.4)); // negative for a natural phase offset
      const size = 0.42 + rng() * 0.32; // rem
      return { i, left: `${left}%`, fall: `${fall}px`, dur: `${dur}s`, delay: `${delay}s`, size: `${size}rem` };
    });
  }, [seed]);

  // Refresh the drip pattern every ~6-10 seconds while hovered
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: number | undefined;
    const onEnter = () => {
      const loop = () => {
        setSeed(Math.random());
        t = window.setTimeout(loop, 6000 + Math.random() * 4000);
      };
      loop();
    };
    const onLeave = () => { if (t) { clearTimeout(t); t = undefined; } };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => { onLeave(); el.removeEventListener("mouseenter", onEnter); el.removeEventListener("mouseleave", onLeave); };
  }, []);

  return (
    <Link ref={ref} href={href} className={`btn-blood ${heartbeat ? "heartbeat" : ""} ${className}`}>
      <span className="label relative z-10">
        {children}
        {/* Drops start under the text baseline */}
        <span className="drops" aria-hidden>
          {drops.map(d => (
            <span
              key={d.i}
              className="drop"
              style={{
                left: d.left,
                width: d.size,
                height: d.size,
                ...( {
                  "--fall": d.fall,
                  "--dur": d.dur,
                  "--delay": d.delay,
                } as CSSProperties),
              }}
            />
          ))}
        </span>
      </span>
    </Link>
  );
}

// Tiny deterministic RNG for stable per-seed randomness
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
