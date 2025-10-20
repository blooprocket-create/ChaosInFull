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

        // Dock platform: starts left, spans about 65% width
        const dockWidth = Math.round(this.scale.width * 0.65);
        const dockX = (dockWidth / 2) + 40;
        const dock = this.add.rectangle(dockX, platformY, dockWidth, platformHeight, 0x6b4a2b, 1).setDepth(1);
        this.physics.add.existing(dock, true);
        this.physics.add.collider(this.player, dock);

        // Create fishing node at the right end of the dock
        const nodeX = dockX + (dockWidth / 2) - 80;
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

        // Left-side portal back to GraveForest
        try {
            const portalX = 72;
            const portalY = platformY - 60;
            const pobj = createPortal(this, portalX, portalY, { depth: 1.5, targetScene: 'GraveForest', spawnX: Math.round(this.scale.width / 2), spawnY: platformY - 70, promptLabel: 'Return to Grave Forest' });
            this.portal = pobj.display;
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Grave Forest', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
        } catch (e) {
            // fallback circle portal
            const portalX = 72;
            const portalY = platformY - 60;
            this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Grave Forest', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
        }

        this._toastContainer = null;

        this.events.once('shutdown', () => {
            this._destroyHUD();
            this._clearToasts();
            this._closeInventoryModal();
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

        // Inventory toggle
        if (Phaser.Input.Keyboard.JustDown(this.keys.inventory)) {
            if (window && window.__shared_ui) {
                if (this._inventoryModal) window.__shared_ui.closeInventoryModal(this); else window.__shared_ui.openInventoryModal(this);
            }
        }

    }

    _openBucketShop() {
        // simple modal: list available bait items from ITEM_DEFS and allow adding to inventory via purchase
        if (typeof document === 'undefined') return;
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const modal = document.createElement('div'); modal.id = 'bucket-shop-modal'; modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%,-50%)'; modal.style.zIndex = '260'; modal.style.background = 'linear-gradient(135deg,#111,#050507)'; modal.style.color = '#fff'; modal.style.padding = '12px'; modal.style.borderRadius = '10px';
        modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Bait Bucket</strong><button id='bucket-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div style='display:flex;flex-direction:column;gap:8px;min-width:260px;'></div>`;
        const list = modal.querySelector('div:nth-child(2)');
        // show known bait options from ITEM_DEFS
        const baitIds = ['worm_bait','insect_bait'];
        for (const id of baitIds) {
            const d = defs[id]; if (!d) continue;
            const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
            row.innerHTML = `<div><strong>${d.name}</strong><div style='font-size:12px;opacity:0.9'>${d.description}</div></div><div style='display:flex;flex-direction:column;gap:6px;align-items:flex-end;'><div style='font-weight:800;color:#ffd27a'>${d.value}g</div></div>`;
            const buyBtn = document.createElement('button'); buyBtn.textContent = 'Buy 1'; buyBtn.style.marginLeft='8px'; buyBtn.onclick = () => { try { if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) { window.__shared_ui.addItemToInventory(this, id, 1); if (this._showToast) this._showToast('Bought 1 ' + d.name); } } catch(e) {} };
            row.querySelector('div:nth-child(2)').appendChild(buyBtn);
            list.appendChild(row);
        }
        document.body.appendChild(modal);
        modal.querySelector('#bucket-close').onclick = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
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

        const modal = document.createElement('div'); modal.id = 'fishing-modal'; modal.style.position='fixed'; modal.style.left='50%'; modal.style.top='50%'; modal.style.transform='translate(-50%,-50%)'; modal.style.zIndex='265'; modal.style.background='linear-gradient(135deg,#111,#050507)'; modal.style.color='#fff'; modal.style.padding='12px'; modal.style.borderRadius='12px'; modal.style.minWidth='380px';
        modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Fishing</strong><button id='fish-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='fish-body' style='display:flex;gap:12px;'></div>`;
        document.body.appendChild(modal);
        modal.querySelector('#fish-close').onclick = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };

        const body = modal.querySelector('#fish-body');
        const left = document.createElement('div'); left.style.flex='1';
        const right = document.createElement('div'); right.style.width='240px'; right.style.display='flex'; right.style.flexDirection='column'; right.style.gap='8px';
        body.appendChild(left); body.appendChild(right);

        // Rod detection
        let equippedRodId = null; try { if (this.char && this.char.equipment && this.char.equipment.fishing) equippedRodId = this.char.equipment.fishing.id; } catch(e) {}
        const rodDef = (equippedRodId && defs[equippedRodId]) ? defs[equippedRodId] : null;
        left.innerHTML = `<div style='margin-bottom:8px;'><strong>Equipped Rod:</strong> ${rodDef ? rodDef.name : '<em>None</em>'}</div>`;

        // bait selector
        const baitSel = document.createElement('div'); baitSel.style.display='flex'; baitSel.style.flexDirection='column'; baitSel.style.gap='6px';
        baitSel.innerHTML = `<div style='font-weight:700'>Select bait to deposit:</div>`;
        const baitOptions = [];
        for (const bid of ['worm_bait','insect_bait']) {
            const d = defs[bid]; if (!d) continue;
            const available = baitCounts[bid] || 0;
            const btn = document.createElement('button'); btn.textContent = `${d.name} (${available})`; btn.dataset.bait = bid; btn.disabled = (available <= 0); btn.onclick = (ev) => {
                const b = ev.currentTarget && ev.currentTarget.dataset && ev.currentTarget.dataset.bait;
                if (!b) return; this._depositBaitAndShowCatch(modal, b, rodDef, fishingDefs, baitCounts);
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
        // remove one bait from inventory and show the modal with success rates
        try {
            const removed = (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) ? window.__shared_ui.removeItemFromInventory(this, baitId, 1) : false;
            if (!removed) { if (this._showToast) this._showToast('No bait to deposit'); return; }
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

        // create results modal
        const res = document.createElement('div'); res.id = 'fishing-results-modal'; res.style.position='fixed'; res.style.left='50%'; res.style.top='50%'; res.style.transform='translate(-50%,-50%)'; res.style.zIndex='270'; res.style.background='linear-gradient(135deg,#0b2,#050507)'; res.style.color='#fff'; res.style.padding='12px'; res.style.borderRadius='12px'; res.style.minWidth='420px';
        res.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Fishing Bucket</strong><button id='fres-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='fres-body'></div>`;
        const body = res.querySelector('#fres-body');
        for (const f of possible) {
            // base chance derived from fishingSkill + luk vs difficulty
            const effectiveSkill = Math.max(0, fishingSkill + rodSkillBonus + Math.floor(luk * 0.2));
            const base = effectiveSkill / (effectiveSkill + f.difficulty);
            const pct = Math.round(Math.max(1, Math.min(95, base * 100)));
            const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.marginBottom='6px';
            row.innerHTML = `<div><strong>${f.name}</strong><div style='font-size:12px;opacity:0.9'>Difficulty: ${f.difficulty}</div></div><div style='text-align:right'><div style='font-weight:800;color:#ffd27a'>${pct}%</div><div style='font-size:12px;opacity:0.9'>Chance</div></div>`;
            body.appendChild(row);
        }
        document.body.appendChild(res);
        res.querySelector('#fres-close').onclick = () => { if (res.parentNode) res.parentNode.removeChild(res); if (modal && modal.parentNode) modal.parentNode.removeChild(modal); };
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
