import { useEffect, useRef } from "react";

type Options = {
  characterId?: string;
  getInventory: () => Record<string, number> | undefined;
  onHydrate?: (items: Record<string, number>) => void;
  persistEveryMs?: number;
  reconcileEveryMs?: number;
  skipWhile?: () => boolean; // e.g., active crafting queues
};

// Minimal reusable inventory sync hook between Phaser registry and server.
export function useInventorySync(opts: Options) {
  const { characterId, getInventory, onHydrate, persistEveryMs = 7000, reconcileEveryMs = 15000, skipWhile } = opts;
  const lastPersistPayload = useRef<string | null>(null);
  const persistInFlight = useRef(false);
  const lastHydratedPayload = useRef<string | null>(null);

  const normalize = (input: Record<string, number> | undefined) => {
    const clean: Record<string, number> = {};
    if (!input) return clean;
    for (const [key, value] of Object.entries(input)) {
      const num = typeof value === "number" ? Math.max(0, Math.floor(value)) : 0;
      if (num > 0) clean[key] = num;
    }
    return clean;
  };

  // Hydrate once on mount
  useEffect(() => {
    if (!characterId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/account/characters/inventory?characterId=${characterId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!aborted) {
          const items = (data?.items as Record<string, number>) || {};
          const clean = normalize(items);
          const payload = JSON.stringify(clean);
          lastHydratedPayload.current = payload;
          lastPersistPayload.current = payload;
          onHydrate?.(clean);
        }
      } catch {}
    })();
    return () => { aborted = true; };
  }, [characterId, onHydrate]);

  // Periodic persist
  useEffect(() => {
    if (!characterId) return;
    const tick = () => {
      if (skipWhile?.() || persistInFlight.current) return;
      const clean = normalize(getInventory());
      const payload = JSON.stringify(clean);
      if (payload === lastPersistPayload.current) return;
      persistInFlight.current = true;
      fetch("/api/account/characters/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, items: clean })
      })
        .then((res) => {
          if (res.ok) lastPersistPayload.current = payload;
        })
        .catch(() => {})
        .finally(() => { persistInFlight.current = false; });
    };
    const t = setInterval(tick, persistEveryMs);
    return () => clearInterval(t);
  }, [characterId, getInventory, persistEveryMs, skipWhile]);

  // Periodic reconcile from server
  useEffect(() => {
    if (!characterId) return;
    if (!onHydrate) return;
    const tick = () => {
      if (skipWhile?.()) return;
      fetch(`/api/account/characters/inventory?characterId=${characterId}`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!data) return;
          const items = (data.items as Record<string, number>) || {};
          const clean = normalize(items);
          const payload = JSON.stringify(clean);
          if (payload === lastHydratedPayload.current) return;
          lastHydratedPayload.current = payload;
          lastPersistPayload.current = payload;
          onHydrate(clean);
        })
        .catch(() => {});
    };
    const r = setInterval(tick, reconcileEveryMs);
    return () => clearInterval(r);
  }, [characterId, onHydrate, reconcileEveryMs, skipWhile]);
}
