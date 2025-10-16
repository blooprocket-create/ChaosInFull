"use client";
import { useEffect, useState } from "react";

type PN = { id: string; date: string; version: string; title: string; highlights: string[]; notes?: string[] };

export default function AdminPatchNotes() {
  const [rows, setRows] = useState<PN[]>([]);
  const [form, setForm] = useState<{ date: string; version: string; title: string; highlights: string; notes: string }>({ date: new Date().toISOString().slice(0,10), version: "", title: "", highlights: "", notes: "" });
  const load = async () => {
    const res = await fetch("/api/admin/patch-notes");
    if (res.ok) {
      const data: unknown = await res.json();
      const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
      if (!isObj(data) || !Array.isArray((data as Record<string, unknown>).rows)) { setRows([]); return; }
      const rowsRaw = (data as { rows: unknown[] }).rows;
      const toStringArray = (val: unknown): string[] => Array.isArray(val) ? val.map((s) => String(s)) : [];
      const cleaned: PN[] = rowsRaw.map((r) => {
        const rr: Record<string, unknown> = isObj(r) ? r : {};
        const dateVal = rr.date;
        const date = typeof dateVal === 'string' ? dateVal : new Date(String(dateVal ?? new Date())).toISOString();
        const highlights = toStringArray(rr["highlights"]);
        const notes = toStringArray(rr["notes"]);
        return {
          id: String(rr.id ?? ""),
          date: date.slice(0,10),
          version: String(rr.version ?? ""),
          title: String(rr.title ?? ""),
          highlights,
          notes
        };
      });
      setRows(cleaned);
    }
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    const payload = { date: form.date, version: form.version, title: form.title, highlights: form.highlights.split("\n").map(s=>s.trim()).filter(Boolean), notes: form.notes.split("\n").map(s=>s.trim()).filter(Boolean) };
    const res = await fetch("/api/admin/patch-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm({ date: new Date().toISOString().slice(0,10), version: "", title: "", highlights: "", notes: "" }); await load(); }
  };
  const notify = (msg: string) => { try { (window as any).showToast?.(msg); } catch {} };
  const remove = async (id: string) => { if (!confirm("Delete this patch note?")) return; const r = await fetch(`/api/admin/patch-notes/${id}`, { method: "DELETE" }); notify(r.ok?"Deleted":"Delete failed"); await load(); };
  const update = async (id: string, patch: Partial<PN> & { highlightsText?: string; notesText?: string }) => {
    const payload: Partial<PN> & { highlights?: string[]; notes?: string[] } = {};
    if (typeof patch.date === 'string') payload.date = patch.date;
    if (typeof patch.version === 'string') payload.version = patch.version;
    if (typeof patch.title === 'string') payload.title = patch.title;
    if (typeof patch.highlightsText === 'string') payload.highlights = patch.highlightsText.split("\n").map(s=>s.trim()).filter(Boolean);
    if (typeof patch.notesText === 'string') payload.notes = patch.notesText.split("\n").map(s=>s.trim()).filter(Boolean);
    const r = await fetch(`/api/admin/patch-notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    notify(r.ok?"Saved":"Save failed");
    await load();
  };
  const [page, setPage] = useState(1); const pageSize = 10;
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
            {rows.slice((page-1)*pageSize, (page-1)*pageSize + pageSize).map(r=> (
              <div key={r.id} className="rounded border border-white/10 bg-black/35 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs">
                    <input className="rounded bg-black/40 border border-white/10 px-2 py-1" value={r.date} onChange={e=>update(r.id,{ date: e.target.value })} />
                    <input className="rounded bg-black/40 border border-white/10 px-2 py-1 w-28" value={r.version} onChange={e=>update(r.id,{ version: e.target.value })} placeholder="Version"/>
                  </div>
                  <button className="btn px-2 py-0.5" onClick={()=>remove(r.id)}>Delete</button>
                </div>
                <input className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 font-semibold" value={r.title} onChange={e=>update(r.id,{ title: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <textarea className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 h-24 text-sm" defaultValue={r.highlights.join("\n")} onBlur={e=>update(r.id,{ highlightsText: e.target.value })} placeholder="Highlights (one per line)"/>
                  <textarea className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 h-24 text-sm" defaultValue={(r.notes||[]).join("\n")} onBlur={e=>update(r.id,{ notesText: e.target.value })} placeholder="Notes (optional)"/>
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
