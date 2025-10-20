// GraveForest scene: copied from Cave but with trees and woodcutting instead of mining
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
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('furnace', 'assets/furnace.png', { frameWidth: 64, frameHeight: 96 });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const bg = this.add.image(centerX, centerY, 'forest_bg');
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.add.text(centerX, 32, 'Graveyard Forest', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

        // Player spawn
        const platformHeight = 60;
        const platformY = this.scale.height - (platformHeight / 2);
        const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || Math.max(80, this.scale.width * 0.12);
        const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (platformY - 70);
        this.player = this.physics.add.sprite(spawnX, spawnY, 'dude');
        this.player.setDepth(2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 40);
        this.player.body.setOffset(6, 8);
        const platform = this.add.rectangle(centerX, platformY, this.scale.width, platformHeight, 0x224422, 1);
        platform.setDepth(1);
        this.physics.add.existing(platform, true);
        this.physics.add.collider(this.player, platform);

        // Animations
        if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
        if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

        if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);

        // Character data
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.woodcutting) this.char.woodcutting = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];
        try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) { }

        if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();
        try { if (window && window.__overlays_shared && window.__overlays_shared.createAtmosphericOverlays) { this._overlays = window.__overlays_shared.createAtmosphericOverlays(this, { idPrefix: 'graveforest', zIndexBase: 120, layers: ['fog'] }); } } catch (e) { this._overlays = null; }
        this._startSafeZoneRegen();

        // Right-side portal back to OuterField
        const portalX = this.scale.width - 80;
        const portalY = platformY - 60;
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            // spawn back to the highest platform center in OuterField (reciprocal position)
            const outerSpawnY = this.scale.height - 280 - 70; // highest platform spawnY
            const outerSpawnX = Math.round(this.scale.width / 2);
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

        // No combat in GraveForest: do not attach combat mixins or spawn enemies

        // Place tree nodes on the platform (normal tree left, oak tree right)
        const platformTop = platformY - (60 / 2);
        this._createTreeNode(460, platformTop - 28, 'normal');
        this._createTreeNode(580, platformTop - 28, 'oak');

        // Portal to BrokenDock (left-side near entrance)
        try {
            const dockPortalX = 140;
            const dockPortalY = platformY - 60;
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const pob = portalHelper.createPortal(this, dockPortalX, dockPortalY, { depth: 1.5, targetScene: 'BrokenDock', spawnX: 120, spawnY: platformY - 70, promptLabel: 'Enter Broken Dock' });
            this.brokenDockPortal = pob.display;
            this.brokenDockPrompt = this.add.text(dockPortalX, dockPortalY - 60, '[E] Enter Broken Dock', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.brokenDockPrompt.setVisible(false);
        } catch (e) {
            const dockPortalX = 140; const dockPortalY = platformY - 60;
            this.brokenDockPortal = this.add.circle(dockPortalX, dockPortalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.brokenDockPrompt = this.add.text(dockPortalX, dockPortalY - 60, '[E] Enter Broken Dock', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.brokenDockPrompt.setVisible(false);
        }

        // continuous woodcutting state
        this.woodcuttingActive = false;
        this._woodcuttingEvent = null;
        this.woodcuttingInterval = 2800;

        this._toastContainer = null;

        this.events.once('shutdown', () => {
            this._destroyHUD();
            this._clearToasts();
            this._stopSafeZoneRegen();
            if (this._woodcuttingIndicator && this._woodcuttingIndicator.parent) { this._woodcuttingIndicator.destroy(); this._woodcuttingIndicator = null; }
            try { if (this._overlays && this._overlays.destroy) this._overlays.destroy(); } catch(e) {}
            this._overlays = null;
            this._closeInventoryModal();
        });
    }

    _startSafeZoneRegen() {
        const regenDelay = 1800;
        if (this.safeRegenEvent) this.safeRegenEvent.remove(false);
        this.safeRegenEvent = this.time.addEvent({ delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
    }
    _stopSafeZoneRegen() { if (this.safeRegenEvent) { this.safeRegenEvent.remove(false); this.safeRegenEvent = null; } }
    _tickSafeZoneRegen() { if (!this.char) return; const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : { str: 0 }; const strength = (effStats && effStats.str) || 0; const level = this.char.level || 1; const estimatedMax = 100 + level * 10 + ((strength || 0) * 10); const maxhp = Math.max(this.char.maxhp || estimatedMax, 1); this.char.maxhp = maxhp; const currentHp = Math.max(0, this.char.hp != null ? this.char.hp : maxhp); if (currentHp >= maxhp) return; const amount = Math.max(1, Math.floor(strength / 2) + 2); this.char.hp = Math.min(maxhp, currentHp + amount); this._updateHUD(); }

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
        const config = {
            normal: { color: 0x2e8b57, baseChance: 0.75, item: { id: 'normal_log', name: 'Normal Log' }, label: 'Tree' },
            oak: { color: 0x6b8e23, baseChance: 0.45, item: { id: 'oak_log', name: 'Oak Log' }, label: 'Oak Tree' }
        };
        const cfg = config[type] || config.normal;
        const node = {};
        node.type = type;
        node.x = x; node.y = y; node.r = 28;
        node.baseChance = cfg.baseChance;
        node.item = cfg.item;
        node.color = cfg.color;
        node.label = cfg.label;
        // try to use sprites if available
        if (type === 'normal' && this.textures.exists && this.textures.exists('normal_log')) {
            try { node.sprite = this.add.sprite(x, y, 'normal_log').setOrigin(0.5).setDepth(1.2); const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32; node.sprite.y = y + (node.r - (hh / 2)); } catch (e) { node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2); }
        } else if (type === 'oak' && this.textures.exists && this.textures.exists('oak_log')) {
            try { node.sprite = this.add.sprite(x, y, 'oak_log').setOrigin(0.5).setDepth(1.2); const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32; node.sprite.y = y + (node.r - (hh / 2)); } catch (e) { node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2); }
        } else {
            node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
        }
        node.prompt = this.add.text(x, y - 60, `[E] Chop ${node.label}`, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        node.prompt.setVisible(false);
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

    _persistCharacter(username) { if (!username || !this.char) return; try { const key = 'cif_user_' + username; const userObj = JSON.parse(localStorage.getItem(key)); if (userObj && userObj.characters) { let found = false; for (let i = 0; i < userObj.characters.length; i++) { const uc = userObj.characters[i]; if (!uc) continue; if ((uc.id && this.char.id && uc.id === this.char.id) || (!uc.id && uc.name === this.char.name)) { userObj.characters[i].woodcutting = this.char.woodcutting; userObj.characters[i].inventory = this.char.inventory; found = true; break; } } if (!found) { for (let i = 0; i < userObj.characters.length; i++) { if (!userObj.characters[i]) { userObj.characters[i] = this.char; found = true; break; } } if (!found) userObj.characters.push(this.char); } localStorage.setItem(key, JSON.stringify(userObj)); } } catch (e) { console.warn('Could not persist character', e); } try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) {}
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const speed = 180;
        if (this.keys.left.isDown) { this.player.setVelocityX(-speed); this.player.anims.play('left', true); }
        else if (this.keys.right.isDown) { this.player.setVelocityX(speed); this.player.anims.play('right', true); }
        else { this.player.setVelocityX(0); this.player.anims.play('turn'); }
        if (this.keys.up.isDown && this.player.body.blocked.down) this.player.setVelocityY(-380);

        // portal interaction handled by portal helper if provided

        // Inventory toggle (I)
        if (Phaser.Input.Keyboard.JustDown(this.keys.inventory)) {
            if (window && window.__shared_ui) {
                if (this._inventoryModal) window.__shared_ui.closeInventoryModal(this); else window.__shared_ui.openInventoryModal(this);
            }
        }
        // Equipment toggle (U)
        if (Phaser.Input.Keyboard.JustDown(this.keys.equip)) {
            if (window && window.__shared_ui) {
                if (this._equipmentModal) window.__shared_ui.closeEquipmentModal(this); else window.__shared_ui.openEquipmentModal(this);
            }
        }
        // Stats toggle (X)
        if (this.keys.stats && Phaser.Input.Keyboard.JustDown(this.keys.stats)) {
            if (window && window.__shared_ui) {
                if (this._statsModal) window.__shared_ui.closeStatsModal(this); else window.__shared_ui.openStatsModal(this);
            }
        }

        // tree node interaction
        if (this.treeNodes && this.treeNodes.length) {
            let nearest = null; let nearestDist = 9999;
            for (const node of this.treeNodes) {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
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
        const node = this._activeTree; if (!node) return;
        const wc = this.char.woodcutting || { level:1, exp:0, expToLevel:100 };
        const str = (this.char.stats && this.char.stats.str) || 0;
        let chance = (node.baseChance || 0.35) + 0.02 * (wc.level || 1) + 0.01 * str;
        chance = Math.max(0.05, chance);
        const got = Math.random() < chance;
        if (got) {
            const base = node.baseChance || 0.35; const multiplier = Math.max(1, Math.floor(chance / base));
            let delta = 0;
            try {
                if (window && window.__shared_ui && typeof window.__shared_ui.addItemToInventory === 'function') {
                    let prev = 0; try { if (typeof window.__shared_ui.initSlots === 'function' && typeof window.__shared_ui.getQtyInSlots === 'function') prev = window.__shared_ui.getQtyInSlots(window.__shared_ui.initSlots(this.char.inventory || []), node.item.id) || 0; } catch (e) { prev = 0; }
                    let added = false; try { added = !!window.__shared_ui.addItemToInventory(this, node.item.id, multiplier); } catch (e) { added = false; }
                    let newQty = prev + (added ? multiplier : 0);
                    try { if (typeof window.__shared_ui.initSlots === 'function' && typeof window.__shared_ui.getQtyInSlots === 'function') newQty = window.__shared_ui.getQtyInSlots(window.__shared_ui.initSlots(this.char.inventory || []), node.item.id); } catch (e) {}
                    delta = Math.max(0, (newQty || 0) - (prev || 0));
                } else {
                    this.char.inventory = this.char.inventory || [];
                    let found = null; for (let it of this.char.inventory) { if (it && it.id === node.item.id) { found = it; break; } }
                    let prevQty = 0; let newQty = 0;
                    if (found) { prevQty = found.qty || 0; newQty = prevQty + multiplier; found.qty = newQty; } else { this.char.inventory.push({ id: node.item.id, name: node.item.name, qty: multiplier }); prevQty = 0; newQty = multiplier; }
                    delta = Math.max(0, newQty - prevQty);
                }
            } catch (e) { console.warn('Error while adding wood item, falling back:', e); delta = multiplier; }
            wc.exp = (wc.exp || 0) + (15 * multiplier);
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) {}
            this._showToast(`You chopped ${delta}x ${node.item.name}! (+${15 * multiplier} woodcutting XP)`);
            this._playWoodSwingEffect(node, true);
            if (multiplier > 1 && node.sprite) this.tweens.add({ targets: node.sprite, scale: { from: 1.12, to: 1.25 }, yoyo: true, duration: 220, ease: 'Sine.easeOut' });
        } else {
            wc.exp = (wc.exp || 0) + 5; this._showToast('You swing and miss. (+5 woodcutting XP)'); this._playWoodSwingEffect(node, false); try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) {}
        }

        this.char.woodcutting = wc;
        while (wc.exp >= wc.expToLevel) { wc.exp -= wc.expToLevel; wc.level = (wc.level || 1) + 1; wc.expToLevel = Math.floor(wc.expToLevel * 1.25); this._showToast('Woodcutting level up! L' + wc.level, 2200); try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) {} }
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null; this._persistCharacter(username);
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _startContinuousWoodcutting() {
        if (this.woodcuttingActive) return; this.woodcuttingActive = true; try { if (this.char) this.char.activity = 'woodcutting'; } catch(e) {}
        this._woodcuttingEvent = this.time.addEvent({ delay: this.woodcuttingInterval, callback: this._attemptChop, callbackScope: this, loop: true });
        this._showWoodcuttingIndicator(); try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _stopContinuousWoodcutting() { this.woodcuttingActive = false; if (this._woodcuttingEvent) { this._woodcuttingEvent.remove(false); this._woodcuttingEvent = null; } this._hideWoodcuttingIndicator(); try { if (this.char) this.char.activity = null; } catch(e) {} try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} } }
}

export default GraveForest;
