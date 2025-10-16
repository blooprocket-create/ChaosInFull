"use client";
import { useEffect, useMemo, useState } from "react";

type Enemy = { id: string; name: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number; tags: string };

export default function AdminEnemies() {
  const [rows, setRows] = useState<Enemy[]>([]);
  const [form, setForm] = useState<Enemy>({ id: "", name: "", level: 1, baseHp: 30, expBase: 5, goldMin: 1, goldMax: 3, tags: "" });
  const load = async () => { const res = await fetch("/api/admin/enemies"); if (res.ok) { const j = await res.json(); setRows(j.rows); } };
  useEffect(() => { load(); }, []);
  const notify = (msg: string) => {
    try { window.showToast?.(msg); } catch {}
  };
  const create = async () => {
    const res = await fetch("/api/admin/enemies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm({ id: "", name: "", level: 1, baseHp: 30, expBase: 5, goldMin: 1, goldMax: 3, tags: "" }); notify("Enemy created"); await load(); } else { notify("Failed to create enemy"); }
  };
  const update = async (id: string, patch: Partial<Enemy>) => { const r = await fetch(`/api/admin/enemies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); notify(r.ok?"Saved":"Save failed"); await load(); };
  const remove = async (id: string) => { if (!confirm("Delete this enemy?")) return; const r = await fetch(`/api/admin/enemies/${id}`, { method: "DELETE" }); notify(r.ok?"Deleted":"Delete failed"); await load(); };
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const paged = useMemo(() => { const start = (page-1)*pageSize; return rows.slice(start, start+pageSize); }, [rows, page]);
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Enemies</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded border border-white/10 bg-black/40 p-4 space-y-2">
          <h2 className="font-semibold">Create</h2>
          <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="ID (e.g., slime)"/>
          <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Name"/>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.level} onChange={e=>setForm(f=>({...f,level:parseInt(e.target.value||"1",10)}))} placeholder="Level"/>
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.baseHp} onChange={e=>setForm(f=>({...f,baseHp:parseInt(e.target.value||"0",10)}))} placeholder="HP"/>
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.expBase} onChange={e=>setForm(f=>({...f,expBase:parseInt(e.target.value||"0",10)}))} placeholder="EXP"/>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.goldMin} onChange={e=>setForm(f=>({...f,goldMin:parseInt(e.target.value||"0",10)}))} placeholder="Gold Min"/>
            <input type="number" className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.goldMax} onChange={e=>setForm(f=>({...f,goldMax:parseInt(e.target.value||"0",10)}))} placeholder="Gold Max"/>
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="Tags (CSV)"/>
          </div>
          <button className="btn px-3 py-1" onClick={create}>Add</button>
        </div>
        <div>
          <h2 className="font-semibold">Existing</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paged.map(r => (
              <div key={r.id} className="rounded border border-white/10 bg-black/35 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{r.id}</div>
                  <button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button>
                </div>
                <input className="w-full rounded bg-black/30 border border-white/10 px-2 py-1" value={r.name} onChange={e=>update(r.id,{name:e.target.value})} />
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <input type="number" className="rounded bg-black/30 border border-white/10 px-2 py-1" value={r.level} onChange={e=>update(r.id,{level:parseInt(e.target.value||"0",10)})} />
                  <input type="number" className="rounded bg-black/30 border border-white/10 px-2 py-1" value={r.baseHp} onChange={e=>update(r.id,{baseHp:parseInt(e.target.value||"0",10)})} />
                  <input type="number" className="rounded bg-black/30 border border-white/10 px-2 py-1" value={r.expBase} onChange={e=>update(r.id,{expBase:parseInt(e.target.value||"0",10)})} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <input type="number" className="rounded bg-black/30 border border-white/10 px-2 py-1" value={r.goldMin} onChange={e=>update(r.id,{goldMin:parseInt(e.target.value||"0",10)})} />
                  <input type="number" className="rounded bg-black/30 border border-white/10 px-2 py-1" value={r.goldMax} onChange={e=>update(r.id,{goldMax:parseInt(e.target.value||"0",10)})} />
                  <input className="rounded bg-black/30 border border-white/10 px-2 py-1" value={r.tags} onChange={e=>update(r.id,{tags:e.target.value})} />
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
