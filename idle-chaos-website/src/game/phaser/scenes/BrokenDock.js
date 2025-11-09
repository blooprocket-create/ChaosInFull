import { createPortal } from './shared/portal.js';
import '../shared/telemetryBridge.js';
import { persistCharacter } from './shared/persistence.js';
import { createPlayer } from '../shared/playerFactory.js';
import { onSkillLevelUp, ensureCharTalents } from '../data/talents.js';
import FISHING_DEFS from '../data/fishing.js';
import FishingController from '../systems/FishingController.js';
import { applySafeZoneRegen } from './shared/stats.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { applyCombatMixin } from './shared/combat.js';
import { attach as attachCleanup, addTimeEvent, addDocumentListener } from '../shared/cleanupManager.js';
import { getQuestById, getQuestObjectiveState, startQuest, checkQuestCompletion, completeQuest, updateQuestProgress } from '../data/quests.js';

const FISHING_RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const FISHING_RARITY_RANK = FISHING_RARITY_ORDER.reduce((acc, key, idx) => { acc[key] = idx; return acc; }, {});
const FISHING_RARITY_COLORS = {
    common: '#9cb7d1',
    uncommon: '#6fd5a6',
    rare: '#6fa9ff',
    epic: '#b57dff',
    legendary: '#ffce6f'
};

export class BrokenDock extends Phaser.Scene {
    constructor() {
        super('BrokenDock');
    }

    preload() {
        this.load.image('dock_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        // Attach cleanup manager early to ensure timers/colliders/listeners are auto-cleaned
        try { attachCleanup(this); } catch (e) {}
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const W = this.scale.width;
        const H = this.scale.height;
        this.add.text(centerX, 32, 'Broken Dock', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

        // Player spawn
        const platformHeight = 60;
        const platformY = this.scale.height - (platformHeight / 2);
        const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || Math.max(80, this.scale.width * 0.12);
        const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (platformY - 70);
    // create player with centralized collider sizing
    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');

        // ensure standard movement animations exist (some scenes create these; make sure they're available)
        try {
            if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
            if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
            if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
        } catch (e) { console.warn('Failed to create player animations in BrokenDock', e); }

        // Top-down layout: top 50% = water, bottom 50% = ground. Dock extends from ground up into water.
        const halfH = Math.round(H * 0.5);
        const waterTop = 0;
        const waterBottom = halfH;
        const groundTop = halfH;
        const groundH = H - halfH;

        try {
            this._dockWater = buildThemedFloor(this, 'dock_water', { bounds: { x: 0, y: waterTop, width: W, height: halfH }, depth: 0 });
        } catch (e) {
            this.cameras.main.setBackgroundColor('#17253a');
        }
        try {
            this._groundFloor = buildThemedFloor(this, 'dock_ground', { bounds: { x: 0, y: groundTop, width: W, height: groundH }, depth: 0.1 });
        } catch (e) { /* ignore fallback; ground visuals not critical */ }
        applyAmbientFx(this, 'dock');

        // Water area visuals and colliders: we'll create left and right water bodies leaving a gap for the dock
        this._waterColliders = this._waterColliders || [];
    // Dock parameters (vertical dock extending from ground up into water)
    // make the dock smaller so it reads as a short pier rather than a huge platform
    const dockWidth = Math.round(this.scale.width * 0.10);
    const dockLength = Math.round(this.scale.height * 0.16);
        const dockX = Math.round(this.scale.width / 2);
        // center the dock so its bottom sits on groundTop + small offset and its top reaches into the water
        const dockY = waterBottom - 12 + Math.round(dockLength / 2);

        // create water rectangles left and right of dock (so dock area is walkable)
        // add a small padding so the water colliders do not overlap the dock and block the player body
        const waterPad = 12;
        try {
            const leftEdge = Math.max(0, dockX - Math.round(dockWidth / 2) - waterPad);
            const leftWidth = Math.max(8, leftEdge);
            if (leftWidth > 8) {
                const wx = leftEdge / 2;
                const wy = (waterTop + waterBottom) / 2;
                const wRect = this.add.rectangle(wx, wy, leftWidth, waterBottom - waterTop, 0x2266aa, 0.85).setDepth(0.7);
                // add static physics body to block player walking here
                try { if (this.physics && this.physics.add) { this.physics.add.existing(wRect, true); this._waterColliders.push(wRect); if (this.player && this.player.body) this.physics.add.collider(this.player, wRect); } } catch (e) {}
            }
            const rightStart = Math.min(this.scale.width, dockX + Math.round(dockWidth / 2) + waterPad);
            const rightWidth = Math.max(8, this.scale.width - rightStart);
            if (rightWidth > 8) {
                const rx = rightStart + rightWidth / 2;
                const ry = (waterTop + waterBottom) / 2;
                const wRect2 = this.add.rectangle(rx, ry, rightWidth, waterBottom - waterTop, 0x2266aa, 0.85).setDepth(0.7);
                try { if (this.physics && this.physics.add) { this.physics.add.existing(wRect2, true); this._waterColliders.push(wRect2); if (this.player && this.player.body) this.physics.add.collider(this.player, wRect2); } } catch (e) {}
            }
        } catch (e) {}

        // create the dock (visual) but do NOT add a physics collider so the player can walk onto it freely
        try {
            const dock = this.add.rectangle(dockX, dockY, dockWidth, dockLength, 0x8b5a33, 1).setDepth(1.2);
            dock.setStrokeStyle(2, 0x6b3f22, 0.9);
            this._dockVisual = dock;
        } catch (e) {}
        // Apply initial dock visual based on current repair stage
        try { this._refreshDockVisual && this._refreshDockVisual((this.char && this.char.flags && this.char.flags.dockStage) || 0); } catch (e) {}

        // Place the fishing node at the top end of the dock (over water visually)
        try {
            const nodeX = dockX;
            const nodeY = dockY - Math.round(dockLength / 2) - 12;
            this.fishingNode = this._createFishingNode(nodeX, nodeY);
            // ensure fishing node prompt depth is above dock
            try { if (this.fishingNode && this.fishingNode.prompt) this.fishingNode.prompt.setDepth(1.9); } catch (e) {}
        } catch (e) {}

        // Bait bucket (shop) positioned on the ground near the dock (left side)
        try {
            const bucketX = Math.max(120, dockX - dockWidth - 60);
            const bucketY = Math.min(this.scale.height - 64, groundTop + 40);
            this.baitBucket = this._createBucket(bucketX, bucketY);
            try { if (this.baitBucket && this.baitBucket.sprite) this.baitBucket.sprite.setDepth(1.15); } catch (e) {}
        } catch (e) {}

        // Harborwright NPC (Dock repair questline entry)
        try {
            const npcX = Math.min(this.scale.width - 120, dockX + dockWidth + 60);
            const npcY = Math.min(this.scale.height - 64, groundTop + 40);
            const r = 22;
            this.harborwright = this.add.circle(npcX, npcY, r, 0x3a556b, 1).setDepth(1.2);
            this.harborwright.setStrokeStyle(2, 0x89b4ff, 0.9);
            this.harborwrightPrompt = this.add.text(npcX, npcY - 46, '[E] Help Repair Dock', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.harborwrightPrompt.setVisible(false);
        } catch (e) {}

        // animate water: simple ripple circles that subtly move
        try {
            this._waterRipples = this._waterRipples || [];
            const rippleCount = Math.max(12, Math.round((this.scale.width * (waterBottom - waterTop)) / 24000));
            for (let i = 0; i < rippleCount; i++) {
                const rx = Phaser.Math.Between(16, this.scale.width - 16);
                // avoid placing ripples on top of the dock central column area
                if (rx > dockX - Math.round(dockWidth / 2) && rx < dockX + Math.round(dockWidth / 2)) continue;
                const ry = Phaser.Math.Between(waterTop + 8, waterBottom - 8);
                const r = Phaser.Math.Between(6, 14);
                const c = this.add.ellipse(rx, ry, r * 1.6, r * 0.8, 0x557fbf, Phaser.Math.FloatBetween(0.35, 0.65)).setDepth(0.75);
                this._waterRipples.push(c);
                // gentle up/down tween
                try { this.tweens.add({ targets: c, y: c.y + Phaser.Math.Between(-6, 6), alpha: { from: 0.45, to: Phaser.Math.FloatBetween(0.25, 0.8) }, duration: 1400 + Math.random()*1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } catch (e) {}
            }
        } catch (e) {}

        // attach keys and HUD
        if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);
    this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
    try { ensureCharTalents && ensureCharTalents(this.char); } catch (e) {}
    try { if (window && window.ensureFishingMastery) window.ensureFishingMastery(this.char); } catch (e) {}
        // Ensure dock questline flag exists
        try { if (!this.char.flags) this.char.flags = {}; if (typeof this.char.flags.dockStage !== 'number') this.char.flags.dockStage = 0; } catch(e) {}
    // Migrate existing dockStage into quest completions (if any) to keep systems in sync
    try { this._migrateDockQuestsFromStage && this._migrateDockQuestsFromStage(); } catch (e) {}
            // Ensure a portable _persistCharacter helper is available early so code in create()
            // that conditionally calls it (if present) will work even before the end-of-create wiring.
            try {
                if (!this._persistCharacter) {
                    this._persistCharacter = (username) => {
                        try {
                            persistCharacter(this, username, { includeLocation: true, assignFields: ['fishing', 'inventory', 'flags', 'gold', 'lastLocation'], logErrors: false });
                        } catch (e) {}
                    };
                }
            } catch (e) {}
        if (!this.char.inventory) this.char.inventory = [];
        setSceneKey('BrokenDock');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });
        try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) {}
        if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();
        this._startSafeZoneRegen();
        // Schedule mastery keybinding (M) slightly after create to ensure input keyboard ready
        try {
            if (!this._masteryKeyInitScheduled) {
                this._masteryKeyInitScheduled = true;
                addTimeEvent(this, { delay: 50, callback: () => {
                    try {
                        if (this.input && this.input.keyboard) {
                            this._keyHandlers = this._keyHandlers || {};
                            if (!this._keyHandlers.m) {
                                this._keyHandlers.m = (evt) => { if (evt && evt.repeat) return; try { this._openFishingMasteryOverlay && this._openFishingMasteryOverlay(); } catch (e) {} };
                                this.input.keyboard.on('keydown-M', this._keyHandlers.m);
                            }
                        }
                    } catch (e) {}
                }});
            }
        } catch (e) {}

        // Add a free rusty rod on the floor if not already taken
        try {
            if (!this.char) this.char = this.char || {};
            if (!this.char.flags) this.char.flags = this.char.flags || {};
            if (!this.char.flags.rustyRodTaken) {
                const rodX = Math.max(120, dockX - dockWidth/2 + 60);
                const rodY = platformY - 18;
                const r = 12;
                this.rustyRod = this.add.circle(rodX, rodY, r, 0x887744, 1).setDepth(1.15);
                this.rustyRodPrompt = this.add.text(rodX, rodY - 28, '[E] Pick up Rusty Rod', { fontSize: '12px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
                // interactive hit area
                try { this.rustyRod.setInteractive(new Phaser.Geom.Circle(0,0,r), Phaser.Geom.Circle.Contains); } catch(e) { this.rustyRod.setInteractive(); }
                const pickup = () => {
                    if (this.char.flags.rustyRodTaken) return;
                    const id = 'rusty_rod';
                    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                    const def = defs[id] || null;
                    let added = false;
                    try { if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) added = window.__shared_ui.addItemToInventory(this, id, 1); } catch (e) { added = false; }
                    if (!added) {
                        const inv = this.char.inventory = this.char.inventory || [];
                        if (def && def.stackable) {
                            const slot = inv.find(x => x && x.id === id);
                            if (slot) slot.qty = (slot.qty || 0) + 1; else inv.push({ id: id, name: (def && def.name) || id, qty: 1 });
                        } else {
                            inv.push({ id: id, name: (def && def.name) || id, qty: 1 });
                        }
                    }
                    this._showToast && this._showToast('Picked up Rusty Rod');
                    this.char.flags.rustyRodTaken = true;
                    try { const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null; if (this._persistCharacter) this._persistCharacter(username); } catch (e) {}
                    try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) {}
                    try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
                    try { if (this.rustyRod) this.rustyRod.destroy(); } catch (e) {}
                    try { if (this.rustyRodPrompt) this.rustyRodPrompt.destroy(); } catch (e) {}
                };
                // expose pickup for interact key handling in update()
                this.rustyRodPickup = pickup;
            }
        } catch (e) { console.warn('rusty rod setup failed', e); }

        // Left-side portal back to GraveForest — use shared helper's targetScene flow
        try {
            const portalX = 72;
            const portalY = platformY - 60;
            const spawnX = Math.round(this.scale.width / 2);
            const spawnY = platformY - 70;
            const pobj = createPortal(this, portalX, portalY, { depth: 1.5, targetScene: 'GraveForest', spawnX: spawnX, spawnY: spawnY, promptLabel: 'Return to Grave Forest' });
            this.portal = pobj.display;
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Grave Forest', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
            try { addTimeEvent(this, { delay: 220, callback: () => { if (pobj && pobj.tryUpgrade) pobj.tryUpgrade(); } }); } catch (e) {}
        } catch (e) {
            // fallback circle portal
            const portalX = 72;
            const portalY = platformY - 60;
            this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Grave Forest', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
        }

        this._toastContainer = null;
        this._activeOverlays = [];

    // Legacy passive fishing fields (kept temporarily for compatibility with any external calls)
    this.fishingActive = false; // not used by new controller except as legacy flag
    this.fishingEvent = null;
    this.fishingIntervalMs = 3000;
    this.fishingIndicator = null;
    this._fishingUi = null; // legacy modal (to be removed in revamp phase 2)
    this._bucketUi = null;  // legacy shop modal
    this._fishingHooks = null;
    this._fishingActiveBait = null;
    // New active fishing controller (Phase 1 revamp)
    try { this.fishingController = new FishingController(this); } catch(e) { console.warn('FishingController init failed', e); }

        // helper: show a simple fishing indicator near the player
        this._showFishingIndicator = () => {
            try {
                if (this.fishingIndicator) return;
                const txt = this.add.text(this.player.x, this.player.y - 48, 'Fishing...', { font: '14px Arial', fill: '#ffffff' }).setDepth(9999);
                txt.setOrigin(0.5, 0.5);
                // keep indicator following player
                txt.update = () => {
                    try { txt.x = this.player.x; txt.y = this.player.y - 48; } catch (e) {}
                };
                this.fishingIndicator = txt;
            } catch (e) { /* ignore */ }
        };

        this._hideFishingIndicator = () => {
            try { if (this.fishingIndicator) { this.fishingIndicator.destroy(); this.fishingIndicator = null; } } catch (e) {}
        };

        // movement detection while fishing: set _fishingStartPos when starting
        this._playerMovedWhileFishing = () => {
            try {
                if (!this.player || !this._fishingStartPos) return false;
                const dx = Math.abs(this.player.x - this._fishingStartPos.x);
                const dy = Math.abs(this.player.y - this._fishingStartPos.y);
                return (dx > 4 || dy > 4);
            } catch (e) { return true; }
        };

        this._startFishingLoop = (baitId, attemptFn, hooks = {}) => {
            if (this.fishingActive) return;
            this.fishingActive = true;
            this._fishingActiveBait = baitId || null;
            this._fishingHooks = hooks || null;
            this._fishingStartPos = { x: this.player.x, y: this.player.y };
            setSceneActivity(this, 'fishing', { source: 'fishing-start', timeout: 0 });
            // show indicator and perform immediate attempt
            this._showFishingIndicator();
            try { if (hooks && typeof hooks.onStart === 'function') hooks.onStart(); } catch (e) {}
            try { attemptFn(); } catch (e) { console.error('Fishing attempt error', e); }
            // compute interval ms from character / rod / luck if available
            let interval = this.fishingIntervalMs;
            try {
                const snapshot = this._calculateFishingContext ? this._calculateFishingContext() : null;
                const luk = snapshot && typeof snapshot.luk === 'number'
                    ? snapshot.luk
                    : ((this.char && this.char.stats && this.char.stats.luk) || 0);
                const rodSpeed = snapshot && typeof snapshot.rodSpeedReduction === 'number'
                    ? snapshot.rodSpeedReduction
                    : 0;
                interval = Math.max(600, Math.round(interval - (luk * 8) - rodSpeed));
            } catch (e) {}
            this.fishingEvent = addTimeEvent(this, { delay: interval, loop: true, callback: () => {
                // stop if moved
                if (this._playerMovedWhileFishing()) {
                    this._showToast && this._showToast('Stopped fishing (moved)');
                    this._stopFishingLoop('moved');
                    return;
                }
                try {
                    if (hooks && typeof hooks.onBeforeRepeat === 'function') hooks.onBeforeRepeat();
                } catch (e) {}
                try { attemptFn(); } catch (e) { console.error('Fishing repeated attempt error', e); }
            }});
        };

        this._stopFishingLoop = (reason = 'manual') => {
            if (!this.fishingActive) return;
            this.fishingActive = false;
            try {
                if (this.fishingEvent) {
                    if (typeof this.fishingEvent === 'function') this.fishingEvent();
                    else if (this.fishingEvent.remove) this.fishingEvent.remove(false);
                    this.fishingEvent = null;
                }
            } catch (e) {}
            try { this._fishingStartPos = null; } catch (e) {}
            const hooks = this._fishingHooks;
            this._fishingHooks = null;
            this._fishingActiveBait = null;
            this._hideFishingIndicator();
            clearActivity(this, { source: 'fishing-stop' });
            try { if (hooks && typeof hooks.onStop === 'function') hooks.onStop(reason); } catch (e) {}
        };

        this.events.once('shutdown', () => {
            clearActivity(this, { silent: true });
            setSceneKey(null);
            try { this._stopSafeZoneRegen(); } catch (e) {}
            if (this.fishingActive) {
                try { this._stopFishingLoop(); } catch (e) {}
            }
            try { if (typeof this._destroyHUD === 'function') this._destroyHUD(); }
            catch (e) { console.warn('Destroy HUD failed or not present', e); }
            try { if (typeof this._clearToasts === 'function') this._clearToasts(); }
            catch (e) { /* ignore */ }
            this._removeAllOverlays();
            cleanupAmbientFx(this);
            try {
                // prefer shared UI close if available, otherwise call scene helper if present
                if (window && window.__shared_ui && typeof window.__shared_ui.closeInventoryModal === 'function') {
                    window.__shared_ui.closeInventoryModal(this);
                } else if (typeof this._closeInventoryModal === 'function') {
                    this._closeInventoryModal();
                }
            } catch (e) { /* ignore */ }
            // cleanup dock collider and water colliders
            try { if (this._dockCollider && this._dockCollider.destroy) this._dockCollider.destroy(); } catch (e) {}
            this._dockCollider = null;
            try { if (this._waterColliders && Array.isArray(this._waterColliders)) { for (const w of this._waterColliders) { try { if (w && w.destroy) w.destroy(); } catch (e) {} } } } catch (e) {}
            this._waterColliders = null;
            // cleanup water ripples
            try { if (this._waterRipples && Array.isArray(this._waterRipples)) { for (const r of this._waterRipples) { try { if (r && r.destroy) r.destroy(); } catch (e) {} } } } catch (e) {}
            this._waterRipples = null;
            // cleanup procedural ground floor
            try { if (this._groundFloor && this._groundFloor.destroy) this._groundFloor.destroy(); } catch (e) {}
            this._groundFloor = null;
            try { if (this._dockWater && this._dockWater.destroy) this._dockWater.destroy(); } catch (e) {}
            this._dockWater = null;
            if (this._keyHandlers && this.input && this.input.keyboard) {
                try {
                    if (this._keyHandlers.i) this.input.keyboard.off('keydown-I', this._keyHandlers.i);
                    if (this._keyHandlers.u) this.input.keyboard.off('keydown-U', this._keyHandlers.u);
                    if (this._keyHandlers.x) this.input.keyboard.off('keydown-X', this._keyHandlers.x);
                    if (this._keyHandlers.q) this.input.keyboard.off('keydown-Q', this._keyHandlers.q);
                    if (this._keyHandlers.t) this.input.keyboard.off('keydown-T', this._keyHandlers.t);
                    if (this._keyHandlers.m) this.input.keyboard.off('keydown-M', this._keyHandlers.m);
                } catch (e) { /* ignore key cleanup errors */ }
            }
        });

        // Wire a scene-local persist helper so code can call this._persistCharacter(username)
        // without duplicating persistence options. Persist fishing, inventory, flags and gold.
        try {
            this._persistCharacter = (username) => {
                try {
                        persistCharacter(this, username, {
                        includeLocation: true,
                        assignFields: ['fishing', 'inventory', 'flags', 'gold', 'lastLocation'],
                        onAfterSave: (scene) => {
                            try { if (scene._refreshInventoryModal) scene._refreshInventoryModal(); } catch (e) {}
                        },
                        logErrors: false
                    });
                } catch (e) {}
            };
        } catch (e) {}
    }

    _createBucket(x, y) {
        const bucket = {};
        bucket.x = x; bucket.y = y; bucket.r = 22;
        bucket.sprite = this.add.circle(x, y, bucket.r, 0x334455, 1).setDepth(1.2);
        bucket.prompt = this.add.text(x, y - 46, '[E] Open Bucket', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        bucket.prompt.setVisible(false);
        return bucket;
    }

    _createFishingNode(x, y) {
        const node = {};
        node.x = x; node.y = y; node.r = 26; node.label = 'Fishing Spot';
        node.sprite = this.add.circle(x, y, node.r, 0x2266aa, 1).setDepth(1.2);
        node.prompt = this.add.text(x, y - 60, `[E] Fish`, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        node.prompt.setVisible(false);
        return node;
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.2 });
        if (!movement) return;
        if (!this.fishingActive && !this._attacking) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });

