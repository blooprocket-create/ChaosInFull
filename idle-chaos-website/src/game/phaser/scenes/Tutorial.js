import { createPlayer } from '../shared/playerFactory.js';
import { attachCommonKeys } from './shared/keys.js';
import { loadUser, saveUser } from './shared/storage.js';
import { attach, addTimeEvent, registerDisposer } from '../shared/cleanupManager.js';

export class Tutorial extends Phaser.Scene {
    constructor() { super('Tutorial'); }

    init(data) {
        // Accept character and lastLocation (from CharacterSelect)
        this._character = data && data.character;
        this._username = data && data.username;
        this._lastLocation = data && data.lastLocation;
    }

    create() {
        // attach cleanup manager early
        try { attach(this); } catch (e) {}
        // Show the game canvas (CharacterSelect hid it)
        try { const gc = document.getElementById('game-container'); if (gc) gc.style.display = ''; } catch (e) {}

        // Simple world layout: small flat area with a few markers
        this.cameras.main.setBackgroundColor('#203040');
        this.physics.world.setBounds(0, 0, 1280, 720);

        // Spawn player
        const spawnX = (this._character && this._character.lastLocation && this._character.lastLocation.x) ? this._character.lastLocation.x : 160;
        const spawnY = (this._character && this._character.lastLocation && this._character.lastLocation.y) ? this._character.lastLocation.y : 360;
        this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');
        this.player.setDepth(5);

        // Simple movement controls + shared UI keys
        this.cursors = this.input.keyboard.createCursorKeys();
        // Prefer the shared key binder which wires real UI modals (I/X/U/T) consistently
        try {
            this.keys = attachCommonKeys(this);
        } catch (e) {
            this.keys = this.input.keyboard.addKeys({ W: 'W', A: 'A', S: 'S', D: 'D', E: 'E', SPACE: 'SPACE', I: 'I', X: 'X', U: 'U', T: 'T' });
        }
        // keep explicit references for E and Space so tests below are simple and consistent
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        // track UI key presses locally so tutorial can auto-advance when each is pressed (auto-clean on shutdown)
        try {
            const onI = () => { this.uiKeysPressed.I = true; };
            const onX = () => { this.uiKeysPressed.X = true; };
            const onU = () => { this.uiKeysPressed.U = true; };
            const onT = () => { this.uiKeysPressed.T = true; };
            this.input.keyboard.on('keydown-I', onI);
            this.input.keyboard.on('keydown-X', onX);
            this.input.keyboard.on('keydown-U', onU);
            this.input.keyboard.on('keydown-T', onT);
            registerDisposer(this, () => { try { this.input.keyboard.off('keydown-I', onI); } catch (e) {} });
            registerDisposer(this, () => { try { this.input.keyboard.off('keydown-X', onX); } catch (e) {} });
            registerDisposer(this, () => { try { this.input.keyboard.off('keydown-U', onU); } catch (e) {} });
            registerDisposer(this, () => { try { this.input.keyboard.off('keydown-T', onT); } catch (e) {} });
        } catch (e) {}

        // Create markers and interactive objects
        this.markers = {};
        // Move target (blue circle)
        const moveX = 400, moveY = 360;
        const gMove = this.add.graphics();
        gMove.fillStyle(0x2a9df4, 0.9);
        gMove.fillCircle(moveX, moveY, 28);
        gMove.setDepth(1);
        this.markers.move = { x: moveX, y: moveY, g: gMove };

        // Crate to interact with (E)
        const crateX = 650, crateY = 360;
        const crate = this.add.rectangle(crateX, crateY, 48, 48, 0x8b5a2b).setDepth(2);
        this.physics.add.existing(crate, true);
    this.markers.crate = { x: crateX, y: crateY, obj: crate, interacted: false };
    // Visual prompt above crate (hidden until near)
    this.cratePrompt = this.add.text(crateX, crateY - 52, 'Press E', { font: '14px sans-serif', fill: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 4 } }).setDepth(60).setOrigin(0.5);
    this.cratePrompt.setVisible(false);

