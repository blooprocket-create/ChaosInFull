import { applyCombatMixin } from './shared/combat.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { computeEnemyStats } from '../data/statFormulas.js';
import { setCircleCentered } from '../shared/physicsHelpers.js';
import { attach } from '../shared/cleanupManager.js';

export class OuterField extends Phaser.Scene {
    constructor() { super('OuterField'); }

    preload() {
        // reuse town background art until dedicated outer field art is available
        this.load.image('field_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        // Ensure cleanup manager is attached early for this scene
        try { attach(this); } catch (e) {}
        this.enemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const sceneData = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        this.username = sceneData.username || null;
        this.char = sceneData.character || {};
        if (!this.char.inventory) this.char.inventory = [];
        this._persistConfig = { sceneKey: 'OuterField' };
        setSceneKey('OuterField');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;
        const W = this.scale.width;
        const H = this.scale.height;

        // Procedural outer field - reuse Town/InnerField aesthetic but wider and a little more open
        try {
            this._fieldFloor = buildThemedFloor(this, 'field');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#0f1410');
        }
        applyAmbientFx(this, 'field');
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // placement bounds
        const margin = 64;
        this._bounds = { x1: margin, x2: W - margin, y1: 100, y2: H - 120 };

        const spawnX = (sceneData.spawnX !== undefined && sceneData.spawnX !== null) ? sceneData.spawnX : Math.max(80, Math.round(W * 0.12));
        const spawnY = (sceneData.spawnY !== undefined && sceneData.spawnY !== null) ? sceneData.spawnY : Math.round(centerY + (H * 0.12));

    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');

    // Player animations are registered globally in Boot (walk/run/idle/mine)

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

        // enemies: rats on outer field — randomized spawn distribution
        this.enemies = this.physics.add.group();
        // decorations
        this._decorations = [];
        const decorCount = Math.max(32, Math.round((W * H) / 65000));
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

        // generate simple rat textures to prototype (avoid new assets)
        try {
            const rg = this.make.graphics({ x: 0, y: 0, add: false });
            rg.clear(); rg.fillStyle(0x8b6b4a, 1); rg.fillCircle(14, 14, 12); rg.generateTexture('rat_common', 28, 28);
            rg.clear(); rg.fillStyle(0x557744, 1); rg.fillCircle(16, 16, 14); rg.generateTexture('zombie_rat', 32, 32);
            rg.clear(); rg.fillStyle(0x99aadd, 1); rg.fillCircle(18, 18, 16); rg.generateTexture('ghost_rat', 36, 36);
            rg.destroy();
        } catch (e) { /* ignore */ }

            // generate simple obstacle textures and obstacles group
            try {
                const og = this.make.graphics({ x: 0, y: 0, add: false });
                og.clear(); og.fillStyle(0x6b5342, 1); og.fillCircle(12, 12, 12); og.generateTexture('rock_small', 24, 24);
                og.clear(); og.fillStyle(0x7b5a3b, 1); og.fillRect(0, 0, 48, 12); og.generateTexture('fence', 48, 12);
                og.clear(); og.fillStyle(0x3a2f2b, 1); og.fillRect(0, 0, 80, 16); og.generateTexture('wall', 80, 16);
                og.destroy();
            } catch (e) { }

            this.obstacles = this.physics.add.staticGroup();

            this.spawnPoints = this._buildSpawnPoints();
        // build obstacles then spawn enemies
        this._buildObstacles();
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);
        this.spawnPoints.forEach(sp => this._spawnEnemy(sp));

        // collision: player <-> enemies (2D knockback handled in callback)
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            if (!enemy.getData('alive')) return;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            const kx = Math.cos(angle) * 100; const ky = Math.sin(angle) * 100;
            try { player.body.velocity.x += kx; player.body.velocity.y += ky; } catch (e) {}
        });

        // portals: back to InnerField and forward to GoblinCamp
    this._createPortals();

        this.events.once('shutdown', () => this.shutdown());
    }

    update() {
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.2 });
        if (!movement) return;
        const hasManualInput = movement.hasInput;
        const autoHasTarget = this.autoTarget && this.autoTarget.getData && this.autoTarget.getData('alive');
        const skipManualAnim = this.autoAttack && !hasManualInput && (autoHasTarget || (this._avoidance && this._avoidance.active));
        if (!this._attacking && !skipManualAnim) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });

        if (this.autoToggleKey && Phaser.Input.Keyboard.JustDown(this.autoToggleKey)) this._toggleAutoAttack();

    // allow holding the attack key to repeatedly attempt attacks; sharedTryAttack enforces cooldown
    if (this.attackKey && this.attackKey.isDown) this._tryAttack();
        this._updateEnemiesAI();
        this._updatePlayerHealthBar();
    }

    _createPortals() {
        const leftX = 80;
        // pick a portal Y inside bounds near center
        const portalY = Phaser.Math.Clamp(this.scale.height / 2, this._bounds.y1 + 40, this._bounds.y2 - 40);
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const toInner = portalHelper.createPortal(this, leftX, portalY, {
                depth: 1.5,
                targetScene: 'InnerField',
                spawnX: this.scale.width - 220,
                spawnY: this.scale.height - 120,
                promptLabel: 'Return to Inner Field'
            });
            this.innerPortal = toInner.display;
        } catch (e) {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const toInner = portalHelper.createPortal(this, leftX, groundY - 60, {
                depth: 1.5,
                targetScene: 'InnerField',
                spawnX: this.scale.width - 220,
                spawnY: this.scale.height - 120,
                promptLabel: 'Return to Inner Field'
            });
            this.innerPortal = toInner.display;
        }

        const rightX = this.scale.width - 140;
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const toGoblin = portalHelper.createPortal(this, rightX, portalY, { depth: 1.5, targetScene: 'GoblinCamp', spawnX: 120, spawnY: portalY, promptLabel: 'Goblin Camp' });
            this.goblinPortal = toGoblin.display;
            this.goblinPortalPrompt = null;
        } catch (e) {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const toGoblin = portalHelper.createPortal(this, rightX, groundY - 60, { depth: 1.5, targetScene: 'GoblinCamp', spawnX: 120, spawnY: groundY - 70, promptLabel: 'Goblin Camp' });
            this.goblinPortal = toGoblin.display;
            this.goblinPortalPrompt = null;
        }

        // portal on the highest platform (platformHeights[2]) -> GraveForest
        try {
            // place a higher portal near the top of bounds
            const highestPlatformY = this._bounds.y1 + 40;
            const highestX = this.scale.width / 2;
            const portalHelper2 = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            // Place the portal slightly above the platform (raise ~16px) so it doesn't look embedded
            const portalY = highestPlatformY - 24;
            // When entering GraveForest from OuterField, spawn in GraveForest near its portal (right side). When returning, GraveForest will spawn back to this highest platform center.
            const graveSpawnInForestX = this.scale.width - 80; // GraveForest portal X (right side)
            const graveSpawnInForestY = this.scale.height - 90; // GraveForest portal Y (platformY - 60)
            const toGraveTop = portalHelper2.createPortal(this, highestX, portalY, { depth: 1.5, targetScene: 'GraveForest', spawnX: graveSpawnInForestX, spawnY: graveSpawnInForestY, promptLabel: 'Grave Forest' });
            this.gravePortalTop = toGraveTop.display;
        } catch (e) {
            // fallback visual if helper fails
            const highestPlatformY = this.scale.height - 280;
            const highestX = this.scale.width / 2;
            this.gravePortalTop = this.add.circle(highestX, highestPlatformY - 44, 28, 0x224422, 0.95).setDepth(1.5);
            this.tweens.add({ targets: this.gravePortalTop, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
            // no further helper attach; keep fallback visual only
        }
        
    }

    // Portal behavior handled by shared portal helper via targetScene/onEnter options

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
    const rawDef = this.enemyDefs[spawn.type] || { tier: 'common', level: 1, moveSpeed: 60 };
    const def = ((rawDef && rawDef.dynamicStats) || (typeof window !== 'undefined' && window.USE_DYNAMIC_ENEMY_STATS)) ? computeEnemyStats(rawDef) : rawDef;
        // choose generated texture when possible
        const texMap = { rat: 'rat_common', zombie_rat: 'zombie_rat', ghost_rat: 'ghost_rat' };
        const tex = texMap[spawn.type] || 'rat_common';
        const enemy = this.physics.add.sprite(spawn.x, spawn.y, tex).setDepth(1.8);
        enemy.body.setCollideWorldBounds(true);
        // approximate circular body for rats
    try { setCircleCentered(enemy, Math.max(10, (enemy.width || 16) / 2)); } catch (e) { /* ignore */ }
        enemy.setData('defId', spawn.type);
    enemy.setData('hp', def.maxhp || 8);
    enemy.setData('maxhp', def.maxhp || 8);
        enemy.setData('alive', true);
        enemy.setData('spawn', spawn);
        enemy.setData('nextAttack', 0);
        enemy.setData('state', 'idle');
        enemy.setData('nextMove', this.time.now + Phaser.Math.Between(200, 1200));
        this.enemies.add(enemy);
        this._attachEnemyBars(enemy);
        spawn.active = enemy;
    }

    // reuse many helpers from InnerField/Town: persist, HUD, enemy AI, attack, etc.
    _updateEnemiesAI() {
        // delegate to shared FSM-based AI when available; fall back to no-op otherwise
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

    _buildSpawnPoints() {
        // randomized spawn points for outer field rats/zombies/ghosts
        const pts = [];
        const defs = [ { type: 'rat', count: 6, respawn: 4000 }, { type: 'zombie_rat', count: 3, respawn: 5200 }, { type: 'ghost_rat', count: 2, respawn: 6400 } ];
        for (const d of defs) {
            for (let i = 0; i < d.count; i++) {
                let tries = 0;
                let x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
                let y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
                // avoid clustering near the left spawn/entrance area
                while (Phaser.Math.Distance.Between(x, y, this.scale.width * 0.12, this.scale.height * 0.5) < 72 && tries < 12) {
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
        this.obstacles = this.obstacles || this.physics.add.staticGroup();
        const objs = [];
        const count = Phaser.Math.Between(6, 12);
        for (let i = 0; i < count; i++) {
            let tries = 0;
            let x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
            let y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
            while (Phaser.Math.Distance.Between(x, y, this.scale.width * 0.12, this.scale.height * 0.5) < 72 && tries < 12) {
                x = Phaser.Math.Between(this._bounds.x1, this._bounds.x2);
                y = Phaser.Math.Between(this._bounds.y1, this._bounds.y2);
                tries++;
            }
            const roll = Math.random();
            const type = roll < 0.6 ? 'rock_small' : (roll < 0.85 ? 'fence' : 'wall');
            try {
                const ob = this.obstacles.create(x, y, type).setDepth(1.1);
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
            } catch (e) {}
        }
        return objs;
    }

    _onPlayerDown() {
        this._showToast('You are overwhelmed! Returning to Inner Field...', 2000);
        this.player.disableBody(true, true);
        this.time.addEvent({ delay: 1800, callback: () => {
            this.char.hp = this.char.maxhp; this._persistCharacter(this.username);
            this.scene.start('InnerField', { character: this.char, username: this.username, spawnX: 180, spawnY: this.scale.height - 100 });
        }});
    }

    // small helpers delegated to shared UI in other scenes
    _recalculateVitals() { const stats = (window && window.__shared_ui && window.__shared_ui.stats) ? window.__shared_ui.stats.effectiveStats(this.char) : null; const eff = stats || { str:0,int:0,agi:0,luk:0,defense:0 }; const level = this.char.level || 1; this.char.maxhp = (eff && typeof eff.maxhp === 'number') ? eff.maxhp : Math.max(1, Math.floor(100 + level * 10 + ((eff.str || 0) * 10))); this.char.maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : Math.max(0, Math.floor(50 + level * 5 + ((eff.int || 0) * 10))); if (!this.char.expToLevel) this.char.expToLevel = 100; }
    _createHUD() { if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); }
    _updateHUD() { if (window && window.__hud_shared && window.__hud_shared.updateHUD) window.__hud_shared.updateHUD(this); }
    _destroyHUD() { if (window && window.__hud_shared && window.__hud_shared.destroyHUD) window.__hud_shared.destroyHUD(this); }
    shutdown(){
        clearActivity(this, { silent: true });
        setSceneKey(null);
        this._persistCharacter(this.username);
        this._destroyHUD();
        cleanupAmbientFx(this);
        if (this._clearToasts) this._clearToasts();
        if (this.autoIndicator) { this.autoIndicator.destroy(); this.autoIndicator = null; }
        if (this._destroyPlayerHealthBar) this._destroyPlayerHealthBar();
        if (this.damageLayer) { this.damageLayer.destroy(); this.damageLayer = null; }
        // clear obstacles
        try { if (this.obstacles && this.obstacles.clear) this.obstacles.clear(true, true); } catch (e) {}
    }
}

applyCombatMixin(OuterField.prototype);

export default OuterField;
