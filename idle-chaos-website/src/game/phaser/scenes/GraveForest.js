// GraveForest scene: copied from Cave but with trees and woodcutting instead of mining
import LOG_DEFS from '../data/logs.js';
import { createPlayer } from '../shared/playerFactory.js';
import { persistCharacter } from './shared/persistence.js';
import { onSkillLevelUp, ensureCharTalents } from '../data/talents.js';
import { applySafeZoneRegen } from './shared/stats.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setCircleCentered } from '../shared/physicsHelpers.js';
import { updateQuestProgress, checkQuestCompletion, completeQuest, getQuestObjectiveState, getQuestById, startQuest, getAvailableQuests } from '../data/quests.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { applyCombatMixin } from './shared/combat.js';
import { attach } from '../shared/cleanupManager.js';
export class GraveForest extends Phaser.Scene {
    constructor() {
        super('GraveForest');
    }

    preload() {
        // reuse existing backgrounds if no forest art is present
        this.load.image('forest_bg', 'assets/town_bg.png');
        this.load.image('normal_log', 'assets/normal_log.png');
        this.load.image('oak_log', 'assets/oak_log.png');
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
        // animations for the player are now loaded globally in Boot (dude_idle, dude_walk, dude_run, dude_mine)
        this.load.spritesheet('furnace', 'assets/furnace.png', { frameWidth: 64, frameHeight: 96 });
    }

