// Cave scene: HUD similar to Town, WASD+E controls, right-side portal, one mining node for testing
export class Cave extends Phaser.Scene {
    constructor() {
        super('Cave');
    }

    preload() {
        this.load.image('cave_bg', 'assets/cave_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        const bg = this.add.image(400, 300, 'cave_bg');
        bg.setDisplaySize(800, 600);

        this.add.text(400, 32, 'The Cave', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

    // Player spawn
    this.player = this.physics.add.sprite(400, 420, 'dude');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 40);
    this.player.body.setOffset(6, 8);

    // Platform for the cave (player and nodes land on this)
    const platformY = 520;
    const platform = this.add.rectangle(400, platformY, 800, 64, 0x443322, 1);
    platform.setDepth(1);
    this.physics.add.existing(platform, true);
    this.physics.add.collider(this.player, platform);

        // Animations (reuse frames if not already created)
        if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
        if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

        // Input: WASD + E
        this.keys = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E });

        // Character data from scene settings
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];

        // HUD (same condensed HUD as Town, without mining bar)
        this._createHUD();

    // Right-side portal to return to Town; requires proximity + E
        const portalX = 720, portalY = 500;
        this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
        this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.portalPrompt.setVisible(false);

    // Mining node for testing: place it on the platform so it sits naturally
    const nodeX = 520;
    const nodeRadius = 28;
    const platformTop = platformY - (64 / 2);
    const nodeY = platformTop - nodeRadius; // sits on top of the platform
    this._createMiningNode(nodeX, nodeY);

        // Toast container
        this._toastContainer = null;

        // cleanup on shutdown
        this.events.once('shutdown', () => {
            this._destroyHUD();
            this._clearToasts();
        });
    }

    // HUD copied/adapted from Town (without mining bar)
    _createHUD() {
        const char = this.char || {};
        const name = char.name || 'Character';
        const level = char.level || 1;
        const maxhp = char.maxhp || (100 + level * 10 + ((char.stats && char.stats.str) || 0) * 10);
        const hp = char.hp || maxhp;
        const maxmana = char.maxmana || (50 + level * 5 + ((char.stats && char.stats.int) || 0) * 10);
        const mana = char.mana || maxmana;
        const exp = char.exp || 0;
        const expToLevel = char.expToLevel || 100;

        this.hud = document.createElement('div');
        this.hud.id = 'cave-hud';
        this.hud.style.position = 'fixed';
        this.hud.style.top = '8px';
        this.hud.style.left = '8px';
        this.hud.style.width = '200px';
        this.hud.style.padding = '8px';
        this.hud.style.zIndex = '100';
        this.hud.style.pointerEvents = 'none';
        this.hud.style.display = 'flex';
        this.hud.style.flexDirection = 'column';
        this.hud.style.alignItems = 'flex-start';
        this.hud.style.background = 'rgba(20,10,30,0.55)';
        this.hud.style.backdropFilter = 'blur(8px)';
        this.hud.style.borderRadius = '16px';
        this.hud.style.color = '#eee';
        this.hud.style.fontFamily = 'UnifrakturCook, cursive';

        this.hud.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px;">
                <span style="font-size:1em; font-weight:700; color:#e44; letter-spacing:1px;">${name} <span style='color:#fff; font-size:0.9em;'>- Lv ${level}</span></span>
                <button id="cave-hud-charselect-btn" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">⇦</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
                <div style="height:12px; background:#2a0a16; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, (hp / maxhp) * 100))}%; background:#e44; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${hp}/${maxhp}</span>
                </div>
                <div style="height:12px; background:#181a2a; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, (mana / maxmana) * 100))}%; background:#44e; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${mana}/${maxmana}</span>
                </div>
                <!-- Replace class EXP with mining EXP while in the cave -->
                <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, ((char.mining && char.mining.exp) || 0) / ((char.mining && char.mining.expToLevel) || 100) * 100))}%; background:#9b7; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">Mining L${(char.mining && char.mining.level) || 1} ${(char.mining && char.mining.exp) || 0}/${(char.mining && char.mining.expToLevel) || 100}</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.hud);

        setTimeout(() => {
            const btn = document.getElementById('cave-hud-charselect-btn');
            if (btn) btn.onclick = (e) => { e.stopPropagation(); this.scene.start('CharacterSelect'); };
        }, 0);
    }

    _destroyHUD() {
        if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
        this.hud = null;
    }

    // --- Mining node creation ---
    _createMiningNode(x, y) {
        this.miningNode = this.add.circle(x, y, 28, 0x8a7766, 1).setDepth(1.2);
        this.miningNodePrompt = this.add.text(x, y - 60, '[E] Mine', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.miningNodePrompt.setVisible(false);
        this.miningCooldown = 0;
    }

    // --- Toasts ---
    _showToast(text, timeout = 1600) {
        if (!this._toastContainer) {
            this._toastContainer = document.createElement('div');
            this._toastContainer.style.position = 'fixed';
            this._toastContainer.style.bottom = '14px';
            this._toastContainer.style.left = '50%';
            this._toastContainer.style.transform = 'translateX(-50%)';
            this._toastContainer.style.zIndex = '110';
            this._toastContainer.style.pointerEvents = 'none';
            document.body.appendChild(this._toastContainer);
        }
        const el = document.createElement('div');
        el.textContent = text;
        el.style.background = 'rgba(10,10,12,0.85)';
        el.style.color = '#fff';
        el.style.padding = '8px 12px';
        el.style.marginTop = '6px';
        el.style.borderRadius = '8px';
        el.style.fontFamily = 'UnifrakturCook, cursive';
        el.style.opacity = '0';
        el.style.transition = 'opacity 180ms ease, transform 220ms ease';
        el.style.transform = 'translateY(6px)';
        this._toastContainer.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 220); }, timeout);
    }

    _clearToasts() {
        if (this._toastContainer && this._toastContainer.parentNode) this._toastContainer.parentNode.removeChild(this._toastContainer);
        this._toastContainer = null;
    }

    // Persist mining and inventory changes to localStorage (by name match)
    _persistCharacter(username) {
        if (!username || !this.char) return;
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key));
            if (userObj && userObj.characters) {
                for (let i = 0; i < userObj.characters.length; i++) {
                    if (userObj.characters[i] && userObj.characters[i].name === this.char.name) {
                        userObj.characters[i].mining = this.char.mining;
                        userObj.characters[i].inventory = this.char.inventory;
                        localStorage.setItem(key, JSON.stringify(userObj));
                        break;
                    }
                }
            }
        } catch (e) { console.warn('Could not persist character', e); }
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const speed = 180;
        if (this.keys.left.isDown) { this.player.setVelocityX(-speed); this.player.anims.play('left', true); }
        else if (this.keys.right.isDown) { this.player.setVelocityX(speed); this.player.anims.play('right', true); }
        else { this.player.setVelocityX(0); this.player.anims.play('turn'); }
        if (this.keys.up.isDown && this.player.body.blocked.down) this.player.setVelocityY(-380);

        // portal interaction
        if (this.portal) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
            if (dist <= 56) {
                this.portalPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    this._persistCharacter(username);
                    this.scene.start('Town', { character: this.char, username: username });
                }
            } else { this.portalPrompt.setVisible(false); }
        }

        // mining node interaction
        if (this.miningNode) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.miningNode.x, this.miningNode.y);
            if (dist <= 56) {
                this.miningNodePrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && (!this.miningCooldown || time - this.miningCooldown > 600)) {
                    this.miningCooldown = time;
                    this._attemptMine();
                }
            } else {
                this.miningNodePrompt.setVisible(false);
            }
        }
    }

    // Mining attempt logic: success grants 15 exp + item, failure 5 exp
    _attemptMine() {
        const mining = this.char.mining || { level: 1, exp: 0, expToLevel: 100 };
        const str = (this.char.stats && this.char.stats.str) || 0;
        // chance formula: base 0.35 + 0.03*mining.level + 0.015*str, clamped
        let chance = 0.35 + 0.03 * (mining.level || 1) + 0.015 * str;
        chance = Math.max(0.05, Math.min(0.9, chance));
        const gotOre = Math.random() < chance;
        if (gotOre) {
            // award item
            this.char.inventory = this.char.inventory || [];
            this.char.inventory.push({ id: 'ore', name: 'Ore', qty: 1 });
            mining.exp = (mining.exp || 0) + 15;
            this._showToast('You mined ore! (+15 mining XP)');
        } else {
            mining.exp = (mining.exp || 0) + 5;
            this._showToast('You swing and find nothing. (+5 mining XP)');
        }

        // check level up
        while (mining.exp >= mining.expToLevel) {
            mining.exp -= mining.expToLevel;
            mining.level = (mining.level || 1) + 1;
            mining.expToLevel = Math.floor(mining.expToLevel * 1.25);
            this._showToast('Mining level up! L' + mining.level, 2200);
        }

        this.char.mining = mining;

        // persist immediately
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);

        // update HUD (simple re-render of HUD element)
        this._destroyHUD();
        this._createHUD();
    }
}
