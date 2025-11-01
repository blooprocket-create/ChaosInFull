import * as Phaser from "phaser";

// Import scenes from the phaser folder (JavaScript files)
// These will be dynamically imported to handle the .js extension

export type CharacterHUD = { id: string; name: string; class: string; level: number };

// Extend Window interface for game globals
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
    __shared_ui: unknown;
    __furnace_shared: unknown;
    __shared_keys: unknown;
    __overlays_shared: unknown;
    __portal_shared: unknown;
    __workbench_shared: unknown;
  }
}

export async function createPhaserGame(opts: { 
  parent: HTMLElement; 
  character?: CharacterHUD; 
  initialScene?: string; 
}) {
  const { parent, character, initialScene } = opts;
  
  // Dynamically import the scenes from the phaser folder
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
    import('./phaser/scenes/GraveForest.js'),
    import('./phaser/scenes/BrokenDock.js'),
  ]);

  // Import data definitions
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

  const {
    QUEST_DEFS,
    getQuestById,
    startQuest,
    updateQuestProgress,
    checkQuestCompletion,
    completeQuest,
    getQuestObjectiveState,
  } = questModule;

  // Import shared modules
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

  // Expose definitions to window for the game to access
  if (typeof window !== 'undefined') {
    window.ITEM_DEFS = ITEM_DEFS;
    window.RECIPE_DEFS = RECIPE_DEFS;
    window.RACE_DEFS = RACE_DEFS;
    window.CLASS_DEFS = CLASS_DEFS;
    window.ENEMY_DEFS = ENEMY_DEFS;
    window.QUEST_DEFS = QUEST_DEFS;
    window.PLOT_DEFS = PLOT_DEFS;
    window.getQuestById = getQuestById;
    window.startQuest = startQuest;
    window.updateQuestProgress = updateQuestProgress;
    window.checkQuestCompletion = checkQuestCompletion;
    window.completeQuest = completeQuest;
    window.getQuestObjectiveState = getQuestObjectiveState;
    window.__shared_ui = SharedUI;
    window.__furnace_shared = furnaceShared.default || furnaceShared;
    window.__hud_shared = hudShared.default || hudShared;
    window.__shared_keys = keysShared.default || keysShared;
    window.__overlays_shared = overlaysShared.default || overlaysShared;
    window.__portal_shared = portalShared.default || portalShared;
    window.__workbench_shared = workbenchShared.default || workbenchShared;
    
    try {
      if (diagnostics && typeof diagnostics.installDiagnostics === 'function') {
        diagnostics.installDiagnostics(null);
      }
    } catch (e) {
      console.warn('Failed to install diagnostics:', e);
    }
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    title: 'Veil Keeper',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    parent,
    pixelArt: false,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
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
      GraveForest,
      BrokenDock,
    ],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    loader: {
      baseURL: '/phaser-game/',
      path: '',
    },
  };

  const game = new Phaser.Game(config);

  // Store character info in registry if provided
  if (character) {
    game.registry.set('characterId', character.id);
    game.registry.set('characterName', character.name);
    game.registry.set('characterClass', character.class);
    game.registry.set('characterLevel', character.level);
  }

  // Expose game instance
  if (typeof window !== 'undefined') {
    window.GAME = game;
  }

  // Start with the specified scene or Boot
  const startSceneKey = initialScene || 'Boot';
  game.scene.start(startSceneKey);

  return game;
}

export default createPhaserGame;
