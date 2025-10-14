"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrUsername, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed");
      return;
    }
  router.refresh();
  router.push("/dashboard");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="text-gray-400 mt-2">Enter your credentials to continue.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input value={emailOrUsername} onChange={(e)=>setId(e.target.value)} placeholder="Email or username" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded bg-purple-600 hover:bg-purple-500 py-3 font-semibold">Sign In</button>
      </form>
    </section>
  );
}
