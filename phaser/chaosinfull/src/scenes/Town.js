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
        const overlay = document.createElement('div');
        overlay.id = 'workbench-overlay';
        overlay.className = 'modal-overlay';
        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) this._closeWorkbenchModal();
        });

        const modal = document.createElement('div');
        modal.id = 'workbench-modal';
        modal.className = 'modal-card';
        overlay.appendChild(modal);

        const head = document.createElement('div');
        head.className = 'modal-head';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Workbench';
        head.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.id = 'workbench-close';
        closeBtn.type = 'button';
        closeBtn.className = 'btn btn-secondary modal-close';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', () => this._closeWorkbenchModal());
        head.appendChild(closeBtn);
        modal.appendChild(head);

        const desc = document.createElement('p');
        desc.className = 'modal-subtitle';
        desc.textContent = 'Craft gear with bars from the furnace.';
        modal.appendChild(desc);

        const body = document.createElement('div');
        body.className = 'modal-body workbench-body';

        const cats = document.createElement('nav');
        cats.id = 'wb-cats';
        cats.className = 'modal-column workbench-categories';

        const recipesCol = document.createElement('section');
        recipesCol.id = 'wb-recipes';
        recipesCol.className = 'modal-column workbench-recipes';

        const details = document.createElement('section');
        details.id = 'wb-details';
        details.className = 'modal-column workbench-details';

        body.appendChild(cats);
        body.appendChild(recipesCol);
        body.appendChild(details);
        modal.appendChild(body);

        const msg = document.createElement('div');
        msg.id = 'workbench-msg';
        msg.className = 'workbench-message';
        modal.appendChild(msg);

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        this._workbenchOverlay = overlay;
        this._workbenchModal = modal;
        this._workbenchMessageEl = msg;
        this._workbenchSelectedCategory = this._workbenchSelectedCategory || 'weapon';
        this._workbenchSelectedRecipe = this._workbenchSelectedRecipe || null;
        this._workbenchCraftCount = this._workbenchCraftCount || 1;
        this._workbenchHasFocusedRecipe = false;
        this._workbenchCountManual = false;

        this._workbenchEscHandler = (ev) => {
            if (ev.key === 'Escape') this._closeWorkbenchModal();
        };
        window.addEventListener('keydown', this._workbenchEscHandler);

        this._renderWorkbenchCategories();
        this._refreshWorkbenchModal();
    }
    _closeWorkbenchModal() {
        if (this._workbenchActiveCraft) {
            this._workbenchActiveCraft.silent = true;
            this._cancelWorkbenchCraft(true);
        }
        if (this._workbenchEscHandler) {
            window.removeEventListener('keydown', this._workbenchEscHandler);
            this._workbenchEscHandler = null;
        }
        if (this._workbenchOverlay && this._workbenchOverlay.parentNode) {
            this._workbenchOverlay.parentNode.removeChild(this._workbenchOverlay);
        } else if (this._workbenchModal && this._workbenchModal.parentNode) {
            this._workbenchModal.parentNode.removeChild(this._workbenchModal);
        }
        this._workbenchOverlay = null;
        this._workbenchModal = null;
        this._workbenchMessageEl = null;
        this._workbenchHasFocusedRecipe = false;
        this._workbenchCountManual = false;
        try { this._updateHUD(); } catch (e) {
            try { this._destroyHUD(); this._createHUD(); } catch (_) {}
        }
    }
    _renderWorkbenchCategories() {
        if (!this._workbenchModal) return;
        const catsEl = this._workbenchModal.querySelector('#wb-cats');
        if (!catsEl) return;
        const recipes = this._getWorkbenchRecipeDefs();
        const categoryMap = new Map();
        for (const key of Object.keys(recipes || {})) {
            const recipe = recipes[key];
            if (!recipe || recipe.tool !== 'workbench') continue;
            const normalized = this._normalizeWorkbenchCategory(recipe.category);
            if (!categoryMap.has(normalized)) {
                const raw = (typeof recipe.category === 'string' && recipe.category.trim().length)
                    ? recipe.category.trim()
                    : normalized;
                const label = raw.charAt(0).toUpperCase() + raw.slice(1);
                categoryMap.set(normalized, label);
            }
        }
        const categories = Array.from(categoryMap.keys());
        const preferred = ['weapon', 'armor', 'helm', 'boots', 'legs', 'rings', 'amulets', 'misc'];
        categories.sort((a, b) => {
            const ai = preferred.indexOf(a);
            const bi = preferred.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        catsEl.innerHTML = '';
        if (!categories.length) {
            const empty = document.createElement('div');
            empty.className = 'workbench-alert';
            empty.textContent = 'No workbench recipes unlocked yet.';
            catsEl.appendChild(empty);
            this._workbenchSelectedCategory = null;
            return;
        }
        if (!this._workbenchSelectedCategory || !categoryMap.has(this._workbenchSelectedCategory)) {
            this._workbenchSelectedCategory = categories[0];
        }
        for (const c of categories) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wb-cat-btn';
            if (c === this._workbenchSelectedCategory) btn.classList.add('is-active');
            const label = categoryMap.get(c) || (c.charAt(0).toUpperCase() + c.slice(1));
            btn.textContent = label;
            btn.addEventListener('click', () => {
                const activeCat = (this._workbenchActiveCraft && this._workbenchActiveCraft.recipe)
                    ? this._normalizeWorkbenchCategory(this._workbenchActiveCraft.recipe.category)
                    : null;
                if (activeCat && activeCat !== c) {
                    this._workbenchActiveCraft.silent = true;
                    this._cancelWorkbenchCraft(true);
                }
                this._workbenchSelectedCategory = c;
                this._workbenchSelectedRecipe = null;
                this._updateWorkbenchMessage('');
                this._renderWorkbenchCategories();
                this._refreshWorkbenchModal();
            });
            catsEl.appendChild(btn);
        }
    }
    _refreshWorkbenchModal() {
        if (!this._workbenchModal) return;
        this._renderWorkbenchCategories();
        const recipesCol = this._workbenchModal.querySelector('#wb-recipes');
        if (!recipesCol) return;
        const recipes = this._getWorkbenchRecipeDefs();
        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const inv = this.char.inventory || [];
        const findQty = (id) => {
            const it = inv.find(x => x && x.id === id);
            return it ? (it.qty || 0) : 0;
        };

        recipesCol.innerHTML = '';
        const cat = this._workbenchSelectedCategory || 'weapon';
        const recKeys = Object.keys(recipes || {}).filter(key => {
            const r = recipes[key];
            return r && r.tool === 'workbench' && (this._normalizeWorkbenchCategory(r.category) === cat);
        }).sort((a, b) => {
            const ra = recipes[a];
            const rb = recipes[b];
            return (ra && (ra.name || ra.id || a)).localeCompare(rb && (rb.name || rb.id || b));
        });

        if (!recKeys.length) {
            const empty = document.createElement('div');
            empty.className = 'workbench-alert';
            empty.textContent = 'No recipes in this category yet.';
            recipesCol.appendChild(empty);
            this._renderWorkbenchDetails(null);
            return;
        }

        if (!this._workbenchSelectedRecipe) {
            const firstKey = recKeys[0];
            const def = recipes[firstKey];
            this._workbenchSelectedRecipe = (def && def.id) ? def.id : firstKey;
        }

        const activeCraft = (this._workbenchActiveCraft && !this._workbenchActiveCraft.cancelled) ? this._workbenchActiveCraft : null;
        const recipeMap = {};
        let firstFocusable = null;

        for (const key of recKeys) {
            const r = recipes[key];
            if (!r) continue;
            const recipeId = r.id || key;
            recipeMap[recipeId] = r;
            const craftable = this._getCraftableCount(r);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wb-recipe-btn';
            btn.dataset.recipe = recipeId;

            const nameEl = document.createElement('div');
            nameEl.className = 'wb-recipe-name';
            nameEl.textContent = r.name || recipeId;
            btn.appendChild(nameEl);

            const meta = document.createElement('div');
            meta.className = 'wb-recipe-meta';
            const levelSpan = document.createElement('span');
            levelSpan.textContent = `Lv ${r.reqLevel || 1}`;
            meta.appendChild(levelSpan);
            const xpSpan = document.createElement('span');
            xpSpan.textContent = `${r.smithingXp || 0} xp`;
            meta.appendChild(xpSpan);
            const parts = (r.requires || []).map(req => {
                const label = (items[req.id] && items[req.id].name) || req.id;
                return req.qty && req.qty > 1 ? `${label} x${req.qty}` : label;
            });
            if (parts.length) {
                const mats = document.createElement('span');
                mats.textContent = parts.join(' | ');
                meta.appendChild(mats);
            }
            const ownEnough = craftable >= 1;
            const lvlOk = !(this.char.smithing && (this.char.smithing.level || 1) < (r.reqLevel || 1));
            const status = document.createElement('span');
            status.className = 'wb-recipe-status';
            if (!lvlOk) {
                status.classList.add('locked');
                status.textContent = 'Locked';
            } else if (ownEnough) {
                status.classList.add('ready');
                status.textContent = 'Ready';
            } else {
                status.classList.add('missing');
                status.textContent = 'Missing';
            }
            meta.appendChild(status);
            btn.appendChild(meta);

            if (this._workbenchSelectedRecipe === recipeId) btn.classList.add('is-active');
            if (activeCraft && activeCraft.recipe && activeCraft.recipe.id === recipeId) btn.classList.add('is-crafting');

            if (activeCraft && activeCraft.recipe && activeCraft.recipe.id !== recipeId) {
                btn.disabled = true;
            } else if (!lvlOk) {
                btn.disabled = true;
            }

            btn.addEventListener('click', () => {
                if (this._workbenchActiveCraft && this._workbenchActiveCraft.recipe && this._workbenchActiveCraft.recipe.id !== recipeId) {
                    this._workbenchActiveCraft.silent = true;
                    this._cancelWorkbenchCraft(true);
                }
                this._workbenchSelectedRecipe = recipeId;
                this._workbenchCountManual = false;
                const clamp = Math.max(1, craftable || 1);
                this._workbenchCraftCount = Math.min(Math.max(1, this._workbenchCraftCount || 1), clamp);
                this._updateWorkbenchMessage('');
                this._refreshWorkbenchModal();
            });

            recipesCol.appendChild(btn);
            if (!firstFocusable && !btn.disabled) firstFocusable = btn;
        }

        if (!recipeMap[this._workbenchSelectedRecipe]) {
            const firstKey = recKeys[0];
            const def = recipes[firstKey];
            this._workbenchSelectedRecipe = (def && def.id) ? def.id : firstKey;
        }

        if (!this._workbenchHasFocusedRecipe && firstFocusable) {
            firstFocusable.focus();
            this._workbenchHasFocusedRecipe = true;
        }

        const selectedRecipe = recipeMap[this._workbenchSelectedRecipe];
        this._renderWorkbenchDetails(selectedRecipe || null);
    }

    _getWorkbenchRecipeDefs() {
        if (typeof window !== 'undefined' && window.RECIPE_DEFS) return window.RECIPE_DEFS;
        try {
            // eslint-disable-next-line no-undef
            if (typeof RECIPE_DEFS !== 'undefined') return RECIPE_DEFS;
        } catch (_) {}
        return {};
    }

    _normalizeWorkbenchCategory(value) {
        if (!value || typeof value !== 'string') return 'misc';
        const trimmed = value.trim().toLowerCase();
        return trimmed || 'misc';
    }

    _renderWorkbenchDetails(recipe) {
        if (!this._workbenchModal) return;
        const details = this._workbenchModal.querySelector('#wb-details');
        if (!details) return;
        details.innerHTML = '';
        if (!recipe) {
            const placeholder = document.createElement('div');
            placeholder.className = 'workbench-alert';
            placeholder.textContent = 'Select a recipe to see its requirements.';
            details.appendChild(placeholder);
            return;
        }

        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const craftable = this._getCraftableCount(recipe);
        let count = Math.max(1, this._workbenchCraftCount || 1);
        if (!this._workbenchCountManual) {
            if (craftable > 0) count = Math.min(count, craftable);
            this._workbenchCraftCount = count;
        } else {
            this._workbenchCraftCount = count;
        }

        const validation = this._canCraftRecipe(recipe, count);
        const lvlOk = validation.levelOk;
        const missing = validation.missing;
        const active = (this._workbenchActiveCraft && !this._workbenchActiveCraft.cancelled) ? this._workbenchActiveCraft : null;
        const isCraftingThis = !!(active && active.recipe && active.recipe.id === recipe.id);

        const header = document.createElement('div');
        header.className = 'workbench-recipe-header';
        const title = document.createElement('div');
        title.className = 'workbench-recipe-title';
        title.textContent = recipe.name || recipe.id;
        header.appendChild(title);
        const sub = document.createElement('div');
        sub.className = 'workbench-recipe-sub';
        const lvlSpan = document.createElement('span');
        lvlSpan.textContent = `Smithing Lv ${recipe.reqLevel || 1}`;
        sub.appendChild(lvlSpan);
        const xpSpan = document.createElement('span');
        xpSpan.textContent = `${recipe.smithingXp || 0} xp per craft`;
        sub.appendChild(xpSpan);
        const maxSpan = document.createElement('span');
        maxSpan.textContent = `Max craftable: ${craftable}`;
        sub.appendChild(maxSpan);
        header.appendChild(sub);
        details.appendChild(header);

        const reqHeading = document.createElement('div');
        reqHeading.className = 'workbench-section-heading';
        reqHeading.textContent = 'Materials';
        details.appendChild(reqHeading);

        const reqList = document.createElement('div');
        reqList.className = 'workbench-reqs';
        for (const req of (recipe.requires || [])) {
            const per = Math.max(1, req.qty || 1);
            const need = per * count;
            const have = this._countInventoryItems(req.id);
            const itemDef = items[req.id];
            const name = (itemDef && itemDef.name) || req.id;

            const row = document.createElement('div');
            row.className = 'wb-req';
            row.classList.add(have >= need ? 'is-ready' : 'is-missing');

            const nameEl = document.createElement('div');
            nameEl.className = 'wb-req-name';
            nameEl.textContent = name;
            row.appendChild(nameEl);

            const countsWrap = document.createElement('div');
            countsWrap.className = 'wb-req-counts';
            const needEl = document.createElement('span');
            needEl.className = 'wb-req-reserved';
            needEl.textContent = `Need ${need}`;
            countsWrap.appendChild(needEl);
            const haveEl = document.createElement('span');
            haveEl.className = 'wb-req-have';
            haveEl.textContent = `Have ${have}`;
            countsWrap.appendChild(haveEl);
            row.appendChild(countsWrap);

            reqList.appendChild(row);
        }
        details.appendChild(reqList);

        if (!lvlOk) {
            const alert = document.createElement('div');
            alert.className = 'workbench-alert';
            alert.textContent = `Requires Smithing level ${recipe.reqLevel || 1}.`;
            details.appendChild(alert);
        } else if (missing.length) {
            const alert = document.createElement('div');
            alert.className = 'workbench-alert';
            const parts = missing.map(entry => {
                const itemDef = items[entry.id];
                const label = (itemDef && itemDef.name) || entry.id;
                return `${label} (${entry.have}/${entry.need})`;
            });
            alert.textContent = `Missing materials: ${parts.join(', ')}`;
            details.appendChild(alert);
        } else if (isCraftingThis) {
            const ready = document.createElement('div');
            ready.className = 'workbench-ready';
            ready.textContent = `Crafting in progress (${active.remaining} remaining)...`;
            details.appendChild(ready);
        } else {
            const ready = document.createElement('div');
            ready.className = 'workbench-ready';
            ready.textContent = `All materials ready for ${count} craft${count > 1 ? 's' : ''}.`;
            details.appendChild(ready);
        }

        const progress = document.createElement('div');
        progress.id = 'workbench-progress';
        progress.className = 'workbench-progress';
        details.appendChild(progress);
        if (active && active.recipe && active.recipe.id === recipe.id) active.progressContainer = progress;

        const actions = document.createElement('div');
        actions.className = 'workbench-actions';

        const left = document.createElement('div');
        left.className = 'workbench-actions-left';
        const quickBtn = document.createElement('button');
        quickBtn.type = 'button';
        quickBtn.className = 'btn btn-secondary';
        quickBtn.textContent = 'Max';
        quickBtn.disabled = isCraftingThis || craftable <= 0;
        quickBtn.addEventListener('click', () => {
            const max = this._getCraftableCount(recipe);
            if (max <= 0) {
                this._updateWorkbenchMessage('No materials available to craft this.', 'warn');
                return;
            }
            this._workbenchCountManual = true;
            this._workbenchCraftCount = Math.max(1, max);
            this._updateWorkbenchMessage(`Set count to maximum craftable (${max}).`, 'success');
            this._refreshWorkbenchModal();
        });
        left.appendChild(quickBtn);
        actions.appendChild(left);

        const right = document.createElement('div');
        right.className = 'workbench-actions-right';
        const countLabel = document.createElement('label');
        countLabel.textContent = 'Count';
        right.appendChild(countLabel);
        const countInput = document.createElement('input');
        countInput.type = 'number';
        countInput.min = '1';
        countInput.value = this._workbenchCraftCount || 1;
        countInput.className = 'input-small';
        countInput.disabled = isCraftingThis;
        countInput.addEventListener('input', () => {
            const val = Math.max(1, parseInt(countInput.value, 10) || 1);
            countInput.value = val;
            this._workbenchCraftCount = val;
            this._workbenchCountManual = true;
            this._refreshWorkbenchModal();
        });
        right.appendChild(countInput);

        const startBtn = document.createElement('button');
        startBtn.type = 'button';
        startBtn.className = 'btn btn-primary';
        startBtn.textContent = isCraftingThis ? 'Crafting...' : `Craft ${this._workbenchCraftCount || 1}`;
        const readyToCraft = lvlOk && missing.length === 0 && !isCraftingThis;
        startBtn.disabled = !readyToCraft;
        startBtn.addEventListener('click', () => {
            if (startBtn.disabled) return;
            this._beginWorkbenchCraft(recipe);
        });
        right.appendChild(startBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-ghost';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.disabled = !isCraftingThis;
        cancelBtn.addEventListener('click', () => this._cancelWorkbenchCraft());
        right.appendChild(cancelBtn);

        actions.appendChild(right);
        details.appendChild(actions);
    }

    _getCraftableCount(recipe) {
        if (!recipe || !(recipe.requires || []).length) return 0;
        let minSets = Infinity;
        for (const req of (recipe.requires || [])) {
            const need = Math.max(1, req.qty || 1);
            const have = this._countInventoryItems(req.id);
            minSets = Math.min(minSets, Math.floor(have / need));
        }
        if (minSets === Infinity) return 0;
        return Math.max(0, minSets);
    }

    _canCraftRecipe(recipe, count = 1) {
        const result = { ok: true, levelOk: true, missing: [] };
        if (!recipe) { result.ok = false; return result; }
        const lvlOk = !(this.char.smithing && (this.char.smithing.level || 1) < (recipe.reqLevel || 1));
        result.levelOk = lvlOk;
        if (!lvlOk) result.ok = false;
        for (const req of (recipe.requires || [])) {
            const need = Math.max(1, req.qty || 1) * Math.max(1, count);
            const have = this._countInventoryItems(req.id);
            if (have < need) {
                result.ok = false;
                result.missing.push({ id: req.id, need, have });
            }
        }
        return result;
    }

    _consumeRecipeMaterials(recipe, count) {
        const consumed = {};
        for (const req of (recipe.requires || [])) {
            const total = Math.max(1, req.qty || 1) * Math.max(1, count);
            if (total <= 0) continue;
            const ok = this._removeInventoryItems(req.id, total);
            if (!ok) {
                for (const key of Object.keys(consumed)) this._returnInventoryItems(key, consumed[key]);
                return null;
            }
            consumed[req.id] = (consumed[req.id] || 0) + total;
        }
        return consumed;
    }

    _removeInventoryItems(itemId, qty) {
        if (qty <= 0) return true;
        const shared = (window && window.__shared_ui) || null;
        if (shared && shared.removeItemFromInventory) {
            return !!shared.removeItemFromInventory(this, itemId, qty, true);
        }
        const inv = this.char.inventory = this.char.inventory || [];
        let total = 0;
        for (const slot of inv) {
            if (slot && slot.id === itemId) total += slot.qty || 1;
        }
        if (total < qty) return false;
        let remaining = qty;
        for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
            const slot = inv[i];
            if (!slot || slot.id !== itemId) continue;
            const take = Math.min(slot.qty || 1, remaining);
            slot.qty = (slot.qty || 1) - take;
            remaining -= take;
            if (slot.qty <= 0) inv.splice(i, 1);
        }
        return remaining === 0;
    }

    _returnInventoryItems(itemId, qty) {
        if (qty <= 0) return;
        const shared = (window && window.__shared_ui) || null;
        if (shared && shared.addItemToInventory) {
            shared.addItemToInventory(this, itemId, qty, true);
            return;
        }
        const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const def = items[itemId];
        const inv = this.char.inventory = this.char.inventory || [];
        if (def && def.stackable) {
            const slot = inv.find(s => s && s.id === itemId);
            if (slot) slot.qty = (slot.qty || 0) + qty;
            else inv.push({ id: itemId, name: def.name || itemId, qty });
        } else {
            for (let i = 0; i < qty; i++) {
                inv.push({ id: itemId, name: (def && def.name) || itemId, qty: 1 });
            }
        }
    }

    _countInventoryItems(itemId) {
        const inv = this.char.inventory || [];
        let total = 0;
        for (const slot of inv) {
            if (slot && slot.id === itemId) total += slot.qty || 1;
        }
        return total;
    }

    _beginWorkbenchCraft(recipe) {
        if (!recipe || !this._workbenchModal) return;
        const count = Math.max(1, this._workbenchCraftCount || 1);
        const validation = this._canCraftRecipe(recipe, count);
        if (!validation.levelOk) {
            this._updateWorkbenchMessage(`Requires Smithing level ${recipe.reqLevel || 1}.`, 'warn');
            return;
        }
        if (validation.missing.length) {
            const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
            const parts = validation.missing.map(entry => {
                const def = items[entry.id];
                const label = (def && def.name) || entry.id;
                return `${label} (${entry.have}/${entry.need})`;
            });
            this._updateWorkbenchMessage(`Missing materials: ${parts.join(', ')}`, 'warn');
            return;
        }

        const consumed = this._consumeRecipeMaterials(recipe, count);
        if (!consumed) {
            this._updateWorkbenchMessage('Could not remove materials from inventory.', 'error');
            return;
        }
        if (this._inventoryModal) this._refreshInventoryModal();

        const duration = this.craftingInterval || 2800;
        const active = {
            recipe,
            cancelled: false,
            silent: false,
            cancel: null,
            frameId: null,
            progressContainer: null,
            remaining: count,
            total: count,
            consumed
        };
        this._workbenchActiveCraft = active;
        this._updateWorkbenchMessage(`Crafting ${count}x ${recipe.name || recipe.id}...`, 'warn');
        this._refreshWorkbenchModal();
        const run = async () => {
            while (active.remaining > 0 && !active.cancelled) {
                if (!this._workbenchModal || !document.body.contains(this._workbenchModal)) {
                    active.cancelled = true;
                    break;
                }
                const progressEl = this._workbenchModal.querySelector('#workbench-progress');
                if (!progressEl) break;
                progressEl.innerHTML = '';
                const canvas = document.createElement('canvas');
                canvas.width = 72;
                canvas.height = 72;
                progressEl.appendChild(canvas);
                const ctx = canvas.getContext('2d');
                const finished = await this._workbenchProgressTick(ctx, duration, active);
                if (!finished) break;
                if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) {
                    window.__shared_ui.addItemToInventory(this, recipe.id, 1);
                } else {
                    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                    const def = defs && defs[recipe.id];
                    const target = this.char.inventory || [];
                    if (def && def.stackable) {
                        const existing = target.find(x => x && x.id === recipe.id);
                        if (existing) existing.qty = (existing.qty || 0) + 1;
                        else target.push({ id: recipe.id, name: (def && def.name) || recipe.name, qty: 1 });
                    } else {
                        target.push({ id: recipe.id, name: (recipe && recipe.name) || recipe.id, qty: 1 });
                    }
                }
                this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
                this.char.smithing.exp = (this.char.smithing.exp || 0) + (recipe.smithingXp || 0);
                while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                    this.char.smithing.exp -= this.char.smithing.expToLevel;
                    this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                    this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                    this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
                }
                try {
                    if (this._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) {
                        window.__shared_ui.refreshStatsModal(this);
                    }
                } catch (_) {}
                const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                if (this._persistCharacter) this._persistCharacter(username);
                if (this._inventoryModal) this._refreshInventoryModal();
                active.remaining -= 1;
                this._refreshWorkbenchModal();
            }
            if (active.cancelled) {
                if (active.remaining > 0) {
                    for (const req of (recipe.requires || [])) {
                        const per = Math.max(1, req.qty || 1);
                        const refund = per * active.remaining;
                        if (refund > 0) this._returnInventoryItems(req.id, refund);
                    }
                    if (this._inventoryModal) this._refreshInventoryModal();
                }
                if (!active.silent) this._updateWorkbenchMessage('Crafting cancelled.', 'warn');
            } else {
                this._updateWorkbenchMessage(`Crafted ${active.total}x ${recipe.name || recipe.id}`, 'success');
            }
            this._workbenchActiveCraft = null;
            this._workbenchCountManual = false;
            const newMax = this._getCraftableCount(recipe);
            this._workbenchCraftCount = Math.max(1, Math.min(this._workbenchCraftCount || 1, newMax || 1));
            this._refreshWorkbenchModal();
        };
        run();
    }
    _workbenchProgressTick(ctx, duration, active) {
        return new Promise((resolve) => {
            if (!ctx) {
                resolve(false);
                return;
            }
            let finished = false;
            const center = ctx.canvas.width / 2;
            const radius = (Math.min(ctx.canvas.width, ctx.canvas.height) / 2) - 6;
            ctx.lineCap = 'round';
            const finish = (value) => {
                if (finished) return;
                finished = true;
                if (active) active.frameId = null;
                resolve(value);
            };
            const start = performance.now();
            const step = (now) => {
                if (active && active.cancelled) {
                    finish(false);
                    return;
                }
                const t = Math.min(1, (now - start) / duration);
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.beginPath();
                ctx.arc(center, center, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(center, center, radius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * t));
                ctx.strokeStyle = '#ffd27a';
                ctx.lineWidth = 6;
                ctx.stroke();
                if (t >= 1) {
                    finish(true);
                    return;
                }
                active.frameId = requestAnimationFrame(step);
            };
            active.cancel = () => {
                if (active.frameId) cancelAnimationFrame(active.frameId);
                finish(false);
            };
            active.frameId = requestAnimationFrame(step);
        });
    }
    _cancelWorkbenchCraft(silent = false) {
        const active = this._workbenchActiveCraft;
        if (!active || active.cancelled) return;
        active.silent = silent;
        active.cancelled = true;
        if (typeof active.cancel === 'function') active.cancel();
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
        const find = (id) => {
            if (window && window.__shared_ui && window.__shared_ui.initSlots) {
                const slots = window.__shared_ui.initSlots(this.char.inventory || []);
                return slots.find(x => x && x.id === id);
            }
            return inv.find(x => x && x.id === id);
        };
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
        // consume materials (slot-aware when possible)
        for (const req of (recipe.requires || [])) {
            const qtyNeeded = (req.qty || 1);
            if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
                const ok = window.__shared_ui.removeItemFromInventory(this, req.id, qtyNeeded);
                if (!ok) {
                    this._stopContinuousSmelting && this._stopContinuousSmelting();
                    this._showToast('Out of materials for ' + (recipe.name || recipeId));
                    return;
                }
            } else {
                const it = find(req.id);
                if (it) {
                    it.qty -= qtyNeeded;
                    if (it.qty <= 0) inv.splice(inv.indexOf(it), 1);
                }
            }
        }
        // give product
        const prodId = recipe.id || recipeId;
        const prodDef = items && items[prodId];
        // give product (slot-aware)
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
                const def = defs && defs[s.id]; const icon = def && def.weapon ? '⚔️' : (def && def.armor ? '🛡️' : '📦');
                // include icon and a small label for the item name; label uses pointer-events:none so clicks hit the slot
                el.innerHTML = `<div title='${s.name || (def && def.name) || s.id}'>${icon}</div>`;
                if (s.qty && s.qty > 1) { const q = document.createElement('div'); q.className='qty'; q.textContent = s.qty; el.appendChild(q); }
                const label = document.createElement('div'); label.className = 'slot-label'; label.style.cssText = 'font-size:10px;position:absolute;left:6px;bottom:4px;color:#ddd;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                label.textContent = (def && def.name) || s.name || s.id;
                el.appendChild(label);
                el.style.cursor = 'pointer';
                // click the slot to deposit one
                try { el.addEventListener('click', () => { try { this._depositToStorage(s.id, 1); } catch (e) {} }); } catch (e) {}
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
                const def = defs && defs[s.id]; const icon = def && def.weapon ? '⚔️' : (def && def.armor ? '🛡️' : '📦');
                el.innerHTML = `<div title='${s.name || (def && def.name) || s.id}'>${icon}</div>`;
                if (s.qty && s.qty > 1) { const q = document.createElement('div'); q.className='qty'; q.textContent = s.qty; el.appendChild(q); }
                const label = document.createElement('div'); label.className = 'slot-label'; label.style.cssText = 'font-size:10px;position:absolute;left:6px;bottom:4px;color:#ddd;pointer-events:none;text-shadow:0 1px 0 rgba(0,0,0,0.6);';
                label.textContent = (def && def.name) || s.name || s.id;
                el.appendChild(label);
                el.style.cursor = 'pointer';
                // click the slot to withdraw one
                try { el.addEventListener('click', () => { try { this._withdrawFromStorage(s.id, 1); } catch (e) {} }); } catch (e) {}
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
