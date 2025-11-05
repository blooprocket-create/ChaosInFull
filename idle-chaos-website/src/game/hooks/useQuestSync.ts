// Legacy hook removed. This stub remains only to keep TypeScript from failing when including all files under src.
// Do not import this file. It will throw if executed.
export type Quest = { id: string; title: string; status: "available" | "active" | "completed"; description?: string };
export type UseQuestSyncArgs = { characterId?: string };

export function useQuestSync(): never {
  throw new Error("useQuestSync is deprecated and has been removed. Use in-game quest UI instead.");
}

export default useQuestSync;
