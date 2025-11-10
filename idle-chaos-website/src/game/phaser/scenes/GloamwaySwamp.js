import { applyCombatMixin } from './shared/combat.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { computeEnemyStats } from '../data/statFormulas.js';
import { attach as attachCleanup } from '../shared/cleanupManager.js';
import { ensureGameCanvasVisible } from './shared/theme.js';
import { ensureEnemyTexture } from './shared/fallbackTextures.js';
import { getAreaEnemyLevel } from './shared/levelRanges.js';

export class GloamwaySwamp extends Phaser.Scene {
    constructor() { super('GloamwaySwamp'); }

    preload() {
        this.load.image('swamp_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    create(sceneData = {}) {
        try { attachCleanup(this); } catch (e) {}
        // Ensure canvas is visible (undo Login/CharacterSelect hiding)
        try { ensureGameCanvasVisible(this); } catch (e) {}
        const dataFromSettings = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        const incoming = (sceneData && typeof sceneData === 'object') ? sceneData : {};
        const data = { ...dataFromSettings, ...incoming };

        const baseEnemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const fallbackEnemyDefs = {
            skeleton: { maxhp: 30, moveSpeed: 80, attackRange: 60, damage: [6, 10], attackCooldown: 980, detectionRadius: 260, patrolRadius: 160, separationRadius: 30 },
            zombie: { maxhp: 38, moveSpeed: 60, attackRange: 58, damage: [7, 12], attackCooldown: 1100, detectionRadius: 220, patrolRadius: 140, separationRadius: 30 },
            goblin_skeleton: { maxhp: 34, moveSpeed: 86, attackRange: 64, damage: [6, 12], attackCooldown: 940, detectionRadius: 270, patrolRadius: 170, separationRadius: 32 },
            goblin_skeleteon: { maxhp: 34, moveSpeed: 86, attackRange: 64, damage: [6, 12], attackCooldown: 940, detectionRadius: 270, patrolRadius: 170, separationRadius: 32 },
            brute_skeleton: { maxhp: 48, moveSpeed: 82, attackRange: 72, damage: [9, 16], attackCooldown: 900, detectionRadius: 280, patrolRadius: 180, separationRadius: 34, attackWindupMs: 140 }
        };
        this.enemyDefs = { ...fallbackEnemyDefs, ...baseEnemyDefs };
        this._enemyAIConfig = { detectionRadius: 260, separationRadius: 32, patrolIdleMin: 420, patrolIdleMax: 1600, attackBuffer: 14 };

        this.username = data.username || null;
        this.char = data.character ? { ...data.character } : (dataFromSettings.character ? { ...dataFromSettings.character } : {});
        if (!this.char.inventory) this.char.inventory = [];

        this._persistConfig = { sceneKey: 'GloamwaySwamp' };
        setSceneKey('GloamwaySwamp');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;

        // Standard respawn target: on death, send player back to Bastion next to Mother Lumen
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
            this._floor = buildThemedFloor(this, 'swamp');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#0b1a12');
        }
        applyAmbientFx(this, 'swamp');

        const margin = 64;
        this._bounds = { x1: margin, x2: W - margin, y1: 96, y2: H - 120 };

        const spawnX = (typeof data.spawnX === 'number') ? data.spawnX : Math.round(centerX);
        const spawnY = (typeof data.spawnY === 'number') ? data.spawnY : Math.round(centerY * 1.1);
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
            // Top-left portal back to Bastion
            const bastionX = Math.max(this._bounds.x1 + 48, Math.round(W * 0.16));
            const bastionY = Math.max(this._bounds.y1 + 48, Math.round(H * 0.18));
            const bastionObj = portalHelper.createPortal(this, bastionX, bastionY, {
                depth: 1.6,
                targetScene: 'GloamwayBastion',
                spawnX: Math.round(this.scale.width * 0.82),
                spawnY: Math.round(this.scale.height * 0.82),
                promptLabel: 'Return to Gloamway Bastion'
            });
            this._bastionPortal = bastionObj.display;
            // Mid-bottom portal to Flame Road
            const flameX = Math.round(W / 2);
            const flameY = Math.min(this._bounds.y2 - 48, Math.round(H * 0.86));
            const flameObj = portalHelper.createPortal(this, flameX, flameY, {
                depth: 1.6,
                targetScene: 'FlameRoad',
                spawnX: Math.round(this.scale.width / 2),
                spawnY: Math.round(this.scale.height * 0.18),
                promptLabel: 'Enter Flame Road'
            });
            this._flamePortal = flameObj.display;
        } catch (e) { /* ignore */ }

