// Lightweight client-side persistence bridge to migrate from localStorage -> server DB.
// Exposes window.__cif_persist with helpers used by legacy Phaser scenes.
// Safe to call even before auth; methods will no-op if unauthorized.

type SaveCharacterPayload = {
  id?: string;
  name?: string;
  class?: string;
  level?: number;
  inventory?: unknown; // legacy shape; inventory syncing handled separately
  [k: string]: unknown;
};

declare global {
  interface Window {
    __cif_persist?: {
      saveCharacter: (username: string | null, char: SaveCharacterPayload | null) => Promise<void>;
      saveInventory: (characterId: string, items: Record<string, number>) => Promise<Record<string, number>>;
      getAccountStorage: () => Promise<Array<{ itemkey: string; count: number } | null>>;
      upsertAccountStorage: (items: Record<string, number>) => Promise<void>;
      saveCharacterPatch: (characterId: string, patch: Record<string, unknown>) => Promise<void>;
      saveQuests: (characterId: string, active: Array<{ id: string; progress?: unknown }>, completed: string[]) => Promise<void>;
      migrateLocalStorageBlob: (username: string) => Promise<void>;
      loadCharacterFull: (characterId: string) => Promise<LoadedCharacter | null>;
    };
    __persistFlags?: {
      disableServerWrites?: boolean;
    };
  }
}

// Translate AccountItemStack map -> slot array (50) for legacy UI expectations.
function mapToSlots(items: Record<string, number>): Array<{ itemkey: string; count: number } | null> {
  const slots: Array<{ itemkey: string; count: number } | null> = Array.from({ length: 50 }).map(() => null);
  let i = 0;
  for (const [itemkey, count] of Object.entries(items)) {
    if (i >= slots.length) break;
    slots[i++] = { itemkey, count };
  }
  return slots;
}

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function emitTelemetry(name: string, props?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name, props } }));
    }
  } catch {}
}

export type LoadedQuest = { id: string; progress: unknown | null };
export type LoadedCharacter = {
  id: string;
  name: string;
  class: string;
  level: number;
  gold: number;
  flags: Record<string, unknown>;
  fishing: unknown | null;
  equipment: unknown | null;
  talents: unknown | null;
  lastLocation: { scene: string; x: number | null; y: number | null } | null;
  inventory: Array<{ id: string; qty: number }>;
  activeQuests: LoadedQuest[];
  completedQuests: string[];
};