    create() {
        // Ensure cleanup manager is attached early for this scene
        try { attach(this); } catch (e) {}
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const W = this.scale.width;
        const H = this.scale.height;
        const portalPoints = [];
        try {
            this._forestFloor = buildThemedFloor(this, 'forest');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#273220');
        }
        applyAmbientFx(this, 'forest');

    this.add.text(centerX, 32, 'Graveyard Forest', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

    // Player spawn — use a simple bottom area instead of a platform reference
    const bottomY = Math.max(this.scale.height - 140, Math.round(this.scale.height * 0.72));
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || Math.max(80, this.scale.width * 0.12);
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (bottomY - 20);
    // create player using centralized helper so collider size/offset are consistent
    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');
    // Debug: log animation lifecycle events for this player to diagnose why chop animations end early
    try {
        if (this.player && this.player.on) {
            this.player.on('animationstart', (anim, frame) => {
                try { console.debug && console.debug('player animationstart', { key: anim && anim.key, frame: frame && frame.index }); } catch (e) {}
            });
            this.player.on('animationcomplete', (anim, frame) => {
                try { console.debug && console.debug('player animationcomplete', { key: anim && anim.key, frame: frame && frame.index }); } catch (e) {}
            });
        }
    } catch (e) {}
    // (platform removed — using bottomY for layout instead)
    // Top-down: gravity disabled inside createPlayer

    // Animations are registered globally in Boot: 'walk', 'run', 'idle', 'mine'

        if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);

        // Character data
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.woodcutting) this.char.woodcutting = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];
        this._dialogueOverlay = null;
        this._dialogueCard = null;
        this._activeDialogueNpc = null;
    try { ensureCharTalents && ensureCharTalents(this.char); } catch (e) { }
    try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) { }
        setSceneKey('GraveForest');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });

        if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();
        try {
            if (window && window.__overlays_shared && window.__overlays_shared.createAtmosphericOverlays) {
                // Moodier, darker fog for GraveForest
                this._overlays = window.__overlays_shared.createAtmosphericOverlays(this, {
                    idPrefix: 'graveforest',
                    zIndexBase: 120,
                    layers: ['fog'],
                    fogVeilColor: 'rgba(30,40,38,0.045)',
                    fogColors: [
                        'rgba(160,170,170,1)',
                        'rgba(140,150,150,1)',
                        'rgba(120,130,130,1)'
                    ],
                    fogAlphaMin: 0.06,
                    fogAlphaMax: 0.16,
                    fogCount: 140
                });
            }
        } catch (e) { this._overlays = null; }
    this._startSafeZoneRegen();

        // Rowan Boneaxe NPC (animated like Mayor Grimsley)
        const rowanX = Math.round(centerX + (this.scale.width * 0.22));
        const rowanY = Math.round(centerY * 0.7);
        // ensure animations for Rowan are registered before creating the sprite
        try { this._ensureRowanAnimations && this._ensureRowanAnimations(); } catch (e) {}
        try {
            // prefer sprite sheets if available (Boot registers 'rowan_idle' and 'rowan_walk')
            if (this.textures && this.textures.exists && this.textures.exists('rowan_idle')) {
                this._rowan = this.add.sprite(rowanX, rowanY, 'rowan_idle').setOrigin(0.5, 0.9).setDepth(1.5);
                // default to idle facing down
                try { this._playRowanAnimation && this._playRowanAnimation('idle', 'down'); } catch (e) {}
            } else {
                this._rowan = this.add.rectangle(rowanX, rowanY, 48, 64, 0x2f4a5f, 1).setDepth(1.5);
            }
        } catch (e) {
            this._rowan = this.add.rectangle(rowanX, rowanY, 48, 64, 0x2f4a5f, 1).setDepth(1.5);
        }
        this._rowanLabel = this.add.text(rowanX, rowanY - 50, 'Rowan Boneaxe', { fontSize: '16px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this._rowanPrompt = this.add.text(rowanX, rowanY - 74, '[E] Talk to Rowan Boneaxe', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this._rowanPrompt.setVisible(false);
        // rowan movement/animation state (mirrors Mayor behavior)
        this._rowanState = {
            home: { x: rowanX, y: rowanY },
            radius: 110,
            speed: 32,
            facing: 'down',
            target: null,
            idleUntil: this.time.now + Phaser.Math.Between(1400, 2800)
        };
    // register quest indicator for Rowan using shared helper (creates visuals and update handler)
    try {
        if (window && window.__shared_ui && typeof window.__shared_ui.registerQuestIndicators === 'function') {
            window.__shared_ui.registerQuestIndicators(this, { 'rowan_boneaxe': this._rowan });
        }
    } catch (e) {}
        this._updateRowanQuestProgress('travel', 'GraveForest', 1);

        // Portal back to OuterField: center-bottom
    const portalX = Math.max(centerX - 80, 80);
        const portalY = Math.max(bottomY - 48, this.scale.height - 100);
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            // spawn near center bottom of OuterField for reciprocity
            const outerSpawnX = Math.round(this.scale.width / 2);
            const outerSpawnY = Math.max(this.scale.height - 280, bottomY) - 70;
            const pobj = portalHelper.createPortal(this, portalX, portalY, { depth: 1.5, targetScene: 'OuterField', spawnX: outerSpawnX, spawnY: outerSpawnY, promptLabel: 'Return to Outer Field' });
            this.portal = pobj.display;
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Outer Field', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
            try { this.time.delayedCall(220, () => { if (pobj && pobj.tryUpgrade) pobj.tryUpgrade(); }); } catch (e) {}
        } catch (e) {
            this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Outer Field', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
        }
        portalPoints.push({ x: portalX, y: portalY, radius: 120 });
        const dockPortalX = Math.min(this.scale.width - 80, centerX + 80);
        const dockPortalY = Math.max(72, Math.round(this.scale.height * 0.18));
        portalPoints.push({ x: dockPortalX, y: dockPortalY, radius: 110 });

        // No combat in GraveForest: do not attach combat mixins or spawn enemies

    // Procedural placement of clustered trees using LOG_DEFS.
    // Place clusters on the dock/platform area but avoid the portal, furnace and player spawn.
    // platformTop removed; kept bottomY for layout calculations
    // widen vertical spread to match Cave-like placement
    const treeMargin = 96;
    const treeBounds = { x1: treeMargin, x2: this.scale.width - treeMargin, y1: 120, y2: Math.max(220, this.scale.height - 180) };
        // helper to avoid placing clusters too close to key elements
        const isNearPortal = (x, y, buffer = 110) => {
            for (let i = 0; i < portalPoints.length; i++) {
                const p = portalPoints[i];
                if (!p) continue;
                const radius = p.radius != null ? p.radius : buffer;
                if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < radius) return true;
            }
            return false;
        };
        const isTooCloseTree = (x, y) => {
            try { if (this.furnace && Phaser.Math.Distance.Between(x, y, this.furnace.x, this.furnace.y) < 120) return true; } catch (e) {}
            if (isNearPortal(x, y, 120)) return true;
            try { if (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 80) return true; } catch (e) {}
            // avoid placing trees too close to Rowan Boneaxe NPC
            try { if (this._rowan && Phaser.Math.Distance.Between(x, y, this._rowan.x, this._rowan.y) < 110) return true; } catch (e) {}
            if (this.treeNodes && this.treeNodes.length) {
                for (const p of this.treeNodes) if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < 56) return true;
            }
            return false;
        };

        // read defs (fallback to window.LOG_DEFS if available)
        let logDefs = null;
        try { logDefs = (typeof LOG_DEFS !== 'undefined') ? LOG_DEFS : (window && window.LOG_DEFS) ? window.LOG_DEFS : null; } catch (e) { logDefs = null; }
        if (!logDefs) logDefs = { normal: { clusters: 2, perCluster: 4, clusterRadius: 120 }, oak: { clusters: 1, perCluster: 3, clusterRadius: 120 } };

        // place clusters for each tree type
        this.treeNodes = this.treeNodes || [];
    const placed = [];
    const margin = 80;
        const minSeparation = 48;
        for (const key of Object.keys(logDefs)) {
            const cfg = logDefs[key] || {};
            const clusters = cfg.clusters || 1;
            const perCluster = cfg.perCluster || 3;
            const clusterRadius = cfg.clusterRadius || 96;
            for (let c = 0; c < clusters; c++) {
                let cx = 0, cy = 0, attempts = 0;
                do {
                    cx = Phaser.Math.Between(treeBounds.x1, treeBounds.x2);
                    cy = Phaser.Math.Between(treeBounds.y1, treeBounds.y2);
                    attempts++;
                } while (isTooCloseTree(cx, cy) && attempts < 30);
                if (isTooCloseTree(cx, cy)) continue;
                // spawn perCluster nodes around the cluster center
                for (let i = 0; i < perCluster; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let rad = Math.random() * clusterRadius;
                    let nx = Math.round(cx + Math.cos(angle) * rad);
                    let ny = Math.round(cy + Math.sin(angle) * rad);
                    // clamp
                    nx = Phaser.Math.Clamp(nx, treeBounds.x1, treeBounds.x2);
                    ny = Phaser.Math.Clamp(ny, treeBounds.y1, treeBounds.y2);
                    let innerAttempts = 0;
                    while (isTooCloseTree(nx, ny) && innerAttempts < 20) {
                        angle = Math.random() * Math.PI * 2; rad = Math.random() * clusterRadius;
                        nx = Math.round(cx + Math.cos(angle) * rad);
                        ny = Math.round(cy + Math.sin(angle) * rad);
                        nx = Phaser.Math.Clamp(nx, treeBounds.x1, treeBounds.x2);
                        ny = Phaser.Math.Clamp(ny, treeBounds.y1, treeBounds.y2);
                        innerAttempts++;
                    }
                    if (!isTooCloseTree(nx, ny)) {
                        // prefer the scene helper so prompt/placement logic is reused
                        try { this._createTreeNode(nx, ny, key); placed.push({ x: nx, y: ny, type: key }); } catch (e) { /* fallback: draw a circle */
                            try { const r = 28; const circle = this.add.circle(nx, ny, r, (cfg.color || 0x2e8b57), 1).setDepth(1.2); } catch (e2) {}
                        }
                    }
                }
            }
        }

        // add tombstones/graves as procedural decorations with static colliders
        this._graveColliders = this._graveColliders || [];
        const graveCount = Math.max(3, Math.round((this.scale.width * this.scale.height) / 90000));
        for (let i = 0; i < graveCount; i++) {
            let gx = Phaser.Math.Between(treeBounds.x1, treeBounds.x2);
            let gy = Phaser.Math.Between(treeBounds.y1, treeBounds.y2);
            let gtries = 0;
            while (isTooCloseTree(gx, gy) && gtries < 40) { gx = Phaser.Math.Between(treeBounds.x1, treeBounds.x2); gy = Phaser.Math.Between(treeBounds.y1, treeBounds.y2); gtries++; }
            if (isTooCloseTree(gx, gy)) continue;
            // draw a simple grave: a small rectangle with a darker top to suggest a headstone
            const graveW = Phaser.Math.Between(18, 28);
            const graveH = Phaser.Math.Between(26, 42);
            const base = this.add.rectangle(gx, gy, graveW, graveH - 10, 0x44403f).setDepth(1.05);
            const head = this.add.rectangle(gx, gy - (graveH/2) + 8, graveW * 0.6, 12, 0x2b2626).setDepth(1.15);
            // create an invisible collider zone centered on the grave so player bumps into it
            try {
                const gz = this.add.rectangle(gx, gy, graveW + 6, graveH + 6, 0x000000, 0).setDepth(1.0);
                try { this.physics.add.existing(gz, true); } catch (e) {}
                // use arcade body size (setSize) for rectangle; no setCircle here
                try { if (gz.body && typeof gz.body.setSize === 'function') gz.body.setSize(graveW + 6, graveH + 6); } catch (e) {}
                try { if (this.player && this.player.body) this.physics.add.collider(this.player, gz); } catch (e) {}
                this._graveColliders.push(gz);
                base._graveCollider = gz; head._graveCollider = gz;
            } catch (e) { /* ignore collider creation errors */ }
        }

        // scatter small bone decorations (no colliders) — create container-based bone shapes
        this._bones = this._bones || [];
        const boneCount = Math.max(6, Math.round((this.scale.width * this.scale.height) / 160000));
        for (let i = 0; i < boneCount; i++) {
            const bx = Phaser.Math.Between(treeBounds.x1, treeBounds.x2);
            const by = Phaser.Math.Between(treeBounds.y1, treeBounds.y2);
            const br = Phaser.Math.Between(4, 8);
            try {
                // bone: shaft (thin rectangle) + two rounded ends (small circles)
                const shaftW = Math.max(6, Math.round(br * 1.8));
                const shaftH = Math.max(2, Math.round(br * 0.55));
                const shaft = this.add.rectangle(0, 0, shaftW, shaftH, 0xfff4ec).setOrigin(0.5).setDepth(1.06);
                const endOffset = Math.max(shaftW / 2 - 2, 4);
                const end1 = this.add.circle(-endOffset, 0, Math.max(2, Math.round(br * 0.6)), 0xfff4ec).setDepth(1.07);
                const end2 = this.add.circle(endOffset, 0, Math.max(2, Math.round(br * 0.6)), 0xfff4ec).setDepth(1.07);
                const bone = this.add.container(bx, by, [shaft, end1, end2]);
                bone.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
                bone.setScale(Phaser.Math.FloatBetween(0.85, 1.15));
                this._bones.push(bone);
            } catch (e) {
                try { const fallback = this.add.ellipse(bx, by, br * 2, br, 0xfff4ec, 1).setDepth(1.06); fallback.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2); this._bones.push(fallback); } catch (e2) {}
            }
        }

        // Portal to BrokenDock (left-side near entrance)
        try {
            // move the broken dock portal off-center so it doesn't sit directly above the OuterField portal
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const pob = portalHelper.createPortal(this, dockPortalX, dockPortalY, { depth: 1.5, targetScene: 'BrokenDock', spawnX: Math.round(this.scale.width/2), spawnY: 120, promptLabel: 'Enter Broken Dock' });
            this.brokenDockPortal = pob.display;
            this.brokenDockPrompt = this.add.text(dockPortalX, dockPortalY - 60, '[E] Enter Broken Dock', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.brokenDockPrompt.setVisible(false);
        } catch (e) {
            this.brokenDockPortal = this.add.circle(dockPortalX, dockPortalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.brokenDockPrompt = this.add.text(dockPortalX, dockPortalY - 60, '[E] Enter Broken Dock', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.brokenDockPrompt.setVisible(false);
        }

        // Decorative flora (grass & flowers) — non-colliding, modeled after Town decorations
        this._decorations = this._decorations || [];
        const decorCount = Math.max(28, Math.round((this.scale.width * this.scale.height) / 60000));
        const decorBounds = { x1: treeBounds.x1, x2: treeBounds.x2, y1: treeBounds.y1, y2: treeBounds.y2 };
        for (let i = 0; i < decorCount; i++) {
            let dx = Phaser.Math.Between(decorBounds.x1, decorBounds.x2);
            let dy = Phaser.Math.Between(decorBounds.y1, decorBounds.y2);
            let tries = 0;
            while ((Phaser.Math.Distance.Between(dx, dy, centerX, centerY) < 40 || isNearPortal(dx, dy, 96)) && tries < 12) {
                dx = Phaser.Math.Between(decorBounds.x1, decorBounds.x2);
                dy = Phaser.Math.Between(decorBounds.y1, decorBounds.y2);
                tries++;
            }
            if (isTooCloseTree(dx, dy) || isNearPortal(dx, dy, 96)) continue;
            const type = (Math.random() < 0.7) ? 'grass' : 'flower';
            let disp = null;
            try {
                const varDepth = 0.6 + ((dy || 0) / Math.max(1, this.scale.height)) * 0.2;
                if (type === 'grass') {
                    const r = Phaser.Math.Between(6, 14);
                    disp = this.add.ellipse(dx, dy, r * 1.6, r * 0.9, 0x173a17, 1).setDepth(varDepth);
                    disp.setAlpha(0.9);
                } else {
                    const petal = this.add.circle(0, -2, 5, 0x6b2f6b, 1);
                    const center = this.add.circle(0, -2, 2, 0xcc9933, 1);
                    try { disp = this.add.container(dx, dy, [petal, center]); disp.setDepth(varDepth); } catch (e) { disp = petal; if (disp && typeof disp.setDepth === 'function') disp.setDepth(varDepth); }
                }
            } catch (e) {
                try { disp = this.add.circle(dx, dy, 5, 0x3a7a2a, 1).setDepth(0.6); } catch (e) { disp = null; }
            }
        if (disp) this._decorations.push({ x: dx, y: dy, type: type, display: disp });
    }
        swayDecorations(this, this._decorations);

        // continuous woodcutting state
        this.woodcuttingActive = false;
        this._woodcuttingEvent = null;
        this.woodcuttingInterval = 2800;

        this._toastContainer = null;

        this.events.once('shutdown', () => {
            clearActivity(this, { silent: true });
            setSceneKey(null);
            this._destroyHUD();
            this._clearToasts();
            this._closeDialogueOverlay();
            this._stopSafeZoneRegen();
            cleanupAmbientFx(this);
            if (this._woodcuttingIndicator && this._woodcuttingIndicator.parent) { this._woodcuttingIndicator.destroy(); this._woodcuttingIndicator = null; }
            try { if (this._overlays && this._overlays.destroy) this._overlays.destroy(); } catch(e) {}
            this._overlays = null;
            // cleanup procedural floor
            try { if (this._forestFloor && this._forestFloor.destroy) this._forestFloor.destroy(); } catch (e) {}
            this._forestFloor = null;
            try { if (this._rowan && this._rowan.destroy) this._rowan.destroy(); } catch (e) {}
            try { if (this._rowanLabel && this._rowanLabel.destroy) this._rowanLabel.destroy(); } catch (e) {}
            try { if (this._rowanPrompt && this._rowanPrompt.destroy) this._rowanPrompt.destroy(); } catch (e) {}
            this._rowan = null;
            this._rowanLabel = null;
            this._rowanPrompt = null;
            // cleanup tree nodes
            try { if (this.treeNodes && Array.isArray(this.treeNodes)) { for (const t of this.treeNodes) { try { if (t && t.sprite && t.sprite.destroy) t.sprite.destroy(); } catch (e) {} try { if (t && t.prompt && t.prompt.destroy) t.prompt.destroy(); } catch (e) {} } } } catch (e) {}
            this.treeNodes = null;
            // cleanup tree colliders
            try { if (this._treeColliders && Array.isArray(this._treeColliders)) { for (const c of this._treeColliders) { try { if (c && c.destroy) c.destroy(); } catch (e) {} } } } catch (e) {}
            this._treeColliders = null;
            // cleanup decorative flora
            try { if (this._decorations && Array.isArray(this._decorations)) { for (const d of this._decorations) { try { if (d && d.display && d.display.destroy) d.display.destroy(); } catch (e) {} } } } catch (e) {}
            this._decorations = null;
            // cleanup bone decorations
            try { if (this._bones && Array.isArray(this._bones)) { for (const b of this._bones) { try { if (b && b.destroy) b.destroy(); } catch (e) {} } } } catch (e) {}
            this._bones = null;
            // cleanup grave colliders
            try { if (this._graveColliders && Array.isArray(this._graveColliders)) { for (const g of this._graveColliders) { try { if (g && g.destroy) g.destroy(); } catch (e) {} } } } catch (e) {}
            this._graveColliders = null;
            this._closeInventoryModal();
            if (this._keyHandlers && this.input && this.input.keyboard) {
                try {
                    if (this._keyHandlers.i) this.input.keyboard.off('keydown-I', this._keyHandlers.i);
                    if (this._keyHandlers.u) this.input.keyboard.off('keydown-U', this._keyHandlers.u);
                    if (this._keyHandlers.x) this.input.keyboard.off('keydown-X', this._keyHandlers.x);
                    if (this._keyHandlers.q) this.input.keyboard.off('keydown-Q', this._keyHandlers.q);
                    if (this._keyHandlers.t) this.input.keyboard.off('keydown-T', this._keyHandlers.t);
                } catch (e) { /* ignore key cleanup errors */ }
            }
        });
    }

    _openRowanDialogue() {
        this._activeDialogueNpc = 'rowan';
        this._updateRowanQuestProgress('talk', 'rowan_boneaxe', 1);

        const questId = 'tutorial_meet_rowan';
        const questDef = getQuestById ? getQuestById(questId) : null;
        const hadActive = (this.char.activeQuests || []).some(q => q.id === questId);
        let justCompleted = false;
        if (hadActive && checkQuestCompletion(this.char, questId)) {
            completeQuest(this.char, questId);
            justCompleted = true;
            const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
            if (this._persistCharacter) this._persistCharacter(username);
            try {
                if (window && window.__shared_ui) {
                    if (window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this);
                    if (window.__shared_ui.refreshInventoryModal) window.__shared_ui.refreshInventoryModal(this);
                    if (window.__shared_ui.refreshEquipmentModal) window.__shared_ui.refreshEquipmentModal(this);
                }
            } catch (e) {}
            try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
            this._showToast('Quest completed: ' + ((questDef && questDef.name) || questId), 2200);
        }

        const nowCompleted = (this.char.completedQuests || []).includes(questId);
        const activeRowan = (this.char.activeQuests || []).find(q => q.id === questId);
        const bodyNodes = [];
        const optionConfigs = [];
        const objectiveStateFn = (typeof window !== 'undefined' && window.getQuestObjectiveState) ? window.getQuestObjectiveState : getQuestObjectiveState;
        const woodQuestId = 'tutorial_chop_wood';
        const woodQuestDef = getQuestById ? getQuestById(woodQuestId) : null;
        const activeWoodQuest = (this.char.activeQuests || []).find(q => q.id === woodQuestId);
        const woodQuestCompleted = (this.char.completedQuests || []).includes(woodQuestId);
        const woodQuestReady = activeWoodQuest && checkQuestCompletion(this.char, woodQuestId);

        if (woodQuestReady) {
            bodyNodes.push(this._createDialogueParagraph('You gathered what I asked for. Those logs will keep the watch-fires burning.'));
            const woodStates = objectiveStateFn ? objectiveStateFn(this.char, woodQuestId) : getQuestObjectiveState(this.char, woodQuestId);
            const list = this._buildObjectiveList(woodQuestDef, woodStates);
            if (list) bodyNodes.push(list);
            optionConfigs.push({
                label: 'Hand over the logs',
                onClick: () => {
                    this._completeRowanWoodQuest();
                }
            });
            optionConfigs.push({ label: 'Give me a moment.', onClick: () => this._closeDialogueOverlay() });
        } else if (activeWoodQuest) {
            bodyNodes.push(this._createDialogueParagraph('Keep splitting those trunks. The village needs the timber and the calm it brings.'));
            const woodStates = objectiveStateFn ? objectiveStateFn(this.char, woodQuestId) : getQuestObjectiveState(this.char, woodQuestId);
            const list = this._buildObjectiveList(woodQuestDef, woodStates);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Back to chopping.', onClick: () => this._closeDialogueOverlay() });
        } else if (justCompleted || nowCompleted) {
            bodyNodes.push(this._createDialogueParagraph('You made it through the forest. Good-Mayor Grimsley can rest easier knowing you\'re here.'));
            bodyNodes.push(this._createDialogueParagraph('Keep your eyes sharp. The Grave Forest hides more than restless spirits.'));
            if (!woodQuestCompleted) {
                if (woodQuestDef && woodQuestDef.description) {
                    bodyNodes.push(this._createDialogueParagraph(woodQuestDef.description));
                }
                optionConfigs.push({
                    label: 'I can gather your wood.',
                    onClick: () => {
                        this._acceptRowanWoodQuest();
                    }
                });
                optionConfigs.push({ label: 'Another time.', onClick: () => this._closeDialogueOverlay() });
            } else {
                optionConfigs.push({ label: 'I\'ll be ready.', onClick: () => this._closeDialogueOverlay() });
            }
        } else if (activeRowan) {
            bodyNodes.push(this._createDialogueParagraph('Rowan Boneaxe at your service. The mayor must think highly of you if he sent you here.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, questId) : null;
            const list = this._buildObjectiveList(questDef, states);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'I\'ll hold the line.', onClick: () => this._closeDialogueOverlay() });
        } else {
            bodyNodes.push(this._createDialogueParagraph('Another traveler braving the graves? Stay close to the lantern light and you may survive.'));
            optionConfigs.push({ label: 'Understood.', onClick: () => this._closeDialogueOverlay() });
        }

        this._renderDialogue('Rowan Boneaxe', bodyNodes, optionConfigs);
    }

    _updateRowanQuestProgress(type, itemId, amount = 1) {
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.updateQuestProgressAndCheckCompletion === 'function') {
                window.__shared_ui.updateQuestProgressAndCheckCompletion(this, type, itemId, amount);
            } else {
                updateQuestProgress(this.char, type, itemId, amount);
                const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                if (this._persistCharacter) this._persistCharacter(username);
                try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
            }
        } catch (e) {}
    }

    _acceptRowanWoodQuest() {
        const questId = 'tutorial_chop_wood';
        const questDef = getQuestById ? getQuestById(questId) : null;
        if (!startQuest) { this._closeDialogueOverlay(); return; }
        if ((this.char.activeQuests || []).some(q => q.id === questId)) {
            this._closeDialogueOverlay();
            return;
        }
        const started = startQuest(this.char, questId);
        if (started) {
            const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
            if (this._persistCharacter) this._persistCharacter(username);
            try {
                if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this);
            } catch (e) {}
            this._showToast('Quest started: ' + ((questDef && questDef.name) || questId), 2200);
        }
        this._closeDialogueOverlay();
    }

    _completeRowanWoodQuest() {
        const questId = 'tutorial_chop_wood';
        const questDef = getQuestById ? getQuestById(questId) : null;
        const completed = completeQuest(this.char, questId);
        if (completed) {
            const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
            if (this._persistCharacter) this._persistCharacter(username);
            try {
                if (window && window.__shared_ui) {
                    if (window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this);
                    if (window.__shared_ui.refreshInventoryModal) window.__shared_ui.refreshInventoryModal(this);
                    if (window.__shared_ui.refreshEquipmentModal) window.__shared_ui.refreshEquipmentModal(this);
                }
            } catch (e) {}
            this._showToast('Quest completed: ' + ((questDef && questDef.name) || questId), 2400);
            if (this._updateHUD) {
                try { this._updateHUD(); } catch (e) {}
            }
        }
        this._closeDialogueOverlay();
    }

    _ensureDialogueOverlay() {
        if (this._dialogueOverlay) {
            return this._dialogueCard;
        }
        if (typeof document === 'undefined') return null;
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.65)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '245';

        const card = document.createElement('div');
        card.style.background = 'linear-gradient(135deg,#1f2b2f,#0f1619)';
        card.style.borderRadius = '12px';
        card.style.padding = '18px';
        card.style.color = '#fff';
        card.style.minWidth = '340px';
        card.style.maxWidth = '480px';
        card.style.boxShadow = '0 18px 32px rgba(0,0,0,0.55)';

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        this._dialogueOverlay = overlay;
        this._dialogueCard = card;
        return card;
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
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => this._closeDialogueOverlay();
        header.appendChild(heading);
        header.appendChild(closeBtn);
        card.appendChild(header);

        const body = document.createElement('div');
        body.style.marginTop = '12px';
        body.style.marginBottom = '16px';
        for (const node of bodyNodes) {
            if (node) body.appendChild(node);
        }
        card.appendChild(body);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.flexDirection = 'column';
        buttons.style.gap = '8px';
        for (const opt of optionConfigs) {
            const btn = document.createElement('button');
            btn.textContent = opt.label;
            btn.style.padding = '8px 12px';
            btn.style.border = 'none';
            btn.style.borderRadius = '8px';
            btn.style.cursor = 'pointer';
            btn.style.background = '#2f6b46';
            btn.style.color = '#fff';
            btn.onclick = () => {
                if (typeof opt.onClick === 'function') opt.onClick();
            };
            buttons.appendChild(btn);
        }
        card.appendChild(buttons);
    }

    _createDialogueParagraph(text) {
        if (typeof document === 'undefined') return null;
        const p = document.createElement('p');
        p.style.margin = '0 0 10px 0';
        p.textContent = text;
        return p;
    }

    _buildObjectiveList(questDef, progressStates) {
        if (typeof document === 'undefined') return null;
        if (!questDef || !Array.isArray(questDef.objectives) || questDef.objectives.length === 0) return null;
        const list = document.createElement('ul');
        list.style.margin = '8px 0 16px 16px';
        list.style.padding = '0';
        for (const obj of questDef.objectives) {
            const li = document.createElement('li');
            li.style.marginBottom = '4px';
            const required = obj.required || 1;
            const label = obj.description || obj.type;
            if (progressStates) {
                const targetId = obj.itemId || obj.enemyId || null;
                const state = progressStates.find(s => s && s.type === obj.type && (targetId ? s.itemId === targetId : true));
                const current = state ? Math.min(state.current || 0, required) : 0;
                li.textContent = `${label}: ${current} / ${required}`;
            } else {
                li.textContent = `${label}: ${required}`;
            }
            list.appendChild(li);
        }
        return list;
    }

    _closeDialogueOverlay() {
        if (this._dialogueOverlay) {
            try {
                if (this._dialogueOverlay.parentNode) this._dialogueOverlay.parentNode.removeChild(this._dialogueOverlay);
            } catch (e) {}
        }
        this._dialogueOverlay = null;
        this._dialogueCard = null;
        this._activeDialogueNpc = null;
    }

    _startSafeZoneRegen() {
        const regenDelay = 1800;
        if (this.safeRegenEvent) this.safeRegenEvent.remove(false);
        this.safeRegenEvent = this.time.addEvent({ delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
    }
    _stopSafeZoneRegen() { if (this.safeRegenEvent) { this.safeRegenEvent.remove(false); this.safeRegenEvent = null; } }
    _tickSafeZoneRegen() { if (!this.char) return; try { applySafeZoneRegen(this); } catch (e) {} }

    _openInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.openInventoryModal) return window.__shared_ui.openInventoryModal(this); }
    _closeInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.closeInventoryModal) return window.__shared_ui.closeInventoryModal(this); }
    _refreshInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal) return window.__shared_ui.refreshInventoryModal(this); }
    _openEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.openEquipmentModal) return window.__shared_ui.openEquipmentModal(this); }
    _closeEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.closeEquipmentModal) return window.__shared_ui.closeEquipmentModal(this); }
    _refreshEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.refreshEquipmentModal) return window.__shared_ui.refreshEquipmentModal(this); }
    _equipItemFromInventory(itemId) { if (window && window.__shared_ui && window.__shared_ui.equipItemFromInventory) return window.__shared_ui.equipItemFromInventory(this, itemId); }
    _unequipItem(slot) { if (window && window.__shared_ui && window.__shared_ui.unequipItem) return window.__shared_ui.unequipItem(this, slot); }
    _applyEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.applyEquipmentBonuses) return window.__shared_ui.applyEquipmentBonuses(this, eq); }
    _removeEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.removeEquipmentBonuses) return window.__shared_ui.removeEquipmentBonuses(this, eq); }
    _createHUD() { if (window && window.__hud_shared && window.__hud_shared.createHUD) return window.__hud_shared.createHUD(this); }
    _destroyHUD() { if (window && window.__hud_shared && window.__hud_shared.destroyHUD) return window.__hud_shared.destroyHUD(this); }
    _updateHUD() { if (window && window.__hud_shared && window.__hud_shared.updateHUD) return window.__hud_shared.updateHUD(this); try { this._destroyHUD(); this._createHUD(); } catch(e) {} }

    // --- Tree node creation ---
    _createTreeNode(x, y, type = 'normal') {
        if (!this.treeNodes) this.treeNodes = [];
        const defs = (typeof LOG_DEFS !== 'undefined') ? LOG_DEFS : (window && window.LOG_DEFS) ? window.LOG_DEFS : null;
        const fallback = {
            normal: { color: 0x2e8b57, baseChance: 0.75, itemId: 'normal_log', label: 'Tree', minEfficiency: 10, baseExp: 10, baseYield: 1 },
            oak: { color: 0x6b8e23, baseChance: 0.45, itemId: 'oak_log', label: 'Oak Tree', minEfficiency: 22, baseExp: 22, baseYield: 1 }
        };
        const usedDef = (defs && defs[type]) ? defs[type] : (fallback[type] || fallback.normal);
        const node = {};
        node.type = type;
        node.x = x; node.y = y; node.r = 28;
        node.baseChance = (usedDef && usedDef.baseChance != null) ? usedDef.baseChance : 0.35;
        const itemId = (usedDef && usedDef.itemId) ? usedDef.itemId : `${type || 'normal'}_log`;
        const itemName = (usedDef && usedDef.label) ? usedDef.label.replace(/ Tree$/,' Log') : ((type || 'Log') + ' Log');
        node.item = { id: itemId, name: itemName };
        node.color = (usedDef && usedDef.color != null) ? usedDef.color : 0x2e8b57;
        node.label = (usedDef && usedDef.label) ? usedDef.label : (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Tree');
        node.minEfficiency = (usedDef && usedDef.minEfficiency != null) ? usedDef.minEfficiency : 12;
        node.baseExp = (usedDef && usedDef.baseExp != null) ? usedDef.baseExp : 15;
        node.baseYield = (usedDef && usedDef.baseYield != null) ? usedDef.baseYield : 1;
        if (usedDef && usedDef.failExp != null) node.failExp = usedDef.failExp;
        if (usedDef && usedDef.maxMultiplier != null) node.maxMultiplier = usedDef.maxMultiplier;
        // try to use sprites if available
        const spriteKey = (usedDef && usedDef.sprite) ? usedDef.sprite : null;
        if (spriteKey && this.textures.exists && this.textures.exists(spriteKey)) {
            try {
                // create a sprite from the spritesheet key. If Boot.js registered a looping
                // animation like `tree_<type>` we'll play it so the tree is animated.
                node.sprite = this.add.sprite(x, y, spriteKey).setOrigin(0.5).setDepth(1.2);
                const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                const adjustedY = y + (node.r - (hh / 2));
                node.sprite.y = adjustedY;
                // keep logical center aligned with visual
                node.y = adjustedY;

                // play the tree animation if available (e.g. `tree_normal`, `tree_oak`)
                const animKey = `tree_${type}`;
                try {
                    if (this.anims && typeof this.anims.exists === 'function' && this.anims.exists(animKey)) {
                        node.sprite.anims.play(animKey, true);
                    }
                } catch (e) { /* ignore animation play errors */ }
            } catch (e) {
                node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
            }
        
        } else if (type === 'normal' && this.textures.exists && this.textures.exists('normal_log')) {
            try {
                node.sprite = this.add.sprite(x, y, 'normal_log').setOrigin(0.5).setDepth(1.2);
                const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                const adjustedY = y + (node.r - (hh / 2));
                node.sprite.y = adjustedY;
                // align logical center with visual sprite
                node.y = adjustedY;
            } catch (e) { node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2); }
        } else if (type === 'oak' && this.textures.exists && this.textures.exists('oak_log')) {
            try {
                node.sprite = this.add.sprite(x, y, 'oak_log').setOrigin(0.5).setDepth(1.2);
                const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                const adjustedY = y + (node.r - (hh / 2));
                node.sprite.y = adjustedY;
                node.y = adjustedY;
            } catch (e) { node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2); }
        } else {
            node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
        }
        const promptText = node.minEfficiency
            ? `[E] Chop ${node.label}\n(Req Eff ${node.minEfficiency})`
            : `[E] Chop ${node.label}`;
    node.prompt = this.add.text(node.x, node.y - 60, promptText, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 }, align: 'center' }).setOrigin(0.5).setDepth(2);
        node.prompt.setVisible(false);
        // create an invisible static collider so the player bumps into the tree
        try {
            this._treeColliders = this._treeColliders || [];
            const cz = this.add.circle(node.x, node.y, node.r, 0x000000, 0).setDepth(1.0);
            try { if (this.physics && this.physics.add && this.physics.add.existing) this.physics.add.existing(cz, true); } catch (e) {}
            try { if (typeof setCircleCentered === 'function') setCircleCentered(cz, Math.max(6, Math.round(node.r))); } catch (e) {}
            try { if (this.player && this.player.body) this.physics.add.collider(this.player, cz); } catch (e) {}
            node._collider = cz;
            this._treeColliders.push(cz);
        } catch (e) {}
        this.treeNodes.push(node);
        return node;
    }

    _playWoodSwingEffect(node, success) {
        if (!node) return;
        if (node.sprite) this.tweens.add({ targets: node.sprite, scale: { from: 1, to: 1.12 }, yoyo: true, duration: 180, ease: 'Sine.easeOut' });
        const color = success ? 0xffcc66 : 0x999999;
        const x = node.x; const y = node.y - 6;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2) * (i / 8) + (Math.random() - 0.5) * 0.6;
            const speed = 30 + Math.random() * 60;
            const px = this.add.circle(x, y, 2 + Math.random() * 2, color).setDepth(2.5);
            this.tweens.add({ targets: px, x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed - 10, alpha: { from: 1, to: 0 }, scale: { from: 1, to: 0.6 }, duration: 700 + Math.random() * 300, onComplete: () => { if (px && px.destroy) px.destroy(); } });
        }
    }

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
        const el = document.createElement('div'); el.textContent = text; el.style.background = 'rgba(10,10,12,0.85)'; el.style.color = '#fff'; el.style.padding = '8px 12px'; el.style.marginTop = '6px'; el.style.borderRadius = '8px'; el.style.fontFamily = 'UnifrakturCook, cursive'; el.style.opacity = '0'; el.style.transition = 'opacity 180ms ease, transform 220ms ease'; el.style.transform = 'translateY(6px)'; this._toastContainer.appendChild(el); requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 220); }, timeout);
    }
    _clearToasts() { if (this._toastContainer && this._toastContainer.parentNode) this._toastContainer.parentNode.removeChild(this._toastContainer); this._toastContainer = null; }

    _showWoodcuttingIndicator() { if (this._woodcuttingIndicator) return; const footOffset = (this.player.displayHeight || 48) / 2 + 8; this._woodcuttingIndicator = this.add.text(this.player.x, this.player.y + footOffset, 'Chopping...', { fontSize: '16px', color: '#ffd27a', backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 6, y: 4 } }).setOrigin(0.5, 0).setDepth(3); }
    _hideWoodcuttingIndicator() { if (this._woodcuttingIndicator) { this._woodcuttingIndicator.destroy(); this._woodcuttingIndicator = null; } }

    _getWoodcuttingSnapshot() {
        const wood = this.char.woodcutting = this.char.woodcutting || { level: 1, exp: 0, expToLevel: 100 };
        const statsHelper = (window && window.__shared_ui && window.__shared_ui.stats && typeof window.__shared_ui.stats.effectiveStats === 'function')
            ? window.__shared_ui.stats.effectiveStats
            : null;
        const effStats = statsHelper ? statsHelper(this.char) : null;
        const baseStr = (this.char.stats && this.char.stats.str) || 0;
        const str = (effStats && typeof effStats.str === 'number') ? effStats.str : baseStr;

        let toolSkill = 0;
        let toolSpeed = 0;
        try {
            const equip = (this.char && this.char.equipment && this.char.equipment.woodcutting) ? this.char.equipment.woodcutting : null;
            const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : null;
            let equipDef = null;
            if (equip && equip.id && defs) equipDef = defs[equip.id] || null;
            const bonusSource = (equipDef && equipDef.woodcuttingBonus) || (equip && equip.woodcuttingBonus) || null;
            if (bonusSource) {
                toolSkill += Number(bonusSource.skill || 0);
                toolSpeed += Number(bonusSource.speedReductionMs || 0);
            }
        } catch (e) {}
        if (this.char && this.char._equipBonuses && typeof this.char._equipBonuses.woodcutting === 'number') {
            toolSkill += this.char._equipBonuses.woodcutting;
        }

        const woodLevel = wood.level || 1;
        const efficiency = Math.max(0, Math.round(woodLevel * 3 + str * 1.5 + toolSkill * 5));

        return {
            efficiency,
            woodcuttingLevel: woodLevel,
            str,
            toolSkill,
            toolSpeed
        };
    }

    _persistCharacter(username) {
        persistCharacter(this, username, {
            includeLocation: false,
            assignFields: ['woodcutting', 'inventory'],
            onAfterSave: (scene) => {
                try { if (scene._refreshInventoryModal) scene._refreshInventoryModal(); } catch (e) {}
            },
            logErrors: false
        });
    }

    _ensureRowanAnimations() {
        const directions = ['up', 'left', 'down', 'right'];
        const sheets = [
            { key: 'rowan_idle', base: 'rowan_idle', frameRate: 3, repeat: -1 },
            { key: 'rowan_walk', base: 'rowan_walk', frameRate: 6, repeat: -1 }
        ];
        for (const sheet of sheets) {
            try {
                const tex = this.textures.get(sheet.key);
                if (!tex) continue;
                const total = tex.frameTotal || 0;
                if (!total) continue;
                const cols = Math.max(1, Math.floor(total / directions.length));
                directions.forEach((dir, rowIndex) => {
                    const start = rowIndex * cols;
                    if (start >= total) return;
                    let end = start + cols - 1;
                    end = Math.min(total - 1, end);
                    const animKey = `${sheet.base}_${dir}`;
                    if (this.anims.exists(animKey)) return;
                    try {
                        this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(sheet.key, { start, end }), frameRate: sheet.frameRate, repeat: sheet.repeat });
                    } catch (e) { /* ignore per-dir errors */ }
                });
            } catch (e) { /* ignore */ }
        }
    }

    _playRowanAnimation(mode, facing) {
        const sprite = this._rowan;
        if (!sprite || !this.anims) return;
        const key = `rowan_${mode}_${facing}`;
        if (!this.anims.exists(key)) return;
        const current = sprite.anims && sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null;
        if (current !== key) sprite.anims.play(key, true);
    }

    _updateRowanAI(time, delta) {
        if (!this._rowan || !this._rowanState) return;
        const sprite = this._rowan;
        const state = this._rowanState;
        const now = (typeof time === 'number') ? time : (this.time ? this.time.now : 0);
        const dt = (typeof delta === 'number') ? delta : 16.6;

        if (this._activeDialogueNpc === 'rowan') {
            state.target = null;
            state.idleUntil = now + 200;
            this._playRowanAnimation('idle', state.facing || 'down');
            return;
        }

        if (state.target) {
            const dx = state.target.x - sprite.x;
            const dy = state.target.y - sprite.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = state.speed * (dt / 1000);
            if (dist <= step) {
                sprite.setPosition(state.target.x, state.target.y);
                state.target = null;
                state.idleUntil = now + Phaser.Math.Between(1400, 3200);
                this._playRowanAnimation('idle', state.facing || 'down');
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                const proposedX = sprite.x + nx * step;
                const proposedY = sprite.y + ny * step;
                // simple collision test against tree colliders to avoid walking through them
                let blocked = false;
                try {
                    const rowanRadius = Math.max(12, (sprite.displayWidth || 48) / 2);
                    const colliders = this._treeColliders || [];
                    for (const cz of colliders) {
                        if (!cz) continue;
                        const cx = cz.x || 0; const cy = cz.y || 0;
                        const czRadius = (typeof cz.radius === 'number') ? cz.radius : ((cz.width && cz.width > 0) ? cz.width / 2 : 28);
                        const d = Phaser.Math.Distance.Between(proposedX, proposedY, cx, cy);
                        if (d < (rowanRadius + czRadius - 2)) { blocked = true; break; }
                    }
                } catch (e) { blocked = false; }
                if (!blocked) {
                    sprite.x = proposedX;
                    sprite.y = proposedY;
                }
                let facing;
                if (Math.abs(dx) > Math.abs(dy)) facing = dx < 0 ? 'left' : 'right';
                else facing = dy < 0 ? 'up' : 'down';
                state.facing = facing;
                this._playRowanAnimation('walk', facing);
            }
        } else {
            if (!state.idleUntil || now >= state.idleUntil) {
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Phaser.Math.FloatBetween(24, state.radius || 110);
                let tx = state.home.x + Math.cos(angle) * distance;
                let ty = state.home.y + Math.sin(angle) * distance;
                const padding = 48;
                tx = Phaser.Math.Clamp(tx, padding, this.scale.width - padding);
                ty = Phaser.Math.Clamp(ty, padding, this.scale.height - padding);
                state.speed = Phaser.Math.FloatBetween(24, 38);
                state.target = { x: tx, y: ty };
            } else {
                this._playRowanAnimation('idle', state.facing || 'down');
            }
        }

        if (this._rowanPrompt) {
            this._rowanPrompt.setPosition(sprite.x, sprite.y - 74);
        }
        if (this._rowanLabel) {
            // keep the name label attached above Rowan (same offset used at creation)
            try { this._rowanLabel.setPosition(sprite.x, sprite.y - 50); } catch (e) {}
        }

        if (sprite.setDepth) {
            const depth = 1 + (sprite.y / Math.max(1, this.scale.height)) * 1.2;
            sprite.setDepth(depth);
        }
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.22 });
        if (!movement) return;
        if (!this.woodcuttingActive) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });

    // update Rowan AI/animations (if present)
    try { if (this._updateRowanAI) this._updateRowanAI(time, delta); } catch (e) {}

        // portal interaction handled by portal helper if provided

        if (this._rowan) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const rdist = Phaser.Math.Distance.Between(_px, _py, this._rowan.x, this._rowan.y);
            if (this._rowanPrompt) this._rowanPrompt.setVisible(rdist <= 56 && !this._dialogueOverlay);
            if (rdist <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                this._openRowanDialogue();
            } else if (rdist > 64 && this._activeDialogueNpc === 'rowan') {
                this._closeDialogueOverlay();
            }
            // quest indicator visuals for Rowan are handled by the shared registerQuestIndicators helper
        }

        // tree node interaction
        if (this.treeNodes && this.treeNodes.length) {
            let nearest = null; let nearestDist = 9999;
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            for (const node of this.treeNodes) {
                const dist = Phaser.Math.Distance.Between(_px, _py, node.x, node.y);
                if (dist < nearestDist) { nearestDist = dist; nearest = node; }
                node.prompt.setVisible(dist <= 56);
            }
            if (nearest && nearestDist <= 56) {
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && !this.woodcuttingActive) {
                    this._activeTree = nearest; this._startContinuousWoodcutting();
                }
            } else { this._activeTree = null; if (this.woodcuttingActive) this._stopContinuousWoodcutting(); }
        }

        if (this.woodcuttingActive) {
            const moved = this.keys.left.isDown || this.keys.right.isDown || this.keys.up.isDown || this.keys.down.isDown || Math.abs(this.player.body.velocity.x) > 1 || Math.abs(this.player.body.velocity.y) > 1;
            if (moved) this._stopContinuousWoodcutting();
            if (this._woodcuttingIndicator) { const footOffset = (this.player.displayHeight || 48) / 2 + 8; this._woodcuttingIndicator.x = this.player.x; this._woodcuttingIndicator.y = this.player.y + footOffset; }
        }
    }

    _attemptChop() {
        const node = this._activeTree;
        if (!node) return;
        const wood = this.char.woodcutting = this.char.woodcutting || { level: 1, exp: 0, expToLevel: 100 };
        const snapshot = this._getWoodcuttingSnapshot();

        const intervalMs = Math.max(200, this._currentWoodInterval || this.woodcuttingInterval || 2800);
        try {
            const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
            const tex = this.textures.get(mineKey);
            let frameNames = [];
            if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
            const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
            const rows = 4;
            const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
            const dir = this._facing || 'down';
            const rowIndex = { up: 0, left: 1, down: 2, right: 3 }[dir] || 2;
            if (framesPerRow > 0) {
                const startFrame = rowIndex * framesPerRow;
                const endFrame = startFrame + framesPerRow - 1;
                const fps = Math.max(1, Math.round(framesPerRow / (intervalMs / 1000)));
                const animKey = `mine_${dir}`;
                try { if (this.anims.exists(animKey)) this.anims.remove(animKey); } catch (e) {}
                try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(mineKey, { start: startFrame, end: endFrame }), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists(animKey)) this.player.anims.play(animKey, true); } catch (e) {}
                try { if (this.player) this.player.setFlipX(false); } catch (e) {}
            } else if (totalFrames > 0) {
                const fps = Math.max(1, Math.round(totalFrames / (intervalMs / 1000)));
                try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists('mine')) this.player.anims.play('mine', true); } catch (e) {}
                try { if (this.player) this.player.setFlipX((this._facing || 'down') === 'left'); } catch (e) {}
            }
        } catch (e) {}

        const requiredEff = Math.max(1, node.minEfficiency || 10);
        const ratioRaw = requiredEff > 0 ? snapshot.efficiency / requiredEff : snapshot.efficiency;
        const ratio = (Number.isFinite(ratioRaw) && ratioRaw > 0) ? ratioRaw : 0;
        const successChance = Math.min(1, Math.max(0, ratio));
        const success = Math.random() < successChance;

        const baseYield = Math.max(1, node.baseYield || 1);
        const baseExp = (node.baseExp != null) ? node.baseExp : 15;
        const maxMultiplier = (node.maxMultiplier != null) ? node.maxMultiplier : null;

        if (success) {
            const guaranteed = Math.max(1, Math.floor(ratio));
            const fractional = ratio - Math.floor(ratio);
            let multiplier = guaranteed;
            if (Math.random() < Math.max(0, Math.min(1, fractional))) multiplier += 1;
            if (maxMultiplier != null) multiplier = Math.min(maxMultiplier, multiplier);
            multiplier = Math.max(1, multiplier);

            node.item = node.item || { id: `${node.type || 'wood'}_log`, name: node.label || 'Log' };
            if (!node.item.name) node.item.name = node.label || 'Log';
            let itemName = node.item.name;
            try {
                if (window && window.ITEM_DEFS && window.ITEM_DEFS[node.item.id] && window.ITEM_DEFS[node.item.id].name) {
                    itemName = window.ITEM_DEFS[node.item.id].name;
                }
            } catch (e) {}

            const quantity = Math.max(1, Math.round(baseYield * multiplier));

            let addedToShared = false;
            try {
                if (window && window.__shared_ui && typeof window.__shared_ui.addItemToInventory === 'function') {
                    window.__shared_ui.addItemToInventory(this, node.item.id, quantity);
                    addedToShared = true;
                }
            } catch (e) {}
            if (!addedToShared) {
                this.char.inventory = this.char.inventory || [];
                const slot = this.char.inventory.find(it => it && it.id === node.item.id);
                if (slot && typeof slot.qty === 'number') slot.qty += quantity;
                else this.char.inventory.push({ id: node.item.id, name: itemName, qty: quantity });
            }

            try {
                updateQuestProgress(this.char, 'chop', node.item.id, quantity);
                if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal && this._questLogModal) {
                    window.__shared_ui.refreshQuestLogModal(this);
                }
            } catch (e) {}

            const xpGain = Math.max(1, Math.round(baseExp * multiplier));
            wood.exp = (wood.exp || 0) + xpGain;
            this._showToast(`You chopped ${quantity}x ${itemName}! (+${xpGain} woodcutting XP)`);
            this._playWoodSwingEffect(node, true);
            if (multiplier > 1 && node.sprite) {
                this.tweens.add({ targets: node.sprite, scale: { from: 1.12, to: 1.24 }, yoyo: true, duration: 220, ease: 'Sine.easeOut' });
            }
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
        } else {
            const failExp = (node.failExp != null) ? node.failExp : Math.max(1, Math.round(baseExp * 0.3));
            wood.exp = (wood.exp || 0) + failExp;
            const deficit = Math.max(0, Math.ceil(requiredEff - snapshot.efficiency));
            if (deficit > 0) this._showToast(`The trunk is too tough (need +${deficit} efficiency). (+${failExp} woodcutting XP)`);
            else this._showToast(`You swing and miss the sweet spot. (+${failExp} woodcutting XP)`);
            this._playWoodSwingEffect(node, false);
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
        }

        while (wood.exp >= wood.expToLevel) {
            wood.exp -= wood.expToLevel;
            wood.level = (wood.level || 1) + 1;
            wood.expToLevel = Math.floor(wood.expToLevel * 1.25);
            this._showToast('Woodcutting level up! L' + wood.level, 2200);
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
            try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'woodcutting', 1); } catch (e) {}
        }

        this.char.woodcutting = wood;
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);
        try { this._updateHUD(); } catch (e) { try { this._destroyHUD(); this._createHUD(); } catch (_) {} }
    }

    _startContinuousWoodcutting() {
        if (this.woodcuttingActive) return;
        this.woodcuttingActive = true;
        setSceneActivity(this, 'woodcutting', { source: 'woodcutting-start', timeout: 0 });
        const snapshot = this._getWoodcuttingSnapshot();
        const baseInterval = this.woodcuttingInterval || 2800;
        const statReduction = Math.round((snapshot.woodcuttingLevel || 1) * 20 + (snapshot.str || 0) * 8);
        const toolReduction = Math.round(snapshot.toolSpeed || 0);
        this._currentWoodInterval = Math.max(800, baseInterval - statReduction - toolReduction);
        // Play chop animation immediately for feedback, but schedule the first chop result to occur
        // after the woodcuttingInterval so the player must wait the chop speed to get resources.
        try {
            const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
            const tex = this.textures.get(mineKey);
            let frameNames = [];
            if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
            const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
            const rows = 4;
            const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
            const dir = this._facing || 'down';
            const rowIndex = { up: 0, left: 1, down: 2, right: 3 }[dir] || 2;
            if (framesPerRow > 0) {
                const start = rowIndex * framesPerRow;
                const end = start + framesPerRow - 1;
                const durationMs = Math.max(200, this._currentWoodInterval || this.woodcuttingInterval || 2800);
                const fps = Math.max(1, Math.round(framesPerRow / (durationMs / 1000)));
                const animKey = 'mine_' + dir;
                try { if (this.anims.exists(animKey)) this.anims.remove(animKey); } catch (e) {}
                try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(mineKey, { start: start, end: end }), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists(animKey)) this.player.anims.play(animKey, true); } catch (e) {}
                try { if (this.player) this.player.setFlipX(false); } catch (e) {}
            } else if (totalFrames > 0) {
                const durationMs = Math.max(200, this._currentWoodInterval || this.woodcuttingInterval || 2800);
                const fps = Math.max(1, Math.round(totalFrames / (durationMs / 1000)));
                try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists('mine')) this.player.anims.play('mine', true); } catch (e) {}
                try { if (this.player) this.player.setFlipX((this._facing || 'down') === 'left'); } catch (e) {}
            }
        } catch (e) {}
        // schedule the first actual chop after the configured interval
        const delay = this._currentWoodInterval || this.woodcuttingInterval || 2800;
        this._woodcuttingEvent = this.time.addEvent({ delay, callback: this._attemptChop, callbackScope: this, loop: true });
        this._showWoodcuttingIndicator(); try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _stopContinuousWoodcutting() {
        this.woodcuttingActive = false;
        this._currentWoodInterval = null;
        if (this._woodcuttingEvent) { this._woodcuttingEvent.remove(false); this._woodcuttingEvent = null; }
        this._hideWoodcuttingIndicator();
        clearActivity(this, { source: 'woodcutting-stop' });
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
}

applyCombatMixin(GraveForest.prototype);
export default GraveForest;
