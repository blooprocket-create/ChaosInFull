"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Character = { id: string; name: string; class: string; level: number };

export default function CharacterSelect() {
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  // gender/hat removed from creation flow
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();

  async function load() {
    try {
      const res = await fetch("/api/account/characters", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setChars(data.characters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = search.get("ch");
    if (ch) {
      router.replace(`/play?ch=${encodeURIComponent(ch)}`);
    }
  }, [search, router]);

  async function createChar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    const res = await fetch("/api/account/characters", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Create failed"); return; }
    setName("");
    setChars(prev => [...prev, data.character]);
    // Auto-enter the world with the new character
    if (data?.character?.id) {
      window.dispatchEvent(new CustomEvent("telemetry:event", { detail: { name: "character_created" } }));
      router.push(`/play?ch=${encodeURIComponent(data.character.id)}`);
    }
  }

  if (loading) return <div className="mt-6 text-sm text-gray-400">Loading characters…</div>;

  return (
    <div className="mt-6 grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="text-lg font-semibold">Your Characters</h2>
        {chars.length === 0 ? (
          <p className="text-gray-400 text-sm mt-2">No characters yet. Create one on the right.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {chars.map(c => (
              <li key={c.id} className="flex items-center justify-between rounded border border-white/10 bg-black/30 px-3 py-2">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.class} • Lv {c.level}</div>
                </div>
                <button className="btn" onClick={() => router.push(`/play?ch=${c.id}`)}>Enter</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="text-lg font-semibold">Create Character</h2>
        <form onSubmit={createChar} className="mt-3 space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
          {/* Removed gender/hat selectors */}
          <p className="text-xs text-gray-400">Class: Beginner (advanced class chosen later via quest)</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button className="btn">Create</button>
        </form>
      </div>
    </div>
  );
}
