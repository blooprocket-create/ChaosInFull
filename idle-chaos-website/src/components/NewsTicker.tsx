"use client";
import { useMemo } from "react";

type Props = { items: string[] };

export default function NewsTicker({ items }: Props) {
  const line = useMemo(() => items.join(" • "), [items]);
  // Duplicate content for seamless loop
  return (
    <div className="relative overflow-hidden border-y border-white/10 group">
      <div className="ticker-row" aria-hidden>{line} • {line}</div>
      <div className="ticker-row group-hover:[animation-play-state:paused]">{line} • {line}</div>
    </div>
  );
}
