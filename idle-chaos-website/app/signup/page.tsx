"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Signup failed");
      return;
    }
  router.refresh();
  router.push("/dashboard");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Join the Chaos</h1>
      <p className="text-gray-400 mt-2">Create your account to begin.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Username" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded bg-purple-600 hover:bg-purple-500 py-3 font-semibold">Create Account</button>
      </form>
    </section>
  );
}
