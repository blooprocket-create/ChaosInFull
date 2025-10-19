// Clean Town scene implementation
export class Town extends Phaser.Scene {
    constructor() { super('Town'); }

    preload() {
        this.load.image('town_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Fog overlay (DOM canvas below HUD)
        this._createFog();

        // Background and platform
        const bg = this.add.image(400, 300, 'town_bg');
        bg.setDisplaySize(800, 600);
        bg.setDepth(0);

        const platform = this.add.rectangle(400, 570, 800, 60, 0x222222, 0.8);
        platform.setStrokeStyle(4, 0xa00);
        platform.setDepth(1);
        this.physics.add.existing(platform, true);

        // Player
        this.player = this.physics.add.sprite(400, 500, 'dude');
        this.player.setDepth(2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 40);
        this.player.body.setOffset(6, 8);
        this.physics.add.collider(this.player, platform);

        // Animations
        this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
        this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

        // Input (WASD + E)
        this.keys = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E });

        // Character data
        const char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!char.mining) char.mining = { level: 1, exp: 0, expToLevel: 100 };
        this.char = char;

        // HUD
        this._createHUD();

        // Portal on left
        const portalX = 80;
        const portalY = 500;
        this.portal = this.add.circle(portalX, portalY, 28, 0x6644aa, 0.9).setDepth(1.5);
        this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Enter Cave', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.portalPrompt.setVisible(false);

        // cleanup on shutdown
        this._fogResizeHandler = () => {
            if (this.fogCanvas) {
                this.fogCanvas.width = window.innerWidth;
                this.fogCanvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', this._fogResizeHandler);

        this.events.once('shutdown', () => {
            this._destroyHUD();
            this._stopFog();
            window.removeEventListener('resize', this._fogResizeHandler);
        });
    }

    // --- Fog helpers ---
    _createFog() {
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.id = 'town-fog-canvas';
        this.fogCanvas.width = window.innerWidth;
        this.fogCanvas.height = window.innerHeight;
        this.fogCanvas.style.position = 'fixed';
        this.fogCanvas.style.left = '0';
        this.fogCanvas.style.top = '0';
        this.fogCanvas.style.width = '100vw';
        this.fogCanvas.style.height = '100vh';
        this.fogCanvas.style.pointerEvents = 'none';
        this.fogCanvas.style.zIndex = '99'; // below HUD (100)
        document.body.appendChild(this.fogCanvas);
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.fogParticles = [];
        for (let i = 0; i < 120; i++) {
            this.fogParticles.push({ x: Math.random() * this.fogCanvas.width, y: Math.random() * this.fogCanvas.height, r: 30 + Math.random() * 80, vx: 0.08 + Math.random() * 0.2, vy: -0.02 + Math.random() * 0.06, alpha: 0.06 + Math.random() * 0.12 });
        }
        this._startFog();
    }

    _startFog() {
        const that = this;
        function loop() {
            if (!that.fogCtx) return;
            that.fogCtx.clearRect(0, 0, that.fogCanvas.width, that.fogCanvas.height);
            for (let p of that.fogParticles) {
                that.fogCtx.beginPath();
                that.fogCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                that.fogCtx.fillStyle = 'rgba(200,180,200,0.12)';
                that.fogCtx.globalAlpha = p.alpha;
                that.fogCtx.fill();
                that.fogCtx.globalAlpha = 1;
                p.x += p.vx; p.y += p.vy;
                if (p.x - p.r > that.fogCanvas.width) p.x = -p.r;
                if (p.y + p.r < 0) p.y = that.fogCanvas.height + p.r;
            }
            that._fogRaf = requestAnimationFrame(loop);
        }
        this._fogRaf = requestAnimationFrame(loop);
    }

    _stopFog() {
        if (this._fogRaf) {
            cancelAnimationFrame(this._fogRaf);
            this._fogRaf = null;
        }
        if (this.fogCanvas && this.fogCanvas.parentNode) {
            this.fogCanvas.parentNode.removeChild(this.fogCanvas);
            this.fogCanvas = null;
            this.fogCtx = null;
        }
    }

    // --- HUD helpers ---
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
        const mining = char.mining || { level: 1, exp: 0, expToLevel: 100 };

        this.hud = document.createElement('div');
        this.hud.id = 'town-hud';
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
                <button id="hud-charselect-btn" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">⇦</button>
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
                <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, (exp / expToLevel) * 100))}%; background:#ee4; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${exp}/${expToLevel}</span>
                </div>
                <!-- Mining bar removed per request: mining tracked in data only -->
            </div>
        `;

        document.body.appendChild(this.hud);

        // attach click handler to button (allow pointer events only on the button)
        setTimeout(() => {
            const btn = document.getElementById('hud-charselect-btn');
            if (btn) {
                btn.onclick = (e) => { e.stopPropagation(); this.scene.start('CharacterSelect'); };
            }
        }, 0);
    }

    _destroyHUD() {
        if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
        this.hud = null;
    }

    // Persist mining skill to localStorage (finds char by name)
    _persistMiningForActiveChar(username) {
        if (!username || !this.char) return;
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key));
            if (userObj && userObj.characters) {
                for (let i = 0; i < userObj.characters.length; i++) {
                    if (userObj.characters[i] && userObj.characters[i].name === this.char.name) {
                        userObj.characters[i].mining = this.char.mining;
                        localStorage.setItem(key, JSON.stringify(userObj));
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('Could not persist mining skill', e);
        }
    }

    _stopFog() {
        if (this._fogRaf) cancelAnimationFrame(this._fogRaf);
        this._fogRaf = null;
        if (this.fogCanvas && this.fogCanvas.parentNode) this.fogCanvas.parentNode.removeChild(this.fogCanvas);
        this.fogCanvas = null;
        this.fogCtx = null;
    }

    update() {
        if (!this.player || !this.keys) return;
        const speed = 180;
        if (this.keys.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('left', true);
        } else if (this.keys.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (this.keys.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-380);
        }

        // Portal interaction: proximity + E to enter
        if (this.portal) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
            if (dist <= 56) {
                this.portalPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    this._persistMiningForActiveChar(username);
                    this.scene.start('Cave', { character: this.char, username: username });
                }
            } else {
                this.portalPrompt.setVisible(false);
            }
        }
    }
}