        // show prompts for fishing node and bucket
        const px = this.player.x; const py = this.player.y;
        const fn = this.fishingNode; if (fn) {
            const castDist = this._getCastInteractDistance();
            const d = Phaser.Math.Distance.Between(px, py, fn.x, fn.y);
            fn.prompt.setVisible(d <= castDist);
            if (d <= castDist && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                // Use new active controller with hotspot context if present
                const hotspot = this._resolveNearbyHotspot(fn.x, fn.y);
                const timeOfDay = this._getTimeOfDay();
                if (this.fishingController) this.fishingController.tryInteract(fn, { hotspot, timeOfDay }); else this._openFishingModal();
            }
        }
        const b = this.baitBucket; if (b) {
            const d2 = Phaser.Math.Distance.Between(px, py, b.x, b.y);
            b.prompt.setVisible(d2 <= 56);
            if (d2 <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                this._openBucketShop();
            }
        }

        // Harborwright interaction
        const hw = this.harborwright; if (hw) {
            const d4 = Phaser.Math.Distance.Between(px, py, hw.x, hw.y);
            if (this.harborwrightPrompt) this.harborwrightPrompt.setVisible(d4 <= 56);
            if (d4 <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                try { this._openDockRepairOverlay(); } catch (e) { console.warn('dock repair overlay failed', e); }
            }
        }

        // Boat mooring (Stage >= 3)
        if (this.boatMooring && this.boatMooringPrompt) {
            const dB = Phaser.Math.Distance.Between(px, py, this.boatMooring.x, this.boatMooring.y);
            const show = (this.char?.flags?.dockStage || 0) >= 3;
            this.boatMooring.setVisible(show);
            this.boatMooringPrompt.setVisible(show && dB <= 56);
            if (show && dB <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                try { this._openBoatPanel(); } catch (e) { console.warn('boat panel failed', e); }
            }
        }

        // Event board (Stage >= 4)
        if (this.eventBoard && this.eventBoardPrompt) {
            const dE = Phaser.Math.Distance.Between(px, py, this.eventBoard.x, this.eventBoard.y);
            const showE = (this.char?.flags?.dockStage || 0) >= 4;
            this.eventBoard.setVisible(showE);
            this.eventBoardPrompt.setVisible(showE && dE <= 56);
            if (showE && dE <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                try { this._openEventBoard(); } catch (e) { console.warn('event board failed', e); }
            }
        }

        // Rusty rod pickup via interact key
        if (this.rustyRod && this.rustyRodPickup && !this.char.flags.rustyRodTaken) {
            const d3 = Phaser.Math.Distance.Between(px, py, this.rustyRod.x, this.rustyRod.y);
            if (this.rustyRodPrompt) this.rustyRodPrompt.setVisible(d3 <= 56);
            if (d3 <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                try { this.rustyRodPickup(); } catch (e) { console.warn('rusty pickup failed', e); }
            }
        }

