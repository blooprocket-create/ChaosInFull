import Player from '../player.js';

export default class Town extends Phaser.Scene {
  constructor() { super({ key: 'Town' }); }

  create(data) {
    this.add.rectangle(400, 300, 800, 600, 0x6aa84f).setDepth(-1);

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(400, 580, null).setScale(2, 1).refreshBody().setSize(800, 40).setVisible(false);

    this.player = new Player(this, data.x || 100, data.y || 450);

    // Portal to Cave
    this.cavePortal = this.add.rectangle(720, 520, 64, 120, 0x2222ff).setOrigin(0.5,1);
    this.physics.add.existing(this.cavePortal, true);
    this.cavePortal.name = 'cave';

    // Portal to Field
    this.fieldPortal = this.add.rectangle(80, 520, 64, 120, 0xffaa00).setOrigin(0.5,1);
    this.physics.add.existing(this.fieldPortal, true);
    this.fieldPortal.name = 'field';

    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.overlap(this.player.sprite, this.cavePortal, () => {
      this.scene.start('Cave', { x: 100, y: 450 });
    });
    this.physics.add.overlap(this.player.sprite, this.fieldPortal, () => {
      this.scene.start('Field', { x: 700, y: 450 });
    });

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update(time, delta) {
    this.player.update(this.cursors);
  }
}
