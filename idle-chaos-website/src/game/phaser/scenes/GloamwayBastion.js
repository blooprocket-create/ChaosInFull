import { applyCombatMixin } from './shared/combat.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { computeEnemyStats } from '../data/statFormulas.js';
import { getQuestById, getQuestObjectiveState, startQuest, checkQuestCompletion, completeQuest, getAvailableQuests, canStartQuest } from '../data/quests.js';
import { CLASS_DEFS } from '../data/classes.js';
import { RACE_DEFS } from '../data/races.js';
import { attach as attachCleanup, addTimeEvent, registerDisposer } from '../shared/cleanupManager.js';

const QUEST_CHAIN = [
    'mother_lumen_slime_cull',
    'mother_lumen_rat_cull',
    'mother_lumen_goblin_cull'
];

const CLASS_UPGRADE_CHOICES = ['horror', 'occultis', 'stalker'];

export class GloamwayBastion extends Phaser.Scene {
    constructor() {
        super('GloamwayBastion');
    }

    preload() {
        this.load.image('goblin_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    create(sceneData = {}) {
        // Attach cleanup manager early to auto-clean disposables on shutdown/destroy
        try { attachCleanup(this); } catch (e) {}
        const dataFromSettings = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        const incoming = (sceneData && typeof sceneData === 'object') ? sceneData : {};
        const data = { ...dataFromSettings, ...incoming };

        const baseEnemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const fallbackEnemyDefs = {
            goblin_slicer: {
                maxhp: 32,
                moveSpeed: 86,
                attackRange: 64,
                damage: [6, 11],
                attackCooldown: 950,
                detectionRadius: 260,
                patrolRadius: 170,
                separationRadius: 32,
                attackWindupMs: 150
            },
            goblin_flamebinder: {
                maxhp: 38,
                moveSpeed: 92,
                attackRange: 72,
                damage: [7, 13],
                attackCooldown: 900,
                detectionRadius: 280,
                patrolRadius: 180,
                separationRadius: 34,
                attackWindupMs: 140,
                attackRecoveryMs: 320
            },
            goblin_ironhowl: {
                maxhp: 52,
                moveSpeed: 96,
                attackRange: 78,
                damage: [8, 16],
                attackCooldown: 820,
                detectionRadius: 300,
                patrolRadius: 190,
                separationRadius: 36,
                attackWindupMs: 130,
                attackRecoveryMs: 360
            }
        };
        this.enemyDefs = { ...fallbackEnemyDefs, ...baseEnemyDefs };
        this._enemyAIConfig = { detectionRadius: 280, separationRadius: 34, patrolIdleMin: 420, patrolIdleMax: 1600, attackBuffer: 14 };

        this.username = data.username || null;
        this.char = data.character ? { ...data.character } : (dataFromSettings.character ? { ...dataFromSettings.character } : {});
        if (!this.char.inventory) this.char.inventory = [];

        this._persistConfig = { sceneKey: 'GloamwayBastion' };
        setSceneKey('GloamwayBastion');
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
            this.cameras.main.setBackgroundColor('#1b1422');
        }
        applyAmbientFx(this, 'goblin');

        const margin = 64;
        this._bounds = { x1: margin, x2: W - margin, y1: 96, y2: H - 120 };

        const safeWidth = 220;
        const safeHeight = 180;
        const safeCenter = { x: Math.round(W * 0.74), y: Math.round(H * 0.38) };
        this._safeZoneRect = new Phaser.Geom.Rectangle(
            safeCenter.x - safeWidth / 2,
            safeCenter.y - safeHeight / 2,
            safeWidth,
            safeHeight
        );
        this._drawSafeZone(safeCenter, safeWidth, safeHeight);

        const spawnX = (typeof data.spawnX === 'number') ? data.spawnX : Math.round(safeCenter.x);
        const spawnY = (typeof data.spawnY === 'number')
            ? data.spawnY
            : Math.round(this._safeZoneRect.y + safeHeight * 0.45);
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
    // AutoCombat removed; init call intentionally omitted.

        this._createHUD();
        this._updateHUD();
        this._createPlayerHealthBar();
        this.damageLayer = this.add.layer();
        this.damageLayer.setDepth(6);

        this.enemies = this.physics.add.group();
        this._ensureEnemyTextures();

        this._decorations = [];
        this._seedDecorations();

        this.spawnPoints = this._buildSpawnPoints();
        this.spawnPoints.forEach(sp => this._spawnEnemy(sp));

        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            if (!enemy.getData || !enemy.getData('alive')) return;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            const kx = Math.cos(angle) * 110;
            const ky = Math.sin(angle) * 110;
            try {
                player.body.velocity.x += kx;
                player.body.velocity.y += ky;
            } catch (e) {}
        });

        this._setupMotherLumen();
        // initialize mother look state (will be used to change her facing while staying stationary)
        try {
            this._motherLumenState = { facing: 'down', nextLookTime: this.time.now + Phaser.Math.Between(1200, 3200) };
        } catch (e) { this._motherLumenState = null; }

        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const portalX = Math.max(this._bounds.x1 + 48, Math.round(W * 0.18));
            const portalY = Phaser.Math.Clamp(centerY, this._bounds.y1 + 40, this._bounds.y2 - 40);
            const portalObj = portalHelper.createPortal(this, portalX, portalY, {
                depth: 1.6,
                targetScene: 'GoblinCamp',
                spawnX: Math.round(this.scale.width - 160),
                spawnY: Math.round(this.scale.height * 0.6),
                promptLabel: 'Return to Goblin Camp'
            });
            this._returnPortal = portalObj.display;
        } catch (e) { /* ignore portal errors */ }

        this.events.once('shutdown', () => this.shutdown());
    }

    update() {
        if (!this.player || !this.input) return;

        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.55, smoothing: 0.18 });
        if (!movement) return;
        const hasManualInput = movement.hasInput;
        const skipManualAnim = this.autoAttack && !hasManualInput;
        if (!this._attacking && !skipManualAnim) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });

    if (this.autoToggleKey && Phaser.Input.Keyboard.JustDown(this.autoToggleKey)) this._toggleAutoAttack();
    // allow holding the attack key to repeatedly attempt attacks; sharedTryAttack enforces cooldown
    if (this.attackKey && this.attackKey.isDown) this._tryAttack();

        this._updateEnemiesAI();
        this._updatePlayerHealthBar();
        // update Mother Lumen visual facing (idle-look) separately from prompt checks
        try { this._updateMotherLumenLook(this.time.now); } catch (e) {}
        this._updateMotherLumenPrompt();
    }

    _drawSafeZone(center, width, height) {
        try {
            const base = this.add.rectangle(center.x, center.y, width, height, 0x132432, 0.68).setDepth(1.2);
            base.setStrokeStyle(2, 0x88c8ff, 0.8);
            const glow = this.add.rectangle(center.x, center.y, width + 30, height + 30, 0x0b1824, 0.35).setDepth(1.1);
            this._safeZoneVisuals = { base, glow };
        } catch (e) {
            this._safeZoneVisuals = null;
        }
    }

    _seedDecorations() {
        if (!this._bounds) return;
        const { x1, x2, y1, y2 } = this._bounds;
        const area = (x2 - x1) * (y2 - y1);
        const decorCount = Math.max(24, Math.round(area / 85000));
        for (let i = 0; i < decorCount; i++) {
            let dx = Phaser.Math.Between(x1, x2);
            let dy = Phaser.Math.Between(y1, y2);
            let tries = 0;
            while (this._safeZoneRect && Phaser.Geom.Rectangle.Contains(this._safeZoneRect, dx, dy) && tries < 10) {
                dx = Phaser.Math.Between(x1, x2);
                dy = Phaser.Math.Between(y1, y2);
                tries++;
            }
            const type = Math.random() < 0.65 ? 'ember' : 'totem';
            let disp = null;
            try {
                const depth = 0.9 + ((dy || 0) / Math.max(1, this.scale.height)) * 0.4;
                if (type === 'ember') {
                    disp = this.add.circle(dx, dy, Phaser.Math.Between(4, 7), 0x3a6a40, 0.9).setDepth(depth);
                } else {
                    const stalk = this.add.rectangle(0, 0, 6, 26, 0x482d1c, 1);
                    const gem = this.add.circle(0, -12, 6, 0xffcc66, 1);
                    disp = this.add.container(dx, dy, [stalk, gem]).setDepth(depth);
                }
            } catch (e) { disp = null; }
            if (disp) this._decorations.push({ x: dx, y: dy, display: disp, type });
        }
        swayDecorations(this, this._decorations);
    }
    _ensureEnemyTextures() {
        try {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            if (!this.textures.exists('goblin_slicer')) {
                g.clear();
                g.fillStyle(0x5b8f38, 1);
                g.fillCircle(18, 18, 16);
                g.lineStyle(3, 0xffe08a, 0.9);
                g.strokeCircle(18, 18, 16);
                g.generateTexture('goblin_slicer', 36, 36);
            }
            if (!this.textures.exists('goblin_flamebinder')) {
                g.clear();
                g.fillStyle(0xb14a2d, 1);
                g.fillCircle(20, 20, 18);
                g.lineStyle(3, 0xf0c067, 0.85);
                g.strokeCircle(20, 20, 18);
                g.generateTexture('goblin_flamebinder', 40, 40);
            }
            if (!this.textures.exists('goblin_ironhowl')) {
                g.clear();
                g.fillStyle(0x3f4d74, 1);
                g.fillCircle(22, 22, 20);
                g.lineStyle(4, 0xcfd8ff, 0.8);
                g.strokeCircle(22, 22, 20);
                g.generateTexture('goblin_ironhowl', 44, 44);
            }
            g.destroy();
        } catch (e) { /* ignore */ }
    }

    _buildSpawnPoints() {
        const pts = [];
        if (!this._bounds) return pts;
        const { x1, x2, y1, y2 } = this._bounds;
        const count = Phaser.Math.Between(10, 14);
        for (let i = 0; i < count; i++) {
            let x = Phaser.Math.Between(x1, x2);
            let y = Phaser.Math.Between(y1, y2);
            let tries = 0;
            while (this._safeZoneRect && Phaser.Geom.Rectangle.Contains(this._safeZoneRect, x, y) && tries < 12) {
                x = Phaser.Math.Between(x1, x2);
                y = Phaser.Math.Between(y1, y2);
                tries++;
            }
            const roll = Math.random();
            let type = 'goblin_slicer';
            if (roll > 0.75) type = 'goblin_flamebinder';
            if (roll > 0.92) type = 'goblin_ironhowl';
            pts.push({ x, y, type, respawn: Phaser.Math.Between(7000, 14000), active: null });
        }
        return pts;
    }

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
    const rawDef = this.enemyDefs[spawn.type] || { tier: 'common', level: 1, moveSpeed: 86 };
    const def = ((rawDef && rawDef.dynamicStats) || (typeof window !== 'undefined' && window.USE_DYNAMIC_ENEMY_STATS)) ? computeEnemyStats(rawDef) : rawDef;
        const tex = this.textures.exists(spawn.type) ? spawn.type : 'goblin_slicer';
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
        enemy.setData('lastOutside', { x: spawn.x, y: spawn.y });
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
        if (this._safeZoneRect && !Phaser.Geom.Rectangle.Contains(this._safeZoneRect, enemy.x, enemy.y)) {
            try { enemy.setData('lastOutside', { x: enemy.x, y: enemy.y }); } catch (err) {}
        }
        let changed = false;
        if (enemy.x < this._bounds.x1 + pad) { enemy.x = this._bounds.x1 + pad; changed = true; }
        if (enemy.x > this._bounds.x2 - pad) { enemy.x = this._bounds.x2 - pad; changed = true; }
        if (enemy.y < this._bounds.y1 + pad) { enemy.y = this._bounds.y1 + pad; changed = true; }
        if (enemy.y > this._bounds.y2 - pad) { enemy.y = this._bounds.y2 - pad; changed = true; }
        if (this._safeZoneRect && Phaser.Geom.Rectangle.Contains(this._safeZoneRect, enemy.x, enemy.y)) {
            this._keepEnemyOutOfSanctuary(enemy);
            changed = true;
        }
        if (changed) {
            try { enemy.setVelocity(0, 0); } catch (e) {}
            try {
                enemy.setData('state', 'idle');
                enemy.setData('nextMove', this.time.now + Phaser.Math.Between(400, 900));
            } catch (e) {}
            this._updateEnemyBarPosition(enemy);
        }
    }

    _keepEnemyOutOfSanctuary(enemy) {
        if (!this._safeZoneRect || !enemy) return;
        const last = enemy.getData ? enemy.getData('lastOutside') : null;
        if (last && typeof last.x === 'number' && typeof last.y === 'number') {
            enemy.x = last.x;
            enemy.y = last.y;
        } else {
            const rect = this._safeZoneRect;
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const dx = enemy.x < centerX ? -1 : 1;
            const dy = enemy.y < centerY ? -1 : 1;
            enemy.x = centerX + dx * (rect.width / 2 + 12);
            enemy.y = centerY + dy * (rect.height / 2 + 12);
        }
    }
    _setupMotherLumen() {
        if (!this._safeZoneRect) return;
        const cx = this._safeZoneRect.x + this._safeZoneRect.width / 2;
        const cy = this._safeZoneRect.y + this._safeZoneRect.height / 2;
        // Prefer the dedicated mother spritesheet if it's been preloaded (Boot.js loads 'mother_idle')
        const motherTex = (this.textures && typeof this.textures.exists === 'function' && this.textures.exists('mother_idle')) ? 'mother_idle' : 'dude';
        // create sprite; if using the mother texture, start at frame 0
        const motherFrame = (motherTex === 'mother_idle') ? 0 : 4;
        this._motherLumen = this.add.sprite(cx, cy - 10, motherTex, motherFrame).setDepth(2.6);
        try {
            this._motherLumen.setTint(0xfff3b2);
            this._motherLumen.setScale(1.08);
        } catch (e) {}
        // If the mother_idle spritesheet exists but no animation key was registered globally, register a simple looping idle animation here.
        try {
            if (motherTex === 'mother_idle') {
                const animKey = 'mother_idle';
                if (!this.anims.exists(animKey)) {
                    try {
                        const frames = this.anims.generateFrameNumbers('mother_idle');
                        if (frames && frames.length) this.anims.create({ key: animKey, frames: frames, frameRate: 6, repeat: -1 });
                    } catch (e) { /* ignore frame generation errors */ }
                }
                try { this._motherLumen.play(animKey); } catch (e) { /* ignore play errors */ }
            }
        } catch (e) { /* ignore animation setup errors */ }
        this._motherLumenLabel = this.add.text(cx, this._safeZoneRect.y - 22, 'Mother Lumen\nKeeper of Paths', {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffeedd',
            align: 'center'
        }).setOrigin(0.5).setDepth(2.7);
        this._motherLumenPrompt = this.add.text(cx, this._safeZoneRect.y + this._safeZoneRect.height + 10, '[E] Commune', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.45)',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(2.7);
        this._motherLumenPrompt.setVisible(false);
        // register quest indicator for Mother Lumen via shared helper
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.registerQuestIndicators === 'function') {
                window.__shared_ui.registerQuestIndicators(this, { 'mother_lumen': this._motherLumen });
            }
        } catch (e) {}

        // Attempt to create per-direction idle animations for Mother Lumen if the spritesheet supports 4-row layout
        try {
            if (this.textures && typeof this.textures.exists === 'function' && this.textures.exists('mother_idle')) {
                const tex = this.textures.get('mother_idle');
                let frameNames = [];
                if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
                const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
                const rows = 4;
                const framesPerRow = totalFrames > 0 ? Math.floor(totalFrames / rows) : 0;
                const dirs = ['up', 'left', 'down', 'right'];
                if (framesPerRow > 0) {
                    for (let r = 0; r < rows; r++) {
                        const dir = dirs[r];
                        const start = r * framesPerRow;
                        const end = start + framesPerRow - 1;
                        const key = `mother_idle_${dir}`;
                        if (!this.anims.exists(key)) {
                            try {
                                this.anims.create({ key: key, frames: this.anims.generateFrameNumbers('mother_idle', { start: start, end: end }), frameRate: 4, repeat: -1 });
                            } catch (e) { /* ignore per-dir creation errors */ }
                        }
                    }
                    // prefer to play the down-facing idle by default
                    try { this._motherLumen.play('mother_idle_down'); } catch (e) { /* ignore */ }
                } else {
                    // fallback: if non-directional, ensure the generic animation exists (already created earlier in create())
                    try { if (this.anims.exists('mother_idle')) this._motherLumen.play('mother_idle'); } catch (e) {}
                }
            }
        } catch (e) { /* ignore animation registration errors */ }
    }

    _updateMotherLumenPrompt() {
        if (!this._motherLumen || !this.player) return;
        if (!this.keys) this.keys = {};
        if (!this.keys.interact && this.input && this.input.keyboard) {
            this.keys.interact = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        }
    const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
    const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
    const dist = Phaser.Math.Distance.Between(_px, _py, this._motherLumen.x, this._motherLumen.y);
        const canInteract = dist < 90;
        if (this._motherLumenPrompt) this._motherLumenPrompt.setVisible(canInteract && !this._dialogueOpen);
        // quest indicator visuals for Mother Lumen are handled by the shared registerQuestIndicators helper
        if (canInteract && this.keys.interact && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
            this._openMotherLumenDialogue();
        }
    }

    _updateMotherLumenLook(timeNow) {
        // Periodically change Mother Lumen's facing while keeping her stationary.
        if (!this._motherLumen || !this._motherLumenState) return;
        try {
            if (typeof timeNow !== 'number') timeNow = this.time.now;
            if (timeNow < this._motherLumenState.nextLookTime) return;
            const dirs = ['up', 'left', 'down', 'right'];
            // pick a new facing (preferably different from current)
            let newFacing = dirs[Phaser.Math.Between(0, dirs.length - 1)];
            if (dirs.length > 1 && newFacing === this._motherLumenState.facing) {
                // small chance to keep same facing; otherwise pick a different one
                if (Math.random() < 0.5) {
                    const other = dirs.filter(d => d !== this._motherLumenState.facing);
                    newFacing = other[Phaser.Math.Between(0, other.length - 1)];
                }
            }
            this._motherLumenState.facing = newFacing;
            this._motherLumenState.nextLookTime = timeNow + Phaser.Math.Between(1200, 4200);

            // Try to play a directional idle animation if available; otherwise pick a random idle frame
            const perKey = `mother_idle_${newFacing}`;
            try {
                if (this.anims.exists(perKey)) {
                    this._motherLumen.play(perKey, true);
                    return;
                }
            } catch (e) {}

            // fallback: if only generic mother_idle exists with multiple frames, set a random frame to simulate looking around
            try {
                if (this.textures && this.textures.exists('mother_idle')) {
                    const tex = this.textures.get('mother_idle');
                    let frameNames = [];
                    if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
                    const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
                    if (totalFrames > 0) {
                        const idx = Phaser.Math.Between(0, totalFrames - 1);
                        this._motherLumen.setFrame(idx);
                        return;
                    }
                }
            } catch (e) {}

            // final fallback: ensure generic animation is playing
            try { if (this.anims.exists('mother_idle')) this._motherLumen.play('mother_idle', true); } catch (e) {}
        } catch (e) { /* ignore runtime errors */ }
    }

    _openMotherLumenDialogue() {
        const card = this._ensureDialogueOverlay();
        if (!card) return;

        const completed = this.char.completedQuests || [];
        const active = this.char.activeQuests || [];
        const activeQuest = active.find(q => q && QUEST_CHAIN.includes(q.id));
        const readyQuestId = activeQuest && checkQuestCompletion(this.char, activeQuest.id) ? activeQuest.id : null;
        const nextQuestId = !activeQuest ? QUEST_CHAIN.find(id => !completed.includes(id)) : null;

        const bodyNodes = [];
        const optionConfigs = [];

        if (readyQuestId) {
            const questDef = getQuestById(readyQuestId);
            bodyNodes.push(this._createDialogueParagraph('The pathstones warm. Your deeds have rippled back to me.'));
            const states = getQuestObjectiveState(this.char, readyQuestId);
            const list = this._buildObjectiveList(questDef, states);
            if (list) bodyNodes.push(list);
            optionConfigs.push({
                label: 'Offer the completed tally',
                onClick: () => {
                    this._completeMotherLumenQuest(readyQuestId);
                    addTimeEvent(this, { delay: 50, callback: () => this._openMotherLumenDialogue() });
                }
            });
            optionConfigs.push({ label: 'Not yet', onClick: () => this._closeDialogueOverlay() });
        } else if (activeQuest) {
            const questDef = getQuestById(activeQuest.id);
            bodyNodes.push(this._createDialogueParagraph('My lantern tracks your steps. Keep pressing the shadows aside.'));
            const states = getQuestObjectiveState(this.char, activeQuest.id);
            const list = this._buildObjectiveList(questDef, states);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'I will return soon.', onClick: () => this._closeDialogueOverlay() });
        } else if (nextQuestId) {
            const questDef = getQuestById(nextQuestId);
            bodyNodes.push(this._createDialogueParagraph('Traveler, a fracture widens near the camp. Will you mend it for me?'));
            if (questDef && questDef.description) bodyNodes.push(this._createDialogueParagraph(questDef.description));
            optionConfigs.push({
                label: 'I will take this task.',
                onClick: () => {
                    this._acceptMotherLumenQuest(nextQuestId);
                    addTimeEvent(this, { delay: 50, callback: () => this._openMotherLumenDialogue() });
                }
            });
            optionConfigs.push({ label: 'Another time.', onClick: () => this._closeDialogueOverlay() });
        } else {
            // If no chain quest is active/available, check for special post-class-selection request (chieftain)
            let offeredSpecial = false;
            try {
                if (canStartQuest && canStartQuest(this.char, 'mother_lumen_request')) {
                    const qd = getQuestById('mother_lumen_request');
                    bodyNodes.push(this._createDialogueParagraph('A heavier presence treads the dark. Will you bring down their chieftain?'));
                    if (qd && qd.description) bodyNodes.push(this._createDialogueParagraph(qd.description));
                    optionConfigs.push({
                        label: 'I will face the chieftain.',
                        onClick: () => {
                            this._acceptMotherLumenQuest('mother_lumen_request');
                            addTimeEvent(this, { delay: 50, callback: () => this._openMotherLumenDialogue() });
                        }
                    });
                    optionConfigs.push({ label: 'Not yet.', onClick: () => this._closeDialogueOverlay() });
                    offeredSpecial = true;
                }
            } catch (e) {}
            if (offeredSpecial) {
                // skip the default class-upgrade/closing text when special quest is offered
                this._renderDialogue('Mother Lumen, Keeper of Paths', bodyNodes, optionConfigs);
                return;
            }
            if (this.char.class === 'beginner') {
                bodyNodes.push(this._createDialogueParagraph('Your service steadied the paths. Choose the mantle that calls to you.'));
                this._presentClassUpgradeOptions(bodyNodes, optionConfigs);
                optionConfigs.push({ label: 'I need more time.', onClick: () => this._closeDialogueOverlay() });
            } else {
                bodyNodes.push(this._createDialogueParagraph('You walk as one of the paths now. May your new mantle fit well.'));
                optionConfigs.push({ label: 'Thank you, Mother Lumen.', onClick: () => this._closeDialogueOverlay() });
            }
        }

        this._renderDialogue('Mother Lumen, Keeper of Paths', bodyNodes, optionConfigs);
    }

    _presentClassUpgradeOptions(bodyNodes, optionConfigs) {
        const desc = this._createDialogueParagraph('Each path reshapes your body and hunger. Choose only once.');
        bodyNodes.push(desc);
        CLASS_UPGRADE_CHOICES.forEach(classId => {
            const def = CLASS_DEFS[classId];
            if (!def) return;
            const statsSummary = `Base STR ${def.base.str || 0}, INT ${def.base.int || 0}, AGI ${def.base.agi || 0}, LUK ${def.base.luk || 0}`;
            const perLevelSummary = `Per level +${(def.perLevel.str || 0).toFixed(2)} STR, +${(def.perLevel.int || 0).toFixed(2)} INT, +${(def.perLevel.agi || 0).toFixed(2)} AGI, +${(def.perLevel.luk || 0).toFixed(2)} LUK`;
            bodyNodes.push(this._createDialogueParagraph(`${def.name}: ${def.description || ''}`));
            bodyNodes.push(this._createDialogueParagraph(statsSummary));
            bodyNodes.push(this._createDialogueParagraph(perLevelSummary));
            optionConfigs.push({
                label: `Bind with the ${def.name}`,
                onClick: () => {
                    this._applyClassUpgrade(classId);
                    addTimeEvent(this, { delay: 80, callback: () => this._openMotherLumenDialogue() });
                }
            });
        });
    }
    _completeMotherLumenQuest(questId) {
        const questDef = getQuestById(questId);
        completeQuest(this.char, questId);
        this._refreshQuestUi();
        this._refreshInventoryUi();
        this._recalculateVitals();
        if (typeof this.char.hp !== 'number' || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;
        this._updateHUD();
        this._updatePlayerHealthBar();
        if (this._persistCharacter) this._persistCharacter(this.username);
        const questName = (questDef && questDef.name) || questId;
        this._showToast(`Quest completed: ${questName}`, 2400);
    }

    _acceptMotherLumenQuest(questId) {
        if (!startQuest(this.char, questId)) return;
        this._refreshQuestUi();
        if (this._persistCharacter) this._persistCharacter(this.username);
        const questDef = getQuestById(questId);
        const questName = (questDef && questDef.name) || questId;
        this._showToast(`Quest accepted: ${questName}`, 2200);
    }

    _applyClassUpgrade(newClassId) {
        if (!CLASS_UPGRADE_CHOICES.includes(newClassId)) return;
        const classDef = CLASS_DEFS[newClassId];
        if (!classDef) return;
        if (!this.char) return;
        this.char.class = newClassId;

        const level = Math.max(1, this.char.level || 1);
        const raceKey = this.char.race || 'Human';
        const raceDef = RACE_DEFS[raceKey] || { base: { str: 0, int: 0, agi: 0, luk: 0 }, perLevel: { str: 0.25, int: 0.25, agi: 0.25, luk: 0.25 } };

        const stats = { str: 0, int: 0, agi: 0, luk: 0 };
        ['str', 'int', 'agi', 'luk'].forEach(stat => {
            const raceBase = (raceDef.base && raceDef.base[stat]) || 0;
            const classBase = (classDef.base && classDef.base[stat]) || 0;
            const racePer = (raceDef.perLevel && raceDef.perLevel[stat]) || 0;
            const classPer = (classDef.perLevel && classDef.perLevel[stat]) || 0;
            stats[stat] = Math.max(0, Math.round(raceBase + classBase + (racePer + classPer) * Math.max(0, level - 1)));
        });
        this.char.stats = stats;
        ['str', 'int', 'agi', 'luk'].forEach(stat => {
            const key = `_frac_${stat}`;
            if (this.char[key] !== undefined) delete this.char[key];
        });

        this._recalculateVitals();
        this.char.hp = this.char.maxhp;
        this.char.mana = this.char.maxmana;
        this._updateHUD();
        this._updatePlayerHealthBar();

        if (this._persistCharacter) this._persistCharacter(this.username);
        this._showToast(`You have embraced the path of the ${classDef.name}`, 2800);
    }

    _refreshQuestUi() {
        try {
            if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) {
                window.__shared_ui.refreshQuestLogModal(this);
            }
        } catch (e) {}
    }

    _refreshInventoryUi() {
        try {
            if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal) {
                window.__shared_ui.refreshInventoryModal(this);
            }
            if (window && window.__shared_ui && window.__shared_ui.refreshEquipmentModal) {
                window.__shared_ui.refreshEquipmentModal(this);
            }
        } catch (e) {}
    }

    _ensureDialogueOverlay() {
        if (this._dialogueOverlay && this._dialogueCard) {
            this._dialogueOpen = true;
            return this._dialogueCard;
        }
        if (typeof document === 'undefined') return null;
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(5,10,18,0.68)';
        overlay.style.zIndex = '9998';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const card = document.createElement('div');
        card.style.background = 'rgba(18,24,32,0.95)';
        card.style.color = '#fff';
        card.style.padding = '18px 20px';
        card.style.borderRadius = '14px';
        card.style.width = '360px';
        card.style.maxWidth = '86vw';
        card.style.maxHeight = '82vh';
        card.style.overflowY = 'auto';
        card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        const onOverlayClick = (ev) => {
            if (ev.target === overlay) this._closeDialogueOverlay();
        };
        overlay.addEventListener('click', onOverlayClick);
        try { registerDisposer(this, () => { try { overlay && overlay.removeEventListener('click', onOverlayClick); } catch (e) {} }); } catch (e) {}
        this._dialogueOverlay = overlay;
        this._dialogueCard = card;
        this._dialogueOpen = true;
        return card;
    }

    _closeDialogueOverlay() {
        if (this._dialogueOverlay && this._dialogueOverlay.parentNode) {
            try { this._dialogueOverlay.parentNode.removeChild(this._dialogueOverlay); } catch (e) {}
        }
        this._dialogueOverlay = null;
        this._dialogueCard = null;
        this._dialogueOpen = false;
        if (this._motherLumenPrompt) this._motherLumenPrompt.setVisible(false);
    }

    _renderDialogue(title, bodyNodes, optionConfigs) {
        const card = this._ensureDialogueOverlay();
        if (!card) return;
        card.innerHTML = '';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        const heading = document.createElement('strong');
        heading.textContent = title;
        heading.style.fontSize = '18px';
        const close = document.createElement('button');
        close.textContent = '×';
        close.style.background = 'transparent';
        close.style.border = 'none';
        close.style.color = '#fff';
        close.style.fontSize = '22px';
        close.style.cursor = 'pointer';
        close.onclick = () => this._closeDialogueOverlay();
        header.appendChild(heading);
        header.appendChild(close);
        card.appendChild(header);

        const body = document.createElement('div');
        body.style.marginTop = '12px';
        body.style.marginBottom = '16px';
        (bodyNodes || []).forEach(node => {
            if (node) body.appendChild(node);
        });
        card.appendChild(body);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.flexDirection = 'column';
        buttons.style.gap = '8px';
        (optionConfigs || []).forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt.label;
            btn.style.padding = '8px 12px';
            btn.style.border = 'none';
            btn.style.borderRadius = '8px';
            btn.style.cursor = 'pointer';
            btn.style.background = '#5c86ff';
            btn.style.color = '#fff';
            btn.onclick = () => {
                if (typeof opt.onClick === 'function') opt.onClick();
            };
            buttons.appendChild(btn);
        });
        card.appendChild(buttons);
    }

    _createDialogueParagraph(text) {
        if (typeof document === 'undefined') return null;
        const p = document.createElement('p');
        p.style.margin = '0 0 10px 0';
        p.style.lineHeight = '1.4';
        p.textContent = text;
        return p;
    }

    _buildObjectiveList(questDef, progressStates) {
        if (!questDef || !progressStates || typeof document === 'undefined') return null;
        const list = document.createElement('ul');
        list.style.paddingLeft = '18px';
        list.style.margin = '6px 0 12px 0';
        progressStates.forEach((obj) => {
            const li = document.createElement('li');
            const desc = obj.description || `Complete ${obj.required} ${obj.type}`;
            li.textContent = `${desc} — ${obj.current || 0}/${obj.required}`;
            if ((obj.current || 0) >= (obj.required || 0)) {
                li.style.color = '#8fffaf';
            }
            list.appendChild(li);
        });
        return list;
    }

    _onPlayerDown() {
        this._showToast('You fall. Mother Lumen drags you back to safety...', 2200);
        this.player.disableBody(true, true);
        addTimeEvent(this, {
            delay: 1800,
            callback: () => {
                this.char.hp = this.char.maxhp;
                this.char.mana = this.char.maxmana;
                if (this._persistCharacter) this._persistCharacter(this.username);
                this.scene.start('GoblinCamp', {
                    character: this.char,
                    username: this.username,
                    spawnX: this.scale.width - 180,
                    spawnY: Math.round(this.scale.height * 0.58)
                });
            }
        });
    }

    _recalculateVitals() {
        const stats = (window && window.__shared_ui && window.__shared_ui.stats)
            ? window.__shared_ui.stats.effectiveStats(this.char)
            : null;
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
        if (this._persistCharacter) this._persistCharacter(this.username);
        this._destroyHUD();
        cleanupAmbientFx(this);
        try { this._closeDialogueOverlay && this._closeDialogueOverlay(); } catch (e) {}
        if (this._clearToasts) this._clearToasts();
        if (this.autoIndicator) { try { this.autoIndicator.destroy(); } catch (e) {} this.autoIndicator = null; }
        if (this._destroyPlayerHealthBar) this._destroyPlayerHealthBar();
        if (this.damageLayer) { try { this.damageLayer.destroy(); } catch (e) {} this.damageLayer = null; }
        try {
            if (this.enemies) {
                const children = this.enemies.getChildren ? this.enemies.getChildren() : [];
                children.forEach(e => { try { if (e && e.destroy) e.destroy(); } catch (err) {} });
                this.enemies.clear(true, true);
            }
        } catch (e) {}
        try { if (this.obstacles) this.obstacles.clear(true, true); } catch (e) {}
        try {
            if (this._safeZoneVisuals) {
                Object.values(this._safeZoneVisuals).forEach(obj => {
                    try { if (obj && obj.destroy) obj.destroy(); } catch (err) {}
                });
                this._safeZoneVisuals = null;
            }
        } catch (e) {}
        try { if (this._motherLumen) { this._motherLumen.destroy(); this._motherLumen = null; } } catch (e) {}
        try { if (this._motherLumenLabel) { this._motherLumenLabel.destroy(); this._motherLumenLabel = null; } } catch (e) {}
        try { if (this._motherLumenPrompt) { this._motherLumenPrompt.destroy(); this._motherLumenPrompt = null; } } catch (e) {}
        if (this._dialogueOverlay) this._closeDialogueOverlay();
    }
}

applyCombatMixin(GloamwayBastion.prototype);

export default GloamwayBastion;
