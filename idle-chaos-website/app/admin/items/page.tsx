"use client";
import { useEffect, useMemo, useState } from "react";
import { RARITY_OPTIONS, getRarityColor } from "@/src/lib/rarity";

type Item = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  buy: number;
  sell: number;
};

export default function AdminItems() {
  const [rows, setRows] = useState<Item[]>([]);
  const [form, setForm] = useState<Item>({ id: "", name: "", description: "", rarity: "common", stackable: true, maxStack: 999, buy: 0, sell: 0 });
  const [createError, setCreateError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const load = async () => {
    setListError(null);
    try {
      const res = await fetch("/api/admin/items");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setListError(j?.error || "Failed to load items");
        return;
      }
      const j = await res.json();
      setRows(
        Array.isArray(j.rows)
          ? (j.rows as Item[]).map(r => ({
              ...r,
              buy: typeof r.buy === 'string' ? parseInt(r.buy as string, 10) : Number(r.buy) || 0,
              sell: typeof r.sell === 'string' ? parseInt(r.sell as string, 10) : Number(r.sell) || 0,
              maxStack: typeof r.maxStack === 'number' ? r.maxStack : (typeof (r as { maxstack?: number }).maxstack === 'number' ? (r as { maxstack: number }).maxstack : 999),
            }))
          : []
      );
    } catch {
      setListError("Network error loading items");
    }
  };
  useEffect(() => { load(); }, []);
  const notify = (msg: string) => { try { window.showToast?.(msg); } catch {} };
  const rarityOptions = RARITY_OPTIONS;
  const [query, setQuery] = useState("");
  const create = async () => {
    setCreateError(null);
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, buy: Number(form.buy), sell: Number(form.sell), maxStack: Number(form.maxStack) })
    });
    if (res.ok) {
      setForm({ id: "", name: "", description: "", rarity: "common", stackable: true, maxStack: 999, buy: 0, sell: 0 });
      notify("Item created");
      await load();
    } else {
      let msg = "Failed to create item";
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
        else if (j?.error) msg = j.error;
      } catch {}
      setCreateError(msg);
      notify(msg);
    }
  };
  const remove = async (id: string) => { if (!confirm("Delete this item?")) return; const r = await fetch(`/api/admin/items/${id}`, { method: "DELETE" }); notify(r.ok?"Deleted":"Delete failed"); await load(); };
  const update = async (id: string, patch: Partial<Item>) => {
    const r = await fetch(`/api/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, buy: patch.buy !== undefined ? Number(patch.buy) : undefined, sell: patch.sell !== undefined ? Number(patch.sell) : undefined, maxStack: patch.maxStack !== undefined ? Number(patch.maxStack) : undefined })
    });
    notify(r.ok ? "Saved" : "Save failed");
    await load();
  };
  const [page, setPage] = useState(1); const pageSize = 12;
  const filtered = useMemo(()=> rows.filter(r => (r.id+r.name+r.description).toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const paged = useMemo(()=>{ const start=(page-1)*pageSize; return filtered.slice(start,start+pageSize); },[filtered,page]);
  return (
    <section className="px-1 py-2 md:px-2 md:py-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Items</h1>
        <input className="input w-64" placeholder="Filter…" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel p-4 space-y-3">
          <h2 className="font-semibold">Create</h2>
          {createError && <div className="text-sm text-red-400">{createError}</div>}
          <div>
            <label className="label">ID</label>
            <input className="input" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="e.g., slime_goop"/>
            <div className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, dashes and underscores only.</div>
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="label">Rarity</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: getRarityColor(form.rarity) }} />
                <select className="select" value={form.rarity} onChange={e=>setForm(f=>({...f,rarity:e.target.value}))}>
                  {rarityOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <label className="text-sm text-gray-300 flex items-center gap-2"><input type="checkbox" checked={form.stackable} onChange={e=>setForm(f=>({...f,stackable:e.target.checked}))}/> Stackable</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="label">Max Stack
              <input type="number" className="input mt-1" value={form.maxStack} onChange={e=>setForm(f=>({...f,maxStack:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="label">Buy
              <input type="number" className="input mt-1" value={form.buy} onChange={e=>setForm(f=>({...f,buy:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="label">Sell
              <input type="number" className="input mt-1" value={form.sell} onChange={e=>setForm(f=>({...f,sell:parseInt(e.target.value||"0",10)}))} />
            </label>
          </div>
          <button
            className="btn px-3 py-1"
            onClick={create}
            disabled={!form.id.trim() || !form.name.trim() || !/^[-a-z0-9_]+$/i.test(form.id) || form.maxStack < 1}
            title={!/^[-a-z0-9_]+$/i.test(form.id) ? "Invalid ID format" : form.maxStack < 1 ? "Max stack must be at least 1" : ""}
          >
            Add
          </button>
        </div>
        <div>
          <h2 className="font-semibold">Existing</h2>
          {listError && <div className="mt-2 text-sm text-yellow-400">{listError}</div>}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {paged.length === 0 && !listError ? (
              <div className="col-span-full text-sm text-gray-400">No items found. Create one on the left to get started.</div>
            ) : null}
            {paged.map(r => (
              <div key={r.id} className="panel p-3">
                <div className="flex items-center justify-between"><div className="font-mono text-xs">{r.id}</div><button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button></div>
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input font-semibold"
                    value={r.name}
                    onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}
                    onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ name: r.name }); } }}
                  />
                </div>
                <div className="mt-1">
                  <label className="label">Description</label>
                  <input
                    className="input text-xs text-gray-200"
                    value={r.description}
                    onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,description:e.target.value}:x))}
                    onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ description: r.description }); } }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1 text-xs items-center">
                  <div>
                    <label className="label">Rarity</label>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: getRarityColor(r.rarity) }} />
                      <select
                        className="select"
                        value={r.rarity}
                        onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,rarity:e.target.value}:x))}
                        onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ rarity: r.rarity }); } }}
                      >
                        {rarityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-1 text-gray-300">
                    <input
                      type="checkbox"
                      checked={r.stackable}
                      onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,stackable:e.target.checked}:x))}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ stackable: r.stackable }); } }}
                    /> Stackable
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                  <label className="label">Max Stack
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.maxStack}
                      onChange={e=>{
                        const v = parseInt(e.target.value||"0",10);
                        setRows(prev=>prev.map(x=>x.id===r.id?{...x,maxStack:isNaN(v)?0:v}:x));
                      }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ maxStack: r.maxStack }); } }}
                    />
                  </label>
                  <label className="label">Buy
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.buy}
                      onChange={e=>{
                        const v = parseInt(e.target.value||"0",10);
                        setRows(prev=>prev.map(x=>x.id===r.id?{...x,buy:isNaN(v)?0:v}:x));
                      }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ buy: r.buy }); } }}
                    />
                  </label>
                  <label className="label">Sell
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.sell}
                      onChange={e=>{
                        const v = parseInt(e.target.value||"0",10);
                        setRows(prev=>prev.map(x=>x.id===r.id?{...x,sell:isNaN(v)?0:v}:x));
                      }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{ sell: r.sell }); } }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button className="btn px-2 py-1" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <div>Page {page} / {Math.max(1, Math.ceil(filtered.length/pageSize))}</div>
            <button className="btn px-2 py-1" disabled={page>=Math.ceil(filtered.length/pageSize)} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}
