"use client";
import { useEffect, useMemo, useState } from "react";

type Item = { id: string; name: string; description: string; rarity: string; stackable: boolean; maxStack: number; buy: number; sell: number };

export default function AdminItems() {
  const [rows, setRows] = useState<Item[]>([]);
  const [form, setForm] = useState<Item>({ id: "", name: "", description: "", rarity: "common", stackable: true, maxStack: 999, buy: 0, sell: 0 });
  const load = async () => { const res = await fetch("/api/admin/items"); if (res.ok) { const j = await res.json(); setRows(j.rows); } };
  useEffect(() => { load(); }, []);
  const notify = (msg: string) => { try { window.showToast?.(msg); } catch {} };
  const create = async () => {
    const res = await fetch("/api/admin/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm({ id: "", name: "", description: "", rarity: "common", stackable: true, maxStack: 999, buy: 0, sell: 0 }); notify("Item created"); await load(); } else { notify("Failed to create item"); }
  };
  const remove = async (id: string) => { if (!confirm("Delete this item?")) return; const r = await fetch(`/api/admin/items/${id}`, { method: "DELETE" }); notify(r.ok?"Deleted":"Delete failed"); await load(); };
  const update = async (id: string, patch: Partial<Item>) => { const r = await fetch(`/api/admin/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); notify(r.ok?"Saved":"Save failed"); await load(); };
  const [page, setPage] = useState(1); const pageSize = 12;
  const paged = useMemo(()=>{ const start=(page-1)*pageSize; return rows.slice(start,start+pageSize); },[rows,page]);
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-3 text-sm">
        <a href="/admin" className="text-emerald-300 hover:underline">← Back to Admin</a>
      </div>
      <h1 className="text-2xl font-semibold">Items</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded border border-white/10 bg-black/40 p-4 space-y-3">
          <h2 className="font-semibold">Create</h2>
          <div>
            <label className="block text-xs text-gray-300 mb-1">ID</label>
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="e.g., slime_goop"/>
          </div>
          <div>
            <label className="block text-xs text-gray-300 mb-1">Name</label>
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs text-gray-300 mb-1">Description</label>
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-300">Rarity
              <input className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.rarity} onChange={e=>setForm(f=>({...f,rarity:e.target.value}))} />
            </label>
            <label className="text-sm text-gray-300 flex items-center gap-2"><input type="checkbox" checked={form.stackable} onChange={e=>setForm(f=>({...f,stackable:e.target.checked}))}/> Stackable</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-gray-300">Max Stack
              <input type="number" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.maxStack} onChange={e=>setForm(f=>({...f,maxStack:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="text-xs text-gray-300">Buy
              <input type="number" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.buy} onChange={e=>setForm(f=>({...f,buy:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="text-xs text-gray-300">Sell
              <input type="number" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.sell} onChange={e=>setForm(f=>({...f,sell:parseInt(e.target.value||"0",10)}))} />
            </label>
          </div>
          <button className="btn px-3 py-1" onClick={create}>Add</button>
        </div>
        <div>
          <h2 className="font-semibold">Existing</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {paged.map(r => (
              <div key={r.id} className="rounded border border-white/10 bg-black/35 p-3">
                <div className="flex items-center justify-between"><div className="font-mono text-xs">{r.id}</div><button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button></div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Name</label>
                  <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 font-semibold" value={r.name} onChange={e=>update(r.id,{ name: e.target.value })} />
                </div>
                <div className="mt-1">
                  <label className="block text-xs text-gray-300 mb-1">Description</label>
                  <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-gray-200" value={r.description} onChange={e=>update(r.id,{ description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                  <label className="text-xs text-gray-300">Rarity
                    <input className="mt-1 rounded bg-black/40 border border-white/10 px-2 py-1 w-full" value={r.rarity} onChange={e=>update(r.id,{ rarity: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-1 text-gray-300"><input type="checkbox" checked={r.stackable} onChange={e=>update(r.id,{ stackable: e.target.checked })}/> Stackable</label>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                  <label className="text-xs text-gray-300">Max Stack
                    <input type="number" className="mt-1 rounded bg-black/40 border border-white/10 px-2 py-1 w-full" value={r.maxStack} onChange={e=>update(r.id,{ maxStack: parseInt(e.target.value||"0",10) })} />
                  </label>
                  <label className="text-xs text-gray-300">Buy
                    <input type="number" className="mt-1 rounded bg-black/40 border border-white/10 px-2 py-1 w-full" value={r.buy} onChange={e=>update(r.id,{ buy: parseInt(e.target.value||"0",10) })} />
                  </label>
                  <label className="text-xs text-gray-300">Sell
                    <input type="number" className="mt-1 rounded bg-black/40 border border-white/10 px-2 py-1 w-full" value={r.sell} onChange={e=>update(r.id,{ sell: parseInt(e.target.value||"0",10) })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button className="btn px-2 py-1" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <div>Page {page} / {Math.max(1, Math.ceil(rows.length/pageSize))}</div>
            <button className="btn px-2 py-1" disabled={page>=Math.ceil(rows.length/pageSize)} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}
