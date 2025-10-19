import { Login } from './scenes/Login.js';
import { CharacterSelect } from './scenes/CharacterSelect.js';
import { Game } from './scenes/Game.js';
import { Start } from './scenes/Start.js';
import { Town } from './scenes/Town.js';
import { Cave } from './scenes/Cave.js';
import { ITEM_DEFS } from './data/items.js';
import { RECIPE_DEFS } from './data/recipes.js';

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
        Login,
        CharacterSelect,
        Game,
        Start,
        Town,
        Cave
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
// expose item defs for quick lookup in scenes
if (typeof window !== 'undefined') window.ITEM_DEFS = ITEM_DEFS;
if (typeof window !== 'undefined') window.RECIPE_DEFS = RECIPE_DEFS;
            