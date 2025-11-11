import ORE_DEFS from '../data/ores.js';
import { onSkillLevelUp, ensureCharTalents } from '../data/talents.js';
import { applySafeZoneRegen } from './shared/stats.js';
import { updateQuestProgress, getQuestById, canStartQuest, startQuest, checkQuestCompletion, completeQuest, getAvailableQuests } from '../data/quests.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setCircleCentered } from '../shared/physicsHelpers.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { applyCombatMixin } from './shared/combat.js';
import { attach as attachCleanup, addTimeEvent } from '../shared/cleanupManager.js';
import { ensureGameCanvasVisible } from './shared/theme.js';
import { syncInventoryToServer } from './shared/persistence.js';
// Cave scene: HUD similar to Town, WASD+E controls, right-side portal, one mining node for testing
export class Cave extends Phaser.Scene {
    constructor() {
        super('Cave');
    }

    preload() {
        this.load.image('cave_bg', 'assets/cave_bg.png');
        this.load.image('tin', 'assets/tin.png');
        this.load.image('copper', 'assets/copper.png');
        // ore defs (used for procedural generation)
        try { if (typeof ORE_DEFS === 'undefined') { /* ensure import will work at module scope */ } } catch (e) {}
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('furnace', 'assets/furnace.png', { frameWidth: 64, frameHeight: 96 });
    }

