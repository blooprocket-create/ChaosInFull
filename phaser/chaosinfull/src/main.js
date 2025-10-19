import { Login } from './scenes/Login.js';
import { CharacterSelect } from './scenes/CharacterSelect.js';
import { Game } from './scenes/Game.js';
import { Start } from './scenes/Start.js';
import { Town } from './scenes/Town.js';

const config = {
    type: Phaser.AUTO,
    title: 'Overlord Rising',
    description: '',
    parent: 'game-container',
    width: 800,
    height: 600,
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
        Town
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            