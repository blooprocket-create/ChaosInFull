import { createPortal } from './shared/portal.js';
import { persistCharacter } from './shared/persistence.js';
import { createPlayer } from '../shared/playerFactory.js';
import { onSkillLevelUp, ensureCharTalents } from '../data/talents.js';
import FISHING_DEFS from '../data/fishing.js';
import { applySafeZoneRegen } from './shared/stats.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { applyCombatMixin } from './shared/combat.js';
import { attach as attachCleanup, addTimeEvent, addDocumentListener } from '../shared/cleanupManager.js';

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

        // continuous fishing state and helpers
        this.fishingActive = false;
        this.fishingEvent = null;
        this.fishingIntervalMs = 3000; // default, will use effectiveStats when starting
        this.fishingIndicator = null;
        this._fishingUi = null;
        this._bucketUi = null;
        this._fishingHooks = null;
        this._fishingActiveBait = null;

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
            const d = Phaser.Math.Distance.Between(px, py, fn.x, fn.y);
            fn.prompt.setVisible(d <= 56);
            if (d <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                this._openFishingModal();
            }
        }
        const b = this.baitBucket; if (b) {
            const d2 = Phaser.Math.Distance.Between(px, py, b.x, b.y);
            b.prompt.setVisible(d2 <= 56);
            if (d2 <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                this._openBucketShop();
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

        // If fishing indicator exists, keep it positioned above the player
        try {
            if (this.fishingIndicator && this.player) {
                this.fishingIndicator.x = this.player.x;
                this.fishingIndicator.y = this.player.y - 48;
            }
        } catch (e) {}

        // If player moves while fishing, stop the fishing loop
        try {
            if (this.fishingActive && this.player && this.player.body) {
                const vx = Math.abs(this.player.body.velocity.x || 0);
                const vy = Math.abs(this.player.body.velocity.y || 0);
                if (vx > 2 || vy > 2) {
                    this._showToast && this._showToast('Stopped fishing (moved)');
                    this._stopFishingLoop();
                }
            }
        } catch (e) {}

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

    _openFishingModal() {
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

        const effectiveSkill = Math.max(0, Math.floor(baseFishingSkill + rodSkillBonus + Math.floor(luk * 0.2)));
        let intervalMs = Math.max(600, Math.round(this.fishingIntervalMs - (luk * 8) - rodSpeedReduction));
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

        const rodMeta = rodDef
            ? `${(rodDef.rarity || 'common').toUpperCase()} · +${rodSkillBonus} skill`
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
            fishing.expToLevel = Math.floor((fishing.expToLevel || 100) * 1.25);
            leveled = true;
            try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'fishing', 1); } catch (e) {}
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
        this._fishingUi = null;
        this._bucketUi = null;
        if (!this._activeOverlays) return;
        for (const overlay of this._activeOverlays) {
            try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
        }
        this._activeOverlays = [];
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

}

applyCombatMixin(BrokenDock.prototype);

export default BrokenDock;