function installPersistenceBridge() {
  if (typeof window === 'undefined') return;
  if (window.__cif_persist) return; // already installed
  window.__cif_persist = {
    async saveCharacter(username, char) {
      if (!char) return;
      // Character core state (scene/afk) handled via /api/account/characters/state.
      // Inventory persists separately; here we only ensure we keep localStorage compatibility for name/class/etc.
      try {
        if (!username) return;
        const key = 'cif_user_' + username;
        const blob = JSON.parse(localStorage.getItem(key) || '{"characters":[]}');
        if (!blob.characters) blob.characters = [];
        let replaced = false;
        for (let i = 0; i < blob.characters.length; i++) {
          const c = blob.characters[i];
          if (!c) continue;
          if ((c.id && char.id && c.id === char.id) || (!c.id && c.name === char.name)) {
            blob.characters[i] = char;
            replaced = true;
            break;
          }
        }
        if (!replaced) blob.characters.push(char);
        localStorage.setItem(key, JSON.stringify(blob));
      } catch {
        /* swallow */
      }
    },
    async saveInventory(characterId, items) {
      if (!characterId) return {};
      if (window.__persistFlags?.disableServerWrites) return items;
      // POST inventory snapshot
      const res = await fetchJSON<{ ok: boolean; items?: Record<string, number> }>(
        '/api/account/characters/inventory',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId, items }) }
      );
      if (res?.ok) emitTelemetry('inventory_sync_success', { characterId, itemCount: Object.keys(items).length });
      else emitTelemetry('inventory_sync_fail', { characterId });
      return res?.items || items;
    },
    async saveCharacterPatch(characterId, patch) {
      if (!characterId) return;
      if (window.__persistFlags?.disableServerWrites) return;
      try {
        const res = await fetch('/api/account/characters/patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, ...patch })
        });
        if (res.ok) emitTelemetry('character_patch_success', { characterId });
        else emitTelemetry('character_patch_fail', { characterId, status: res.status });
      } catch {
        emitTelemetry('character_patch_fail', { characterId, network: true });
      }
    },
    async saveQuests(characterId, active, completed) {
      if (!characterId) return;
      if (window.__persistFlags?.disableServerWrites) return;
      try {
        const res = await fetch('/api/account/characters/quests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, active, completed })
        });
        if (res.ok) emitTelemetry('quest_sync_success', { characterId, active: active?.length || 0, completed: completed?.length || 0 });
        else emitTelemetry('quest_sync_fail', { characterId, status: res.status });
      } catch {
        emitTelemetry('quest_sync_fail', { characterId, network: true });
      }
    },
    async loadCharacterFull(characterId): Promise<LoadedCharacter | null> {
      if (!characterId) return null;
      const data = await fetchJSON<{ ok: boolean; character?: {
        id: string; name: string; class: string; level: number; gold: number; flags?: Record<string, unknown> | null;
        fishing?: unknown; equipment?: unknown; talents?: unknown; lastScene?: string | null; lastX?: number | null; lastY?: number | null;
        inventory?: Record<string, number>; quests?: { active?: Array<{ id: string; progress?: unknown }>; completed?: string[] };
      } }>(`/api/account/characters/full?characterId=${encodeURIComponent(characterId)}`);
      if (!data || !data.ok || !data.character) return null;
      const c = data.character;
      // Transform inventory stacks map -> legacy slots (single slot per itemkey with qty)
      const slots: Array<{ id: string; qty: number }> = [];
      if (c.inventory && typeof c.inventory === 'object') {
        for (const [itemkey, count] of Object.entries(c.inventory as Record<string, number>)) {
          slots.push({ id: itemkey, qty: count as number });
        }
      }
      // Quest arrays already shaped; ensure legacy field names
      const activeQuests: LoadedQuest[] = Array.isArray(c.quests?.active)
        ? c.quests!.active!.map(q => ({ id: q.id, progress: q.progress ?? null }))
        : [];
      const completedQuests = Array.isArray(c.quests?.completed) ? c.quests.completed.slice() : [];
      return {
        id: c.id,
        name: c.name,
        class: c.class,
        level: c.level,
        gold: c.gold,
        flags: c.flags || {},
        fishing: c.fishing || null,
        equipment: c.equipment || null,
        talents: c.talents || null,
        lastLocation: c.lastScene ? { scene: c.lastScene, x: c.lastX || null, y: c.lastY || null } : null,
        inventory: slots,
        activeQuests,
        completedQuests
      };
    },
    async getAccountStorage() {
      const data = await fetchJSON<{ items: Record<string, number> }>('/api/account/storage');
      if (!data || !data.items) return Array.from({ length: 50 }).map(() => null);
      return mapToSlots(data.items);
    },
    async upsertAccountStorage(items) {
      if (window.__persistFlags?.disableServerWrites) return;
      try {
        const res = await fetch('/api/account/storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
        if (res.ok) emitTelemetry('storage_upsert_success', { count: Object.keys(items).length });
        else emitTelemetry('storage_upsert_fail', { status: res.status });
      } catch {
        emitTelemetry('storage_upsert_fail', { network: true });
      }
    },
    async migrateLocalStorageBlob(username) {
      if (!username) return;
      const key = 'cif_user_' + username;
      try {
        const blob = JSON.parse(localStorage.getItem(key) || 'null');
        if (!blob) return;
        // Migrate storage array -> AccountItemStack map (merge counts)
        if (Array.isArray(blob.storage)) {
          const map: Record<string, number> = {};
            for (const slot of blob.storage) {
              if (!slot) continue;
              const { itemkey, count } = slot as { itemkey?: string; count?: number };
              if (!itemkey || typeof count !== 'number') continue;
              map[itemkey] = (map[itemkey] || 0) + count;
            }
          await window.__cif_persist?.upsertAccountStorage(map);
        }
        // Attempt to migrate any characters present in the local blob
        if (Array.isArray(blob.characters)) {
          for (const ch of blob.characters as Array<Record<string, unknown>>) {
            try {
              const chId = ch?.id as string | undefined;
              if (!chId) continue;
              // Inventory migration: slots -> stacks map
              if (Array.isArray(ch.inventory)) {
                const map: Record<string, number> = {};
                for (const slot of ch.inventory) {
                  if (!slot) continue;
                  const id = (slot as { id?: string }).id as string | undefined; const qty = Number((slot as { qty?: number }).qty || 1);
                  if (!id || !qty) continue;
                  map[id] = (map[id] || 0) + qty;
                }
                await window.__cif_persist?.saveInventory(chId, map);
              }
              // Character patch: gold/flags/fishing/equipment/talents/last location
              const patch: Record<string, unknown> = {};
              const gold = (ch as { gold?: number }).gold; if (typeof gold === 'number') patch.gold = Math.max(0, Math.floor(gold));
              const flags = (ch as { flags?: unknown }).flags; if (flags) patch.flags = flags;
              const fishing = (ch as { fishing?: unknown }).fishing; if (fishing) patch.fishing = fishing;
              const equipment = (ch as { equipment?: unknown }).equipment; if (equipment) patch.equipment = equipment;
              const talents = (ch as { talents?: unknown }).talents; if (talents) patch.talents = talents;
              const lastLocation = (ch as { lastLocation?: { scene?: string; x?: number; y?: number } }).lastLocation;
              if (lastLocation) {
                patch.lastScene = lastLocation.scene || null;
                if (typeof lastLocation.x === 'number') patch.lastX = lastLocation.x;
                if (typeof lastLocation.y === 'number') patch.lastY = lastLocation.y;
              }
              if (Object.keys(patch).length) await window.__cif_persist?.saveCharacterPatch(chId, patch);
              // Quests
              const active = Array.isArray((ch as { activeQuests?: Array<{ id: string; progress?: unknown }> }).activeQuests)
                ? ((ch as { activeQuests?: Array<{ id: string; progress?: unknown }> }).activeQuests!).map(q => ({ id: q.id, progress: q.progress ?? null }))
                : [];
              const completed = Array.isArray((ch as { completedQuests?: string[] }).completedQuests)
                ? ((ch as { completedQuests?: string[] }).completedQuests!).slice()
                : [];
              if (active.length || completed.length) {
                await window.__cif_persist?.saveQuests(chId, active, completed);
              }
            } catch {}
          }
        }
        // Mark migrated
        blob.migratedAt = Date.now();
        localStorage.setItem(key, JSON.stringify(blob));
        emitTelemetry('migration_success', { username });
      } catch {
        emitTelemetry('migration_error', { username });
      }
    }
  };
}

installPersistenceBridge();

export {}; // ensure module scope
