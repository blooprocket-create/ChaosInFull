import Boot from './scenes/Boot.js';
import Preloader from './scenes/Preloader.js';
import Town from './scenes/Town.js';
import Cave from './scenes/Cave.js';
import Field from './scenes/Field.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d2430',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 800 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [Boot, Preloader, Town, Cave, Field]
};

window.addEventListener('load', () => {
  window.game = new Phaser.Game(config);
});
