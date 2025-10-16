"use client";
import { useEffect, useMemo, useState } from "react";

type U = { id: string; email: string; username: string; isAdmin?: boolean; createdAt: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<U[]>([]);
  const load = async () => { const res = await fetch("/api/admin/users"); if (res.ok) { const j = await res.json(); setRows(j.rows); } };
  useEffect(() => { load(); }, []);
  const notify = (msg: string) => { try { (window as any).showToast?.(msg); } catch {} };
  const remove = async (id: string) => { if (!confirm("Delete this user?")) return; const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" }); notify(r.ok?"Deleted":"Delete failed"); await load(); };
  const toggleAdmin = async (id: string, curr: boolean) => { const r = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAdmin: !curr }) }); notify(r.ok?"Saved":"Save failed"); await load(); };
  const update = async (id: string, patch: Partial<U>) => { const r = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); notify(r.ok?"Saved":"Save failed"); await load(); };
  const [page, setPage] = useState(1); const pageSize = 12;
  const paged = useMemo(()=>{ const start=(page-1)*pageSize; return rows.slice(start,start+pageSize); },[rows,page]);
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="mt-4 grid grid-cols-1 gap-3">
        {paged.map(u => (
          <div key={u.id} className="rounded border border-white/10 bg-black/35 p-3 flex items-center justify-between">
            <div className="space-y-1">
              <input className="rounded bg-black/40 border border-white/10 px-2 py-1 font-semibold" value={u.username} onChange={e=>update(u.id,{ username: e.target.value })} />
              <input className="rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-gray-200" value={u.email} onChange={e=>update(u.id,{ email: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1 text-gray-300"><input type="checkbox" checked={!!u.isAdmin} onChange={() => toggleAdmin(u.id, !!u.isAdmin)} /> Admin</label>
              <button className="btn px-2 py-1" onClick={() => remove(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <button className="btn px-2 py-1" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <div>Page {page} / {Math.max(1, Math.ceil(rows.length/pageSize))}</div>
        <button className="btn px-2 py-1" disabled={page>=Math.ceil(rows.length/pageSize)} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
    </section>
  );
}
