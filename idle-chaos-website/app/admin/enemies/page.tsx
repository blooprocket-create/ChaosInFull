"use client";
import { useEffect, useMemo, useState } from "react";

type Enemy = { id: string; name: string; level: number; baseHp: number; damage: number; expBase: number; goldMin: number; goldMax: number; tags: string };

export default function AdminEnemies() {
  const [rows, setRows] = useState<Enemy[]>([]);
  const [form, setForm] = useState<Enemy>({ id: "", name: "", level: 1, baseHp: 30, damage: 5, expBase: 5, goldMin: 1, goldMax: 3, tags: "" });
  const load = async () => {
    const res = await fetch("/api/admin/enemies");
    if (res.ok) {
      const j = await res.json();
      // If damage is missing (old API), default to 5
  setRows((j.rows as Enemy[]).map(r => ({ ...r, damage: typeof r.damage === 'number' ? r.damage : 5 })));
    }
  };
  useEffect(() => { load(); }, []);
  const notify = (msg: string) => {
    try { window.showToast?.(msg); } catch {}
  };
  const [query, setQuery] = useState("");
  const create = async () => {
    const res = await fetch("/api/admin/enemies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setForm({ id: "", name: "", level: 1, baseHp: 30, damage: 5, expBase: 5, goldMin: 1, goldMax: 3, tags: "" });
      notify("Enemy created");
      await load();
    } else {
      notify("Failed to create enemy");
    }
  };
  const update = async (id: string, patch: Partial<Enemy>) => {
    const r = await fetch(`/api/admin/enemies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    notify(r.ok ? "Saved" : "Save failed");
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this enemy?")) return;
    const r = await fetch(`/api/admin/enemies/${id}`, { method: "DELETE" });
    notify(r.ok ? "Deleted" : "Delete failed");
    await load();
  };
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const filtered = useMemo(() => rows.filter(r => (r.id + r.name + r.tags).toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const paged = useMemo(() => { const start = (page - 1) * pageSize; return filtered.slice(start, start + pageSize); }, [filtered, page]);
  return (
    <section className="px-1 py-2 md:px-2 md:py-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Enemies</h1>
        <input className="input w-64" placeholder="Filter…" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel p-4 space-y-3">
          <h2 className="font-semibold">Create</h2>
          <div>
            <label className="label">ID</label>
            <input className="input" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="e.g., slime"/>
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label className="label">Level
              <input type="number" className="input mt-1" value={form.level} onChange={e=>setForm(f=>({...f,level:parseInt(e.target.value||"1",10)}))} />
            </label>
            <label className="label">HP
              <input type="number" className="input mt-1" value={form.baseHp} onChange={e=>setForm(f=>({...f,baseHp:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="label">DMG
              <input type="number" className="input mt-1" value={form.damage} onChange={e=>setForm(f=>({...f,damage:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="label">EXP
              <input type="number" className="input mt-1" value={form.expBase} onChange={e=>setForm(f=>({...f,expBase:parseInt(e.target.value||"0",10)}))} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="label">Gold Min
              <input type="number" className="input mt-1" value={form.goldMin} onChange={e=>setForm(f=>({...f,goldMin:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="label">Gold Max
              <input type="number" className="input mt-1" value={form.goldMax} onChange={e=>setForm(f=>({...f,goldMax:parseInt(e.target.value||"0",10)}))} />
            </label>
            <label className="label">Tags (CSV)
              <input className="input mt-1" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
            </label>
          </div>
          <button className="btn px-3 py-1" onClick={create}>Add</button>
        </div>
        <div>
          <h2 className="font-semibold">Existing</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paged.map(r => (
              <div key={r.id} className="panel p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{r.id}</div>
                  <button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button>
                </div>
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={r.name}
                    onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}
                    onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{name:r.name}); } }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <label className="label">Level
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.level}
                      onChange={e=>{ const v=parseInt(e.target.value||"0",10); setRows(prev=>prev.map(x=>x.id===r.id?{...x,level:isNaN(v)?0:v}:x)); }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{level:r.level}); } }}
                    />
                  </label>
                  <label className="label">HP
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.baseHp}
                      onChange={e=>{ const v=parseInt(e.target.value||"0",10); setRows(prev=>prev.map(x=>x.id===r.id?{...x,baseHp:isNaN(v)?0:v}:x)); }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{baseHp:r.baseHp}); } }}
                    />
                  </label>
                  <label className="label">DMG
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.damage}
                      onChange={e=>{ const v=parseInt(e.target.value||"0",10); setRows(prev=>prev.map(x=>x.id===r.id?{...x,damage:isNaN(v)?0:v}:x)); }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{damage:r.damage}); } }}
                    />
                  </label>
                  <label className="label">EXP
                    <input
                      type="number"
                      className="input mt-1"
                      value={r.expBase}
                      onChange={e=>{ const v=parseInt(e.target.value||"0",10); setRows(prev=>prev.map(x=>x.id===r.id?{...x,expBase:isNaN(v)?0:v}:x)); }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{expBase:r.expBase}); } }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <label className="label">Gold Min
                    <input
                      type="number" className="input mt-1" value={r.goldMin}
                      onChange={e=>{ const v=parseInt(e.target.value||"0",10); setRows(prev=>prev.map(x=>x.id===r.id?{...x,goldMin:isNaN(v)?0:v}:x)); }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{goldMin:r.goldMin}); } }}
                    />
                  </label>
                  <label className="label">Gold Max
                    <input
                      type="number" className="input mt-1" value={r.goldMax}
                      onChange={e=>{ const v=parseInt(e.target.value||"0",10); setRows(prev=>prev.map(x=>x.id===r.id?{...x,goldMax:isNaN(v)?0:v}:x)); }}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{goldMax:r.goldMax}); } }}
                    />
                  </label>
                  <label className="label">Tags
                    <input
                      className="input mt-1" value={r.tags}
                      onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,tags:e.target.value}:x))}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(r.id,{tags:r.tags}); } }}
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
