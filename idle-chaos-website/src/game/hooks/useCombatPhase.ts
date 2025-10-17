import { useEffect, useMemo, useRef, useState } from "react";
import api, { BasicAttackResult } from "../services/api";

export type Mob = { id: string; hp: number; maxHp: number; level: number; pos: { x: number; y: number } };
export type CombatSnapshot = { snapshot?: { mobs?: Mob[] } };

type UseCombatPhaseArgs = {
  zone: "Slime";
  characterId?: string;
  pollMs?: number;
};

export function useCombatPhase({ zone, characterId, pollMs = 300 }: UseCombatPhaseArgs) {
  const [joined, setJoined] = useState(false);
  const [mobs, setMobs] = useState<Mob[]>([]);
  const [auto, setAuto] = useState(false);
  const polling = useRef<number | null>(null);

  // join/leave lifecycle
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!characterId) return;
      try {
        const res = await api.combatJoin(zone, characterId);
        if (!cancel && res.ok) setJoined(true);
      } catch {}
    })();
    return () => {
      cancel = true;
      if (characterId) api.combatLeave(zone, characterId).catch(() => {});
    };
  }, [zone, characterId]);

  // polling
  useEffect(() => {
    if (!joined || !characterId) return;
    let cancelled = false;
    let currentDelay = pollMs;
    const maxDelay = 5000;

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = (await api.combatSnapshot(zone, characterId)) as CombatSnapshot;
        setMobs(Array.isArray(data?.snapshot?.mobs) ? (data!.snapshot!.mobs as Mob[]) : []);
        currentDelay = pollMs;
      } catch {
        currentDelay = Math.min(currentDelay * 1.5, maxDelay);
      } finally {
        if (!cancelled) polling.current = window.setTimeout(poll, currentDelay);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (polling.current) { window.clearTimeout(polling.current); polling.current = null; }
    };
  }, [joined, characterId, zone, pollMs]);

  const actions = useMemo(() => ({
    async basicAttack(x: number): Promise<BasicAttackResult> {
      if (!characterId) return {};
      try { return await api.basicAttack(zone, characterId, x); } catch { return {}; }
    },
    async toggleAuto(): Promise<void> {
      if (!characterId) return; const v = !auto; setAuto(v); await api.toggleAuto(zone, characterId, v).catch(()=>{});
    }
  }), [zone, characterId, auto]);

  return { joined, mobs, auto, setAuto, actions } as const;
}

export default useCombatPhase;
