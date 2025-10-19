// Phaser is loaded globally from CDN

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.add.text(400, 50, 'Game Scene', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
        this.add.text(400, 120, 'Tutorial: Use arrow keys to move.', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
        // TODO: Expand tutorial and gameplay
    }
}
