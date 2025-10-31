import { applyCombatMixin } from './shared/combat.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setCircleCentered } from '../shared/physicsHelpers.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { computeEnemyStats } from '../data/statFormulas.js';
import { attach } from '../shared/cleanupManager.js';

export class InnerField extends Phaser.Scene {
    constructor() {
        super('InnerField');
    }

    preload() {
        this.load.image('inner_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        // Ensure cleanup manager is attached early for this scene
        try { attach(this); } catch (e) {}
        this.enemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const sceneData = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        this.username = sceneData.username || null;
        const dataChar = sceneData.character || {};
        this.char = dataChar || {};
        if (!this.char.inventory) this.char.inventory = [];
        if (!this.char.equipment) this.char.equipment = { head: null, armor: null, legs: null, boots: null, ring1: null, ring2: null, amulet: null, weapon: null, fishing: null, mining: null, woodcutting: null };
        if (!this.char.stats) this.char.stats = this.char.stats || { str: 0, int: 0, agi: 0, luk: 0 };
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };
        this._persistConfig = { sceneKey: 'InnerField' };
        setSceneKey('InnerField');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;

        const W = this.scale.width;
        const H = this.scale.height;
        const centerX = W / 2;
        const centerY = H / 2;
        // Procedurally generate a top-down grassy field
        try {
            this._fieldFloor = buildThemedFloor(this, 'field');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#0f1410');
        }
        applyAmbientFx(this, 'field');

        // bounds for object and enemy placement
        const margin = 64;
        this._bounds = { x1: margin, x2: W - margin, y1: 100, y2: H - 120 };

        // compute a sensible spawn/entry position (prefer left quarter)
        const spawnX = (sceneData.spawnX !== undefined && sceneData.spawnX !== null) ? sceneData.spawnX : Math.max(80, Math.round(W * 0.12));
        const spawnY = (sceneData.spawnY !== undefined && sceneData.spawnY !== null) ? sceneData.spawnY : Math.round(centerY + (H * 0.12));

    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');

        // Player animations are registered in Boot: use 'walk','run','idle','mine'.

        this.keys = (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) ? window.__shared_keys.attachCommonKeys(this) : null;
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackCooldown = 520;
    this.attackRange = 68;
    this.nextAttackTime = 0;
    // AutoCombat removed; init call intentionally omitted.
        this.damageLayer = this.add.layer();
        this.damageLayer.setDepth(6);

        this._createHUD();
        this._createPlayerHealthBar();

        this.enemies = this.physics.add.group();
        // generate some decorative flora similar to Town (muted)
        this._decorations = [];
        const decorCount = Math.max(28, Math.round((W * H) / 70000));
        for (let i = 0; i < decorCount; i++) {
            let dx = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
            let dy = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
            let tries = 0;
            while (Phaser.Math.Distance.Between(dx, dy, centerX, centerY) < 40 && tries < 8) {
                dx = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
                dy = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
                tries++;
            }
            const type = (Math.random() < 0.7) ? 'grass' : 'flower';
            let disp = null;
            try {
                const varDepth = 0.6 + ((dy || 0) / Math.max(1, H)) * 0.2;
                if (type === 'grass') {
                    const r = Phaser.Math.Between(8, 14);
                    disp = this.add.ellipse(dx, dy, r * 1.6, r * 0.9, 0x173a17, 1).setDepth(varDepth);
                    disp.setAlpha(0.85);
                } else {
                    const petal = this.add.circle(0, -2, 6, 0x6b2f6b, 1);
                    const center = this.add.circle(0, -2, 2, 0xcc9933, 1);
                    try { disp = this.add.container(dx, dy, [petal, center]); disp.setDepth(varDepth); } catch (e) { disp = petal; if (disp && typeof disp.setDepth === 'function') disp.setDepth(varDepth); }
                }
            } catch (e) { try { disp = this.add.circle(dx, dy, 6, 0x173a17, 1).setDepth(0.6); } catch (e) { disp = null; } }
            if (disp) this._decorations.push({ x: dx, y: dy, type: type, display: disp });
        }
        swayDecorations(this, this._decorations);

        // generate simple slime textures (graphics-based) so we don't need external assets
        try {
            const sg = this.make.graphics({ x: 0, y: 0, add: false });
            // common
            sg.clear(); sg.fillStyle(0x4edd66, 1); sg.fillCircle(16, 16, 14); sg.generateTexture('slime_common', 32, 32);
            // epic
            sg.clear(); sg.fillStyle(0x66ddff, 1); sg.fillCircle(18, 18, 16); sg.generateTexture('slime_epic', 36, 36);
            // boss
            sg.clear(); sg.fillStyle(0xff66aa, 1); sg.fillCircle(22, 22, 20); sg.generateTexture('slime_boss', 44, 44);
            sg.destroy();
        } catch (e) { /* ignore texture gen errors */ }

            // generate simple obstacle textures (rocks/fences/walls)
            try {
                const og = this.make.graphics({ x: 0, y: 0, add: false });
                og.clear(); og.fillStyle(0x6b5342, 1); og.fillCircle(12, 12, 12); og.generateTexture('rock_small', 24, 24);
                og.clear(); og.fillStyle(0x7b5a3b, 1); og.fillRect(0, 0, 48, 12); og.generateTexture('fence', 48, 12);
                og.clear(); og.fillStyle(0x3a2f2b, 1); og.fillRect(0, 0, 80, 16); og.generateTexture('wall', 80, 16);
                og.destroy();
            } catch (e) { /* ignore */ }

            // obstacles group and colliders
            this.obstacles = this.physics.add.staticGroup();
            this._buildObstacles();
            this.physics.add.collider(this.player, this.obstacles);
            this.physics.add.collider(this.enemies, this.obstacles);

        // randomized spawn points across bounds
        this.spawnPoints = this._buildSpawnPoints();
        this.spawnPoints.forEach(sp => this._spawnEnemy(sp));

        // collide player <-> enemies via overlap callback for knockback/damage handled in AI
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            if (!enemy.getData('alive')) return;
            // slight knockback away from enemy
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            const kx = Math.cos(angle) * 120; const ky = Math.sin(angle) * 120;
            try { player.body.velocity.x += kx; player.body.velocity.y += ky; } catch (e) {}
        });

    // place portals vertically within our placement bounds (avoid edges)
    const portalY = Phaser.Math.Clamp(centerY, this._bounds.y1 + 40, this._bounds.y2 - 40);
    this._createPortals(portalY);
        this._updateHUD();

        this.events.once('shutdown', () => this.shutdown());
    }

    update() {
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.2 });
        if (!movement) return;
        const hasManualInput = movement.hasInput;
        const skipManualAnim = this.autoAttack && !hasManualInput;
        if (!this._attacking && !skipManualAnim) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });
        if (this.autoToggleKey && Phaser.Input.Keyboard.JustDown(this.autoToggleKey)) this._toggleAutoAttack();

        // allow holding the attack key to repeatedly attempt attacks; sharedTryAttack enforces cooldown
        if (this.attackKey && this.attackKey.isDown) {
            this._tryAttack();
        }

        this._updateEnemiesAI();
        this._updatePlayerHealthBar();
    }

    _buildSpawnPoints(groundY) {
        // Create a spread of randomized spawn points within bounds. Avoid clustering too close to center spawn.
        const pts = [];
        const defs = [ { type: 'slime_common', count: 6, respawn: 4000 }, { type: 'slime_epic', count: 2, respawn: 9000 }, { type: 'slime_boss', count: 1, respawn: 16000 } ];
        for (const d of defs) {
            for (let i = 0; i < d.count; i++) {
                let tries = 0;
                let x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
                let y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
                while (Phaser.Math.Distance.Between(x, y, this.scale.width * 0.12, this.scale.height * 0.5) < 80 && tries < 12) {
                    x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
                    y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
                    tries++;
                }
                pts.push({ x, y, type: d.type, respawn: d.respawn, active: null });
            }
        }
        return pts;
    }

    _buildObstacles() {
        if (!this._bounds) return [];
        const objs = [];
        const count = Phaser.Math.Between(6, 10);
        for (let i = 0; i < count; i++) {
            let tries = 0;
            let x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
            let y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
            while (Phaser.Math.Distance.Between(x, y, this.player.x || 0, this.player.y || 0) < 80 && tries < 12) {
                x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
                y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
                tries++;
            }
            const roll = Math.random();
            const type = roll < 0.6 ? 'rock_small' : (roll < 0.85 ? 'fence' : 'wall');
            try {
                const ob = this.obstacles.create(x, y, type).setDepth(1.1);
                // align display/top-left so physics body matches visual
                try { ob.setOrigin(0, 0); ob.x = Math.round(x - ((ob.width || ob.displayWidth) / 2)); ob.y = Math.round(y - ((ob.height || ob.displayHeight) / 2)); } catch (e) {}
                try {
                    if (type === 'rock_small') {
                        const r = Math.max(8, Math.round((ob.width || ob.displayWidth) / 2));
                        try { setCircleCentered(ob, r); } catch (e) {}
                    } else {
                        ob.body.setSize(ob.width || ob.displayWidth, ob.height || ob.displayHeight);
                    }
                } catch (e) {}
                objs.push(ob);
            } catch (e) { /* ignore create errors */ }
        }
        return objs;
    }

    _updateEnemiesAI() {
        try {
            if (this._updateEnemiesAI_shared) return this._updateEnemiesAI_shared();
        } catch (e) {}
    }

    _constrainEnemyToBounds(enemy) {
        if (!this._bounds || !enemy) return;
        const pad = 6;
        let changed = false;
        if (enemy.x < this._bounds.x1 + pad) { enemy.x = this._bounds.x1 + pad; changed = true; }
        if (enemy.x > this._bounds.x2 - pad) { enemy.x = this._bounds.x2 - pad; changed = true; }
        if (enemy.y < this._bounds.y1 + pad) { enemy.y = this._bounds.y1 + pad; changed = true; }
        if (enemy.y > this._bounds.y2 - pad) { enemy.y = this._bounds.y2 - pad; changed = true; }
        if (changed) {
            try { enemy.setVelocity(0, 0); } catch (e) {}
            try { enemy.setData('state', 'idle'); enemy.setData('nextMove', this.time.now + Phaser.Math.Between(300, 1200)); } catch (e) {}
            this._updateEnemyBarPosition(enemy);
        }
    }

    _onPlayerDown() {
        this._showToast('You are overwhelmed! Returning to the entrance...', 2000);
        this.player.disableBody(true, true);
        this.time.addEvent({
            delay: 1800,
            callback: () => {
                this.char.hp = this.char.maxhp;
                this._persistCharacter(this.username);
                this.scene.start('Town', { character: this.char, username: this.username, spawnX: 120, spawnY: this.scale.height - 100 });
            }
        });
    }

    _createPortals(groundY) {
        const portalX = this.scale.width * 0.1;
        const townSpawnX = this.scale.width - 220;
        const townSpawnY = this.scale.height - 90;
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const pobj = portalHelper.createPortal(this, portalX, groundY, { depth: 1.5, targetScene: 'Town', spawnX: townSpawnX, spawnY: townSpawnY, promptLabel: 'Return to Town' });
            this.returnPortal = pobj.display;
        } catch (e) {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const pobj = portalHelper.createPortal(this, portalX, groundY, { depth: 1.5, targetScene: 'Town', spawnX: townSpawnX, spawnY: townSpawnY, promptLabel: 'Return to Town' });
            this.returnPortal = pobj.display;
        }

        // Create portal to OuterField on the right side of the scene
        const fieldPortalX = this.scale.width - 220;
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const fieldObj = portalHelper.createPortal(this, fieldPortalX, groundY, { depth: 1.5, targetScene: 'OuterField', spawnX: 120, spawnY: this.scale.height - 120, promptLabel: 'Outer Field' });
            this.fieldPortal = fieldObj.display;
        } catch (e) {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const fieldObj = portalHelper.createPortal(this, fieldPortalX, groundY, { depth: 1.5, targetScene: 'OuterField', spawnX: 120, spawnY: this.scale.height - 120, promptLabel: 'Outer Field' });
            this.fieldPortal = fieldObj.display;
        }
    }

    _recalculateVitals() {
        const stats = (window && window.__shared_ui && window.__shared_ui.stats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
        const eff = stats || { str: 0, int: 0, agi: 0, luk: 0, defense: 0 };
        const level = this.char.level || 1;
        // Always assign computed maxima so stored character stays in sync with stats/equipment/level
        this.char.maxhp = (eff && typeof eff.maxhp === 'number') ? eff.maxhp : Math.max(1, Math.floor(100 + level * 10 + ((eff.str || 0) * 10)));
        this.char.maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : Math.max(0, Math.floor(50 + level * 5 + ((eff.int || 0) * 10)));
        if (!this.char.expToLevel) this.char.expToLevel = 100;
    }

    _createHUD() {
        if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this);
    }

    _updateHUD() {
        if (window && window.__hud_shared && window.__hud_shared.updateHUD) window.__hud_shared.updateHUD(this);
    }

    _destroyHUD() {
        if (window && window.__hud_shared && window.__hud_shared.destroyHUD) window.__hud_shared.destroyHUD(this);
    }

    shutdown() {
        clearActivity(this, { silent: true });
        setSceneKey(null);
        this._persistCharacter(this.username);
        this._destroyHUD();
        this._clearToasts();
        cleanupAmbientFx(this);
        if (this.damageLayer) { this.damageLayer.destroy(); this.damageLayer = null; }
        if (this.autoIndicator) { this.autoIndicator.destroy(); this.autoIndicator = null; }
        if (this._destroyPlayerHealthBar) this._destroyPlayerHealthBar();
        // destroy obstacles
        try { if (this.obstacles && this.obstacles.clear) this.obstacles.clear(true, true); } catch (e) {}
    }

    destroy() {
        this.shutdown();
        super.destroy();
    }

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
    const rawDef = this.enemyDefs[spawn.type] || { tier: 'common', level: 1, moveSpeed: 60 };
    const def = ((rawDef && rawDef.dynamicStats) || (typeof window !== 'undefined' && window.USE_DYNAMIC_ENEMY_STATS)) ? computeEnemyStats(rawDef) : rawDef;
        // choose generated texture when possible
        const tex = spawn.type || 'slime_common';
        const enemy = this.physics.add.sprite(spawn.x, spawn.y, tex).setDepth(1.8);
        enemy.body.setCollideWorldBounds(true);
    try { setCircleCentered(enemy, Math.max(12, (enemy.width||16)/2)); } catch (e) {}
        enemy.setData('defId', spawn.type);
    enemy.setData('hp', def.maxhp || 10);
    enemy.setData('maxhp', def.maxhp || 10);
        enemy.setData('alive', true);
        enemy.setData('spawn', spawn);
        enemy.setData('nextAttack', 0);
        enemy.setData('state', 'idle');
        enemy.setData('nextMove', this.time.now + Phaser.Math.Between(200, 1200));
        this.enemies.add(enemy);
        this._attachEnemyBars(enemy);
        spawn.active = enemy;
    }

}

applyCombatMixin(InnerField.prototype);

export default InnerField;
