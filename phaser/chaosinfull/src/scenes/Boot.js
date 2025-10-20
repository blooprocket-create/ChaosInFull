// Minimal boot scene: preload assets that must be available to all scenes before create()
export class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
        // ensure portal spritesheet is loaded early to avoid animation race conditions
        try { this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 }); } catch (e) { /* ignore */ }
    }
    create() {
        // immediately start the next scene (real startup order is controlled from main)
        this.scene.start('Login');
    }
}

export default Boot;
