"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  heartbeat?: boolean;
};

export default function BloodLinkButton({ href, children, className = "", heartbeat = false }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);

  const spawnSplashes = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Spawn 3–5 random splashes under the button
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "splash";
      // Random left offset and size
      const left = 10 + Math.random() * 80; // %
      const size = 6 + Math.random() * 14; // px
      const delay = Math.random() * 0.2; // s
      s.style.left = `${left}%`;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.animationDelay = `${delay}s`;
      el.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    const trail = trailRef.current;
    if (!el || !trail) return;
    let over = false;
    let last = 0;
    const onEnter = () => { over = true; };
    const onLeave = () => { over = false; };
    const onMove = (e: MouseEvent) => {
      if (!over) return;
      const now = performance.now();
      if (now - last < 60) return; // limit spawn rate
      last = now;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const dot = document.createElement("span");
      const size = 2 + Math.random() * 4;
      dot.style.left = `${Math.max(0, Math.min(100, x + (Math.random()*4-2)))}%`;
      dot.style.top = `${Math.max(0, Math.min(100, y + (Math.random()*4-2)))}%`;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.className = "trail-dot";
      trail.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
    };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      onMouseEnter={spawnSplashes}
      className={`btn-blood ${heartbeat ? "heartbeat" : ""} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {/* Cursor blood trail container */}
      <span ref={trailRef} className="trail" aria-hidden="true" />
  {/* Drips flowing off the bottom edge */}
  <span className="drip d1" aria-hidden="true" />
  <span className="drip d2" aria-hidden="true" />
  <span className="drip d3" aria-hidden="true" />
    </Link>
  );
}
