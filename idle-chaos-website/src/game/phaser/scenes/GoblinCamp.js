import { applyCombatMixin } from './shared/combat.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { computeEnemyStats } from '../data/statFormulas.js';
import { setCircleCentered } from '../shared/physicsHelpers.js';
import { attach } from '../shared/cleanupManager.js';

export class GoblinCamp extends Phaser.Scene {
    constructor() { super('GoblinCamp'); }

    preload() {
        // reuse town background art until dedicated goblin camp art is available
        this.load.image('goblin_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    _buildSpawnPoints() {
        const pts = [];
        const count = Phaser.Math.Between(6, 12);
        const types = ['goblin_common', 'goblin_girl', 'goblin_epic', 'goblin_boss'];
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(this._bounds.x1 + 12, this._bounds.x2 - 12);
            const y = Phaser.Math.Between(this._bounds.y1 + 12, this._bounds.y2 - 12);
            // prefer commons, rarer epics/boss
            const roll = Math.random();
            let type = 'goblin_common';
            if (roll > 0.95) type = 'goblin_boss';
            else if (roll > 0.8) type = 'goblin_epic';
            else if (roll > 0.5) type = 'goblin_girl';
            pts.push({ x, y, type, active: null, respawn: Phaser.Math.Between(5000, 14000) });
        }
        return pts;
    }

    _buildObstacles() {
        if (!this._bounds || !this.physics || !this.physics.add) return [];
        if (!this.obstacles) this.obstacles = this.physics.add.staticGroup();

        const created = [];
        const { x1, x2, y1, y2 } = this._bounds;
        const playerPos = this.player ? { x: this.player.x, y: this.player.y } : null;
        const count = Phaser.Math.Between(6, 12);

        for (let i = 0; i < count; i++) {
            const typeRoll = Math.random();
            const tex = typeRoll > 0.78 ? 'wall' : (typeRoll > 0.48 ? 'fence' : 'rock_small');
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 12) {
                const ox = Phaser.Math.Between(x1 + 24, x2 - 24);
                const oy = Phaser.Math.Between(y1 + 24, y2 - 24);
                attempts++;

                if (playerPos && Phaser.Math.Distance.Between(ox, oy, playerPos.x, playerPos.y) < 72) continue;

                try {
                    const obstacle = this.obstacles.create(ox, oy, tex);
                    obstacle.setDepth(1.4);
                    if (obstacle.refreshBody) obstacle.refreshBody();
                    if (tex === 'fence') obstacle.setScale(Phaser.Math.FloatBetween(0.9, 1.2));
                    if (tex === 'wall') {
                        obstacle.setScale(Phaser.Math.FloatBetween(0.8, 1.05), Phaser.Math.FloatBetween(0.9, 1.1));
                        obstacle.setAngle(Phaser.Math.Between(-6, 6));
                    }
                    created.push(obstacle);
                    placed = true;
                } catch (e) {
                    placed = true;
                }
            }
        }

