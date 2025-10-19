export default class Preloader extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
  }
  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bar = this.add.graphics();
    this.load.on('progress', (p) => {
      bar.clear();
      bar.fillStyle(0xffffff, 1);
      bar.fillRect(w * 0.25, h * 0.5 - 10, w * 0.5 * p, 20);
    });

    // minimal assets
    this.load.image('tiles', 'assets/tiles.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('portal', 'assets/portal.png');
  }
  create() {
    this.scene.start('Town');
  }
}

