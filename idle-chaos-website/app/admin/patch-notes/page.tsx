"use client";
import { useEffect, useState } from "react";

type PN = { id: string; date: string; version: string; title: string; highlights: string[]; notes?: string[] };

export default function AdminPatchNotes() {
  const [rows, setRows] = useState<PN[]>([]);
  const [form, setForm] = useState<{ date: string; version: string; title: string; highlights: string; notes: string }>({ date: new Date().toISOString().slice(0,10), version: "", title: "", highlights: "", notes: "" });
  const load = async () => {
    const res = await fetch("/api/admin/patch-notes");
    if (res.ok) {
      const j = await res.json();
      setRows(j.rows.map((r: any) => ({ ...r, date: (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString()).slice(0,10), highlights: Array.isArray(r.highlights) ? r.highlights : [], notes: Array.isArray(r.notes) ? r.notes : [] })));
    }
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    const payload = { date: form.date, version: form.version, title: form.title, highlights: form.highlights.split("\n").map(s=>s.trim()).filter(Boolean), notes: form.notes.split("\n").map(s=>s.trim()).filter(Boolean) };
    const res = await fetch("/api/admin/patch-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm({ date: new Date().toISOString().slice(0,10), version: "", title: "", highlights: "", notes: "" }); await load(); }
  };
  const remove = async (id: string) => { await fetch(`/api/admin/patch-notes/${id}`, { method: "DELETE" }); await load(); };
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Patch Notes</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded border border-white/10 bg-black/40 p-4">
          <h2 className="font-semibold">Create</h2>
          <div className="mt-3 space-y-2 text-sm">
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="Date (YYYY-MM-DD)"/>
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.version} onChange={e=>setForm(f=>({...f,version:e.target.value}))} placeholder="Version"/>
            <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Title"/>
            <textarea className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 h-24" value={form.highlights} onChange={e=>setForm(f=>({...f,highlights:e.target.value}))} placeholder="Highlights (one per line)"/>
            <textarea className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 h-24" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes (optional, one per line)"/>
            <button className="btn px-3 py-1" onClick={create}>Add</button>
          </div>
        </div>
        <div>
          <h2 className="font-semibold">Existing</h2>
          <div className="mt-3 space-y-3">
            {rows.map(r=> (
              <div key={r.id} className="rounded border border-white/10 bg-black/35 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{r.date} • v{r.version}</div>
                  <button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button>
                </div>
                <div className="font-semibold">{r.title}</div>
                <ul className="list-disc list-inside text-sm text-gray-300">
                  {r.highlights.map((h,i)=>(<li key={i}>{h}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
