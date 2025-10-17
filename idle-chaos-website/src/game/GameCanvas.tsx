"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useInventorySync } from "@/src/game/hooks/useInventorySync";
import { items as shopItems } from "@/src/data/items";
import * as Phaser from "phaser";
import InventoryGrid from "@/src/game/ui/InventoryGrid";
import SplitStackModal from "@/src/game/ui/SplitStackModal";
import createGame, { CharacterHUD as CharacterHUDType } from "./createGame";

type CharacterHUD = CharacterHUDType;

export default function GameCanvas({ character, initialSeenWelcome, initialScene, offlineSince, initialExp, initialMiningExp, initialMiningLevel, readonly = false }: { character?: CharacterHUD; initialSeenWelcome?: boolean; initialScene?: string; offlineSince?: string; initialExp?: number; initialMiningExp?: number; initialMiningLevel?: number; readonly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean>(!!initialSeenWelcome);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [openInventory, setOpenInventory] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopQty, setShopQty] = useState(1);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [activeSceneKey, setActiveSceneKey] = useState<string>("TownScene");
  const [showStats, setShowStats] = useState(false);
  const [showFurnace, setShowFurnace] = useState(false);
  const [furnaceQueue, setFurnaceQueue] = useState<{ recipe: "copper" | "bronze"; eta: number; startedAt: number; remaining: number; per: number; total: number } | null>(null);
  const furnaceRef = useRef<typeof furnaceQueue>(null);
  const furnaceTimerRef = useRef<number | null>(null);
  useEffect(() => { furnaceRef.current = furnaceQueue; }, [furnaceQueue]);
  // Workbench state
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [workQueue, setWorkQueue] = useState<{ recipe: "armor" | "dagger"; eta: number; startedAt: number; remaining: number; per: number; total: number } | null>(null);
  const workRef = useRef<typeof workQueue>(null);
  const workTimerRef = useRef<number | null>(null);
  useEffect(() => { workRef.current = workQueue; }, [workQueue]);
  // Sawmill state
  const [showSawmill, setShowSawmill] = useState(false);
  const [sawQueue, setSawQueue] = useState<{ recipe: "plank" | "oak_plank"; eta: number; startedAt: number; remaining: number; per: number; total: number } | null>(null);
  const sawRef = useRef<typeof sawQueue>(null);
  const sawTimerRef = useRef<number | null>(null);
  useEffect(() => { sawRef.current = sawQueue; }, [sawQueue]);
  type SkillsView = { mining: { level: number; exp: number }; woodcutting: { level: number; exp: number }; fishing: { level: number; exp: number }; crafting: { level: number; exp: number } };
  type BaseView = { level: number; class: string; exp: number; gold: number; premiumGold?: number; hp: number; mp: number; strength: number; agility: number; intellect: number; luck: number };
  const [statsData, setStatsData] = useState<{ base: BaseView | null; skills: SkillsView } | null>(null);
  // EXP and level state (client HUD) with dynamic thresholds matching server
  const reqChar = useCallback((lvl: number) => Math.floor(100 * Math.pow(1.25, Math.max(0, lvl - 1))), []);
  const reqMine = useCallback((lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1))), []);
  const reqCraft = useCallback((lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1))), []);
  const [charLevel, setCharLevel] = useState<number>(character?.level ?? 1);
  const [charExp, setCharExp] = useState<number>(initialExp ?? 0);
  const [charMax, setCharMax] = useState<number>(reqChar(character?.level ?? 1));
  const [miningExpState, setMiningExpState] = useState<number>(initialMiningExp ?? 0);
  const [miningMax, setMiningMax] = useState<number>(reqMine(initialMiningLevel ?? 1));
  const [craftingExpState, setCraftingExpState] = useState<number>(0);
  const [craftingMax, setCraftingMax] = useState<number>(reqCraft(1));
  const [expHud, setExpHud] = useState<{ label: string; value: number; max: number }>({ label: "Character EXP", value: initialExp ?? 0, max: reqChar(character?.level ?? 1) });
  // AFK combat modal
  const [afkCombatModal, setAfkCombatModal] = useState<{ open: boolean; zone: string; kills: number; exp: number; gold: number; loot: Array<{ itemId: string; qty: number }> } | null>(null);
  // Simple character vitals and auto status (client HUD only for now)
  const [hp, setHp] = useState<number>(100);
  const [mp, setMp] = useState<number>(50);
  const [autoOn, setAutoOn] = useState<boolean>(false);
  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // Storage UI state
  const [showStorage, setShowStorage] = useState(false);
  const [accountStorage, setAccountStorage] = useState<Record<string, number>>({});
  const [dragItem, setDragItem] = useState<{ from: "inv" | "storage"; key: string } | null>(null);
  const [splitModal, setSplitModal] = useState<{ open: boolean; key: string; max: number; target: "storage" | "shop" | "inv" } | null>(null);
  const typingRef = useRef<boolean>(false);
  // Currency
  const [gold, setGold] = useState<number>(0);
  const [showQuests, setShowQuests] = useState(false);
  const [quests, setQuests] = useState<Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }>>([]);
  const [premiumGold, setPremiumGold] = useState<number>(0);
  // Inventory sort/filter (view-only)
  const [invSort, setInvSort] = useState<"name" | "qty">("name");
  const [invFilter, setInvFilter] = useState<"all" | "materials" | "weapons" | "misc">("all");
  const orderedKeys = useMemo(() => {
    const keys = Object.keys(inventory);
    const catOf = (k: string): "materials" | "weapons" | "misc" => {
      const s = k.toLowerCase();
      if (s.includes("armor") || s.includes("dagger") || s.includes("sword") || s.includes("bow")) return "weapons";
      if (s.includes("copper") || s.includes("tin") || s.includes("bronze") || s.includes("log") || s.includes("plank") || s.includes("bar")) return "materials";
      return "misc";
    };
    const filtered = invFilter === "all" ? keys : keys.filter((k) => catOf(k) === invFilter);
    const sorted = [...filtered].sort((a, b) => invSort === "qty" ? ((inventory[b] ?? 0) - (inventory[a] ?? 0)) : a.localeCompare(b));
    return sorted;
  }, [inventory, invSort, invFilter]);

  useEffect(() => {
    if (!ref.current) return;
  const start: "Town" | "Cave" | "Slime" | "Slime Meadow" = (initialScene === "Town" || initialScene === "Cave" || initialScene === "Slime" || initialScene === "Slime Meadow") ? (initialScene as "Town" | "Cave" | "Slime" | "Slime Meadow") : "Town";
  gameRef.current = createGame({ parent: ref.current, character, initialScene: start, initialMiningLevel: initialMiningLevel ?? 1 });

    // Load initial inventory from server
    if (character) {
      fetch(`/api/account/characters/inventory?characterId=${character.id}`)
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          const items = (data?.items as Record<string, number>) || {};
          // Set from DB; treat DB as source of truth
          gameRef.current?.registry.set("inventory", items);
        })
        .catch(() => {});
    }

    // Prevent page scroll on Space when game is focused
    const el = ref.current;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    };
    const onWindowKeydown = (e: KeyboardEvent) => {
      if (typingRef.current) return;
      if (e.code === "Space") {
        e.preventDefault();
      }
      if (e.key === "i" || e.key === "I") {
        // don't toggle when typing in inputs
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          setOpenInventory((v) => !v);
        }
      }
    };
    el.addEventListener("keydown", onKeydown);
    window.addEventListener("keydown", onWindowKeydown, { passive: false });
    el.tabIndex = 0; // make container focusable
    el.focus({ preventScroll: true });

    const onResize = () => {
      if (!gameRef.current) return;
      const w = ref.current!.clientWidth;
      const h = Math.max(360, Math.floor(w * 9/16));
      gameRef.current.scale.resize(w, h);
    };
    window.addEventListener("resize", onResize);
    // Capture internal link clicks to persist scene and inventory before navigation
    const onDocClick = (e: MouseEvent) => {
      if (!character) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = (anchor as HTMLAnchorElement).getAttribute("href");
      if (!href || href.startsWith("#")) return;
      // Ignore new tab or modified clicks
      if ((anchor as HTMLAnchorElement).target || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      // Only handle same-origin internal routes
      if (!href.startsWith("/")) return;
    const game = gameRef.current; if (!game) return;
  const regScene = (game.registry.get("currentScene") as string | undefined) ?? "";
  const low = regScene.toLowerCase();
  const normalized = low === "slime" ? "Slime" : low === "slime meadow" ? "Slime Meadow" : low === "cave" ? "Cave" : low === "town" ? "Town" : null;
    const scenes = game.scene.getScenes(true);
    // Fallback mapping from scene keys to canonical names
    const fallbackKey = scenes.length ? scenes[0].scene.key : "TownScene";
    const fallbackName: "Town" | "Cave" | "Slime" | "Slime Meadow" =
      fallbackKey === "SlimeMeadowScene" ? "Slime Meadow" :
      fallbackKey === "SlimeScene" ? "Slime" :
      fallbackKey === "CaveScene" ? "Cave" : "Town";
    const active: "Town" | "Cave" | "Slime" | "Slime Meadow" = normalized ?? fallbackName;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if ("sendBeacon" in navigator) {
        navigator.sendBeacon("/api/account/characters/state", new Blob([JSON.stringify({ characterId: character.id, scene: active })], { type: "application/json" }));
        navigator.sendBeacon("/api/account/characters/inventory", new Blob([JSON.stringify({ characterId: character.id, items: inv })], { type: "application/json" }));
      } else {
        // Best-effort fallback without blocking navigation
        fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) }).catch(() => {});
        {
          const clean: Record<string, number> = {}; for (const [k,v] of Object.entries(inv)) if ((v ?? 0) > 0) clean[k] = v;
          fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: clean }) }).catch(() => {});
        }
      }
    };
    document.addEventListener("click", onDocClick, true);
    // Hydrate currency immediately
    (async () => {
      try {
        if (!character) return;
        const res = await fetch(`/api/account/stats?characterId=${character.id}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.base?.gold === "number") setGold(data.base.gold);
          if (typeof data?.base?.premiumGold === "number") setPremiumGold(data.base.premiumGold);
        }
      } catch {}
    })();
    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("keydown", onKeydown);
      window.removeEventListener("keydown", onWindowKeydown as EventListener);
      document.removeEventListener("click", onDocClick, true);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [initialScene, character, initialMiningLevel]);

  // On return to an AFK combat zone, query applied AFK rewards and show a modal
  useEffect(() => {
    if (!character) return;
    const scene = (initialScene || "Town").toLowerCase();
    const isAfkZone = scene === "slime" || scene === "slime meadow";
    if (!isAfkZone) return;
    (async () => {
      try {
        const res = await fetch("/api/account/characters/afk-combat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id }) });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.ok && typeof data.kills === 'number' && data.kills > 0) {
          // Apply HUD updates for gold and inventory (server has already applied)
          if (typeof data.gold === 'number' && data.gold > 0) setGold((g)=>g + data.gold);
          if (Array.isArray(data.loot) && data.loot.length) {
            const inv = (gameRef.current?.registry.get('inventory') as Record<string, number>) || {};
            for (const it of data.loot as Array<{ itemId: string; qty: number }>) {
              inv[it.itemId] = (inv[it.itemId] ?? 0) + Math.max(1, Number(it.qty||0));
            }
            gameRef.current?.registry.set('inventory', inv);
            setInventory({ ...inv });
          }
          // Apply immediate EXP + level HUD update if provided
          if (typeof data.newLevel === 'number' && typeof data.newExp === 'number') {
            window.__applyExpUpdate?.({ type: 'character', level: data.newLevel, exp: data.newExp });
          }
          // EXP is applied on server; optionally refresh from stats or rely on next action to sync
          setAfkCombatModal({ open: true, zone: data.zone || (initialScene || 'Slime'), kills: data.kills, exp: data.exp ?? 0, gold: data.gold ?? 0, loot: Array.isArray(data.loot) ? data.loot : [] });
        }
      } catch {}
    })();
  }, [character, initialScene]);

  // Save immediately on unmount as a fallback for client-side navigation
  useEffect(() => {
    return () => {
    const game = gameRef.current; if (!game || !character) return;
  const regScene = (game.registry.get("currentScene") as string | undefined) ?? "";
  const low = regScene.toLowerCase();
  const normalized = low === "slime" ? "Slime" : low === "slime meadow" ? "Slime Meadow" : low === "cave" ? "Cave" : low === "town" ? "Town" : null;
    const scenes = game.scene.getScenes(true);
    const fallbackKey = scenes.length ? scenes[0].scene.key : "TownScene";
    const fallbackName: "Town" | "Cave" | "Slime" | "Slime Meadow" =
      fallbackKey === "SlimeMeadowScene" ? "Slime Meadow" :
      fallbackKey === "SlimeScene" ? "Slime" :
      fallbackKey === "CaveScene" ? "Cave" : "Town";
    const active: "Town" | "Cave" | "Slime" | "Slime Meadow" = normalized ?? fallbackName;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      // Fire-and-forget; navigation is in progress
      fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) }).catch(() => {});
      {
        const clean: Record<string, number> = {}; for (const [k,v] of Object.entries(inv)) if ((v ?? 0) > 0) clean[k] = v;
        fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: clean }) }).catch(() => {});
      }
    };
  }, [character]);

  // Minimal integration of reusable inventory sync
  useInventorySync({
    characterId: character?.id,
    getInventory: () => (gameRef.current?.registry.get("inventory") as Record<string, number> | undefined),
    onHydrate: (items) => {
      const g = gameRef.current; if (!g) return;
      g.registry.set("inventory", items);
      setInventory({ ...items });
    },
    skipWhile: () => !!(furnaceRef.current || workRef.current || sawRef.current),
  });

  // Expose helpers to scenes via window is set up after saveSceneNow definition below

  // Persist scene on page hide/unload
  useEffect(() => {
    const save = async () => {
      const game = gameRef.current; if (!game || !character) return;
    // Determine scene (prefer registry currentScene over Phaser's first active scene)
  const regScene = (game.registry.get("currentScene") as string | undefined) ?? "";
  const low = regScene.toLowerCase();
  const normalized = low === "slime" ? "Slime" : low === "slime meadow" ? "Slime Meadow" : low === "cave" ? "Cave" : low === "town" ? "Town" : null;
    const scenes = game.scene.getScenes(true);
    const fallbackKey = scenes.length ? scenes[0].scene.key : "TownScene";
    const fallbackName: "Town" | "Cave" | "Slime" | "Slime Meadow" =
      fallbackKey === "SlimeMeadowScene" ? "Slime Meadow" :
      fallbackKey === "SlimeScene" ? "Slime" :
      fallbackKey === "CaveScene" ? "Cave" : "Town";
    const active: "Town" | "Cave" | "Slime" | "Slime Meadow" = normalized ?? fallbackName;
      try {
        const statePayload = JSON.stringify({ characterId: character.id, scene: active });
        const inv = (game.registry.get("inventory") as Record<string, number>) || {};
        const invPayload = JSON.stringify({ characterId: character.id, items: inv });
        // Prefer sendBeacon for reliability on unload
        const sent1 = ("sendBeacon" in navigator) && navigator.sendBeacon("/api/account/characters/state", new Blob([statePayload], { type: "application/json" }));
        const sent2 = ("sendBeacon" in navigator) && navigator.sendBeacon("/api/account/characters/inventory", new Blob([invPayload], { type: "application/json" }));
        if (!sent1) {
          const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: statePayload };
          // keepalive is supported in browsers for unload; TS lib may not include it in RequestInit in some targets
          (init as unknown as { keepalive?: boolean }).keepalive = true;
          await fetch("/api/account/characters/state", init);
        }
        if (!sent2) {
          const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: invPayload };
          (init as unknown as { keepalive?: boolean }).keepalive = true;
          await fetch("/api/account/characters/inventory", init);
        }
      } catch {}
    };
    const onHide = () => { save(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [character]);

  // Offline gains modal state
  const [offlineModal, setOfflineModal] = useState<{ open: boolean; copper: number; tin: number } | null>(null);
  useEffect(() => {
    if (!offlineSince) return;
    if ((initialScene || "Town").toLowerCase() !== "cave") return;
    const since = new Date(offlineSince).getTime();
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - since) / 1000));
    const copper = Math.floor(seconds / 2.5);
    const tin = Math.floor(seconds / 3.5);
    if (copper > 0 || tin > 0) {
      setOfflineModal({ open: true, copper, tin });
    }
  }, [offlineSince, initialScene]);

  // Poll inventory from Phaser registry into React UI
  useEffect(() => {
    const t = setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      setInventory({ ...inv });
      // Pull lightweight vitals and auto flag from registry until server stats wire-up
      const auto = !!game.registry.get("autoOn");
      setAutoOn(auto);
      // Placeholder vitals: keep static for now unless wired to combat snapshot
      setHp((v) => v);
      setMp((v) => v);
      // Update HUD based on active scene
      const scenes = game.scene.getScenes(true);
      const active = scenes.length ? scenes[0].scene.key : "TownScene";
      if (active !== activeSceneKey) {
        setActiveSceneKey(active);
        // Emit scene change event for listeners (e.g., ChatClient)
        const canonical: "Town" | "Cave" | "Slime" | "Slime Meadow" =
          active === "SlimeMeadowScene" ? "Slime Meadow" :
          active === "SlimeFieldScene" || active === "SlimeScene" ? "Slime" :
          active === "CaveScene" ? "Cave" : "Town";
        const evt = new CustomEvent("game:scene-changed", { detail: { scene: canonical } });
        window.dispatchEvent(evt);
      }
      if (showFurnace || showWorkbench || showSawmill) {
        setExpHud({ label: "Crafting EXP", value: craftingExpState, max: craftingMax });
      } else if (active === "CaveScene") {
        setExpHud({ label: "Mining EXP", value: miningExpState, max: miningMax });
      } else {
        setExpHud({ label: "Character EXP", value: charExp, max: charMax });
      }
    }, 800);
    // Periodically reconcile with DB as source of truth when no queues running
    const r = setInterval(() => {
      if (!character) return;
  if (furnaceRef.current || workRef.current || sawRef.current) return; // don't override while crafting
      fetch(`/api/account/characters/inventory?characterId=${character.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const items = (data.items as Record<string, number>) || {};
          const g = gameRef.current; if (!g) return;
          g.registry.set("inventory", items);
          setInventory({ ...items });
        })
        .catch(() => {});
    }, 15000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [charExp, charMax, miningExpState, miningMax, showFurnace, showWorkbench, showSawmill, craftingExpState, craftingMax, character, activeSceneKey]);

  // Periodically persist inventory while playing
  useEffect(() => {
    if (!character) return;
    const t = setInterval(() => {
      const game = gameRef.current; if (!game) return;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    }, 7000);
    return () => clearInterval(t);
  }, [character]);

  // Load storage when opened
  useEffect(() => {
    if (!showStorage) return;
    (async () => {
      try {
        const res = await fetch("/api/account/storage");
        if (res.ok) {
          const data = await res.json();
          setAccountStorage((data?.items as Record<string, number>) || {});
        }
      } catch {}
    })();
  }, [showStorage]);

  const moveItem = async (from: "inv" | "storage", key: string, count?: number) => {
    if (!character) return;
    try {
      const direction = from === "inv" ? "toStorage" : "toInventory";
      const res = await fetch("/api/account/storage/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id, direction, itemKey: key, count })
      });
      if (!res.ok) return;
      const data = await res.json();
      const game = gameRef.current; if (game) {
        game.registry.set("inventory", data.inventory || {});
      }
      setInventory(data.inventory || {});
      setAccountStorage(data.storage || {});
    } catch {}
  };

  // UI overlays: Welcome modal + HUD buttons
  const markWelcomeSeen = async () => {
    if (!character) return;
    setWelcomeError(null);
    try {
      const res = await fetch("/api/account/characters/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id }),
      });
      if (!res.ok) throw new Error("Request failed");
      setWelcomeSeen(true);
    } catch {
      setWelcomeError("Could not save your acknowledgement. Please try again.");
    }
  };

  // Helper: immediate save of current scene to server
  const saveSceneNow = useCallback(async (sceneOverride?: "Town" | "Cave" | "Slime" | "Slime Meadow") => {
    const game = gameRef.current; if (!game || !character) return;
    const regScene = (game.registry.get("currentScene") as string | undefined) ?? "";
    const low = regScene.toLowerCase();
    const normalized = low === "slime" ? "Slime" : low === "slime meadow" ? "Slime Meadow" : low === "cave" ? "Cave" : low === "town" ? "Town" : null;
    const scenes = game.scene.getScenes(true);
    const fallbackKey = scenes.length ? scenes[0].scene.key : "TownScene";
    const fallbackName: "Town" | "Cave" | "Slime" | "Slime Meadow" =
      fallbackKey === "SlimeMeadowScene" ? "Slime Meadow" :
      fallbackKey === "SlimeScene" ? "Slime" :
      fallbackKey === "CaveScene" ? "Cave" : "Town";
    const active: "Town" | "Cave" | "Slime" | "Slime Meadow" = (sceneOverride ?? normalized) ?? fallbackName;
    try {
      await fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) });
    } catch {}
  }, [character]);

  // Expose helpers to scenes via window
  useEffect(() => {
    window.__saveSceneNow = saveSceneNow;
    window.__applyExpUpdate = ({ type, exp, level }) => {
      if (type === "mining") {
        setMiningExpState(exp);
        setMiningMax(reqMine(level));
        const game = gameRef.current; if (game) game.registry.set("miningLevel", level);
      } else if (type === "crafting") {
        const prevLevel = (gameRef.current?.registry.get("craftingLevel") as number) ?? 1;
        setCraftingExpState(exp);
        setCraftingMax(reqCraft(level));
        const game = gameRef.current; if (game) game.registry.set("craftingLevel", level);
        if (level > prevLevel) pushToast(`Crafting Level Up! Lv ${prevLevel} → ${level}`);
      } else {
        const prev = charLevel;
        setCharExp(exp);
        setCharLevel(level);
        setCharMax(reqChar(level));
        if (level > prev) pushToast(`Level Up! Lv ${prev} → ${level}`);
      }
    };
  window.__openFurnace = () => { if (!welcomeSeen) { pushToast("Grimsley: Come see me in Town before using the furnace."); return; } setShowFurnace(true); };
  window.__openWorkbench = () => { if (!welcomeSeen) { pushToast("Grimsley: Let's talk first—I'll teach you the workbench."); return; } setShowWorkbench(true); };
  window.__openStorage = () => { if (!welcomeSeen) { pushToast("Grimsley: Storage unlocks after our quick chat in Town."); return; } setShowStorage(true); };
  window.__openSawmill = () => { if (!welcomeSeen) { pushToast("Grimsley: Finish the intro in Town to use the sawmill."); return; } setShowSawmill(true); };
  window.__openShop = () => { if (!welcomeSeen) { pushToast("Grimsley: Do the quick intro first; the shopkeeper is shy."); return; } setShowShop(true); };
  window.__focusGame = () => {
    const el = ref.current; if (!el) return;
    // Re-enable keyboard and focus container
    const game = gameRef.current;
    if (game) {
      const scenes = game.scene.getScenes(true);
      for (const s of scenes) if (s.input?.keyboard) s.input.keyboard.enabled = true;
    }
    el.focus({ preventScroll: true });
  };
  window.__setTyping = (v: boolean) => {
    typingRef.current = v;
    window.__isTyping = v;
    // Also disable Phaser keyboard when typing, re-enable when not typing
    const game = gameRef.current;
    if (game) {
      const scenes = game.scene.getScenes(true);
      for (const s of scenes) {
        if (s.input && s.input.keyboard) {
          s.input.keyboard.enabled = !v;
        }
      }
    }
  };
  window.__closeFurnace = () => setShowFurnace(false);
  window.__closeWorkbench = () => setShowWorkbench(false);
  window.__closeStorage = () => setShowStorage(false);
  window.__closeSawmill = () => setShowSawmill(false);
  window.__closeShop = () => setShowShop(false);
    return () => {
      delete window.__saveSceneNow;
      delete window.__applyExpUpdate;
      delete window.__openFurnace;
      delete window.__openWorkbench;
      delete window.__openStorage;
  delete window.__openSawmill;
  delete window.__openShop;
      delete window.__setTyping;
      delete window.__focusGame;
      delete window.__closeFurnace;
      delete window.__closeWorkbench;
      delete window.__closeStorage;
      delete window.__closeSawmill;
      delete window.__closeShop;
    };
  }, [saveSceneNow, reqChar, reqMine, reqCraft, pushToast, charLevel, welcomeSeen]);

  // Action: collect offline rewards
  const collectOffline = useCallback(async () => {
    if (!character || !offlineModal) return;
    const { copper, tin } = offlineModal;
    // Update registry inventory first for instant UI
    const game = gameRef.current;
    if (game) {
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (copper > 0) inv.copper = (inv.copper ?? 0) + copper;
      if (tin > 0) inv.tin = (inv.tin ?? 0) + tin;
      game.registry.set("inventory", inv);
    }
    try {
      // Persist inventory
      await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: (gameRef.current?.registry.get("inventory") as Record<string, number>) || {} }) });
      // Award mining EXP: 3 per ore
      const miningExpDelta = (copper + tin) * 3;
      if (miningExpDelta > 0) {
        const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, miningExp: miningExpDelta }) });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.miningExp === "number" && typeof data.miningLevel === "number") {
            window.__applyExpUpdate?.({ type: "mining", exp: data.miningExp, level: data.miningLevel });
          }
        }
      }
    } catch {}
    setOfflineModal(null);
  }, [character, offlineModal]);

  // Furnace helpers: schedule looped smelting and cancel
  const scheduleNext: () => Promise<void> = useCallback(async () => {
    if (!character) return;
    const q = furnaceRef.current;
    if (!q) return;
    // Clear any existing timer
    if (furnaceTimerRef.current) {
      window.clearTimeout(furnaceTimerRef.current);
      furnaceTimerRef.current = null;
    }
    // Reset progress start time and keep ref in sync
    setFurnaceQueue((curr) => {
      if (!curr) return curr;
      const next = { ...curr, startedAt: Date.now() };
      furnaceRef.current = next;
      return next;
    });
  const per = (furnaceRef.current?.per ?? 4000);
  furnaceTimerRef.current = window.setTimeout(async () => {
      const game = gameRef.current; if (!game) return;
      const currQ = furnaceRef.current; if (!currQ) return; // canceled
      const recipe = currQ.recipe;
      // Output item
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (recipe === "copper") inv.copper_bar = (inv.copper_bar ?? 0) + 1; else inv.bronze_bar = (inv.bronze_bar ?? 0) + 1;
      game.registry.set("inventory", inv);
      // Persist inventory and award EXP
  await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
  // Telemetry: first craft
  window.dispatchEvent(new CustomEvent("telemetry:event", { detail: { name: "craft_complete", props: { recipe } } }));
      const expPer = recipe === "copper" ? 2 : 3;
      const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.craftingExp === "number" && typeof data.craftingLevel === "number") {
          window.__applyExpUpdate?.({ type: "crafting", exp: data.craftingExp, level: data.craftingLevel });
        }
      }
      // Update remaining and schedule next if needed
      setFurnaceQueue((prev) => {
        if (!prev) { furnaceRef.current = null; return null; }
        const left = Math.max(0, prev.remaining - 1);
        if (left === 0) {
          furnaceRef.current = null;
          // Clear persisted furnace queue
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: null }) }).catch(() => {});
          return null;
        } else {
          const next = { ...prev, remaining: left, startedAt: Date.now() };
          furnaceRef.current = next;
          // Persist updated furnace queue
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: next }) }).catch(() => {});
          // Schedule next tick after state update completes
          setTimeout(() => scheduleNext(), 0);
          return next;
        }
      });
  }, per);
  }, [character]);

  const startSmelt = useCallback((recipe: "copper" | "bronze", count: number) => {
    if (!character || !gameRef.current) return;
    if (furnaceQueue) return; // already running
    const game = gameRef.current;
    // Gate bronze behind Crafting Lv 2
    const cLevel = (game.registry.get("craftingLevel") as number) ?? 1;
    if (recipe === "bronze" && cLevel < 2) return;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const needCopper = recipe === "copper" ? count : count; // 1 per
    const needTin = recipe === "bronze" ? count : 0;
    if ((inv.copper ?? 0) < needCopper || (inv.tin ?? 0) < needTin) return;
    // Deduct inputs up front
    inv.copper = (inv.copper ?? 0) - needCopper;
    if (needTin > 0) inv.tin = (inv.tin ?? 0) - needTin;
    game.registry.set("inventory", inv);
    fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    const perMs = recipe === "copper" ? 4000 : 6000;
  const q = { recipe, eta: perMs, startedAt: Date.now(), remaining: count, per: perMs, total: count } as const;
  furnaceRef.current = q as unknown as typeof furnaceQueue;
  setFurnaceQueue(q as unknown as typeof furnaceQueue);
  // Persist furnace queue start
  fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: q }) }).catch(() => {});
  // Start the scheduled loop now that ref/state are in sync
  scheduleNext();
  }, [character, furnaceQueue, scheduleNext]);

  const cancelSmelt = useCallback(() => {
    // Refund remaining inputs proportionally (only for items not yet processed)
    const q = furnaceRef.current; if (!q || !gameRef.current) { setFurnaceQueue(null); return; }
    if (furnaceTimerRef.current) { window.clearTimeout(furnaceTimerRef.current); furnaceTimerRef.current = null; }
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const remaining = Math.max(0, q.remaining ?? 0);
    if (remaining > 0) {
      // Each unit requires 1 copper (+1 tin if bronze)
      inv.copper = (inv.copper ?? 0) + remaining;
      if (q.recipe === "bronze") inv.tin = (inv.tin ?? 0) + remaining;
      game.registry.set("inventory", inv);
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (game.registry.get("characterId") as string), items: inv }) }).catch(() => {});
    }
    setFurnaceQueue(null);
    // Clear persisted furnace queue
    const cid = (gameRef.current?.registry.get("characterId") as string) || character?.id;
    if (cid) fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: cid, furnace: null }) }).catch(() => {});
  }, [character?.id]);

  // On mount: fetch queues, fast-forward elapsed completions, and resume
  useEffect(() => {
    const run = async () => {
      if (!character) return;
      try {
        const res = await fetch(`/api/account/characters/queue?characterId=${character.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const game = gameRef.current; if (!game) return;
        const inv = (game.registry.get("inventory") as Record<string, number>) || {};
        // Helper to process completions for a queue
        type FurnaceQ = { recipe: "copper" | "bronze"; eta: number; startedAt: number; remaining: number; per: number; total: number };
        type WorkbenchQ = { recipe: "armor" | "dagger"; eta: number; startedAt: number; remaining: number; per: number; total: number };
  const processQueue = async (q: FurnaceQ | WorkbenchQ | null, kind: "furnace" | "workbench") => {
          if (!q) return;
          const { recipe, startedAt, per, remaining, total } = q;
          const elapsed = Date.now() - (startedAt || Date.now());
          const done = Math.min(total, Math.floor(elapsed / Math.max(1, per)));
          const newRemaining = Math.max(0, remaining - done);
          // Award outputs and crafting EXP for done
          for (let i = 0; i < done; i++) {
            if (kind === "furnace") {
              if (recipe === "copper") inv.copper_bar = (inv.copper_bar ?? 0) + 1; else inv.bronze_bar = (inv.bronze_bar ?? 0) + 1;
              const expPer = recipe === "copper" ? 2 : 3;
              await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) }).catch(() => {});
              window.dispatchEvent(new CustomEvent("telemetry:event", { detail: { name: "craft_complete", props: { recipe } } }));
              pushToast(`Completed ${recipe === "copper" ? "Copper Bar" : "Bronze Bar"} while offline`);
            } else {
              if (recipe === "armor") inv.copper_armor = (inv.copper_armor ?? 0) + 1; else inv.copper_dagger = (inv.copper_dagger ?? 0) + 1;
              const expPer = recipe === "armor" ? 6 : 4;
              await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) }).catch(() => {});
              pushToast(`Completed ${recipe === "armor" ? "Copper Armor" : "Copper Dagger"} while offline`);
            }
          }
          // Persist inventory after fast-forward
          await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
          game.registry.set("inventory", inv);
          // Resume if there is time left
          if (newRemaining > 0) {
            const remainderMs = Math.max(0, per - (elapsed % per));
            if (kind === "furnace") {
              if (recipe !== "copper" && recipe !== "bronze") { await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: null }) }).catch(() => {}); return; }
              const newQ: FurnaceQ = { recipe, eta: per, startedAt: Date.now() - (per - remainderMs), remaining: newRemaining, per, total };
              furnaceRef.current = newQ; setFurnaceQueue(newQ);
              await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: newQ }) }).catch(() => {});
              if (furnaceTimerRef.current) { clearTimeout(furnaceTimerRef.current); furnaceTimerRef.current = null; }
              setFurnaceQueue((prev) => prev ? { ...prev, startedAt: Date.now() - (per - remainderMs) } : prev);
              scheduleNext();
            } else {
              if (recipe !== "armor" && recipe !== "dagger") { await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: null }) }).catch(() => {}); return; }
              const newQ: WorkbenchQ = { recipe, eta: per, startedAt: Date.now() - (per - remainderMs), remaining: newRemaining, per, total };
              workRef.current = newQ; setWorkQueue(newQ);
              await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: newQ }) }).catch(() => {});
              if (workTimerRef.current) { clearTimeout(workTimerRef.current); workTimerRef.current = null; }
              setWorkQueue((prev) => prev ? { ...prev, startedAt: Date.now() - (per - remainderMs) } : prev);
              scheduleWorkNextRef.current?.();
            }
          } else {
            // Clear persisted queue if finished
            await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, [kind]: null }) }).catch(() => {});
          }
        };
        // Sawmill handler
        type SawmillQ = { recipe: "plank" | "oak_plank"; eta: number; startedAt: number; remaining: number; per: number; total: number };
        const processSaw = async (q: SawmillQ | null) => {
          if (!q) return;
          const { recipe, startedAt, per, remaining, total } = q;
          const elapsed = Date.now() - (startedAt || Date.now());
          const done = Math.min(total, Math.floor(elapsed / Math.max(1, per)));
          const newRemaining = Math.max(0, remaining - done);
          for (let i = 0; i < done; i++) {
            if (recipe === "plank") inv.plank = (inv.plank ?? 0) + 1; else inv.oak_plank = (inv.oak_plank ?? 0) + 1;
            const expPer = recipe === "plank" ? 1 : 2;
            await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) }).catch(() => {});
            window.dispatchEvent(new CustomEvent("telemetry:event", { detail: { name: "craft_complete", props: { recipe } } }));
            pushToast(`Completed ${recipe === "plank" ? "Plank" : "Oak Plank"} while offline`);
          }
          await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
          game.registry.set("inventory", inv);
          if (newRemaining > 0) {
            const remainderMs = Math.max(0, per - (elapsed % per));
            if (recipe !== "plank" && recipe !== "oak_plank") { await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, sawmill: null }) }).catch(() => {}); return; }
            const newQ: SawmillQ = { recipe, eta: per, startedAt: Date.now() - (per - remainderMs), remaining: newRemaining, per, total };
            sawRef.current = newQ; setSawQueue(newQ);
            await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, sawmill: newQ }) }).catch(() => {});
            if (sawTimerRef.current) { clearTimeout(sawTimerRef.current); sawTimerRef.current = null; }
            setSawQueue((prev) => prev ? { ...prev, startedAt: Date.now() - (per - remainderMs) } : prev);
            scheduleSawNextRef.current?.();
          } else {
            await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, sawmill: null }) }).catch(() => {});
          }
        };
        await processQueue(data.furnace, "furnace");
        await processQueue(data.workbench, "workbench");
        await processSaw(data.sawmill);
      } catch {}
    };
    run();
  }, [character, pushToast, scheduleNext]);

  

  // Workbench helpers: schedule looped crafting and cancel
  const scheduleWorkNextRef = useRef<(() => Promise<void>) | null>(null);
  const scheduleWorkNext = useCallback(async () => {
    if (!character) return;
    const q = workRef.current; if (!q) return;
    if (workTimerRef.current) { window.clearTimeout(workTimerRef.current); workTimerRef.current = null; }
    // Reset start time for progress and keep ref sync
    setWorkQueue((curr) => {
      if (!curr) return curr;
      const next = { ...curr, startedAt: Date.now() };
      workRef.current = next;
      return next;
    });
    const per = (workRef.current?.per ?? 10000);
    workTimerRef.current = window.setTimeout(async () => {
      const game = gameRef.current; if (!game) return;
      const currQ = workRef.current; if (!currQ) return;
      // Produce output
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (currQ.recipe === "armor") inv.copper_armor = (inv.copper_armor ?? 0) + 1; else inv.copper_dagger = (inv.copper_dagger ?? 0) + 1;
      game.registry.set("inventory", inv);
      // Persist and award crafting EXP
      await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
      const expPer = currQ.recipe === "armor" ? 6 : 4;
      const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.craftingExp === "number" && typeof data.craftingLevel === "number") {
          window.__applyExpUpdate?.({ type: "crafting", exp: data.craftingExp, level: data.craftingLevel });
        }
      }
      // If dagger crafted, progress crafting quest
      if (currQ.recipe === "dagger") {
        await fetch('/api/quest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'progress', characterId: character.id, questId: 'tutorial_craft_copper_dagger', progressDelta: 1 }) }).catch(()=>{});
      }
      // Decrement and continue or clear
      setWorkQueue((prev) => {
        if (!prev) { workRef.current = null; return null; }
        const left = Math.max(0, prev.remaining - 1);
        if (left === 0) {
          workRef.current = null;
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: null }) }).catch(() => {});
          return null;
        } else {
          const next = { ...prev, remaining: left, startedAt: Date.now() };
          workRef.current = next;
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: next }) }).catch(() => {});
          setTimeout(() => scheduleWorkNextRef.current?.(), 0);
          return next;
        }
      });
    }, per);
  }, [character]);

  // Keep the ref pointing to the latest callback
  useEffect(() => { scheduleWorkNextRef.current = scheduleWorkNext; }, [scheduleWorkNext]);

  const startWork = useCallback((recipe: "armor" | "dagger", count: number) => {
    if (!character || !gameRef.current) return;
    if (workQueue) return;
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    if (recipe === "armor") {
      if ((inv.copper_bar ?? 0) < 3 * count) return;
      inv.copper_bar = (inv.copper_bar ?? 0) - (3 * count);
    } else {
      if ((inv.copper_bar ?? 0) < 1 * count || (inv.plank ?? 0) < 1 * count) return;
      inv.copper_bar = (inv.copper_bar ?? 0) - (1 * count);
      inv.plank = (inv.plank ?? 0) - (1 * count);
    }
    game.registry.set("inventory", inv);
    fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    const perMs = recipe === "armor" ? 10000 : 7000;
    const q = { recipe, eta: perMs, startedAt: Date.now(), remaining: count, per: perMs, total: count } as const;
    workRef.current = q as unknown as typeof workQueue;
    setWorkQueue(q as unknown as typeof workQueue);
    fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: q }) }).catch(() => {});
    scheduleWorkNext();
  }, [character, workQueue, scheduleWorkNext]);

  const cancelWork = useCallback(() => {
    const q = workRef.current; if (!q || !gameRef.current) { setWorkQueue(null); return; }
    if (workTimerRef.current) { window.clearTimeout(workTimerRef.current); workTimerRef.current = null; }
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const remaining = Math.max(0, q.remaining ?? 0);
    if (remaining > 0) {
      if (q.recipe === "armor") {
        inv.copper_bar = (inv.copper_bar ?? 0) + (3 * remaining);
      } else {
        inv.copper_bar = (inv.copper_bar ?? 0) + (1 * remaining);
        inv.plank = (inv.plank ?? 0) + (1 * remaining);
      }
      game.registry.set("inventory", inv);
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (game.registry.get("characterId") as string), items: inv }) }).catch(() => {});
    }
    setWorkQueue(null);
    const cid = (gameRef.current?.registry.get("characterId") as string) || character?.id;
    if (cid) fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: cid, workbench: null }) }).catch(() => {});
  }, [character?.id]);

  // Sawmill helpers: schedule looped cutting and cancel
  const scheduleSawNextRef = useRef<(() => Promise<void>) | null>(null);
  const scheduleSawNext = useCallback(async () => {
    if (!character) return;
    const q = sawRef.current; if (!q) return;
    if (sawTimerRef.current) { window.clearTimeout(sawTimerRef.current); sawTimerRef.current = null; }
    setSawQueue((curr) => {
      if (!curr) return curr;
      const next = { ...curr, startedAt: Date.now() };
      sawRef.current = next;
      return next;
    });
    const per = (sawRef.current?.per ?? 3000);
    sawTimerRef.current = window.setTimeout(async () => {
      const game = gameRef.current; if (!game) return;
      const currQ = sawRef.current; if (!currQ) return;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (currQ.recipe === "plank") inv.plank = (inv.plank ?? 0) + 1; else inv.oak_plank = (inv.oak_plank ?? 0) + 1;
      game.registry.set("inventory", inv);
      await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
      const expPer = currQ.recipe === "plank" ? 1 : 2;
      const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.craftingExp === "number" && typeof data.craftingLevel === "number") {
          window.__applyExpUpdate?.({ type: "crafting", exp: data.craftingExp, level: data.craftingLevel });
        }
      }
      setSawQueue((prev) => {
        if (!prev) { sawRef.current = null; return null; }
        const left = Math.max(0, prev.remaining - 1);
        if (left === 0) {
          sawRef.current = null;
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, sawmill: null }) }).catch(() => {});
          return null;
        } else {
          const next = { ...prev, remaining: left, startedAt: Date.now() };
          sawRef.current = next;
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, sawmill: next }) }).catch(() => {});
          setTimeout(() => scheduleSawNextRef.current?.(), 0);
          return next;
        }
      });
    }, per);
  }, [character]);

  useEffect(() => { scheduleSawNextRef.current = scheduleSawNext; }, [scheduleSawNext]);

  const startSaw = useCallback((recipe: "plank" | "oak_plank", count: number) => {
    if (!character || !gameRef.current) return;
    if (sawQueue) return;
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    if (recipe === "plank") {
      if ((inv.log ?? 0) < count) return;
      inv.log = (inv.log ?? 0) - count;
    } else {
      if ((inv.oak_log ?? 0) < count) return;
      inv.oak_log = (inv.oak_log ?? 0) - count;
    }
    game.registry.set("inventory", inv);
    fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    const perMs = recipe === "plank" ? 3000 : 5000;
    const q = { recipe, eta: perMs, startedAt: Date.now(), remaining: count, per: perMs, total: count } as const;
    sawRef.current = q as unknown as typeof sawQueue;
    setSawQueue(q as unknown as typeof sawQueue);
    fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, sawmill: q }) }).catch(() => {});
    scheduleSawNext();
  }, [character, sawQueue, scheduleSawNext]);

  const cancelSaw = useCallback(() => {
    const q = sawRef.current; if (!q || !gameRef.current) { setSawQueue(null); return; }
    if (sawTimerRef.current) { window.clearTimeout(sawTimerRef.current); sawTimerRef.current = null; }
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const remaining = Math.max(0, q.remaining ?? 0);
    if (remaining > 0) {
      if (q.recipe === "plank") inv.log = (inv.log ?? 0) + remaining; else inv.oak_log = (inv.oak_log ?? 0) + remaining;
      game.registry.set("inventory", inv);
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (game.registry.get("characterId") as string), items: inv }) }).catch(() => {});
    }
    setSawQueue(null);
    const cid = (gameRef.current?.registry.get("characterId") as string) || character?.id;
    if (cid) fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: cid, sawmill: null }) }).catch(() => {});
  }, [character?.id]);

  return (
    <div ref={ref} className="relative rounded-xl border border-white/10 overflow-hidden">
      {/* Toasts */}
      <div className="pointer-events-none absolute right-3 bottom-3 z-50 flex w-[min(320px,80vw)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-slide-up pointer-events-auto rounded-md border border-white/10 bg-black/80 px-3 py-2 text-xs text-gray-100 shadow-lg backdrop-blur">
            {t.text}
          </div>
        ))}
      </div>
      {character ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/40 px-3 py-2 text-xs text-gray-200 shadow-lg ring-1 ring-white/10">
          <div className="font-semibold text-white/90">{character.name}</div>
          <div className="opacity-80">
            {character.class} • Lv {charLevel}
            {(showFurnace || showWorkbench || showSawmill) ? (
              <> • Crafting Lv {gameRef.current?.registry.get("craftingLevel") ?? 1}</>
            ) : activeSceneKey === "CaveScene" ? (
              <> • Mining Lv {gameRef.current?.registry.get("miningLevel") ?? (initialMiningLevel ?? 1)}</>
            ) : null}
          </div>
          {/* Contextual EXP bar */}
          <div className="mt-2 w-56">
            {/* Vitals */}
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
                <span>HP</span>
                <span>{hp} / {100}</span>
              </div>
              <div className="h-2 w-full rounded bg-white/10">
                <div className="h-2 rounded bg-rose-500" style={{ width: `${Math.min(100, (hp / 100) * 100)}%` }} />
              </div>
            </div>
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
                <span>MP</span>
                <span>{mp} / {50}</span>
              </div>
              <div className="h-2 w-full rounded bg-white/10">
                <div className="h-2 rounded bg-sky-500" style={{ width: `${Math.min(100, (mp / 50) * 100)}%` }} />
              </div>
            </div>
            {/* Auto indicator */}
            <div className="mb-2 text-[11px] text-gray-300">
              <span className={`rounded px-2 py-0.5 ring-1 ${autoOn ? "bg-emerald-900/40 text-emerald-300 ring-emerald-500/30" : "bg-black/30 text-gray-300 ring-white/10"}`}>
                Auto: {autoOn ? "ON" : "OFF"}
              </span>
            </div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
              <span>{expHud.label}</span>
              <span>{expHud.value} / {expHud.max}</span>
            </div>
            <div className="h-2 w-full rounded bg-white/10">
              <div className="h-2 rounded bg-violet-500" style={{ width: `${Math.min(100, (expHud.value / expHud.max) * 100)}%` }} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-300">
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Gold: <span className="text-yellow-300 font-semibold">{gold}</span></span>
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Premium: <span className="text-emerald-300 font-semibold">{premiumGold}</span></span>
            </div>
          </div>
        </div>
      ) : null}
      {/* HUD Buttons */}
      {!readonly && (
      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex gap-2">
        <button className="btn px-3 py-1 text-sm" title="Open your inventory" onClick={() => setOpenInventory(true)}>Items</button>
        <button className="btn px-3 py-1 text-sm" title="View your talent tree">Talents</button>
        <button className="btn px-3 py-1 text-sm" title="Quests, Tips, AFK Info" onClick={async () => {
          if (!character) return;
          setShowQuests(true);
          try {
            const res = await fetch(`/api/quest?characterId=${character.id}`);
            if (res.ok) {
              const data = await res.json().catch(()=>({ characterQuests: [] as Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }> }));
              const rows: Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }> = Array.isArray(data.characterQuests) ? data.characterQuests : [];
              setQuests(rows);
            }
          } catch {}
        }}>Codex</button>
  {/* Shop is now a Town interaction, not a HUD button */}
        <button className="btn px-3 py-1 text-sm" title="View your stats and skills" onClick={async () => {
          if (!character) return;
          try {
            const res = await fetch(`/api/account/stats?characterId=${character.id}`);
            if (res.ok) {
              const data = await res.json();
              setStatsData({ base: data.base, skills: data.skills });
              if (typeof data?.base?.gold === "number") setGold(data.base.gold);
              if (typeof data?.base?.premiumGold === "number") setPremiumGold(data.base.premiumGold);
              setShowStats(true);
            }
          } catch {}
        }}>Stats</button>
      </div>
      )}
      {/* Inventory Modal */}
      {!readonly && openInventory && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="max-h-[88vh] w-[min(720px,96vw)] overflow-auto rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Inventory</h3>
              <button className="btn px-3 py-1" onClick={() => setOpenInventory(false)}>Close</button>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-300">
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Gold: <span className="text-yellow-300 font-semibold">{gold}</span></span>
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Premium: <span className="text-emerald-300 font-semibold">{premiumGold}</span></span>
            </div>
            <div className="mt-4">
              {/* Sort/Filter controls for inventory view */}
              <div className="mb-2 flex items-center gap-3 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <span>Sort:</span>
                  <button className={`btn px-2 py-0.5 ${invSort==='name'?'ring-emerald-500/30':''}`} onClick={()=>setInvSort('name')}>Name</button>
                  <button className={`btn px-2 py-0.5 ${invSort==='qty'?'ring-emerald-500/30':''}`} onClick={()=>setInvSort('qty')}>Qty</button>
                </div>
                <div className="flex items-center gap-1">
                  <span>Filter:</span>
                  <button className={`btn px-2 py-0.5 ${invFilter==='all'?'ring-emerald-500/30':''}`} onClick={()=>setInvFilter('all')}>All</button>
                  <button className={`btn px-2 py-0.5 ${invFilter==='materials'?'ring-emerald-500/30':''}`} onClick={()=>setInvFilter('materials')}>Materials</button>
                  <button className={`btn px-2 py-0.5 ${invFilter==='weapons'?'ring-emerald-500/30':''}`} onClick={()=>setInvFilter('weapons')}>Weapons</button>
                  <button className={`btn px-2 py-0.5 ${invFilter==='misc'?'ring-emerald-500/30':''}`} onClick={()=>setInvFilter('misc')}>Misc</button>
                </div>
              </div>
              <InventoryGrid
                items={inventory}
                slots={48}
                orderedKeys={orderedKeys}
                renderIcon={(k) => {
                  if (k === "copper") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #f59e0b, #b45309)" }} />;
                  if (k === "tin") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #e5e7eb, #6b7280)" }} />;
                  if (k === "copper_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }} />;
                  if (k === "bronze_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #b8860b, #6b4f1d)" }} />;
                  if (k === "plank") return <div className="h-5 w-8 rounded" style={{ background: "linear-gradient(135deg, #8b5e34, #5c3d1e)" }} />;
                  if (k === "copper_armor") return <div className="h-6 w-6 rounded" style={{ background: "radial-gradient(circle at 30% 30%, #b45309, #78350f)" }} title="Copper Armor" />;
                  if (k === "copper_dagger") return <div className="h-0 w-0 border-l-4 border-r-4 border-b-8" style={{ borderColor: "transparent transparent #b45309 transparent" }} title="Copper Dagger" />;
                  return <span className="select-none text-xs font-semibold" title={k}>{k.substring(0,2).toUpperCase()}</span>;
                }}
                onCardContextMenu={(key, count) => setSplitModal({ open: true, key, max: count, target: "storage" })}
                titleFor={(key, count) => `${key} (${count})`}
              />
              {Object.keys(inventory).length === 0 && (
                <div className="mt-2 text-sm text-gray-400">No items yet. Mine nodes or defeat monsters to collect items.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Quests Modal */}
      {!readonly && showQuests && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(680px,94vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Quests</h3>
              <button className="btn px-3 py-1" onClick={() => setShowQuests(false)}>Close</button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {quests.length === 0 && <div className="text-sm text-gray-400">No quests yet. Talk to Grimsley in town.</div>}
              {quests.map((q) => (
                <div key={q.questId} className="rounded border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white/90">{q.quest?.name || q.questId}</div>
                      <div className="text-xs text-gray-300">{q.quest?.description}</div>
                    </div>
                    <div className="text-xs">{q.status}</div>
                  </div>
                  {typeof q.progress === 'number' && typeof q.quest?.objectiveCount === 'number' && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
                        <span>Progress</span>
                        <span>{q.progress} / {q.quest.objectiveCount}</span>
                      </div>
                      <div className="h-2 w-full rounded bg-white/10">
                        <div className="h-2 rounded bg-green-500" style={{ width: `${Math.min(100, (q.progress / Math.max(1,q.quest.objectiveCount)) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    {q.status === 'ACTIVE' && (
                      <button className="btn px-2 py-1 text-xs" onClick={async () => {
                        if (!character) return;
                        await fetch('/api/quest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abandon', characterId: character.id, questId: q.questId }) });
                        const res = await fetch(`/api/quest?characterId=${character.id}`);
                        const data = await res.json().catch(()=>({ characterQuests: [] as Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }> }));
                        const rows: Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }> = Array.isArray(data.characterQuests) ? data.characterQuests : [];
                        setQuests(rows);
                      }}>Abandon</button>
                    )}
                    {q.status === 'COMPLETED' && (
                      <button className="btn px-2 py-1 text-xs" onClick={async () => {
                        if (!character) return;
                        const res = await fetch('/api/quest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', characterId: character.id, questId: q.questId }) });
                        const payload = await res.json().catch(()=>({}));
                        if (payload?.rewards?.gold) setGold((g)=>g + Number(payload.rewards.gold||0));
                        if (typeof payload?.exp === 'number' && typeof payload?.level === 'number') {
                          window.__applyExpUpdate?.({ type: 'character', exp: payload.exp, level: payload.level });
                        }
                        const inv = (gameRef.current?.registry.get('inventory') as Record<string, number>) || {};
                        if (payload?.granted) {
                          for (const [k,v] of Object.entries(payload.granted as Record<string,number>)) inv[k] = (inv[k]??0)+Number(v||0);
                          gameRef.current?.registry.set('inventory', inv);
                          setInventory({ ...inv });
                        }
                        // Optimistically remove the completed quest from the panel if rewards were claimed
                        setQuests(prev => prev.filter(row => row.questId !== q.questId));
                        // Then refetch to pull any next quest that was auto-activated
                        const res2 = await fetch(`/api/quest?characterId=${character.id}`);
                        const data2 = await res2.json().catch(()=>({ characterQuests: [] as Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }> }));
                        const rows2: Array<{ questId: string; status: string; progress: number; quest?: { id: string; name: string; description: string; objectiveCount: number } }> = Array.isArray(data2.characterQuests) ? data2.characterQuests : [];
                        setQuests(rows2);
                      }}>Hand In</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Shop Modal */}
      {!readonly && showShop && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(800px,95vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Shop</h3>
              <button className="btn px-3 py-1" onClick={() => setShowShop(false)}>Close</button>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-300">
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Gold: <span className="text-yellow-300 font-semibold">{gold}</span></span>
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Premium: <span className="text-emerald-300 font-semibold">{premiumGold}</span></span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span>Qty</span>
              <button className="btn px-2" onClick={() => setShopQty(q => Math.max(1, q - 1))}>-</button>
              <input className="w-16 rounded bg-black/40 border border-white/10 px-2 py-1 text-center" value={shopQty} onChange={(e) => setShopQty(Math.max(1, Math.min(999, parseInt(e.target.value || "1", 10) || 1)))} />
              <button className="btn px-2" onClick={() => setShopQty(q => Math.min(999, q + 1))}>+</button>
              <span className="text-gray-400">Drag from Shop → Inventory to buy; Inventory → Shop to sell. Each drag performs 1 per operation, repeated by Qty.</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <div className="mb-2 text-sm text-gray-300">Inventory</div>
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 rounded border border-white/10 bg-black/40 p-3"
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={async (e) => {
                       e.preventDefault(); if (!character) return;
                       const data = e.dataTransfer?.getData("text/plain"); if (!data) return;
                       const { source, key } = JSON.parse(data);
                       if (source !== "shop") return;
                       const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, action: "buy", itemKey: key, quantity: shopQty }) });
                       if (!res.ok) return;
                       const payload = await res.json().catch(() => null);
                       if (payload && typeof payload.gold === "number") setGold(payload.gold);
                       const inv = (gameRef.current?.registry.get("inventory") as Record<string, number>) || {};
                       const added = Math.max(1, Number(payload?.qty || shopQty));
                       inv[key] = (inv[key] ?? 0) + added; gameRef.current?.registry.set("inventory", inv); setInventory({ ...inv });
                       pushToast(`Purchased ${added} ${key}${added>1?"s":""}${typeof payload?.gold === 'number' ? ` (${payload.gold} gold left)` : ""}`);
                     }}>
                  {Object.entries(inventory).map(([key, count]) => (
                    <div key={key}
                         className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900 to-black/60 p-2"
                         draggable onDragStart={(e) => e.dataTransfer?.setData("text/plain", JSON.stringify({ source: "inventory", key }))}
                    >
                      <div className="flex h-full w-full items-center justify-center"><span className="text-xs font-semibold">{key.substring(0,2).toUpperCase()}</span></div>
                      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white/90 ring-1 ring-white/10">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm text-gray-300">Shop</div>
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 rounded border border-white/10 bg-black/40 p-3"
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={async (e) => {
                       e.preventDefault(); if (!character) return;
                       const data = e.dataTransfer?.getData("text/plain"); if (!data) return;
                       const { source, key } = JSON.parse(data);
                       if (source !== "inventory") return;
                       const reqQty = Math.min(shopQty, inventory[key] ?? 0);
                       if (reqQty <= 0) return;
                       const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, action: "sell", itemKey: key, quantity: reqQty }) });
                       if (!res.ok) return;
                       const payload = await res.json().catch(() => null);
                       if (payload && typeof payload.gold === "number") setGold(payload.gold);
                       const inv = (gameRef.current?.registry.get("inventory") as Record<string, number>) || {};
                       const sold = Math.max(1, Number(payload?.qty || reqQty));
                       inv[key] = Math.max(0, (inv[key] ?? 0) - sold); if (inv[key] <= 0) delete inv[key];
                       gameRef.current?.registry.set("inventory", inv); setInventory({ ...inv });
                       pushToast(`Sold ${sold} ${key}${sold>1?"s":""}${typeof payload?.gold === 'number' ? ` (${payload.gold} gold now)` : ""}`);
                     }}>
                  {shopItems.map(it => (
                    <div key={it.key}
                         className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900 to-black/60 p-2"
                         draggable onDragStart={(e) => e.dataTransfer?.setData("text/plain", JSON.stringify({ source: "shop", key: it.key }))}
                         title={`${it.name} • Buy ${it.buy} • Sell ${it.sell}`}
                    >
                      <div className="flex h-full w-full items-center justify-center"><span className="text-[10px] font-semibold">{it.name.split(" ")[0]}</span></div>
                      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-white/10">B {it.buy}</span>
                      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-yellow-300 ring-1 ring-white/10">S {it.sell}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Workbench Modal */}
      {!readonly && showWorkbench && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(560px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Workbench</h3>
              <button className="btn px-3 py-1" onClick={() => setShowWorkbench(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Copper Armor</div>
                <div className="mt-1 text-gray-300">Costs: 3x Copper Bar • Time: 10s • +6 Crafting EXP</div>
                <button
                  className="btn mt-2 px-3 py-1 disabled:opacity-50"
                  disabled={!!workQueue || (inventory.copper_bar ?? 0) < 3}
                  onClick={() => startWork("armor", 1)}
                >Craft 1</button>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Copper Dagger</div>
                <div className="mt-1 text-gray-300">Costs: 1x Copper Bar, 1x Plank • Time: 7s • +4 Crafting EXP</div>
                <button
                  className="btn mt-2 px-3 py-1 disabled:opacity-50"
                  disabled={!!workQueue || (inventory.copper_bar ?? 0) < 1 || (inventory.plank ?? 0) < 1}
                  onClick={() => startWork("dagger", 1)}
                >Craft 1</button>
              </div>
            </div>
            {workQueue ? (
              <div className="mt-4 rounded border border-white/10 bg-black/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>Crafting {workQueue.recipe === "armor" ? "Copper Armor" : "Copper Dagger"}…</div>
                  <button className="btn px-2 py-1" onClick={() => cancelWork()}>Cancel</button>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-white/10">
                  {(() => {
                    const finished = (workQueue.total - workQueue.remaining);
                    const elapsed = (finished * workQueue.per) + (Date.now() - workQueue.startedAt);
                    const totalMs = workQueue.total * workQueue.per;
                    const pct = Math.min(100, (elapsed / Math.max(1, totalMs)) * 100);
                    return <div className="h-2 rounded bg-blue-500" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Sawmill Modal */}
      {!readonly && showSawmill && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Sawmill</h3>
              <button className="btn px-3 py-1" onClick={() => setShowSawmill(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Plank</div>
                <div className="mt-1 text-gray-300">Costs: 1x Log • Time: 3s • +1 Crafting EXP</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!sawQueue || (inventory.log ?? 0) < 1} onClick={() => startSaw("plank", 1)}>Cut 1</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!sawQueue || (inventory.log ?? 0) < 5} onClick={() => startSaw("plank", 5)}>x5</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!sawQueue || (inventory.log ?? 0) < 10} onClick={() => startSaw("plank", 10)}>x10</button>
                </div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Oak Plank</div>
                <div className="mt-1 text-gray-300">Costs: 1x Oak Log • Time: 5s • +2 Crafting EXP</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!sawQueue || (inventory.oak_log ?? 0) < 1} onClick={() => startSaw("oak_plank", 1)}>Cut 1</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!sawQueue || (inventory.oak_log ?? 0) < 5} onClick={() => startSaw("oak_plank", 5)}>x5</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!sawQueue || (inventory.oak_log ?? 0) < 10} onClick={() => startSaw("oak_plank", 10)}>x10</button>
                </div>
              </div>
            </div>
            {sawQueue ? (
              <div className="mt-4 rounded border border-white/10 bg-black/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>Cutting {sawQueue.recipe === "plank" ? "Plank" : "Oak Plank"}… {sawQueue.remaining > 1 ? `(x${sawQueue.remaining} left)` : null}</div>
                  <button className="btn px-2 py-1" onClick={cancelSaw}>Cancel</button>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-white/10">
                  {(() => {
                    const finished = (sawQueue.total - sawQueue.remaining);
                    const elapsed = (finished * sawQueue.per) + (Date.now() - sawQueue.startedAt);
                    const totalMs = sawQueue.total * sawQueue.per;
                    const pct = Math.min(100, (elapsed / Math.max(1, totalMs)) * 100);
                    return <div className="h-2 rounded bg-amber-500" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Storage Modal */}
      {!readonly && showStorage && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(760px,94vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Account Storage</h3>
              <button className="btn px-3 py-1" onClick={() => setShowStorage(false)}>Close</button>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-300">
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Gold: <span className="text-yellow-300 font-semibold">{gold}</span></span>
              <span className="rounded bg-black/30 px-2 py-0.5 ring-1 ring-white/10">Premium: <span className="text-emerald-300 font-semibold">{premiumGold}</span></span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <div className="mb-2 text-sm text-gray-300">Your Inventory</div>
                <InventoryGrid
                  items={inventory}
                  onContainerDragOver={(e) => e.preventDefault()}
                  onContainerDrop={(e) => { e.preventDefault(); if (dragItem && dragItem.from === "storage") { void moveItem("storage", dragItem.key); setDragItem(null); } }}
                  onCardDragStart={(key) => setDragItem({ from: "inv", key })}
                  onCardDoubleClick={(key) => void moveItem("inv", key)}
                  onCardContextMenu={(key, count) => setSplitModal({ open: true, key, max: count, target: "storage" })}
                  renderIcon={(k) => {
                    if (k === "copper") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #f59e0b, #b45309)" }} />;
                    if (k === "tin") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #e5e7eb, #6b7280)" }} />;
                    if (k === "copper_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }} />;
                    if (k === "bronze_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #b8860b, #6b4f1d)" }} />;
                    if (k === "plank") return <div className="h-5 w-8 rounded" style={{ background: "linear-gradient(135deg, #8b5e34, #5c3d1e)" }} />;
                    if (k === "copper_armor") return <div className="h-6 w-6 rounded" style={{ background: "radial-gradient(circle at 30% 30%, #b45309, #78350f)" }} title="Copper Armor" />;
                    if (k === "copper_dagger") return <div className="h-0 w-0 border-l-4 border-r-4 border-b-8" style={{ borderColor: "transparent transparent #b45309 transparent" }} title="Copper Dagger" />;
                    return <span className="select-none text-xs font-semibold" title={k}>{k.substring(0,2).toUpperCase()}</span>;
                  }}
                />
      {/* Split stack modal for partial moves (inventory -> storage for now) */}
      {!readonly && splitModal?.open && (
        <SplitStackModal
          open={splitModal.open}
          title={`Move to ${splitModal.target === 'storage' ? 'Storage' : splitModal.target === 'shop' ? 'Shop' : 'Inventory'}`}
          max={splitModal.max}
          onClose={() => setSplitModal(null)}
          onConfirm={(qty) => {
            if (!splitModal) return;
            if (splitModal.target === 'storage') {
              void moveItem('inv', splitModal.key, qty);
            }
            setSplitModal(null);
          }}
        />
      )}
              </div>
              <div>
                <div className="mb-2 text-sm text-gray-300">Account Storage</div>
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 rounded border border-white/10 bg-black/40 p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (dragItem && dragItem.from === "inv") { void moveItem("inv", dragItem.key); setDragItem(null); } }}>
                  {Object.entries(accountStorage).length === 0 && (
                    <div className="col-span-full text-sm text-gray-400">No items in storage. Drag items from Inventory.</div>
                  )}
                  {Object.entries(accountStorage).map(([key, count]) => {
                    const icon = (k: string) => {
                      if (k === "copper") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #f59e0b, #b45309)" }} />;
                      if (k === "tin") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #e5e7eb, #6b7280)" }} />;
                      if (k === "copper_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }} />;
                      if (k === "bronze_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #b8860b, #6b4f1d)" }} />;
                      if (k === "plank") return <div className="h-5 w-8 rounded" style={{ background: "linear-gradient(135deg, #8b5e34, #5c3d1e)" }} />;
                      if (k === "copper_armor") return <div className="h-6 w-6 rounded" style={{ background: "radial-gradient(circle at 30% 30%, #b45309, #78350f)" }} title="Copper Armor" />;
                      if (k === "copper_dagger") return <div className="h-0 w-0 border-l-4 border-r-4 border-b-8" style={{ borderColor: "transparent transparent #b45309 transparent" }} title="Copper Dagger" />;
                      return <span className="select-none text-xs font-semibold" title={k}>{k.substring(0,2).toUpperCase()}</span>;
                    };
                    return (
                      <div key={key} className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900 to-black/60 p-2"
                           draggable onDragStart={() => setDragItem({ from: "storage", key })}
                           title={`${key} (${count})`}
                           onDoubleClick={() => void moveItem("storage", key)}>
                        <div className="flex h-full w-full items-center justify-center">{icon(key)}</div>
                        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white/90 ring-1 ring-white/10">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400">Drag and drop items between your inventory and account storage. Double-click to move one quickly.</div>
          </div>
        </div>
      )}
      {/* Furnace Modal */}
      {showFurnace && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Furnace</h3>
              <button className="btn px-3 py-1" onClick={() => setShowFurnace(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Copper Bar</div>
                <div className="mt-1 text-gray-300">Costs: 1x Copper Ore • Time: 4s • +2 Crafting EXP</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || (inventory.copper ?? 0) < 1} onClick={() => startSmelt("copper", 1)}>Smelt 1</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || (inventory.copper ?? 0) < 5} onClick={() => startSmelt("copper", 5)}>x5</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || (inventory.copper ?? 0) < 10} onClick={() => startSmelt("copper", 10)}>x10</button>
                </div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Bronze Bar</div>
                <div className="mt-1 text-gray-300">Costs: 1x Copper Ore, 1x Tin Ore • Time: 6s • +3 Crafting EXP</div>
                {((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 ? (
                  <div className="mt-1 text-xs text-yellow-400">Requires Crafting Lv 2</div>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || ((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 || (inventory.copper ?? 0) < 1 || (inventory.tin ?? 0) < 1} onClick={() => startSmelt("bronze", 1)}>Smelt 1</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || ((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 || (inventory.copper ?? 0) < 5 || (inventory.tin ?? 0) < 5} onClick={() => startSmelt("bronze", 5)}>x5</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || ((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 || (inventory.copper ?? 0) < 10 || (inventory.tin ?? 0) < 10} onClick={() => startSmelt("bronze", 10)}>x10</button>
                </div>
              </div>
            </div>
            {furnaceQueue ? (
              <div className="mt-4 rounded border border-white/10 bg-black/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>Smelting {furnaceQueue.recipe === "copper" ? "Copper Bar" : "Bronze Bar"}… {furnaceQueue.remaining > 1 ? `(x${furnaceQueue.remaining} left)` : null}</div>
                  <button className="btn px-2 py-1" onClick={cancelSmelt}>Cancel</button>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-white/10">
                  {(() => {
                    const finished = (furnaceQueue.total - furnaceQueue.remaining);
                    const elapsed = (finished * furnaceQueue.per) + (Date.now() - furnaceQueue.startedAt);
                    const totalMs = furnaceQueue.total * furnaceQueue.per;
                    const pct = Math.min(100, (elapsed / Math.max(1, totalMs)) * 100);
                    return <div className="h-2 rounded bg-orange-500" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Chat moved to dedicated ChatClient under the canvas */}
      {/* AFK Combat Modal */}
      {!readonly && afkCombatModal?.open && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-white">While you were away…</h3>
            <p className="mt-1 text-sm text-gray-300">Your character battled in {afkCombatModal.zone}.</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Enemies Defeated</div>
                <div className="mt-1 text-white text-xl font-semibold">+{afkCombatModal.kills}</div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Character EXP</div>
                <div className="mt-1 text-white text-xl font-semibold">+{afkCombatModal.exp}</div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Gold</div>
                <div className="mt-1 text-yellow-300 text-xl font-semibold">+{afkCombatModal.gold}</div>
              </div>
            </div>
            {afkCombatModal.loot?.length ? (
              <div className="mt-3">
                <div className="text-sm text-gray-300 mb-1">Loot</div>
                <div className="grid grid-cols-4 gap-2">
                  {afkCombatModal.loot.map((l, idx) => (
                    <div key={idx} className="rounded border border-white/10 bg-black/40 p-2 text-xs flex items-center justify-between">
                      <span>{l.itemId}</span>
                      <span className="text-white/90 font-semibold">+{l.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn px-3 py-1" onClick={() => setAfkCombatModal(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
      {/* Welcome Modal (first time) */}
      {!readonly && !welcomeSeen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="w-[min(560px,92vw)] rounded-lg border border-white/10 bg-black/80 p-5 text-gray-200 shadow-xl">
            <h3 className="text-xl font-semibold text-white">Welcome to Chaos In Full</h3>
            <p className="mt-2 text-sm text-gray-300">This is a 2D Platformer IDLE RPG.</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Movement: WASD</p>
              <p>Basic Attack: Space</p>
              <p>Active Skills: 1-0</p>
              <p className="text-gray-400">AFK systems will earn EXP/Gold when on maps with mobs.</p>
            </div>
            {welcomeError ? <p className="mt-3 text-sm text-red-300">{welcomeError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn px-4 py-2"
                onClick={markWelcomeSeen}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Gains Modal */}
      {!readonly && offlineModal?.open && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-white">While you were away…</h3>
            <p className="mt-1 text-sm text-gray-300">Your character remained in the Cave and gathered resources passively.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Copper Ore</div>
                <div className="mt-1 text-white text-xl font-semibold">+{offlineModal.copper}</div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Tin Ore</div>
                <div className="mt-1 text-white text-xl font-semibold">+{offlineModal.tin}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400">Mining EXP will be awarded (+3 EXP per ore). Level-ups apply automatically.</div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn px-3 py-1" onClick={() => setOfflineModal(null)}>Dismiss</button>
              <button className="btn px-3 py-1" onClick={collectOffline}>Collect</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {!readonly && showStats && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(560px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Stats & Skills</h3>
              <button className="btn px-3 py-1" onClick={() => setShowStats(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Base</div>
                {statsData?.base ? (
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>Level: {statsData.base.level}</li>
                    <li>Class: {statsData.base.class}</li>
                    <li>HP: {statsData.base.hp} • MP: {statsData.base.mp}</li>
                    <li>STR: {statsData.base.strength} • INT: {statsData.base.intellect}</li>
                    <li>AGI: {statsData.base.agility} • LUK: {statsData.base.luck}</li>
                    <li>Gold: {statsData.base.gold} • Premium: {statsData.base.premiumGold}</li>
                  </ul>
                ) : <div className="mt-2 text-gray-400">No base stats</div>}
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Skills</div>
                {statsData?.skills ? (
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>Mining: Lv {statsData.skills.mining.level} ({statsData.skills.mining.exp} EXP)</li>
                    <li>Woodcutting: Lv {statsData.skills.woodcutting.level} ({statsData.skills.woodcutting.exp} EXP)</li>
                    <li>Fishing: Lv {statsData.skills.fishing.level} ({statsData.skills.fishing.exp} EXP)</li>
                    <li>Crafting: Lv {statsData.skills.crafting.level} ({statsData.skills.crafting.exp} EXP)</li>
                  </ul>
                ) : <div className="mt-2 text-gray-400">No skills yet</div>}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Damage scales with your main stat by class (Beginner = LUK, Horror = STR, Occult = INT, Shade = AGI) and weapon damage (1 if none equipped).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