        // Training dummy for attack
        const dummyX = 900, dummyY = 360;
        const dummy = this.add.rectangle(dummyX, dummyY, 32, 64, 0xff6666).setDepth(2);
        this.physics.add.existing(dummy, true);
    this.markers.dummy = { x: dummyX, y: dummyY, obj: dummy, hp: 3 };
    // Visual prompt above dummy
    this.dummyPrompt = this.add.text(dummyX, dummyY - 72, 'Press Space', { font: '14px sans-serif', fill: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 4 } }).setDepth(60).setOrigin(0.5);
    this.dummyPrompt.setVisible(false);

        // HUD text (Phaser text so it's inside canvas)
        this.hudTitle = this.add.text(16, 16, '', { font: '22px sans-serif', fill: '#fff' }).setDepth(50);
        this.hudText = this.add.text(16, 46, '', { font: '16px sans-serif', fill: '#eeeeee', wordWrap: { width: 520 } }).setDepth(50);
        this.hudHint = this.add.text(16, 110, '', { font: '14px monospace', fill: '#ccc' }).setDepth(50);

        // Tutorial step state
        this.stepIndex = 0;
        this.uiKeysPressed = { I: false, X: false, U: false, T: false };

        this._setupStep(this.stepIndex);

        // Clean up on shutdown
        this.events.once('shutdown', () => {
            try { if (this.player && this.player.destroy) this.player.destroy(); } catch (e) {}
            try { if (this.hudTitle && this.hudTitle.destroy) this.hudTitle.destroy(); } catch (e) {}
        });
    }

    _setupStep(i) {
        const steps = [ 'Move', 'Interact', 'Attack', 'UI', 'Finish' ];
        this.stepIndex = i;
        const stepName = steps[i] || '';
        // Update HUD
        if (stepName === 'Move') {
            this.hudTitle.setText('Move');
            this.hudText.setText('Use arrow keys or WASD to move. Hold Shift while moving to run. Reach the blue circle on the left.');
            this.hudHint.setText('Hold Shift to run and reach the blue circle');
            this.moveRunDetected = false;
        } else if (stepName === 'Interact') {
            this.hudTitle.setText('Interact');
            this.hudText.setText('Press E to interact with objects. Approach the brown crate and press E to inspect it.');
            this.hudHint.setText('Press E near the crate');
        } else if (stepName === 'Attack') {
            this.hudTitle.setText('Attack');
            this.hudText.setText('Press Space to attack. Approach the red training dummy and press Space to damage it until it falls.');
            this.hudHint.setText('Press Space near the dummy');
        } else if (stepName === 'UI') {
            this.hudTitle.setText('UI & Character');
            this.hudText.setText('Inventory: I. View Stats: X. Open Equipment: U. Talent Tree: T. Press each key once to continue.');
            this.hudHint.setText('Press I, X, U, and T');
        } else {
            this.hudTitle.setText('Finish');
            this.hudText.setText('Tutorial complete. Press any movement key to continue to the world.');
            this.hudHint.setText('Continue');
        }
    }

    update(time, delta) {
        // Movement velocity
        const speed = 220;
        let vx = 0, vy = 0;
        // safe key checks: support both naming conventions returned by attachCommonKeys
        const keyIsDown = (k) => {
            try {
                if (!k) return false;
                if (typeof k.isDown === 'boolean') return k.isDown;
                return false;
            } catch (e) { return false; }
        };
        const leftDown = (this.cursors && this.cursors.left && keyIsDown(this.cursors.left)) || (this.keys && ((this.keys.A && keyIsDown(this.keys.A)) || (this.keys.left && keyIsDown(this.keys.left))));
        const rightDown = (this.cursors && this.cursors.right && keyIsDown(this.cursors.right)) || (this.keys && ((this.keys.D && keyIsDown(this.keys.D)) || (this.keys.right && keyIsDown(this.keys.right))));
        const upDown = (this.cursors && this.cursors.up && keyIsDown(this.cursors.up)) || (this.keys && ((this.keys.W && keyIsDown(this.keys.W)) || (this.keys.up && keyIsDown(this.keys.up))));
        const downDown = (this.cursors && this.cursors.down && keyIsDown(this.cursors.down)) || (this.keys && ((this.keys.S && keyIsDown(this.keys.S)) || (this.keys.down && keyIsDown(this.keys.down))));
        if (leftDown) vx = -speed;
        else if (rightDown) vx = speed;
        if (upDown) vy = -speed;
        else if (downDown) vy = speed;
        // Running (hold Shift) — attachCommonKeys maps a 'shift' key
        const shiftDown = (this.keys && this.keys.shift && keyIsDown(this.keys.shift));
        if (shiftDown) { vx *= 1.6; vy *= 1.6; }
        if (this.player && this.player.body) {
            this.player.body.setVelocity(vx, vy);
        }

        // Animation: choose idle/walk by direction using global animations created in Boot
        try {
            if (this.player) {
                const moving = Math.abs(vx) > 4 || Math.abs(vy) > 4;
                let dir = 'down';
                if (Math.abs(vx) > Math.abs(vy)) dir = (vx < 0) ? 'left' : 'right';
                else dir = (vy < 0) ? 'up' : 'down';
                const animKey = (moving ? 'walk_' : 'idle_') + dir;
                if (!this.player.anims || !this.player.anims.isPlaying || (this.player.anims.currentAnim && this.player.anims.currentAnim.key !== animKey)) {
                    try { this.player.anims.play(animKey); } catch (e) { /* animation may be missing for custom sprites; ignore */ }
                }
            }
        } catch (e) {}

        // Check step-specific conditions
        const step = this.stepIndex;
        if (step === 0) {
            // Move: detect distance to marker
            const m = this.markers.move;
            if (m && this.player) {
                const dx = this.player.x - m.x; const dy = this.player.y - m.y; const dist = Math.sqrt(dx*dx + dy*dy);
                // detect if player has used run mode at least once
                if (shiftDown && (Math.abs(vx) > 4 || Math.abs(vy) > 4)) this.moveRunDetected = true;
                // require reaching the marker and having run at least once
                if (dist < 40 && this.moveRunDetected) {
                    this._advanceStep();
                } else if (dist < 40 && !this.moveRunDetected) {
                    this.hudHint.setText('Hold Shift while moving to register a run and finish the step');
                }
            }
        } else if (step === 1) {
            // Interact: if near crate and E pressed
            const c = this.markers.crate;
            if (c && this.player) {
                const dx = this.player.x - c.x; const dy = this.player.y - c.y; const dist = Math.sqrt(dx*dx + dy*dy);
                // show crate prompt when near
                if (this.cratePrompt) this.cratePrompt.setVisible(dist < 80);
                if (dist < 48 && Phaser.Input.Keyboard.JustDown(this.keyE)) {
                    c.interacted = true;
                    // simple feedback: tint the crate
                    try { c.obj.fillColor = 0x7f4d24; } catch (e) {}
                    this.hudText.setText('You inspected the crate and found a scrap.');
                    this.hudHint.setText('Good job');
                    try { addTimeEvent(this, { delay: 800, callback: () => this._advanceStep() }); } catch (e) { this.time.delayedCall(800, () => this._advanceStep()); }
                }
            }
        } else if (step === 2) {
            // Attack: if near dummy and SPACE pressed
            const d = this.markers.dummy;
            if (d && this.player) {
                const dx = this.player.x - d.x; const dy = this.player.y - d.y; const dist = Math.sqrt(dx*dx + dy*dy);
                // show dummy prompt when near
                if (this.dummyPrompt) this.dummyPrompt.setVisible(dist < 120);
                if (dist < 80 && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                    d.hp -= 1;
                    // flash dummy to indicate hit
                    d.obj.fillColor = 0xffffff;
                    try { addTimeEvent(this, { delay: 120, callback: () => { try { d.obj.fillColor = 0xff6666; } catch (e) {} } }); } catch (e) { this.time.delayedCall(120, () => { try { d.obj.fillColor = 0xff6666; } catch (e2) {} }); }
                    this.hudText.setText(`Dummy hit! HP: ${d.hp}`);
                    if (d.hp <= 0) {
                        // remove dummy and advance
                        try { d.obj.destroy(); } catch (e) {}
                        try { addTimeEvent(this, { delay: 300, callback: () => this._advanceStep() }); } catch (e) { this.time.delayedCall(300, () => this._advanceStep()); }
                    }
                }
            }
        } else if (step === 3) {
            // UI keys: track presses for I, X, U, T
            if (Phaser.Input.Keyboard.JustDown(this.keyE)) {/* no-op: guard */}
            // I/X/U/T key presses are tracked via 'keydown' listeners registered in create()
            // update hint to show progress
            const done = Object.keys(this.uiKeysPressed).filter(k => this.uiKeysPressed[k]).length;
            this.hudHint.setText(`Pressed ${done}/4 keys (I,X,U,T)`);
            if (done >= 4) {
                this.hudText.setText('UI controls learned.');
                try { addTimeEvent(this, { delay: 500, callback: () => this._advanceStep() }); } catch (e) { this.time.delayedCall(500, () => this._advanceStep()); }
            }
        } else if (step === 4) {
            if (vx !== 0 || vy !== 0) {
                // On any movement key after finish, proceed to lastLocation or Town
                this._finishTutorial();
            }
        }

        // hide prompts if not in corresponding steps
        if (this.stepIndex !== 1 && this.cratePrompt) this.cratePrompt.setVisible(false);
        if (this.stepIndex !== 2 && this.dummyPrompt) this.dummyPrompt.setVisible(false);
    }

    _advanceStep() {
        this.stepIndex++;
        if (this.stepIndex >= 4) this.stepIndex = 4; // cap to Finish
        this._setupStep(this.stepIndex);
    }

    _finishTutorial() {
        // transition to saved lastLocation scene or Town by default
        const last = this._lastLocation;
        try { if (this.player && this.player.destroy) this.player.destroy(); } catch (e) {}
        // mark character as having completed the tutorial so we skip it next time
        try {
            if (this._character) this._character.tutorialCompleted = true;
            if (this._username) {
                const userObj = loadUser(this._username, null);
                if (userObj && Array.isArray(userObj.characters)) {
                    let found = false;
                    for (let i = 0; i < userObj.characters.length; i++) {
                        const uc = userObj.characters[i];
                        if (!uc) continue;
                        if ((uc.id && this._character && this._character.id && uc.id === this._character.id) || (!uc.id && uc.name === (this._character && this._character.name))) {
                            userObj.characters[i] = this._character;
                            found = true;
                            break;
                        }
                    }
                    if (!found && this._character) userObj.characters.push(this._character);
                    try { saveUser(this._username, userObj); } catch (e) { /* ignore save errors */ }
                }
            }
        } catch (e) { /* ignore persistence errors */ }

        if (last && last.scene) {
            // pass character and spawn coords
            this.scene.start(last.scene, { character: this._character, username: this._username, spawnX: last.x, spawnY: last.y });
        } else {
            this.scene.start('Town', { character: this._character, username: this._username });
        }
    }
}

export default Tutorial;
