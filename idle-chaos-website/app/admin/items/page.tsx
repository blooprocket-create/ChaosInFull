"use client";
import { useEffect, useState } from "react";

type Item = { id: string; name: string; description: string; rarity: string; stackable: boolean; maxStack: number; buy: number; sell: number };

export default function AdminItems() {
  const [rows, setRows] = useState<Item[]>([]);
  const [form, setForm] = useState<Item>({ id: "", name: "", description: "", rarity: "common", stackable: true, maxStack: 999, buy: 0, sell: 0 });
  const load = async () => { const res = await fetch("/api/admin/items"); if (res.ok) { const j = await res.json(); setRows(j.rows); } };
  useEffect(() => { load(); }, []);
  const create = async () => {
    const res = await fetch("/api/admin/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm({ id: "", name: "", description: "", rarity: "common", stackable: true, maxStack: 999, buy: 0, sell: 0 }); await load(); }
  };
  const remove = async (id: string) => { await fetch(`/api/admin/items/${id}`, { method: "DELETE" }); await load(); };
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Items</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded border border-white/10 bg-black/40 p-4 space-y-2">
          <h2 className="font-semibold">Create</h2>
          <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="ID (e.g., slime_goop)"/>
          <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Name"/>
          <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description"/>
          <div className="grid grid-cols-2 gap-2">
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.rarity} onChange={e=>setForm(f=>({...f,rarity:e.target.value}))} placeholder="Rarity"/>
            <label className="text-sm text-gray-300 flex items-center gap-2"><input type="checkbox" checked={form.stackable} onChange={e=>setForm(f=>({...f,stackable:e.target.checked}))}/> Stackable</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.maxStack} onChange={e=>setForm(f=>({...f,maxStack:parseInt(e.target.value||"0",10)}))} placeholder="Max Stack"/>
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.buy} onChange={e=>setForm(f=>({...f,buy:parseInt(e.target.value||"0",10)}))} placeholder="Buy"/>
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.sell} onChange={e=>setForm(f=>({...f,sell:parseInt(e.target.value||"0",10)}))} placeholder="Sell"/>
          </div>
          <button className="btn px-3 py-1" onClick={create}>Add</button>
        </div>
        <div>
          <h2 className="font-semibold">Existing</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map(r => (
              <div key={r.id} className="rounded border border-white/10 bg-black/35 p-3">
                <div className="flex items-center justify-between"><div className="font-mono text-xs">{r.id}</div><button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button></div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-gray-400">{r.description}</div>
                <div className="text-xs mt-1">Buy {r.buy} • Sell {r.sell} • Max {r.maxStack}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
