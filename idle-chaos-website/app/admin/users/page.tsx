"use client";
import { useEffect, useMemo, useState } from "react";

type U = { id: string; email: string; username: string; isAdmin?: boolean; createdAt: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<U[]>([]);
  const load = async () => { const res = await fetch("/api/admin/users"); if (res.ok) { const j = await res.json(); setRows(j.rows); } };
  useEffect(() => { load(); }, []);
  const notify = (msg: string) => { try { window.showToast?.(msg); } catch {} };
  const [query, setQuery] = useState("");
  const remove = async (id: string) => { if (!confirm("Delete this user?")) return; const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" }); notify(r.ok?"Deleted":"Delete failed"); await load(); };
  const toggleAdmin = async (id: string, curr: boolean) => { const r = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAdmin: !curr }) }); notify(r.ok?"Saved":"Save failed"); await load(); };
  const update = async (id: string, patch: Partial<U>) => { const r = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); notify(r.ok?"Saved":"Save failed"); await load(); };
  const [page, setPage] = useState(1); const pageSize = 12;
  const filtered = useMemo(()=> rows.filter(r => (r.email+r.username).toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const paged = useMemo(()=>{ const start=(page-1)*pageSize; return filtered.slice(start,start+pageSize); },[filtered,page]);
  return (
    <section className="px-1 py-2 md:px-2 md:py-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Users</h1>
        <input className="input w-64" placeholder="Filter…" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        {paged.map(u => (
          <div key={u.id} className="panel p-3 flex items-center justify-between">
            <div className="space-y-1">
              <input
                className="input font-semibold"
                value={u.username}
                onChange={e=>setRows(prev=>prev.map(x=>x.id===u.id?{...x,username:e.target.value}:x))}
                onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(u.id,{ username: u.username }); } }}
              />
              <input
                className="input text-xs text-gray-200"
                value={u.email}
                onChange={e=>setRows(prev=>prev.map(x=>x.id===u.id?{...x,email:e.target.value}:x))}
                onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); update(u.id,{ email: u.email }); } }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1 text-gray-300">
                <input
                  type="checkbox"
                  checked={!!u.isAdmin}
                  onChange={e=>setRows(prev=>prev.map(x=>x.id===u.id?{...x,isAdmin:e.target.checked}:x))}
                  onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); toggleAdmin(u.id, !!u.isAdmin); } }}
                /> Admin
              </label>
              <button className="btn px-2 py-1" onClick={() => remove(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <button className="btn px-2 py-1" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <div>Page {page} / {Math.max(1, Math.ceil(filtered.length/pageSize))}</div>
        <button className="btn px-2 py-1" disabled={page>=Math.ceil(filtered.length/pageSize)} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
    </section>
  );
}
