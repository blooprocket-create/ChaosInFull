"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProfileMenu from "@/src/components/ProfileMenu";
import BloodLinkButton from "@/src/components/BloodLinkButton";
import type { SessionData } from "@/src/lib/auth";

export default function NavAuth({ initial }: { initial: SessionData | null }) {
  const [session, setSession] = useState<(SessionData & { isAdmin?: boolean }) | null>(initial as (SessionData & { isAdmin?: boolean }) | null);

  async function refetch() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
  const data = await res.json();
  setSession(data.ok ? (data.user as (SessionData & { isAdmin?: boolean })) : null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // initial confirm + focus refresh
    refetch();
    const onFocus = () => refetch();
    const onAuthChanged = () => refetch();
    window.addEventListener("focus", onFocus);
    window.addEventListener("auth:changed", onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("auth:changed", onAuthChanged as EventListener);
    };
  }, []);

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="hidden sm:block"><BloodLinkButton href="/play" className="btn">Play Now</BloodLinkButton></div>
        <div className="sm:hidden"><Link href="/play" className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1.5 font-semibold">Play</Link></div>
  <ProfileMenu displayName={session.email || "C"} isAdmin={!!session.isAdmin} />
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="hover:text-white">Login</Link>
      <Link href="/signup" className="rounded border border-white/20 hover:border-white/40 px-3 py-1.5">Sign Up</Link>
    </>
  );
}
