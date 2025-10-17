import { useCallback, useEffect, useRef } from "react";

type Options = {
  characterId?: string;
  getInventory: () => Record<string, number> | undefined;
  onHydrate?: (items: Record<string, number>) => void;
  debounceMs?: number;
  skipWhile?: () => boolean; // e.g., active crafting queues
};

export type InventorySyncHandle = {
  markDirty: () => void;
  syncNow: () => Promise<void>;
  hydrate: () => Promise<void>;
};

// Minimal reusable inventory sync hook between Phaser registry and server.
export function useInventorySync(opts: Options): InventorySyncHandle {
  const { characterId, getInventory, onHydrate, debounceMs = 800, skipWhile } = opts;
  const lastPersistPayload = useRef<string | null>(null);
  const persistInFlight = useRef(false);
  const lastHydratedPayload = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const normalize = (input: Record<string, number> | undefined) => {
    const clean: Record<string, number> = {};
    if (!input) return clean;
    for (const [key, value] of Object.entries(input)) {
      const num = typeof value === "number" ? Math.max(0, Math.floor(value)) : 0;
      if (num > 0) clean[key] = num;
    }
    return clean;
  };

  const hydrate = useCallback(async () => {
    if (!characterId) return;
    try {
      const res = await fetch(`/api/account/characters/inventory?characterId=${characterId}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = (data?.items as Record<string, number>) || {};
      const clean = normalize(items);
      const payload = JSON.stringify(clean);
      lastHydratedPayload.current = payload;
      lastPersistPayload.current = payload;
      onHydrate?.(clean);
    } catch {}
  }, [characterId, onHydrate]);

  const syncNow = useCallback(async () => {
    if (!characterId) return;
    if (skipWhile?.()) return;
    if (persistInFlight.current) return;
    const clean = normalize(getInventory());
    const payload = JSON.stringify(clean);
    if (payload === lastPersistPayload.current) return;
    persistInFlight.current = true;
    try {
      const res = await fetch("/api/account/characters/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, items: clean })
      });
      if (res.ok) {
        lastPersistPayload.current = payload;
      }
    } catch {
      // swallow errors; caller can retry via markDirty
    } finally {
      persistInFlight.current = false;
    }
  }, [characterId, getInventory, skipWhile]);

  const markDirty = useCallback(() => {
    if (!characterId) return;
    if (skipWhile?.()) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      void syncNow();
    }, debounceMs);
  }, [characterId, debounceMs, skipWhile, syncNow]);

  // Hydrate once on mount
  useEffect(() => {
    if (!characterId) return;
    void hydrate();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [characterId, hydrate]);

  return {
    markDirty,
    syncNow,
    hydrate,
  };
}
