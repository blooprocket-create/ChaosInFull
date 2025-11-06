import { applyCombatMixin } from './shared/combat.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { computeEnemyStats } from '../data/statFormulas.js';
import { attach as attachCleanup } from '../shared/cleanupManager.js';
import { ensureEnemyTexture } from './shared/fallbackTextures.js';

export class FlameRoad extends Phaser.Scene {
    constructor() { super('FlameRoad'); }

    preload() {
        this.load.image('flame_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    create(sceneData = {}) {
        try { attachCleanup(this); } catch (e) {}
        const dataFromSettings = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        const incoming = (sceneData && typeof sceneData === 'object') ? sceneData : {};
        const data = { ...dataFromSettings, ...incoming };

        const baseEnemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const fallbackEnemyDefs = {
            flaming_slime: { maxhp: 22, moveSpeed: 84, attackRange: 60, damage: [6, 10], attackCooldown: 920, detectionRadius: 260, patrolRadius: 160, separationRadius: 30 },
            big_flaming_slime: { maxhp: 38, moveSpeed: 76, attackRange: 66, damage: [8, 14], attackCooldown: 900, detectionRadius: 270, patrolRadius: 170, separationRadius: 34, attackWindupMs: 140 },
            devil_spawn: { maxhp: 48, moveSpeed: 96, attackRange: 80, damage: [10, 18], attackCooldown: 820, detectionRadius: 300, patrolRadius: 190, separationRadius: 36, attackWindupMs: 120, attackRecoveryMs: 360 },
            the_lurker: { maxhp: 80, moveSpeed: 100, attackRange: 90, damage: [14, 24], attackCooldown: 780, detectionRadius: 320, patrolRadius: 210, separationRadius: 38, attackWindupMs: 100, attackRecoveryMs: 380 }
        };
        this.enemyDefs = { ...fallbackEnemyDefs, ...baseEnemyDefs };
        this._enemyAIConfig = { detectionRadius: 280, separationRadius: 34, patrolIdleMin: 420, patrolIdleMax: 1600, attackBuffer: 14 };

        this.username = data.username || null;
        this.char = data.character ? { ...data.character } : (dataFromSettings.character ? { ...dataFromSettings.character } : {});
        if (!this.char.inventory) this.char.inventory = [];

        this._persistConfig = { sceneKey: 'FlameRoad' };
        setSceneKey('FlameRoad');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;

        // Standard respawn target: on death here, return player to Bastion next to Mother Lumen
        this._deathRespawn = {
            targetScene: 'GloamwayBastion',
            // Bastion safe-center approx (Mother Lumen stands at ~0.74W, ~0.38H)
            spawnX: Math.round(this.scale.width * 0.74),
            spawnY: Math.round(this.scale.height * 0.38)
        };

        const W = this.scale.width;
        const H = this.scale.height;
        const centerX = W / 2;
        const centerY = H / 2;

        try {
            this._floor = buildThemedFloor(this, 'lava');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#1b0b0b');
        }
        applyAmbientFx(this, 'lava');

        const margin = 64;
        this._bounds = { x1: margin, x2: W - margin, y1: 96, y2: H - 120 };

        const spawnX = (typeof data.spawnX === 'number') ? data.spawnX : Math.round(centerX);
        const spawnY = (typeof data.spawnY === 'number') ? data.spawnY : Math.round(centerY * 0.86);
        this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');

        try {
            if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
            if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
            if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
        } catch (e) {}

        this.keys = (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) ? window.__shared_keys.attachCommonKeys(this) : null;
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackCooldown = 520;
        this.attackRange = 72;
        this.nextAttackTime = 0;

        this._createHUD();
        this._updateHUD();
        this._createPlayerHealthBar();
        this.damageLayer = this.add.layer();
        this.damageLayer.setDepth(6);

        this.enemies = this.physics.add.group();
        this._decorations = [];
        this._seedDecorations();

        this.spawnPoints = this._buildSpawnPoints();
        this.spawnPoints.forEach(sp => this._spawnEnemy(sp));

        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            if (!enemy.getData || !enemy.getData('alive')) return;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            const kx = Math.cos(angle) * 110;
            const ky = Math.sin(angle) * 110;
            try { player.body.velocity.x += kx; player.body.velocity.y += ky; } catch (e) {}
        });

