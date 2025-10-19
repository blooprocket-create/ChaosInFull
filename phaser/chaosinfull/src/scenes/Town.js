// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class Town extends Phaser.Scene {
    constructor() {
        super('Town');
    }

    init() {
        // Initialize scene
    }

    preload() {
    // Load assets
    this.load.image('town_bg', 'assets/town_bg.png');
    // dude.png is a spritesheet. Assuming frame size 32x48 (standard Phaser example)
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        // Remove default black background
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Add background image, scaled to fill
        const bg = this.add.image(400, 300, 'town_bg');
        bg.setDisplaySize(800, 600);
        bg.setDepth(0);

        // Add platform (simple rectangle for now)
    const platform = this.add.rectangle(400, 570, 800, 60, 0x222222, 0.8);
    platform.setStrokeStyle(4, 0xa00);
    platform.setDepth(1);
    // Enable physics on platform
    this.physics.add.existing(platform, true); // true => static body

        // Add player sprite with Arcade physics
        this.player = this.physics.add.sprite(400, 500, 'dude');
        this.player.setDepth(2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 40).setOffset(6, 8);

        // Collide player with platform
        this.physics.add.collider(this.player, platform);

        // Create animations (idle, left, right)
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [ { key: 'dude', frame: 4 } ],
            frameRate: 20
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Get character data from scene start
        const char = this.sys.settings.data?.character;
        const name = char?.name || 'Character';
        const level = char?.level || 1;
        const maxhp = char?.maxhp || (100 + level * 10 + ((char?.stats?.str || 0) * 10));
        const hp = char?.hp || maxhp;
        const maxmana = char?.maxmana || (50 + level * 5 + ((char?.stats?.int || 0) * 10));
        const mana = char?.mana || maxmana;
        const exp = char?.exp || 0;
        const expToLevel = char?.expToLevel || 100;

        // Minimal HUD
        const hud = document.createElement('div');
        hud.id = 'town-hud';
        hud.style.position = 'fixed';
        hud.style.top = '8px';
        hud.style.left = '8px';
        hud.style.transform = '';
        hud.style.width = '200px';
        hud.style.padding = '8px 8px 8px 8px';
        hud.style.zIndex = '100';
        hud.style.pointerEvents = 'none';
        hud.style.display = 'flex';
        hud.style.flexDirection = 'column';
        hud.style.alignItems = 'flex-start';
        hud.style.justifyContent = 'flex-start';
        hud.style.background = 'rgba(20,10,30,0.55)';
        hud.style.backdropFilter = 'blur(8px)';
        hud.style.boxShadow = '0 0 48px 0 #111, 0 0 0 2px #a00 inset';
        hud.style.borderRadius = '16px';
        hud.style.fontFamily = 'UnifrakturCook, cursive';
        hud.style.color = '#eee';
        hud.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px;">
                <span style="font-size:1em; font-weight:700; color:#e44; letter-spacing:1px;">${name} <span style='color:#fff; font-size:0.9em;'>- Lv ${level}</span></span>
                <button id="hud-charselect-btn" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85; transition:background 0.2s;">⇦</button>
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
            </div>
        `;
        document.body.appendChild(hud);

        // Add event for tiny character select button
        setTimeout(() => {
            const btn = document.getElementById('hud-charselect-btn');
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.scene.start('CharacterSelect');
                };
            }
        }, 0);

        // Remove HUD on scene shutdown
        this.events.once('shutdown', () => {
            if (hud.parentNode) hud.remove();
        });
        
        // Update loop handled in scene update
    }

    update(time, delta) {
        if (!this.player || !this.cursors) return;
        const speed = 180;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        // Jump
        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-380);
        }
    }

}
