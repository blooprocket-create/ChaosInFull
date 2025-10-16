"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
const GameCanvas = dynamic(() => import("@/src/game/GameCanvas"), { ssr: false });

type Zone = {
  id: string;
  name: string;
  sceneKey?: string;
  width?: number | null;
  height?: number | null;
};

type Portal = {
  id: string;
  x: number;
  y: number;
  radius?: number | null;
  label?: string | null;
  targetZoneId: string;
};

type Spawn = {
  id: string;
  templateId: string;
  budget: number;
  respawnMs: number;
  slots?: number[] | null;
};

type DragState = { id: string; dx: number; dy: number } | null;
type SlotDragState = { spawnId: string; index: number; dx: number } | null;

const notify = (msg: string, type: "success" | "error" | "info" = "info") => {
  try { window.showToast?.(msg, type); } catch {}
};

export default function WorldEditorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const slotDragRef = useRef<SlotDragState>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [portals, setPortals] = useState<Portal[]>([]);
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [selectedSpawnId, setSelectedSpawnId] = useState<string>("");
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  const activeZone = useMemo(() => zones.find((z) => z.id === zoneId) || null, [zones, zoneId]);

  const updateSpawn = useCallback(async (id: string, patch: Partial<Spawn>) => {
    const r = await fetch(`/api/admin/zones/${zoneId}/spawns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (r.ok) {
      const j = await (await fetch(`/api/admin/zones/${zoneId}/spawns`)).json();
      setSpawns(j.rows);
      notify('Saved','success');
    }
  }, [zoneId]);

  // initial zones load
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/zones");
      if (!r.ok) return;
      const j = (await r.json()) as { rows: Zone[] };
      setZones(j.rows);
      if (!zoneId && j.rows.length) setZoneId(j.rows[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPortals = async (id: string) => {
    if (!id) return;
    const r = await fetch(`/api/admin/zones/${id}/portals`);
    if (!r.ok) return;
    const j = (await r.json()) as { rows: Portal[] };
    setPortals(j.rows);
  };

  const loadSpawns = async (id: string) => {
    if (!id) return;
    const r = await fetch(`/api/admin/zones/${id}/spawns`);
    if (!r.ok) return;
    const j = (await r.json()) as { rows: Spawn[] };
    setSpawns(j.rows);
  };

  useEffect(() => {
    // when zone changes, load related data
    if (!zoneId) return;
    void loadPortals(zoneId);
    void loadSpawns(zoneId);
  }, [zoneId]);

  useEffect(() => {
    // update canvas dims when active zone changes
    const w = activeZone?.width ?? 800;
    const h = activeZone?.height ?? 600;
    setDims({ w, h });
  }, [activeZone]);

  // Draw canvas contents
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    // background grid
    ctx.fillStyle = "#0b0b10"; ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1;
    for (let x = 0; x < cvs.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke(); }
    for (let y = 0; y < cvs.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke(); }
    // spawns (slots)
    spawns.forEach((s) => {
      const slots = Array.isArray(s.slots) ? s.slots ?? [] : [];
      slots.forEach((sx, i) => {
        const yy = 60 + i * 22;
        ctx.fillStyle = s.id === selectedSpawnId ? "#60a5fa" : "#88aaff";
        ctx.fillRect(sx - 4, yy - 4, 8, 8);
      });
    });
    // portals
    portals.forEach((p) => {
      const rad = p.radius ?? 16;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 85, 247, 0.4)"; ctx.fill();
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#eee"; ctx.font = "12px sans-serif"; ctx.fillText(p.label || `Portal -> ${p.targetZoneId}`, p.x + rad + 4, p.y + 4);
    });
  }, [portals, spawns, dims, selectedSpawnId]);

  // Mouse interactions on canvas
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const onDown = (e: MouseEvent) => {
      const rect = cvs.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      // If clicking near a spawn slot, prioritize slot dragging
      const selected = spawns.find((s) => s.id === selectedSpawnId);
      const slotIndex = selected ? (Array.isArray(selected.slots) ? selected.slots : []).findIndex((sx, i) => Math.hypot(sx - x, 60 + i * 22 - y) <= 8) : -1;
      if (selected && slotIndex >= 0) { slotDragRef.current = { spawnId: selected.id, index: slotIndex, dx: (selected.slots?.[slotIndex] ?? 0) - x }; return; }
      // Otherwise, portals
      const hit = portals.find((p) => Math.hypot(p.x - x, p.y - y) <= (p.radius || 16));
      if (hit) { dragRef.current = { id: hit.id, dx: hit.x - x, dy: hit.y - y }; return; }
      // If clicking near any spawn slot, select that spawn
      const nearSpawn = spawns.find((s) => (Array.isArray(s.slots) ? s.slots : []).some((sx, i) => Math.hypot(sx - x, 60 + i * 22 - y) <= 8));
      if (nearSpawn) setSelectedSpawnId(nearSpawn.id);
    };
    const onMove = (e: MouseEvent) => {
      const rect = cvs.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      if (slotDragRef.current) {
        const sd = slotDragRef.current; const si = spawns.findIndex((s) => s.id === sd.spawnId); if (si >= 0) {
          const s = spawns[si]; const slots = Array.isArray(s.slots) ? [...s.slots] : [];
          const nx = Math.max(0, Math.min(dims.w, Math.round(x + sd.dx)));
          if (slots[sd.index] !== nx) { slots[sd.index] = nx; const ns = { ...s, slots }; setSpawns((prev) => prev.map((row) => (row.id === s.id ? ns : row))); }
        }
        return;
      }
      if (dragRef.current) {
        const i = portals.findIndex((p) => p.id === dragRef.current!.id);
        if (i >= 0) { const p = portals[i]; const nx = Math.round(x + dragRef.current.dx); const ny = Math.round(y + dragRef.current.dy); const np = { ...p, x: nx, y: ny }; setPortals((prev) => prev.map((row) => (row.id === p.id ? np : row))); }
      }
    };
    const onUp = async () => {
      if (slotDragRef.current) {
        const sd = slotDragRef.current; slotDragRef.current = null; const s = spawns.find((ss) => ss.id === sd.spawnId); if (!s) return;
        await updateSpawn(s.id, { slots: Array.isArray(s.slots) ? s.slots : [] }); notify('Slot moved', 'success'); return;
      }
      const d = dragRef.current; dragRef.current = null; if (!d) return; const p = portals.find((pp) => pp.id === d.id); if (!p) return;
      await fetch(`/api/admin/zones/${zoneId}/portals/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: p.x, y: p.y }) }); notify('Portal moved', 'success');
    };
    const onCtx = async (e: MouseEvent) => {
      e.preventDefault(); const rect = cvs.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const sel = spawns.find((s) => s.id === selectedSpawnId); if (!sel) return; const slots = Array.isArray(sel.slots) ? [...sel.slots] : []; if (!slots.length) return; let closest = -1; let best = Infinity; slots.forEach((sx, i) => { const dy = 60 + i * 22; const dist = Math.hypot(sx - x, dy - y); if (dist < best) { best = dist; closest = i; } }); if (closest >= 0 && best <= 12) { slots.splice(closest, 1); await updateSpawn(sel.id, { slots }); notify('Slot removed', 'success'); }
    };
    cvs.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); cvs.addEventListener('contextmenu', onCtx);
    return () => { cvs.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); cvs.removeEventListener('contextmenu', onCtx); };
  }, [portals, zoneId, spawns, selectedSpawnId, dims.w, updateSpawn]);

  const addPortal = async () => { if (!zoneId) return; const targetZoneId = prompt('Target zone id?'); if (!targetZoneId) return; const r = await fetch(`/api/admin/zones/${zoneId}/portals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetZoneId, x: 100, y: 100, label: '' }) }); if (r.ok) { const j = await r.json(); setPortals(p=>[...p, j.row]); notify('Portal created','success'); } };
  const deletePortal = async (id: string) => { if (!confirm('Delete this portal?')) return; const r = await fetch(`/api/admin/zones/${zoneId}/portals/${id}`, { method: 'DELETE' }); if (r.ok) { setPortals(p=>p.filter(x=>x.id!==id)); notify('Portal deleted','success'); } };

  const addZone = async () => { const id = prompt('New zone id?'); const name = prompt('Zone name?'); const sceneKey = prompt('Scene key?'); if (!id || !name || !sceneKey) return; const r = await fetch('/api/admin/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name, sceneKey }) }); if (r.ok) { const rz = await fetch('/api/admin/zones'); if (rz.ok) { const jz = await rz.json() as { rows: Zone[] }; setZones(jz.rows); setZoneId(id); } notify('Zone created','success'); } };
  const saveZoneMeta = async () => { const z = zones.find(z=>z.id===zoneId); if (!z) return; const width = Number(prompt('Width?', String(z.width ?? 800))); const height = Number(prompt('Height?', String(z.height ?? 600))); const r = await fetch(`/api/admin/zones/${zoneId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ width, height }) }); if (r.ok) { const rz = await fetch('/api/admin/zones'); if (rz.ok) { const jz = await rz.json() as { rows: Zone[] }; setZones(jz.rows); } notify('Zone size saved','success'); } };

  const addSpawn = async () => { const templateId = prompt('Enemy template id?'); if (!templateId) return; const r = await fetch(`/api/admin/zones/${zoneId}/spawns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId, slots: [100,180,260] }) }); if (r.ok) { const j = await r.json(); setSpawns(s=>[...s, j.row]); setSelectedSpawnId(j.row.id); notify('Spawn created','success'); } };
  const deleteSpawn = async (id: string) => { if (!confirm('Delete this spawn?')) return; const r = await fetch(`/api/admin/zones/${zoneId}/spawns/${id}`, { method: 'DELETE' }); if (r.ok) { setSpawns(s=>s.filter(x=>x.id!==id)); notify('Spawn deleted','success'); } };
  // Add slot on canvas double click
  useEffect(()=>{ const cvs = canvasRef.current; if (!cvs) return; const onDbl = (e: MouseEvent) => { const rect = cvs.getBoundingClientRect(); const x = e.clientX - rect.left; const s = spawns.find(ss=>ss.id===selectedSpawnId); if (!s) return; const slots = Array.isArray(s.slots)? [...s.slots] : []; slots.push(Math.max(0, Math.min(dims.w, Math.round(x)))); void updateSpawn(s.id, { slots }); }; cvs.addEventListener('dblclick', onDbl); return ()=> cvs.removeEventListener('dblclick', onDbl); },[selectedSpawnId, spawns, dims.w, updateSpawn]);

  const updatePortal = async (id: string, patch: Partial<Portal>) => { const r = await fetch(`/api/admin/zones/${zoneId}/portals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }); if (r.ok) { const j = await (await fetch(`/api/admin/zones/${zoneId}/portals`)).json(); setPortals(j.rows); notify('Saved','success'); } };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <div className="-mt-2 mb-1 text-sm">
        <a href="/admin" className="text-emerald-300 hover:underline">← Back to Admin</a>
      </div>
      <h1 className="text-2xl font-semibold">World Editor</h1>
      <div className="flex items-center gap-2">
        <select className="rounded bg-black/40 border border-white/10 px-2 py-1" value={zoneId} onChange={e=>setZoneId(e.target.value)}>
          {zones.map(z=> (<option key={z.id} value={z.id}>{z.name} ({z.id})</option>))}
        </select>
        <button className="btn px-2 py-1" onClick={addZone}>New Zone</button>
        <button className="btn px-2 py-1" onClick={saveZoneMeta}>Resize Zone</button>
        <button className="btn px-2 py-1" onClick={addPortal}>Add Portal</button>
        <button className="btn px-2 py-1" onClick={addSpawn}>Add Spawn</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="relative">
          <canvas ref={canvasRef} width={dims.w} height={dims.h} className="rounded border border-white/10 bg-black/50" />
          <div className="absolute top-2 left-2 text-xs text-gray-300 bg-black/50 rounded px-2 py-1">Drag portals to reposition. Spawns show as blue squares (slots) — drag a slot to move it, double-click to add, right-click to remove.</div>
        </div>
        <div className="sticky top-20">
          <div className="text-sm text-gray-300 mb-2">Live Scene Preview</div>
          <div className="rounded border border-white/10 bg-black/40 p-2">
            <GameCanvas initialScene={activeZone?.name || "Town"} readonly />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold">Portals</h2>
          <div className="mt-2 space-y-2">
            {portals.map(p => (
              <div key={p.id} className="rounded border border-white/10 bg-black/35 p-2 flex items-center justify-between">
                <div className="text-sm flex items-center gap-2">
                  <span className="opacity-70">({p.x},{p.y})</span>
                  <input className="rounded bg-black/40 border border-white/10 px-2 py-1 w-40" value={p.targetZoneId} onChange={e=>updatePortal(p.id,{ targetZoneId: e.target.value })} />
                  <input className="rounded bg-black/40 border border-white/10 px-2 py-1 w-36" value={p.label||""} placeholder="label" onChange={e=>updatePortal(p.id,{ label: e.target.value })} />
                </div>
                <button className="btn px-2 py-1" onClick={()=>deletePortal(p.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold">Spawns</h2>
          <div className="mt-2 space-y-2">
            {spawns.map(s => (
              <div key={s.id} className={`rounded border border-white/10 p-2 flex items-center justify-between ${s.id===selectedSpawnId? 'bg-black/60':'bg-black/35'}`} onClick={()=>setSelectedSpawnId(s.id)}>
                <div className="text-sm flex items-center gap-2">
                  <input className="rounded bg-black/40 border border-white/10 px-2 py-1 w-44" value={s.templateId} onChange={e=>updateSpawn(s.id,{ templateId: e.target.value })} />
                  <label className="text-xs opacity-80">Budget <input type="number" className="w-20 rounded bg-black/40 border border-white/10 px-2 py-1" value={s.budget} onChange={e=>updateSpawn(s.id,{ budget: parseInt(e.target.value||'0',10) })} /></label>
                  <label className="text-xs opacity-80">Respawn <input type="number" className="w-24 rounded bg-black/40 border border-white/10 px-2 py-1" value={s.respawnMs} onChange={e=>updateSpawn(s.id,{ respawnMs: parseInt(e.target.value||'0',10) })} /></label>
                </div>
                <button className="btn px-2 py-1" onClick={()=>deleteSpawn(s.id)}>Delete</button>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">Tip: Double-click the canvas to add a slot at that X for the selected spawn.</div>
        </div>
      </div>
    </section>
  );
}
