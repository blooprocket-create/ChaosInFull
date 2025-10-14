"use client";
import { useEffect, useState } from "react";

export default function CursorAura() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  const style: React.CSSProperties = {
    background: `radial-gradient(200px 200px at ${pos.x}px ${pos.y}px, rgba(168,85,247,0.16), rgba(239,68,68,0.10) 40%, transparent 70%)`,
  };
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" style={style} />
  );
}