        this.events.once('shutdown', () => this.shutdown());
    }

    _seedDecorations() {
        if (!this._bounds) return;
        const { x1, x2, y1, y2 } = this._bounds;
        const area = (x2 - x1) * (y2 - y1);
        const decorCount = Math.max(20, Math.round(area / 90000));
        for (let i = 0; i < decorCount; i++) {
            const dx = Phaser.Math.Between(x1, x2);
            const dy = Phaser.Math.Between(y1, y2);
            const type = Math.random() < 0.6 ? 'reed' : 'mire';
            try {
                const depth = 0.9 + ((dy || 0) / Math.max(1, this.scale.height)) * 0.3;
                if (type === 'reed') {
                    const stalk = this.add.rectangle(dx, dy, 4, 18, 0x224422, 1).setDepth(depth);
                    const head = this.add.circle(dx, dy - 10, 3, 0x88aa55, 1).setDepth(depth);
                    this._decorations.push({ x: dx, y: dy, display: stalk, type });
                    this._decorations.push({ x: dx, y: dy - 10, display: head, type });
                } else {
                    const patch = this.add.ellipse(dx, dy, 22, 12, 0x0f2a1a, 0.8).setDepth(depth);
                    this._decorations.push({ x: dx, y: dy, display: patch, type });
                }
            } catch (e) {}
        }
        swayDecorations(this, this._decorations);
    }

    _buildSpawnPoints() {
        const pts = [];
        if (!this._bounds) return pts;
        const { x1, x2, y1, y2 } = this._bounds;
        const count = Phaser.Math.Between(12, 16);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(x1, x2);
            const y = Phaser.Math.Between(y1, y2);
            const roll = Math.random();
            // Weighted ladder for skeleton family with some themed guests
            let type = 'skeleton';
            if (roll > 0.98) type = 'skeleton_legendary';
            else if (roll > 0.92) type = 'skeleton_epic';
            else if (roll > 0.78) type = 'skeleton_rare';
            else if (roll > 0.62) type = 'skeleton_uncommon';
            // sprinkle in themed variants
            if (roll > 0.84 && roll <= 0.88) type = 'goblin_skeleton';
            if (roll > 0.88 && roll <= 0.92) type = 'brute_skeleton';
            if (roll > 0.56 && roll <= 0.62) type = 'zombie';
            pts.push({ x, y, type, respawn: Phaser.Math.Between(8000, 15000), active: null });
        }
        return pts;
    }

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
        const rawDef = this.enemyDefs[spawn.type] || { tier: 'common', level: 1, moveSpeed: 80 };
        const randomizedLevel = getAreaEnemyLevel('GloamwaySwamp', rawDef.tier, rawDef.level || 1);
        const defInput = { ...rawDef, level: randomizedLevel };
        const def = ((defInput && defInput.dynamicStats) || (typeof window !== 'undefined' && window.USE_DYNAMIC_ENEMY_STATS)) ? computeEnemyStats(defInput) : defInput;
    const tex = ensureEnemyTexture(this, spawn.type) || (this.textures.exists(spawn.type) ? spawn.type : 'goblin_slicer');
        const enemy = this.physics.add.sprite(spawn.x, spawn.y, tex).setDepth(1.9);
        enemy.body.setCollideWorldBounds(true);
        try { enemy.body.setCircle(Math.max(12, (enemy.width || 20) / 2)); } catch (e) {}
        enemy.setData('defId', spawn.type);
    enemy.setData('level', randomizedLevel);
    enemy.setData('hp', def.maxhp || 12);
    enemy.setData('maxhp', def.maxhp || 12);
    if (typeof def.defense === 'number') enemy.setData('defense', def.defense);
        enemy.setData('alive', true);
        enemy.setData('spawn', spawn);
        enemy.setData('nextAttack', 0);
        enemy.setData('state', 'idle');
        enemy.setData('nextMove', this.time.now + Phaser.Math.Between(300, 1200));
        this.enemies.add(enemy);
        this._attachEnemyBars(enemy);
        spawn.active = enemy;
    }

    _updateEnemiesAI() {
        try { if (this._updateEnemiesAI_shared) return this._updateEnemiesAI_shared(); } catch (e) {}
    }

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

applyCombatMixin(GloamwaySwamp.prototype);

export default GloamwaySwamp;