        // Update new fishing controller
        try { if (this.fishingController && typeof this.fishingController.update === 'function') this.fishingController.update(time, delta); } catch(e) {}
    // Hotspot lifecycle update
    try { this._updateHotspots(delta); } catch(e) {}

    }

    _openBucketShop() {
        if (typeof document === 'undefined') return;
        this._ensureFishingUiStyles();
        if (this._bucketUi && typeof this._bucketUi.close === 'function') {
            try { this._bucketUi.close('reopen'); } catch (e) {}
        }

        const context = this._calculateFishingContext();
        const ui = this._buildBucketOverlay(context);
        this._bucketUi = ui;
        this._updateBucketOverlay(context);
    }

    _openFishingModal() { // retained for transition; may be removed later
        if (typeof document === 'undefined') return;
        this._ensureFishingUiStyles();
        if (this._fishingUi && typeof this._fishingUi.close === 'function') {
            try { this._fishingUi.close('reopen'); } catch (e) {}
        }

        const context = this._calculateFishingContext();
        const ui = this._buildFishingOverlay(context);
        this._fishingUi = ui;

        if (context && context.baitCatalog && context.baitCatalog.length) {
            const preferred = context.baitCatalog.find((entry) => entry.count > 0 && context.castableBaits[entry.id]);
            const fallback = context.baitCatalog[0];
            const chosen = preferred || fallback;
            if (chosen) this._fishingUi.selectedBait = chosen.id;
        }

        this._updateFishingOverlay(context);
    }

    // --- Hotspot Prototype (Phase 2 groundwork) ---
    _spawnHotspot() {
        if (!this._hotspots) this._hotspots = [];
        const waterTop = 0;
        const waterBottom = Math.round(this.scale.height * 0.5);
        // random x not overlapping dock central x band
        const dockX = this._dockVisual ? this._dockVisual.x : this.scale.width/2;
        const dockW = this._dockVisual ? this._dockVisual.width : 120;
        let x = Phaser.Math.Between(32, this.scale.width - 32);
        let tries = 0;
        while (x > dockX - dockW/2 - 32 && x < dockX + dockW/2 + 32 && tries < 8) { x = Phaser.Math.Between(32, this.scale.width - 32); tries++; }
        const y = Phaser.Math.Between(waterTop + 24, waterBottom - 24);
    // Base radius and adjust via mastery hotspotInsight (each rank +6% radius)
    const mastery = this._getFishingMastery && this._getFishingMastery();
    const insight = mastery && mastery.hotspotInsight ? mastery.hotspotInsight : 0;
    const radiusBase = Phaser.Math.Between(42, 68);
    const radius = Math.round(radiusBase * (1 + 0.06 * insight));
        const tagRoll = Math.random();
        const tag = tagRoll < 0.65 ? 'common_school' : (tagRoll < 0.9 ? 'mixed_swirl' : 'deep_epic');
        // Lifespan extended by hotspotInsight (each rank +10%)
        const lifespanBase = Phaser.Math.Between(12000, 22000);
        const lifespan = Math.round(lifespanBase * (1 + 0.10 * insight));
        const expiresAt = performance.now() + lifespan;
        const gfx = this.add.circle(x, y, radius, 0x6fb1ff, 0.18).setDepth(0.8);
        gfx.setStrokeStyle(2, 0x9dd6ff, 0.85);
        try { this.tweens.add({ targets: gfx, alpha: { from: 0.22, to: 0.06 }, scale: { from: 1, to: 1.08 }, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' }); } catch(e) {}
        const hotspot = { x, y, radius, tag, expiresAt, gfx };
        this._hotspots.push(hotspot);
    }

    _updateHotspots(delta) {
        const now = performance.now();
    if (!this._hotspots) this._hotspots = [];
    // If dock not repaired at least once, no hotspots yet
    const stage = (this.char && this.char.flags && this.char.flags.dockStage) || 0;
    if (stage < 1) return;
    // spawn logic: simple timer
        if (!this._nextHotspotAt) this._nextHotspotAt = now + 5000;
        if (now >= this._nextHotspotAt) {
            // limit simultaneous hotspots
            if (this._hotspots.length < 3) this._spawnHotspot();
            // faster spawn as dock improves (Stage 2+)
            let minDelay = 9000, maxDelay = 16000;
            if (stage >= 2) { minDelay = 7000; maxDelay = 12000; }
            if (stage >= 3) { minDelay = 5000; maxDelay = 10000; }
            if (stage >= 4) { minDelay = 4000; maxDelay = 8000; }
            // Mastery hotspotInsight also speeds spawn cadence slightly (each rank -6% delay)
            const mastery = this._getFishingMastery && this._getFishingMastery();
            const insight = mastery && mastery.hotspotInsight ? mastery.hotspotInsight : 0;
            const cadenceMult = Math.max(0.6, 1 - 0.06 * insight);
            minDelay = Math.round(minDelay * cadenceMult);
            maxDelay = Math.round(maxDelay * cadenceMult);
            this._nextHotspotAt = now + Phaser.Math.Between(minDelay, maxDelay);
        }
        // cleanup expired
        for (let i = this._hotspots.length - 1; i >= 0; i--) {
            const h = this._hotspots[i];
            if (now >= h.expiresAt) {
                try { h.gfx.destroy(); } catch(e) {}
                this._hotspots.splice(i,1);
            }
        }
    }

    _getCastInteractDistance() {
        const base = 56;
        const stage = (this.char && this.char.flags && this.char.flags.dockStage) || 0;
        return base + (stage >= 1 ? 16 : 0);
    }

    _getTimeOfDay() {
        try {
            const world = (typeof window !== 'undefined' && window.__world) ? window.__world : null;
            const tod = world && (world.timeOfDay || world.tod);
            if (tod === 'day' || tod === 'night') return tod;
        } catch (e) {}
        const hour = new Date().getHours();
        return (hour >= 6 && hour < 18) ? 'day' : 'night';
    }

    _resolveNearbyHotspot(x, y) {
        if (!this._hotspots || !this._hotspots.length) return null;
        for (const h of this._hotspots) {
            const d = Phaser.Math.Distance.Between(x, y, h.x, h.y);
            if (d <= h.radius) return h;
        }
        return null;
    }

    _ensureFishingUiStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('broken-dock-fishing-styles')) return;
        const style = document.createElement('style');
        style.id = 'broken-dock-fishing-styles';
        style.textContent = `
            .bdock-overlay {
                position: fixed;
                inset: 0;
                background: rgba(6, 12, 20, 0.72);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 265;
            }
            .bdock-modal {
                width: min(880px, 92vw);
                max-height: min(640px, 92vh);
                background: linear-gradient(180deg, rgba(18,27,41,0.96) 0%, rgba(12,18,28,0.96) 100%);
                border: 1px solid rgba(118, 190, 255, 0.22);
                border-radius: 18px;
                box-shadow: 0 28px 60px rgba(6, 10, 18, 0.6);
                display: flex;
                flex-direction: column;
                color: #e9f4ff;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                overflow: hidden;
            }
            .bdock-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 22px 14px 24px;
                border-bottom: 1px solid rgba(118, 190, 255, 0.18);
            }
            .bdock-title {
                font-size: 22px;
                font-weight: 700;
                letter-spacing: 0.4px;
            }
            .bdock-status {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.7);
                transition: color 160ms ease;
            }
            .bdock-status[data-tone="active"] { color: #7dd6ff; }
            .bdock-status[data-tone="warn"] { color: #ff8f7d; }
            .bdock-status[data-tone="ready"] { color: #86f5c4; }
            .bdock-mat-done { color:#86f5c4; font-weight:600; }
            .bdock-mat-missing { color:#ff8f7d; font-weight:600; }
            .bdock-mat-partial { color:#ffc877; font-weight:600; }
            .bdock-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                padding: 18px 24px 12px 24px;
            }
            .bdock-metric {
                padding: 14px 16px;
                border-radius: 12px;
                background: rgba(18, 30, 46, 0.92);
                border: 1px solid rgba(118, 190, 255, 0.12);
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .bdock-metric label {
                font-size: 12px;
                letter-spacing: 1.1px;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.58);
            }
            .bdock-metric-value {
                font-size: 18px;
                font-weight: 600;
                color: #f2f9ff;
            }
            .bdock-progress {
                position: relative;
                height: 6px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.08);
                overflow: hidden;
            }
            .bdock-progress-bar {
                position: absolute;
                inset: 0;
                width: 0%;
                background: linear-gradient(90deg, #70c3ff 0%, #c591ff 100%);
                border-radius: inherit;
                transition: width 220ms ease;
            }
            .bdock-progress-meta {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
            }
            .bdock-content {
                display: grid;
                grid-template-columns: 320px 1fr;
                gap: 20px;
                padding: 0 24px 20px 24px;
                overflow-y: auto;
                flex: 1;
            }
            @media (max-width: 1024px) {
                .bdock-content {
                    grid-template-columns: 1fr;
                }
            }
            .bdock-column {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .bdock-section {
                background: rgba(14, 22, 34, 0.9);
                border: 1px solid rgba(118, 190, 255, 0.12);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .bdock-section h3 {
                margin: 0;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1.4px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.72);
            }
            .bdock-bait-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 220px;
                overflow-y: auto;
            }
            .bdock-bait {
                width: 100%;
                border: 1px solid rgba(118, 190, 255, 0.14);
                background: rgba(12, 20, 32, 0.8);
                border-radius: 10px;
                padding: 10px 12px;
                text-align: left;
                color: #f0f6ff;
                transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .bdock-bait:hover {
                border-color: rgba(118, 190, 255, 0.3);
                transform: translateY(-1px);
            }
            .bdock-bait.selected {
                border-color: rgba(134, 245, 196, 0.7);
                background: rgba(22, 44, 36, 0.85);
            }
            .bdock-bait.is-empty {
                opacity: 0.55;
            }
            .bdock-bait-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 600;
                font-size: 14px;
            }
            .bdock-bait-count {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
            }
            .bdock-bait-desc {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
            }
            .bdock-forecast {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 260px;
                overflow-y: auto;
            }
            .bdock-forecast-empty {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.55);
                padding: 8px 0;
            }
            .bdock-forecast-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border-radius: 10px;
                background: rgba(10, 18, 30, 0.75);
                border: 1px solid rgba(118, 190, 255, 0.12);
            }
            .bdock-forecast-row.locked {
                opacity: 0.5;
            }
            .bdock-forecast-main {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .bdock-forecast-title {
                font-size: 14px;
                font-weight: 600;
            }
            .bdock-forecast-sub {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
            }
            .bdock-forecast-meta {
                text-align: right;
                font-size: 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                color: rgba(255, 255, 255, 0.65);
            }
            .bdock-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 24px 16px 24px;
                border-top: 1px solid rgba(118, 190, 255, 0.18);
                gap: 14px;
            }
            .bdock-footer-actions {
                display: flex;
                gap: 10px;
            }
            .bdock-btn {
                border: none;
                border-radius: 999px;
                padding: 10px 18px;
                font-weight: 600;
                letter-spacing: 0.4px;
                cursor: pointer;
                transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
            }
            .bdock-btn:disabled {
                opacity: 0.55;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            .bdock-btn.primary {
                background: linear-gradient(90deg, #5fb1ff 0%, #8f93ff 100%);
                color: #081120;
                box-shadow: 0 10px 22px rgba(95, 177, 255, 0.3);
            }
            .bdock-btn.primary:not(:disabled):hover {
                transform: translateY(-1px);
                box-shadow: 0 14px 26px rgba(95, 177, 255, 0.36);
            }
            .bdock-btn.outline {
                background: transparent;
                color: #bcd8ff;
                border: 1px solid rgba(118, 190, 255, 0.3);
            }
            .bdock-btn.ghost {
                background: rgba(16, 26, 40, 0.9);
                color: #bcd8ff;
            }
            .bdock-log {
                padding: 0 24px 20px 24px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 140px;
                overflow-y: auto;
            }
            .bdock-log-entry {
                font-size: 12px;
                padding: 8px 12px;
                border-radius: 10px;
                background: rgba(10, 20, 34, 0.82);
                border: 1px solid rgba(118, 190, 255, 0.12);
                color: rgba(232, 243, 255, 0.86);
                opacity: 0;
                transform: translateY(4px);
                transition: opacity 160ms ease, transform 160ms ease;
            }
            .bdock-log-entry.show {
                opacity: 1;
                transform: translateY(0);
            }
            .bdock-log-entry[data-tone="catch"] {
                border-color: rgba(134, 245, 196, 0.35);
                color: #bfffe0;
            }
            .bdock-log-entry[data-tone="fail"] {
                border-color: rgba(255, 140, 120, 0.28);
                color: #ffb0a1;
            }
            .bdock-modal.bdock-shop {
                max-width: min(900px, 94vw);
            }
            .bdock-shop .bdock-content {
                grid-template-columns: 320px 1fr;
            }
            .bdock-preview {
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-size: 13px;
                color: rgba(233, 244, 255, 0.86);
            }
            .bdock-preview-title {
                font-size: 16px;
                font-weight: 600;
                color: #f6fbff;
            }
            .bdock-preview-desc {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.72);
            }
            .bdock-preview-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.62);
            }
            .bdock-preview-meta span {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .bdock-preview-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .bdock-preview-list li {
                list-style: none;
                background: rgba(15, 24, 38, 0.85);
                border: 1px solid rgba(118, 190, 255, 0.1);
                border-radius: 8px;
                padding: 6px 8px;
                font-size: 12px;
                color: rgba(232, 243, 255, 0.85);
            }
            .bdock-quantity {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
            }
            .bdock-qty-btn {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: rgba(16, 26, 40, 0.9);
                border: 1px solid rgba(118, 190, 255, 0.28);
                color: #bcd8ff;
                font-weight: 600;
                cursor: pointer;
                transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
            }
            .bdock-qty-btn:hover {
                transform: translateY(-1px);
                border-color: rgba(118, 190, 255, 0.5);
            }
            .bdock-qty-input {
                width: 64px;
                padding: 6px 10px;
                border-radius: 999px;
                border: 1px solid rgba(118, 190, 255, 0.2);
                background: rgba(12, 20, 32, 0.82);
                color: #e9f4ff;
                text-align: center;
                font-weight: 600;
                font-size: 14px;
            }
            .bdock-shop .bdock-footer {
                align-items: flex-end;
            }
        `;
        document.head.appendChild(style);
    }

    _buildBucketOverlay(initialContext) {
        const overlay = document.createElement('div');
        overlay.className = 'bdock-overlay';
        const modal = document.createElement('section');
        modal.className = 'bdock-modal bdock-shop';
        modal.innerHTML = `
            <header class="bdock-header">
                <div>
                    <div class="bdock-title">Broken Dock · Bait Bucket</div>
                    <div class="bdock-status" data-role="status" data-tone="idle">Choose bait</div>
                </div>
                <button class="bdock-btn ghost" type="button" data-role="close">Close</button>
            </header>
            <section class="bdock-metrics">
                <div class="bdock-metric">
                    <label>Gold</label>
                    <div class="bdock-metric-value" data-role="gold">0g</div>
                    <div class="bdock-progress-meta" data-role="gold-note">Keep a stash for the docks.</div>
                </div>
                <div class="bdock-metric">
                    <label>Bait Bag</label>
                    <div class="bdock-metric-value" data-role="stock">0 items</div>
                    <div class="bdock-progress-meta" data-role="stock-note"></div>
                </div>
            </section>
            <div class="bdock-content">
                <div class="bdock-column">
                    <section class="bdock-section">
                        <h3>Available Bait</h3>
                        <div class="bdock-bait-list" data-role="bait-list"></div>
                    </section>
                </div>
                <div class="bdock-column">
                    <section class="bdock-section">
                        <h3>Bait Details</h3>
                        <div class="bdock-preview" data-role="preview">
                            <div class="bdock-progress-meta">Select a bait to inspect its perks.</div>
                        </div>
                    </section>
                    <section class="bdock-section">
                        <h3>Purchase</h3>
                        <div class="bdock-progress-meta" data-role="action-note">Choose bait to enable purchase.</div>
                        <div class="bdock-purchase">
                            <div class="bdock-progress-meta">Quantity</div>
                            <div class="bdock-quantity">
                                <button type="button" class="bdock-qty-btn" data-role="qty-dec">-</button>
                                <input type="number" class="bdock-qty-input" data-role="qty-input" value="1" min="1" max="999" />
                                <button type="button" class="bdock-qty-btn" data-role="qty-inc">+</button>
                            </div>
                            <div class="bdock-progress-meta" data-role="cost">Total Cost: 0g</div>
                        </div>
                    </section>
                </div>
            </div>
            <footer class="bdock-footer">
                <div class="bdock-progress-meta" data-role="footer-tip">Restock bait to keep the fish biting.</div>
                <div class="bdock-footer-actions">
                    <button class="bdock-btn primary" type="button" data-role="buy" disabled>Buy Bait</button>
                </div>
            </footer>
        `;
        overlay.appendChild(modal);
        this._registerOverlay(overlay);
        document.body.appendChild(overlay);

        const statusEl = modal.querySelector('[data-role="status"]');
        const buyBtn = modal.querySelector('[data-role="buy"]');
        const closeBtn = modal.querySelector('[data-role="close"]');
        const baitListEl = modal.querySelector('[data-role="bait-list"]');
        const previewEl = modal.querySelector('[data-role="preview"]');
        const actionNoteEl = modal.querySelector('[data-role="action-note"]');
        const costEl = modal.querySelector('[data-role="cost"]');
        const goldEl = modal.querySelector('[data-role="gold"]');
        const goldNoteEl = modal.querySelector('[data-role="gold-note"]');
        const stockEl = modal.querySelector('[data-role="stock"]');
        const stockNoteEl = modal.querySelector('[data-role="stock-note"]');
        const footerTipEl = modal.querySelector('[data-role="footer-tip"]');
        const qtyInput = modal.querySelector('[data-role="qty-input"]');
        const qtyInc = modal.querySelector('[data-role="qty-inc"]');
        const qtyDec = modal.querySelector('[data-role="qty-dec"]');

        const uiState = {
            overlay,
            modal,
            statusEl,
            buyBtn,
            closeBtn,
            baitListEl,
            previewEl,
            actionNoteEl,
            costEl,
            goldEl,
            goldNoteEl,
            stockEl,
            stockNoteEl,
            footerTipEl,
            qtyInput,
            qtyInc,
            qtyDec,
            selectedBait: null,
            qty: 1,
            listeners: [],
            renderBaits: null
        };

        const handleKey = (evt) => {
            if (evt.key === 'Escape') {
                evt.preventDefault();
                uiState.close('escape');
            }
        };
    const offDocKey = addDocumentListener(this, 'keydown', handleKey);

        const handleOverlayClick = (evt) => {
            if (evt.target === overlay) uiState.close('dismiss');
        };
    overlay.addEventListener('click', handleOverlayClick);

        uiState.close = (reason = 'closed') => {
            for (const off of uiState.listeners.splice(0)) {
                try { off(); } catch (e) {}
            }
            try { this._removeOverlay(overlay); } catch (e) {}
            if (this._bucketUi === uiState) this._bucketUi = null;
        };

        const onCloseClick = () => uiState.close('close-button');
        closeBtn.addEventListener('click', onCloseClick);

        const applyQuantity = (value) => {
            const parsed = Number(value);
            const clamped = Math.max(1, Math.min(999, Number.isFinite(parsed) ? Math.floor(parsed) : 1));
            if (uiState.qty !== clamped) uiState.qty = clamped;
            if (qtyInput && Number(qtyInput.value) !== clamped) qtyInput.value = String(clamped);
            this._updateBucketOverlay(this._calculateFishingContext());
        };

        const onQtyInc = () => applyQuantity(uiState.qty + 1);
        const onQtyDec = () => applyQuantity(uiState.qty - 1);
        const onQtyInput = () => applyQuantity(qtyInput.value);
        if (qtyInc) qtyInc.addEventListener('click', onQtyInc);
        if (qtyDec) qtyDec.addEventListener('click', onQtyDec);
        if (qtyInput) qtyInput.addEventListener('input', onQtyInput);

        const onBaitClick = (evt) => {
            const btn = evt.target.closest('.bdock-bait');
            if (!btn || !uiState.baitListEl.contains(btn)) return;
            const baitId = btn.dataset.baitId;
            if (!baitId) return;
            uiState.selectedBait = baitId;
            uiState.qty = 1;
            if (qtyInput) qtyInput.value = '1';
            this._setBucketUiStatus(`Selected ${btn.dataset.baitName || baitId}`, 'ready', uiState);
            this._updateBucketOverlay(this._calculateFishingContext());
        };
        baitListEl.addEventListener('click', onBaitClick);

        const attemptPurchase = () => {
            const baitId = uiState.selectedBait;
            if (!baitId) return;
            const qty = Math.max(1, Math.min(999, uiState.qty || 1));
            const snapshot = this._calculateFishingContext();
            const def = snapshot && snapshot.defs ? snapshot.defs[baitId] : null;
            if (!def) {
                this._setBucketUiStatus('Bait data missing.', 'warn', uiState);
                return;
            }
            const unitPrice = Number(def.value || 0);
            const totalCost = Math.max(0, Math.round(unitPrice * qty));
            const gold = snapshot.gold || 0;
            if (totalCost > gold) {
                this._setBucketUiStatus('Not enough gold.', 'warn', uiState);
                this._showToast && this._showToast('Not enough gold');
                return;
            }
            if (!this.char) this.char = {};
            this.char.gold = gold - totalCost;
            this._addItemToInventory(baitId, qty);
            this._showToast && this._showToast(`Bought ${qty} ${def.name}${qty > 1 ? 's' : ''}`);
            const updated = this._calculateFishingContext();
            this._setBucketUiStatus(`Purchased ${qty} ${def.name}`, 'ready', uiState);
            this._updateBucketOverlay(updated);
        };
        buyBtn.addEventListener('click', attemptPurchase);

        uiState.renderBaits = (context) => {
            const list = uiState.baitListEl;
            if (!list) return;
            const scrollTop = list.scrollTop;
            list.innerHTML = '';
            if (!context || !context.baitCatalog || !context.baitCatalog.length) {
                const empty = document.createElement('div');
                empty.className = 'bdock-progress-meta';
                empty.textContent = 'No bait available from the data table.';
                list.appendChild(empty);
                return;
            }
            for (const entry of context.baitCatalog) {
                const def = entry.def || {};
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'bdock-bait';
                btn.dataset.baitId = entry.id;
                btn.dataset.baitName = def.name || entry.id;
                if (!entry.count) btn.classList.add('is-empty');
                if (uiState.selectedBait === entry.id) btn.classList.add('selected');
                const price = Number(def.value || 0);
                btn.innerHTML = `
                    <div class="bdock-bait-head">
                        <span>${def.name || entry.id}</span>
                        <span class="bdock-bait-count">${entry.count || 0}x</span>
                    </div>
                    <div class="bdock-bait-desc">${def.description || ''}</div>
                    <div class="bdock-progress-meta">Price: ${price}g</div>
                `;
                list.appendChild(btn);
            }
            list.scrollTop = scrollTop;
        };

    uiState.listeners.push(() => { try { offDocKey && offDocKey(); } catch (e) {} });
        uiState.listeners.push(() => overlay.removeEventListener('click', handleOverlayClick));
        uiState.listeners.push(() => closeBtn.removeEventListener('click', onCloseClick));
        uiState.listeners.push(() => baitListEl.removeEventListener('click', onBaitClick));
        uiState.listeners.push(() => buyBtn.removeEventListener('click', attemptPurchase));
        if (qtyInc) uiState.listeners.push(() => qtyInc.removeEventListener('click', onQtyInc));
        if (qtyDec) uiState.listeners.push(() => qtyDec.removeEventListener('click', onQtyDec));
        if (qtyInput) uiState.listeners.push(() => qtyInput.removeEventListener('input', onQtyInput));

        return uiState;
    }

    _updateBucketOverlay(context) {
        if (!this._bucketUi) return;
        const ui = this._bucketUi;
        context = context || this._calculateFishingContext();
        if (!context) return;

        if (ui.renderBaits) ui.renderBaits(context);

        const defs = context.defs || {};
        const gold = context.gold || 0;
        const totalBait = context.totalBaitCount || 0;

        if (ui.goldEl) ui.goldEl.textContent = `${gold}g`;
        if (ui.goldNoteEl) ui.goldNoteEl.textContent = gold < 25 ? 'Fishers whisper about low coffers.' : 'Healthy purse keeps lines in the water.';
        if (ui.stockEl) ui.stockEl.textContent = `${totalBait} bait${totalBait === 1 ? '' : 's'}`;
        if (ui.stockNoteEl) ui.stockNoteEl.textContent = context.baitCatalog && context.baitCatalog.length
            ? `${context.baitCatalog.length} bait types unlocked`
            : 'Discover or buy bait to expand your kit.';

        if (ui.footerTipEl) ui.footerTipEl.textContent = context.baitCatalog && context.baitCatalog.length
            ? 'Tip: diversify bait to unlock rarer catches.'
            : 'Tip: visit other vendors to uncover new bait blueprints.';

        if (ui.qtyInput) {
            const value = Number(ui.qtyInput.value);
            if (!Number.isFinite(value) || value < 1) ui.qtyInput.value = String(ui.qty || 1);
        }

        if (!ui.selectedBait || !defs[ui.selectedBait]) {
            ui.selectedBait = null;
        }

        const baitId = ui.selectedBait;
        const baitDef = baitId ? defs[baitId] : null;
        const price = baitDef ? Number(baitDef.value || 0) : 0;
        const qty = Math.max(1, Math.min(999, ui.qty || 1));
        ui.qty = qty;
        if (ui.qtyInput && Number(ui.qtyInput.value) !== qty) ui.qtyInput.value = String(qty);

        const totalCost = Math.max(0, Math.round(price * qty));
        if (ui.costEl) ui.costEl.textContent = `Total Cost: ${totalCost}g`;

        const pool = baitId ? (context.catchPools[baitId] || { available: [], locked: [] }) : null;

        if (ui.previewEl) {
            if (!baitDef) {
                ui.previewEl.innerHTML = `<div class="bdock-progress-meta">Select a bait to inspect its perks.</div>`;
            } else {
                const available = pool && pool.available ? pool.available.slice(0, 4) : [];
                const locked = pool && pool.locked ? pool.locked.slice(0, 3) : [];
                const availableList = available.map(f => `<li><strong style="color:${FISHING_RARITY_COLORS[f.rarity] || '#f0f6ff'};">${f.name}</strong> · ${(f.rarity || 'common').toUpperCase()}</li>`).join('');
                const lockedList = locked.length ? `<div class="bdock-progress-meta">Locked until better rods:</div><ul class="bdock-preview-list">${locked.map(f => `<li>${f.name} · ${(f.minRodRarity || 'rare').toUpperCase()}</li>`).join('')}</ul>` : '';
                ui.previewEl.innerHTML = `
                    <div class="bdock-preview-title">${baitDef.name || baitId}</div>
                    <div class="bdock-preview-desc">${baitDef.description || 'No description provided.'}</div>
                    <div class="bdock-preview-meta">
                        <span>Price: ${price}g</span>
                        <span>Owned: ${context.baitCounts[baitId] || 0}</span>
                    </div>
                    ${available.length ? `<div class="bdock-progress-meta">Fish drawn to this bait:</div><ul class="bdock-preview-list">${availableList}</ul>` : `<div class="bdock-progress-meta">No fish currently hook with this bait and rod tier.</div>`}
                    ${lockedList}
                `;
            }
        }

        const canBuy = !!(baitDef && (price === 0 || totalCost <= gold));
        if (ui.buyBtn) ui.buyBtn.disabled = !canBuy;
        if (ui.actionNoteEl) {
            if (!baitDef) ui.actionNoteEl.textContent = 'Choose bait to enable purchase.';
            else if (!canBuy) ui.actionNoteEl.textContent = 'Not enough gold for that quantity.';
            else ui.actionNoteEl.textContent = 'Ready to purchase.';
        }

        if (ui.baitListEl) {
            for (const btn of ui.baitListEl.querySelectorAll('.bdock-bait')) {
                const id = btn.dataset.baitId;
                const count = context.baitCounts[id] || 0;
                const countEl = btn.querySelector('.bdock-bait-count');
                if (countEl) countEl.textContent = `${count}x`;
                btn.classList.toggle('is-empty', count === 0);
                btn.classList.toggle('selected', baitId === id);
            }
        }
    }

    _setBucketUiStatus(text, tone = 'idle', uiOverride = null) {
        const ui = uiOverride || this._bucketUi;
        if (!ui || !ui.statusEl) return;
        ui.statusEl.textContent = text;
        ui.statusEl.dataset.tone = tone;
    }

    _buildFishingOverlay(initialContext) {
        const overlay = document.createElement('div');
        overlay.className = 'bdock-overlay';
        const modal = document.createElement('section');
        modal.className = 'bdock-modal';
        modal.innerHTML = `
            <header class="bdock-header">
                <div>
                    <div class="bdock-title">Broken Dock · Fishing</div>
                    <div class="bdock-status" data-role="status" data-tone="idle">Idle</div>
                </div>
                <button class="bdock-btn ghost" type="button" data-role="close">Close</button>
            </header>
            <section class="bdock-metrics">
                <div class="bdock-metric">
                    <label>Fishing Skill</label>
                    <div class="bdock-metric-value" data-role="level">Lv 1</div>
                    <div class="bdock-progress"><div class="bdock-progress-bar" data-role="xp-bar" style="width:0%;"></div></div>
                    <div class="bdock-progress-meta" data-role="xp-text">0 / 100 XP</div>
                </div>
                <div class="bdock-metric">
                    <label>Rod</label>
                    <div class="bdock-metric-value" data-role="rod-name">None Equipped</div>
                    <div class="bdock-progress-meta" data-role="rod-meta"></div>
                    <div class="bdock-progress-meta" data-role="rod-warning"></div>
                    <div class="bdock-progress-meta" data-role="rod-stats"></div>
                </div>
                <div class="bdock-metric">
                    <label>Tempo</label>
                    <div class="bdock-metric-value" data-role="speed">3.0s / cast</div>
                    <div class="bdock-progress-meta" data-role="hook">Hook chance: --</div>
                    <div class="bdock-progress-meta" data-role="skill">Effective skill: --</div>
                </div>
            </section>
            <div class="bdock-content">
                <div class="bdock-column">
                    <section class="bdock-section">
                        <h3>Bait Bag</h3>
                        <div class="bdock-bait-list" data-role="bait-list"></div>
                        <div class="bdock-progress-meta">Select bait to preview catch odds. Casting consumes 1 bait per attempt.</div>
                    </section>
                    <section class="bdock-section">
                        <h3>Action</h3>
                        <div class="bdock-progress-meta" data-role="action-note">Choose bait to begin.</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button class="bdock-btn ghost" type="button" data-role="bucket">Restock (Bucket)</button>
                        </div>
                    </section>
                </div>
                <div class="bdock-column">
                    <section class="bdock-section">
                        <h3>Catch Forecast</h3>
                        <div class="bdock-forecast" data-role="forecast"></div>
                    </section>
                </div>
            </div>
            <footer class="bdock-footer">
                <div class="bdock-progress-meta" data-role="footer-tip">Move to interrupt. Different rods unlock rarer fish.</div>
                <div class="bdock-footer-actions">
                    <button class="bdock-btn primary" type="button" data-role="cast" disabled>Cast & Auto</button>
                    <button class="bdock-btn outline" type="button" data-role="stop" disabled>Stop</button>
                </div>
            </footer>
            <section class="bdock-log" data-role="log"></section>
        `;
        overlay.appendChild(modal);
        this._registerOverlay(overlay);
        document.body.appendChild(overlay);

        const statusEl = modal.querySelector('[data-role="status"]');
        const castBtn = modal.querySelector('[data-role="cast"]');
        const stopBtn = modal.querySelector('[data-role="stop"]');
        const bucketBtn = modal.querySelector('[data-role="bucket"]');
        const closeBtn = modal.querySelector('[data-role="close"]');
        const baitListEl = modal.querySelector('[data-role="bait-list"]');
        const forecastEl = modal.querySelector('[data-role="forecast"]');
        const logEl = modal.querySelector('[data-role="log"]');

        const uiState = {
            overlay,
            modal,
            statusEl,
            castBtn,
            stopBtn,
            bucketBtn,
            closeBtn,
            baitListEl,
            forecastEl,
            logEl,
            levelEl: modal.querySelector('[data-role="level"]'),
            xpBar: modal.querySelector('[data-role="xp-bar"]'),
            xpText: modal.querySelector('[data-role="xp-text"]'),
            rodNameEl: modal.querySelector('[data-role="rod-name"]'),
            rodMetaEl: modal.querySelector('[data-role="rod-meta"]'),
            rodWarningEl: modal.querySelector('[data-role="rod-warning"]'),
            rodStatsEl: modal.querySelector('[data-role="rod-stats"]'),
            speedEl: modal.querySelector('[data-role="speed"]'),
            hookEl: modal.querySelector('[data-role="hook"]'),
            skillEl: modal.querySelector('[data-role="skill"]'),
            actionNoteEl: modal.querySelector('[data-role="action-note"]'),
            footerTipEl: modal.querySelector('[data-role="footer-tip"]'),
            selectedBait: null,
            listeners: [],
            renderBaits: null
        };

        const handleKey = (evt) => {
            if (evt.key === 'Escape') {
                evt.preventDefault();
                uiState.close('escape');
            }
        };
    const offDocKey = addDocumentListener(this, 'keydown', handleKey);

        const handleOverlayClick = (evt) => {
            if (evt.target === overlay) uiState.close('dismiss');
        };
    overlay.addEventListener('click', handleOverlayClick);

        uiState.close = (reason = 'closed') => {
            if (this.fishingActive) {
                try { this._stopFishingLoop(reason); } catch (e) {}
            }
            for (const off of uiState.listeners.splice(0)) {
                try { off(); } catch (e) {}
            }
            try { this._removeOverlay(overlay); } catch (e) {}
            if (this._fishingUi === uiState) this._fishingUi = null;
        };

        const onCloseClick = () => uiState.close('close-button');
        closeBtn.addEventListener('click', onCloseClick);

        const onBucketClick = () => {
            try { this._openBucketShop(); } catch (e) { console.warn('Bucket shop failed', e); }
            setTimeout(() => {
                if (this._fishingUi === uiState) this._updateFishingOverlay(this._calculateFishingContext());
            }, 240);
        };
        bucketBtn.addEventListener('click', onBucketClick);

        const onBaitClick = (evt) => {
            const btn = evt.target.closest('.bdock-bait');
            if (!btn || !uiState.baitListEl.contains(btn)) return;
            const baitId = btn.dataset.baitId;
            if (!baitId) return;
            const context = this._calculateFishingContext();
            uiState.selectedBait = baitId;
            const count = context.baitCounts[baitId] || 0;
            const name = btn.dataset.baitName || baitId;
            this._setFishingUiStatus(`Selected ${name}`, count > 0 ? 'ready' : 'warn', uiState);
            this._updateFishingOverlay(context);
        };
        baitListEl.addEventListener('click', onBaitClick);

        uiState.renderBaits = (context) => {
            const list = uiState.baitListEl;
            if (!list) return;
            const scrollTop = list.scrollTop;
            list.innerHTML = '';
            if (!context || !context.baitCatalog || !context.baitCatalog.length) {
                const empty = document.createElement('div');
                empty.className = 'bdock-progress-meta';
                empty.textContent = 'No bait in your bag. Restock at the bucket.';
                list.appendChild(empty);
                return;
            }
            for (const entry of context.baitCatalog) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'bdock-bait';
                btn.dataset.baitId = entry.id;
                btn.dataset.baitName = entry.def.name || entry.id;
                if (!entry.count) btn.classList.add('is-empty');
                btn.innerHTML = `
                    <div class="bdock-bait-head">
                        <span>${entry.def.name}</span>
                        <span class="bdock-bait-count" data-role="bait-count">${entry.count}x</span>
                    </div>
                    <div class="bdock-bait-desc">${entry.def.description || ''}</div>
                `;
                list.appendChild(btn);
            }
            list.scrollTop = scrollTop;
        };

        uiState.renderBaits(initialContext || null);

        const onCastClick = () => {
            if (this.fishingActive) return;
            const baitId = uiState.selectedBait;
            if (!baitId) { this._showToast && this._showToast('Select bait first'); return; }
            const attempt = this._createFishingAttempt(baitId, {
                onOutOfBait: () => {
                    this._setFishingUiStatus('Out of bait', 'warn', uiState);
                    this._appendFishingLog('Ran out of bait.', 'warn', uiState);
                },
                onNoTargets: () => {
                    this._setFishingUiStatus('Rod tier too low for this bait', 'warn', uiState);
                    this._appendFishingLog('Rod cannot hook anything with this bait.', 'warn', uiState);
                },
                onFail: ({ remainingBait }) => {
                    this._appendFishingLog('No bite (+1xp)', 'fail', uiState);
                    if (typeof remainingBait === 'number') this._setFishingUiStatus(`Waiting... ${remainingBait} bait left`, 'active', uiState);
                },
                onCatch: ({ fish, xpGain, remainingBait }) => {
                    this._appendFishingLog(`Caught ${fish.name} · +${xpGain}xp`, 'catch', uiState);
                    if (typeof remainingBait === 'number') this._setFishingUiStatus(`Reeling in... ${remainingBait} bait left`, 'active', uiState);
                },
                onAfterAttempt: (ctx) => {
                    if (this._fishingUi === uiState) this._updateFishingOverlay(ctx);
                }
            });
            this._startFishingLoop(baitId, attempt, {
                onStart: () => {
                    this._setFishingUiStatus('Casting...', 'active', uiState);
                    castBtn.disabled = true;
                    stopBtn.disabled = false;
                },
                onStop: (reason) => {
                    this._setFishingUiStatus(reason === 'moved' ? 'Interrupted' : 'Idle', reason === 'moved' ? 'warn' : 'idle', uiState);
                    stopBtn.disabled = true;
                    if (this._fishingUi === uiState) this._updateFishingOverlay(this._calculateFishingContext());
                },
                onBeforeRepeat: () => {
                    this._setFishingUiStatus('Waiting for a bite...', 'active', uiState);
                }
            });
        };
        castBtn.addEventListener('click', onCastClick);

        const onStopClick = () => this._stopFishingLoop('manual');
        stopBtn.addEventListener('click', onStopClick);

    uiState.listeners.push(() => { try { offDocKey && offDocKey(); } catch (e) {} });
        uiState.listeners.push(() => overlay.removeEventListener('click', handleOverlayClick));
        uiState.listeners.push(() => closeBtn.removeEventListener('click', onCloseClick));
        uiState.listeners.push(() => bucketBtn.removeEventListener('click', onBucketClick));
        uiState.listeners.push(() => baitListEl.removeEventListener('click', onBaitClick));
        uiState.listeners.push(() => castBtn.removeEventListener('click', onCastClick));
        uiState.listeners.push(() => stopBtn.removeEventListener('click', onStopClick));

        return uiState;
    }

    _updateFishingOverlay(context) {
        if (!this._fishingUi) return;
        const ui = this._fishingUi;
        context = context || this._calculateFishingContext();
        if (!context) return;

        if (ui.renderBaits) ui.renderBaits(context);

        if (!ui.selectedBait && context.baitCatalog && context.baitCatalog.length) {
            const preferred = context.baitCatalog.find((entry) => entry.count > 0 && context.castableBaits[entry.id]);
            const fallback = context.baitCatalog[0];
            const chosen = preferred || fallback;
            if (chosen) ui.selectedBait = chosen.id;
        }

        const fishing = context.fishing;
        const xpPct = fishing && fishing.expToLevel ? Math.max(0, Math.min(100, Math.round((fishing.exp || 0) / Math.max(1, fishing.expToLevel) * 100))) : 0;
        if (ui.levelEl) ui.levelEl.textContent = `Lv ${(fishing && fishing.level) || 1}`;
        if (ui.xpText) ui.xpText.textContent = `${(fishing && fishing.exp) || 0} / ${(fishing && fishing.expToLevel) || 100} XP`;
        if (ui.xpBar) ui.xpBar.style.width = `${xpPct}%`;

        if (ui.rodNameEl) ui.rodNameEl.textContent = context.rodName || 'None Equipped';
        if (ui.rodMetaEl) ui.rodMetaEl.textContent = context.rodMeta || '';
        if (ui.rodStatsEl) {
            const stats = context.rodStats || {};
            const ft = context.derivedFailTol != null ? context.derivedFailTol : 6;
            const hasAny = (stats.control||stats.sensitivity||stats.precision||stats.stability);
            ui.rodStatsEl.innerHTML = hasAny ? `
                <span style="display:inline-block;margin-right:8px;">Ctrl: <strong>${stats.control||0}</strong></span>
                <span style="display:inline-block;margin-right:8px;">Sens: <strong>${stats.sensitivity||0}</strong></span>
                <span style="display:inline-block;margin-right:8px;">Prec: <strong>${stats.precision||0}</strong></span>
                <span style="display:inline-block;margin-right:8px;">Stab: <strong>${stats.stability||0}</strong></span>
                <span style="display:inline-block;">Fail Tol: <strong>${ft}</strong></span>
            ` : '';
        }
        if (ui.rodWarningEl) {
            ui.rodWarningEl.textContent = context.rodWarning || '';
            ui.rodWarningEl.style.color = context.rodWarning ? '#ff9d8c' : 'rgba(255,255,255,0.55)';
        }

        if (ui.speedEl) ui.speedEl.textContent = `${(context.intervalMs / 1000).toFixed(2)}s / cast`;
        if (ui.skillEl) ui.skillEl.textContent = `Effective skill: ${context.effectiveSkill}`;

        const tip = context.hasRod ? 'Move to interrupt. Different rods unlock rarer fish.' : 'Equip a fishing rod to start fishing.';
        if (ui.footerTipEl) ui.footerTipEl.textContent = tip;

        if (ui.baitListEl) {
            for (const btn of ui.baitListEl.querySelectorAll('.bdock-bait')) {
                const id = btn.dataset.baitId;
                const count = context.baitCounts[id] || 0;
                const countEl = btn.querySelector('[data-role="bait-count"]');
                if (countEl) countEl.textContent = `${count}x`;
                btn.classList.toggle('is-empty', count === 0);
                btn.classList.toggle('selected', ui.selectedBait === id);
            }
        }

        let hookText = '--';
        let actionNote = 'Choose bait to begin.';
        if (ui.selectedBait) {
            const forecast = this._updateFishingForecast(ui.selectedBait, context, ui);
            hookText = forecast.hookText;
            actionNote = forecast.actionNote;
        } else {
            this._updateFishingForecast(null, context, ui);
        }

        if (ui.hookEl) ui.hookEl.textContent = `Hook chance: ${hookText}`;
        if (ui.actionNoteEl) ui.actionNoteEl.textContent = actionNote;

        if (ui.castBtn) {
            const canCast = !!(ui.selectedBait &&
                context.hasRod &&
                context.baitCounts[ui.selectedBait] > 0 &&
                context.castableBaits[ui.selectedBait] &&
                !this.fishingActive);
            ui.castBtn.disabled = !canCast;
        }
        if (ui.stopBtn) ui.stopBtn.disabled = !this.fishingActive;
    }

    _updateFishingForecast(baitId, context, uiOverride = null) {
        const ui = uiOverride || this._fishingUi;
        if (!ui || !ui.forecastEl) return { hookText: '--', actionNote: 'Choose bait to begin.' };
        context = context || this._calculateFishingContext();
        const forecastEl = ui.forecastEl;
        forecastEl.innerHTML = '';
        if (!baitId || !context.catchPools[baitId]) {
            const placeholder = document.createElement('div');
            placeholder.className = 'bdock-forecast-empty';
            placeholder.textContent = 'Select bait to preview catch odds.';
            forecastEl.appendChild(placeholder);
            return { hookText: '--', actionNote: 'Choose bait to begin.' };
        }

        const pool = context.catchPools[baitId];
        const math = this._computeFishingMath(context, pool.available, baitId);
        const hookPct = math ? Math.round(math.hookChance * 100) : 0;
        const actionNote = context.baitCounts[baitId] > 0
            ? (context.castableBaits[baitId] ? `Ready: ${context.baitCounts[baitId]} bait on hand.` : 'Your rod cannot hook fish with this bait.')
            : 'Restock this bait to cast.';

        if (!pool.available.length) {
            const msg = document.createElement('div');
            msg.className = 'bdock-forecast-empty';
            msg.textContent = 'Your current rod cannot hook anything with this bait.';
            forecastEl.appendChild(msg);
        } else {
            for (const entry of pool.available) {
                const row = document.createElement('div');
                row.className = 'bdock-forecast-row';
                const color = FISHING_RARITY_COLORS[entry.rarity] || '#f0f6ff';
                const share = math && math.weightsMap ? Math.max(1, Math.round((math.weightsMap[entry.id] || 0) * 100)) : 0;
                row.innerHTML = `
                    <div class="bdock-forecast-main">
                        <div class="bdock-forecast-title" style="color:${color};">${entry.name}</div>
                        <div class="bdock-forecast-sub">${(entry.rarity || 'common').toUpperCase()} · Diff ${entry.difficulty || 10}</div>
                    </div>
                    <div class="bdock-forecast-meta">
                        <span>${share}% of catches</span>
                        <span>XP ~ ${Math.max(1, Math.round(((entry.difficulty || 0) + (entry.baseValue || entry.value || 0)) * 1.5))}</span>
                    </div>
                `;
                forecastEl.appendChild(row);
            }
        }

        if (pool.locked && pool.locked.length) {
            const lockedTitle = document.createElement('div');
            lockedTitle.className = 'bdock-forecast-empty';
            lockedTitle.textContent = 'Locked (needs better rod):';
            forecastEl.appendChild(lockedTitle);
            for (const entry of pool.locked) {
                const row = document.createElement('div');
                row.className = 'bdock-forecast-row locked';
                row.innerHTML = `
                    <div class="bdock-forecast-main">
                        <div class="bdock-forecast-title">${entry.name}</div>
                        <div class="bdock-forecast-sub">${(entry.rarity || 'common').toUpperCase()} · Diff ${entry.difficulty || 10}</div>
                    </div>
                    <div class="bdock-forecast-meta">
                        <span>Needs ${entry.minRodRarity || 'better'} rod</span>
                    </div>
                `;
                forecastEl.appendChild(row);
            }
        }

        return { hookText: `${hookPct}%`, actionNote };
    }

    _setFishingUiStatus(text, tone = 'idle', uiOverride = null) {
        const ui = uiOverride || this._fishingUi;
        if (!ui || !ui.statusEl) return;
        ui.statusEl.textContent = text;
        ui.statusEl.dataset.tone = tone;
    }

    _appendFishingLog(text, tone = 'info', uiOverride = null) {
        const ui = uiOverride || this._fishingUi;
        if (!ui || !ui.logEl) return;
        const entry = document.createElement('div');
        entry.className = 'bdock-log-entry';
        entry.dataset.tone = tone === 'warn' ? 'fail' : tone;
        entry.textContent = text;
        ui.logEl.prepend(entry);
        requestAnimationFrame(() => entry.classList.add('show'));
        while (ui.logEl.childElementCount > 7) ui.logEl.removeChild(ui.logEl.lastElementChild);
    }

    _calculateFishingContext() {
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const fishingDefs = (window && window.FISHING_DEFS) ? window.FISHING_DEFS : FISHING_DEFS;
        const char = this.char || {};
        const equipment = char.equipment || {};
        const fishing = this.char.fishing = this.char.fishing || { level: 1, exp: 0, expToLevel: 100 };

        const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
            ? window.__shared_ui.stats.effectiveStats(char)
            : null;

        const luk = (eff && typeof eff.luk === 'number') ? eff.luk : ((char.stats && char.stats.luk) || 0);
        const baseFishingSkill = (eff && typeof eff.fishingSkill === 'number') ? eff.fishingSkill : (fishing.level || 1);

        const rod = equipment.fishing || null;
        const rodId = rod && rod.id ? rod.id : null;
        const rodDef = rodId && defs[rodId] ? defs[rodId] : null;
        const rodName = (rodDef && rodDef.name) || (rod && rod.name) || 'None Equipped';
        const rodRarity = (rodDef && rodDef.rarity) || (rod && rod.rarity) || null;
        const rodRank = rodRarity && FISHING_RARITY_RANK[rodRarity] != null ? FISHING_RARITY_RANK[rodRarity] : -1;
        const rodSkillBonus = rodDef && rodDef.fishingBonus && typeof rodDef.fishingBonus.skill === 'number'
            ? rodDef.fishingBonus.skill
            : ((rod && rod.fishingBonus && rod.fishingBonus.skill) ? rod.fishingBonus.skill : 0);
        const rodSpeedReduction = rodDef && rodDef.fishingBonus && typeof rodDef.fishingBonus.speedReductionMs === 'number'
            ? rodDef.fishingBonus.speedReductionMs
            : ((rod && rod.fishingBonus && rod.fishingBonus.speedReductionMs) ? rod.fishingBonus.speedReductionMs : 0);

        // New schema stats (control/sensitivity/precision/stability)
        const rodStats = (rodDef && rodDef.fishingStats) || (rod && rod.fishingStats) || {};
        const rsControl = Math.max(0, rodStats.control || 0);
        const rsSensitivity = Math.max(0, rodStats.sensitivity || 0);
        const rsPrecision = Math.max(0, rodStats.precision || 0);
        const rsStability = Math.max(0, rodStats.stability || 0);
        const sensitivityWaitMult = Math.max(0.6, 1 - 0.03 * rsSensitivity);
        const derivedFailTol = 6 + Math.floor(rsStability / 2);

        const effectiveSkill = Math.max(0, Math.floor(baseFishingSkill + rodSkillBonus + Math.floor(luk * 0.2)));
        // Interval: base reduced by luck, scaled by sensitivity, then apply legacy speed reduction
        let intervalMs = Math.max(600, Math.round((this.fishingIntervalMs - (luk * 8)) * sensitivityWaitMult - rodSpeedReduction));
        // Apply gatherSpeed talent modifiers
        try {
            if (eff && (eff.gatherSpeedBonusPercent || eff.gatherSpeedFlatBonus)) {
                const flatBonus = Number(eff.gatherSpeedFlatBonus || 0);
                const pctBonus = Number(eff.gatherSpeedBonusPercent || 0);
                // Flat bonus reduces ms (negative = faster), percent bonus reduces duration
                intervalMs = Math.max(200, Math.round((intervalMs - flatBonus) / (1 + (pctBonus / 100))));
            }
        } catch (e) {}

        const gold = (char && typeof char.gold === 'number') ? Math.max(0, Math.floor(char.gold)) : 0;

        const inv = Array.isArray(char.inventory) ? char.inventory : [];
        const flatInv = (window && window.__shared_ui && window.__shared_ui.initSlots)
            ? window.__shared_ui.initSlots(inv)
            : inv.slice();

        const baitDefs = Object.keys(defs)
            .filter((id) => id && id.toLowerCase().includes('_bait'))
            .map((id) => ({ id, def: defs[id] }))
            .filter((entry) => entry.def);
        const baitIds = new Set(baitDefs.map((entry) => entry.id));

        const baitCounts = {};
        for (const item of flatInv) {
            if (!item || !item.id) continue;
            if (baitIds.has(item.id)) baitCounts[item.id] = (baitCounts[item.id] || 0) + (item.qty || 1);
        }

        const catchPools = {};
        const castableBaits = {};
        for (const id of baitIds) {
            catchPools[id] = { available: [], locked: [] };
        }

        for (const fish of Object.values(fishingDefs)) {
            if (!fish || !Array.isArray(fish.allowedBaits)) continue;
            for (const baitId of fish.allowedBaits) {
                if (!catchPools[baitId]) catchPools[baitId] = { available: [], locked: [] };
                const requiredRank = fish.minRodRarity && FISHING_RARITY_RANK[fish.minRodRarity] != null
                    ? FISHING_RARITY_RANK[fish.minRodRarity]
                    : 0;
                if (rodRank >= requiredRank) {
                    catchPools[baitId].available.push(fish);
                    castableBaits[baitId] = true;
                } else {
                    catchPools[baitId].locked.push(fish);
                }
            }
        }

        baitDefs.sort((a, b) => {
            const av = a.def && typeof a.def.value === 'number' ? a.def.value : 0;
            const bv = b.def && typeof b.def.value === 'number' ? b.def.value : 0;
            return av - bv;
        });

        const baitCatalog = baitDefs.map((entry) => ({
            id: entry.id,
            def: entry.def,
            count: baitCounts[entry.id] || 0
        }));
        const totalBaitCount = baitCatalog.reduce((sum, entry) => sum + (entry.count || 0), 0);

        const statsSnippet = rsControl+rsSensitivity+rsPrecision+rsStability > 0
            ? ` · C${rsControl}/S${rsSensitivity}/P${rsPrecision}/St${rsStability} · FT ${derivedFailTol}`
            : '';
        const rodMeta = rodDef
            ? `${(rodDef.rarity || 'common').toUpperCase()} · +${rodSkillBonus} skill${statsSnippet}`
            : 'Equip a rod to catch anything here.';
        const rodWarning = rodDef || rod ? '' : 'No rod equipped.';

        return {
            defs,
            fishingDefs,
            fishing,
            rod,
            rodDef,
            rodName,
            rodMeta,
            rodWarning,
            rodRarity,
            rodRank,
            rodSpeedReduction,
            rodStats,
            sensitivityWaitMult,
            derivedFailTol,
            effectiveSkill,
            intervalMs,
            luk,
            baitCounts,
            baitCatalog,
            totalBaitCount,
            catchPools,
            castableBaits,
            hasRod: !!(rodDef || rod),
            rarityRank: FISHING_RARITY_RANK,
            gold
        };
    }

    _computeFishingMath(context, fishList, baitId) {
        if (!fishList || !fishList.length) return null;
        const averageDifficulty = fishList.reduce((sum, fish) => sum + (fish.difficulty || 10), 0) / fishList.length;
        const hookChance = Math.max(0.05, Math.min(0.98, context.effectiveSkill / (context.effectiveSkill + averageDifficulty)));
        const weights = [];
        let totalWeight = 0;
        const weightsMap = {};
        for (const fish of fishList) {
            const base = context.effectiveSkill / (context.effectiveSkill + (fish.difficulty || 10));
            const baitMod = (fish.baitModifiers && fish.baitModifiers[baitId]) ? fish.baitModifiers[baitId] : 1;
            const weight = Math.max(0.0001, base * baitMod);
            weights.push({ fish, weight });
            totalWeight += weight;
            weightsMap[fish.id] = weight;
        }
        if (totalWeight > 0) {
            for (const key of Object.keys(weightsMap)) weightsMap[key] = weightsMap[key] / totalWeight;
        }
        return { hookChance, weights, totalWeight, weightsMap };
    }

    _createFishingAttempt(baitId, hooks = {}) {
        return () => {
            const contextBefore = this._calculateFishingContext();
            const pool = contextBefore.catchPools[baitId] || { available: [], locked: [] };

            if (!contextBefore.hasRod) {
                this._showToast && this._showToast('Equip a fishing rod first.');
                hooks.onNoTargets && hooks.onNoTargets(contextBefore);
                this._stopFishingLoop('no-rod');
                if (hooks.onAfterAttempt) hooks.onAfterAttempt(contextBefore);
                return;
            }

            if (!pool.available.length) {
                this._showToast && this._showToast('Your rod cannot hook anything with this bait.');
                hooks.onNoTargets && hooks.onNoTargets(contextBefore);
                this._stopFishingLoop('no-targets');
                if (hooks.onAfterAttempt) hooks.onAfterAttempt(contextBefore);
                return;
            }

            const availableBait = contextBefore.baitCounts[baitId] || 0;
            if (!availableBait) {
                this._showToast && this._showToast('Out of bait.');
                hooks.onOutOfBait && hooks.onOutOfBait(contextBefore);
                this._stopFishingLoop('out-of-bait');
                if (hooks.onAfterAttempt) hooks.onAfterAttempt(contextBefore);
                return;
            }

            this._consumeInventoryItem(baitId, 1);
            const remainingAfterConsume = availableBait - 1;
            const math = this._computeFishingMath(contextBefore, pool.available, baitId);
            const roll = Math.random();

            if (!math || roll > math.hookChance) {
                this._showToast && this._showToast('No bite (+1xp)');
                this._grantFishingXp(1);
                this._refreshSharedUi();
                const contextAfter = this._calculateFishingContext();
                hooks.onFail && hooks.onFail({ remainingBait: remainingAfterConsume, hookChance: math ? math.hookChance : 0, contextBefore, contextAfter });
                hooks.onAfterAttempt && hooks.onAfterAttempt(contextAfter);
                return;
            }

            const chosen = this._pickWeightedFish(math.weights, math.totalWeight);
            if (!chosen) {
                this._refreshSharedUi();
                const contextAfter = this._calculateFishingContext();
                hooks.onFail && hooks.onFail({ remainingBait: remainingAfterConsume, hookChance: math.hookChance, contextBefore, contextAfter });
                hooks.onAfterAttempt && hooks.onAfterAttempt(contextAfter);
                return;
            }

            const xpGain = Math.max(1, Math.round(((chosen.difficulty || 0) + (chosen.baseValue || chosen.value || 0)) * 1.5));
            this._grantFishingXp(xpGain);
            this._addItemToInventory(chosen.id, 1);
            this._refreshSharedUi();
            this._showToast && this._showToast(`Caught ${chosen.name}! +${xpGain} fishing XP`, 2000);

            const contextAfter = this._calculateFishingContext();
            hooks.onCatch && hooks.onCatch({ fish: chosen, xpGain, remainingBait: remainingAfterConsume, hookChance: math.hookChance, contextBefore, contextAfter });
            hooks.onAfterAttempt && hooks.onAfterAttempt(contextAfter);
        };
    }

    _pickWeightedFish(weights, totalWeight) {
        if (!weights || !weights.length || !totalWeight) return null;
        let pick = Math.random() * totalWeight;
        for (const entry of weights) {
            pick -= entry.weight;
            if (pick <= 0) return entry.fish;
        }
        return weights[weights.length - 1].fish;
    }

    _grantFishingXp(amount) {
        if (!amount) return;
        const fishing = this.char.fishing = this.char.fishing || { level: 1, exp: 0, expToLevel: 100 };
        // Ensure expToLevel follows design curve: requiredXP = 100 * level^1.6
        try {
            const lvl = Math.max(1, Math.floor(fishing.level || 1));
            const required = Math.max(50, Math.floor(100 * Math.pow(lvl, 1.6)));
            if (typeof fishing.expToLevel !== 'number' || Math.abs(fishing.expToLevel - required) > 2) {
                fishing.expToLevel = required;
            }
        } catch (e) {}
        // Apply skillXpGain talent modifiers
        let finalAmount = amount;
        try {
            const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                ? window.__shared_ui.stats.effectiveStats(this.char)
                : null;
            if (eff && (eff.skillXpBonusPercent || eff.skillXpFlatBonus)) {
                const flatBonus = Number(eff.skillXpFlatBonus || 0);
                const pctBonus = Number(eff.skillXpBonusPercent || 0);
                finalAmount = Math.max(1, Math.round((amount + flatBonus) * (1 + (pctBonus / 100))));
            }
        } catch (e) {}
        fishing.exp = (fishing.exp || 0) + finalAmount;
        let leveled = false;
        while (fishing.exp >= fishing.expToLevel) {
            fishing.exp -= fishing.expToLevel;
            fishing.level = (fishing.level || 1) + 1;
            // Recompute next level requirement using curve
            try {
                const lvl = Math.max(1, Math.floor(fishing.level || 1));
                fishing.expToLevel = Math.max(50, Math.floor(100 * Math.pow(lvl, 1.6)));
            } catch (e) { fishing.expToLevel = Math.floor((fishing.expToLevel || 100) * 1.25); }
            leveled = true;
            try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'fishing', 1); } catch (e) {}
            try { if (window && window.grantMasteryPointsIfNeeded) window.grantMasteryPointsIfNeeded(this.char); } catch (e) {}
        }
        if (leveled) this._showToast && this._showToast(`Fishing level up! L${fishing.level}`, 2000);
        this._persistCharacterState();
    }

    _consumeInventoryItem(itemId, qty = 1) {
        if (!itemId || qty <= 0) return;
        let removed = false;
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.removeItemFromInventory === 'function') {
                removed = window.__shared_ui.removeItemFromInventory(this, itemId, qty);
            }
        } catch (e) { removed = false; }
        if (!removed) {
            const inv = this.char.inventory = this.char.inventory || [];
            let remaining = qty;
            for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
                const slot = inv[i];
                if (!slot || slot.id !== itemId) continue;
                const count = slot.qty || 1;
                if (count > remaining) {
                    slot.qty = count - remaining;
                    remaining = 0;
                } else {
                    remaining -= count;
                    inv.splice(i, 1);
                }
            }
        }
        this._persistCharacterState();
    }

    _addItemToInventory(itemId, qty = 1) {
        if (!itemId || qty <= 0) return;
        let added = false;
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.addItemToInventory === 'function') {
                added = window.__shared_ui.addItemToInventory(this, itemId, qty);
            }
        } catch (e) { added = false; }
        if (!added) {
            const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
            const def = defs[itemId] || null;
            const inv = this.char.inventory = this.char.inventory || [];
            if (def && def.stackable) {
                const slot = inv.find((s) => s && s.id === itemId);
                if (slot) slot.qty = (slot.qty || 0) + qty;
                else inv.push({ id: itemId, name: def.name || itemId, qty });
            } else {
                for (let i = 0; i < qty; i++) inv.push({ id: itemId, name: (def && def.name) || itemId, qty: 1 });
            }
        }
        this._persistCharacterState();
    }

    _persistCharacterState() {
        try {
            const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
            if (typeof this._persistCharacter === 'function') this._persistCharacter(username);
        } catch (e) { /* ignore */ }
    }

    _refreshSharedUi() {
        try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) {}
        try { if (this._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
        try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
    }

    _registerOverlay(overlay) {
        if (!overlay) return;
        this._activeOverlays = this._activeOverlays || [];
        if (!this._activeOverlays.includes(overlay)) this._activeOverlays.push(overlay);
    }

    _removeOverlay(overlay) {
        if (!overlay) return;
        try {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        } catch (e) { /* ignore DOM removal errors */ }
        if (this._activeOverlays && this._activeOverlays.length) {
            this._activeOverlays = this._activeOverlays.filter((node) => node !== overlay);
        }
    }

    _removeAllOverlays() {
        try { if (this._fishingUi && typeof this._fishingUi.close === 'function') this._fishingUi.close('cleanup'); } catch (e) {}
        try { if (this._bucketUi && typeof this._bucketUi.close === 'function') this._bucketUi.close('cleanup'); } catch (e) {}
        try { if (this._dockUi && typeof this._dockUi.close === 'function') this._dockUi.close('cleanup'); } catch (e) {}
        this._fishingUi = null;
        this._bucketUi = null;
        this._dockUi = null;
        if (!this._activeOverlays) return;
        for (const overlay of this._activeOverlays) {
            try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
        }
        this._activeOverlays = [];
    }

    // --- Dock Repair Questline ---
    _getCurrentDockQuestId() {
        const stage = (this.char && this.char.flags && this.char.flags.dockStage) || 0;
        if (stage >= 4) return null;
        const next = stage + 1;
        return `dock_repair_stage_${next}`;
    }

    _isDockQuestActive(qid) {
        if (!qid || !this.char || !Array.isArray(this.char.activeQuests)) return false;
        return this.char.activeQuests.some(q => q && q.id === qid);
    }

    _isDockQuestCompleted(qid) {
        if (!qid || !this.char || !Array.isArray(this.char.completedQuests)) return false;
        return this.char.completedQuests.includes(qid);
    }

    _countInventoryItem(itemId) {
        if (!this.char || !Array.isArray(this.char.inventory)) return 0;
        let total = 0;
        for (const slot of this.char.inventory) {
            if (!slot || slot.id !== itemId) continue;
            total += (slot.qty || 1);
        }
        return total;
    }

    _attemptDockContribution() {
        const qid = this._getCurrentDockQuestId();
        if (!qid) { this._showToast && this._showToast('Dock fully restored.'); return; }
        const quest = getQuestById(qid);
        if (!quest) { this._showToast && this._showToast('Dock repair data missing.'); return; }
        // Ensure quest is active; if not, try to start
        if (!this._isDockQuestActive(qid) && !this._isDockQuestCompleted(qid)) {
            const started = startQuest(this.char, qid);
            if (!started) { this._showToast && this._showToast('Cannot start repair quest yet.'); return; }
        }
        // Compute remaining requirements from objective state (support gold + any contribute_item targets)
        const statuses = getQuestObjectiveState(this.char, qid) || [];
        let needGold = 0;
        const itemNeeds = {}; // target -> remaining
        for (const s of statuses) {
            const remain = Math.max(0, (s.required || 0) - (s.current || 0));
            if (s.type === 'contribute_gold') needGold = remain;
            if (s.type === 'contribute_item' && s.target) itemNeeds[s.target] = remain;
        }
        const haveGold = this.char.gold || 0;
        const giveGold = needGold > 0 ? Math.min(needGold, haveGold) : 0;
        const itemGives = {}; // target -> to contribute now
        for (const [itemId, need] of Object.entries(itemNeeds)) {
            if (need <= 0) continue;
            const have = this._countInventoryItem(itemId);
            if (have > 0) itemGives[itemId] = Math.min(need, have);
        }
        const hasAnyItems = Object.values(itemGives).some(v => v > 0);
        if (giveGold <= 0 && !hasAnyItems) {
            if (checkQuestCompletion(this.char, qid)) {
                this._showToast && this._showToast('Ready to turn in.');
            } else {
                this._showToast && this._showToast('Not enough materials.');
            }
            return;
        }
        // Consume and update quest progress
        if (giveGold > 0) {
            this.char.gold = Math.max(0, haveGold - giveGold);
            updateQuestProgress(this.char, 'contribute_gold', null, giveGold);
        }
        for (const [itemId, qty] of Object.entries(itemGives)) {
            if (qty > 0) {
                this._consumeInventoryItem(itemId, qty);
                updateQuestProgress(this.char, 'contribute_item', itemId, qty);
            }
        }
        this._persistCharacterState();
        // If complete, allow turn-in now
        if (checkQuestCompletion(this.char, qid)) {
            this._setDockUiStatus && this._setDockUiStatus('Ready to turn in', 'ready');
        } else {
            this._setDockUiStatus && this._setDockUiStatus('Contribution applied', 'active');
        }
        if (this._dockUi) this._updateDockRepairOverlay();
    }

    _refreshDockVisual(stage = null) {
        stage = stage == null ? ((this.char && this.char.flags && this.char.flags.dockStage) || 0) : stage;
        const dock = this._dockVisual;
        if (!dock) return;
        try {
            // base style
            let color = 0x8b5a33, stroke = 0x6b3f22, alpha = 1, width = dock.width, length = dock.height;
            // stage-based improvements
            if (stage >= 1) { color = 0x91603a; }
            if (stage >= 2) { color = 0x9a6a45; stroke = 0x7a4a2a; }
            if (stage >= 3) { color = 0xa87750; stroke = 0x845233; alpha = 1; }
            if (stage >= 4) { color = 0xb58460; stroke = 0x8f5b3a; alpha = 1; width = Math.min(this.scale.width * 0.12, width + 12); }
            dock.fillColor = color;
            dock.alpha = alpha;
            dock.setStrokeStyle(2, stroke, 0.95);
            if (width && width !== dock.width) dock.width = width;
            // lantern at stage >= 3
            if (stage >= 3) {
                if (!this._dockLantern) {
                    const lx = dock.x; const ly = dock.y - Math.round(dock.height / 2) - 10;
                    this._dockLantern = this.add.circle(lx, ly, 6, 0xffffaa, 0.9).setDepth(1.8);
                    try { this.tweens.add({ targets: this._dockLantern, alpha: { from: 0.9, to: 0.6 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } catch (e) {}
                }
            } else {
                if (this._dockLantern) { try { this._dockLantern.destroy(); } catch (e) {} this._dockLantern = null; }
            }

            // Ensure boat mooring and event board exist and toggle visibility by stage
            try {
                if (!this.boatMooring) {
                    const bx = dock.x + Math.round((dock.width || 80) / 2) + 48;
                    const by = dock.y - Math.round((dock.height || 140) / 2) - 8;
                    this.boatMooring = this.add.circle(bx, by, 18, 0x264a3a, 0.95).setDepth(1.25);
                    this.boatMooring.setStrokeStyle(2, 0x76e2c4, 0.9);
                    this.boatMooringPrompt = this.add.text(bx, by - 34, '[E] Board Boat', { fontSize: '12px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
                }
                const boatVisible = stage >= 3;
                this.boatMooring.setVisible(boatVisible);
                if (this.boatMooringPrompt) this.boatMooringPrompt.setVisible(false);
            } catch (e) {}

            try {
                if (!this.eventBoard) {
                    const ex = dock.x - Math.round((dock.width || 80) / 2) - 80;
                    const ey = dock.y + Math.round((dock.height || 140) / 2) - 48;
                    this.eventBoard = this.add.rectangle(ex, ey, 34, 24, 0x2a3550, 0.95).setDepth(1.25);
                    this.eventBoard.setStrokeStyle(2, 0x7fb1ff, 0.85);
                    this.eventBoardPrompt = this.add.text(ex, ey - 30, '[E] Event Board', { fontSize: '12px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
                }
                const boardVisible = stage >= 4;
                this.eventBoard.setVisible(boardVisible);
                if (this.eventBoardPrompt) this.eventBoardPrompt.setVisible(false);
            } catch (e) {}
        } catch (e) { /* no-op */ }
    }

    _openBoatPanel() {
        if (typeof document === 'undefined') return;
        this._ensureFishingUiStyles();
        const overlay = document.createElement('div'); overlay.className = 'bdock-overlay';
        const modal = document.createElement('section'); modal.className = 'bdock-modal';
        modal.innerHTML = `
            <header class="bdock-header">
                <div>
                    <div class="bdock-title">Boat Mooring</div>
                    <div class="bdock-status" data-tone="active">Stage 3 Unlock</div>
                </div>
                <button class="bdock-btn ghost" type="button" data-role="close">Close</button>
            </header>
            <div class="bdock-content">
                <div class="bdock-section" style="grid-column:1/-1;">
                    <h3>Open Water (coming online)</h3>
                    <div class="bdock-progress-meta">Sail to deeper waters for rarer fish and special events. This is a preview panel; travel hooks are stubbed for now.</div>
                </div>
            </div>
        `;
        overlay.appendChild(modal);
        const closeBtn = modal.querySelector('[data-role="close"]');
        const onClose = () => { try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {} };
        closeBtn && closeBtn.addEventListener('click', onClose);
        overlay.addEventListener('click', (evt) => { if (evt.target === overlay) onClose(); });
        document.body.appendChild(overlay);
    }

    _openEventBoard() {
        if (typeof document === 'undefined') return;
        this._ensureFishingUiStyles();
        const overlay = document.createElement('div'); overlay.className = 'bdock-overlay';
        const modal = document.createElement('section'); modal.className = 'bdock-modal';
        modal.innerHTML = `
            <header class="bdock-header">
                <div>
                    <div class="bdock-title">Dock Events</div>
                    <div class="bdock-status" data-tone="active">Stage 4 Unlock</div>
                </div>
                <button class="bdock-btn ghost" type="button" data-role="close">Close</button>
            </header>
            <div class="bdock-content">
                <div class="bdock-section">
                    <h3>Active Events</h3>
                    <div class="bdock-forecast-empty">No events currently running. Check back later!</div>
                </div>
                <div class="bdock-section">
                    <h3>Leaderboard</h3>
                    <div class="bdock-forecast-empty">Leaderboards refresh every 10s. (Stubbed)</div>
                </div>
            </div>
        `;
        overlay.appendChild(modal);
        const closeBtn = modal.querySelector('[data-role="close"]');
        const onClose = () => { try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {} };
        closeBtn && closeBtn.addEventListener('click', onClose);
        overlay.addEventListener('click', (evt) => { if (evt.target === overlay) onClose(); });
        document.body.appendChild(overlay);
    }

    _openDockRepairOverlay() {
        if (typeof document === 'undefined') return;
        this._ensureFishingUiStyles();
        if (this._dockUi && typeof this._dockUi.close === 'function') {
            try { this._dockUi.close('reopen'); } catch (e) {}
        }

        const overlay = document.createElement('div');
        overlay.className = 'bdock-overlay';
        const modal = document.createElement('section');
        modal.className = 'bdock-modal';
        modal.innerHTML = `
            <header class="bdock-header">
                <div>
                    <div class="bdock-title">Broken Dock · Repairs</div>
                    <div class="bdock-status" data-role="status" data-tone="idle">Assessing damage...</div>
                </div>
                <button class="bdock-btn ghost" type="button" data-role="close">Close</button>
            </header>
            <section class="bdock-metrics">
                <div class="bdock-metric">
                    <label>Dock Stage</label>
                    <div class="bdock-metric-value" data-role="stage">0 / 4</div>
                    <div class="bdock-progress"><div class="bdock-progress-bar" data-role="stage-bar" style="width:0%;"></div></div>
                    <div class="bdock-progress-meta" data-role="stage-note">Begin repairs to unlock new fishing features.</div>
                </div>
                <div class="bdock-metric">
                    <label>Materials</label>
                    <div class="bdock-metric-value" data-role="mats">-</div>
                    <div class="bdock-progress-meta" data-role="mats-note">Gold, logs and iron bars fund the rebuild.</div>
                </div>
            </section>
            <div class="bdock-content">
                <div class="bdock-column">
                    <section class="bdock-section">
                        <h3>Next Upgrade</h3>
                        <div class="bdock-preview" data-role="next">
                            <div class="bdock-progress-meta">All repairs complete.</div>
                        </div>
                    </section>
                </div>
                <div class="bdock-column">
                    <section class="bdock-section">
                        <h3>Benefits</h3>
                        <ul class="bdock-preview-list" style="margin:0; padding:0;">
                            <li>Stage 1: Hotspots begin appearing</li>
                            <li>Stage 2: Faster hotspot spawns</li>
                            <li>Stage 3: Lantern light and better odds</li>
                            <li>Stage 4: Best spawn rates and aesthetics</li>
                        </ul>
                    </section>
                    <section class="bdock-section">
                        <h3>Action</h3>
                        <div class="bdock-progress-meta" data-role="action-note">Accept the current stage, contribute materials, then turn in.</div>
                        <div class="bdock-footer-actions">
                            <button class="bdock-btn outline" type="button" data-role="accept">Accept Stage</button>
                            <button class="bdock-btn primary" type="button" data-role="contribute">Contribute</button>
                            <button class="bdock-btn ghost" type="button" data-role="turnin">Turn In</button>
                        </div>
                    </section>
                </div>
            </div>
        `;
        overlay.appendChild(modal);
        this._registerOverlay(overlay);
        document.body.appendChild(overlay);

        const ui = {
            overlay,
            modal,
            statusEl: modal.querySelector('[data-role="status"]'),
            closeBtn: modal.querySelector('[data-role="close"]'),
            acceptBtn: modal.querySelector('[data-role="accept"]'),
            contributeBtn: modal.querySelector('[data-role="contribute"]'),
            turnInBtn: modal.querySelector('[data-role="turnin"]'),
            stageEl: modal.querySelector('[data-role="stage"]'),
            stageBar: modal.querySelector('[data-role="stage-bar"]'),
            stageNoteEl: modal.querySelector('[data-role="stage-note"]'),
            matsEl: modal.querySelector('[data-role="mats"]'),
            matsNoteEl: modal.querySelector('[data-role="mats-note"]'),
            nextEl: modal.querySelector('[data-role="next"]'),
            listeners: []
        };

        const onClose = () => ui.close('close');
        ui.close = (reason = 'closed') => {
            for (const off of ui.listeners.splice(0)) { try { off(); } catch (e) {} }
            try { this._removeOverlay(overlay); } catch (e) {}
            if (this._dockUi === ui) this._dockUi = null;
        };
        ui.closeBtn.addEventListener('click', onClose);
        ui.listeners.push(() => ui.closeBtn.removeEventListener('click', onClose));

        const handleOverlayClick = (evt) => { if (evt.target === overlay) ui.close('dismiss'); };
        overlay.addEventListener('click', handleOverlayClick);
        ui.listeners.push(() => overlay.removeEventListener('click', handleOverlayClick));

        this._setDockUiStatus = (text, tone = 'idle') => { try { if (ui.statusEl) { ui.statusEl.textContent = text; ui.statusEl.dataset.tone = tone; } } catch (e) {} };

        const onAccept = () => {
            const qid = this._getCurrentDockQuestId();
            if (!qid) { this._setDockUiStatus('Dock fully restored', 'ready'); return; }
            if (this._isDockQuestCompleted(qid)) { this._setDockUiStatus('Already completed; turn in next stage', 'ready'); return; }
            if (this._isDockQuestActive(qid)) { this._setDockUiStatus('Stage already accepted', 'active'); return; }
            const ok = startQuest(this.char, qid);
            this._setDockUiStatus(ok ? 'Stage accepted' : 'Cannot accept stage yet', ok ? 'ready' : 'warn');
            this._updateDockRepairOverlay();
        };
        const onContrib = () => this._attemptDockContribution();
        const onTurnIn = () => {
            const qid = this._getCurrentDockQuestId();
            if (!qid) { this._setDockUiStatus('Dock fully restored', 'ready'); return; }
            if (!checkQuestCompletion(this.char, qid)) { this._setDockUiStatus('Requirements not yet met', 'warn'); return; }
            const ok = completeQuest(this.char, qid);
            if (ok) {
                this.char.flags = this.char.flags || {}; this.char.flags.dockStage = ((this.char.flags.dockStage || 0) + 1);
                this._persistCharacterState();
                this._refreshDockVisual(this.char.flags.dockStage);
                const newStage = this.char.flags.dockStage || 0;
                this._setDockUiStatus(`Dock upgraded to Stage ${newStage}`, 'ready');
                try { this._showToast && this._showToast(newStage === 1 ? 'Hotspots unlocked! Watch the water.' : `Upgraded to Stage ${newStage}.`); } catch (e) {}
                // Kickstart hotspots immediately on Stage 1 turn-in
                try {
                    if (newStage >= 1) {
                        if (typeof this._spawnHotspot === 'function') {
                            this._spawnHotspot();
                            // schedule a second one shortly to make it obvious
                            if (this.time && this.time.addEvent) this.time.addEvent({ delay: 2000, callback: () => this._spawnHotspot(), callbackScope: this });
                        }
                        const now = (performance && performance.now ? performance.now() : Date.now());
                        this._nextHotspotAt = now + 4000;
                    }
                } catch (e) {}
            } else {
                this._setDockUiStatus('Turn-in failed', 'warn');
            }
            this._updateDockRepairOverlay();
        };
        ui.acceptBtn.addEventListener('click', onAccept);
        ui.contributeBtn.addEventListener('click', onContrib);
        ui.turnInBtn.addEventListener('click', onTurnIn);
        ui.listeners.push(() => ui.acceptBtn.removeEventListener('click', onAccept));
        ui.listeners.push(() => ui.contributeBtn.removeEventListener('click', onContrib));
        ui.listeners.push(() => ui.turnInBtn.removeEventListener('click', onTurnIn));

        this._dockUi = ui;
        this._updateDockRepairOverlay();
    }

    _updateDockRepairOverlay() {
        if (!this._dockUi) return;
        const ui = this._dockUi;
        const stage = (this.char && this.char.flags && this.char.flags.dockStage) || 0;
        const maxStage = 4;
        if (ui.stageEl) ui.stageEl.textContent = `${stage} / ${maxStage}`;
        if (ui.stageBar) ui.stageBar.style.width = `${Math.max(0, Math.min(100, Math.round((stage / maxStage) * 100)))}%`;
        if (ui.stageNoteEl) ui.stageNoteEl.textContent = stage >= 1 ? 'Repairs underway. Hotspots active.' : 'Begin repairs to unlock hotspots.';
        // dynamic materials summary
        const gold = (this.char && typeof this.char.gold === 'number') ? this.char.gold : 0;
        const iron = this._countInventoryItem('iron_bar');
        const normalLogs = this._countInventoryItem('normal_log');
        const oakLogs = this._countInventoryItem('oak_log');
        if (ui.matsEl) {
            // Build per-objective status for current stage
            const qid = this._getCurrentDockQuestId();
            let matsHtml = '';
            if (qid) {
                const statuses = getQuestObjectiveState(this.char, qid) || [];
                const renderObj = (label, current, required) => {
                    const cls = current >= required ? 'bdock-mat-done' : (current > 0 ? 'bdock-mat-partial' : 'bdock-mat-missing');
                    return `<span class="${cls}" title="${label} ${current}/${required}">${label} ${current}/${required}</span>`;
                };
                for (const s of statuses) {
                    if (s.type === 'contribute_gold') matsHtml += renderObj('Gold', s.current, s.required) + ' · ';
                    if (s.type === 'contribute_item' && s.target === 'normal_log') matsHtml += renderObj('Normal Logs', s.current, s.required) + ' · ';
                    if (s.type === 'contribute_item' && s.target === 'oak_log') matsHtml += renderObj('Oak Logs', s.current, s.required) + ' · ';
                    if (s.type === 'contribute_item' && s.target === 'iron_bar') matsHtml += renderObj('Iron Bars', s.current, s.required) + ' · ';
                }
                matsHtml = matsHtml.replace(/ · $/, '');
            } else {
                matsHtml = '<span class="bdock-mat-done">All repairs complete</span>';
            }
            ui.matsEl.innerHTML = matsHtml;
        }

        if (stage >= maxStage) {
            if (ui.statusEl) { ui.statusEl.textContent = 'Dock fully restored'; ui.statusEl.dataset.tone = 'ready'; }
            if (ui.nextEl) ui.nextEl.innerHTML = `<div class="bdock-progress-meta">All repairs complete. Enjoy the restored dock!</div>`;
            if (ui.acceptBtn) ui.acceptBtn.disabled = true;
            if (ui.contributeBtn) ui.contributeBtn.disabled = true;
            if (ui.turnInBtn) ui.turnInBtn.disabled = true;
            return;
        }

        const qid = this._getCurrentDockQuestId();
        const isCompleted = qid ? this._isDockQuestCompleted(qid) : false;
        const isActive = qid ? this._isDockQuestActive(qid) : false;

        if (!qid) return; // defensive
        const q = getQuestById(qid);
        if (!q) return;

        const statuses = getQuestObjectiveState(this.char, qid) || [];
        const goldObj = statuses.find(s => s.type === 'contribute_gold');
        const itemObjectives = statuses.filter(s => s.type === 'contribute_item');
        const needGold = Math.max(0, (goldObj?.required || 0) - (goldObj?.current || 0));
        const canGold = gold > 0 && needGold > 0;
        const canItems = itemObjectives.some(obj => {
            const remain = Math.max(0, (obj.required || 0) - (obj.current || 0));
            if (remain <= 0) return false;
            const have = this._countInventoryItem(obj.target);
            return have > 0;
        });
        const canAny = canGold || canItems;

        if (ui.statusEl) {
            if (isCompleted) { ui.statusEl.textContent = 'Ready to turn in'; ui.statusEl.dataset.tone = 'ready'; }
            else if (isActive) { ui.statusEl.textContent = canAny ? 'Ready to contribute' : 'Gather materials'; ui.statusEl.dataset.tone = canAny ? 'active' : 'warn'; }
            else { ui.statusEl.textContent = 'Accept the stage to begin'; ui.statusEl.dataset.tone = 'idle'; }
        }

        if (ui.acceptBtn) ui.acceptBtn.disabled = isActive || isCompleted;
        if (ui.contributeBtn) ui.contributeBtn.disabled = !isActive || !canAny;
        if (ui.turnInBtn) ui.turnInBtn.disabled = !isCompleted;

        if (ui.nextEl) {
            const toStage = stage + 1;
            let listHtml = `<li>Gold: ${(goldObj?.current || 0)} / ${(goldObj?.required || 0)}</li>`;
            for (const obj of itemObjectives) {
                listHtml += `<li>${(obj.target || 'Item')}: ${(obj.current || 0)} / ${(obj.required || 0)}</li>`;
            }
            ui.nextEl.innerHTML = `
                <div class="bdock-preview-title">Upgrade to Stage ${toStage}</div>
                <div class="bdock-preview-desc">Requirements to strengthen the dock:</div>
                <ul class="bdock-preview-list" style="margin:0; padding:0;">${listHtml}</ul>
            `;
        }
    }

    _migrateDockQuestsFromStage() {
        try {
            const stage = (this.char && this.char.flags && this.char.flags.dockStage) || 0;
            this.char.completedQuests = this.char.completedQuests || [];
            // If quests already reflect stage, sync stage from quests (prefer quest truth)
            const completedStages = ['dock_repair_stage_1','dock_repair_stage_2','dock_repair_stage_3','dock_repair_stage_4']
                .filter(qid => this.char.completedQuests.includes(qid)).length;
            if (completedStages > stage) {
                this.char.flags.dockStage = completedStages;
                return;
            }
            // If stage ahead of quests, mark quests up to stage as completed (no rewards) to keep systems aligned
            if (stage > completedStages) {
                for (let s = 1; s <= stage; s++) {
                    const qid = `dock_repair_stage_${s}`;
                    if (!this.char.completedQuests.includes(qid)) this.char.completedQuests.push(qid);
                }
            }
        } catch (e) { /* ignore migration errors */ }
    }

    _startSafeZoneRegen() {
        const regenDelay = 1800;
        if (this.safeRegenEvent) { try { if (typeof this.safeRegenEvent === 'function') this.safeRegenEvent(); else this.safeRegenEvent.remove && this.safeRegenEvent.remove(false); } catch (e) {} }
        if (!this.time) return;
        this.safeRegenEvent = addTimeEvent(this, {
            delay: regenDelay,
            loop: true,
            callback: this._tickSafeZoneRegen,
            callbackScope: this
        });
    }

    _stopSafeZoneRegen() {
        if (this.safeRegenEvent) { try { if (typeof this.safeRegenEvent === 'function') this.safeRegenEvent(); else this.safeRegenEvent.remove && this.safeRegenEvent.remove(false); } catch (e) {} this.safeRegenEvent = null; }
    }

    _tickSafeZoneRegen() {
        if (!this.char) return;
        try { applySafeZoneRegen(this); } catch (e) {}
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

    // -------- Fishing Mastery Overlay (Phase 3 UI) --------
    _ensureMasteryUiStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('broken-dock-mastery-styles')) return;
        const style = document.createElement('style');
        style.id = 'broken-dock-mastery-styles';
        style.textContent = `
            .bdock-mastery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap:14px; padding:4px 2px; }
            .bdock-mastery-node { background: rgba(16,26,40,0.92); border:1px solid rgba(118,190,255,0.14); border-radius:12px; padding:12px 14px 44px 14px; position:relative; display:flex; flex-direction:column; gap:6px; transition:border-color 160ms ease, background 160ms ease; }
            .bdock-mastery-node:hover { border-color: rgba(118,190,255,0.34); }
            .bdock-mastery-node.taken { border-color: rgba(134,245,196,0.55); background: linear-gradient(160deg, rgba(28,48,42,0.9) 0%, rgba(18,30,26,0.92) 100%); }
            .bdock-mastery-node.locked { opacity:0.55; }
            .bdock-mastery-node h4 { margin:0; font-size:14px; font-weight:600; letter-spacing:0.6px; }
            .bdock-mastery-node p { margin:0; font-size:12px; line-height:1.4; color:rgba(255,255,255,0.72); }
            .bdock-mastery-meta { font-size:11px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.55); }
            .bdock-mastery-node button { position:absolute; left:12px; right:12px; bottom:12px; border:none; border-radius:8px; padding:8px 12px; font-weight:600; font-size:12px; letter-spacing:0.5px; cursor:pointer; background:linear-gradient(90deg,#5fb1ff 0%, #8f93ff 100%); color:#081120; box-shadow:0 6px 14px rgba(95,177,255,0.28); }
            .bdock-mastery-node button:disabled { opacity:0.45; cursor:not-allowed; box-shadow:none; background:rgba(40,60,80,0.6); color:rgba(255,255,255,0.55); }
            .bdock-mastery-summary { display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:rgba(255,255,255,0.68); }
            .bdock-mastery-summary span { background: rgba(12,20,32,0.9); padding:6px 10px; border-radius:8px; border:1px solid rgba(118,190,255,0.12); }
            .bdock-mastery-empty { font-size:12px; color:rgba(255,255,255,0.6); }
        `;
        document.head.appendChild(style);
    }

    _openFishingMasteryOverlay() {
        if (typeof document === 'undefined') return;
        this._ensureFishingUiStyles && this._ensureFishingUiStyles();
        this._ensureMasteryUiStyles();
        const overlay = document.createElement('div'); overlay.className='bdock-overlay';
        const modal = document.createElement('section'); modal.className='bdock-modal';
        modal.innerHTML = `
            <header class="bdock-header">
                <div>
                    <div class="bdock-title">Broken Dock · Fishing Mastery</div>
                    <div class="bdock-status" data-role="status" data-tone="idle">Progression</div>
                </div>
                <button class="bdock-btn ghost" type="button" data-role="close">Close</button>
            </header>
            <section class="bdock-metrics">
                <div class="bdock-metric"><label>Mastery Points</label><div class="bdock-metric-value" data-role="points">0</div><div class="bdock-progress-meta" data-role="points-note">Earn 1 per 5 fishing levels.</div></div>
                <div class="bdock-metric"><label>Fishing Level</label><div class="bdock-metric-value" data-role="level">Lv 1</div><div class="bdock-progress-meta" data-role="level-note">Level drives point supply.</div></div>
            </section>
            <div class="bdock-content" style="grid-template-columns:1fr;">
                <div class="bdock-column">
                    <section class="bdock-section"><h3>Tree</h3><div class="bdock-mastery-grid" data-role="grid"></div></section>
                    <section class="bdock-section"><h3>Summary</h3><div class="bdock-mastery-summary" data-role="summary"></div></section>
                </div>
            </div>
            <footer class="bdock-footer"><div class="bdock-progress-meta" data-role="footer-tip">Press M to reopen. Unlock nodes to amplify active fishing.</div><div class="bdock-footer-actions"><button class="bdock-btn outline" type="button" data-role="refresh">Refresh</button></div></footer>
        `;
        overlay.appendChild(modal); this._registerOverlay && this._registerOverlay(overlay); document.body.appendChild(overlay);
        const statusEl = modal.querySelector('[data-role="status"]');
        const closeBtn = modal.querySelector('[data-role="close"]');
        const refreshBtn = modal.querySelector('[data-role="refresh"]');
        const pointsEl = modal.querySelector('[data-role="points"]');
        const pointsNoteEl = modal.querySelector('[data-role="points-note"]');
        const levelEl = modal.querySelector('[data-role="level"]');
        const gridEl = modal.querySelector('[data-role="grid"]');
        const summaryEl = modal.querySelector('[data-role="summary"]');
        const uiState = { overlay, modal, statusEl, closeBtn, refreshBtn, pointsEl, pointsNoteEl, levelEl, gridEl, summaryEl, listeners: [] };
        const handleKey = (evt) => { if (evt.key === 'Escape') { evt.preventDefault(); uiState.close('escape'); } }; const offDocKey = addDocumentListener(this, 'keydown', handleKey);
        const handleOverlayClick = (evt) => { if (evt.target === overlay) uiState.close('dismiss'); }; overlay.addEventListener('click', handleOverlayClick);
        uiState.close = (reason='closed') => { for (const off of uiState.listeners.splice(0)) { try { off(); } catch(e) {} } try { this._removeOverlay && this._removeOverlay(overlay); } catch(e) {} };
        const onCloseClick = () => uiState.close('close-button'); closeBtn.addEventListener('click', onCloseClick);
        const renderSummary = (summary) => { if (!summaryEl) return; const parts=[]; const keys=['stability','control','sensitivity','precision','baitEfficiency','rarityBoost','hotspotInsight']; for (const k of keys) { const v=summary[k]||0; if (v) parts.push(`<span>${k}: +${v}</span>`); } summaryEl.innerHTML = parts.length ? parts.join('') : '<div class="bdock-mastery-empty">No bonuses yet. Unlock nodes to begin.</div>'; };
        const renderNodes = () => { if (!gridEl) return; gridEl.innerHTML=''; const char=this.char||{}; try { if (window && window.ensureFishingMastery) window.ensureFishingMastery(char); } catch(e) {} const nodes=window && window.FISHING_MASTERY_NODES ? window.FISHING_MASTERY_NODES : []; const byId=window && window.fishingMasteryById ? window.fishingMasteryById : {}; const taken=Array.isArray(char.fishing?.masteryNodes)?char.fishing.masteryNodes:[]; const points=char.fishing?.masteryPoints||0; if (pointsEl) pointsEl.textContent=String(points); if (levelEl) levelEl.textContent=`Lv ${(char.fishing?.level)||1}`; if (pointsNoteEl) pointsNoteEl.textContent = points===0 ? 'Earn more points by leveling fishing.' : `${points} point${points===1?'':'s'} available.`; const summary = window && window.computeFishingMasteryBonuses ? window.computeFishingMasteryBonuses(char) : { takenNodes: [], pointsSpent: 0 }; renderSummary(summary); for (const node of nodes) { const card=document.createElement('div'); card.className='bdock-mastery-node'; const isTaken=taken.includes(node.id); const prereqMissing=node.requires && node.requires.some(r=>!taken.includes(r)); const canUnlock=!isTaken && !prereqMissing && points>=node.cost && (window && window.canUnlockMasteryNode ? window.canUnlockMasteryNode(char,node.id) : true); if (isTaken) card.classList.add('taken'); if (!isTaken && prereqMissing) card.classList.add('locked'); card.innerHTML=`<div class=\"bdock-mastery-meta\">${isTaken?'TAKEN':(canUnlock?'READY':(prereqMissing?'LOCKED':'UNAVAILABLE'))}</div><h4>${node.name}</h4><p>${node.description}</p><p style=\"font-size:11px;color:rgba(255,255,255,0.55);\">Cost: ${node.cost} · Tier ${node.tier}${node.requires && node.requires.length ? ` · Req: ${node.requires.map(r => byId[r]?.name || r).join(', ')}` : ''}</p><button type=\"button\" ${canUnlock?'':'disabled'} data-node-id=\"${node.id}\">${isTaken?'Taken':(canUnlock?'Unlock':'Locked')}</button>`; gridEl.appendChild(card); } };
        const attemptUnlock = (evt) => { const btn=evt.target.closest('button[data-node-id]'); if (!btn) return; const nodeId=btn.getAttribute('data-node-id'); if (!nodeId) return; const char=this.char||{}; if (!(window && window.unlockMasteryNode)) return; const ok=window.unlockMasteryNode(char,nodeId); if (ok) { this._showToast && this._showToast('Unlocked mastery: '+nodeId); try { if (window && window.__telemetry && window.__telemetry.emit) window.__telemetry.emit('fishing_mastery_unlock',{ node: nodeId, remaining: char.fishing?.masteryPoints||0 }); } catch(e) {} try { const username=(this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username)||null; if (this._persistCharacter) this._persistCharacter(username); } catch(e) {} renderNodes(); if (statusEl) { statusEl.textContent='Unlocked '+nodeId; statusEl.dataset.tone='ready'; } } else { if (statusEl) { statusEl.textContent='Cannot unlock '+nodeId; statusEl.dataset.tone='warn'; } } };
        gridEl.addEventListener('click', attemptUnlock);
        const onRefresh = () => { renderNodes(); if (statusEl) { statusEl.textContent='Refreshed'; statusEl.dataset.tone='idle'; } };
        refreshBtn.addEventListener('click', onRefresh);
        renderNodes();
        uiState.listeners.push(() => { try { offDocKey && offDocKey(); } catch(e) {} });
        uiState.listeners.push(() => overlay.removeEventListener('click', handleOverlayClick));
        uiState.listeners.push(() => closeBtn.removeEventListener('click', onCloseClick));
        uiState.listeners.push(() => gridEl.removeEventListener('click', attemptUnlock));
        uiState.listeners.push(() => refreshBtn.removeEventListener('click', onRefresh));
        return uiState;
    }

}

applyCombatMixin(BrokenDock.prototype);

export default BrokenDock;