        // Portals
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            // Top edge back to Swamp (moved closer to top boundary)
            const swampX = Math.round(W / 2);
            const swampY = Math.round(this._bounds.y1 + 24);
            const swampObj = portalHelper.createPortal(this, swampX, swampY, {
                depth: 1.6,
                targetScene: 'GloamwaySwamp',
                spawnX: Math.round(this.scale.width / 2),
                spawnY: Math.round(this.scale.height * 0.82),
                promptLabel: 'Return to Gloamway Swamp'
            });
            this._swampPortal = swampObj.display;

            // Dormant portals (no targetScene) with labels, moved closer to left/bottom/right edges
            const midY = Math.round((this._bounds.y1 + this._bounds.y2) / 2);
            const dormantCoords = [
                { x: Math.round(this._bounds.x1 + 24), y: midY },                     // near left edge, vertically centered
                { x: Math.round(W / 2), y: Math.round(this._bounds.y2 - 24) },         // near bottom edge, horizontally centered
                { x: Math.round(this._bounds.x2 - 24), y: midY },                      // near right edge, vertically centered
            ];
            dormantCoords.forEach(coord => {
                const obj = portalHelper.createPortal(this, coord.x, coord.y, { depth: 1.3 });
                const disp = obj.display;
                try { if (disp && disp.setAlpha) disp.setAlpha(0.6); } catch (e) {}
                try {
                    const label = this.add.text(coord.x, coord.y - 52, 'Dormant', { fontSize: '12px', color: '#ff8888', backgroundColor: 'rgba(0,0,0,0.35)', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(1.35);
                    if (label.setAlpha) label.setAlpha(0.8);
                } catch (e) {}
            });
        } catch (e) { /* ignore */ }

        this.events.once('shutdown', () => this.shutdown());
    }

    _seedDecorations() {
        if (!this._bounds) return;
        const { x1, x2, y1, y2 } = this._bounds;
        const area = (x2 - x1) * (y2 - y1);
        const decorCount = Math.max(16, Math.round(area / 100000));
        for (let i = 0; i < decorCount; i++) {
            const dx = Phaser.Math.Between(x1, x2);
            const dy = Phaser.Math.Between(y1, y2);
            try {
                const depth = 0.9 + ((dy || 0) / Math.max(1, this.scale.height)) * 0.3;
                const c = this.add.ellipse(dx, dy, 18, 10, 0x2a0f0f, 0.85).setDepth(depth);
                this._decorations.push({ x: dx, y: dy, display: c, type: 'ember_patch' });
            } catch (e) {}
        }
        swayDecorations(this, this._decorations);
    }

