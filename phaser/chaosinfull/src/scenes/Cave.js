// Cave scene: HUD similar to Town, WASD+E controls, right-side portal, one mining node for testing
export class Cave extends Phaser.Scene {
    constructor() {
        super('Cave');
    }

    preload() {
        this.load.image('cave_bg', 'assets/cave_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        // responsive centers
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const bg = this.add.image(centerX, centerY, 'cave_bg');
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.add.text(centerX, 32, 'The Cave', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

    // Player spawn (allow restoring last position via spawnX/spawnY)
    const platformHeight = 60;
    const platformY = this.scale.height - (platformHeight / 2);
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || Math.max(80, this.scale.width * 0.12);
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (platformY - 70);
    this.player = this.physics.add.sprite(spawnX, spawnY, 'dude');
    // ensure player is rendered above nodes, furnace and portal
    this.player.setDepth(2);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 40);
    this.player.body.setOffset(6, 8);
    const platform = this.add.rectangle(centerX, platformY, this.scale.width, platformHeight, 0x443322, 1);
    platform.setDepth(1);
    this.physics.add.existing(platform, true);
    this.physics.add.collider(this.player, platform);

    // Animations (create only if not already registered to avoid duplicate key errors)
    if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
    if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

    // Input: WASD + E + I (inventory) + U (equipment) + X (stats) - centralized
    if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);

    // Character data from scene settings
    this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];
    // Reconcile equipment bonuses through shared helper so UI shows effective stats
    try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) { /* ignore */ }

        // HUD (same condensed HUD as Town, without mining bar)
    if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();

    // Right-side portal to return to Town; requires proximity + E
        const portalX = this.scale.width - 80;
        const portalY = platformY - 70;
        this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
        this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.portalPrompt.setVisible(false);

    // Furnace in cave (convenience) - moved to left side to avoid overlapping copper node
    const furnaceX = 120;
    const furnaceY = platformY - 70;
    this.furnace = this.add.rectangle(furnaceX, furnaceY, 56, 56, 0x6b4b2f, 1).setDepth(1.5);
    this.tweens.add({ targets: this.furnace, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });
    this.furnacePrompt = this.add.text(furnaceX, furnaceY - 60, '[E] Use Furnace', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.furnacePrompt.setVisible(false);
    // furnace active indicator
    this._furnaceIndicator = this.add.text(furnaceX, furnaceY - 40, '🔥', { fontSize: '20px' }).setOrigin(0.5).setDepth(2);
    this._furnaceIndicator.setVisible(false);
    // smithing skill
    if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };

    // Smelting state
    this.smeltingActive = false;
    this._smeltingEvent = null;
    this.smeltingInterval = 2800;

    // Mining nodes for testing: place them on the platform so they sit naturally
    const platformTop = platformY - (60 / 2);
    // tin (easier) on left-center
    this._createMiningNode(460, platformTop - 28, 'tin');
    // copper (harder) on right-center
    this._createMiningNode(580, platformTop - 28, 'copper');

    // continuous mining state
    this.miningActive = false;
    this._miningEvent = null;
    this.miningInterval = 2800; // ms between swings (tweakable)

        // Toast container
        this._toastContainer = null;

        // cleanup on shutdown
        this.events.once('shutdown', () => {
            this._destroyHUD();
            this._clearToasts();
            // cleanup mining indicator if present
            if (this._miningIndicator && this._miningIndicator.parent) {
                this._miningIndicator.destroy();
                this._miningIndicator = null;
            }
            // cleanup furnace modal if present
            if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
            this._furnaceModal = null;
            // stop any smelting events
            if (this._smeltingEvent) { this._smeltingEvent.remove(false); this._smeltingEvent = null; }
            this._closeInventoryModal();
        });
    }

    // Inventory modal is centralized in shared UI; thin wrappers kept for compatibility
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
        const config = {
            tin: { color: 0x9bb7c9, baseChance: 0.45, item: { id: 'tin_ore', name: 'Tin Ore' }, label: 'Tin' },
            copper: { color: 0x8a7766, baseChance: 0.35, item: { id: 'copper_ore', name: 'Copper Ore' }, label: 'Copper' }
        };
        const cfg = config[type] || config.copper;
        const node = {};
        node.type = type;
        node.x = x; node.y = y; node.r = 28;
        node.baseChance = cfg.baseChance;
        node.item = cfg.item;
        node.color = cfg.color;
        node.label = cfg.label;
        node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
        node.prompt = this.add.text(x, y - 60, `[E] Mine ${node.label}`, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        node.prompt.setVisible(false);
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
        // Only hide the indicator if smelting is not active; keep it visible during background smelting
        if (this._furnaceIndicator && !this.smeltingActive) this._furnaceIndicator.setVisible(false);
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
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
    // set activity flag so HUD shows smithing
    try { if (this.char) this.char.activity = 'smithing'; } catch(e) {}
        // schedule-first: wait interval, then call _attemptSmelt
        this._smeltingEvent = this.time.addEvent({ delay: this.smeltingInterval, callback: this._attemptSmelt, callbackScope: this, args: [type], loop: true });
        this._showToast('Started smelting ' + (recipe.name || type));
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(true);
        // show smithing HUD and refresh modal
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
        this._refreshCaveFurnaceModal();
    }

    _stopContinuousSmelting() {
        if (!this.smeltingActive) return;
        this.smeltingActive = false;
        if (this._smeltingEvent) { this._smeltingEvent.remove(false); this._smeltingEvent = null; }
        this._showToast('Smelting stopped');
        this._smeltType = null;
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(false);
        try { if (this.char) this.char.activity = null; } catch(e) {}
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
    // refresh stats modal if open (smithing xp shown in skills)
    try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
        if (this.char.smithing) {
            while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                this.char.smithing.exp -= this.char.smithing.expToLevel;
                this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
            }
        }
        this._persistCharacter((this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null);
        // Avoid recreating HUD every tick; refresh modal and inventory UI only
        this._refreshCaveFurnaceModal();
        if (this._inventoryModal) this._refreshInventoryModal();
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
        // Refresh inventory modal if open so changes appear immediately
        try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) { /* ignore */ }
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const speed = 180;
        if (this.keys.left.isDown) { this.player.setVelocityX(-speed); this.player.anims.play('left', true); }
        else if (this.keys.right.isDown) { this.player.setVelocityX(speed); this.player.anims.play('right', true); }
        else { this.player.setVelocityX(0); this.player.anims.play('turn'); }
        if (this.keys.up.isDown && this.player.body.blocked.down) this.player.setVelocityY(-380);

        // portal interaction
        if (this.portal) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
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
            const fdist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.furnace.x, this.furnace.y);
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

        // mining node interaction (support multiple nodes)
        if (this.miningNodes && this.miningNodes.length) {
            let nearest = null;
            let nearestDist = 9999;
            for (const node of this.miningNodes) {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
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

    // Mining attempt logic: success grants 15 exp + item, failure 5 exp
    _attemptMine() {
        const node = this._activeNode;
        if (!node) return;
        const mining = this.char.mining || { level: 1, exp: 0, expToLevel: 100 };
        const str = (this.char.stats && this.char.stats.str) || 0;
        // chance formula: node.baseChance + 0.02*mining.level + 0.01*str, clamped
        let chance = (node.baseChance || 0.35) + 0.02 * (mining.level || 1) + 0.01 * str;
    // lower bound only; allow chance to exceed 1.0 so multiplier can grow with level/str
    chance = Math.max(0.05, chance);
        const gotOre = Math.random() < chance;
        if (gotOre) {
            // multiplier based on efficiency relative to node.baseChance
            const base = node.baseChance || 0.35;
            const multiplier = Math.max(1, Math.floor(chance / base));
            // award node-specific item (stack qty) and report per-swing gain
            this.char.inventory = this.char.inventory || [];
            let found = null;
            for (let it of this.char.inventory) { if (it && it.id === node.item.id) { found = it; break; } }
            let prevQty = 0;
            let newQty = 0;
            if (found) {
                prevQty = found.qty || 0;
                newQty = prevQty + multiplier;
                found.qty = newQty;
            } else {
                this.char.inventory.push({ id: node.item.id, name: node.item.name, qty: multiplier });
                found = this.char.inventory[this.char.inventory.length - 1];
                prevQty = 0;
                newQty = multiplier;
            }
            const delta = newQty - prevQty;
            // grant mining XP scaled by multiplier (keep per-ore XP reasonable)
            mining.exp = (mining.exp || 0) + (15 * multiplier);
            // refresh stats modal if open (mining XP affects skills display)
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
            // show toast with per-swing amount and item name
            this._showToast(`You mined ${delta}x ${node.item.name}! (+${15 * multiplier} mining XP)`);
            // visual effect scaled by multiplier
            this._playMiningSwingEffect(node, true);
            if (multiplier > 1 && node.sprite) {
                // extra pulse to emphasize multi-ore
                this.tweens.add({ targets: node.sprite, scale: { from: 1.12, to: 1.25 }, yoyo: true, duration: 220, ease: 'Sine.easeOut' });
            }
        } else {
            mining.exp = (mining.exp || 0) + 5;
            this._showToast('You swing and find nothing. (+5 mining XP)');
            this._playMiningSwingEffect(node, false);
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
        }

        // check level up
        while (mining.exp >= mining.expToLevel) {
            mining.exp -= mining.expToLevel;
            mining.level = (mining.level || 1) + 1;
            mining.expToLevel = Math.floor(mining.expToLevel * 1.25);
            this._showToast('Mining level up! L' + mining.level, 2200);
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
        }

        this.char.mining = mining;

        // persist immediately
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);

        // update HUD (simple re-render of HUD element)
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    // Start continuous mining: attempt immediately and then repeatedly until stopped
    _startContinuousMining() {
        if (this.miningActive) return;
        this.miningActive = true;
        // mark activity as mining so HUD shows mining progress
        try { if (this.char) this.char.activity = 'mining'; } catch(e) {}
        // schedule-first: wait miningInterval before first attempt
        this._miningEvent = this.time.addEvent({ delay: this.miningInterval, callback: this._attemptMine, callbackScope: this, loop: true });
        // show mining indicator
        this._showMiningIndicator();
        // refresh HUD immediately so the mining bar appears
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _stopContinuousMining() {
        this.miningActive = false;
        if (this._miningEvent) {
            this._miningEvent.remove(false);
            this._miningEvent = null;
        }
        this._hideMiningIndicator();
        try { if (this.char) this.char.activity = null; } catch(e) {}
        // refresh HUD so it reverts to class exp bar
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
}
