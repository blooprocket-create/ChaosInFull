import { Login } from './scenes/Login.js';
import { CharacterSelect } from './scenes/CharacterSelect.js';
import { Start } from './scenes/Start.js';
import { Town } from './scenes/Town.js';
import { Cave } from './scenes/Cave.js';
import { InnerField } from './scenes/InnerField.js';
import { OuterField } from './scenes/OuterField.js';
import { GoblinCamp } from './scenes/GoblinCamp.js';
import { ITEM_DEFS } from './data/items.js';
import { RECIPE_DEFS } from './data/recipes.js';
import { RACE_DEFS } from './data/races.js';
import { CLASS_DEFS } from './data/classes.js';
import { ENEMY_DEFS } from './data/enemies.js';
import { Boot } from './scenes/Boot.js';
import * as SharedUI from './scenes/shared/ui.js';
import * as furnaceShared from './scenes/shared/furnace.js';
import * as hudShared from './scenes/shared/hud.js';
import * as keysShared from './scenes/shared/keys.js';
import * as overlaysShared from './scenes/shared/overlays.js';
import * as portalShared from './scenes/shared/portal.js';
import * as workbenchShared from './scenes/shared/workbench.js';

const config = {
    type: Phaser.AUTO,
    title: 'Overlord Rising',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [
        Boot,
        Login,
        CharacterSelect,
        Start,
        Town,
        Cave,
        InnerField,
        OuterField,
        GoblinCamp
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}
// expose item defs and shared helpers for quick lookup in scenes BEFORE creating the game
if (typeof window !== 'undefined') window.ITEM_DEFS = ITEM_DEFS;
if (typeof window !== 'undefined') window.RECIPE_DEFS = RECIPE_DEFS;
if (typeof window !== 'undefined') window.RACE_DEFS = RACE_DEFS;
if (typeof window !== 'undefined') window.CLASS_DEFS = CLASS_DEFS;
if (typeof window !== 'undefined') window.ENEMY_DEFS = ENEMY_DEFS;
// expose shared UI helpers for legacy scenes to call
if (typeof window !== 'undefined') window.__shared_ui = SharedUI;
if (typeof window !== 'undefined') window.__furnace_shared = furnaceShared;
if (typeof window !== 'undefined') window.__hud_shared = hudShared;
if (typeof window !== 'undefined') window.__shared_keys = keysShared;
if (typeof window !== 'undefined') window.__overlays_shared = overlaysShared;
if (typeof window !== 'undefined') window.__portal_shared = portalShared;
if (typeof window !== 'undefined') window.__workbench_shared = workbenchShared;

new Phaser.Game(config);
            
