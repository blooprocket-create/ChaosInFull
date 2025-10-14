"use client";
import Link from "next/link";
import { useCallback, useRef } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  heartbeat?: boolean;
};

export default function BloodLinkButton({ href, children, className = "", heartbeat = false }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  const spawnSplashes = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Spawn 3–5 random splashes under the button
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "splash";
      // Random left offset and size
      const left = 5 + Math.random() * 90; // %
      const size = 4 + Math.random() * 10; // px
      const delay = Math.random() * 0.2; // s
      s.style.left = `${left}%`;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.animationDelay = `${delay}s`;
      el.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    }
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      onMouseEnter={spawnSplashes}
      className={`btn-blood ${heartbeat ? "heartbeat" : ""} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {/* Drips */}
      <span className="drip d1" aria-hidden="true" />
      <span className="drip d2" aria-hidden="true" />
      <span className="drip d3" aria-hidden="true" />
    </Link>
  );
}
