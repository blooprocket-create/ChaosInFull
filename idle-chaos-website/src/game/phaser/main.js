import { Login } from './scenes/Login.js';
import { CharacterSelect } from './scenes/CharacterSelect.js';
import { Start } from './scenes/Start.js';
import { Town } from './scenes/Town.js';
import { Cave } from './scenes/Cave.js';
import { InnerField } from './scenes/InnerField.js';
import { OuterField } from './scenes/OuterField.js';
import { GoblinCamp } from './scenes/GoblinCamp.js';
import { GloamwayBastion } from './scenes/GloamwayBastion.js';
import { GraveForest } from './scenes/GraveForest.js';
import { BrokenDock } from './scenes/BrokenDock.js';
import { ITEM_DEFS } from './data/items.js';
import { RECIPE_DEFS } from './data/recipes.js';
import { RACE_DEFS } from './data/races.js';
import { CLASS_DEFS } from './data/classes.js';
import { ENEMY_DEFS } from './data/enemies.js';
import {
    QUEST_DEFS,
    getQuestById,
    startQuest,
    updateQuestProgress,
    checkQuestCompletion,
    completeQuest,
    getQuestObjectiveState
} from './data/quests.js';
import { Boot } from './scenes/Boot.js';
import { Tutorial } from './scenes/Tutorial.js';
import { PLOT_DEFS } from './data/plot.js';
import * as SharedUI from './scenes/shared/ui.js';
import furnaceShared from './scenes/shared/furnace.js';
import hudShared from './scenes/shared/hud.js';
import keysShared from './scenes/shared/keys.js';
import overlaysShared from './scenes/shared/overlays.js';
import portalShared from './scenes/shared/portal.js';
import workbenchShared from './scenes/shared/workbench.js';
import diagnostics from './shared/diagnostics.js';
// AutoCombat temporarily removed — no side-effect import

// expose item defs and shared helpers for quick lookup in scenes BEFORE creating the game
if (typeof window !== 'undefined') window.ITEM_DEFS = ITEM_DEFS;
if (typeof window !== 'undefined') window.RECIPE_DEFS = RECIPE_DEFS;
if (typeof window !== 'undefined') window.RACE_DEFS = RACE_DEFS;
if (typeof window !== 'undefined') window.CLASS_DEFS = CLASS_DEFS;
if (typeof window !== 'undefined') window.ENEMY_DEFS = ENEMY_DEFS;
if (typeof window !== 'undefined') window.QUEST_DEFS = QUEST_DEFS;
if (typeof window !== 'undefined') window.PLOT_DEFS = PLOT_DEFS;
if (typeof window !== 'undefined') window.getQuestById = getQuestById;
if (typeof window !== 'undefined') window.startQuest = startQuest;
if (typeof window !== 'undefined') window.updateQuestProgress = updateQuestProgress;
if (typeof window !== 'undefined') window.checkQuestCompletion = checkQuestCompletion;
if (typeof window !== 'undefined') window.completeQuest = completeQuest;
if (typeof window !== 'undefined') window.getQuestObjectiveState = getQuestObjectiveState;
// expose shared UI helpers for legacy scenes to call
if (typeof window !== 'undefined') window.__shared_ui = SharedUI;
if (typeof window !== 'undefined') window.__furnace_shared = furnaceShared;
if (typeof window !== 'undefined') window.__hud_shared = hudShared;
if (typeof window !== 'undefined') window.__shared_keys = keysShared;
if (typeof window !== 'undefined') window.__overlays_shared = overlaysShared;
if (typeof window !== 'undefined') window.__portal_shared = portalShared;
if (typeof window !== 'undefined') window.__workbench_shared = workbenchShared;
// install diagnostics helpers (expose __diag.startSceneCycle/stopSceneCycle)
try { if (typeof window !== 'undefined' && diagnostics && typeof diagnostics.installDiagnostics === 'function') diagnostics.installDiagnostics(null); } catch (e) {}

const config = {
    type: Phaser.AUTO,
    title: 'Veil Keeper',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            // Top-down game: disable global gravity so characters don't act like platformers
            gravity: { y: 0 },
            // enable debug temporarily to visualize physics bodies (set false to disable)
            debug: false
        }
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
        BrokenDock
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

const game = new Phaser.Game(config);
// expose the game instance for runtime inspection (dev helper)
if (typeof window !== 'undefined') {
    window.GAME = game;
    try { console.log('GAME started. arcade gravity:', config.physics && config.physics.arcade && config.physics.arcade.gravity); } catch (e) {}
}
// Dev helper: small on-screen debug panel showing gravity/player body state
try {
    if (typeof document !== 'undefined') {
        const dbg = document.createElement('div');
        dbg.id = 'game-debug-panel';
        dbg.style.position = 'fixed';
        dbg.style.right = '8px';
        dbg.style.top = '8px';
        dbg.style.padding = '8px 10px';
        dbg.style.background = 'rgba(0,0,0,0.6)';
        dbg.style.color = '#fff';
        dbg.style.fontFamily = 'monospace';
        dbg.style.fontSize = '12px';
        dbg.style.zIndex = '9999';
        dbg.style.borderRadius = '6px';
        dbg.style.pointerEvents = 'none';
        dbg.innerText = 'debug init...';
        document.body.appendChild(dbg);
        function updateDebug() {
            try {
                const g = window.GAME;
                let worldGrav = (config && config.physics && config.physics.arcade && config.physics.arcade.gravity) ? JSON.stringify(config.physics.arcade.gravity) : 'n/a';
                let active = 'none';
                let plInfo = 'no player';
                if (g) {
                    const scenes = g.scene.getScenes(true) || [];
                    active = scenes.map(s => s.scene && s.scene.key).join(',') || active;
                    const s = scenes[0];
                    if (s && s.player && s.player.body) {
                        const b = s.player.body;
                        plInfo = `allowG:${!!b.allowGravity} vx:${(b.velocity && Math.round(b.velocity.x))||0} vy:${(b.velocity && Math.round(b.velocity.y))||0}`;
                    }
                }
                dbg.innerText = `worldGrav: ${worldGrav}\nscene: ${active}\nplayer: ${plInfo}`;
            } catch (e) { dbg.innerText = 'debug error'; }
            requestAnimationFrame(updateDebug);
        }
        requestAnimationFrame(updateDebug);
    }
} catch (e) { /* ignore debug injection errors */ }
            
