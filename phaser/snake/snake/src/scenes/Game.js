export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.add.image(0,0, 'sky').setOrigin(0, 0);

        this.platforms = this.physics.add.staticGroup();

        this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();

        this.platforms.create(600, 400, 'ground');
        this.platforms.create(50, 250, 'ground');
        this.platforms.create(750, 220, 'ground');
    }

    update(){

    }
}
