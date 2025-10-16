"use client";
import { useEffect, useState, useCallback } from "react";

// Module-scoped cache for last quest dirty value (avoids using any on component)
let lastQuestDirty: number | undefined;

export default function QuestPanel({ characterId }: { characterId: string }) {
  type QuestRow = { questId: string; status: "AVAILABLE" | "ACTIVE" | "COMPLETED"; progress: number; claimedRewards?: boolean; quest?: { id: string; name: string; description: string; objectiveCount: number } };
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(false);

  type GetQuestsResponse = { ok: boolean; characterQuests: QuestRow[]; tutorialAvailable?: boolean; craftAvailable?: boolean };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quest?characterId=${characterId}`, { cache: "no-store" });
      const data: GetQuestsResponse = await res.json().catch(() => ({ ok: true, characterQuests: [] } as GetQuestsResponse));
      const rows: QuestRow[] = Array.isArray(data.characterQuests) ? data.characterQuests : [];
      // Hide quests already handed-in (claimedRewards)
      setQuests(rows.filter(q => !q.claimedRewards));
    } finally {
      setLoading(false);
    }
  }, [characterId]);
  useEffect(() => { load(); }, [characterId, load]);
  // Listen to a global registry bump (Phaser side) via a polling event to auto-refresh
  useEffect(() => {
    let t: number | null = null;
    const poll = () => {
      try {
        const reg = window.__phaserRegistry;
        const v = (reg?.get?.("questDirtyCount") as number | undefined) ?? 0;
        if (lastQuestDirty !== v) {
          lastQuestDirty = v;
          load();
        }
      } catch {}
      t = window.setTimeout(poll, 1000);
    };
    t = window.setTimeout(poll, 1000);
    return () => { if (t) window.clearTimeout(t); };
  }, [load]);

  const abandon = async (qid: string) => {
    await fetch("/api/quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "abandon", characterId, questId: qid }) });
    await load();
  };
  // No direct hand-in from panel; hand-in is via Grimsley in town.

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/60 p-4 text-gray-200">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Quests</h3>
        <button className="btn px-2 py-0.5 text-xs" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      {quests.length === 0 ? (
        <div className="text-sm text-gray-400">No quests yet. Talk to Grimsley in town.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {quests.map((q) => (
            <div key={q.questId} className="rounded border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/90 font-medium text-sm">{q.quest?.name || q.questId}</div>
                  <div className="text-xs text-gray-300">{q.quest?.description}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">{q.status}</span>
              </div>
              {typeof q.progress === "number" && typeof q.quest?.objectiveCount === "number" && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
                    <span>Progress</span>
                    <span>{q.progress} / {q.quest.objectiveCount}</span>
                  </div>
                  <div className="h-2 w-full rounded bg-white/10">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, (q.progress / Math.max(1, q.quest.objectiveCount)) * 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {q.status === "ACTIVE" && (
                  <button className="btn px-2 py-1 text-xs" onClick={() => abandon(q.questId)}>Abandon</button>
                )}
                {q.status === "COMPLETED" && (
                  <span className="text-[11px] text-gray-400">Visit Grimsley to hand in</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
