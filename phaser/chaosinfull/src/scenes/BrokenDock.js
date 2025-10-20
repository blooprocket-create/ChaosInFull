import { createPortal } from './shared/portal.js';
import FISHING_DEFS from '../data/fishing.js';

export class BrokenDock extends Phaser.Scene {
    constructor() {
        super('BrokenDock');
    }

    preload() {
        this.load.image('dock_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const bg = this.add.image(centerX, centerY, 'dock_bg');
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.add.text(centerX, 32, 'Broken Dock', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

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

        // ensure standard movement animations exist (some scenes create these; make sure they're available)
        try {
            if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
            if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
            if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
        } catch (e) { console.warn('Failed to create player animations in BrokenDock', e); }

        // Dock platform: starts left, spans about 65% width
        const dockWidth = Math.round(this.scale.width * 0.65);
        const dockX = (dockWidth / 2) + 40;
        const dock = this.add.rectangle(dockX, platformY, dockWidth, platformHeight, 0x6b4a2b, 1).setDepth(1);
        this.physics.add.existing(dock, true);
        this.physics.add.collider(this.player, dock);

    // Create fishing node positioned right at the end of the dock (slightly off platform)
    const nodeX = dockX + (dockWidth / 2) + 12; // just beyond the dock edge
    const nodeY = platformY - 28;
    this.fishingNode = this._createFishingNode(nodeX, nodeY);

        // Bait bucket (shop) positioned mid-dock
        const bucketX = dockX + 120;
        this.baitBucket = this._createBucket(bucketX, nodeY - 10);

        // attach keys and HUD
        if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.inventory) this.char.inventory = [];
        try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) {}
        if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();

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

        // Left-side portal back to GraveForest (use onEnter wrapper to persist and delay transition)
        try {
            const portalX = 72;
            const portalY = platformY - 60;
            const onEnter = (scene, portal) => {
                try {
                    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
                    try {
                        const key = 'cif_user_' + username;
                        const userObj = JSON.parse(localStorage.getItem(key));
                        if (userObj && userObj.characters) {
                            let found = false;
                            for (let i = 0; i < userObj.characters.length; i++) {
                                const uc = userObj.characters[i]; if (!uc) continue;
                                if ((uc.id && scene.char && scene.char.id && uc.id === scene.char.id) || (!uc.id && uc.name === (scene.char && scene.char.name))) {
                                    userObj.characters[i] = scene.char;
                                    userObj.characters[i].lastLocation = { scene: 'GraveForest', x: scene.player.x, y: portalY };
                                    found = true; break;
                                }
                            }
                            if (!found) { userObj.characters.push(scene.char); }
                            localStorage.setItem(key, JSON.stringify(userObj));
                        }
                    } catch (e) { /* ignore persisting errors */ }
                    const spawnX = Math.round(scene.scale.width / 2);
                    const spawnY = platformY - 70;
                    // delay the scene change slightly to avoid doing it inside the portal update-frame
                    try { window.setTimeout(() => { try { scene.scene.start('GraveForest', { character: scene.char, username: username, spawnX: spawnX, spawnY: spawnY }); } catch (e) { console.warn('portal transition failed', e); } }, 30); } catch (e) { try { scene.scene.start('GraveForest', { character: scene.char, username: username, spawnX: spawnX, spawnY: spawnY }); } catch (ee) { console.warn('portal transition failed', ee); } }
                } catch (e) { console.warn('portal onEnter handler error', e); }
            };
            const pobj = createPortal(this, portalX, portalY, { depth: 1.5, onEnter: onEnter, promptLabel: 'Return to Grave Forest' });
            this.portal = pobj.display;
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Grave Forest', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
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

        // continuous fishing state and helpers
        this.fishingActive = false;
        this.fishingEvent = null;
        this.fishingIntervalMs = 3000; // default, will use effectiveStats when starting
        this.fishingIndicator = null;

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

        this._startFishingLoop = (baitId, attemptFn) => {
            if (this.fishingActive) return;
            this.fishingActive = true;
            this._fishingStartPos = { x: this.player.x, y: this.player.y };
            // show indicator and perform immediate attempt
            this._showFishingIndicator();
            try { attemptFn(); } catch (e) { console.error('Fishing attempt error', e); }
            // compute interval ms from character / rod / luck if available
            let interval = this.fishingIntervalMs;
            try {
                const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
                const luk = (eff && typeof eff.luk === 'number') ? eff.luk : ((this.char && this.char.stats && this.char.stats.luk) || 0);
                interval = Math.max(700, Math.round(interval - (luk * 8)));
            } catch (e) {}
            this.fishingEvent = this.time.addEvent({ delay: interval, loop: true, callback: () => {
                // stop if moved
                if (this._playerMovedWhileFishing()) { this._showToast && this._showToast('Stopped fishing (moved)'); this._stopFishingLoop(); return; }
                try { attemptFn(); } catch (e) { console.error('Fishing repeated attempt error', e); }
            }});
        };

        this._stopFishingLoop = () => {
            if (!this.fishingActive) return;
            this.fishingActive = false;
            try { if (this.fishingEvent) { this.fishingEvent.remove(false); this.fishingEvent = null; } } catch (e) {}
            try { this._fishingStartPos = null; } catch (e) {}
            this._hideFishingIndicator();
        };

        this.events.once('shutdown', () => {
            try { if (typeof this._destroyHUD === 'function') this._destroyHUD(); }
            catch (e) { console.warn('Destroy HUD failed or not present', e); }
            try { if (typeof this._clearToasts === 'function') this._clearToasts(); }
            catch (e) { /* ignore */ }
            try {
                // prefer shared UI close if available, otherwise call scene helper if present
                if (window && window.__shared_ui && typeof window.__shared_ui.closeInventoryModal === 'function') {
                    window.__shared_ui.closeInventoryModal(this);
                } else if (typeof this._closeInventoryModal === 'function') {
                    this._closeInventoryModal();
                }
            } catch (e) { /* ignore */ }
        });
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
        const speed = 180;
        if (this.keys.left.isDown) { this.player.setVelocityX(-speed); this.player.anims.play('left', true); }
        else if (this.keys.right.isDown) { this.player.setVelocityX(speed); this.player.anims.play('right', true); }
        else { this.player.setVelocityX(0); this.player.anims.play('turn'); }
        if (this.keys.up.isDown && this.player.body.blocked.down) this.player.setVelocityY(-380);

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

        // Inventory toggle
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
        // simple modal: list available bait items from ITEM_DEFS and allow adding to inventory via purchase
        if (typeof document === 'undefined') return;
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        // use shared modal styles
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay show'; overlay.style.zIndex = 260;
        const card = document.createElement('div'); card.className = 'modal-card'; card.style.minWidth = '360px';
        card.innerHTML = `<div class='modal-head'><div class='modal-title'>Bait Bucket</div><div><button id='bucket-close' class='btn btn-ghost'>Close</button></div></div><div class='modal-body' style='flex-direction:column;gap:10px;'><div id='bucket-list' style='display:flex;flex-direction:column;gap:8px;min-width:300px;'></div></div>`;
        overlay.appendChild(card);
        const list = card.querySelector('#bucket-list');
        // dynamically list bait options from ITEM_DEFS (ids that include '_bait' or explicit bait rarity)
        const baitKeys = Object.keys(defs).filter(k => k && k.toLowerCase().includes('_bait'));
        for (const id of baitKeys) {
            const d = defs[id]; if (!d) continue;
            const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
            row.innerHTML = `<div><strong>${d.name}</strong><div style='font-size:12px;opacity:0.9'>${d.description}</div></div><div style='display:flex;flex-direction:column;gap:6px;align-items:flex-end;'><div style='font-weight:800;color:#ffd27a'>${d.value}g</div></div>`;
            const buyBtn = document.createElement('button'); buyBtn.textContent = 'Buy 1'; buyBtn.style.marginLeft='8px';
            buyBtn.onclick = () => {
                try {
                    const price = Number(d.value || 0);
                    const gold = (this.char && typeof this.char.gold === 'number') ? this.char.gold : 0;
                    if (gold < price) { this._showToast && this._showToast('Not enough gold'); return; }
                    // deduct gold and persist
                    this.char.gold = gold - price;
                    try { const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null; if (this._persistCharacter) this._persistCharacter(username); } catch (e) {}
                    // add to inventory
                    let added = false;
                    try { if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) { added = window.__shared_ui.addItemToInventory(this, id, 1); } } catch (e) { added = false; }
                    if (!added) {
                        const inv = this.char.inventory = this.char.inventory || [];
                        if (d && d.stackable) {
                            const slot = inv.find(x => x && x.id === id);
                            if (slot) slot.qty = (slot.qty || 0) + 1; else inv.push({ id: id, name: d.name, qty: 1 });
                        } else {
                            inv.push({ id: id, name: d.name, qty: 1 });
                        }
                    }
                    this._showToast && this._showToast('Bought 1 ' + d.name);
                    try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) {}
                    try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
                } catch (e) { console.error('Buy bait failed', e); }
            };
            row.querySelector('div:nth-child(2)').appendChild(buyBtn);
            list.appendChild(row);
        }
        document.body.appendChild(overlay);
        const closeBtn = card.querySelector('#bucket-close'); if (closeBtn) closeBtn.onclick = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    }

    _openFishingModal() {
        if (typeof document === 'undefined') return;
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const fishingDefs = (window && window.FISHING_DEFS) ? window.FISHING_DEFS : FISHING_DEFS;

        // find bait items present in inventory
        const inv = (this.char && this.char.inventory) ? this.char.inventory : [];
        const flatInv = (window && window.__shared_ui && window.__shared_ui.initSlots) ? window.__shared_ui.initSlots(inv) : (Array.isArray(inv) ? inv.slice() : []);
        // compute counts for baits
        const baitCounts = {};
        for (const it of flatInv) {
            if (!it) continue; if (!it.id) continue; if (it.id === 'worm_bait' || it.id === 'insect_bait') baitCounts[it.id] = (baitCounts[it.id]||0) + (it.qty||1);
        }

    const overlay = document.createElement('div'); overlay.className = 'modal-overlay show'; overlay.style.zIndex = 265;
    const card = document.createElement('div'); card.className = 'modal-card'; card.style.minWidth = '760px';
    card.innerHTML = `<div class='modal-head'><div style='display:flex;align-items:center;gap:12px'><div class='modal-title'>Fishing</div><div id='fish-status' style='font-size:12px;color:#dcdcdc;opacity:0.9'>Idle</div></div><div><button id='fish-close' class='btn btn-ghost'>Close</button></div></div><div id='fish-body' class='modal-body' style='display:flex;gap:18px;align-items:flex-start;'></div>`;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const closeBtn = card.querySelector('#fish-close'); if (closeBtn) closeBtn.onclick = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    const body = card.querySelector('#fish-body');
    const left = document.createElement('div'); left.style.flex='1';
    const right = document.createElement('div'); right.style.width='300px'; right.style.display='flex'; right.style.flexDirection='column'; right.style.gap='8px';
    body.appendChild(left); body.appendChild(right);

        // Rod detection
        let equippedRodId = null; try { if (this.char && this.char.equipment && this.char.equipment.fishing) equippedRodId = this.char.equipment.fishing.id; } catch(e) {}
        const rodDef = (equippedRodId && defs[equippedRodId]) ? defs[equippedRodId] : null;
        left.innerHTML = `<div style='margin-bottom:8px;'><strong>Equipped Rod:</strong> ${rodDef ? rodDef.name : '<em>None</em>'}</div>`;

        // bait selector
        const baitSel = document.createElement('div'); baitSel.style.display='flex'; baitSel.style.flexDirection='column'; baitSel.style.gap='6px';
        baitSel.innerHTML = `<div style='font-weight:700'>Select bait to deposit:</div>`;
        const baitOptions = [];
        // selected bait state (null = none)
        let selectedBait = null;
        const buildPossible = (baitId) => {
            const poss = [];
            const rodRarity = (rodDef && rodDef.rarity) || 'common';
            const rarities = ['common','uncommon','rare','epic','legendary'];
            for (const fid of Object.keys(fishingDefs)) {
                const f = fishingDefs[fid]; if (!f) continue;
                if (baitId && f.allowedBaits && !f.allowedBaits.includes(baitId)) continue;
                if (rarities.indexOf(rodRarity) < rarities.indexOf(f.minRodRarity || 'common')) continue;
                poss.push(f);
            }
            return poss;
        };

        for (const bid of ['worm_bait','insect_bait']) {
            const d = defs[bid]; if (!d) continue;
            const available = baitCounts[bid] || 0;
            const btn = document.createElement('button'); btn.textContent = `${d.name} (${available})`; btn.dataset.bait = bid; btn.disabled = (available <= 0);
            btn.style.textAlign = 'left';
            btn.onclick = (ev) => {
                const b = ev.currentTarget && ev.currentTarget.dataset && ev.currentTarget.dataset.bait;
                if (!b) return;
                // mark selection UI
                selectedBait = b;
                for (const bo of baitOptions) { bo.style.background = ''; }
                try { ev.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } catch (e) {}
                // update possible catches list in-place
                updatePossible(selectedBait);
                // enable/disable cast button depending on availability
                try { if (typeof castBtn !== 'undefined' && castBtn) castBtn.disabled = !( (window && window.__shared_ui && window.__shared_ui.getQtyInSlots) ? window.__shared_ui.getQtyInSlots(window.__shared_ui.initSlots(this.char.inventory || []), selectedBait) > 0 : (baitCounts[selectedBait] || 0) > 0 ); } catch (e) {}
            };
            baitSel.appendChild(btn); baitOptions.push(btn);
        }
        left.appendChild(baitSel);

        // information pane
        const info = document.createElement('div'); info.style.marginTop='8px'; info.innerHTML = `<div style='font-weight:700'>Notes</div><div style='font-size:12px;opacity:0.9'>Deposit one bait to attempt fishing. Different bait + rod combos affect what fish can be caught. Success depends on your Fishing level, LUK, and fish difficulty.</div>`;
        left.appendChild(info);

        // right: preview slot for potential catches (updates when bait clicked)
        right.innerHTML = `<div style='font-weight:700'>Possible Catches</div><div id='catch-list' style='display:flex;flex-direction:column;gap:6px;margin-top:6px;'></div>`;
        const catchList = right.querySelector('#catch-list');
        // initial show all possible for current rod (none selected)
        const updatePossible = (baitId) => {
            catchList.innerHTML = '';
            const rodRarity = (rodDef && rodDef.rarity) || 'common';
            for (const fid of Object.keys(fishingDefs)) {
                const f = fishingDefs[fid];
                if (!f) continue;
                // allowed by bait and rod
                if (baitId && f.allowedBaits && !f.allowedBaits.includes(baitId)) continue;
                // check rod rarity min
                const rarities = ['common','uncommon','rare','epic','legendary'];
                if (rarities.indexOf(rodRarity) < rarities.indexOf(f.minRodRarity || 'common')) continue;
                const div = document.createElement('div');
                div.textContent = `${f.name} — difficulty ${f.difficulty}`;
                catchList.appendChild(div);
            }
        };
        updatePossible(null);
    }

    _depositBaitAndShowCatch(modal, baitId, rodDef, fishingDefs, baitCounts) {
        // verify at least one bait exists (do not remove yet); we'll consume per attempt while fishing
        try {
            const qty = (window && window.__shared_ui && window.__shared_ui.getQtyInSlots) ? window.__shared_ui.getQtyInSlots(window.__shared_ui.initSlots(this.char.inventory || []), baitId) : 0;
            if (!qty || qty <= 0) { if (this._showToast) this._showToast('No bait to deposit'); return; }
        } catch (e) { /* ignore */ }

        // compute possible fish list
        const possible = [];
        const rodRarity = (rodDef && rodDef.rarity) || 'common';
        const rarities = ['common','uncommon','rare','epic','legendary'];
        for (const fid of Object.keys(fishingDefs)) {
            const f = fishingDefs[fid]; if (!f) continue;
            if (f.allowedBaits && !f.allowedBaits.includes(baitId)) continue;
            if (rarities.indexOf(rodRarity) < rarities.indexOf(f.minRodRarity || 'common')) continue;
            possible.push(f);
        }

        // compute stats used for chance: LUK + fishing level + rod bonuses
        const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
        const luk = (eff && typeof eff.luk === 'number') ? eff.luk : ((this.char && this.char.stats && this.char.stats.luk) || 0);
        const fishingSkill = (eff && typeof eff.fishingSkill === 'number') ? eff.fishingSkill : ((this.char && this.char.fishing && this.char.fishing.level) || 1);
        const rodSkillBonus = (rodDef && rodDef.fishingBonus && rodDef.fishingBonus.skill) ? rodDef.fishingBonus.skill : 0;

    // create results modal (shared style)
    const overlayRes = document.createElement('div'); overlayRes.className = 'modal-overlay show'; overlayRes.style.zIndex = 270;
    const cardRes = document.createElement('div'); cardRes.className = 'modal-card'; cardRes.style.minWidth = '520px';
    cardRes.innerHTML = `<div class='modal-head'><div class='modal-title'>Fishing Bucket</div><div><button id='fres-close' class='btn btn-ghost'>Close</button></div></div><div id='fres-body' class='modal-body' style='display:flex;flex-direction:column;gap:8px;'></div>`;
    overlayRes.appendChild(cardRes);
    const body = cardRes.querySelector('#fres-body');
        for (const f of possible) {
            // base chance derived from fishingSkill + luk vs difficulty
            const effectiveSkill = Math.max(0, fishingSkill + rodSkillBonus + Math.floor(luk * 0.2));
            const base = effectiveSkill / (effectiveSkill + f.difficulty);
            const pct = Math.round(Math.max(1, Math.min(95, base * 100)));
            const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.marginBottom='6px';
            row.innerHTML = `<div><strong>${f.name}</strong><div style='font-size:12px;opacity:0.9'>Difficulty: ${f.difficulty}</div></div><div style='text-align:right'><div style='font-weight:800;color:#ffd27a'>${pct}%</div><div style='font-size:12px;opacity:0.9'>Chance</div></div>`;
            body.appendChild(row);
        }
    // add Cast button to start continuous fishing (consumes 1 bait per attempt)
    const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.justifyContent = 'flex-end'; actions.style.gap = '8px'; actions.style.marginTop = '10px'; actions.style.alignItems = 'center';
    const statusLabel = card.querySelector('#fish-status');
    const stopBtn = document.createElement('button'); stopBtn.type = 'button'; stopBtn.className = 'btn btn-secondary'; stopBtn.textContent = 'Stop'; stopBtn.disabled = true;
    const castBtn = document.createElement('button'); castBtn.type = 'button'; castBtn.className = 'btn btn-primary'; castBtn.textContent = 'Cast (Attempt)';
    const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'btn btn-ghost'; closeBtn.textContent = 'Close';
    actions.appendChild(stopBtn); actions.appendChild(closeBtn); actions.appendChild(castBtn);
    body.appendChild(actions);

        // start continuous fishing when Cast clicked
        castBtn.addEventListener('click', () => {
            try {
                // require a bait selection
                if (!selectedBait) { this._showToast && this._showToast('Select a bait first'); return; }
                // ensure bait available before starting
                const hasBait = (window && window.__shared_ui && window.__shared_ui.getQtyInSlots) ? window.__shared_ui.getQtyInSlots(window.__shared_ui.initSlots(this.char.inventory || []), selectedBait) : (baitCounts[selectedBait] || 0);
                if (!hasBait || hasBait <= 0) { this._showToast && this._showToast('No bait available'); return; }

                castBtn.disabled = true;
                stopBtn.disabled = false;
                if (statusLabel) statusLabel.textContent = 'Fishing...';

                // build possible catches based on current selection
                const possibleNow = buildPossible(selectedBait);
                if (!possibleNow || possibleNow.length === 0) { this._showToast && this._showToast('Nothing to catch with that bait/rod combo'); castBtn.disabled = false; stopBtn.disabled = true; if (statusLabel) statusLabel.textContent = 'Idle'; return; }

                // start fishing loop: attempt function uses selectedBait and possibleNow
                const tryOnce = () => {
                    // ensure we still have bait before attempting
                    const have = (window && window.__shared_ui && window.__shared_ui.getQtyInSlots) ? window.__shared_ui.getQtyInSlots(window.__shared_ui.initSlots(this.char.inventory || []), selectedBait) : (baitCounts[selectedBait] || 0);
                    if (!have) {
                        this._showToast && this._showToast('Out of bait.');
                        this._stopFishingLoop();
                        stopBtn.disabled = true; castBtn.disabled = false; if (statusLabel) statusLabel.textContent = 'Idle';
                        return;
                    }
                    // consume one bait
                    try {
                        if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
                            window.__shared_ui.removeItemFromInventory(this, selectedBait, 1);
                        } else {
                            const inv = this.char.inventory = this.char.inventory || [];
                            const si = inv.findIndex(s => s && s.id === selectedBait);
                            if (si >= 0) {
                                const slot = inv[si]; if (slot.qty && slot.qty > 1) slot.qty = slot.qty - 1; else inv.splice(si, 1);
                            }
                        }
                    } catch (e) {}

                    // award 1 xp attempt
                    const fishing = this.char.fishing = this.char.fishing || { level: 1, exp: 0, expToLevel: 100 };
                    fishing.exp = (fishing.exp || 0) + 1;
                    while (fishing.exp >= fishing.expToLevel) { fishing.exp -= fishing.expToLevel; fishing.level = (fishing.level || 1) + 1; fishing.expToLevel = Math.floor((fishing.expToLevel || 100) * 1.25); this._showToast && this._showToast(`Fishing level up! L${fishing.level}`, 1800); }

                    // recompute dynamic stats
                    const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
                    const luk = (eff && typeof eff.luk === 'number') ? eff.luk : ((this.char && this.char.stats && this.char.stats.luk) || 0);
                    const fishingSkill = (eff && typeof eff.fishingSkill === 'number') ? eff.fishingSkill : ((this.char && this.char.fishing && this.char.fishing.level) || 1);
                    const rodSkillBonus = (rodDef && rodDef.fishingBonus && rodDef.fishingBonus.skill) ? rodDef.fishingBonus.skill : 0;

                    const effectiveSkill = Math.max(0, fishingSkill + rodSkillBonus + Math.floor(luk * 0.2));
                    const avgDiff = possibleNow.reduce((s, x) => s + (x.difficulty || 10), 0) / Math.max(1, possibleNow.length);
                    const chanceAny = Math.max(0.05, Math.min(0.98, effectiveSkill / (effectiveSkill + avgDiff)));
                    const roll = Math.random();
                    if (roll > chanceAny) { this._showToast && this._showToast('No bite this time.'); try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) {} try { if (this._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {} return; }

                    // pick fish by weighted chance
                    const weights = []; let total = 0;
                    for (const f of possibleNow) {
                        const base = (effectiveSkill / (effectiveSkill + (f.difficulty || 10)));
                        const baitMod = (f.baitModifiers && f.baitModifiers[selectedBait]) ? f.baitModifiers[selectedBait] : 1;
                        const w = Math.max(0.001, base * baitMod);
                        weights.push({ fish: f, w }); total += w;
                    }
                    let pick = Math.random() * total; let chosen = null;
                    for (const entry of weights) { pick -= entry.w; if (pick <= 0) { chosen = entry.fish; break; } }
                    if (!chosen) chosen = weights.length ? weights[weights.length - 1].fish : null;

                    if (chosen) {
                        const itemId = chosen.id; const itemDef = (window && window.ITEM_DEFS) ? window.ITEM_DEFS[itemId] : null; let added = false;
                        try { if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) added = window.__shared_ui.addItemToInventory(this, itemId, 1); } catch (e) { added = false; }
                        if (!added) { const inv = this.char.inventory = this.char.inventory || []; if (itemDef && itemDef.stackable) { let slot = inv.find(x => x && x.id === itemId); if (slot) slot.qty = (slot.qty || 0) + 1; else inv.push({ id: itemId, name: (itemDef && itemDef.name) || itemId, qty: 1 }); } else { inv.push({ id: itemId, name: (itemDef && itemDef.name) || itemId, qty: 1 }); } }
                        const xpGain = Math.max(1, Math.round(((chosen.baseValue || chosen.value || 10) / 10)));
                        fishing.exp = (fishing.exp || 0) + xpGain;
                        while (fishing.exp >= fishing.expToLevel) { fishing.exp -= fishing.expToLevel; fishing.level = (fishing.level || 1) + 1; fishing.expToLevel = Math.floor((fishing.expToLevel || 100) * 1.25); this._showToast && this._showToast(`Fishing level up! L${fishing.level}`, 1800); }
                        this._showToast && this._showToast(`Caught ${chosen.name}! +${xpGain} fishing XP`, 2200);
                        try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) {}
                        try { if (this._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
                        try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
                        try { const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null; if (this._persistCharacter) this._persistCharacter(username); } catch (e) {}
                    }
                };

                // start continuous fishing and indicator
                this._startFishingLoop(selectedBait, tryOnce);
                // keep the overlay open while fishing; the loop will close when out of bait or when movement stops
            } catch (ee) { console.error('Fishing start error', ee); castBtn.disabled = false; stopBtn.disabled = true; if (statusLabel) statusLabel.textContent = 'Idle'; }
        });

        // Stop button stops fishing loop and re-enables Cast
        stopBtn.addEventListener('click', () => {
            try {
                this._stopFishingLoop();
                stopBtn.disabled = true;
                castBtn.disabled = false;
                if (statusLabel) statusLabel.textContent = 'Idle';
            } catch (e) { console.warn('Stop fishing failed', e); }
        });

        // Make sure closing the modal stops fishing if active
        closeBtn.addEventListener('click', () => {
            try { if (this.fishingActive) { this._stopFishingLoop(); } } catch (e) {}
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });

    closeBtn.addEventListener('click', () => { if (overlayRes && overlayRes.parentNode) overlayRes.parentNode.removeChild(overlayRes); if (modal && modal.parentNode) modal.parentNode.removeChild(modal); });
    document.body.appendChild(overlayRes);
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

export default BrokenDock;
