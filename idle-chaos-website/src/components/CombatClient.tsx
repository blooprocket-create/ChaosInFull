"use client";
import React, { useEffect, useRef, useState } from "react";

type Mob = { id: string; templateId: string; hp: number; maxHp: number; level: number };

export default function CombatClient({ characterId, zone }: { characterId: string; zone: string }) {
  const [mobs, setMobs] = useState<Mob[]>([]);
  const [joined, setJoined] = useState(false);
  const [auto, setAuto] = useState(false);
  const polling = useRef(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/combat/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId }) });
      if (res.ok) setJoined(true);
    })();
  }, [characterId, zone]);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(async () => {
      if (polling.current) return; polling.current = true;
      try {
        const res = await fetch(`/api/combat/snapshot?zone=${encodeURIComponent(zone)}&characterId=${encodeURIComponent(characterId)}`);
        if (res.ok) {
          const data = await res.json();
          setMobs((data?.snapshot?.mobs as Mob[]) || []);
        }
      } finally { polling.current = false; }
    }, 300);
    return () => clearInterval(id);
  }, [joined, characterId, zone]);

  const basic = async () => {
    await fetch("/api/combat/cmd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId, action: "basic" }) });
  };

  const toggleAuto = async () => {
    const v = !auto; setAuto(v);
    await fetch("/api/combat/cmd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId, action: "auto", value: v }) });
  };

  return (
    <div className="rounded-md border border-white/10 bg-black/40 p-2 text-xs text-gray-200">
      <div className="mb-2 flex items-center gap-2">
        <button className="btn px-2 py-1" onClick={basic}>Basic Attack</button>
        <label className="flex items-center gap-1"><input type="checkbox" checked={auto} onChange={toggleAuto} /> Auto-battle</label>
        <span className="text-[10px] text-gray-400">Personal phase (anti-grief): your mobs are yours alone</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {mobs.map(m => (
          <div key={m.id} className="rounded border border-white/10 bg-black/30 p-2">
            <div className="text-gray-300">{m.templateId} Lv {m.level}</div>
            <div className="mt-1 h-1.5 w-full rounded bg-white/10">
              <div className="h-1.5 rounded bg-rose-500" style={{ width: `${Math.max(0, Math.min(100, (m.hp / m.maxHp) * 100))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
