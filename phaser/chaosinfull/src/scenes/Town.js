// Clean Town scene implementation
export class Town extends Phaser.Scene {
    constructor() { super('Town'); }
    preload() {
        this.load.image('town_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('furnace', 'assets/furnace.png', { frameWidth: 64, frameHeight: 96 });
    }
    create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    // Fog overlay (DOM canvas below HUD)
    this._createFog();

    this._startSafeZoneRegen();
    // responsive layout values
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const bg = this.add.image(centerX, centerY, 'town_bg');
    bg.setDisplaySize(this.scale.width, this.scale.height);
    bg.setDepth(0);
    // platform aligned to bottom of scene (height 60)
    const platformHeight = 60;
    const platformY = this.scale.height - (platformHeight / 2);
    const platform = this.add.rectangle(centerX, platformY, this.scale.width, platformHeight, 0x222222, 0.8);
    platform.setStrokeStyle(4, 0xa00);
    platform.setDepth(1);
    this.physics.add.existing(platform, true);
    // Player (allow restoring last position via spawnX/spawnY)
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || centerX;
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (platformY - 70);
    this.player = this.physics.add.sprite(spawnX, spawnY, 'dude');
        this.player.setDepth(2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 40);
        this.player.body.setOffset(6, 8);
        this.physics.add.collider(this.player, platform);
    // Animations (create only if not already registered to avoid duplicate key errors)
    if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
    if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
        // Input (WASD + E + I + U + X) - centralized
    if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);
        // Character data
        const char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!char.mining) char.mining = { level: 1, exp: 0, expToLevel: 100 };
    if (!char.inventory) char.inventory = [];
    // equipment slots
    if (!char.equipment) char.equipment = { head: null, armor: null, legs: null, boots: null, ring1: null, ring2: null, amulet: null, weapon: null };
        this.char = char;
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
                    if (starter && !this.char.equipment) this.char.equipment = { head: null, armor: null, legs: null, boots: null, ring1: null, ring2: null, amulet: null, weapon: null };
                        if (starter && !this.char.equipment.weapon) {
                        // remove one from inventory (unique starter so just remove the entry)
                        const idx = inv.findIndex(x => x && x.id === starter);
                        if (idx !== -1) inv.splice(idx, 1);
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
    // Portal on left -> Cave (use shared helper)
    try {
        const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
        const cavePortalX = 80;
        const cavePortalY = platformY - 60; // slightly lowered to sit on platform
        const caveObj = portalHelper.createPortal(this, cavePortalX, cavePortalY, { depth: 1.5 });
        this.portal = caveObj.display;
        this.portalPrompt = this.add.text(cavePortalX, cavePortalY - 60, '[E] Enter Cave', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.portalPrompt.setVisible(false);
        this.cavePortalPos = { x: cavePortalX, y: cavePortalY };
        // attempt upgrade later if fallback was used (safe no-op if already sprite)
        try { this.time.delayedCall(220, () => { if (caveObj && caveObj.tryUpgrade) caveObj.tryUpgrade(); }); } catch (e) {}
    } catch (e) {
        // fallback: circle
        const cavePortalX = 80;
        const cavePortalY = platformY - 60;
        this.portal = this.add.circle(cavePortalX, cavePortalY, 28, 0x6644aa, 0.9).setDepth(1.5);
        this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        this.portalPrompt = this.add.text(cavePortalX, cavePortalY - 60, '[E] Enter Cave', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.portalPrompt.setVisible(false);
        this.cavePortalPos = { x: cavePortalX, y: cavePortalY };
    }
    // Portal to Inner Field near the forge
    const fieldPortalX = this.scale.width - 220;
    const fieldPortalY = platformY - 60; // lowered to sit on platform
    try {
        const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
        const fieldObj = portalHelper.createPortal(this, fieldPortalX, fieldPortalY, { depth: 1.5 });
        this.fieldPortal = fieldObj.display;
        this.fieldPortalPrompt = this.add.text(fieldPortalX, fieldPortalY - 60, '[E] Inner Field', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.fieldPortalPrompt.setVisible(false);
        this.fieldPortalPos = { x: fieldPortalX, y: fieldPortalY };
        try { this.time.delayedCall(220, () => { if (fieldObj && fieldObj.tryUpgrade) fieldObj.tryUpgrade(); }); } catch (e) {}
    } catch (e) {
        this.fieldPortal = this.add.circle(fieldPortalX, fieldPortalY, 26, 0x44aa88, 0.9).setDepth(1.5);
        this.tweens.add({ targets: this.fieldPortal, scale: { from: 1, to: 1.1 }, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
        this.fieldPortalPrompt = this.add.text(fieldPortalX, fieldPortalY - 60, '[E] Inner Field', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.fieldPortalPrompt.setVisible(false);
        this.fieldPortalPos = { x: fieldPortalX, y: fieldPortalY };
    }
    // Furnace on right side (combine ores into bars)
    const furnaceX = this.scale.width - 120;
    const furnaceY = platformY - 70;
    // animation only needs to be registered once; choose end frame dynamically based on loaded texture
        // create furnace sprite via shared helper
        try { if (window && window.__furnace_shared && window.__furnace_shared.createFurnace) { window.__furnace_shared.createFurnace(this, furnaceX, furnaceY); } else { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); this._setFurnaceFlame(false); } } catch (e) { try { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); this._setFurnaceFlame(false); } catch(_) {} }
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
    // smithing skill on character
    if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };
    // smelting state (works similar to mining timing)
    this.smeltingActive = false;
    this._smeltingEvent = null;
    this.smeltingInterval = 2800; // ms per bar (matches mining)
    // crafting (workbench) state - supports continuous crafting like furnace
    this.craftingActive = false;
    this._craftingEvent = null;
    this._craftType = null;
    this.craftingInterval = 2800; // ms per craft (same pace as smelting)
        // cleanup on shutdown
        this._fogResizeHandler = () => {
            if (this.fogCanvas) {
                this.fogCanvas.width = window.innerWidth;
                this.fogCanvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', this._fogResizeHandler);
        this.events.once('shutdown', () => {
            this._destroyHUD();
            this._stopFog();
            window.removeEventListener('resize', this._fogResizeHandler);
            // cleanup furnace modal and toasts
            this._closeFurnaceModal();
            // ensure furnace animation stopped
            try { this._setFurnaceFlame(false); } catch(e) {}
            this._closeWorkbenchModal();
            this._closeInventoryModal();
            this._clearToasts();
            if (this._workbenchIndicator && this._workbenchIndicator.destroy) { this._workbenchIndicator.destroy(); this._workbenchIndicator = null; }
            this._stopSafeZoneRegen();
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
        if (this._workbenchModal) return;
        const inv = this.char.inventory || [];
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const modal = document.createElement('div');
        modal.id = 'workbench-modal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%,-50%)';
        modal.style.zIndex = '220';
        modal.style.background = 'linear-gradient(135deg,#2b2f1f, #0f120a)';
        modal.style.padding = '18px';
        modal.style.borderRadius = '12px';
        modal.style.color = '#eee';
        modal.style.fontFamily = 'UnifrakturCook, cursive';
        modal.style.minWidth = '360px';
        const head = document.createElement('div');
        head.style.display = 'flex'; head.style.justifyContent = 'space-between'; head.style.alignItems = 'center'; head.style.marginBottom = '8px';
        head.innerHTML = `<strong>Workbench</strong>`;
        const closeBtn = document.createElement('button');
        closeBtn.id = 'workbench-close'; closeBtn.textContent = 'Close';
        closeBtn.style.background = '#222'; closeBtn.style.color = '#fff'; closeBtn.style.border = 'none'; closeBtn.style.padding = '6px 10px'; closeBtn.style.borderRadius = '6px'; closeBtn.style.cursor = 'pointer';
        head.appendChild(closeBtn);
        modal.appendChild(head);
        const desc = document.createElement('div'); desc.style.marginBottom = '8px'; desc.textContent = 'Craft items at the workbench. Requires bars produced from the furnace.'; modal.appendChild(desc);
        const list = document.createElement('div'); list.style.display = 'flex'; list.style.flexDirection = 'column'; list.style.gap = '8px';
        // generate buttons for recipes that use the workbench
        for (const k of Object.keys(recipes || {})) {
            const r = recipes[k];
            if (!r || r.tool !== 'workbench') continue;
            const btn = document.createElement('button');
            btn.dataset.recipe = r.id || k;
            btn.style.padding = '8px'; btn.style.border = 'none'; btn.style.borderRadius = '8px'; btn.style.cursor = 'pointer'; btn.style.color = '#fff';
            // color choice per recipe id (simple hash)
            btn.style.background = '#445533';
            // build human label from recipe requires
            const labelParts = (r.requires || []).map(req => {
                const name = (items[req.id] && items[req.id].name) || req.id;
                return (req.qty && req.qty > 1) ? (req.qty + 'x ' + name) : ('1x ' + name);
            });
            btn.textContent = `${r.name || r.id} (${labelParts.join(' + ')})`;
            btn.onclick = () => {
                const recipeId = btn.dataset.recipe;
                if (this.craftingActive) {
                    if (this._craftType === recipeId) this._stopContinuousCrafting();
                    else this._showToast('Already crafting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._craftType] ? (window.RECIPE_DEFS[this._craftType].name || this._craftType) : this._craftType));
                } else {
                    this._startContinuousCrafting(recipeId);
                }
                this._refreshWorkbenchModal();
            };
            list.appendChild(btn);
        }
        modal.appendChild(list);
        const msg = document.createElement('div'); msg.id = 'workbench-msg'; msg.style.color = '#ffcc99'; msg.style.marginTop = '8px'; msg.style.minHeight = '18px'; modal.appendChild(msg);
        document.body.appendChild(modal);
        this._workbenchModal = modal;
        closeBtn.onclick = () => this._closeWorkbenchModal();
        this._refreshWorkbenchModal();
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
    _closeWorkbenchModal() {
        if (this._workbenchModal && this._workbenchModal.parentNode) this._workbenchModal.parentNode.removeChild(this._workbenchModal);
        this._workbenchModal = null;
        // HUD revert
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
    _refreshWorkbenchModal() {
        if (!this._workbenchModal) return;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const el = this._workbenchModal.querySelector('#workbench-msg');
        if (el) el.textContent = '';
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        // update each button generated in the modal
        const buttons = this._workbenchModal.querySelectorAll('button[data-recipe]');
        buttons.forEach(btn => {
            const rid = btn.dataset.recipe;
            const r = recipes[rid];
            if (!r) return;
            // check reqs
            let ok = true;
            for (const req of (r.requires || [])) {
                if (findQty(req.id) < (req.qty || 1)) { ok = false; break; }
            }
            const lvlOk = !(this.char.smithing && (this.char.smithing.level || 1) < (r.reqLevel || 1));
            btn.disabled = !ok || !lvlOk;
            btn.style.opacity = btn.disabled ? '0.6' : '1';
            // label
            if (this.craftingActive && this._craftType === rid) {
                btn.textContent = 'Stop Crafting ' + (r.name || rid);
                btn.style.background = '#aa4422';
            } else {
                const parts = (r.requires || []).map(req => ((items[req.id] && items[req.id].name) || req.id) + (req.qty && req.qty > 1 ? ' x' + req.qty : ''));
                btn.textContent = (r.name || rid) + ' (' + parts.join(' + ') + ')';
                // simple color mapping
                btn.style.background = '#444033';
            }
        });
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
    // set activity for HUD to show smithing bar
    try { if (this.char) this.char.activity = 'smithing'; } catch(e) {}
        // schedule first crafting after the interval (no immediate grant)
        this._craftingEvent = this.time.addEvent({ delay: this.craftingInterval, callback: this._attemptCraft, callbackScope: this, args: [recipeId], loop: true });
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
        if (this._craftingEvent) { this._craftingEvent.remove(false); this._craftingEvent = null; }
        this._showToast('Crafting stopped');
        this._craftType = null;
    if (this._workbenchIndicator) this._workbenchIndicator.setVisible(false);
        try { if (this.char) this.char.activity = null; } catch(e) {}
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
        // avoid re-creating HUD in tight loops; recreate once on stop
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
    _attemptCraft(recipeId) {
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const recipe = recipes[recipeId];
        if (!recipe) { this._showToast('Unknown recipe'); return; }
        // level check
        if (this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1)) { this._showToast('Smithing level too low'); return; }
        // check requirements
        const inv = this.char.inventory = this.char.inventory || [];
        const find = (id) => inv.find(x => x && x.id === id);
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
        for (const req of (recipe.requires || [])) {
            const it = find(req.id);
            if (it) {
                it.qty -= (req.qty || 1);
                if (it.qty <= 0) inv.splice(inv.indexOf(it), 1);
            }
        }
        // give crafted item (non-stackable weapon, push as separate entry)
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const def = defs && defs[recipeId];
        if (def && def.stackable) {
            let ex = find(recipeId);
            if (ex) ex.qty = (ex.qty || 0) + 1; else inv.push({ id: recipeId, name: def.name || recipe.name, qty: 1 });
        } else {
            // unique weapon: push new entry
            inv.push({ id: recipeId, name: (def && def.name) || recipe.name, qty: 1 });
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
    // --- Furnace modal UI ---
    _openFurnaceModal() {
        if (this._furnaceModal) return;
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const copperOreQty = findQty('copper_ore');
        const tinOreQty = findQty('tin_ore');
        const modal = document.createElement('div');
        modal.id = 'furnace-modal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%,-50%)';
        modal.style.zIndex = '220';
        modal.style.background = 'linear-gradient(135deg,#2a223a 0%, #1a1026 100%)';
        modal.style.padding = '18px';
        modal.style.borderRadius = '12px';
        modal.style.color = '#eee';
        modal.style.fontFamily = 'UnifrakturCook, cursive';
        modal.style.minWidth = '300px';
        modal.innerHTML = `
            <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'>
                <strong>Furnace</strong>
                <button id='furnace-close' style='background:#222;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;'>Close</button>
            </div>
            <div style='margin-bottom:8px;'>Smelt ores into bars here. Open your Inventory (I) to view quantities.</div>
            <div style='display:flex;flex-direction:column;gap:8px;'>
                <button id='smelt-copper' style='padding:8px;background:#6b4f3a;color:#fff;border:none;border-radius:8px;cursor:pointer;'>Smelt Copper Bar (2x Copper Ore)</button>
                <button id='smelt-bronze' style='padding:8px;background:#7a5f3a;color:#fff;border:none;border-radius:8px;cursor:pointer;'>Smelt Bronze (1x Copper Ore + 1x Tin Ore)</button>
            </div>
            <div id='furnace-msg' style='color:#ffcc99;margin-top:8px;min-height:18px;'></div>
        `;
        document.body.appendChild(modal);
        this._furnaceModal = modal;
        const close = document.getElementById('furnace-close');
        if (close) close.onclick = () => this._closeFurnaceModal();
        const updateDisplay = () => {
            const inv = this.char.inventory || [];
            const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
            const copperOreQty = findQty('copper_ore');
            const tinOreQty = findQty('tin_ore');
            const elC = document.getElementById('furnace-copper-qty'); if (elC) elC.textContent = copperOreQty;
            const elT = document.getElementById('furnace-tin-qty'); if (elT) elT.textContent = tinOreQty;
        };
        // recipe toggle buttons (start/stop). only one recipe can run at a time
        const btnCopper = document.getElementById('smelt-copper');
        const btnBronze = document.getElementById('smelt-bronze');
        const updateDisplayLocal = updateDisplay; // alias to call inside handlers
        if (btnCopper) btnCopper.onclick = () => {
            const recipeId = 'copper_bar';
            if (this.smeltingActive) {
                if (this._smeltType === recipeId) this._stopContinuousSmelting();
                else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType));
            } else {
                // only start if requirements met
                const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
                const recipe = recipes[recipeId];
                const inv = this.char.inventory || [];
                const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
                let ok = true;
                for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
                const lvlOk = !(this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1));
                if (!ok || !lvlOk) { this._showToast('Missing materials or smithing level too low'); }
                else this._startContinuousSmelting(recipeId);
            }
            updateDisplayLocal();
        };
        if (btnBronze) btnBronze.onclick = () => {
            const recipeId = 'bronze_bar';
            if (this.smeltingActive) {
                if (this._smeltType === recipeId) this._stopContinuousSmelting();
                else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType));
            } else {
                const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
                const recipe = recipes[recipeId];
                const inv = this.char.inventory || [];
                const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
                let ok = true;
                for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
                const lvlOk = !(this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1));
                if (!ok || !lvlOk) { this._showToast('Missing materials or smithing level too low'); }
                else this._startContinuousSmelting(recipeId);
            }
            updateDisplayLocal();
        };
        // initialize labels/state
        this._refreshFurnaceModal();
        // HUD should reflect smithing while furnace modal is open
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
    _closeFurnaceModal() {
        if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
        this._furnaceModal = null;
    // restore HUD display and ensure furnace animation is stopped if not smelting
    try { if (!this.smeltingActive && this._setFurnaceFlame) this._setFurnaceFlame(false); } catch(e) {}
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
    // Start continuous smelting of a given recipe ('copper' or 'bronze')
    _startContinuousSmelting(recipeId) {
        if (this.smeltingActive) return;
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const recipe = recipes[recipeId];
        if (!recipe) { this._showToast('Unknown recipe'); return; }
        if (this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1)) { this._showToast('Smithing level too low'); return; }
        // quick check for materials
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        let ok = true;
        for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
        if (!ok) { this._showToast('Missing materials'); return; }
        this.smeltingActive = true;
        this._smeltType = recipeId;
    // start furnace flame animation
    try { this._setFurnaceFlame(true); } catch (e) {}
    // mark activity as smithing so HUD shows smithing progress
    try { if (this.char) this.char.activity = 'smithing'; } catch(e) {}
        // schedule-first: wait interval before first smelt
        this._smeltingEvent = this.time.addEvent({ delay: this.smeltingInterval, callback: this._attemptSmelt, callbackScope: this, args: [recipeId], loop: true });
        this._showToast('Started smelting ' + (recipe.name || recipeId));
    try { if (this._setFurnaceFlame) this._setFurnaceFlame(true); } catch(e) {}
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
        this._refreshFurnaceModal();
    }
    _stopContinuousSmelting() {
        if (!this.smeltingActive) return;
        this.smeltingActive = false;
        if (this._smeltingEvent) { this._smeltingEvent.remove(false); this._smeltingEvent = null; }
        this._showToast('Smelting stopped');
        this._smeltType = null;
    // stop furnace flame animation
    try { this._setFurnaceFlame(false); } catch (e) {}
    try { if (this._setFurnaceFlame) this._setFurnaceFlame(false); } catch(e) {}
    try { if (this.char) this.char.activity = null; } catch(e) {}
        this._refreshFurnaceModal();
        // HUD revert
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _setFurnaceFlame(active) {
        if (!this.furnace) return;
        if (active) {
            if (!this.anims.exists('furnace_burn')) {
                console.warn('furnace_burn animation not found for furnace');
            }
            try {
                this.furnace.play('furnace_burn', true);
            } catch (e) {
                console.warn('Could not play furnace animation', e);
            }
        } else {
            if (this.furnace.anims) this.furnace.anims.stop();
            if (this.furnace.setFrame) this.furnace.setFrame(0);
        }
    }
    // Attempt a single smelt of specified type. Shows toast for each produced bar and persists.
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
                try { if (this.char) this.char.activity = null; } catch(e) {}
                try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
                this._showToast('Out of materials for ' + (recipe.name || recipeId));
                return;
            }
        }
        // consume materials
        for (const req of (recipe.requires || [])) {
            const it = find(req.id);
            if (it) {
                it.qty -= (req.qty || 1);
                if (it.qty <= 0) inv.splice(inv.indexOf(it), 1);
            }
        }
        // give product
        const prodId = recipe.id || recipeId;
        const prodDef = items && items[prodId];
        if (prodDef && prodDef.stackable) {
            let ex = find(prodId);
            if (ex) ex.qty = (ex.qty || 0) + 1; else inv.push({ id: prodId, name: prodDef.name || recipe.name, qty: 1 });
        } else {
            inv.push({ id: prodId, name: (prodDef && prodDef.name) || recipe.name, qty: 1 });
        }
        const newQty = (find(prodId) && find(prodId).qty) || 1;
        this._showToast(`Smelted 1x ${(prodDef && prodDef.name) || recipe.name}! (${newQty} total)`);
        // award smithing XP
        this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
        this.char.smithing.exp = (this.char.smithing.exp || 0) + (recipe.smithingXp || 0);
        // check smithing level up
        if (this.char.smithing) {
            while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                this.char.smithing.exp -= this.char.smithing.expToLevel;
                this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
                try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
            }
        }
        // persist and refresh modal/inventory only; avoid re-creating HUD each tick
        this._persistCharacter(username);
        this._refreshFurnaceModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }
    _refreshFurnaceModal() {
        if (!this._furnaceModal) return;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const copperOreQty = findQty('copper_ore');
        const tinOreQty = findQty('tin_ore');
        const elC = document.getElementById('furnace-copper-qty'); if (elC) elC.textContent = copperOreQty;
        const elT = document.getElementById('furnace-tin-qty'); if (elT) elT.textContent = tinOreQty;
        const btnCopper = document.getElementById('smelt-copper');
        const btnBronze = document.getElementById('smelt-bronze');
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
            // disable if other recipe is active
            // disable if other recipe is active or missing materials/level
            const inv = this.char.inventory || [];
            const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
            let okCopper = true;
            for (const req of (copperRecipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { okCopper = false; break; } }
            const lvlOkCopper = !(this.char.smithing && (this.char.smithing.level || 1) < (copperRecipe.reqLevel || 1));
            btnCopper.disabled = (this.smeltingActive && this._smeltType !== 'copper_bar') || !okCopper || !lvlOkCopper;
            btnCopper.style.opacity = btnCopper.disabled ? '0.6' : '1';
        }
        if (btnBronze) {
            if (this.smeltingActive && this._smeltType === 'bronze_bar') { btnBronze.textContent = 'Stop Smelting ' + (bronzeRecipe && bronzeRecipe.name ? bronzeRecipe.name : 'Bronze'); btnBronze.style.background = '#aa4422'; }
            else { btnBronze.textContent = buildLabel(bronzeRecipe) || 'Smelt Bronze'; btnBronze.style.background = '#7a5f3a'; }
            const inv2 = this.char.inventory || [];
            const findQty2 = (id) => { const it = inv2.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
            let okBronze = true;
            for (const req of (bronzeRecipe.requires || [])) { if (findQty2(req.id) < (req.qty || 1)) { okBronze = false; break; } }
            const lvlOkBronze = !(this.char.smithing && (this.char.smithing.level || 1) < (bronzeRecipe.reqLevel || 1));
            btnBronze.disabled = (this.smeltingActive && this._smeltType !== 'bronze_bar') || !okBronze || !lvlOkBronze;
            btnBronze.style.opacity = btnBronze.disabled ? '0.6' : '1';
        }
    }
    // Persist character (inventory/mining/etc) by id or fallback to name
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
        return [];
    }
    _setAccountStorage(username, storageArr) {
        if (!username) return;
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key)) || { characters: [] };
            userObj.storage = storageArr || [];
            localStorage.setItem(key, JSON.stringify(userObj));
        } catch (e) { console.warn('Could not set account storage', e); }
    }
    // --- Storage chest modal ---
    _openStorageModal() {
        if (this._storageModal) return;
        const inv = this.char.inventory || [];
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const storage = this._getAccountStorage(username) || [];
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
        modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Account Storage</strong><button id='storage-close' style='background:#222;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;'>Close</button></div><div style='display:flex;gap:12px;'><div style='flex:1;'><div style='font-size:0.9em;margin-bottom:6px;'>Your Inventory</div><div id='storage-inv' style='max-height:260px;overflow:auto;background:rgba(255,255,255,0.02);padding:8px;border-radius:8px;'></div></div><div style='width:12px'></div><div style='flex:1;'><div style='font-size:0.9em;margin-bottom:6px;'>Shared Storage</div><div id='storage-box' style='max-height:260px;overflow:auto;background:rgba(255,255,255,0.02);padding:8px;border-radius:8px;'></div></div></div>`;
        document.body.appendChild(modal);
        this._storageModal = modal;
        document.getElementById('storage-close').onclick = () => this._closeStorageModal();
        this._refreshStorageModal();
    }
    _closeStorageModal() {
        if (this._storageModal && this._storageModal.parentNode) this._storageModal.parentNode.removeChild(this._storageModal);
        this._storageModal = null;
    }
    _refreshStorageModal() {
        if (!this._storageModal) return;
        const invContainer = this._storageModal.querySelector('#storage-inv');
        const boxContainer = this._storageModal.querySelector('#storage-box');
        invContainer.innerHTML = '';
        boxContainer.innerHTML = '';
        const inv = this.char.inventory || [];
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const storage = this._getAccountStorage(username) || [];
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        // Inventory entries with Deposit buttons
        for (const it of inv) {
            if (!it) continue;
            const def = defs && defs[it.id];
            const name = it.name || (def && def.name) || it.id;
            const qty = it.qty || 1;
            const el = document.createElement('div'); el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.alignItems = 'center'; el.style.padding = '6px'; el.style.marginBottom = '6px'; el.style.background = 'rgba(255,255,255,0.02)'; el.style.borderRadius = '8px';
            const left = document.createElement('div'); left.innerHTML = `<strong>${name}</strong><div style='font-size:0.85em;color:#ccc;'>${def && def.stackable ? 'Stackable' : 'Unique'}</div>`;
            const right = document.createElement('div'); right.style.display = 'flex'; right.style.alignItems = 'center'; right.innerHTML = `<div style='margin-right:8px'>${qty}</div>`;
            const btn = document.createElement('button'); btn.textContent = 'Deposit'; btn.style.padding = '6px 8px'; btn.style.border = 'none'; btn.style.borderRadius = '6px'; btn.style.cursor = 'pointer'; btn.onclick = () => { this._depositToStorage(it.id, 1); };
            right.appendChild(btn);
            el.appendChild(left); el.appendChild(right);
            invContainer.appendChild(el);
        }
        // Storage entries with Withdraw buttons
        for (const it of storage) {
            if (!it) continue;
            const def = defs && defs[it.id];
            const name = it.name || (def && def.name) || it.id;
            const qty = it.qty || 1;
            const el = document.createElement('div'); el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.alignItems = 'center'; el.style.padding = '6px'; el.style.marginBottom = '6px'; el.style.background = 'rgba(255,255,255,0.02)'; el.style.borderRadius = '8px';
            const left = document.createElement('div'); left.innerHTML = `<strong>${name}</strong><div style='font-size:0.85em;color:#ccc;'>${def && def.stackable ? 'Stackable' : 'Unique'}</div>`;
            const right = document.createElement('div'); right.style.display = 'flex'; right.style.alignItems = 'center'; right.innerHTML = `<div style='margin-right:8px'>${qty}</div>`;
            const btn = document.createElement('button'); btn.textContent = 'Withdraw'; btn.style.padding = '6px 8px'; btn.style.border = 'none'; btn.style.borderRadius = '6px'; btn.style.cursor = 'pointer'; btn.onclick = () => { this._withdrawFromStorage(it.id, 1); };
            right.appendChild(btn);
            el.appendChild(left); el.appendChild(right);
            boxContainer.appendChild(el);
        }
    }
    _depositToStorage(itemId, qty = 1) {
        qty = Math.max(1, qty || 1);
        this.char.inventory = this.char.inventory || [];
        const inv = this.char.inventory;
        const idx = inv.findIndex(x => x && x.id === itemId);
        if (idx === -1) { this._showToast('Item not found'); return; }
        const it = inv[idx];
        // remove from inventory
        if (it.qty && it.qty > qty) {
            it.qty -= qty;
        } else {
            inv.splice(idx, 1);
        }
        // add to account storage
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const storage = this._getAccountStorage(username) || [];
        const itemDef = (window && window.ITEM_DEFS && window.ITEM_DEFS[itemId]) || null;
        if (itemDef && itemDef.stackable) {
            let found = storage.find(x => x && x.id === itemId);
            if (found) found.qty = (found.qty || 0) + qty; else storage.push({ id: itemId, name: (itemDef && itemDef.name) || itemId, qty: qty });
        } else {
            // Unstackable/unique items should be stored as separate entries to preserve uniqueness.
            for (let i = 0; i < qty; i++) {
                storage.push({ id: itemId, name: (itemDef && itemDef.name) || itemId, qty: 1 });
            }
        }
        this._setAccountStorage(username, storage);
        this._persistCharacter(username);
        this._showToast('Deposited ' + qty + 'x ' + ((window && window.ITEM_DEFS && window.ITEM_DEFS[itemId] && window.ITEM_DEFS[itemId].name) || itemId));
        if (this._storageModal) this._refreshStorageModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }
    _withdrawFromStorage(itemId, qty = 1) {
        qty = Math.max(1, qty || 1);
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const storage = this._getAccountStorage(username) || [];
        const idx = storage.findIndex(x => x && x.id === itemId);
        if (idx === -1) { this._showToast('Item not in storage'); return; }
        const it = storage[idx];
        if ((it.qty || 0) < qty) { this._showToast('Not enough in storage'); return; }
        if (it.qty > qty) it.qty -= qty; else storage.splice(idx, 1);
        this._setAccountStorage(username, storage);
        // add to this.char.inventory
        this.char.inventory = this.char.inventory || [];
        const inv = this.char.inventory;
        const found = inv.find(x => x && x.id === itemId);
        if (found && (window && window.ITEM_DEFS && window.ITEM_DEFS[itemId] && window.ITEM_DEFS[itemId].stackable)) {
            found.qty = (found.qty || 0) + qty;
        } else {
            inv.push({ id: itemId, name: (window && window.ITEM_DEFS && window.ITEM_DEFS[itemId] && window.ITEM_DEFS[itemId].name) || itemId, qty: qty });
        }
        this._persistCharacter(username);
        this._showToast('Withdrew ' + qty + 'x ' + ((window && window.ITEM_DEFS && window.ITEM_DEFS[itemId] && window.ITEM_DEFS[itemId].name) || itemId));
        if (this._storageModal) this._refreshStorageModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }
    // --- Fog helpers ---
    _createFog() {
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.id = 'town-fog-canvas';
        this.fogCanvas.width = window.innerWidth;
        this.fogCanvas.height = window.innerHeight;
        this.fogCanvas.style.position = 'fixed';
        this.fogCanvas.style.left = '0';
        this.fogCanvas.style.top = '0';
        this.fogCanvas.style.width = '100vw';
        this.fogCanvas.style.height = '100vh';
        this.fogCanvas.style.pointerEvents = 'none';
        this.fogCanvas.style.zIndex = '99'; // below HUD (100)
        document.body.appendChild(this.fogCanvas);
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.fogParticles = [];
        for (let i = 0; i < 120; i++) {
            this.fogParticles.push({ x: Math.random() * this.fogCanvas.width, y: Math.random() * this.fogCanvas.height, r: 30 + Math.random() * 80, vx: 0.08 + Math.random() * 0.2, vy: -0.02 + Math.random() * 0.06, alpha: 0.06 + Math.random() * 0.12 });
        }
        this._startFog();
    }
    _startFog() {
        const that = this;
        function loop() {
            if (!that.fogCtx) return;
            that.fogCtx.clearRect(0, 0, that.fogCanvas.width, that.fogCanvas.height);
            for (let p of that.fogParticles) {
                that.fogCtx.beginPath();
                that.fogCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                that.fogCtx.fillStyle = 'rgba(200,180,200,0.12)';
                that.fogCtx.globalAlpha = p.alpha;
                that.fogCtx.fill();
                that.fogCtx.globalAlpha = 1;
                p.x += p.vx; p.y += p.vy;
                if (p.x - p.r > that.fogCanvas.width) p.x = -p.r;
                if (p.y + p.r < 0) p.y = that.fogCanvas.height + p.r;
            }
            that._fogRaf = requestAnimationFrame(loop);
        }
        this._fogRaf = requestAnimationFrame(loop);
    }
    _stopFog() {
        if (this._fogRaf) {
            cancelAnimationFrame(this._fogRaf);
            this._fogRaf = null;
        }
        if (this.fogCanvas && this.fogCanvas.parentNode) {
            this.fogCanvas.parentNode.removeChild(this.fogCanvas);
            this.fogCanvas = null;
            this.fogCtx = null;
        }
    }

    _startSafeZoneRegen() {
        const regenDelay = 1800;
        if (this.safeRegenEvent) this.safeRegenEvent.remove(false);
        this.safeRegenEvent = this.time.addEvent({ delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
    }

    _stopSafeZoneRegen() {
        if (this.safeRegenEvent) {
            this.safeRegenEvent.remove(false);
            this.safeRegenEvent = null;
        }
    }

    _tickSafeZoneRegen() {
        if (!this.char) return;
        const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : { str: 0 };
        const strength = (effStats && effStats.str) || 0;
        const level = this.char.level || 1;
        const estimatedMax = 100 + level * 10 + ((strength || 0) * 10);
        const maxhp = Math.max(this.char.maxhp || estimatedMax, 1);
        this.char.maxhp = maxhp;
        const currentHp = Math.max(0, this.char.hp != null ? this.char.hp : maxhp);
        if (currentHp >= maxhp) return;
        const amount = Math.max(1, Math.floor(strength / 2) + 2);
        this.char.hp = Math.min(maxhp, currentHp + amount);
        this._updateHUD();
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

    update() {
        if (!this.player || !this.keys) return;
        const speed = 180;
        if (this.keys.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('left', true);
        } else if (this.keys.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }
        if (this.keys.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-380);
        }
        // Portal interaction: proximity + E to enter
        if (this.portal) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
            if (dist <= 56) {
                this.portalPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    // persist mining and mark lastLocation as Cave (store scene and optional position)
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
                                    userObj.characters[i].lastLocation = { scene: 'Cave', x: this.player.x, y: (this.portal ? this.portal.y : this.player.y) };
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
                    } catch (e) { console.warn('Could not persist lastLocation', e); }
                    this.scene.start('Cave', { character: this.char, username: username, spawnX: this.scale.width - 140, spawnY: this.portal ? this.portal.y : (this.scale.height - 120) });
                }
            } else {
                this.portalPrompt.setVisible(false);
            }
        }
        if (this.fieldPortal) {
            const portalY = (this.fieldPortal && this.fieldPortal.y) || (this.fieldPortalPos && this.fieldPortalPos.y) || (this.scale.height - 120);
            const fdist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.fieldPortal.x, this.fieldPortal.y);
            if (fdist <= 56) {
                this.fieldPortalPrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    try {
                        const key = 'cif_user_' + username;
                        const userObj = JSON.parse(localStorage.getItem(key));
                        if (userObj && userObj.characters) {
                            let found = false;
                            for (let i = 0; i < userObj.characters.length; i++) {
                                const uc = userObj.characters[i];
                                if (!uc) continue;
                                if ((uc.id && this.char.id && uc.id === this.char.id) || (!uc.id && uc.name === this.char.name)) {
                                    userObj.characters[i] = this.char;
                                    userObj.characters[i].lastLocation = { scene: 'InnerField', x: this.player.x, y: portalY };
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
                    } catch (e) { console.warn('Could not persist lastLocation (inner field)', e); }
                    this.scene.start('InnerField', { character: this.char, username: username, spawnX: Math.max(80, this.scale.width * 0.12), spawnY: portalY });
                }
            } else {
                this.fieldPortalPrompt.setVisible(false);
            }
        }
        // Furnace interaction: proximity + E to open smelting UI
        if (this.furnace) {
            const fdist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.furnace.x, this.furnace.y);
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
            const wdist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.workbench.x, this.workbench.y);
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
            const sdist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.storageChest.x, this.storageChest.y);
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
        // Inventory toggle (I)
        if (Phaser.Input.Keyboard.JustDown(this.keys.inventory)) {
            if (window && window.__shared_ui) {
                if (this._inventoryModal) window.__shared_ui.closeInventoryModal(this); else window.__shared_ui.openInventoryModal(this);
            } else {
                if (this._inventoryModal) this._closeInventoryModal(); else this._openInventoryModal();
            }
        }
        // Equipment toggle (U)
        if (Phaser.Input.Keyboard.JustDown(this.keys.equip)) {
            if (window && window.__shared_ui) {
                if (this._equipmentModal) window.__shared_ui.closeEquipmentModal(this); else window.__shared_ui.openEquipmentModal(this);
            } else {
                if (this._equipmentModal) this._closeEquipmentModal(); else this._openEquipmentModal();
            }
        }
        // Stats toggle (X)
        if (this.keys.stats && Phaser.Input.Keyboard.JustDown(this.keys.stats)) {
            if (window && window.__shared_ui) {
                if (this._statsModal) window.__shared_ui.closeStatsModal(this); else window.__shared_ui.openStatsModal(this);
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
        const slots = this.char.equipment || { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null };
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
        const equip = this.char.equipment || {};
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
}