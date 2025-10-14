"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileMenu({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initials = (displayName?.[0] || "C").toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <div className="relative">
      <button
        className="w-9 h-9 rounded-full bg-purple-700/60 border border-white/20 grid place-items-center hover:bg-purple-600/70"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-sm font-bold">{initials}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-white/10 bg-black/80 backdrop-blur shadow-lg">
          <a href="/dashboard" className="block px-3 py-2 text-sm hover:bg-white/5">Dashboard</a>
          <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-white/5">Log out</button>
        </div>
      )}
    </div>
  );
}
