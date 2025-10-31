import * as workbench from './shared/workbench.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx, swayDecorations } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { getAvailableQuests, startQuest, completeQuest, checkQuestCompletion, getQuestObjectiveState, getQuestById, updateQuestProgress } from '../data/quests.js';
import { onSkillLevelUp, ensureCharTalents } from '../data/talents.js';
import { applySafeZoneRegen } from './shared/stats.js';
import { applyCombatMixin } from './shared/combat.js';
import { attach, addTimeEvent } from '../shared/cleanupManager.js';

// Clean Town scene implementation
export class Town extends Phaser.Scene {
    constructor() { super('Town'); }
    preload() {
        this.load.image('town_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('furnace', 'assets/furnace.png', { frameWidth: 64, frameHeight: 96 });
        this.load.spritesheet('grimsley_idle', 'assets/Grimsley/grimsley_idle.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('grimsley_walk', 'assets/Grimsley/grimsley_walk.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('grimsley_run', 'assets/Grimsley/grimsley_run.png', { frameWidth: 64, frameHeight: 64 });
    }
    create() {
    // Ensure cleanup manager is attached early for this scene
    try { attach(this); } catch (e) {}
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    // Atmospheric fog overlay using Phaser particle system
    try { if (window && window.__overlays_shared && window.__overlays_shared.createAtmosphericOverlays) { this._overlays = window.__overlays_shared.createAtmosphericOverlays(this, { idPrefix: 'town', zIndexBase: 120, layers: ['fog'] }); } } catch (e) { this._overlays = null; }

    this._startSafeZoneRegen();
    setSceneKey('Town');
    setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });
    // responsive layout values
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    try {
        this._townFloor = buildThemedFloor(this, 'town');
    } catch (e) {
        this.cameras.main.setBackgroundColor('#3b3b33');
    }
    applyAmbientFx(this, 'town');

    // Bounds within which we place town objects
    const margin = 96;
    const bounds = { x1: margin, x2: this.scale.width - margin, y1: 120, y2: this.scale.height - 140 };

    // Decorative flora (Zelda-like top-down feel)
    this._decorations = [];
    // increase flora density for a lusher town
    const decorCount = Math.max(48, Math.round((this.scale.width * this.scale.height) / 45000));
    for (let i = 0; i < decorCount; i++) {
        let dx = Phaser.Math.Between(bounds.x1, bounds.x2);
        let dy = Phaser.Math.Between(bounds.y1, bounds.y2);
        let tries = 0;
        while (Phaser.Math.Distance.Between(dx, dy, centerX, centerY) < 60 && tries < 12) {
            dx = Phaser.Math.Between(bounds.x1, bounds.x2);
            dy = Phaser.Math.Between(bounds.y1, bounds.y2);
            tries++;
        }
        const type = (Math.random() < 0.65) ? 'grass' : 'flower';
        let disp = null;
        try {
            const varDepth = 0.6 + ((dy || 0) / Math.max(1, this.scale.height)) * 0.2;
            if (type === 'grass') {
                const r = Phaser.Math.Between(8, 16);
                // darker, muted grass for horror vibe
                disp = this.add.ellipse(dx, dy, r * 1.6, r * 0.9, 0x173a17, 1).setDepth(varDepth);
                disp.setAlpha(0.85);
            } else {
                // flower: muted/purplish petals with a dull center
                const petal = this.add.circle(0, -2, 6, 0x6b2f6b, 1);
                const center = this.add.circle(0, -2, 2, 0xcc9933, 1);
                // group via container so we can move them if needed and set depth on container
                try { disp = this.add.container(dx, dy, [petal, center]); disp.setDepth(varDepth); } catch (e) { disp = petal; if (disp && typeof disp.setDepth === 'function') disp.setDepth(varDepth); }
            }
        } catch (e) {
            try { disp = this.add.circle(dx, dy, 6, 0x3a7a2a, 1).setDepth(0.6); } catch (e) { disp = null; }
        }
        if (disp) this._decorations.push({ x: dx, y: dy, type: type, display: disp });
    }
    swayDecorations(this, this._decorations);
    // helper used when placing portals/workbench etc.: avoid center plaza and decorations
    const isTooClose = (x, y, minDist = 60) => {
        for (const d of (this._decorations || [])) if (Phaser.Math.Distance.Between(x, y, d.x, d.y) < minDist) return true;
        // avoid center plaza
        if (Phaser.Math.Distance.Between(x, y, centerX, centerY) < 80) return true;
        return false;
    };

    // Player (allow restoring last position via spawnX/spawnY)
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || centerX;
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || Math.round(centerY + (this.scale.height * 0.06));
    // create player via shared factory so collider sizing is consistent across scenes
    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');
    // Attach colliders between player and any pre-created town building collider zones
    try {
        if (this._townBuildings && Array.isArray(this._townBuildings) && this.physics && this.physics.add) {
            for (const b of this._townBuildings) {
                try { if (b && b.collider && b.collider.body) this.physics.add.collider(this.player, b.collider); } catch (e) {}
            }
        }
    } catch (e) {}
    // Player animations are registered globally in Boot; scenes can simply use the 'walk','run','idle','mine' keys.
        // Input (WASD + E + I + U + X) - centralized
    if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);
        // Character data
        const char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!char.mining) char.mining = { level: 1, exp: 0, expToLevel: 100 };
    if (!char.inventory) char.inventory = [];
    if (!char.gold) char.gold = 0;
    // equipment slots
    if (!char.equipment) char.equipment = { head: null, armor: null, legs: null, boots: null, ring1: null, ring2: null, amulet: null, weapon: null, fishing: null, mining: null, woodcutting: null };
    this.char = char;
    try { ensureCharTalents && ensureCharTalents(this.char); } catch (e) { /* ignore */ }
        // Initialize quest data if not present
        if (!this.char.completedQuests) this.char.completedQuests = [];
        if (!this.char.activeQuests) this.char.activeQuests = [];
        // Reconcile equipment bonuses using shared helper (centralized)
        try {
            if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this);
        } catch (e) { /* ignore */ }
        // If the character was just created with startingEquipment, add those items to inventory once
        try {
            const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
            if (char.startingEquipment && Array.isArray(char.startingEquipment) && char.startingEquipment.length > 0) {
                const inv = this.char.inventory = this.char.inventory || [];
                const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                for (const se of char.startingEquipment) {
                    if (!se || !se.id) continue;
                    const def = defs[se.id] || null;
                    const qty = Math.max(1, se.qty || 1);
                    if (def && def.stackable) {
                        let found = inv.find(x => x && x.id === se.id);
                        if (found) found.qty = (found.qty || 0) + qty; else inv.push({ id: se.id, name: (def && def.name) || se.id, qty: qty });
                    } else {
                        // unstackable: only add if not already present to avoid duplicates
                        const exists = inv.find(x => x && x.id === se.id);
                        if (!exists) {
                            for (let i = 0; i < qty; i++) inv.push({ id: se.id, name: (def && def.name) || se.id, qty: 1 });
                        }
                    }
                }
                // remove startingEquipment marker so it doesn't apply again
                delete char.startingEquipment;
                // persist the change
                this._persistCharacter(username);
                // Auto-equip the starter weapon if a starter item exists and weapon slot empty
                try {
                    const starter = defs && defs['starter_sword'] && inv.find(x => x && x.id === 'starter_sword') ? 'starter_sword' :
                                  (defs && defs['starter_staff'] && inv.find(x => x && x.id === 'starter_staff') ? 'starter_staff' :
                                  (defs && defs['starter_dagger'] && inv.find(x => x && x.id === 'starter_dagger') ? 'starter_dagger' :
                                  (defs && defs['starter_dice'] && inv.find(x => x && x.id === 'starter_dice') ? 'starter_dice' : null)));
                    if (starter && !this.char.equipment) this.char.equipment = { head: null, armor: null, legs: null, boots: null, ring1: null, ring2: null, amulet: null, weapon: null, fishing: null, mining: null, woodcutting: null };
                        if (starter && !this.char.equipment.weapon) {
                        // remove one from inventory (unique starter) using slot helper if present
                        try {
                            if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
                                window.__shared_ui.removeItemFromInventory(this, starter, 1);
                            } else {
                                const idx = inv.findIndex(x => x && x.id === starter);
                                if (idx !== -1) inv.splice(idx, 1);
                            }
                        } catch (e) { const idx = inv.findIndex(x => x && x.id === starter); if (idx !== -1) inv.splice(idx,1); }
                        this.char.equipment.weapon = { id: starter, name: (defs && defs[starter] && defs[starter].name) || starter };
                        // apply equipment bonuses so stats reflect equipped starter immediately
                        try { if (window && window.__shared_ui && window.__shared_ui.applyEquipmentBonuses) window.__shared_ui.applyEquipmentBonuses(this, this.char.equipment.weapon); } catch (e) { /* ignore */ }
                        this._persistCharacter(username);
                        // refresh HUD to reflect new vitals
                        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
                    }
                } catch (e) { /* ignore auto-equip errors */ }
            }
        } catch (e) { /* ignore starting equipment apply errors */ }
        // HUD
        this._createHUD();
        // Play town background music via shared background-music manager (respect saved volume)
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.playBackgroundMusic === 'function') {
                const vol = (window.__game_settings && typeof window.__game_settings.musicVolume === 'number') ? window.__game_settings.musicVolume : 0.9;
                window.__shared_ui.playBackgroundMusic(this, 'town_music', { loop: true, volume: vol });
            }
        } catch (e) { /* ignore music play errors */ }
    // Portal on left -> Cave (use shared helper)
    try {
        const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
        const cavePortalX = Math.max(bounds.x1 + 40, 80);
        const cavePortalY = Phaser.Math.Clamp(centerY, bounds.y1 + 40, bounds.y2 - 40);
        const caveObj = portalHelper.createPortal(this, cavePortalX, cavePortalY, {
            depth: 1.5,
            targetScene: 'Cave',
            spawnX: this.scale.width - 140,
            spawnY: cavePortalY,
            promptLabel: 'Enter Cave'
        });
        this.portal = caveObj.display;
        this.cavePortalPos = { x: cavePortalX, y: cavePortalY };
    try { addTimeEvent(this, { delay: 220, callback: () => { if (caveObj && caveObj.tryUpgrade) caveObj.tryUpgrade(); } }); } catch (e) {}
    } catch (e) {
        const cavePortalX = Math.max(bounds.x1 + 40, 80);
        const cavePortalY = Phaser.Math.Clamp(centerY, bounds.y1 + 40, bounds.y2 - 40);
        const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
        const caveObj = portalHelper.createPortal(this, cavePortalX, cavePortalY, {
            depth: 1.5,
            targetScene: 'Cave',
            spawnX: this.scale.width - 140,
            spawnY: cavePortalY,
            promptLabel: 'Enter Cave'
        });
        this.portal = caveObj.display;
        this.cavePortalPos = { x: cavePortalX, y: cavePortalY };
    }
    // Portal to Inner Field near the forge
    const fieldPortalX = Math.min(bounds.x2 - 40, this.scale.width - 140);
    const fieldPortalY = Phaser.Math.Clamp(centerY, bounds.y1 + 40, bounds.y2 - 40);
    try {
        const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
        const fieldObj = portalHelper.createPortal(this, fieldPortalX, fieldPortalY, {
            depth: 1.5,
            targetScene: 'InnerField',
            spawnX: Math.max(80, this.scale.width * 0.12),
            spawnY: fieldPortalY,
            promptLabel: 'Inner Field'
        });
        this.fieldPortal = fieldObj.display;
        this.fieldPortalPos = { x: fieldPortalX, y: fieldPortalY };
    try { addTimeEvent(this, { delay: 220, callback: () => { if (fieldObj && fieldObj.tryUpgrade) fieldObj.tryUpgrade(); } }); } catch (e) {}
    } catch (e) {
        const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
        const fieldObj = portalHelper.createPortal(this, fieldPortalX, fieldPortalY, {
            depth: 1.5,
            targetScene: 'InnerField',
            spawnX: Math.max(80, this.scale.width * 0.12),
            spawnY: fieldPortalY,
            promptLabel: 'Inner Field'
        });
        this.fieldPortal = fieldObj.display;
        this.fieldPortalPos = { x: fieldPortalX, y: fieldPortalY };
    }
    // Furnace on right side (combine ores into bars)
    const furnaceX = Math.min(bounds.x2 - 60, Math.round(this.scale.width * 0.78));
    const furnaceY = Phaser.Math.Clamp(Math.round(centerY + 20), bounds.y1 + 40, bounds.y2 - 40);
    // animation only needs to be registered once; choose end frame dynamically based on loaded texture
        // create furnace sprite via shared helper
        try {
            if (window && window.__furnace_shared && window.__furnace_shared.createFurnace) {
                window.__furnace_shared.createFurnace(this, furnaceX, furnaceY);
            } else {
                this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5);
            }
        } catch (e) {
            try { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); } catch (_) {}
        }
    this.furnacePrompt = this.add.text(furnaceX, furnaceY - 60, '[E] Use Furnace', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.furnacePrompt.setVisible(false);
    // furnace animation will indicate active state (no separate emoji indicator)
    // separate workbench indicator
    const workbenchX = centerX + 120;
    const workbenchY = furnaceY + 6;
    this._workbenchIndicator = this.add.text(workbenchX, workbenchY - 28, '⚒️', { fontSize: '18px' }).setOrigin(0.5).setDepth(2);
    this._workbenchIndicator.setVisible(false);
    // create and place workbench slightly left of the furnace
    this._createWorkbench(workbenchX, workbenchY);
    // storage chest (shared across account)
    const chestX = workbenchX - 200;
    const chestY = workbenchY;
    this.storageChest = this.add.rectangle(chestX, chestY, 48, 40, 0x443366, 1).setDepth(1.5);
    this.storageChestPrompt = this.add.text(chestX, chestY - 48, '[E] Open Storage', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.storageChestPrompt.setVisible(false);
    // shop (near storage chest)
    const shopX = chestX - 120;
    const shopY = chestY;
    this.shop = this.add.rectangle(shopX, shopY, 48, 40, 0x8B4513, 1).setDepth(1.5);
    this.shopPrompt = this.add.text(shopX, shopY - 48, '[E] Visit Shop', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.shopPrompt.setVisible(false);
    // shop inventory (pulling from ITEM_DEFS)
    this.shopInventory = [
        'copper_pickaxe',
        'copper_hatchet',
        'basic_rod',
        'rusty_rod',
        'good_rod',
        'minor_health_potion',
        'minor_mana_potion'
    ];
    // smithing skill on character
    if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };
    // furnace smelting cadence (shared helper reads this delay)
    this.smeltingInterval = 2800; // ms per bar (matches mining)
    // crafting (workbench) state - supports continuous crafting like furnace
    this.craftingActive = false;
    this._craftingEvent = null;
    this._craftType = null;
    this.craftingInterval = 2800; // ms per craft (same pace as smelting)
    // Mayor Grimsley NPC
    this._ensureMayorAnimations();
    const mayorX = centerX;
    const mayorY = centerY - 50;
    this.mayor = this.add.sprite(mayorX, mayorY, 'grimsley_idle').setOrigin(0.5, 0.9).setDepth(1.5);
    this._playMayorAnimation('idle', 'down');
    // register quest indicator for Mayor via shared helper
    try {
        if (window && window.__shared_ui && typeof window.__shared_ui.registerQuestIndicators === 'function') {
            window.__shared_ui.registerQuestIndicators(this, { 'mayor_grimsley': this.mayor });
        }
    } catch (e) {}
    // Mark any travel objectives for Town on scene entry (so "travel to Town" objectives
    // are registered/updated when the player arrives). This mirrors other scenes that
    // tick travel progress on entry (e.g. Cave, GraveForest).
    try { updateQuestProgress && updateQuestProgress(this.char, 'travel', 'Town', 1); } catch (e) {}
    this.mayorState = {
        home: { x: mayorX, y: mayorY },
        radius: 110,
        speed: 32,
        facing: 'down',
        target: null,
        idleUntil: this.time.now + Phaser.Math.Between(1400, 2800)
    };
    this.mayorPrompt = this.add.text(mayorX, mayorY - 68, '[E] Talk to Mayor Grimsley', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 }, align: 'center' }).setOrigin(0.5).setDepth(2);
    this.mayorPrompt.setVisible(false);
        // cleanup on shutdown
        this.events.once('shutdown', () => {
            clearActivity(this, { silent: true });
            setSceneKey(null);
            this._destroyHUD();
            try { if (this._overlays && this._overlays.destroy) { this._overlays.destroy(); this._overlays = null; } } catch (e) {}
            cleanupAmbientFx(this);
            // cleanup furnace modal and toasts
            this._closeFurnaceModal();
            // ensure furnace animation stopped
            try { if (window && window.__furnace_shared && window.__furnace_shared.setFurnaceFlame) window.__furnace_shared.setFurnaceFlame(this, false); } catch(e) {}
            this._closeWorkbenchModal();
            // ensure continuous crafting loop is stopped if active
            try { this._stopContinuousCrafting(true); } catch (e) {}
            this._closeInventoryModal();
            this._closeDialogueOverlay();
            this._clearToasts();
            if (this._workbenchIndicator && this._workbenchIndicator.destroy) { this._workbenchIndicator.destroy(); this._workbenchIndicator = null; }
            if (this.mayor && this.mayor.destroy) { this.mayor.destroy(); }
            this.mayor = null;
            this.mayorState = null;
            if (this.mayorPrompt && this.mayorPrompt.destroy) { this.mayorPrompt.destroy(); this.mayorPrompt = null; }
    this._stopSafeZoneRegen();

    // Remove key handlers
    if (this._keyHandlers) {
        if (this._keyHandlers.i) this.input.keyboard.off('keydown-I', this._keyHandlers.i);
        if (this._keyHandlers.u) this.input.keyboard.off('keydown-U', this._keyHandlers.u);
        if (this._keyHandlers.x) this.input.keyboard.off('keydown-X', this._keyHandlers.x);
        if (this._keyHandlers.q) this.input.keyboard.off('keydown-Q', this._keyHandlers.q);
        if (this._keyHandlers.t) this.input.keyboard.off('keydown-T', this._keyHandlers.t);
    }
});
    }
    // --- Workbench (crafting) ---
    // Place a workbench in the town near the furnace
    _createWorkbench(x, y) {
        this.workbench = this.add.rectangle(x, y, 64, 40, 0x4b6b2f, 1).setDepth(1.5);
        this.workbenchPrompt = this.add.text(x, y - 48, '[E] Use Workbench', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.workbenchPrompt.setVisible(false);
    }
    _openWorkbenchModal() {
        return workbench.openWorkbench(this);
    }

    _closeWorkbenchModal() {
        workbench.closeWorkbench(this);
    }

    _refreshWorkbenchModal() {
        workbench.refreshWorkbench(this);
    }

    _cancelWorkbenchCraft(silent = false) {
        workbench.cancelWorkbench(this, silent);
    }
    _startContinuousCrafting(recipeId) {
        if (this.craftingActive) return;
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const recipe = recipes[recipeId];
        if (!recipe) { this._showToast('Unknown recipe'); return; }
        if (this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1)) { this._showToast('Smithing level too low'); return; }
        // Check requirements now — if missing, don't start the loop. We wait the interval
        // before granting the first crafted item (user requested behavior).
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        let ok = true;
        for (const req of (recipe.requires || [])) {
            if (findQty(req.id) < (req.qty || 1)) { ok = false; break; }
        }
        if (!ok) { this._showToast('Missing materials'); return; }
        this.craftingActive = true;
        this._craftType = recipeId;
        setSceneActivity(this, 'smithing', { source: 'smithing-start', timeout: 0 });
        // schedule first crafting after the interval (no immediate grant)
        try {
            this._craftingEvent = addTimeEvent(this, { delay: this.craftingInterval, callback: this._attemptCraft, callbackScope: this, args: [recipeId], loop: true });
        } catch (e) {
            // fallback if cleanup manager unavailable
            this._craftingEvent = this.time.addEvent({ delay: this.craftingInterval, callback: this._attemptCraft, callbackScope: this, args: [recipeId], loop: true });
        }
        this._showToast('Started crafting ' + (recipe.name || recipeId));
        // show workbench indicator
        if (this.workbench && this._workbenchIndicator) {
            this._workbenchIndicator.setVisible(true);
        }
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
    _stopContinuousCrafting() {
        if (!this.craftingActive) return;
        this.craftingActive = false;
        if (this._craftingEvent) {
            try {
                // supports disposer function (from cleanupManager.addTimeEvent) or Phaser.Time.TimerEvent
                if (typeof this._craftingEvent === 'function') { this._craftingEvent(); }
                else if (this._craftingEvent.remove) { this._craftingEvent.remove(false); }
            } catch (e) {}
            this._craftingEvent = null;
        }
        this._showToast('Crafting stopped');
        this._craftType = null;
    if (this._workbenchIndicator) this._workbenchIndicator.setVisible(false);
        clearActivity(this);
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
        // avoid re-creating HUD in tight loops; recreate once on stop
    }
    _attemptCraft(recipeId) {
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const recipe = recipes[recipeId];
        if (!recipe) { this._showToast('Unknown recipe'); return; }
        // level check
        if (this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1)) { this._showToast('Smithing level too low'); return; }
        setSceneActivity(this, 'smithing', { silent: true, timeout: 0, source: 'smithing-refresh' });
        // check requirements
        const inv = this.char.inventory = this.char.inventory || [];
        const find = (id) => {
            if (window && window.__shared_ui && window.__shared_ui.initSlots) {
                const slots = window.__shared_ui.initSlots(this.char.inventory || []);
                return slots.find(x => x && x.id === id);
            }
            return inv.find(x => x && x.id === id);
        };
        for (const req of (recipe.requires || [])) {
            const have = (find(req.id) && find(req.id).qty) || 0;
            if (have < (req.qty || 1)) {
                // If we're currently crafting this recipe, fully stop crafting (remove active flag,
                // clear the scheduled event, hide indicator, and refresh UI). This ensures the
                // Stop button does not remain showing when materials are gone.
                if (this.craftingActive && this._craftType === recipeId) {
                    this._stopContinuousCrafting();
                    const el = (this._workbenchModal && this._workbenchModal.querySelector) ? this._workbenchModal.querySelector('#workbench-msg') : null;
                    if (el) el.textContent = 'Out of materials; crafting stopped.';
                    return;
                }
                this._showToast('Missing materials');
                return;
            }
        }
        // consume materials
        // consume materials (use slot helpers where available)
        for (const req of (recipe.requires || [])) {
            const qtyNeeded = (req.qty || 1);
            if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
                const ok = window.__shared_ui.removeItemFromInventory(this, req.id, qtyNeeded);
                if (!ok) {
                    if (this.craftingActive && this._craftType === recipeId) {
                        this._stopContinuousCrafting();
                        const el = (this._workbenchModal && this._workbenchModal.querySelector) ? this._workbenchModal.querySelector('#workbench-msg') : null;
                        if (el) el.textContent = 'Out of materials; crafting stopped.';
                        return;
                    }
                    this._showToast('Missing materials');
                    return;
                }
            } else {
                const it = find(req.id);
                if (it) {
                    it.qty -= qtyNeeded;
                    if (it.qty <= 0) {
                        // if slot helpers exist, remove by id to ensure consistent slot array compaction
                        if (window && window.__shared_ui && window.__shared_ui.removeItemFromSlots) {
                            window.__shared_ui.removeItemFromSlots(inv, req.id, 0); // remove all of this id
                        } else {
                            inv.splice(inv.indexOf(it), 1);
                        }
                    }
                }
            }
        }
        // give crafted item (non-stackable weapon, push as separate entry)
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const def = defs && defs[recipeId];
        // give crafted item (slot-aware if helpers exist)
        if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) {
            const added = window.__shared_ui.addItemToInventory(this, recipeId, 1);
            if (!added) this._showToast('Not enough inventory space');
        } else {
            if (def && def.stackable) {
                let ex = find(recipeId);
                if (ex) ex.qty = (ex.qty || 0) + 1; else inv.push({ id: recipeId, name: def.name || recipe.name, qty: 1 });
            } else {
                inv.push({ id: recipeId, name: (def && def.name) || recipe.name, qty: 1 });
            }
        }
        // smithing xp
    this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
    this.char.smithing.exp = (this.char.smithing.exp || 0) + (recipe.smithingXp || 0);
    // refresh stats modal if open (smithing xp shown in skills)
    try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
        while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
            this.char.smithing.exp -= this.char.smithing.expToLevel;
            this.char.smithing.level = (this.char.smithing.level || 1) + 1;
            this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
            try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'smithing', 1); } catch(e) {}
            this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
        }
    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
    this._persistCharacter(username);
    this._showToast('Crafted 1x ' + (recipe.name || recipeId));
    // refresh only modal and inventory UI; avoid full HUD re-create each tick
    if (this._workbenchModal) this._refreshWorkbenchModal();
    if (this._inventoryModal) this._refreshInventoryModal();
    }
    // Inventory modal is centralized in shared UI; keep wrappers for compatibility
    _openInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.openInventoryModal) return window.__shared_ui.openInventoryModal(this); }
    _closeInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.closeInventoryModal) return window.__shared_ui.closeInventoryModal(this); }
    _refreshInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal) return window.__shared_ui.refreshInventoryModal(this); }
    // Equipment functions delegate to shared UI/helpers
    _openEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.openEquipmentModal) return window.__shared_ui.openEquipmentModal(this); }
    _closeEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.closeEquipmentModal) return window.__shared_ui.closeEquipmentModal(this); }
    _refreshEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.refreshEquipmentModal) return window.__shared_ui.refreshEquipmentModal(this); }
    _equipItemFromInventory(itemId) { if (window && window.__shared_ui && window.__shared_ui.equipItemFromInventory) return window.__shared_ui.equipItemFromInventory(this, itemId); }
    _unequipItem(slot) { if (window && window.__shared_ui && window.__shared_ui.unequipItem) return window.__shared_ui.unequipItem(this, slot); }
    _applyEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.applyEquipmentBonuses) return window.__shared_ui.applyEquipmentBonuses(this, eq); }
    _removeEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.removeEquipmentBonuses) return window.__shared_ui.removeEquipmentBonuses(this, eq); }
    // --- Toasts (small copy of Cave's toast helper) ---
    _showToast(text, timeout = 1600) {
        if (!this._toastContainer) {
            this._toastContainer = document.createElement('div');
            this._toastContainer.style.position = 'fixed';
            this._toastContainer.style.bottom = '14px';
            this._toastContainer.style.left = '50%';
            this._toastContainer.style.transform = 'translateX(-50%)';
            this._toastContainer.style.zIndex = '210';
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
    // Furnace UI handled by shared helper
    _openFurnaceModal() {
        try {
            if (window && window.__furnace_shared && window.__furnace_shared.openFurnace) {
                window.__furnace_shared.openFurnace(this);
            }
        } catch (e) { /* ignore furnace modal errors */ }
    }
    _closeFurnaceModal() {
        try {
            if (window && window.__furnace_shared && window.__furnace_shared.closeFurnace) {
                window.__furnace_shared.closeFurnace(this);
            }
            if (window && window.__furnace_shared && window.__furnace_shared.cancelSmelting) {
                window.__furnace_shared.cancelSmelting(this, true);
            }
        } catch (e) { /* ignore furnace modal errors */ }
    }
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
                        // Replace the stored character object with the full current character state
                        userObj.characters[i] = this.char;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    for (let i = 0; i < userObj.characters.length; i++) {
                        if (!userObj.characters[i]) { userObj.characters[i] = this.char; found = true; break; }
                    }
                    if (!found) userObj.characters.push(this.char);
                }
                localStorage.setItem(key, JSON.stringify(userObj));
            }
        } catch (e) { console.warn('Could not persist character', e); }
        // If the inventory modal is open, refresh it so UI updates live after changes
        try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) { /* ignore */ }
    }
    // --- Shared account storage helpers ---
    _getAccountStorage(username) {
        if (!username) return [];
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key));
            if (userObj && userObj.storage) return userObj.storage;
        } catch (e) { /* ignore */ }
        // default: return empty slot array
        return Array.from({length:50}).map(_=>null);
    }
    _setAccountStorage(username, storageArr) {
        if (!username) return;
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key)) || { characters: [] };
            userObj.storage = storageArr || Array.from({length:50}).map(_=>null);
            localStorage.setItem(key, JSON.stringify(userObj));
        } catch (e) { console.warn('Could not set account storage', e); }
    }
    // --- Storage chest modal ---
    _openStorageModal() {
        if (this._storageModal) return;
        const inv = this.char.inventory || [];
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const storage = this._getAccountStorage(username) || Array.from({length:50}).map(_=>null);
        const modal = document.createElement('div');
        modal.id = 'storage-modal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%,-50%)';
        modal.style.zIndex = '240';
        modal.style.background = 'linear-gradient(135deg,#1b1624, #0b0810)';
        modal.style.padding = '14px';
        modal.style.borderRadius = '12px';
        modal.style.color = '#fff';
        modal.style.minWidth = '420px';
        modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Account Storage</strong><button id='storage-close' style='background:#222;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;'>Close</button></div><div style='display:flex;gap:12px;'><div style='flex:1;'><div style='font-size:0.9em;margin-bottom:6px;'>Your Inventory</div><div id='storage-inv' class='grid-scroll'><div id='storage-inv-grid' class='slot-grid'></div></div></div><div style='width:12px'></div><div style='flex:1;'><div style='font-size:0.9em;margin-bottom:6px;'>Shared Storage</div><div id='storage-box' class='grid-scroll'><div id='storage-box-grid' class='slot-grid'></div></div></div></div>`;
        document.body.appendChild(modal);
        this._storageModal = modal;
        document.getElementById('storage-close').onclick = () => this._closeStorageModal();
        this._refreshStorageModal();
    }
    _closeStorageModal() {
        if (this._storageModal && this._storageModal.parentNode) this._storageModal.parentNode.removeChild(this._storageModal);
        this._storageModal = null;
    try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {}
    }
    // --- Shop modal ---
    _openShopModal() {
        if (this._shopModal) return;
        const modal = document.createElement('div');
        modal.id = 'shop-modal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%,-50%)';
        modal.style.zIndex = '240';
        modal.style.background = 'linear-gradient(135deg,#1b1624, #0b0810)';
        modal.style.padding = '14px';
        modal.style.borderRadius = '12px';
        modal.style.color = '#fff';
        modal.style.minWidth = '420px';
        modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Shop</strong><button id='shop-close' style='background:#222;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;'>Close</button></div><div style='display:flex;gap:12px;'><div style='flex:1;'><div style='font-size:0.9em;margin-bottom:6px;'>Shop Items</div><div id='shop-shop' class='grid-scroll'><div id='shop-shop-grid' class='slot-grid'></div></div></div><div style='width:12px'></div><div style='flex:1;'><div style='font-size:0.9em;margin-bottom:6px;'>Your Inventory</div><div id='shop-inv' class='grid-scroll'><div id='shop-inv-grid' class='slot-grid'></div></div></div></div>`;
        document.body.appendChild(modal);
        this._shopModal = modal;
        document.getElementById('shop-close').onclick = () => this._closeShopModal();
        this._refreshShopModal();
    }
    _closeShopModal() {
        if (this._shopModal && this._shopModal.parentNode) this._shopModal.parentNode.removeChild(this._shopModal);
        this._shopModal = null;
    try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {}
    }
    _refreshShopModal() {
        if (!this._shopModal) return;
        const shopGrid = this._shopModal.querySelector('#shop-shop-grid');
        const invGrid = this._shopModal.querySelector('#shop-inv-grid');
        shopGrid.innerHTML = '';
        invGrid.innerHTML = '';
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const shopItems = this.shopInventory || [];
        const invSlots = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this.char.inventory || []) : Array.from({length:50}).map(_=>null);
        // render shop slots — slots are clickable to Buy
        for (let i = 0; i < shopItems.length; i++) {
            const itemId = shopItems[i];
            const def = defs && defs[itemId];
            const el = document.createElement('div'); el.className = 'slot';
            if (itemId) {
                let iconHtml = '📦';
                if (def) {
                    if (def.icon) iconHtml = "<div class='icon-wrap'><img src='" + def.icon + "' class='item-icon' /></div>";
                    else if (def.weapon) iconHtml = '⚔️';
                    else if (def.armor) iconHtml = '🛡️';
                }
                el.innerHTML = "<div title='" + (def && def.name || itemId) + "'>" + iconHtml + "</div>";
                const label = document.createElement('div'); label.className = 'slot-label'; label.style.cssText = 'font-size:10px;position:absolute;left:6px;bottom:4px;color:#ddd;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                // Use the item's canonical value (item_def.value) when available.
                // Fall back to def.buyPrice or 100 to preserve previous behavior.
                const baseValue = (def && typeof def.value === 'number') ? def.value : (def && def.buyPrice ? def.buyPrice : 100);
                const price = Math.floor(baseValue * 1.1); // 110% of item value
                label.textContent = (def && def.name) || itemId;
                el.appendChild(label);
                const priceLabel = document.createElement('div'); priceLabel.className = 'slot-price'; priceLabel.style.cssText = 'font-size:10px;position:absolute;right:6px;bottom:4px;color:#ffd700;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                priceLabel.textContent = price + 'g';
                el.appendChild(priceLabel);
                el.style.cursor = 'pointer';
                el.addEventListener('click', (ev) => {
                    try {
                        const amount = (ev && ev.shiftKey) ? 1 : 1; // buy one at a time for now
                        this._buyFromShop(itemId, amount);
                    } catch (err) { /* ignore buy errors */ }
                });
                // show item tooltip on hover
                try {
                    el.addEventListener('mouseenter', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(this, { id: itemId, name: def && def.name || itemId }, el); } catch (e) {} });
                    el.addEventListener('mouseleave', () => { try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {} });
                } catch (e) { /* ignore DOM attach errors */ }
            }
            shopGrid.appendChild(el);
        }
        // render inventory slots — slots are clickable to Sell
        for (let i = 0; i < invSlots.length; i++) {
            const s = invSlots[i];
            const el = document.createElement('div'); el.className = 'slot';
            if (s) {
                const def = defs && defs[s.id];
                let iconHtml = '📦';
                if (def) {
                    if (def.icon) iconHtml = "<div class='icon-wrap'><img src='" + def.icon + "' class='item-icon' /></div>";
                    else if (def.weapon) iconHtml = '⚔️';
                    else if (def.armor) iconHtml = '🛡️';
                }
                el.innerHTML = "<div title='" + (s.name || (def && def.name) || s.id) + "'>" + iconHtml + "</div>";
                if (s.qty && s.qty > 1) { const q = document.createElement('div'); q.className='qty'; q.textContent = s.qty; el.appendChild(q); }
                const label = document.createElement('div'); label.className = 'slot-label'; label.style.cssText = 'font-size:10px;position:absolute;left:6px;bottom:4px;color:#ddd;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                // Sell price should be 80% of the item's defined value. Fall back to def.sellPrice or 50.
                const baseSellValue = (def && typeof def.value === 'number') ? def.value : (def && def.sellPrice ? def.sellPrice : 50);
                const sellPrice = Math.floor(baseSellValue * 0.8);
                label.textContent = (def && def.name) || s.name || s.id;
                el.appendChild(label);
                const priceLabel = document.createElement('div'); priceLabel.className = 'slot-price'; priceLabel.style.cssText = 'font-size:10px;position:absolute;right:6px;bottom:4px;color:#ffd700;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                priceLabel.textContent = sellPrice + 'g';
                el.appendChild(priceLabel);
                el.style.cursor = 'pointer';
                el.addEventListener('click', (ev) => {
                    try {
                        const amount = (ev && ev.shiftKey) ? (s.qty || 1) : 1;
                        this._sellToShop(s.id, amount);
                    } catch (err) { /* ignore sell errors */ }
                });
                // show item tooltip on hover
                try {
                    el.addEventListener('mouseenter', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(this, s, el); } catch (e) {} });
                    el.addEventListener('mouseleave', () => { try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {} });
                } catch (e) { /* ignore DOM attach errors */ }
            }
            invGrid.appendChild(el);
        }
    }
    _buyFromShop(itemId, qty = 1) {
        qty = Math.max(1, qty || 1);
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const def = defs && defs[itemId];
    // Charge 110% of the item's defined value when buying from the shop.
    const baseValue = (def && typeof def.value === 'number') ? def.value : (def && def.buyPrice ? def.buyPrice : 100);
    const price = Math.floor(baseValue * 1.1);
    const total = price * qty;
        if ((this.char.gold || 0) < total) { this._showToast('Not enough gold'); return; }
        this.char.gold -= total;
        // add to inventory
        this.char.inventory = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this.char.inventory || []) : Array.from({length:50}).map(_=>null);
        const added = (window && window.__shared_ui && window.__shared_ui.addItemToSlots) ? window.__shared_ui.addItemToSlots(this.char.inventory, itemId, qty) : (function(slots,id,q){ for(let i=0;i<slots.length&&q>0;i++){ if(!slots[i]){ slots[i]={id:id,name:id,qty:1}; q--; } } return q<=0; })(this.char.inventory,itemId,qty);
        if (!added) { this._showToast('Not enough inventory space'); this.char.gold += total; return; }
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);
        this._showToast('Bought ' + qty + 'x ' + ((def && def.name) || itemId) + ' for ' + total + ' gold');
        if (this._shopModal) this._refreshShopModal();
        if (this._inventoryModal) this._refreshInventoryModal();
        try { this._updateHUD(); } catch(e) {}
    }
    _sellToShop(itemId, qty = 1) {
        qty = Math.max(1, qty || 1);
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const def = defs && defs[itemId];
    // Pay the player 80% of the item's defined value when selling to the shop.
    const baseSellValue = (def && typeof def.value === 'number') ? def.value : (def && def.sellPrice ? def.sellPrice : 50);
    const price = Math.floor(baseSellValue * 0.8);
    const total = price * qty;
        // remove from inventory
        this.char.inventory = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this.char.inventory || []) : Array.from({length:50}).map(_=>null);
        const removed = (window && window.__shared_ui && window.__shared_ui.removeItemFromSlots) ? window.__shared_ui.removeItemFromSlots(this.char.inventory, itemId, qty) : (function(slots,id,q){ for(let i=0;i<slots.length&&q>0;i++){const s=slots[i]; if(!s) continue; if(s.id!==id) continue; if(s.qty&&s.qty>q){s.qty-=q; q=0; break;} q-=(s.qty||1); slots[i]=null;} return q<=0;})(this.char.inventory,itemId,qty);
        if (!removed) { this._showToast('Item not found'); return; }
        this.char.gold = (this.char.gold || 0) + total;
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);
        this._showToast('Sold ' + qty + 'x ' + ((def && def.name) || itemId) + ' for ' + total + ' gold');
        if (this._shopModal) this._refreshShopModal();
        if (this._inventoryModal) this._refreshInventoryModal();
        try { this._updateHUD(); } catch(e) {}
    }
    _refreshStorageModal() {
        if (!this._storageModal) return;
        const invGrid = this._storageModal.querySelector('#storage-inv-grid');
        const boxGrid = this._storageModal.querySelector('#storage-box-grid');
        invGrid.innerHTML = '';
        boxGrid.innerHTML = '';
    const invSlots = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this.char.inventory || []) : Array.from({length:50}).map(_=>null);
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
    const storageSlots = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this._getAccountStorage(username) || []) : Array.from({length:50}).map(_=>null);
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        // render inventory slots — slots are clickable to Deposit
        for (let i = 0; i < invSlots.length; i++) {
            const s = invSlots[i];
            const el = document.createElement('div'); el.className = 'slot';
            if (s) {
                const def = defs && defs[s.id];
                let iconHtml = '📦';
                if (def) {
                    if (def.icon) iconHtml = "<div class='icon-wrap'><img src='" + def.icon + "' class='item-icon' /></div>";
                    else if (def.weapon) iconHtml = '⚔️';
                    else if (def.armor) iconHtml = '🛡️';
                }
                // include icon and a small label for the item name; label uses pointer-events:none so clicks hit the slot
                el.innerHTML = "<div title='" + (s.name || (def && def.name) || s.id) + "'>" + iconHtml + "</div>";
                if (s.qty && s.qty > 1) { const q = document.createElement('div'); q.className='qty'; q.textContent = s.qty; el.appendChild(q); }
                const label = document.createElement('div'); label.className = 'slot-label'; label.style.cssText = 'font-size:10px;position:absolute;left:6px;bottom:4px;color:#ddd;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                label.textContent = (def && def.name) || s.name || s.id;
                el.appendChild(label);
                el.style.cursor = 'pointer';
                // click the slot to deposit one
                try {
                    el.addEventListener('click', (ev) => {
                        try {
                            const amount = (ev && ev.shiftKey) ? (s.qty || 1) : 1;
                            this._depositToStorage(s.id, amount);
                        } catch (err) { /* ignore deposit errors */ }
                    });
                } catch (e) {}
                // show item tooltip on hover
                try {
                    el.addEventListener('mouseenter', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(this, s, el); } catch (e) {} });
                    el.addEventListener('mouseleave', () => { try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {} });
                } catch (e) { /* ignore DOM attach errors */ }
            }
            invGrid.appendChild(el);
        }
        // render storage slots — slots are clickable to Withdraw
        for (let i = 0; i < storageSlots.length; i++) {
            const s = storageSlots[i];
            const el = document.createElement('div'); el.className = 'slot';
            if (s) {
                const def = defs && defs[s.id];
                let iconHtml = '📦';
                if (def) {
                    if (def.icon) iconHtml = "<div class='icon-wrap'><img src='" + def.icon + "' class='item-icon' /></div>";
                    else if (def.weapon) iconHtml = '⚔️';
                    else if (def.armor) iconHtml = '🛡️';
                }
                el.innerHTML = "<div title='" + (s.name || (def && def.name) || s.id) + "'>" + iconHtml + "</div>";
                if (s.qty && s.qty > 1) { const q = document.createElement('div'); q.className='qty'; q.textContent = s.qty; el.appendChild(q); }
                const label = document.createElement('div'); label.className = 'slot-label'; label.style.cssText = 'font-size:10px;position:absolute;left:6px;bottom:4px;color:#ddd;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                label.textContent = (def && def.name) || s.name || s.id;
                el.appendChild(label);
                el.style.cursor = 'pointer';
                // click the slot to withdraw one
                try {
                    el.addEventListener('click', (ev) => {
                        try {
                            const amount = (ev && ev.shiftKey) ? (s.qty || 1) : 1;
                            this._withdrawFromStorage(s.id, amount);
                        } catch (err) { /* ignore withdraw errors */ }
                    });
                } catch (e) {}
                // show item tooltip on hover
                try {
                    el.addEventListener('mouseenter', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(this, s, el); } catch (e) {} });
                    el.addEventListener('mouseleave', () => { try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {} });
                } catch (e) { /* ignore DOM attach errors */ }
            }
            boxGrid.appendChild(el);
        }
    }
    _depositToStorage(itemId, qty = 1) {
        qty = Math.max(1, qty || 1);
        // remove from inventory slots and add to storage slots
    this.char.inventory = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this.char.inventory || []) : Array.from({length:50}).map(_=>null);
    const removed = (window && window.__shared_ui && window.__shared_ui.removeItemFromSlots) ? window.__shared_ui.removeItemFromSlots(this.char.inventory, itemId, qty) : (function(slots,id,q){ for(let i=0;i<slots.length&&q>0;i++){const s=slots[i]; if(!s) continue; if(s.id!==id) continue; if(s.qty&&s.qty>q){s.qty-=q; q=0; break;} q-=(s.qty||1); slots[i]=null;} return q<=0;})(this.char.inventory,itemId,qty);
        if (!removed) { this._showToast('Item not found'); return; }
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
    const storage = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this._getAccountStorage(username) || []) : Array.from({length:50}).map(_=>null);
    const added = (window && window.__shared_ui && window.__shared_ui.addItemToSlots) ? window.__shared_ui.addItemToSlots(storage, itemId, qty) : (function(slots,id,q){ while(q>0){ let placed=false; for(const s of slots){ if(s && s.id===id){ const can= (999999)-(s.qty||0); const take=Math.min(can,q); if(take>0){ s.qty=(s.qty||0)+take; q-=take; placed=true; if(q<=0) return true; } } } for(let i=0;i<slots.length&&q>0;i++){ if(!slots[i]){ const put=q; slots[i]={id:id,name:id,qty:put}; q-=put; placed=true; } } if(!placed) break; } return q<=0; })(storage,itemId,qty);
        if (!added) { this._showToast('Not enough storage space'); return; }
        this._setAccountStorage(username, storage);
        this._persistCharacter(username);
        this._showToast('Deposited ' + qty + 'x ' + ((window && window.ITEM_DEFS && window.ITEM_DEFS[itemId] && window.ITEM_DEFS[itemId].name) || itemId));
        if (this._storageModal) this._refreshStorageModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }
    _withdrawFromStorage(itemId, qty = 1) {
        qty = Math.max(1, qty || 1);
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
    const storage = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this._getAccountStorage(username) || []) : Array.from({length:50}).map(_=>null);
    const removed = (window && window.__shared_ui && window.__shared_ui.removeItemFromSlots) ? window.__shared_ui.removeItemFromSlots(storage, itemId, qty) : (function(slots,id,q){ for(let i=0;i<slots.length&&q>0;i++){ const s=slots[i]; if(!s) continue; if(s.id!==id) continue; if(s.qty&&s.qty>q){ s.qty-=q; q=0; break;} q-=(s.qty||1); slots[i]=null;} return q<=0;})(storage,itemId,qty);
        if (!removed) { this._showToast('Not enough in storage'); return; }
        this._setAccountStorage(username, storage);
        // add to inventory
    this.char.inventory = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(this.char.inventory || []) : Array.from({length:50}).map(_=>null);
    const added = (window && window.__shared_ui && window.__shared_ui.addItemToSlots) ? window.__shared_ui.addItemToSlots(this.char.inventory, itemId, qty) : (function(slots,id,q){ for(let i=0;i<slots.length&&q>0;i++){ if(!slots[i]){ slots[i]={id:id,name:id,qty:1}; q--; } } return q<=0; })(this.char.inventory,itemId,qty);
        if (!added) { this._showToast('Not enough inventory space'); return; }
        this._persistCharacter(username);
        this._showToast('Withdrew ' + qty + 'x ' + ((window && window.ITEM_DEFS && window.ITEM_DEFS[itemId] && window.ITEM_DEFS[itemId].name) || itemId));
        if (this._storageModal) this._refreshStorageModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }
    // (Fog helpers removed – superseded by Phaser particle fog)

    _startSafeZoneRegen() {
        const regenDelay = 1800;
        if (this.safeRegenEvent) this.safeRegenEvent.remove(false);
        try {
            this.safeRegenEvent = addTimeEvent(this, { delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
        } catch (e) {
            this.safeRegenEvent = this.time.addEvent({ delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
        }
    }

    _stopSafeZoneRegen() {
        if (this.safeRegenEvent) {
            try {
                if (typeof this.safeRegenEvent === 'function') { this.safeRegenEvent(); }
                else if (this.safeRegenEvent.remove) { this.safeRegenEvent.remove(false); }
            } catch (e) {}
            this.safeRegenEvent = null;
        }
    }

    _tickSafeZoneRegen() {
        if (!this.char) return;
        try { applySafeZoneRegen(this); } catch (e) {}
    }

    // --- HUD helpers ---
    _createHUD() {
        if (window && window.__hud_shared && window.__hud_shared.createHUD) return window.__hud_shared.createHUD(this);
    }

    _destroyHUD() {
        if (window && window.__hud_shared && window.__hud_shared.destroyHUD) return window.__hud_shared.destroyHUD(this);
    }

    _updateHUD() {
        if (window && window.__hud_shared && window.__hud_shared.updateHUD) return window.__hud_shared.updateHUD(this);
        try { return this._destroyHUD(); } catch (e) {}
        try { return this._createHUD(); } catch (e) {}
    }

    _ensureMayorAnimations() {
        const directions = ['up', 'left', 'down', 'right'];
        const sheets = [
            { key: 'grimsley_idle', base: 'grimsley_idle', frameRate: 3, repeat: -1 },
            { key: 'grimsley_walk', base: 'grimsley_walk', frameRate: 6, repeat: -1 },
            { key: 'grimsley_run', base: 'grimsley_run', frameRate: 10, repeat: -1 }
        ];
        for (const sheet of sheets) {
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
                this.anims.create({
                    key: animKey,
                    frames: this.anims.generateFrameNumbers(sheet.key, { start, end }),
                    frameRate: sheet.frameRate,
                    repeat: sheet.repeat
                });
            });
        }
    }

    _playMayorAnimation(mode, facing) {
        const sprite = this.mayor;
        if (!sprite || !this.anims) return;
        const key = `grimsley_${mode}_${facing}`;
        if (!this.anims.exists(key)) return;
        const current = sprite.anims && sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null;
        if (current !== key) sprite.anims.play(key, true);
    }

    _updateMayorAI(time, delta) {
        if (!this.mayor || !this.mayorState) return;
        const sprite = this.mayor;
        const state = this.mayorState;
        const now = (typeof time === 'number') ? time : (this.time ? this.time.now : 0);
        const dt = (typeof delta === 'number') ? delta : 16.6;

        if (this._activeDialogueNpc === 'mayor') {
            state.target = null;
            state.idleUntil = now + 200;
            this._playMayorAnimation('idle', state.facing || 'down');
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
                this._playMayorAnimation('idle', state.facing || 'down');
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                sprite.x += nx * step;
                sprite.y += ny * step;
                let facing;
                if (Math.abs(dx) > Math.abs(dy)) facing = dx < 0 ? 'left' : 'right';
                else facing = dy < 0 ? 'up' : 'down';
                state.facing = facing;
                this._playMayorAnimation('walk', facing);
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
                this._playMayorAnimation('idle', state.facing || 'down');
            }
        }

        if (this.mayorPrompt) {
            this.mayorPrompt.setPosition(sprite.x, sprite.y - 68);
        }

            // indicators for mayor are handled by the shared UI helper

        if (sprite.setDepth) {
            const depth = 1 + (sprite.y / Math.max(1, this.scale.height)) * 1.2;
            sprite.setDepth(depth);
        }
    }

    update(time, delta) {
        if (typeof delta !== 'number') delta = (this.game && this.game.loop && this.game.loop.delta) ? this.game.loop.delta : 16.6;
        if (typeof time !== 'number') time = this.time ? this.time.now : 0;
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.22 });
        if (!movement) return;
        if (!this._attacking) playDirectionalAnimation(this, movement);
        // Zelda-like depth ordering: depth = y so entities overlap naturally
        try {
            // Decorations should render behind interactive objects (portal, furnace, chest, workbench).
            // Set decorations to a low fixed depth with a tiny per-item variance so they overlap lightly with each other but stay behind UI objects.
            if (this._decorations) {
                for (const d of this._decorations) {
                    try {
                        const base = 0.6;
                        const variance = ((d.y || 0) / Math.max(1, this.scale.height)) * 0.2; // small variation
                        if (d && d.display && typeof d.display.setDepth === 'function') d.display.setDepth(base + variance);
                    } catch (e) { /* ignore */ }
                }
            }
            // Player depth: map player's y to a small depth range so player can appear above/below decorations but remains under interactive objects.
            try {
                updateDepthForTopDown(this, { min: 0.9, max: 2.4 });
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore depth ordering errors */ }
        this._updateMayorAI(time, delta);
        // Portal interactions (cave, inner field) are handled by the shared portal helper
        // Furnace interaction: proximity + E to open smelting UI
        if (this.furnace) {
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
                // if modal open and walked away, close it
                if (this._furnaceModal) this._closeFurnaceModal();
            }
        }
        // Workbench interaction: proximity + E to open crafting UI
        if (this.workbench) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const wdist = Phaser.Math.Distance.Between(_px, _py, this.workbench.x, this.workbench.y);
            if (wdist <= 56) {
                if (this.workbenchPrompt) this.workbenchPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    this._openWorkbenchModal();
                }
            } else {
                if (this.workbenchPrompt) this.workbenchPrompt.setVisible(false);
                if (this._workbenchModal) this._closeWorkbenchModal();
            }
        }
        // Storage chest interaction
        if (this.storageChest) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const sdist = Phaser.Math.Distance.Between(_px, _py, this.storageChest.x, this.storageChest.y);
            if (sdist <= 56) {
                if (this.storageChestPrompt) this.storageChestPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    this._openStorageModal();
                }
            } else {
                if (this.storageChestPrompt) this.storageChestPrompt.setVisible(false);
                if (this._storageModal) this._closeStorageModal();
            }
        }

        // Shop interaction
        if (this.shop) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const sdist = Phaser.Math.Distance.Between(_px, _py, this.shop.x, this.shop.y);
            if (sdist <= 56) {
                if (this.shopPrompt) this.shopPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    this._openShopModal();
                }
            } else {
                if (this.shopPrompt) this.shopPrompt.setVisible(false);
                if (this._shopModal) this._closeShopModal();
            }
        }

        // Mayor interaction
        if (this.mayor) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const mdist = Phaser.Math.Distance.Between(_px, _py, this.mayor.x, this.mayor.y);
            if (mdist <= 56) {
                this.mayorPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    this._openMayorDialogue();
                }
            } else {
                this.mayorPrompt.setVisible(false);
                if (this._activeDialogueNpc === 'mayor') this._closeDialogueOverlay();
            }
        }
    }
    // Equipment modal UI
    _openEquipmentModal() {
        if (this._equipmentModal) return;
        const modal = document.createElement('div');
        modal.id = 'equipment-modal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%,-50%)';
        modal.style.zIndex = '235';
        modal.style.background = 'linear-gradient(135deg,#1a1a1f, #0f0f12)';
        modal.style.padding = '12px';
        modal.style.borderRadius = '12px';
        modal.style.color = '#fff';
        modal.style.minWidth = '360px';
        const slots = this.char.equipment || { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null, fishing:null, mining:null, woodcutting:null };
        let html = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Equipment</strong><button id='equip-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='equip-list' style='display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto;'></div>`;
        modal.innerHTML = html;
        document.body.appendChild(modal);
        this._equipmentModal = modal;
        document.getElementById('equip-close').onclick = () => this._closeEquipmentModal();
        this._refreshEquipmentModal();
    }
    _closeEquipmentModal() {
        if (this._equipmentModal && this._equipmentModal.parentNode) this._equipmentModal.parentNode.removeChild(this._equipmentModal);
        this._equipmentModal = null;
    }
    _refreshEquipmentModal() {
        if (!this._equipmentModal) return;
        const container = this._equipmentModal.querySelector('#equip-list');
        container.innerHTML = '';
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const equip = this.char.equipment || { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null, fishing:null, mining:null, woodcutting:null };
        const slots = ['weapon','head','armor','legs','boots','ring1','ring2','amulet'];
        for (const s of slots) {
            const eq = equip[s];
            const el = document.createElement('div'); el.style.display='flex'; el.style.justifyContent='space-between'; el.style.alignItems='center'; el.style.padding='6px'; el.style.background='rgba(255,255,255,0.02)'; el.style.borderRadius='8px';
            const left = document.createElement('div');
            const eqName = eq && defs[eq.id] ? defs[eq.id].name : (eq ? eq.name : 'Empty');
            let eqBonus = '';
            if (eq && defs && defs[eq.id] && defs[eq.id].statBonus) {
                const parts = [];
                for (const k of Object.keys(defs[eq.id].statBonus)) parts.push('+' + defs[eq.id].statBonus[k] + ' ' + k.toUpperCase());
                eqBonus = parts.join(' • ');
            }
            left.innerHTML = `<strong>${s.toUpperCase()}</strong><div style='font-size:0.85em;color:#ccc;'>${eqName}${eqBonus ? ' • ' + eqBonus : ''}</div>`;
            const right = document.createElement('div');
            if (eq) {
                const btn = document.createElement('button'); btn.textContent = 'Unequip'; btn.style.padding='6px 8px'; btn.style.border='none'; btn.style.borderRadius='6px'; btn.style.cursor='pointer';
                btn.onclick = () => { this._unequipItem(s); this._refreshEquipmentModal(); };
                right.appendChild(btn);
            }
            el.appendChild(left); el.appendChild(right); container.appendChild(el);
        }
    }
    // --- Mayor dialogue for quests ---
    _openMayorDialogue() {
        this._activeDialogueNpc = 'mayor';
        try { updateQuestProgress && updateQuestProgress(this.char, 'travel', 'Town', 1); } catch (e) {}
        try { updateQuestProgress && updateQuestProgress(this.char, 'talk', 'mayor_grimsley', 1); } catch (e) {}
        const questDefs = (window && window.QUEST_DEFS) ? window.QUEST_DEFS : {};
        const available = getAvailableQuests(this.char, 'Town').filter(q => q.giver === 'mayor_grimsley');
        // Active quests relevant to the Mayor for hand-in OR for tracking (giver)
        const allActive = Array.isArray(this.char.activeQuests) ? (this.char.activeQuests || []) : [];
        // Quests started from the Mayor (for progress discussion)
        const activeFromMayor = allActive.filter(entry => {
            const def = questDefs[entry.id];
            return !!(def && def.giver === 'mayor_grimsley');
        });
        // Quests whose hand-in is the Mayor (should show as turn-in ready here)
        const activeHandInAtMayor = allActive.filter(entry => {
            const def = questDefs[entry.id];
            return !!(def && def.handInNpc === 'mayor_grimsley');
        });
        const ready = activeHandInAtMayor.find(entry => checkQuestCompletion(this.char, entry.id));
        const nextAvailable = available[0] || null;
        const activeQuest = activeFromMayor.find(entry => !checkQuestCompletion(this.char, entry.id)) || null;

        const bodyNodes = [];
        const optionConfigs = [];

        if (ready) {
            const def = questDefs[ready.id] || {};
            bodyNodes.push(this._createDialogueParagraph(`Ah, you're back! Have you finished ${def.name || ready.id}?`));
            const list = this._buildObjectiveList(def, getQuestObjectiveState(this.char, ready.id));
            if (list) bodyNodes.push(list);
            optionConfigs.push({
                label: `Turn in "${def.name || ready.id}"`,
                onClick: () => this._completeMayorQuest(ready.id)
            });
            optionConfigs.push({
                label: 'Maybe later',
                onClick: () => this._closeDialogueOverlay()
            });
        } else if (nextAvailable) {
            bodyNodes.push(this._createDialogueParagraph(`I have a task that needs attending: ${nextAvailable.name}.`));
            const desc = this._createDialogueParagraph(nextAvailable.description || '');
            bodyNodes.push(desc);
            const list = this._buildObjectiveList(nextAvailable, null);
            if (list) bodyNodes.push(list);
            optionConfigs.push({
                label: `Accept "${nextAvailable.name}"`,
                onClick: () => this._acceptMayorQuest(nextAvailable.id)
            });
            optionConfigs.push({
                label: 'Maybe later',
                onClick: () => this._closeDialogueOverlay()
            });
        } else if (activeQuest) {
            const def = questDefs[activeQuest.id] || {};
            bodyNodes.push(this._createDialogueParagraph(`You're still working on ${def.name || activeQuest.id}. Here's what you still owe me:`));
            const list = this._buildObjectiveList(def, getQuestObjectiveState(this.char, activeQuest.id));
            if (list) bodyNodes.push(list);
            optionConfigs.push({
                label: 'I\'ll get back to it',
                onClick: () => this._closeDialogueOverlay()
            });
        } else {
            bodyNodes.push(this._createDialogueParagraph('Greetings! Stay vigilant out there, and let me know when you are ready for more responsibility.'));
            optionConfigs.push({
                label: 'Leave',
                onClick: () => this._closeDialogueOverlay()
            });
        }

        this._renderDialogue('Mayor Grimsley', bodyNodes, optionConfigs);
    }

    _acceptMayorQuest(questId) {
        const quest = getQuestById(questId);
        if (!quest) {
            this._renderDialogue('Mayor Grimsley', [this._createDialogueParagraph('Hmm, I seem to have misplaced that contract.')], [
                { label: 'Leave', onClick: () => this._closeDialogueOverlay() }
            ]);
            return;
        }
        if (!startQuest(this.char, questId)) {
            this._renderDialogue('Mayor Grimsley', [this._createDialogueParagraph('Looks like you cannot take that on right now.')], [
                { label: 'Understood', onClick: () => this._closeDialogueOverlay() }
            ]);
            return;
        }
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        if (this._persistCharacter) this._persistCharacter(username);
        this._showToast('Quest accepted: ' + (quest.name || questId));
        if (this._questLogModal && window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) {
            window.__shared_ui.refreshQuestLogModal(this);
        }
        this._renderDialogue('Mayor Grimsley', [
            this._createDialogueParagraph(`Excellent. Bring me what I asked for and we'll speak again.`)
        ], [
            { label: 'I\'m on it', onClick: () => this._closeDialogueOverlay() }
        ]);
    }

    _completeMayorQuest(questId) {
        if (!checkQuestCompletion(this.char, questId)) {
            const def = getQuestById(questId);
            this._renderDialogue('Mayor Grimsley', [
                this._createDialogueParagraph(`You still have work to finish for ${def ? def.name : questId}.`),
                this._buildObjectiveList(def, getQuestObjectiveState(this.char, questId))
            ].filter(Boolean), [
                { label: 'I\'ll finish it', onClick: () => this._closeDialogueOverlay() }
            ]);
            return;
        }
        completeQuest(this.char, questId);
        const def = getQuestById(questId);
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        if (this._persistCharacter) this._persistCharacter(username);
        if (this._questLogModal && window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) {
            window.__shared_ui.refreshQuestLogModal(this);
        }
        try {
            if (window && window.__shared_ui) {
                if (window.__shared_ui.refreshInventoryModal) window.__shared_ui.refreshInventoryModal(this);
                if (window.__shared_ui.refreshEquipmentModal) window.__shared_ui.refreshEquipmentModal(this);
            }
        } catch (e) {}
        try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
        this._showToast('Quest completed: ' + (def ? def.name || questId : questId));
        this._renderDialogue('Mayor Grimsley', [
            this._createDialogueParagraph(`Well done. Here's your reward for completing ${def ? def.name : questId}.`),
            this._createDialogueParagraph('Let me know if you want to take on another duty.')
        ], [
            { label: 'Any more work?', onClick: () => this._openMayorDialogue() },
            { label: 'Thanks', onClick: () => this._closeDialogueOverlay() }
        ]);
    }

    _ensureDialogueOverlay() {
        if (this._dialogueOverlay) {
            return this._dialogueCard;
        }
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
        card.style.background = 'linear-gradient(135deg,#2a1a0f,#1a0f0a)';
        card.style.borderRadius = '12px';
        card.style.padding = '18px';
        card.style.color = '#fff';
        card.style.minWidth = '340px';
        card.style.maxWidth = '480px';
        card.style.boxShadow = '0 18px 32px rgba(0,0,0,0.5)';

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        this._dialogueOverlay = overlay;
        this._dialogueCard = card;
        return card;
    }

    _renderDialogue(title, bodyNodes, optionConfigs) {
        const card = this._ensureDialogueOverlay();
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
            btn.style.background = '#b46b2a';
            btn.style.color = '#fff';
            btn.onclick = () => {
                if (typeof opt.onClick === 'function') opt.onClick();
            };
            buttons.appendChild(btn);
        }
        card.appendChild(buttons);
    }

    _createDialogueParagraph(text) {
        const p = document.createElement('p');
        p.style.margin = '0 0 10px 0';
        p.textContent = text;
        return p;
    }

    _buildObjectiveList(questDef, progressStates) {
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
        if (this._dialogueOverlay && this._dialogueOverlay.parentNode) {
            this._dialogueOverlay.parentNode.removeChild(this._dialogueOverlay);
        }
        this._dialogueOverlay = null;
        this._dialogueCard = null;
        this._activeDialogueNpc = null;
    }
}

applyCombatMixin(Town.prototype);
