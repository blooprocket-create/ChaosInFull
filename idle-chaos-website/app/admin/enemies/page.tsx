"use client";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

type Enemy = { id: string; name: string; level: number; baseHp: number; damage: number; expBase: number; goldMin: number; goldMax: number; tags: string };

const StatPill = ({ label, value, accent }: { label: string; value: number | string; accent?: string }) => (
  <div className="flex flex-col items-center rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px]">
    <span className="text-[9px] uppercase tracking-wide text-gray-400">{label}</span>
    <span className={`text-sm font-semibold ${accent ?? "text-white"}`}>{value}</span>
  </div>
);

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
              <EnemyCard
                key={r.id}
                enemy={r}
                onUpdate={update}
                onDelete={remove}
              />
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

type EnemyCardProps = {
  enemy: Enemy;
  onUpdate: (id: string, patch: Partial<Enemy>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function EnemyCard({ enemy, onUpdate, onDelete }: EnemyCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Enemy>(enemy);

  useEffect(() => {
    setDraft(enemy);
  }, [enemy]);

  const handleNumberChange = (field: keyof Pick<Enemy, "level" | "baseHp" | "damage" | "expBase" | "goldMin" | "goldMax">) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value || "0", 10);
    const safe = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    setDraft(prev => ({ ...prev, [field]: safe }));
  };

  const handleTextChange = (field: keyof Pick<Enemy, "name" | "tags">) => (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(prev => ({ ...prev, [field]: e.target.value }));
  };

  const cancelEdit = () => {
    setDraft(enemy);
    setEditing(false);
  };

  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const patch: Partial<Enemy> = {};
      (["name", "level", "baseHp", "damage", "expBase", "goldMin", "goldMax", "tags"] as const).forEach(key => {
        if (draft[key] !== enemy[key]) {
          (patch as any)[key] = draft[key];
        }
      });
      if (Object.keys(patch).length > 0) {
        await onUpdate(enemy.id, patch);
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const tagList = (enemy.tags || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400">{enemy.id}</div>
          {!editing ? (
            <>
              <div className="mt-1 truncate text-lg font-semibold text-white">{enemy.name || "Unnamed Enemy"}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {tagList.length ? tagList.map(tag => (
                  <span key={tag} className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gray-300">
                    {tag}
                  </span>
                )) : <span className="text-xs text-gray-500">No tags assigned</span>}
              </div>
            </>
          ) : (
            <label className="label mt-2 block text-sm">
              Name
              <input className="input mt-1" value={draft.name} onChange={handleTextChange("name")} />
            </label>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!editing && (
            <button className="btn px-2 py-1 text-sm" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="btn px-2 py-1 text-sm bg-red-600 hover:bg-red-500" onClick={() => onDelete(enemy.id)}>
            Delete
          </button>
        </div>
      </div>

      {!editing ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <StatPill label="Level" value={enemy.level} accent="text-amber-300" />
            <StatPill label="HP" value={enemy.baseHp} accent="text-emerald-300" />
            <StatPill label="Damage" value={enemy.damage} accent="text-rose-300" />
            <StatPill label="EXP" value={enemy.expBase} accent="text-sky-300" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatPill label="Gold Min" value={enemy.goldMin} accent="text-yellow-200" />
            <StatPill label="Gold Max" value={enemy.goldMax} accent="text-yellow-200" />
          </div>
        </>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              Level
              <input type="number" className="input mt-1" value={draft.level} onChange={handleNumberChange("level")} />
            </label>
            <label className="label">
              HP
              <input type="number" className="input mt-1" value={draft.baseHp} onChange={handleNumberChange("baseHp")} />
            </label>
            <label className="label">
              Damage
              <input type="number" className="input mt-1" value={draft.damage} onChange={handleNumberChange("damage")} />
            </label>
            <label className="label">
              EXP
              <input type="number" className="input mt-1" value={draft.expBase} onChange={handleNumberChange("expBase")} />
            </label>
            <label className="label">
              Gold Min
              <input type="number" className="input mt-1" value={draft.goldMin} onChange={handleNumberChange("goldMin")} />
            </label>
            <label className="label">
              Gold Max
              <input type="number" className="input mt-1" value={draft.goldMax} onChange={handleNumberChange("goldMax")} />
            </label>
            <label className="label col-span-2">
              Tags (CSV)
              <input className="input mt-1" value={draft.tags} onChange={handleTextChange("tags")} placeholder="slime,undead" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn px-3 py-1" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
