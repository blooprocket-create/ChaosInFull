import type * as PhaserTypes from 'phaser';

export type CharacterHUD = { id: string; name: string; class: string; level: number };

declare global {
  interface Window {
    ITEM_DEFS: unknown;
    RECIPE_DEFS: unknown;
    RACE_DEFS: unknown;
    CLASS_DEFS: unknown;
    ENEMY_DEFS: unknown;
    QUEST_DEFS: unknown;
    PLOT_DEFS: unknown;
    getQuestById: unknown;
    startQuest: unknown;
    updateQuestProgress: unknown;
    checkQuestCompletion: unknown;
    completeQuest: unknown;
    getQuestObjectiveState: unknown;

  __shared_ui?: unknown;
  __furnace_shared?: unknown;
  __hud_shared?: unknown;
  __shared_keys?: unknown;
  __overlays_shared?: unknown;
  __portal_shared?: unknown;
  __workbench_shared?: unknown;

    GAME?: PhaserTypes.Game;
    __GAME_CREATING__?: Promise<PhaserTypes.Game> | null;
    __GAME_REFCOUNT__?: number;
  }
}

export async function createPhaserGame(opts: {
  parent: HTMLElement;
  character?: CharacterHUD;
  initialScene?: string;
}) {
  const { parent, character, initialScene } = opts;
  if (typeof window === 'undefined') {
    throw new Error('Phaser cannot initialize during SSR');
  }
  const w = window as unknown as Window;

  // Reuse existing instance if alive
  if (w.GAME) {
    try {
      const existing = w.GAME;
      const maybePendingDestroy = (existing as unknown as { pendingDestroy?: boolean }).pendingDestroy;
      const alive = 'systems' in existing && !maybePendingDestroy;
      if (alive) {
        const existingWithCanvas = existing as unknown as { canvas?: HTMLCanvasElement };
        const currentParent = existingWithCanvas.canvas?.parentElement || null;
        const canvasEl = existingWithCanvas.canvas;
        if (currentParent !== parent && canvasEl) {
          try { parent.appendChild(canvasEl); } catch {}
        }
        w.__GAME_REFCOUNT__ = (w.__GAME_REFCOUNT__ || 0) + 1;
        return existing;
      }
    } catch {}
  }

  // If creation already in-flight (React StrictMode or rapid remount), await it
  if (w.__GAME_CREATING__) {
    const g = await w.__GAME_CREATING__;
    try {
      const gWithCanvas = g as unknown as { canvas?: HTMLCanvasElement };
      const currentParent = gWithCanvas.canvas?.parentElement || null;
      const canvasEl = gWithCanvas.canvas;
      if (currentParent !== parent && canvasEl) {
        try { parent.appendChild(canvasEl); } catch {}
      }
    } catch {}
    w.__GAME_REFCOUNT__ = (w.__GAME_REFCOUNT__ || 0) + 1;
    return g;
  }

  // Establish a single creation promise immediately to close race window
  w.__GAME_CREATING__ = (async () => {
    const Phaser = (await import('phaser')) as typeof PhaserTypes;

    // Load scenes & data in parallel
    const [
      { Boot },
      { Tutorial },
      { Login },
      { CharacterSelect },
      { Start },
      { Town },
      { Cave },
      { InnerField },
      { OuterField },
      { GoblinCamp },
      { GloamwayBastion },
      { GloamwaySwamp },
      { FlameRoad },
      { GraveForest },
      { BrokenDock },
    ] = await Promise.all([
      import('./phaser/scenes/Boot.js'),
      import('./phaser/scenes/Tutorial.js'),
      import('./phaser/scenes/Login.js'),
      import('./phaser/scenes/CharacterSelect.js'),
      import('./phaser/scenes/Start.js'),
      import('./phaser/scenes/Town.js'),
      import('./phaser/scenes/Cave.js'),
      import('./phaser/scenes/InnerField.js'),
      import('./phaser/scenes/OuterField.js'),
      import('./phaser/scenes/GoblinCamp.js'),
      import('./phaser/scenes/GloamwayBastion.js'),
      import('./phaser/scenes/GloamwaySwamp.js'),
      import('./phaser/scenes/FlameRoad.js'),
      import('./phaser/scenes/GraveForest.js'),
      import('./phaser/scenes/BrokenDock.js'),
    ]);

    const [
      { ITEM_DEFS },
      { RECIPE_DEFS },
      { RACE_DEFS },
      { CLASS_DEFS },
      { ENEMY_DEFS },
      questModule,
      { PLOT_DEFS },
    ] = await Promise.all([
      import('./phaser/data/items.js'),
      import('./phaser/data/recipes.js'),
      import('./phaser/data/races.js'),
      import('./phaser/data/classes.js'),
      import('./phaser/data/enemies.js'),
      import('./phaser/data/quests.js'),
      import('./phaser/data/plot.js'),
    ]);

    type QuestModule = {
      QUEST_DEFS: unknown;
      getQuestById: unknown;
      startQuest: unknown;
      updateQuestProgress: unknown;
      checkQuestCompletion: unknown;
      completeQuest: unknown;
      getQuestObjectiveState: unknown;
    };
    const {
      QUEST_DEFS,
      getQuestById,
      startQuest,
      updateQuestProgress,
      checkQuestCompletion,
      completeQuest,
      getQuestObjectiveState,
    } = questModule as QuestModule;

    const [
      SharedUI,
      furnaceShared,
      hudShared,
      keysShared,
      overlaysShared,
      portalShared,
      workbenchShared,
      diagnostics,
    ] = await Promise.all([
      import('./phaser/scenes/shared/ui.js'),
      import('./phaser/scenes/shared/furnace.js'),
      import('./phaser/scenes/shared/hud.js'),
      import('./phaser/scenes/shared/keys.js'),
      import('./phaser/scenes/shared/overlays.js'),
      import('./phaser/scenes/shared/portal.js'),
      import('./phaser/scenes/shared/workbench.js'),
      import('./phaser/shared/diagnostics.js'),
    ]);

    // Expose definitions globally
    w.ITEM_DEFS = ITEM_DEFS;
    w.RECIPE_DEFS = RECIPE_DEFS;
    w.RACE_DEFS = RACE_DEFS;
    w.CLASS_DEFS = CLASS_DEFS;
    w.ENEMY_DEFS = ENEMY_DEFS;
    w.QUEST_DEFS = QUEST_DEFS;
    w.PLOT_DEFS = PLOT_DEFS;
    w.getQuestById = getQuestById;
    w.startQuest = startQuest;
    w.updateQuestProgress = updateQuestProgress;
    w.checkQuestCompletion = checkQuestCompletion;
    w.completeQuest = completeQuest;
    w.getQuestObjectiveState = getQuestObjectiveState;
    w.__shared_ui = SharedUI as unknown;
    const pickDefault = (mod: unknown): unknown => {
      if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
        const d = (mod as Record<string, unknown>).default;
        return d ?? mod;
      }
      return mod;
    };
    w.__furnace_shared = pickDefault(furnaceShared);
    w.__hud_shared = pickDefault(hudShared);
    w.__shared_keys = pickDefault(keysShared);
    w.__overlays_shared = pickDefault(overlaysShared);
    w.__portal_shared = pickDefault(portalShared);
    w.__workbench_shared = pickDefault(workbenchShared);
    try {
      const di = diagnostics as unknown;
      if (di && typeof (di as { installDiagnostics?: (arg: unknown) => void }).installDiagnostics === 'function') {
        (di as { installDiagnostics: (arg: unknown) => void }).installDiagnostics(null);
      }
    } catch {}

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      title: 'Veil Keeper',
      width: 1280,
      height: 720,
      backgroundColor: '#000000',
      parent,
      pixelArt: false,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [
        Boot,
        Tutorial,
        Login,
        CharacterSelect,
        Start,
        Town,
        Cave,
        InnerField,
        OuterField,
        GoblinCamp,
        GloamwayBastion,
        GloamwaySwamp,
        FlameRoad,
        GraveForest,
        BrokenDock,
      ],
      scale: {
        mode: Phaser.Scale.FIT,
        parent: parent,
        width: 1280,
        height: 720,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // Let Phaser handle canvas styling with FIT mode
      loader: { baseURL: '/phaser-game/', path: '' },
    };

    // Install a lightweight audio unlock handler (browser gesture requirement for Web Audio)
    try {
      const installAudioUnlock = () => {
        try {
          // Narrow to Phaser's sound context without using any
          const soundNS = (Phaser as typeof PhaserTypes).Sound as unknown as { context?: AudioContext } | undefined;
          const ctx: AudioContext | null = (soundNS && soundNS.context) ? soundNS.context : null;
          if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            void ctx.resume().catch(() => {});
          }
          window.removeEventListener('pointerdown', installAudioUnlock);
          window.removeEventListener('keydown', installAudioUnlock);
        } catch {}
      };
      window.addEventListener('pointerdown', installAudioUnlock, { once: true });
      window.addEventListener('keydown', installAudioUnlock, { once: true });
    } catch {}

    const game = new Phaser.Game(config);
    // Store character data if supplied
    if (character) {
      game.registry.set('characterId', character.id);
      game.registry.set('characterName', character.name);
      game.registry.set('characterClass', character.class);
      game.registry.set('characterLevel', character.level);
    }
    w.GAME = game;
    w.__GAME_REFCOUNT__ = (w.__GAME_REFCOUNT__ || 0) + 1;
    // Start initial scene
    game.scene.start(initialScene || 'Boot');
    return game;
  })();

  const game = await w.__GAME_CREATING__!;
  // Clear in-flight marker (leave GAME & REFCOUNT set)
  w.__GAME_CREATING__ = null;
  return game;
}

export function releasePhaserGame() {
  try {
    if (typeof window === 'undefined') return;
    const w = window as unknown as Window;
    if (!w.GAME) return;
    w.__GAME_REFCOUNT__ = Math.max(0, (w.__GAME_REFCOUNT__ || 0) - 1);
    if ((w.__GAME_REFCOUNT__ || 0) === 0) {
      try { w.GAME.destroy(true); } catch {}
      w.GAME = undefined;
      w.__GAME_CREATING__ = null;
    }
  } catch {}
}

export default createPhaserGame;