    create() {
        // Ensure cleanup manager is attached early to track disposables in this scene
        try { attachCleanup(this); } catch (e) {}
        // Ensure canvas is visible (undo Login/CharacterSelect hiding)
        try { ensureGameCanvasVisible(this); } catch (e) {}
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        // responsive centers
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        try {
            this._caveFloor = buildThemedFloor(this, 'cave');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#2b2a28');
    }
        applyAmbientFx(this, 'cave');

        this.add.text(centerX, 32, 'The Cave', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

    // Player spawn (allow restoring last position via spawnX/spawnY)
    // For top-down cave: spawn near left-center by default unless overridden
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || Math.max(120, this.scale.width * 0.18);
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || Math.round(this.scale.height * 0.55);
    // create player via centralized helper; Cave uses default collider sizing from createPlayer
    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');
    // Debug: log animation lifecycle events for this player to diagnose why mine animations end early
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

    // Player animations are registered globally in Boot (walk/run/idle/mine). Scenes use those keys.

    // Input: WASD + E + I (inventory) + U (equipment) + X (stats) - centralized
    if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);

        // Character data from scene settings
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];
        setSceneKey('Cave');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });
    // Reconcile equipment bonuses through shared helper so UI shows effective stats
    try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) { /* ignore */ }

        // HUD (same condensed HUD as Town, without mining bar)
    if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();
    // atmospheric overlays (fog, embers, shadow, vignette, fireflies)
    try { if (window && window.__overlays_shared && window.__overlays_shared.createAtmosphericOverlays) { this._overlays = window.__overlays_shared.createAtmosphericOverlays(this, { idPrefix: 'cave', zIndexBase: 120, layers: ['fireflies'] }); } } catch (e) { this._overlays = null; }
    try { ensureCharTalents && ensureCharTalents(this.char); } catch (e) {}
    this._startSafeZoneRegen();

    // Right-side portal to return to Town; requires proximity + E
    // move portal a bit left so it doesn't hug the wall too tightly
    const portalX = Math.max(120, this.scale.width - 120);
    // position portal toward right-center of the cave
    const portalY = Math.round(this.scale.height * 0.55);
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const pobj = portalHelper.createPortal(this, portalX, portalY, { depth: 1.5, targetScene: 'Town', promptLabel: 'Return to Town' });
            this.portal = pobj.display;
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
            try { addTimeEvent(this, { delay: 220, callback: () => { if (pobj && pobj.tryUpgrade) pobj.tryUpgrade(); } }); } catch (e) {}
        } catch (e) {
            this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
        }

    // Ensure the player's initial spawn is at the portal on scene load so node placement
    // (which happens after this block) will avoid the portal location.
    try {
        if (this.player && this.portal) {
            const px = this.portal.x || portalX;
            const py = this.portal.y || portalY;
            // set visual position
            try { this.player.setPosition(px, py); } catch (e) {}
            // if Arcade body exists, reset it so collisions align
            try { if (this.player.body && typeof this.player.body.reset === 'function') this.player.body.reset(px, py); } catch (e) {}
        }
    } catch (e) { }

    // Furnace in cave (convenience) - place in the scene center
    // use the responsive centers computed earlier so furnace sits at the visual center
    const furnaceX = Math.round(centerX);
    const furnaceY = Math.round(centerY);
    // create furnace via shared helper (centralized)
    try { if (window && window.__furnace_shared && window.__furnace_shared.createFurnace) { window.__furnace_shared.createFurnace(this, furnaceX, furnaceY); } else { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); this._setFurnaceFlame(false); } } catch (e) { try { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); this._setFurnaceFlame(false); } catch(_) {} }
    this.furnacePrompt = this.add.text(furnaceX, furnaceY - 60, '[E] Use Furnace', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.furnacePrompt.setVisible(false);
    // furnace animation will indicate active state (no separate emoji indicator)
    // Wayne Mineson NPC (tutorial mining guide)
    try {
        // Position Wayne between the furnace (scene center) and the portal (right-center),
        // biased toward the portal so he's clearly closer to it.
        const toward = 0.7; // 70% of the way from furnace to portal
        const wayneX = Math.round(furnaceX + (portalX - furnaceX) * toward);
        const wayneY = Math.round(furnaceY + (portalY - furnaceY) * toward);
        if (this.textures && this.textures.exists && this.textures.exists('rowan_idle')) {
            // ensure Wayne's animations (based on the rowan sheet) exist in this scene
            try { this._ensureWayneAnimations && this._ensureWayneAnimations(); } catch (e) {}
            this._wayne = this.add.sprite(wayneX, wayneY, 'rowan_idle').setOrigin(0.5, 0.9).setDepth(1.5);
            // tint to a brownish tone so Wayne looks distinct from Rowan
            try { this._wayne.setTint(0x996633); } catch (e) {}
        } else {
            this._wayne = this.add.rectangle(wayneX, wayneY, 48, 64, 0x996633, 1).setDepth(1.5);
        }
        this._wayneLabel = this.add.text(wayneX, wayneY - 50, 'Wayne Mineson', { fontSize: '16px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this._waynePrompt = this.add.text(wayneX, wayneY - 74, '[E] Talk to Wayne', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this._waynePrompt.setVisible(false);
        // wayne wandering state (mirrors Rowan)
        this._wayneState = {
            home: { x: wayneX, y: wayneY },
            radius: 110,
            speed: 32,
            facing: 'down',
            target: null,
            idleUntil: this.time.now + Phaser.Math.Between(1400, 2800)
        };
        // register for quest indicators if shared UI helper present
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.registerQuestIndicators === 'function') {
                window.__shared_ui.registerQuestIndicators(this, { 'wayne_mineson': this._wayne });
            }
        } catch (e) {}
        // mark travel objective for Wayne's tutorial (player arrived at Cave)
        try { this._updateWayneQuestProgress('travel', 'Cave', 1); } catch (e) {}
    } catch (e) {}
    // smithing skill
    if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };

    // Smelting state
    this.smeltingActive = false;
    this._smeltingEvent = null;
    this.smeltingInterval = 2800;

    // Reset mining nodes array to prevent duplicates on scene re-entry
    this.miningNodes = [];

    // Procedural mining node layout with natural clustering
    // Node radius: 28px, minimum spacing: 70px
    // Canvas: 1280x720. Furnace at center (~640,360), portal at right (~1100,400)
    
    const nodeRadius = 28;
    const minSpacing = 70;
    const placedNodes = [];
    
    // Helper: Check if position is too close to furnace, portal, or other nodes
    const isTooClose = (x, y, excludeRadius = minSpacing) => {
        const furnaceX = Math.round(this.scale.width / 2);
        const furnaceY = Math.round(this.scale.height / 2);
        const portalX = Math.max(120, this.scale.width - 120);
        const portalY = Math.round(this.scale.height * 0.55);
        
        // Check furnace (larger exclusion)
        if (Math.hypot(x - furnaceX, y - furnaceY) < 120) return true;
        // Check portal (larger exclusion)
        if (Math.hypot(x - portalX, y - portalY) < 100) return true;
        // Check other placed nodes
        for (const n of placedNodes) {
            if (Math.hypot(x - n.x, y - n.y) < excludeRadius) return true;
        }
        return false;
    };
    
    // Helper: Create cluster of nodes around a center point
    const createCluster = (centerX, centerY, type, count, spreadRadius = 80) => {
        const created = [];
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let placed = false;
            while (!placed && attempts < 50) {
                // Random offset from center with some clustering
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * spreadRadius;
                const x = Math.round(centerX + Math.cos(angle) * dist);
                const y = Math.round(centerY + Math.sin(angle) * dist);
                
                // Keep within bounds
                if (x < 100 || x > this.scale.width - 100 || y < 100 || y > this.scale.height - 100) {
                    attempts++;
                    continue;
                }
                
                if (!isTooClose(x, y)) {
                    try {
                        this._createMiningNode(x, y, type);
                        placedNodes.push({ x, y, type });
                        created.push({ x, y, type });
                        placed = true;
                    } catch (e) {}
                }
                attempts++;
            }
        }
        return created;
    };
    
    // Create clusters with guaranteed counts
    // TIN cluster (5 nodes) - left side
    createCluster(180, 380, 'tin', 5, 120);
    
    // COPPER cluster (4 nodes) - left-center
    createCluster(350, 320, 'copper', 4, 100);
    
    // IRON cluster (5 nodes) - split into two mini-clusters
    createCluster(450, 180, 'iron', 3, 80);
    createCluster(400, 550, 'iron', 2, 60);
    
    // COAL cluster (7 nodes) - large spread across center
    // COAL cluster (7 nodes) - shift ~60px to the right for better spacing from iron/gold
    createCluster(610, 200, 'coal', 4, 90);
    createCluster(690, 550, 'coal', 3, 80);
    
    // MYTHRIL cluster (3 nodes) - bottom-right
    createCluster(850, 600, 'mythril', 3, 70);
    
    // GOLD (2 nodes) - far right, spread apart
    createCluster(1000, 250, 'gold', 1, 40);
    createCluster(950, 550, 'gold', 1, 40);
    
    // GEMS (5 nodes) - scattered individual nodes
    createCluster(200, 150, 'emerald', 1, 30);
    createCluster(600, 120, 'ruby', 1, 30);
    createCluster(1100, 300, 'sapphire', 1, 30);
    createCluster(500, 650, 'opal', 1, 30);
    createCluster(1050, 150, 'diamond', 1, 30);
    
    // Debug: report counts actually placed
    try {
        if (typeof console !== 'undefined' && console.debug) {
            const counts = {};
            const list = Array.isArray(this.miningNodes) ? this.miningNodes : [];
            for (const n of list) { if (!n || !n.type) continue; counts[n.type] = (counts[n.type]||0)+1; }
            console.debug('[Cave] placed mining nodes', counts);
        }
    } catch (e) {}

    // Cave decorations: rocks and stalactites
    try {
        const decoCount = Math.max(6, Math.round((this.scale.width * this.scale.height) / 60000));
        for (let i = 0; i < decoCount; i++) {
            let rx = Phaser.Math.Between(bounds.x1, bounds.x2);
            let ry = Phaser.Math.Between(bounds.y1, bounds.y2);
            let tries = 0;
            while (isTooClose(rx, ry) && tries < 30) { rx = Phaser.Math.Between(bounds.x1, bounds.x2); ry = Phaser.Math.Between(bounds.y1, bounds.y2); tries++; }
            if (isTooClose(rx, ry)) continue;
            // draw rock: layered circles
            const r = Phaser.Math.Between(10, 28);
            const base = this.add.circle(rx, ry, r, 0x2f2b26, 1).setDepth(0.9);
            const shade = this.add.circle(rx - r*0.22, ry - r*0.18, Math.round(r*0.6), 0x1f1d1a, 0.9).setDepth(1.0);
            // slight random rotation/scale via tween
            this.tweens.add({ targets: [base, shade], scale: { from: 0.98, to: 1.02 }, yoyo: true, repeat: -1, duration: 2200 + Math.random()*1200, ease: 'Sine.easeInOut' });
            // add a static circular collider for the decoration so the player bumps into it
                    try {
                        if (this.physics && this.physics.add) {
                            // create invisible collider zone aligned precisely with visual circle
                            // display circle radius should match visual r (not doubled)
                            const dz = this.add.circle(rx - r, ry - r, r, 0x000000, 0).setOrigin(0, 0).setDepth(0.9);
                            try { this.physics.add.existing(dz, true); } catch (e) {}
                            try { if (typeof setCircleCentered === 'function') setCircleCentered(dz, Math.max(6, Math.round(r))); } catch (e) {}
                            try { if (this.player && this.player.body) this.physics.add.collider(this.player, dz); } catch (e) {}
                            // store geometric center + radius for simple collision checks
                            try { dz._cx = rx; dz._cy = ry; dz._cr = Math.max(6, Math.round(r)); } catch (e) {}
                            base._decorZone = dz;
                            shade._decorZone = dz;
                            this._decorColliders = this._decorColliders || [];
                            this._decorColliders.push(dz);
                        }
                    } catch (e) {}
        }
        // stalactites: draw at top edge as small triangles
        const stalCount = Math.max(4, Math.round(this.scale.width / 180));
        for (let i = 0; i < stalCount; i++) {
            const sx = Phaser.Math.Between(bounds.x1, bounds.x2);
            const syTop = Phaser.Math.Between(40, 90);
            const g = this.add.graphics().setDepth(0.95);
            const w = Phaser.Math.Between(12, 36);
            g.fillStyle(0x1f1d1a, 1);
            g.beginPath();
            g.moveTo(sx, syTop);
            g.lineTo(sx - w/2, syTop + Phaser.Math.Between(24, 50));
            g.lineTo(sx + w/2, syTop + Phaser.Math.Between(24, 50));
            g.closePath();
            g.fillPath();
            // subtle bob via tween
            this.tweens.add({ targets: g, y: { from: 0, to: 2 }, yoyo: true, repeat: -1, duration: 3000 + Math.random()*1000, ease: 'Sine.easeInOut' });
            // add a small circular collider under the stalactite so the player can't walk straight through
                    try {
                        if (this.physics && this.physics.add) {
                            const tipY = syTop + Phaser.Math.Between(18, 32);
                            const rsz = Math.max(8, Math.round(w / 4));
                            const sz = this.add.circle(sx - rsz, tipY - rsz, rsz, 0x000000, 0).setOrigin(0, 0).setDepth(0.95);
                            try { this.physics.add.existing(sz, true); } catch (e) {}
                            try { if (typeof setCircleCentered === 'function') setCircleCentered(sz, Math.max(6, rsz)); } catch (e) {}
                            try { if (this.player && this.player.body) this.physics.add.collider(this.player, sz); } catch (e) {}
                            try { sz._cx = sx; sz._cy = tipY; sz._cr = Math.max(6, rsz); } catch (e) {}
                            g._decorZone = sz;
                            this._decorColliders = this._decorColliders || [];
                            this._decorColliders.push(sz);
                        }
                    } catch (e) {}
        }
    } catch (e) { /* ignore decoration failures */ }

    // continuous mining state
    this.miningActive = false;
    this._miningEvent = null;
    this.miningInterval = 2800; // ms between swings (tweakable)

        // Toast container
        this._toastContainer = null;



        // cleanup on shutdown
        this.events.once('shutdown', () => {
            clearActivity(this, { silent: true });
            setSceneKey(null);
            this._destroyHUD();
            this._clearToasts();
            this._stopSafeZoneRegen();
            cleanupAmbientFx(this);
            // cleanup mining indicator if present
            if (this._miningIndicator && this._miningIndicator.parent) {
                this._miningIndicator.destroy();
                this._miningIndicator = null;
            }
            // cleanup any mining node colliders and decoration colliders we created
            try {
                if (this.miningNodes && Array.isArray(this.miningNodes)) {
                    for (const n of this.miningNodes) {
                        try { if (n && n.colliderZone && n.colliderZone.destroy) n.colliderZone.destroy(); } catch (e) {}
                        // destroy node sprites and UI elements
                        try { if (n && n.sprite && n.sprite.destroy) n.sprite.destroy(); } catch (e) {}
                        try { if (n && n.healthBarBg && n.healthBarBg.destroy) n.healthBarBg.destroy(); } catch (e) {}
                        try { if (n && n.healthBarFg && n.healthBarFg.destroy) n.healthBarFg.destroy(); } catch (e) {}
                        try { if (n && n.prompt && n.prompt.destroy) n.prompt.destroy(); } catch (e) {}
                    }
                    this.miningNodes = [];
                }
                if (this._decorColliders && Array.isArray(this._decorColliders)) {
                    for (const d of this._decorColliders) {
                        try { if (d && d.destroy) d.destroy(); } catch (e) {}
                    }
                    this._decorColliders = null;
                }
                // destroy cave wall colliders if any
                try {
                    if (this._caveWalls && Array.isArray(this._caveWalls)) {
                        for (const w of this._caveWalls) {
                            try { if (w && w.destroy) w.destroy(); } catch (e) {}
                        }
                        this._caveWalls = null;
                    }
                } catch (e) {}
            } catch (e) {}
            // cleanup furnace modal if present
            if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
            this._furnaceModal = null;
            // destroy atmospheric overlays if created
            try { if (this._overlays && this._overlays.destroy) this._overlays.destroy(); } catch(e) {}
            this._overlays = null;
            // ensure furnace animation stopped
            try { this._setFurnaceFlame(false); } catch(e) {}
            // stop any smelting events
            if (this._smeltingEvent) { try { if (typeof this._smeltingEvent === 'function') this._smeltingEvent(); else this._smeltingEvent.remove && this._smeltingEvent.remove(false); } catch (e) {} this._smeltingEvent = null; }
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

    // Inventory modal is centralized in shared UI; thin wrappers kept for compatibility
    _startSafeZoneRegen() {
    const regenDelay = 1800;
    if (this.safeRegenEvent) { try { if (typeof this.safeRegenEvent === 'function') this.safeRegenEvent(); else this.safeRegenEvent.remove && this.safeRegenEvent.remove(false); } catch (e) {} }
    this.safeRegenEvent = addTimeEvent(this, { delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
    }

    _stopSafeZoneRegen() {
        if (this.safeRegenEvent) { try { if (typeof this.safeRegenEvent === 'function') this.safeRegenEvent(); else this.safeRegenEvent.remove && this.safeRegenEvent.remove(false); } catch (e) {} this.safeRegenEvent = null; }
    }

    _tickSafeZoneRegen() {
        // delegate to centralized safe-zone regen helper which writes maxima and applies hp/mana regen
        if (!this.char) return;
        try { applySafeZoneRegen(this); } catch (e) {}
    }


    _openInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.openInventoryModal) return window.__shared_ui.openInventoryModal(this); }
    _closeInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.closeInventoryModal) return window.__shared_ui.closeInventoryModal(this); }
    _refreshInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal) return window.__shared_ui.refreshInventoryModal(this); }

    // Equipment modal is centralized; thin wrappers route to shared helpers
    _openEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.openEquipmentModal) return window.__shared_ui.openEquipmentModal(this); }
    _closeEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.closeEquipmentModal) return window.__shared_ui.closeEquipmentModal(this); }
    _refreshEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.refreshEquipmentModal) return window.__shared_ui.refreshEquipmentModal(this); }

    // Equip an item from inventory to the appropriate slot (weapon/armor)
    _equipItemFromInventory(itemId) {
        if (window && window.__shared_ui && window.__shared_ui.equipItemFromInventory) return window.__shared_ui.equipItemFromInventory(this, itemId);
    }

    _unequipItem(slot) { if (window && window.__shared_ui && window.__shared_ui.unequipItem) return window.__shared_ui.unequipItem(this, slot); }
    _applyEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.applyEquipmentBonuses) return window.__shared_ui.applyEquipmentBonuses(this, eq); }
    _removeEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.removeEquipmentBonuses) return window.__shared_ui.removeEquipmentBonuses(this, eq); }

    // HUD copied/adapted from Town (without mining bar)
    _createHUD() { if (window && window.__hud_shared && window.__hud_shared.createHUD) return window.__hud_shared.createHUD(this); }

    _destroyHUD() { if (window && window.__hud_shared && window.__hud_shared.destroyHUD) return window.__hud_shared.destroyHUD(this); }

    _updateHUD() { if (window && window.__hud_shared && window.__hud_shared.updateHUD) return window.__hud_shared.updateHUD(this); try { this._destroyHUD(); this._createHUD(); } catch(e) {} }

    // --- Mining node creation ---
    // create a mining node of a given type ('tin' or 'copper')
    _createMiningNode(x, y, type = 'copper') {
        if (!this.miningNodes) this.miningNodes = [];
        // Prefer ore-specific definitions from ORE_DEFS (imported) if available
        const defs = (typeof ORE_DEFS !== 'undefined') ? ORE_DEFS : (window && window.ORE_DEFS) ? window.ORE_DEFS : null;
        const node = {};
        node.type = type;
        node.x = x; node.y = y; node.r = 28;
        let usedDef = null;
        if (defs && defs[type]) {
            usedDef = defs[type];
            // NEW SYSTEM: Read new professional MMO properties
            node.reqLevel = (usedDef.reqLevel != null) ? usedDef.reqLevel : 1;
            node.maxHealth = (usedDef.maxHealth != null) ? usedDef.maxHealth : 5;
            node.currentHealth = node.maxHealth; // Initialize health
            node.yieldPerHit = (usedDef.yieldPerHit != null) ? usedDef.yieldPerHit : 1;
            node.xpPerHit = (usedDef.xpPerHit != null) ? usedDef.xpPerHit : 15;
            node.baseSpeed = (usedDef.baseSpeed != null) ? usedDef.baseSpeed : 2500;
            node.respawnTime = (usedDef.respawnTime != null) ? usedDef.respawnTime : 60000;
            
            node.item = { id: (usedDef.itemId || (type + '_ore')), name: (usedDef.label || (type || 'Ore')) };
            node.color = usedDef.color || 0x776655;
            node.label = usedDef.label || (type.charAt(0).toUpperCase() + type.slice(1));
            node.depleted = false; // Track depletion state
            
            // use sprite key if available and loaded
            const spriteKey = usedDef.sprite || null;
            if (spriteKey && this.textures && this.textures.exists && this.textures.exists(spriteKey)) {
                try {
                    node.sprite = this.add.sprite(x, y, spriteKey).setOrigin(0.5).setDepth(1.2);
                    try {
                        const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                        // adjust visual sprite so its base sits roughly at the logical node center
                        const adjustedY = y + (node.r - (hh / 2));
                        node.sprite.y = adjustedY;
                        // keep the logical node center in sync with the visual sprite so
                        // proximity checks and prompts align with what the player sees
                        node.y = adjustedY;
                    } catch (e) {}
                } catch (e) {
                    node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
                }
            } else {
                node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
            }
        } else {
            // fallback legacy mapping for tin/copper with NEW SYSTEM defaults
            const config = {
                tin: { 
                    color: 0x9bb7c9, 
                    item: { id: 'tin_ore', name: 'Tin Ore' }, 
                    label: 'Tin',
                    reqLevel: 1,
                    maxHealth: 3,
                    yieldPerHit: 1,
                    xpPerHit: 10,
                    baseSpeed: 2500,
                    respawnTime: 45000
                },
                copper: { 
                    color: 0x8a7766, 
                    item: { id: 'copper_ore', name: 'Copper Ore' }, 
                    label: 'Copper',
                    reqLevel: 1,
                    maxHealth: 4,
                    yieldPerHit: 1,
                    xpPerHit: 15,
                    baseSpeed: 2600,
                    respawnTime: 50000
                }
            };
            const cfg = config[type] || config.copper;
            node.reqLevel = cfg.reqLevel || 1;
            node.maxHealth = cfg.maxHealth || 5;
            node.currentHealth = node.maxHealth;
            node.yieldPerHit = cfg.yieldPerHit || 1;
            node.xpPerHit = cfg.xpPerHit || 15;
            node.baseSpeed = cfg.baseSpeed || 2500;
            node.respawnTime = cfg.respawnTime || 60000;
            node.item = cfg.item;
            node.color = cfg.color;
            node.label = cfg.label;
            node.depleted = false;
            
            if (type === 'tin' && this.textures.exists && this.textures.exists('tin')) {
                try {
                    node.sprite = this.add.sprite(x, y, 'tin').setOrigin(0.5).setDepth(1.2);
                    try {
                        const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                        const adjustedY = y + (node.r - (hh / 2));
                        node.sprite.y = adjustedY;
                        node.y = adjustedY;
                    } catch (e) { /* ignore positioning errors */ }
                } catch (e) {
                    node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
                }
            } else if (type === 'copper' && this.textures.exists && this.textures.exists('copper')) {
                try {
                    node.sprite = this.add.sprite(x, y, 'copper').setOrigin(0.5).setDepth(1.2);
                    try {
                        const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                        const adjustedY = y + (node.r - (hh / 2));
                        node.sprite.y = adjustedY;
                        node.y = adjustedY;
                    } catch (e) { /* ignore positioning errors */ }
                } catch (e) {
                    node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
                }
            } else {
                node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
            }
        }
        
        // Create health bar (35px wide, 4px tall, positioned above sprite)
        const barWidth = 35;
        const barHeight = 4;
        const barX = node.x - (barWidth / 2);
        const barY = node.y - node.r - 12; // Position above node
        
        // Background (grey)
        node.healthBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x333333)
            .setOrigin(0, 0.5)
            .setDepth(1.9);
        
        // Fill (green, updates with health)
        node.healthBar = this.add.rectangle(barX, barY, barWidth, barHeight, 0x44cc44)
            .setOrigin(0, 0.5)
            .setDepth(2.0);
        
        // Update prompt to show level requirement
        const promptText = `[E] Mine ${node.label}\n(Req Level ${node.reqLevel})`;
        node.prompt = this.add.text(node.x, node.y - 60, promptText, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 }, align: 'center' }).setOrigin(0.5).setDepth(2);
        node.prompt.setVisible(false);
        // create a physics collider so the player bumps into the node instead of walking through it
        try {
            if (this.physics && this.physics.add) {
                // Prefer attaching a static circular body to a sprite if node.sprite is a real sprite
                const isSprite = node.sprite && node.sprite.texture && node.sprite instanceof Phaser.GameObjects.Sprite;
                if (isSprite) {
                    // Instead of attaching physics directly to the sprite (which can cause origin/offset
                    // mismatches for imported art), create a separate static circular collider zone centered
                    // on the node position so collisions match the visual circle placement precisely.
                        try {
                            const circ = Math.max(8, Math.round(node.r));
                            // display radius should be circ (not doubled). Position so origin 0,0 puts circle bounding box at node.x-circ,node.y-circ
                            const cz = this.add.circle(node.x - circ, node.y - circ, circ, 0x000000, 0).setOrigin(0, 0).setDepth(1.0);
                            try { this.physics.add.existing(cz, true); } catch (e) {}
                            try { if (typeof setCircleCentered === 'function') setCircleCentered(cz, circ); } catch (e) {}
                            try { if (this.player && this.player.body) this.physics.add.collider(this.player, cz); } catch (e) {}
                            node.colliderZone = cz;
                            this._decorColliders = this._decorColliders || [];
                            this._decorColliders.push(cz);
                        } catch (e) {
                        // fallback to earlier behavior below
                    }
                }
                // if we didn't attach to sprite, create a static circular collider (invisible)
                if (!node.collider) {
                    try {
                        const cz = this.add.circle(node.x, node.y, node.r, 0x000000, 0).setOrigin(0.5).setDepth(1.0);
                        if (this.physics && this.physics.add && this.physics.add.existing) this.physics.add.existing(cz, true);
                        try { if (typeof setCircleCentered === 'function') setCircleCentered(cz, Math.max(8, Math.round(node.r))); } catch (e) {}
                        try { if (this.player && this.player.body) this.physics.add.collider(this.player, cz); } catch (e) {}
                        node.colliderZone = cz;
                        // track for cleanup
                        this._decorColliders = this._decorColliders || [];
                        this._decorColliders.push(cz);
                    } catch (e) {
                        // ignore
                    }
                }
            }
        } catch (e) {
            // ignore if physics not available
        }
        this.miningNodes.push(node);
        return node;
    }

    // visual feedback for mining swings
    _playMiningSwingEffect(node, success) {
        if (!node) return;
        // scale the node sprite briefly
        if (node.sprite) this.tweens.add({ targets: node.sprite, scale: { from: 1, to: 1.12 }, yoyo: true, duration: 180, ease: 'Sine.easeOut' });
        // particle burst
        const color = success ? 0xffcc66 : 0x999999;
        const x = node.x;
        const y = node.y - 6;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2) * (i / 8) + (Math.random() - 0.5) * 0.6;
            const speed = 30 + Math.random() * 60;
            const px = this.add.circle(x, y, 2 + Math.random() * 2, color).setDepth(2.5);
            this.tweens.add({
                targets: px,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed - 10,
                alpha: { from: 1, to: 0 },
                scale: { from: 1, to: 0.6 },
                duration: 700 + Math.random() * 300,
                onComplete: () => { if (px && px.destroy) px.destroy(); }
            });
        }
    }

    _getMiningSnapshot() {
        const mining = this.char.mining = this.char.mining || { level: 1, exp: 0, expToLevel: 100 };
        const statsHelper = (window && window.__shared_ui && window.__shared_ui.stats && typeof window.__shared_ui.stats.effectiveStats === 'function')
            ? window.__shared_ui.stats.effectiveStats
            : null;
        const effStats = statsHelper ? statsHelper(this.char) : null;
        const baseStr = (this.char.stats && this.char.stats.str) || 0;
        const str = (effStats && typeof effStats.str === 'number') ? effStats.str : baseStr;

        let toolSpeed = 0;
        try {
            const equip = (this.char && this.char.equipment && this.char.equipment.mining) ? this.char.equipment.mining : null;
            const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : null;
            let equipDef = null;
            if (equip && equip.id && defs) equipDef = defs[equip.id] || null;
            const bonusSource = (equipDef && equipDef.miningBonus) || (equip && equip.miningBonus) || null;
            if (bonusSource) {
                toolSpeed += Number(bonusSource.speedReductionMs || 0);
            }
        } catch (e) {}

        // Apply miningSpeed talent modifiers to toolSpeed
        try {
            const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
            const miningSpeedMod = tmods['miningSpeed'] || null;
            if (miningSpeedMod) {
                const flatBonus = Number(miningSpeedMod.flat || 0);
                const pctBonus = Number(miningSpeedMod.percent || 0);
                // Higher percent = faster mining = more speed reduction
                if (pctBonus) {
                    // Convert percent to additional speed reduction: e.g., 10% faster = 10% of base interval reduced
                    const baseInterval = this.miningInterval || 2800;
                    toolSpeed += Math.round(baseInterval * (pctBonus / 100));
                }
                toolSpeed += flatBonus;
            }
        } catch (e) {}

        const miningLevel = mining.level || 1;

        // NEW SYSTEM: Return only speed-related stats (no efficiency/success chance)
        return {
            miningLevel,
            str,
            toolSpeed
        };
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

    _showMiningIndicator() {
        if (this._miningIndicator) return;
        const footOffset = (this.player.displayHeight || 48) / 2 + 8;
        this._miningIndicator = this.add.text(this.player.x, this.player.y + footOffset, 'Mining...', { fontSize: '16px', color: '#ffd27a', backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 6, y: 4 } }).setOrigin(0.5, 0).setDepth(3);
    }

    // --- Furnace modal for Cave (smelting UI) ---
    _openFurnaceModal() {
        // Delegate to shared furnace helper if present
        try { if (window && window.__furnace_shared && window.__furnace_shared.openFurnaceModal) { window.__furnace_shared.openFurnaceModal(this); return; } } catch (e) { /* ignore */ }
        if (this._furnaceModal) return;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const copperOreQty = findQty('copper_ore');
        const tinOreQty = findQty('tin_ore');

        const modal = document.createElement('div');
        modal.id = 'cave-furnace-modal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%,-50%)';
        modal.style.zIndex = '220';
        modal.style.background = 'linear-gradient(135deg,#241b2a 0%, #0f0b14 100%)';
        modal.style.padding = '18px';
        modal.style.borderRadius = '12px';
        modal.style.color = '#eee';
        modal.style.fontFamily = 'UnifrakturCook, cursive';
        modal.style.minWidth = '300px';

        modal.innerHTML = `
            <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'>
                <strong>Furnace</strong>
                <button id='cave-furnace-close' style='background:#222;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;'>Close</button>
            </div>
            <div style='margin-bottom:8px;'>Smelt ores into bars here. Open your Inventory (I) to view quantities.</span></div>
            <div style='display:flex;flex-direction:column;gap:8px;'>
                <button id='cave-smelt-copper' style='padding:8px;background:#6b4f3a;color:#fff;border:none;border-radius:8px;cursor:pointer;'>Smelt Copper Bar (2x Copper Ore)</button>
                <button id='cave-smelt-bronze' style='padding:8px;background:#7a5f3a;color:#fff;border:none;border-radius:8px;cursor:pointer;'>Smelt Bronze (1x Copper Ore + 1x Tin Ore)</button>
            </div>
            <div id='cave-furnace-msg' style='color:#ffcc99;margin-top:8px;min-height:18px;'></div>
        `;
        document.body.appendChild(modal);
        this._furnaceModal = modal;

        document.getElementById('cave-furnace-close').onclick = () => this._closeCaveFurnaceModal();

        const updateDisplay = () => {
            const inv = this.char.inventory || [];
            const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
            const copperOreQty = findQty('copper_ore');
            const tinOreQty = findQty('tin_ore');
            const elC = document.getElementById('cave-furnace-copper-qty'); if (elC) elC.textContent = copperOreQty;
            const elT = document.getElementById('cave-furnace-tin-qty'); if (elT) elT.textContent = tinOreQty;
        };

        const btnCopper = document.getElementById('cave-smelt-copper');
        const btnBronze = document.getElementById('cave-smelt-bronze');
        if (btnCopper) btnCopper.onclick = () => {
            const recipeId = 'copper_bar';
            if (this.smeltingActive) { if (this._smeltType === recipeId) this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
            else this._startContinuousSmelting(recipeId);
            updateDisplay(); this._refreshCaveFurnaceModal();
        };
        if (btnBronze) btnBronze.onclick = () => {
            const recipeId = 'bronze_bar';
            if (this.smeltingActive) { if (this._smeltType === recipeId) this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
            else this._startContinuousSmelting(recipeId);
            updateDisplay(); this._refreshCaveFurnaceModal();
        };

        this._refreshCaveFurnaceModal();
        // HUD switch to smithing
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _closeCaveFurnaceModal() {
        if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
        this._furnaceModal = null;
    // Ensure furnace animation is stopped when the modal closes if not smelting
    try { if (!this.smeltingActive && this._setFurnaceFlame) this._setFurnaceFlame(false); } catch(e) {}
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _openWayneDialogue() {
        this._activeDialogueNpc = 'wayne';
        try { updateQuestProgress(this.char, 'talk', 'wayne_mineson', 1); } catch (e) {}

        const questId = 'tutorial_meet_wayne';
        const questDef = getQuestById ? getQuestById(questId) : null;
        const hadActive = (this.char.activeQuests || []).some(q => q.id === questId);
        let justCompleted = false;
        if (hadActive && checkQuestCompletion && checkQuestCompletion(this.char, questId)) {
            try { if (completeQuest) completeQuest(this.char, questId); justCompleted = true; } catch (e) {}
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
        const activeWayne = (this.char.activeQuests || []).find(q => q.id === questId);
        const bodyNodes = [];
        const optionConfigs = [];
        const objectiveStateFn = (typeof window !== 'undefined' && window.getQuestObjectiveState) ? window.getQuestObjectiveState : null;
        const equipQuestId = 'tutorial_equip_pickaxe_and_mine';
        const equipQuestDef = getQuestById ? getQuestById(equipQuestId) : null;
        const activeEquipQuest = (this.char.activeQuests || []).find(q => q.id === equipQuestId);
        const equipQuestCompleted = (this.char.completedQuests || []).includes(equipQuestId);
        const equipQuestReady = activeEquipQuest && checkQuestCompletion && checkQuestCompletion(this.char, equipQuestId);
        const availableWayneQuests = (typeof getAvailableQuests === 'function')
            ? (getAvailableQuests(this.char, 'Cave') || []).filter(q => q && q.giver === 'wayne_mineson')
            : [];
        const additionalWayneAvailable = availableWayneQuests.filter(q => q.id !== questId && q.id !== equipQuestId);
        const nextWayneQuest = additionalWayneAvailable.length ? additionalWayneAvailable[0] : null;
        const otherActiveWayne = (this.char.activeQuests || []).find(entry => {
            if (!entry || !entry.id || entry.id === questId || entry.id === equipQuestId) return false;
            const def = getQuestById ? getQuestById(entry.id) : null;
            return def && def.giver === 'wayne_mineson';
        });
        const otherActiveDef = otherActiveWayne ? (getQuestById ? getQuestById(otherActiveWayne.id) : null) : null;
        const otherActiveStates = otherActiveWayne && objectiveStateFn ? objectiveStateFn(this.char, otherActiveWayne.id) : null;

        const ui = window.__shared_ui;
        const closeDialogue = () => {
            try { if (window && window.__shared_ui && typeof window.__shared_ui.closeDialogue === 'function') window.__shared_ui.closeDialogue(); } catch (e) {}
            this._activeDialogueNpc = null;
        };

        if (equipQuestReady) {
            bodyNodes.push(ui.createDialogueParagraph('You equipped the pickaxe and gathered what I asked for. Let me see.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, equipQuestId) : null;
            const list = ui.buildObjectiveList(equipQuestDef, states, '#d4a574');
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Hand over the ore', onClick: () => { try { if (completeQuest) completeQuest(this.char, equipQuestId); const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null; if (this._persistCharacter) this._persistCharacter(username); if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); this._showToast('Quest completed: ' + ((equipQuestDef && equipQuestDef.name) || equipQuestId), 2200); } catch (e) {} }, variant: 'success', closeOnClick: true });
            optionConfigs.push({ label: 'Give me a moment.', onClick: () => {}, closeOnClick: true });
        } else if (activeEquipQuest) {
            bodyNodes.push(ui.createDialogueParagraph('Keep using that pickaxe. The cave yields more if you get the rhythm right.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, equipQuestId) : null;
            const list = ui.buildObjectiveList(equipQuestDef, states, '#d4a574');
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Back to mining.', onClick: () => {}, closeOnClick: true });
        } else if (otherActiveWayne && otherActiveDef) {
            bodyNodes.push(ui.createDialogueParagraph(`You're already working on ${otherActiveDef.name || otherActiveWayne.id}. Stay focused and report back when it's done.`));
            const list = ui.buildObjectiveList(otherActiveDef, otherActiveStates, '#d4a574');
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Understood.', onClick: () => {}, closeOnClick: true });
        } else if (justCompleted || nowCompleted) {
            bodyNodes.push(ui.createDialogueParagraph('You learned the basics of mining. Keep at it and you will make your fortune.'));
            if (!equipQuestCompleted) {
                if (equipQuestDef && equipQuestDef.description) bodyNodes.push(ui.createDialogueParagraph(equipQuestDef.description));
                optionConfigs.push({ label: 'I will equip and mine.', onClick: () => {
                    if (!startQuest) { return; }
                    if ((this.char.activeQuests || []).some(q => q.id === equipQuestId)) { closeDialogue(); return; }
                    const started = startQuest(this.char, equipQuestId);
                    if (started) {
                        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                        if (this._persistCharacter) this._persistCharacter(username);
                        try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                        this._showToast('Quest started: ' + ((equipQuestDef && equipQuestDef.name) || equipQuestId), 2200);
                    }
                }, variant: 'success', closeOnClick: true });
                optionConfigs.push({ label: 'Maybe later.', onClick: () => {}, closeOnClick: true });
            } else if (nextWayneQuest) {
                if (nextWayneQuest.description) bodyNodes.push(ui.createDialogueParagraph(nextWayneQuest.description));
                const list = ui.buildObjectiveList(nextWayneQuest, null, '#d4a574');
                if (list) bodyNodes.push(list);
                optionConfigs.push({ label: `Accept "${nextWayneQuest.name || nextWayneQuest.id}"`, onClick: () => {
                    if (!startQuest) { try { closeDialogue(); } catch(e) {} return; }
                    // If already active, just close the dialogue
                    if ((this.char.activeQuests || []).some(q => q.id === nextWayneQuest.id)) { try { closeDialogue(); } catch(e) {} return; }
                    const started = startQuest(this.char, nextWayneQuest.id);
                    if (started) {
                        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                        if (this._persistCharacter) this._persistCharacter(username);
                        try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                        this._showToast('Quest started: ' + ((nextWayneQuest && nextWayneQuest.name) || nextWayneQuest.id), 2200);
                    }
                    // Always attempt to close the dialogue after handling acceptance
                    try { closeDialogue(); } catch(e) {}
                }, variant: 'success', closeOnClick: true });
                optionConfigs.push({ label: 'Maybe later.', onClick: () => {}, closeOnClick: true });
            } else {
                optionConfigs.push({ label: 'Goodbye.', onClick: () => {}, closeOnClick: true });
            }
        } else if (activeWayne) {
            bodyNodes.push(ui.createDialogueParagraph('Wayne here. Focus your swings and watch the ore glint.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, questId) : null;
            const list = ui.buildObjectiveList(questDef, states, '#d4a574');
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: "I'll do it.", onClick: () => {}, closeOnClick: true });
        } else {
            bodyNodes.push(ui.createDialogueParagraph('Ah, fresh face! I can show you the basics of mining if you like.'));
            optionConfigs.push({ label: 'Teach me mining', onClick: () => {
                if (!startQuest) { return; }
                if ((this.char.activeQuests || []).some(q => q.id === questId)) { return; }
                const started = startQuest(this.char, questId);
                if (started) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    if (this._persistCharacter) this._persistCharacter(username);
                    try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                    this._showToast('Quest started: ' + ((questDef && questDef.name) || questId), 2200);
                }
            }, variant: 'success' });
            optionConfigs.push({ label: 'Not now', onClick: () => {}, closeOnClick: true });
        }

        ui.renderDialogue('Wayne Mineson', '⛏️', bodyNodes, optionConfigs, '#d4a574');
    }

    _updateWayneQuestProgress(type, itemId, amount = 1) {
        try {
            // Debug: show active quests and the target progress update for diagnostics
            try { console.debug && console.debug('Wayne quest progress tick', { type, itemId, amount, activeQuests: (this.char && this.char.activeQuests) || null }); } catch (e) {}
            if (window && window.__shared_ui && typeof window.__shared_ui.updateQuestProgressAndCheckCompletion === 'function') {
                window.__shared_ui.updateQuestProgressAndCheckCompletion(this, type, itemId, amount);
            } else {
                updateQuestProgress(this.char, type, itemId, amount);
                const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                if (this._persistCharacter) this._persistCharacter(username);
                try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                try { console.debug && console.debug('Wayne quest progress after update', { type, itemId, amount, activeQuests: (this.char && this.char.activeQuests) || null }); } catch (e) {}
            }
        } catch (e) {}
    }



    _updateWayneAI(time, delta) {
        if (!this._wayne || !this._wayneState) return;
        const sprite = this._wayne;
        const state = this._wayneState;
        const now = (typeof time === 'number') ? time : (this.time ? this.time.now : 0);
        const dt = (typeof delta === 'number') ? delta : 16.6;

        if (this._activeDialogueNpc === 'wayne') {
            state.target = null;
            state.idleUntil = now + 200;
            try { if (this._playWayneAnimation) this._playWayneAnimation('idle', state.facing || 'down'); } catch (e) {}
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
                try { if (this._playWayneAnimation) this._playWayneAnimation('idle', state.facing || 'down'); } catch (e) {}
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                const proposedX = sprite.x + nx * step;
                const proposedY = sprite.y + ny * step;
                // simple collision test against decoration colliders to avoid walking through them
                let blocked = false;
                try {
                    const npcRadius = Math.max(12, (sprite.displayWidth || 48) / 2);
                    const colliders = this._decorColliders || [];
                    for (const cz of colliders) {
                        if (!cz) continue;
                        // prefer stored center (_cx/_cy) else fallback to cz.x/cz.y (top-left origin circles need adjustment)
                        const cx = (cz._cx != null) ? cz._cx : (cz.x || 0);
                        const cy = (cz._cy != null) ? cz._cy : (cz.y || 0);
                        // prefer stored radius _cr, else infer from width/2
                        const czRadius = (cz._cr != null) ? cz._cr : ((typeof cz.radius === 'number') ? cz.radius : ((cz.width && cz.width > 0) ? cz.width / 2 : 28));
                        const d = Phaser.Math.Distance.Between(proposedX, proposedY, cx, cy);
                        if (d < (npcRadius + czRadius + 4)) { blocked = true; break; }
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
                try { if (this._playWayneAnimation) this._playWayneAnimation('walk', facing); } catch (e) {}
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
                try { if (this._playWayneAnimation) this._playWayneAnimation('idle', state.facing || 'down'); } catch (e) {}
            }
        }

        if (this._waynePrompt) {
            try { this._waynePrompt.setPosition(sprite.x, sprite.y - 74); } catch (e) {}
        }
        if (this._wayneLabel) {
            try { this._wayneLabel.setPosition(sprite.x, sprite.y - 50); } catch (e) {}
        }

        if (sprite.setDepth) {
            const depth = 1 + (sprite.y / Math.max(1, this.scale.height)) * 1.2;
            sprite.setDepth(depth);
        }
    }

    _ensureWayneAnimations() {
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

    _playWayneAnimation(mode, facing) {
        const sprite = this._wayne;
        if (!sprite || !this.anims) return;
        const key = `rowan_${mode}_${facing}`;
        if (!this.anims.exists(key)) return;
        const current = sprite.anims && sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null;
        if (current !== key) sprite.anims.play(key, true);
    }

    _refreshCaveFurnaceModal() {
        if (!this._furnaceModal) return;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const elC = document.getElementById('cave-furnace-copper-qty');
        const elT = document.getElementById('cave-furnace-tin-qty');
        if (elC) elC.textContent = findQty('copper_ore');
        if (elT) elT.textContent = findQty('tin_ore');
        const btnCopper = document.getElementById('cave-smelt-copper');
        const btnBronze = document.getElementById('cave-smelt-bronze');
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const copperRecipe = recipes['copper_bar'];
        const bronzeRecipe = recipes['bronze_bar'];
        const buildLabel = (r) => {
            if (!r) return '';
            try {
                return 'Smelt ' + (r.name || r.id) + ' (' + (r.requires || []).map(req => ((items[req.id] && items[req.id].name) || req.id) + (req.qty && req.qty > 1 ? ' x' + req.qty : '')).join(' + ') + ')';
            } catch (e) { return 'Smelt ' + (r.name || r.id); }
        };
        if (btnCopper) {
            if (this.smeltingActive && this._smeltType === 'copper_bar') { btnCopper.textContent = 'Stop Smelting ' + (copperRecipe && copperRecipe.name ? copperRecipe.name : 'Copper'); btnCopper.style.background = '#aa4422'; }
            else { btnCopper.textContent = buildLabel(copperRecipe) || 'Smelt Copper Bar'; btnCopper.style.background = '#6b4f3a'; }
            btnCopper.disabled = this.smeltingActive && this._smeltType !== 'copper_bar'; btnCopper.style.opacity = btnCopper.disabled ? '0.6' : '1';
            btnCopper.onclick = () => {
                if (this.smeltingActive) { if (this._smeltType === 'copper_bar') this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
                else this._startContinuousSmelting('copper_bar');
                this._refreshCaveFurnaceModal();
            };
        }
        if (btnBronze) {
            if (this.smeltingActive && this._smeltType === 'bronze_bar') { btnBronze.textContent = 'Stop Smelting ' + (bronzeRecipe && bronzeRecipe.name ? bronzeRecipe.name : 'Bronze'); btnBronze.style.background = '#aa4422'; }
            else { btnBronze.textContent = buildLabel(bronzeRecipe) || 'Smelt Bronze'; btnBronze.style.background = '#7a5f3a'; }
            btnBronze.disabled = this.smeltingActive && this._smeltType !== 'bronze_bar'; btnBronze.style.opacity = btnBronze.disabled ? '0.6' : '1';
            btnBronze.onclick = () => {
                if (this.smeltingActive) { if (this._smeltType === 'bronze_bar') this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
                else this._startContinuousSmelting('bronze_bar');
                this._refreshCaveFurnaceModal();
            };
        }
    }

    // Reuse same smelting control methods as Town but ensure they exist in Cave
    _startContinuousSmelting(type) {
        if (this.smeltingActive) return;
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const recipe = recipes[type];
        if (!recipe) { this._showToast('Unknown recipe'); return; }
        // quick requirement check before scheduling
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        let ok = true;
        for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
        if (!ok) { this._showToast('Missing materials'); return; }

        this.smeltingActive = true;
        this._smeltType = type;
        setSceneActivity(this, 'smithing', { source: 'smelting-start', timeout: 0 });
        // start furnace flame
        try { this._setFurnaceFlame(true); } catch(e) {}
        // schedule-first: wait interval, then call _attemptSmelt
    this._smeltingEvent = addTimeEvent(this, { delay: this.smeltingInterval, callback: this._attemptSmelt, callbackScope: this, args: [type], loop: true });
        this._showToast('Started smelting ' + (recipe.name || type));
    try { if (this._setFurnaceFlame) this._setFurnaceFlame(true); } catch(e) {}
        // show smithing HUD and refresh modal
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
        this._refreshCaveFurnaceModal();
    }

    _stopContinuousSmelting() {
    if (!this.smeltingActive) return;
    this.smeltingActive = false;
    if (this._smeltingEvent) { try { if (typeof this._smeltingEvent === 'function') this._smeltingEvent(); else this._smeltingEvent.remove && this._smeltingEvent.remove(false); } catch (e) {} this._smeltingEvent = null; }
        this._showToast('Smelting stopped');
        this._smeltType = null;
    // stop furnace flame
    try { this._setFurnaceFlame(false); } catch(e) {}
    try { if (this._setFurnaceFlame) this._setFurnaceFlame(false); } catch(e) {}
        if (this.miningActive) setSceneActivity(this, 'mining', { silent: true, source: 'smelting-stop', timeout: 0 });
        else clearActivity(this, { source: 'smelting-stop' });
        this._refreshCaveFurnaceModal();
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _attemptSmelt(recipeId) {
        const inv = this.char.inventory = this.char.inventory || [];
        const find = (id) => inv.find(x => x && x.id === id);
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const recipe = recipes[recipeId];
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        if (!recipe) { this._stopContinuousSmelting(); this._showToast('Unknown recipe'); return; }
        // check requirements
        for (const req of (recipe.requires || [])) {
            const have = (find(req.id) && find(req.id).qty) || 0;
            if (have < (req.qty || 1)) {
                // out of materials: stop smelting, clear activity and refresh HUD
                this._stopContinuousSmelting();
                try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
                this._showToast('Out of materials for ' + (recipe.name || recipeId));
                return;
            }
        }
        // consume materials (slot-aware when possible)
        for (const req of (recipe.requires || [])) {
            const qtyNeeded = (req.qty || 1);
            if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
                const ok = window.__shared_ui.removeItemFromInventory(this, req.id, qtyNeeded);
                if (!ok) { this._stopContinuousSmelting(); this._showToast('Out of materials for ' + (recipe.name || recipeId)); return; }
            } else {
                const it = find(req.id);
                if (it) {
                    it.qty -= qtyNeeded;
                    if (it.qty <= 0) {
                        if (window && window.__shared_ui && window.__shared_ui.removeItemFromSlots) {
                            window.__shared_ui.removeItemFromSlots(inv, req.id, 0);
                        } else {
                            inv.splice(inv.indexOf(it), 1);
                        }
                    }
                }
            }
        }
        // give product
        const prodId = recipe.id || recipeId;
        const prodDef = items && items[prodId];
            if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) {
                const added = window.__shared_ui.addItemToInventory(this, prodId, 1);
                if (!added) this._showToast('Not enough inventory space');
            } else {
                if (prodDef && prodDef.stackable) {
                    let ex = find(prodId);
                    if (ex) ex.qty = (ex.qty || 0) + 1; else inv.push({ id: prodId, name: prodDef.name || recipe.name, qty: 1 });
                } else {
                    inv.push({ id: prodId, name: (prodDef && prodDef.name) || recipe.name, qty: 1 });
                }
            }
            const newQty = (find(prodId) && find(prodId).qty) || 1;
        this._showToast(`Smelted 1x ${(prodDef && prodDef.name) || recipe.name}! (${newQty} total)`);
    // award smithing XP
    // Server-authoritative smithing XP grant
    const smithingXp = recipe.smithingXp || 0;
    if (this.char.id && smithingXp > 0 && window.__cif_persist && typeof window.__cif_persist.grantSkillXp === 'function') {
        window.__cif_persist.grantSkillXp(this.char.id, 'smithing', smithingXp).then(progress => {
            if (progress) {
                this.char.smithing = progress;
                try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'smithing', 0); } catch (e) {}
                try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) {}
            } else {
                // Fallback local progression if server call failed
                this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
                this.char.smithing.exp = (this.char.smithing.exp || 0) + smithingXp;
                while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                    this.char.smithing.exp -= this.char.smithing.expToLevel;
                    this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                    this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                    try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'smithing', 1); } catch (e) {}
                    this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
                }
            }
        });
    }
        this._persistCharacter((this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null);
        // Avoid recreating HUD every tick; refresh modal and inventory UI only
        this._refreshCaveFurnaceModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }

    _setFurnaceFlame(active) {
        if (!this.furnace) return;
        if (active) {
            if (!this.anims.exists('furnace_burn')) console.warn('furnace_burn animation not found for furnace');
            try { this.furnace.play('furnace_burn', true); } catch (e) { console.warn('Could not play furnace animation', e); }
        } else {
            if (this.furnace.anims) this.furnace.anims.stop();
            if (this.furnace.setFrame) this.furnace.setFrame(0);
        }
    }

    _hideMiningIndicator() {
        if (this._miningIndicator) {
            this._miningIndicator.destroy();
            this._miningIndicator = null;
        }
    }

    // Persist mining and inventory changes to localStorage (by name match)
    _persistCharacter(username) {
        if (!username || !this.char) return;
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key));
            if (userObj && userObj.characters) {
                let found = false;
                for (let i = 0; i < userObj.characters.length; i++) {
                    const uc = userObj.characters[i];
                    if (!uc) continue;
                    if ((uc.id && this.char.id && uc.id === this.char.id) || (!uc.id && uc.name === this.char.name)) {
                        userObj.characters[i].mining = this.char.mining;
                        userObj.characters[i].inventory = this.char.inventory;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // fallback: try to add/update by name if no id match
                    for (let i = 0; i < userObj.characters.length; i++) {
                        if (!userObj.characters[i]) { userObj.characters[i] = this.char; found = true; break; }
                    }
                    if (!found) userObj.characters.push(this.char);
                }
                localStorage.setItem(key, JSON.stringify(userObj));
            }
        } catch (e) { console.warn('Could not persist character', e); }

        // Forward inventory + basic patch to server so ItemStack table stays in sync while mining.
        try {
            const charId = (this.char && this.char.id) || null;
            if (charId && typeof window !== 'undefined' && window.__cif_persist) {
                try { syncInventoryToServer(this); } catch (e) {}
                // Minimal patch for mining progress (so server has up-to-date vein timers etc. if stored)
                try {
                    if (window.__cif_persist.saveCharacterPatch) {
                        const miningPatch = this.char.mining ? { mining: this.char.mining } : {};
                        if (Object.keys(miningPatch).length) window.__cif_persist.saveCharacterPatch(charId, miningPatch);
                    }
                } catch (e) { /* ignore */ }
            }
        } catch (e) { /* ignore server forward errors */ }
        // Refresh inventory modal if open so changes appear immediately
        try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) { /* ignore */ }
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.18 });
        if (!movement) return;
        if (!this.miningActive) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });

        // portal interaction
        if (this.portal) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const dist = Phaser.Math.Distance.Between(_px, _py, this.portal.x, this.portal.y);
            if (dist <= 56) {
                this.portalPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    // persist inventory/mining and set lastLocation to Town with current position
                    try {
                        const key = 'cif_user_' + username;
                        const userObj = JSON.parse(localStorage.getItem(key));
                        if (userObj && userObj.characters) {
                            for (let i = 0; i < userObj.characters.length; i++) {
                                const uc = userObj.characters[i];
                                if (!uc) continue;
                                // match by id if available, fallback to name
                                if ((uc.id && this.char.id && uc.id === this.char.id) || (!uc.id && uc.name === this.char.name)) {
                                    userObj.characters[i].mining = this.char.mining;
                                    userObj.characters[i].inventory = this.char.inventory;
                                    userObj.characters[i].lastLocation = { scene: 'Town', x: this.player.x, y: this.player.y };
                                    localStorage.setItem(key, JSON.stringify(userObj));
                                    break;
                                }
                            }
                        }
                    } catch (e) { console.warn('Could not persist lastLocation', e); }
                    this.scene.start('Town', { character: this.char, username: username, spawnX: 120, spawnY: this.portal ? this.portal.y : (this.scale.height - 120) });
                }
            } else { this.portalPrompt.setVisible(false); }
        }

        // furnace interaction (show prompt + open modal)
        if (this.furnace) {
            // compute distance using the player's physics-body center so interaction matches collision center
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const fdist = Phaser.Math.Distance.Between(_px, _py, this.furnace.x, this.furnace.y);
            if (fdist <= 56) {
                this.furnacePrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    this._openFurnaceModal();
                }
            } else {
                this.furnacePrompt.setVisible(false);
                if (this._furnaceModal) this._closeCaveFurnaceModal();
            }
        }

        // Wayne Mineson interaction (tutorial NPC)
        try { if (this._updateWayneAI) this._updateWayneAI(time, delta); } catch (e) {}
        if (this._wayne) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const wdist = Phaser.Math.Distance.Between(_px, _py, this._wayne.x, this._wayne.y);
            if (this._waynePrompt) this._waynePrompt.setVisible(wdist <= 56);
            if (wdist <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                try { this._openWayneDialogue && this._openWayneDialogue(); } catch (e) {}
            }
        }

        // mining node interaction (support multiple nodes)
        if (this.miningNodes && this.miningNodes.length) {
            let nearest = null;
            let nearestDist = 9999;
            // use player's physics-body center so proximity checks match the collider used for movement
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            for (const node of this.miningNodes) {
                const dist = Phaser.Math.Distance.Between(_px, _py, node.x, node.y);
                if (dist < nearestDist) { nearestDist = dist; nearest = node; }
                node.prompt.setVisible(dist <= 56);
            }
            // if nearest is within range, allow mining
            if (nearest && nearestDist <= 56) {
                // start continuous mining on E press targeting this node
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && !this.miningActive) {
                    this._activeNode = nearest;
                    this._startContinuousMining();
                }
            } else {
                // no node nearby, hide prompts and stop mining
                this._activeNode = null;
                if (this.miningActive) this._stopContinuousMining();
            }
        }

        // if player starts moving while mining, stop continuous mining
        if (this.miningActive) {
            const moved = this.keys.left.isDown || this.keys.right.isDown || this.keys.up.isDown || this.keys.down.isDown || Math.abs(this.player.body.velocity.x) > 1 || Math.abs(this.player.body.velocity.y) > 1;
            if (moved) this._stopContinuousMining();
            // reposition mining indicator above player
            if (this._miningIndicator) {
                const footOffset = (this.player.displayHeight || 48) / 2 + 8;
                this._miningIndicator.x = this.player.x;
                this._miningIndicator.y = this.player.y + footOffset;
            }
        }
    }

    // Mining attempt logic: Professional MMO-style (guaranteed success, node depletion)
    _attemptMine() {
        const node = this._activeNode;
        if (!node) return;
        
        // Check if node is depleted
        if (node.depleted) {
            this._stopContinuousMining();
            this._showToast('Node depleted - it will respawn soon');
            return;
        }
        
        // Check level requirement
        const mining = this.char.mining = this.char.mining || { level: 1, exp: 0, expToLevel: 100 };
        const reqLevel = node.reqLevel || 1;
        if (mining.level < reqLevel) {
            this._stopContinuousMining();
            this._showToast(`Mining level ${reqLevel} required for ${node.label}`);
            return;
        }

        // Play mining animation
        const intervalMs = Math.max(200, this._currentMiningInterval || this.miningInterval || 2800);
        try {
            const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
            const tex = this.textures.get(mineKey);
            let frameNames = [];
            if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
            const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
            const rows = 4;
            const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
            const dir = this._facing || 'down';
            // Dynamic row order (reuse global mine row orders if defined). Fallback to ULDR.
            let order = ['up','left','down','right'];
            try { if (typeof window !== 'undefined' && window.__mineRowOrders) order = window.__mineRowOrders[window.__mineRowOrderIndex || 0]; } catch (e) {}
            const rowIndex = Math.max(0, order.indexOf(dir));
            try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent) console.debug('[caveMine] order',order,'dir',dir,'rowIndex',rowIndex); } catch(e){}
            if (framesPerRow > 0) {
                const startFrame = rowIndex * framesPerRow;
                const endFrame = startFrame + framesPerRow - 1;
                const fps = Math.max(1, Math.round(framesPerRow / (intervalMs / 1000)));
                const animKey = `mine_${dir}`;
                try { if (this.anims.exists(animKey)) this.anims.remove(animKey); } catch (e) {}
                try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(mineKey, { start: startFrame, end: endFrame }), frameRate: fps, repeat: 0 }); } catch (e) {}
            } else if (totalFrames > 0) {
                const fps = Math.max(1, Math.round(totalFrames / (intervalMs / 1000)));
                try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
            }
        } catch (e) {}

        try {
            const dir = this._facing || 'down';
            const dirAnimName = `mine_${dir}`;
            const usedDirectional = this.anims.exists(dirAnimName);
            const animKey = usedDirectional ? dirAnimName : (this.anims.exists('mine') ? 'mine' : null);
            if (this.player && animKey) this.player.anims.play(animKey, true);
            if (this.player) {
                if (usedDirectional) this.player.setFlipX(false);
                else this.player.setFlipX((this._facing || 'down') === 'left');
            }
        } catch (e) {}

        // GUARANTEED SUCCESS - get item data
        node.item = node.item || { id: node.itemId || `${node.type || 'ore'}_ore`, name: node.label || 'Ore' };
        if (!node.item.name) node.item.name = node.label || 'Ore';
        let itemName = node.item.name;
        try {
            if (window && window.ITEM_DEFS && window.ITEM_DEFS[node.item.id] && window.ITEM_DEFS[node.item.id].name) {
                itemName = window.ITEM_DEFS[node.item.id].name;
            }
        } catch (e) {}

        // Guaranteed yield per hit
        const quantity = node.yieldPerHit || 1;

        // Add to inventory
        let addedToShared = false;
        try {
            if (this._addItemToInventory && typeof this._addItemToInventory === 'function') {
                this._addItemToInventory(node.item.id, quantity);
                addedToShared = true;
            } else if (window && window.__shared_ui && typeof window.__shared_ui.addItemToInventory === 'function') {
                const ok = window.__shared_ui.addItemToInventory(this, node.item.id, quantity);
                if (!ok && this._showToast) this._showToast('Inventory full');
                addedToShared = true;
            }
        } catch (e) {}
        if (!addedToShared) {
            this.char.inventory = this.char.inventory || [];
            const slot = this.char.inventory.find(it => it && it.id === node.item.id);
            if (slot && typeof slot.qty === 'number') slot.qty += quantity;
            else this.char.inventory.push({ id: node.item.id, name: itemName, qty: quantity });
        }
        
        // Refresh inventory modal if open
        try { if (this._inventoryModal) this._refreshInventoryModal && this._refreshInventoryModal(); } catch (e) {}

        // Quest progress
        try {
            updateQuestProgress(this.char, 'mine', node.item.id, quantity);
            if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal && this._questLogModal) {
                window.__shared_ui.refreshQuestLogModal(this);
            }
        } catch (e) {}

        // Grant XP (from node definition)
        let xpGain = node.xpPerHit || 10;
        
        // Apply skill XP talent modifiers
        try {
            const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                ? window.__shared_ui.stats.effectiveStats(this.char)
                : null;
            const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
            
            if (eff && (eff.skillXpBonusPercent || eff.skillXpFlatBonus)) {
                const flatBonus = Number(eff.skillXpFlatBonus || 0);
                const pctBonus = Number(eff.skillXpBonusPercent || 0);
                xpGain = Math.max(1, Math.round((xpGain + flatBonus) * (1 + (pctBonus / 100))));
            }
            
            const miningXpMod = tmods['miningXpGain'] || null;
            if (miningXpMod) {
                const flatBonus = Number(miningXpMod.flat || 0);
                const pctBonus = Number(miningXpMod.percent || 0);
                xpGain = Math.max(1, Math.round((xpGain + flatBonus) * (1 + (pctBonus / 100))));
            }
        } catch (e) {}
        
        // Server-authoritative mining XP grant
        if (this.char.id && window.__cif_persist && typeof window.__cif_persist.queueSkillXp === 'function') {
            // Batch frequent mining ticks to avoid spamming the server
            window.__cif_persist.queueSkillXp(this.char.id, 'mining', xpGain);
        } else {
            mining.exp = (mining.exp || 0) + xpGain;
        }

        // Deplete node health
        node.currentHealth = (node.currentHealth || node.maxHealth) - 1;
        
        // Update health bar visual
        try { this._updateNodeHealthBar(node); } catch (e) {}
        
        if (node.currentHealth <= 0) {
            node.depleted = true;
            node.currentHealth = 0;
            this._showToast(`${node.label} depleted! (+${xpGain} XP)`);
            this._depleteNode(node);
        } else {
            this._showToast(`${quantity}x ${itemName}! [${node.currentHealth}/${node.maxHealth}] (+${xpGain} XP)`);
        }
        
        // Visual feedback
        this._playMiningSwingEffect(node, true);
        try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}

        // Check for level ups
        // Level-up handled server-side when queue flushes; fallback only if local progression used above
        if (!this.char.id || !(window.__cif_persist && typeof window.__cif_persist.queueSkillXp === 'function')) {
            while (mining.exp >= mining.expToLevel) {
                mining.exp -= mining.expToLevel;
                mining.level = (mining.level || 1) + 1;
                mining.expToLevel = Math.floor(mining.expToLevel * 1.25);
                this._showToast('Mining level up! L' + mining.level, 2200);
                try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'mining', 1); } catch (e) {}
            }
        }

        // Persist and update HUD
        this.char.mining = mining;
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);
        try { this._updateHUD(); } catch (e) { try { this._destroyHUD(); this._createHUD(); } catch (_) {} }
        
        // Update node health bar if exists
        try { if (node.healthBar) this._updateNodeHealthBar(node); } catch (e) {}
    }
    
    // Deplete a node and schedule respawn
    _depleteNode(node) {
        if (!node) return;
        node.depleted = true;
        node.currentHealth = 0;
        
        // Hide/fade sprite
        if (node.sprite) {
            this.tweens.add({
                targets: node.sprite,
                alpha: 0.2,
                duration: 400,
                ease: 'Cubic.easeOut'
            });
        }
        
        // Hide prompt
        if (node.prompt) node.prompt.setVisible(false);
        
        // Hide health bar
        if (node.healthBar) node.healthBar.setVisible(false);
        if (node.healthBarBg) node.healthBarBg.setVisible(false);
        
        // Schedule respawn
        const respawnTime = node.respawnTime || 60000;
        const respawnEvent = addTimeEvent(this, {
            delay: respawnTime,
            callback: () => {
                this._respawnNode(node);
            },
            callbackScope: this
        });
        node._respawnEvent = respawnEvent;
    }
    
    // Respawn a depleted node
    _respawnNode(node) {
        if (!node) return;
        node.depleted = false;
        node.currentHealth = node.maxHealth;
        
        // Show/restore sprite
        if (node.sprite) {
            this.tweens.add({
                targets: node.sprite,
                alpha: 1,
                duration: 600,
                ease: 'Cubic.easeIn'
            });
        }
        
        // Update health bar
        try { if (node.healthBar) this._updateNodeHealthBar(node); } catch (e) {}
        
        // Clean up respawn event reference
        if (node._respawnEvent) {
            node._respawnEvent = null;
        }
    }

    _updateNodeHealthBar(node) {
        if (!node || !node.healthBar) return;
        
        const healthRatio = Math.max(0, Math.min(1, node.currentHealth / node.maxHealth));
        const barWidth = 35;
        const newWidth = barWidth * healthRatio;
        
        // Update fill width
        node.healthBar.width = newWidth;
        
        // Change color based on health (green → yellow → red)
        let color = 0x44cc44; // Green
        if (healthRatio < 0.3) {
            color = 0xcc4444; // Red
        } else if (healthRatio < 0.6) {
            color = 0xcccc44; // Yellow
        }
        node.healthBar.setFillStyle(color);
        
        // Show/hide health bar based on depletion state
        if (node.depleted) {
            if (node.healthBar) node.healthBar.setVisible(false);
            if (node.healthBarBg) node.healthBarBg.setVisible(false);
        } else {
            if (node.healthBar) node.healthBar.setVisible(true);
            if (node.healthBarBg) node.healthBarBg.setVisible(true);
        }
    }

    _startContinuousMining() {
        if (this.miningActive) return;
        const node = this._activeNode;
        // Pre-start validation: ensure node exists & has remaining health (ore) before starting
        if (!node) return; // nothing targeted
        const remaining = (typeof node.currentHealth === 'number') ? node.currentHealth : node.maxHealth;
        if (node.depleted || remaining <= 0) {
            try { this._showToast && this._showToast('This node is depleted'); } catch (e) {}
            // Clear active node reference so prompts can hide until respawn
            this._activeNode = null;
            return;
        }
        // Passed pre-check: begin continuous mining
        this.miningActive = true;
        setSceneActivity(this, 'mining', { source: 'mining-start', timeout: 0 });
        const snapshot = this._getMiningSnapshot();
        // Use node's baseSpeed property (NEW SYSTEM)
        const baseInterval = (node && node.baseSpeed) ? node.baseSpeed : (this.miningInterval || 2800);
        
        const statReduction = Math.round((snapshot.miningLevel || 1) * 20 + (snapshot.str || 0) * 8);
        const toolReduction = Math.round(snapshot.toolSpeed || 0);
        let calculatedInterval = Math.max(800, baseInterval - statReduction - toolReduction);
        // Apply gatherSpeed talent modifiers
        try {
            const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                ? window.__shared_ui.stats.effectiveStats(this.char)
                : null;
            if (eff && (eff.gatherSpeedBonusPercent || eff.gatherSpeedFlatBonus)) {
                const flatBonus = Number(eff.gatherSpeedFlatBonus || 0);
                const pctBonus = Number(eff.gatherSpeedBonusPercent || 0);
                // Flat bonus reduces ms (negative = faster), percent bonus reduces duration
                calculatedInterval = Math.max(200, Math.round((calculatedInterval - flatBonus) / (1 + (pctBonus / 100))));
            }
        } catch (e) {}
        this._currentMiningInterval = calculatedInterval;
        // Play the swing animation immediately for feedback, but schedule the first mining attempt
        // to occur after the miningInterval so the player must wait the mining speed to get ore.
        try {
            // create/play directional or fallback mine animation matching the mining interval duration
            const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
            const tex = this.textures.get(mineKey);
            let frameNames = [];
            if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
            const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
            const rows = 4;
            const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
            const dir = this._facing || 'down';
            let order2 = ['up','left','down','right'];
            try { if (typeof window !== 'undefined' && window.__mineRowOrders) order2 = window.__mineRowOrders[window.__mineRowOrderIndex || 0]; } catch (e) {}
            const rowIndex = Math.max(0, order2.indexOf(dir));
            try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent) console.debug('[caveStartMining] order',order2,'dir',dir,'rowIndex',rowIndex); } catch(e){}
            if (framesPerRow > 0) {
                const start = rowIndex * framesPerRow;
                const end = start + framesPerRow - 1;
                const durationMs = Math.max(200, this._currentMiningInterval || this.miningInterval || 2800);
                const fps = Math.max(1, Math.round(framesPerRow / (durationMs / 1000)));
                const animKey = 'mine_' + dir;
                try { if (this.anims.exists(animKey)) this.anims.remove(animKey); } catch (e) {}
                try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(mineKey, { start: start, end: end }), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists(animKey)) this.player.anims.play(animKey, true); } catch (e) {}
                try { if (this.player) this.player.setFlipX(false); } catch (e) {}
            } else if (totalFrames > 0) {
                const durationMs = Math.max(200, this._currentMiningInterval || this.miningInterval || 2800);
                const fps = Math.max(1, Math.round(totalFrames / (durationMs / 1000)));
                try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists('mine')) this.player.anims.play('mine', true); } catch (e) {}
                try { if (this.player) this.player.setFlipX((this._facing || 'down') === 'left'); } catch (e) {}
            }
        } catch (e) {}
        // schedule the first actual mining attempt after the configured interval
        const delay = this._currentMiningInterval || this.miningInterval || 2800;
    this._miningEvent = addTimeEvent(this, { delay, callback: this._attemptMine, callbackScope: this, loop: true });
        // show mining indicator
        this._showMiningIndicator();
        // refresh HUD immediately so the mining bar appears
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _stopContinuousMining() {
        this.miningActive = false;
        this._currentMiningInterval = null;
        if (this._miningEvent) { try { if (typeof this._miningEvent === 'function') this._miningEvent(); else this._miningEvent.remove && this._miningEvent.remove(false); } catch (e) {} this._miningEvent = null; }
        this._hideMiningIndicator();
        if (this.smeltingActive) setSceneActivity(this, 'smithing', { silent: true, source: 'mining-stop', timeout: 0 });
        else clearActivity(this, { source: 'mining-stop' });
        // refresh HUD so it reverts to class exp bar
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
}

applyCombatMixin(Cave.prototype);

