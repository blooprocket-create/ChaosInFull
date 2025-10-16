type Presence = { characterId: string; name: string; x: number; y: number; lastSeen: number };

const presenceByZone = new Map<string, Map<string, Presence>>();

function zoneMap(zone: string) {
  let m = presenceByZone.get(zone);
  if (!m) { m = new Map<string, Presence>(); presenceByZone.set(zone, m); }
  return m;
}

export function heartbeat(zone: string, p: { characterId: string; name: string; x: number; y: number }) {
  const now = Date.now();
  const z = zoneMap(zone);
  z.set(p.characterId, { characterId: p.characterId, name: p.name, x: p.x, y: p.y, lastSeen: now });
  return true;
}

export function list(zone: string, opts?: { excludeId?: string }) {
  const now = Date.now();
  const cutoff = now - 15_000; // keep last 15s as online
  const z = zoneMap(zone);
  // Prune stale entries
  for (const [id, pr] of z) {
    if ((pr.lastSeen || 0) < cutoff) z.delete(id);
  }
  const arr = Array.from(z.values());
  const filtered = opts?.excludeId ? arr.filter(p => p.characterId !== opts.excludeId) : arr;
  return filtered.map(p => ({ id: p.characterId, name: p.name, x: p.x, y: p.y, lastSeen: p.lastSeen }));
}
