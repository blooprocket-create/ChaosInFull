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
      migrateLocalStorageBlob: (username: string) => Promise<void>;
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
      // POST inventory snapshot
      const res = await fetchJSON<{ ok: boolean; items?: Record<string, number> }>(
        '/api/account/characters/inventory',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId, items }) }
      );
      return res?.items || items;
    },
    async getAccountStorage() {
      const data = await fetchJSON<{ items: Record<string, number> }>('/api/account/storage');
      if (!data || !data.items) return Array.from({ length: 50 }).map(() => null);
      return mapToSlots(data.items);
    },
    async upsertAccountStorage(items) {
      await fetch('/api/account/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      }).catch(() => {});
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
        // Mark migrated
        blob.migratedAt = Date.now();
        localStorage.setItem(key, JSON.stringify(blob));
      } catch {
        /* ignore */
      }
    }
  };
}

installPersistenceBridge();

export {}; // ensure module scope