        return created;
    }

    create(sceneData = {}) {
        // Ensure cleanup manager is attached early for this scene
        try { attach(this); } catch (e) {}
        const dataFromSettings = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        const incoming = (sceneData && typeof sceneData === 'object') ? sceneData : {};
        const data = { ...dataFromSettings, ...incoming };

        const baseEnemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const fallbackEnemyDefs = {
            goblin_common: { maxhp: 16, moveSpeed: 70, attackRange: 54, damage: [3, 7], attackCooldown: 1100, detectionRadius: 220, patrolRadius: 140, separationRadius: 28 },
            goblin_girl: { maxhp: 18, moveSpeed: 78, attackRange: 58, damage: [4, 8], attackCooldown: 1000, detectionRadius: 230, patrolRadius: 150, separationRadius: 28 },
            goblin_epic: { maxhp: 26, moveSpeed: 82, attackRange: 62, damage: [5, 10], attackCooldown: 950, detectionRadius: 240, patrolRadius: 160, separationRadius: 30, attackWindupMs: 140 },
            goblin_boss: { maxhp: 44, moveSpeed: 88, attackRange: 70, damage: [7, 14], attackCooldown: 900, detectionRadius: 260, patrolRadius: 180, separationRadius: 34, attackWindupMs: 120, attackRecoveryMs: 320 }
        };
        this.enemyDefs = { ...fallbackEnemyDefs, ...baseEnemyDefs };
        this._enemyAIConfig = { detectionRadius: 230, separationRadius: 30, patrolIdleMin: 360, patrolIdleMax: 1500, attackBuffer: 12 };

        this.username = data.username || null;
        this.char = data.character ? { ...data.character } : (dataFromSettings.character ? { ...dataFromSettings.character } : {});
        if (!this.char.inventory) this.char.inventory = [];

        this._persistConfig = { sceneKey: 'GoblinCamp' };
        setSceneKey('GoblinCamp');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;

        const W = this.scale.width;
        const H = this.scale.height;
        const centerX = W / 2;
        const centerY = H / 2;

        try {
            this._fieldFloor = buildThemedFloor(this, 'goblin');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#2a221b');
        }
        applyAmbientFx(this, 'goblin');

        const margin = 64;
        this._bounds = { x1: margin, x2: W - margin, y1: 100, y2: H - 120 };

        const spawnX = (typeof data.spawnX === 'number') ? data.spawnX : Math.max(120, Math.round(W * 0.12));
        const spawnY = (typeof data.spawnY === 'number') ? data.spawnY : Math.round(centerY + (H * 0.12));

        this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');

        try {
            if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
            if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
            if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
        } catch (e) {}

        this.keys = (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) ? window.__shared_keys.attachCommonKeys(this) : null;
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackCooldown = 520;
    this.attackRange = 68;
    this.nextAttackTime = 0;
    // AutoCombat removed; init call intentionally omitted.

        this._createHUD();
        this._createPlayerHealthBar();
        this.damageLayer = this.add.layer();
        this.damageLayer.setDepth(6);

        this.enemies = this.physics.add.group();
        this._respawnEvents = [];

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
                    try {
                        disp = this.add.container(dx, dy, [petal, center]);
                        disp.setDepth(varDepth);
                    } catch (err) {
                        disp = petal;
                        if (disp && typeof disp.setDepth === 'function') disp.setDepth(varDepth);
                    }
                }
            } catch (err) {
                try {
                    disp = this.add.circle(dx, dy, 6, 0x173a17, 1).setDepth(0.6);
                } catch (fallbackErr) {
                    disp = null;
                }
            }
            if (disp) this._decorations.push({ x: dx, y: dy, type, display: disp });
        }
        swayDecorations(this, this._decorations);

        try {
            const gg = this.make.graphics({ x: 0, y: 0, add: false });
            gg.clear(); gg.fillStyle(0x4e8b3d, 1); gg.fillCircle(16, 16, 14); gg.generateTexture('goblin_common', 32, 32);
            gg.clear(); gg.fillStyle(0x7bbf5b, 1); gg.fillCircle(16, 16, 14); gg.generateTexture('goblin_girl', 32, 32);
            gg.clear(); gg.fillStyle(0xcc9933, 1); gg.fillCircle(18, 18, 16); gg.generateTexture('goblin_epic', 36, 36);
            gg.clear(); gg.fillStyle(0xff6644, 1); gg.fillCircle(20, 20, 18); gg.generateTexture('goblin_boss', 40, 40);
            gg.destroy();
        } catch (e) {}

        try {
            const og = this.make.graphics({ x: 0, y: 0, add: false });
            og.clear(); og.fillStyle(0x6b5342, 1); og.fillCircle(12, 12, 12); og.generateTexture('rock_small', 24, 24);
            og.clear(); og.fillStyle(0x7b5a3b, 1); og.fillRect(0, 0, 48, 12); og.generateTexture('fence', 48, 12);
            og.clear(); og.fillStyle(0x3a2f2b, 1); og.fillRect(0, 0, 80, 16); og.generateTexture('wall', 80, 16);
            og.destroy();
        } catch (e) {}

        this.obstacles = this.physics.add.staticGroup();

        this.spawnPoints = this._buildSpawnPoints();
        this._buildObstacles();
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);
        this.spawnPoints.forEach(sp => this._spawnEnemy(sp));

        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            if (!enemy.getData('alive')) return;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            const kx = Math.cos(angle) * 100;
            const ky = Math.sin(angle) * 100;
            try {
                player.body.velocity.x += kx;
                player.body.velocity.y += ky;
            } catch (e) {}
        });

        const portalX = 80;
        const portalY = Phaser.Math.Clamp(centerY, this._bounds.y1 + 40, this._bounds.y2 - 40);
        const bastionPortalX = Math.max(this._bounds.x2 - 80, Math.round(W * 0.82));
        const bastionPortalY = Phaser.Math.Clamp(centerY - 60, this._bounds.y1 + 40, this._bounds.y2 - 40);
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const portalObj = portalHelper.createPortal(this, portalX, portalY, {
                depth: 1.5,
                targetScene: 'OuterField',
                spawnX: this.scale.width - 220,
                spawnY: this.scale.height - 120,
                promptLabel: 'Return to Outer Field'
            });
            this.outerPortal = portalObj.display;
            const bastionObj = portalHelper.createPortal(this, bastionPortalX, bastionPortalY, {
                depth: 1.6,
                targetScene: 'GloamwayBastion',
                spawnX: Math.round(this.scale.width * 0.22),
                spawnY: Math.round(this.scale.height * 0.58),
                promptLabel: 'Enter Gloamway Bastion'
            });
            this.bastionPortal = bastionObj.display;
        } catch (e) {
            try {
                const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
                const portalObj = portalHelper.createPortal(this, portalX, portalY, {
                    depth: 1.5,
                    targetScene: 'OuterField',
                    spawnX: this.scale.width - 220,
                    spawnY: this.scale.height - 120,
                    promptLabel: 'Return to Outer Field'
                });
                this.outerPortal = portalObj.display;
                const bastionObj = portalHelper.createPortal(this, bastionPortalX, bastionPortalY, {
                    depth: 1.6,
                    targetScene: 'GloamwayBastion',
                    spawnX: Math.round(this.scale.width * 0.22),
                    spawnY: Math.round(this.scale.height * 0.58),
                    promptLabel: 'Enter Gloamway Bastion'
                });
                this.bastionPortal = bastionObj.display;
            } catch (ignore) {}
        }

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

        if (this.autoToggleKey && Phaser.Input.Keyboard.JustDown(this.autoToggleKey)) {
            this._toggleAutoAttack();
        }

        // allow holding the attack key to repeatedly attempt attacks; sharedTryAttack enforces cooldown
        if (this.attackKey && this.attackKey.isDown) {
            this._tryAttack();
        }

        this._updateEnemiesAI();
        this._updatePlayerHealthBar();
    }

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
    const rawDef = this.enemyDefs[spawn.type] || { tier: 'common', level: 1, moveSpeed: 70 };
    const def = ((rawDef && rawDef.dynamicStats) || (typeof window !== 'undefined' && window.USE_DYNAMIC_ENEMY_STATS)) ? computeEnemyStats(rawDef) : rawDef;
        const texMap = { goblin_common: 'goblin_common', goblin_girl: 'goblin_girl', goblin_epic: 'goblin_epic', goblin_boss: 'goblin_boss' };
        const tex = texMap[spawn.type] || 'goblin_common';
        const enemy = this.physics.add.sprite(spawn.x, spawn.y, tex).setDepth(1.8);
        enemy.body.setCollideWorldBounds(true);
        try { setCircleCentered(enemy, Math.max(10, (enemy.width || 16) / 2)); } catch (e) {}
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
        this._showToast('You have been defeated! Returning to town...', 2000);
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

    _recalculateVitals() {
        const stats = (window && window.__shared_ui && window.__shared_ui.stats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
        const eff = stats || { str: 0, int: 0, agi: 0, luk: 0, defense: 0 };
        const level = this.char.level || 1;
        this.char.maxhp = (eff && typeof eff.maxhp === 'number')
            ? eff.maxhp
            : Math.max(1, Math.floor(100 + level * 10 + ((eff.str || 0) * 10)));
        this.char.maxmana = (eff && typeof eff.maxmana === 'number')
            ? eff.maxmana
            : Math.max(0, Math.floor(50 + level * 5 + ((eff.int || 0) * 10)));
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
        if (this._clearToasts) this._clearToasts();
        cleanupAmbientFx(this);
        if (this.autoIndicator) { this.autoIndicator.destroy(); this.autoIndicator = null; }
        if (this._destroyPlayerHealthBar) this._destroyPlayerHealthBar();
        if (this.damageLayer) { this.damageLayer.destroy(); this.damageLayer = null; }
        // destroy any remaining enemies and their UI
        try {
            if (this.enemies && this.enemies.getChildren) {
                const ch = this.enemies.getChildren();
                for (let i = 0; i < ch.length; i++) {
                    const e = ch[i];
                    try { this._detachEnemyBars(e); } catch (e2) {}
                    try { e.destroy(); } catch (e2) {}
                }
            }
        } catch (e) { /* ignore */ }
        // clear any scheduled respawn timers
        try {
            if (Array.isArray(this._respawnEvents)) {
                this._respawnEvents.forEach(ev => { try { if (ev && ev.destroy) ev.destroy(); if (ev && ev.remove) ev.remove(false); } catch (e) {} });
                this._respawnEvents.length = 0;
            }
        } catch (e) { /* ignore */ }
        // clear obstacles
        try { if (this.obstacles && this.obstacles.clear) this.obstacles.clear(true, true); } catch (e) {}
    }
}

applyCombatMixin(GoblinCamp.prototype);

export default GoblinCamp;
