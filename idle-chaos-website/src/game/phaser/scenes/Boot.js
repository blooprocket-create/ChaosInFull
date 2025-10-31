// Minimal boot scene: preload assets that must be available to all scenes before create()
import { applyCombatMixin } from './shared/combat.js';
export class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
        // ensure portal spritesheet is loaded early to avoid animation race conditions
        try { this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 }); } catch (e) { /* ignore */ }
        // Preload player animation assets from the 'dude' folder so animations are available globally
        try { this.load.spritesheet('dude_walk', 'assets/dude/walk.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('dude_run', 'assets/dude/run.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('dude_mine', 'assets/dude/slash.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('dude_idle', 'assets/dude/idle.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        // Terror Form variants: preloaded so we can swap animations at runtime
        try { this.load.spritesheet('dude_walk_terror', 'assets/dude/terrorForm/walk.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('dude_run_terror', 'assets/dude/terrorForm/run.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        // slash in terror form uses 128px frames (special note)
        try { this.load.spritesheet('dude_mine_terror', 'assets/dude/terrorForm/slash_128.png', { frameWidth: 128, frameHeight: 128 }); } catch (e) {}
        try { this.load.spritesheet('dude_idle_terror', 'assets/dude/terrorForm/idle.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('rowan_walk', 'assets/Rowan/walk.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('rowan_idle', 'assets/Rowan/idle.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        try { this.load.spritesheet('mother_idle', 'assets/Mother/idle.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
        // Tree spritesheets (1 row, 8 frames, 6fps expected). Files live under assets/trees/
        try { this.load.spritesheet('normal_tree', 'assets/trees/normal_tree_sway.png', { frameWidth: 48, frameHeight: 80 }); } catch (e) {}
        try { this.load.spritesheet('oak_tree', 'assets/trees/oak_tree_sway.png', { frameWidth: 96, frameHeight: 96 }); } catch (e) {}
        try { this.load.spritesheet('pine_tree', 'assets/trees/pine_tree_sway.png', { frameWidth: 48, frameHeight: 80 }); } catch (e) {}
        try { this.load.spritesheet('birch_tree', 'assets/trees/birch_tree_sway.png', { frameWidth: 48, frameHeight: 80 }); } catch (e) {}
        try { this.load.spritesheet('maple_tree', 'assets/trees/maple_tree_sway.png', { frameWidth: 96, frameHeight: 96 }); } catch (e) {}
    // preload login/character select music (optional file under sound/)
    try { this.load.audio('login_music', 'sound/evolution.mp3'); } catch (e) { /* ignore if missing */ }
    // preload town music
    try { this.load.audio('town_music', 'sound/town.mp3'); } catch (e) { /* ignore if missing */ }
    // Grass ground tiles (3x3 spritesheets, 64px frames)
    try { this.load.spritesheet('grass_01', 'assets/tileset/grass_01.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
    try { this.load.spritesheet('grass_02', 'assets/tileset/grass_02.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
    // Forest ground tiles (3x3 spritesheets, 64px frames)
    try { this.load.spritesheet('forest_01', 'assets/tileset/forest_01.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
    try { this.load.spritesheet('forest_02', 'assets/tileset/forest_02.png', { frameWidth: 64, frameHeight: 64 }); } catch (e) {}
    }
    create() {
        // Register global player animations once so all scenes can use the same keys
        try {
            // Create directional walk/run/idle animations from the spritesheets laid out as 4 rows:
            // row0 = up, row1 = left, row2 = down, row3 = right. Columns are frames.
            const dirs = ['up', 'left', 'down', 'right'];
            // helper to generate directional animations for a spritesheet
            const makeDirectional = (sheetKey, baseName, frameRate, repeat, singleFrameForIdle = false) => {
                try {
                    const tex = this.textures.get(sheetKey);
                    let frameNames = [];
                    if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
                    const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
                    const rows = 4;
                    const framesPerRow = totalFrames > 0 ? Math.floor(totalFrames / rows) : 0;
                    if (framesPerRow > 0) {
                        for (let r = 0; r < rows; r++) {
                            const dir = dirs[r];
                            const start = r * framesPerRow;
                            const end = start + framesPerRow - 1;
                            const key = baseName + '_' + dir;
                            if (this.anims.exists(key)) continue;
                            try {
                                if (singleFrameForIdle) {
                                    // idle: use the first frame of the row
                                    this.anims.create({ key: key, frames: this.anims.generateFrameNumbers(sheetKey, { start: start, end: start }), frameRate: frameRate, repeat: repeat });
                                } else {
                                    this.anims.create({ key: key, frames: this.anims.generateFrameNumbers(sheetKey, { start: start, end: end }), frameRate: frameRate, repeat: repeat });
                                }
                            } catch (e) { /* ignore per-dir creation errors */ }
                        }
                        return;
                    }
                } catch (e) { /* ignore texture checks */ }
                // fallback: create a non-directional animation if directional couldn't be produced
                const fallbackKey = baseName;
                if (!this.anims.exists(fallbackKey)) {
                    try {
                        const frames = this.anims.generateFrameNumbers(sheetKey);
                        if (frames && frames.length) this.anims.create({ key: fallbackKey, frames: frames, frameRate: frameRate, repeat: repeat });
                    } catch (e) { /* ignore */ }
                }
            };

            // Create directional versions
            makeDirectional('dude_walk', 'walk', 8, -1, false);
            makeDirectional('dude_run', 'run', 12, -1, false);
            // For idle prefer a single-frame per-direction (first column)
            makeDirectional('dude_idle', 'idle', 4, -1, true);
            // create directional mining animation placeholders (up/left/down/right).
            // The actual animations will be recreated in-scene to match swing duration, but create keys so scenes can reference them safely.
            const dirKeys = ['up', 'left', 'down', 'right'];
            for (const d of dirKeys) {
                const key = 'mine_' + d;
                if (!this.anims.exists(key)) {
                    let frames = [];
                    try { frames = this.anims.generateFrameNumbers('dude_mine'); } catch (e) { frames = []; }
                    // fall back to full-sheet frames for the placeholder; scene will override with directional slice
                    if (frames && frames.length) {
                        try { this.anims.create({ key: key, frames: frames, frameRate: 8, repeat: 0 }); } catch (e) { /* ignore */ }
                    }
                }
            }
            // Create looping tree animations for each tree spritesheet if present.
            try {
                const treeTypes = ['normal', 'oak', 'pine', 'birch', 'maple'];
                for (const t of treeTypes) {
                    const sheetKey = `${t}_tree`;
                    const animKey = `tree_${t}`;
                    try {
                        if (this.textures.exists && this.textures.exists(sheetKey) && !this.anims.exists(animKey)) {
                            // Assuming 8 frames laid out in a single row (0..7)
                            try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(sheetKey, { start: 0, end: 7 }), frameRate: 6, repeat: -1 }); } catch (e) { /* ignore */ }
                        }
                    } catch (e) { /* ignore per-tree errors */ }
                }
                // Create ground/grass animations for tiled ground sprites (3x3 -> frames 0..8)
                try {
                    const groundSheets = ['grass_01', 'grass_02', 'forest_01', 'forest_02'];
                    for (const gs of groundSheets) {
                        const key = `ground_${gs}`;
                        try {
                            if (this.textures.exists && this.textures.exists(gs) && !this.anims.exists(key)) {
                                this.anims.create({ key: key, frames: this.anims.generateFrameNumbers(gs, { start: 0, end: 8 }), frameRate: 6, repeat: -1 });
                            }
                        } catch (e) { /* ignore per-ground anim errors */ }
                    }
                } catch (e) { /* ignore ground anim creation errors */ }
            } catch (e) { /* ignore tree animation registration errors */ }
        } catch (e) { /* ignore animation registration errors */ }

    // immediately start the next scene (real startup order is controlled from main)
    this.scene.start('Login');
    }
}

export default Boot;

applyCombatMixin(Boot.prototype);