    _buildSpawnPoints() {
        const pts = [];
        if (!this._bounds) return pts;
        const { x1, x2, y1, y2 } = this._bounds;
        const count = Phaser.Math.Between(10, 14);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(x1, x2);
            const y = Phaser.Math.Between(y1, y2);
            const roll = Math.random();
            // Lava zone: flaming slimes and demon spawn ladder, with rare devil and a boss
            let type = 'flaming_slime';
            if (roll > 0.85 && roll <= 0.9) type = 'big_flaming_slime';
            else if (roll > 0.3 && roll <= 0.5) type = 'demon_spawn_common';
            else if (roll > 0.5 && roll <= 0.65) type = 'demon_spawn_uncommon';
            else if (roll > 0.65 && roll <= 0.78) type = 'demon_spawn_rare';
            else if (roll > 0.78 && roll <= 0.85) type = 'demon_spawn_epic';
            else if (roll > 0.9 && roll <= 0.965) type = 'demon_spawn_legendary';
            else if (roll > 0.965 && roll <= 0.985) type = 'devil_spawn';
            else if (roll > 0.985) type = 'the_lurker';
            pts.push({ x, y, type, respawn: Phaser.Math.Between(9000, 17000), active: null });
        }
        return pts;
    }

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
        const rawDef = this.enemyDefs[spawn.type] || { tier: 'common', level: 1, moveSpeed: 86 };
        const def = ((rawDef && rawDef.dynamicStats) || (typeof window !== 'undefined' && window.USE_DYNAMIC_ENEMY_STATS)) ? computeEnemyStats(rawDef) : rawDef;
    const tex = ensureEnemyTexture(this, spawn.type) || (this.textures.exists(spawn.type) ? spawn.type : 'goblin_flamebinder');
        const enemy = this.physics.add.sprite(spawn.x, spawn.y, tex).setDepth(1.9);
        enemy.body.setCollideWorldBounds(true);
        try { enemy.body.setCircle(Math.max(12, (enemy.width || 20) / 2)); } catch (e) {}
        enemy.setData('defId', spawn.type);
        enemy.setData('hp', def.maxhp || 12);
        enemy.setData('maxhp', def.maxhp || 12);
        enemy.setData('alive', true);
        enemy.setData('spawn', spawn);
        enemy.setData('nextAttack', 0);
        enemy.setData('state', 'idle');
        enemy.setData('nextMove', this.time.now + Phaser.Math.Between(300, 1200));
        this.enemies.add(enemy);
        this._attachEnemyBars(enemy);
        spawn.active = enemy;
    }

    _updateEnemiesAI() { try { if (this._updateEnemiesAI_shared) return this._updateEnemiesAI_shared(); } catch (e) {} }

    update() {
        if (!this.player || !this.input) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.55, smoothing: 0.18 });
        if (!movement) return;
        const hasManualInput = movement.hasInput;
        const skipManualAnim = this.autoAttack && !hasManualInput;
        if (!this._attacking && !skipManualAnim) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });
        if (this.attackKey && this.attackKey.isDown) this._tryAttack();
        this._updateEnemiesAI();
        this._updatePlayerHealthBar();
    }

    _recalculateVitals() {
        const stats = (window && window.__shared_ui && window.__shared_ui.stats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
        const eff = stats || { str: 0, int: 0, agi: 0, luk: 0, defense: 0 };
        const level = this.char.level || 1;
        this.char.maxhp = (eff && typeof eff.maxhp === 'number') ? eff.maxhp : Math.max(1, Math.floor(100 + level * 10 + ((eff.str || 0) * 10)));
        this.char.maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : Math.max(0, Math.floor(50 + level * 5 + ((eff.int || 0) * 10)));
        if (!this.char.expToLevel) this.char.expToLevel = 100;
    }

    _createHUD() { if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); }
    _updateHUD() { if (window && window.__hud_shared && window.__hud_shared.updateHUD) window.__hud_shared.updateHUD(this); }
    _destroyHUD() { if (window && window.__hud_shared && window.__hud_shared.destroyHUD) window.__hud_shared.destroyHUD(this); }

    shutdown() {
        clearActivity(this, { silent: true });
        setSceneKey(null);
        if (this._persistCharacter) this._persistCharacter(this.username);
        this._destroyHUD();
        cleanupAmbientFx(this);
        try { this._closeDialogueOverlay && this._closeDialogueOverlay(); } catch (e) {}
        if (this._clearToasts) this._clearToasts();
        if (this._destroyPlayerHealthBar) this._destroyPlayerHealthBar();
        if (this.damageLayer) { try { this.damageLayer.destroy(); } catch (e) {} this.damageLayer = null; }
        try {
            if (this.enemies) {
                const children = this.enemies.getChildren ? this.enemies.getChildren() : [];
                children.forEach(e => { try { if (e && e.destroy) e.destroy(); } catch (err) {} });
                this.enemies.clear(true, true);
            }
        } catch (e) {}
    }
}

applyCombatMixin(FlameRoad.prototype);

export default FlameRoad;
