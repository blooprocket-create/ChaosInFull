// Centralized API helpers used by scenes and hooks

export type BasicAttackResult = {
  result?: { hit?: boolean; mobId?: string };
  rewards?: Array<{ exp?: number }>;
  loot?: Array<{ itemId: string; qty: number }>;
  // New fields returned by server for HUD updates without extra fetches
  level?: number;
  exp?: number;
  gold?: number;
};

export const api = {
  // Account/state
  saveScene(characterId: string, scene: "Town" | "Cave" | "Slime") {
    return fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, scene }) });
  },
  getInventory(characterId: string) {
    return fetch(`/api/account/characters/inventory?characterId=${encodeURIComponent(characterId)}`).then(r => r.ok ? r.json() : Promise.reject());
  },
  setInventory(characterId: string, items: Record<string, number>) {
    return fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, items }) });
  },
  addExp(characterId: string, payload: Partial<{ miningExp: number; craftingExp: number }>) {
    return fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, ...payload }) });
  },

  // Quests
  fetchQuests(characterId: string) {
    return fetch(`/api/quest?characterId=${encodeURIComponent(characterId)}`).then(r => r.ok ? r.json() : Promise.reject());
  },
  questAccept(characterId: string) {
    return fetch("/api/quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", characterId }) });
  },
  questProgress(characterId: string, questId: string, progressDelta: number) {
    return fetch("/api/quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", characterId, questId, progressDelta }) });
  },
  questComplete(characterId: string, questId: string) {
    return fetch("/api/quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", characterId, questId }) });
  },

  // Combat
  combatJoin(zone: "Slime", characterId: string) {
    return fetch("/api/combat/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId }) });
  },
  combatLeave(zone: "Slime", characterId: string) {
    return fetch("/api/combat/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId }) });
  },
  combatSnapshot(zone: "Slime", characterId: string) {
    return fetch(`/api/combat/snapshot?zone=${zone}&characterId=${encodeURIComponent(characterId)}`).then(r => r.ok ? r.json() : Promise.reject());
  },
  combatCmd(zone: "Slime", characterId: string, action: string, value?: unknown) {
    return fetch("/api/combat/cmd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId, action, value }) });
  },
  async basicAttack(zone: "Slime", characterId: string, x: number): Promise<BasicAttackResult> {
    const r = await api.combatCmd(zone, characterId, "basic", { x });
    if (!r.ok) return {} as BasicAttackResult;
    return (await r.json().catch(() => ({}))) as BasicAttackResult;
  },
  async toggleAuto(zone: "Slime", characterId: string, value: boolean) {
    return api.combatCmd(zone, characterId, "auto", value);
  },
};

export default api;
