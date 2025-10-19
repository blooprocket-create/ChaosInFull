import Player from '../player.js';

export default class Cave extends Phaser.Scene {
  constructor() { super({ key: 'Cave' }); }

  create(data) {
    this.add.rectangle(400, 300, 800, 600, 0x333333).setDepth(-1);
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(400, 580, null).setScale(2, 1).refreshBody().setSize(800, 40).setVisible(false);

    this.player = new Player(this, data.x || 100, data.y || 450);

    // Portal back to Town
    this.townPortal = this.add.rectangle(400, 520, 96, 120, 0x44bbff).setOrigin(0.5,1);
    this.physics.add.existing(this.townPortal, true);

    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.overlap(this.player.sprite, this.townPortal, () => {
      this.scene.start('Town', { x: 400, y: 450 });
    });

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    this.player.update(this.cursors);
  }
}
