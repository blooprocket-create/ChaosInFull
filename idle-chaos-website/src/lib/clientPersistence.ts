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

// Local helper types to avoid any
type SkillName = 'character' | 'mining' | 'woodcutting' | 'fishing' | 'cooking' | 'smithing';
type SkillProgress = { level: number; exp: number; expToLevel: number };
type CharacterLike = { id?: string; [k: string]: unknown };
type PhaserSceneLike = {
  char?: CharacterLike;
  _updateHUD?: () => void;
  _createHUD?: () => void;
  _statsModal?: unknown;
};
type PhaserGameLike = { scene?: { getScenes?: (active: boolean) => PhaserSceneLike[] } };
type HudSharedLike = { updateHUD?: (scene: PhaserSceneLike) => void };
type SharedUiLike = { refreshStatsModal?: (scene: PhaserSceneLike) => void };
type ExtendedWindow = Window & { GAME?: PhaserGameLike; __hud_shared?: HudSharedLike; __shared_ui?: SharedUiLike };

declare global {
  interface Window {
    __cif_persist?: {
      saveCharacter: (username: string | null, char: SaveCharacterPayload | null) => Promise<void>;
  saveInventory: (characterId: string | null | undefined, items: Record<string, number>) => Promise<Record<string, number>>;
      loadInventory: (characterId: string | null | undefined) => Promise<Array<{ id: string; qty: number }>>;
      shopTransaction: (characterId: string, action: 'buy' | 'sell', itemKey: string, quantity: number) => Promise<{ ok: boolean; gold?: number; itemKey?: string; count?: number; error?: string; message?: string }>;
      getAccountStorage: () => Promise<Array<{ itemkey: string; count: number } | null>>;
      upsertAccountStorage: (items: Record<string, number>) => Promise<void>;
      saveCharacterPatch: (characterId: string, patch: Record<string, unknown>) => Promise<void>;
  saveEquipment: (characterId: string, equipment: Record<string, unknown>) => Promise<void>;
    saveTalents: (characterId: string, talents: Record<string, unknown>) => Promise<void>;
      saveQuests: (characterId: string, active: Array<{ id: string; progress?: unknown }>, completed: string[]) => Promise<void>;
    grantSkillXp: (characterId: string, skill: SkillName, amount: number) => Promise<{ level: number; exp: number; expToLevel: number } | null>;
  queueSkillXp: (characterId: string, skill: SkillName, amount: number) => Promise<void>;
      migrateLocalStorageBlob: (username: string) => Promise<void>;
      loadCharacterFull: (characterId: string) => Promise<LoadedCharacter | null>;
    };
    __persistFlags?: {
      disableServerWrites?: boolean;
    };
    __skillXpQueue?: Record<string, number>;
    __skillXpFlushTimer?: number | null;
    __inventorySync?: Record<string, { inflight: Promise<Record<string, number>> | null; pending: Record<string, number> | null }>;
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
  async grantSkillXp(characterId, skill, amount) {
      if (!characterId || !skill || !Number.isFinite(amount) || amount <= 0) return null;
      // Allow offline play or local-only sessions to skip server writes
      if (window.__persistFlags?.disableServerWrites) {
        return null;
      }
      try {
        const res = await fetch('/api/account/characters/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, skill, amount })
        });
        if (!res.ok) {
          emitTelemetry('xp_grant_fail', { characterId, skill, amount, status: res.status });
          return null;
        }
  const data = await res.json().catch(() => null) as { ok?: boolean; progress?: { level: number; exp: number; expToLevel: number } } | null;
  const progress = data?.progress;
        if (progress && typeof progress.level === 'number') {
          emitTelemetry('xp_grant_success', { characterId, skill, amount, level: progress.level, exp: progress.exp, expToLevel: progress.expToLevel });
          // Side-effect: update any active Phaser scene's local character skill object so HUD & stats modal reflect server state.
          try {
            const w = window as ExtendedWindow;
            const game = w.GAME;
            const scenesUnknown: unknown[] = game?.scene?.getScenes ? (game.scene.getScenes(true) as unknown[]) : [];
            for (const sUnknown of scenesUnknown) {
              const s = sUnknown as PhaserSceneLike;
              try {
                const ch = s?.char as CharacterLike | undefined;
                if (!ch || (ch.id && ch.id !== characterId)) continue;
                // Ensure skill container exists
                const existing = (skill === 'character')
                  ? ({
                      level: Number((ch as { level?: number }).level ?? 1),
                      exp: Number((ch as { exp?: number }).exp ?? 0),
                      expToLevel: Number((ch as { expToLevel?: number }).expToLevel ?? 100)
                    } as SkillProgress)
                  : ((ch[skill as keyof CharacterLike] as SkillProgress | undefined) || { level: 1, exp: 0, expToLevel: 100 });
                const oldLevel = Number(existing.level || 1);
                // Merge server progress into local character skill
                if (skill === 'character') {
                  // For core character XP, update top-level level and exp/expToLevel mirrors
                  const chCore = ch as { exp?: number; expToLevel?: number; level?: number };
                  chCore.exp = progress.exp;
                  chCore.expToLevel = progress.expToLevel;
                  chCore.level = progress.level;
                } else {
                  (ch as Record<string, unknown>)[skill] = { ...existing, ...progress } as SkillProgress;
                }
                // If level increased, award talent points and persist talents snapshot
                try {
                  const newLevel = Number(progress.level || oldLevel);
                  const gained = Math.max(0, newLevel - oldLevel);
                  if (gained > 0) {
                    const mod = await import("@/src/game/phaser/data/talents.js");
                    const onSkillLevelUp = (mod as unknown as { onSkillLevelUp?: (scene: PhaserSceneLike, char: CharacterLike, skillKey: string, levelsGained?: number) => void }).onSkillLevelUp;
                    try { onSkillLevelUp && onSkillLevelUp(s as PhaserSceneLike, ch as CharacterLike, skill, gained); } catch {}
                    try {
                      const t = (ch as { talents?: Record<string, unknown> }).talents;
                      if (t && typeof window.__cif_persist?.saveTalents === 'function' && ch.id) {
                        await window.__cif_persist.saveTalents(String(ch.id), t);
                      }
                    } catch {}
                  }
                } catch {}
                // Fire a custom event for any React/DOM listeners
                try { window.dispatchEvent(new CustomEvent('skill:progress', { detail: { characterId, skill, progress } })); } catch {}
                // Refresh HUD & stats modal if helpers exist
                try {
                  if (typeof s._updateHUD === 'function') s._updateHUD();
                  else {
                    const hudShared: HudSharedLike | undefined = (w.__hud_shared as HudSharedLike | undefined);
                    if (hudShared?.updateHUD) { try { hudShared.updateHUD(s); } catch {} }
                    else if (typeof s._createHUD === 'function') { try { s._createHUD(); } catch {} }
                  }
                } catch {}
                try {
                  const sharedUI: SharedUiLike | undefined = (w.__shared_ui as SharedUiLike | undefined);
                  if (s._statsModal && sharedUI?.refreshStatsModal) sharedUI.refreshStatsModal(s);
                } catch {}
              } catch {}
            }
          } catch {}
          return progress;
        }
        emitTelemetry('xp_grant_partial', { characterId, skill, amount });
        return null;
      } catch {
        emitTelemetry('xp_grant_fail', { characterId, skill, amount, network: true });
        return null;
      }
    },
    // Queue/batch frequent skill XP grants to reduce network spam (e.g. continuous actions).
    // Flush occurs after a short debounce or if queue grows large.
  async queueSkillXp(characterId: string, skill: SkillName, amount: number) {
      if (!characterId || !skill || !Number.isFinite(amount) || amount <= 0) return;
      if (window.__persistFlags?.disableServerWrites) return; // offline mode
      try {
        window.__skillXpQueue = window.__skillXpQueue || {};
        const q: Record<string, number> = window.__skillXpQueue;
        const key = skill;
        q[key] = (q[key] || 0) + Math.max(1, Math.floor(amount));
        // If queue big, flush immediately
        const queuedTotal = Object.values(q).reduce((a,b) => a + b, 0);
        const skillCount = Object.keys(q).length;
        const immediate = queuedTotal >= 250 || skillCount >= 3;
        type Skill = SkillName;
        const isSkill = (s: string): s is Skill => (
          s === 'character' || s === 'mining' || s === 'woodcutting' || s === 'fishing' || s === 'cooking' || s === 'smithing'
        );
        const scheduleFlush = () => {
          if (window.__skillXpFlushTimer) return;
          window.__skillXpFlushTimer = window.setTimeout(async () => {
            window.__skillXpFlushTimer = null;
            const snapshot: Record<string, number> = { ...q };
            for (const k of Object.keys(q)) delete q[k];
            emitTelemetry('xp_batch_flush_begin', { characterId, skills: Object.keys(snapshot), total: Object.values(snapshot).reduce((a,b)=>a+b,0) });
            for (const [skillName, amt] of Object.entries(snapshot)) {
              if (isSkill(skillName)) {
                try { await window.__cif_persist?.grantSkillXp(characterId, skillName, amt); } catch {}
              }
            }
            emitTelemetry('xp_batch_flush_end', { characterId });
          }, 750);
        };
        if (immediate) {
          // Immediate flush now
          const snapshot: Record<string, number> = { ...q };
          for (const k of Object.keys(q)) delete q[k];
          emitTelemetry('xp_batch_flush_begin', { characterId, skills: Object.keys(snapshot), total: Object.values(snapshot).reduce((a,b)=>a+b,0), immediate: true });
          for (const [skillName, amt] of Object.entries(snapshot)) {
            if (isSkill(skillName)) {
              try { await window.__cif_persist?.grantSkillXp(characterId, skillName, amt); } catch {}
            }
          }
          emitTelemetry('xp_batch_flush_end', { characterId, immediate: true });
        } else {
          scheduleFlush();
        }
      } catch {}
    },
    async saveInventory(characterId, items) {
      if (!characterId) return items; // no character context yet (login / character select scenes)
      if (window.__persistFlags?.disableServerWrites) return items;
      // Sanitize counts to finite non-negative integers before sending
      const sanitized: Record<string, number> = {};
      try {
        for (const [k, v] of Object.entries(items || {})) {
          const n = Number(v);
          if (!Number.isFinite(n)) continue;
          const iv = Math.max(0, Math.floor(n));
          if (iv > 0) sanitized[k] = iv;
        }
      } catch {}
      // Coalesce concurrent saves per-character to reduce race conditions
      window.__inventorySync = window.__inventorySync || {};
      const state = window.__inventorySync[characterId] || { inflight: null, pending: null };
      window.__inventorySync[characterId] = state;

      // Helper to perform the POST
      const doPost = async (payload: Record<string, number>): Promise<Record<string, number>> => {
        try {
          const res = await fetch('/api/account/characters/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId, items: payload })
          });
          const data = await res.json().catch(() => null) as { ok?: boolean; items?: Record<string, number>; error?: string; message?: string } | null;
          if (res.ok && data?.ok) {
            emitTelemetry('inventory_sync_success', { characterId, itemCount: Object.keys(payload).length });
            return data.items || payload;
          }
          const errMsg = data?.message || `status_${res.status}`;
          console.error('[inventory] sync failed', { characterId, err: errMsg, error: data?.error, items: Object.keys(payload).length });
          emitTelemetry('inventory_sync_fail', { characterId, status: res.status, error: data?.error, message: data?.message });
          return payload;
        } catch {
          console.error('[inventory] sync network error', { characterId });
          emitTelemetry('inventory_sync_fail', { characterId, network: true });
          return payload;
        }
      };

      // If a request is inflight, queue the latest payload and wait, then send the queued one
      if (state.inflight) {
        state.pending = { ...sanitized };
        try { await state.inflight; } catch {}
        const pending = state.pending; state.pending = null;
        state.inflight = doPost(pending || sanitized);
        try { const result = await state.inflight; return result; } finally { state.inflight = null; }
      }

      // No inflight request: send now
      state.inflight = doPost(sanitized);
      try {
        const result = await state.inflight;
        // If something was queued during the request, send the final snapshot
        if (state.pending) {
          const pending = state.pending; state.pending = null;
          state.inflight = doPost(pending);
          const res2 = await state.inflight; return res2;
        }
        return result;
      } finally {
        state.inflight = null;
      }
    },
    async loadInventory(characterId) {
      try {
        if (!characterId) return [];
        const data = await fetchJSON<{ ok: boolean; items?: Record<string, number> }>(
          `/api/account/characters/inventory?characterId=${encodeURIComponent(String(characterId))}`
        );
        const slots: Array<{ id: string; qty: number }> = [];
        const items = data?.items || {};
        for (const [id, qty] of Object.entries(items)) {
          const n = Math.max(0, Math.floor(Number(qty) || 0));
          if (n > 0) slots.push({ id, qty: n });
        }
        return slots;
      } catch {
        return [];
      }
    },
    async shopTransaction(characterId, action, itemKey, quantity) {
      if (!characterId || !action || !itemKey) return { ok: false, error: 'invalid' };
      try {
        const res = await fetch('/api/shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, action, itemKey, quantity: Math.max(1, Math.floor(quantity || 1)) })
        });
        const data = await res.json().catch(() => null) as { ok?: boolean; gold?: number; itemKey?: string; count?: number; error?: string; message?: string } | null;
        if (!res.ok || !data) return { ok: false, error: data?.error || 'shop_failed', message: data?.message };
        // Telemetry
        emitTelemetry('shop_transaction', { characterId, action, itemKey, quantity, gold: data.gold });
        return { ok: !!data.ok, gold: data.gold, itemKey: data.itemKey, count: data.count };
      } catch {
        return { ok: false, error: 'network' };
      }
    },
    async saveCharacterPatch(characterId, patch) {
      if (!characterId) return; // ignore until a real character id is known
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
    async saveEquipment(characterId, equipment) {
      if (!characterId) return;
      if (window.__persistFlags?.disableServerWrites) return;
      try {
        const res = await fetch('/api/account/characters/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, equipment })
        });
        if (res.ok) emitTelemetry('equipment_sync_success', { characterId });
        else emitTelemetry('equipment_sync_fail', { characterId, status: res.status });
      } catch {
        emitTelemetry('equipment_sync_fail', { characterId, network: true });
      }
    },
    async saveTalents(characterId, talents) {
      if (!characterId) return;
      if (window.__persistFlags?.disableServerWrites) return;
      try {
        const res = await fetch('/api/account/characters/talents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, talents })
        });
        if (res.ok) emitTelemetry('talents_sync_success', { characterId });
        else emitTelemetry('talents_sync_fail', { characterId, status: res.status });
      } catch {
        emitTelemetry('talents_sync_fail', { characterId, network: true });
      }
    },
    async saveQuests(characterId, active, completed) {
      if (!characterId) return; // ignore quest sync before character selection
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
