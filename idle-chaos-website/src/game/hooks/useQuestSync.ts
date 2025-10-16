import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export type Quest = {
  id: string;
  title: string;
  status: "available" | "active" | "completed";
  description?: string;
};

type UseQuestSyncArgs = { characterId?: string };

export function useQuestSync({ characterId }: UseQuestSyncArgs) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!characterId) return;
    setLoading(true); setError(null);
    try {
      const data = await api.fetchQuests(characterId);
      if (Array.isArray(data)) setQuests(data as Quest[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => { refresh(); }, [refresh]);

  const accept = useCallback(async () => {
    if (!characterId) return false;
    const res = await api.questAccept(characterId);
    await refresh();
    return !!res;
  }, [characterId, refresh]);

  const complete = useCallback(async (questId: string) => {
    if (!characterId) return false;
    const res = await api.questComplete(characterId, questId);
    await refresh();
    return !!res;
  }, [characterId, refresh]);

  return { quests, loading, error, refresh, accept, complete } as const;
}

export default useQuestSync;
