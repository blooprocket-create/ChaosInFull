"use client";
import { useEffect, useState } from "react";

type U = { id: string; email: string; username: string; isAdmin?: boolean; createdAt: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<U[]>([]);
  const load = async () => { const res = await fetch("/api/admin/users"); if (res.ok) { const j = await res.json(); setRows(j.rows); } };
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { await fetch(`/api/admin/users/${id}`, { method: "DELETE" }); await load(); };
  const toggleAdmin = async (id: string, curr: boolean) => { await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAdmin: !curr }) }); await load(); };
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="mt-4 grid grid-cols-1 gap-3">
        {rows.map(u => (
          <div key={u.id} className="rounded border border-white/10 bg-black/35 p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{u.username}</div>
              <div className="text-xs text-gray-400">{u.email}</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1 text-gray-300"><input type="checkbox" checked={!!u.isAdmin} onChange={() => toggleAdmin(u.id, !!u.isAdmin)} /> Admin</label>
              <button className="btn px-2 py-1" onClick={() => remove(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
