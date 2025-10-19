export default class Player {
  constructor(scene, x = 100, y = 450) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0.1);
    this.speed = 200;
    this.jumpSpeed = -400;
    // fallback if texture missing: draw a rectangle
    if (!this.sprite.texture || this.sprite.texture.key === '__MISSING') {
      this.sprite.destroy();
      const g = scene.add.graphics();
      g.fillStyle(0xffff00, 1);
      g.fillRect(0, 0, 32, 48);
      const tex = g.generateTexture('player-fallback', 32, 48);
      g.destroy();
      this.sprite = scene.physics.add.sprite(x, y, 'player-fallback');
      this.sprite.setCollideWorldBounds(true);
    }
  }

  update(cursors) {
    if (!cursors) return;
    const body = this.sprite.body;
    if (cursors.left.isDown) {
      this.sprite.setVelocityX(-this.speed);
    } else if (cursors.right.isDown) {
      this.sprite.setVelocityX(this.speed);
    } else {
      this.sprite.setVelocityX(0);
    }

    if (cursors.up.isDown && body.blocked.down) {
      this.sprite.setVelocityY(this.jumpSpeed);
    }
  }
}
