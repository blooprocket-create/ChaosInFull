export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }
  preload() {
    // small placeholder to ensure Preloader shows
    this.load.image('atlas', 'assets/atlas.png');
  }
  create() {
    this.scene.start('Preloader');
  }
}

