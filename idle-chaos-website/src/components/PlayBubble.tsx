"use client";
import Link from "next/link";

export default function PlayBubble() {
  return (
    <Link
      href="/play"
      className="fixed bottom-6 right-6 z-30 rounded-full px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-xl border border-white/10 animate-[float_3.5s_ease-in-out_infinite]"
      aria-label="Play Now"
      style={{ boxShadow: "0 10px 30px rgba(168,85,247,0.35)" }}
    >
      Play Now
    </Link>
  );
}
