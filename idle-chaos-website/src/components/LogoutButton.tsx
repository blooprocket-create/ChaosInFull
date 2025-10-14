"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  async function handle() {
    await fetch("/api/auth/logout", { method: "POST" });
    // notify nav to refetch session
    window.dispatchEvent(new Event("auth:changed"));
    router.refresh();
    router.push("/");
  }
  return (
    <button onClick={handle} className={className}>Log out</button>
  );
}
