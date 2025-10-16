import { useEffect } from "react";

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

  // Hydrate once on mount
  useEffect(() => {
    if (!characterId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/account/characters/inventory?characterId=${characterId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!aborted) onHydrate?.((data?.items as Record<string, number>) || {});
      } catch {}
    })();
    return () => { aborted = true; };
  }, [characterId, onHydrate]);

  // Periodic persist
  useEffect(() => {
    if (!characterId) return;
    const t = setInterval(() => {
      if (skipWhile?.()) return;
      const inv = getInventory() || {};
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, items: inv }) }).catch(() => {});
    }, persistEveryMs);
    return () => clearInterval(t);
  }, [characterId, getInventory, persistEveryMs, skipWhile]);

  // Periodic reconcile from server
  useEffect(() => {
    if (!characterId) return;
    const r = setInterval(() => {
      if (skipWhile?.()) return;
      fetch(`/api/account/characters/inventory?characterId=${characterId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) onHydrate?.((data.items as Record<string, number>) || {}); })
        .catch(() => {});
    }, reconcileEveryMs);
    return () => clearInterval(r);
  }, [characterId, onHydrate, reconcileEveryMs, skipWhile]);
}
