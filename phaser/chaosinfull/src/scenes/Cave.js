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
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || centerX;
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (platformY - 70);
    this.player = this.physics.add.sprite(spawnX, spawnY, 'dude');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 40);
    this.player.body.setOffset(6, 8);
    const platform = this.add.rectangle(centerX, platformY, this.scale.width, platformHeight, 0x443322, 1);
    platform.setDepth(1);
    this.physics.add.existing(platform, true);
    this.physics.add.collider(this.player, platform);

        // Animations (reuse frames if not already created)
        if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
        if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

        // Input: WASD + E
        this.keys = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E });

        // Character data from scene settings
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];

        // HUD (same condensed HUD as Town, without mining bar)
        this._createHUD();

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
    this.smeltingInterval = 3500;

    // Mining nodes for testing: place them on the platform so they sit naturally
    const platformTop = platformY - (60 / 2);
    // tin (easier) on left-center
    this._createMiningNode(460, platformTop - 28, 'tin');
    // copper (harder) on right-center
    this._createMiningNode(580, platformTop - 28, 'copper');

    // continuous mining state
    this.miningActive = false;
    this._miningEvent = null;
    this.miningInterval = 3500; // ms between swings (tweakable)

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
        });
    }

    // HUD copied/adapted from Town (without mining bar)
    _createHUD() {
        const char = this.char || {};
        const name = char.name || 'Character';
        const level = char.level || 1;
        const maxhp = char.maxhp || (100 + level * 10 + ((char.stats && char.stats.str) || 0) * 10);
        const hp = char.hp || maxhp;
        const maxmana = char.maxmana || (50 + level * 5 + ((char.stats && char.stats.int) || 0) * 10);
        const mana = char.mana || maxmana;
    const exp = char.exp || 0;
    const expToLevel = char.expToLevel || 100;
    const mining = char.mining || { level: 1, exp: 0, expToLevel: 100 };
    const smithing = char.smithing || { level: 1, exp: 0, expToLevel: 100 };
    const showSmithing = (!!this.smeltingActive) || (!!this._furnaceModal);

        this.hud = document.createElement('div');
        this.hud.id = 'cave-hud';
        this.hud.style.position = 'fixed';
        this.hud.style.top = '8px';
        this.hud.style.left = '8px';
        this.hud.style.width = '200px';
        this.hud.style.padding = '8px';
        this.hud.style.zIndex = '100';
        this.hud.style.pointerEvents = 'none';
        this.hud.style.display = 'flex';
        this.hud.style.flexDirection = 'column';
        this.hud.style.alignItems = 'flex-start';
        this.hud.style.background = 'rgba(20,10,30,0.55)';
        this.hud.style.backdropFilter = 'blur(8px)';
        this.hud.style.borderRadius = '16px';
        this.hud.style.color = '#eee';
        this.hud.style.fontFamily = 'UnifrakturCook, cursive';

        this.hud.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px;">
                <span style="font-size:1em; font-weight:700; color:#e44; letter-spacing:1px;">${name} <span style='color:#fff; font-size:0.9em;'>- Lv ${level}</span></span>
                <button id="cave-hud-charselect-btn" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">⇦</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
                <div style="height:12px; background:#2a0a16; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, (hp / maxhp) * 100))}%; background:#e44; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${hp}/${maxhp}</span>
                </div>
                <div style="height:12px; background:#181a2a; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, (mana / maxmana) * 100))}%; background:#44e; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${mana}/${maxmana}</span>
                </div>
                <!-- Replace class EXP with mining EXP while in the cave -->
                <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${showSmithing ? Math.max(0, Math.min(100, (smithing.exp / smithing.expToLevel) * 100)) : Math.max(0, Math.min(100, ((char.mining && char.mining.exp) || 0) / ((char.mining && char.mining.expToLevel) || 100) * 100))}%; background:#9b7; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${showSmithing ? ('Smithing L' + smithing.level + ' ' + (smithing.exp || 0) + '/' + (smithing.expToLevel || 100)) : ('Mining L' + ((char.mining && char.mining.level) || 1) + ' ' + ((char.mining && char.mining.exp) || 0) + '/' + ((char.mining && char.mining.expToLevel) || 100))}</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.hud);

        setTimeout(() => {
            const btn = document.getElementById('cave-hud-charselect-btn');
            if (btn) btn.onclick = (e) => { e.stopPropagation(); this.scene.start('CharacterSelect'); };
        }, 0);
    }

    _destroyHUD() {
        if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
        this.hud = null;
    }

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
            <div style='margin-bottom:8px;'>Inventory: Copper Ore: <span id='cave-furnace-copper-qty'>${copperOreQty}</span> — Tin Ore: <span id='cave-furnace-tin-qty'>${tinOreQty}</span></div>
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
            if (this.smeltingActive) { if (this._smeltType === 'copper') this._stopContinuousSmelting(); else this._showToast('Already smelting ' + this._smeltType); }
            else this._startContinuousSmelting('copper');
            updateDisplay(); this._refreshCaveFurnaceModal();
        };
        if (btnBronze) btnBronze.onclick = () => {
            if (this.smeltingActive) { if (this._smeltType === 'bronze') this._stopContinuousSmelting(); else this._showToast('Already smelting ' + this._smeltType); }
            else this._startContinuousSmelting('bronze');
            updateDisplay(); this._refreshCaveFurnaceModal();
        };

        this._refreshCaveFurnaceModal();
        // HUD switch to smithing
        this._destroyHUD(); this._createHUD();
    }

    _closeCaveFurnaceModal() {
        if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
        this._furnaceModal = null;
        // hide indicator and revert HUD display to mining
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(false);
        this._destroyHUD(); this._createHUD();
    }

    _refreshCaveFurnaceModal() {
        if (!this._furnaceModal) return;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const copperOreQty = findQty('copper_ore');
        const tinOreQty = findQty('tin_ore');
        const elC = document.getElementById('cave-furnace-copper-qty'); if (elC) elC.textContent = copperOreQty;
        const elT = document.getElementById('cave-furnace-tin-qty'); if (elT) elT.textContent = tinOreQty;
        const btnCopper = document.getElementById('cave-smelt-copper');
        const btnBronze = document.getElementById('cave-smelt-bronze');
        if (btnCopper) {
            if (this.smeltingActive && this._smeltType === 'copper') { btnCopper.textContent = 'Stop Smelting Copper'; btnCopper.style.background = '#aa4422'; }
            else { btnCopper.textContent = 'Smelt Copper Bar (2x Copper Ore)'; btnCopper.style.background = '#6b4f3a'; }
            btnCopper.disabled = this.smeltingActive && this._smeltType !== 'copper'; btnCopper.style.opacity = btnCopper.disabled ? '0.6' : '1';
            // ensure handler is bound (rebind in case DOM handlers were lost)
            btnCopper.onclick = () => {
                if (this.smeltingActive) {
                    if (this._smeltType === 'copper') this._stopContinuousSmelting();
                    else this._showToast('Already smelting ' + this._smeltType);
                } else {
                    this._startContinuousSmelting('copper');
                }
                this._refreshCaveFurnaceModal();
            };
        }
        if (btnBronze) {
            if (this.smeltingActive && this._smeltType === 'bronze') { btnBronze.textContent = 'Stop Smelting Bronze'; btnBronze.style.background = '#aa4422'; }
            else { btnBronze.textContent = 'Smelt Bronze (1x Copper Ore + 1x Tin Ore)'; btnBronze.style.background = '#7a5f3a'; }
            btnBronze.disabled = this.smeltingActive && this._smeltType !== 'bronze'; btnBronze.style.opacity = btnBronze.disabled ? '0.6' : '1';
            // rebind handler to keep toggle working
            btnBronze.onclick = () => {
                if (this.smeltingActive) {
                    if (this._smeltType === 'bronze') this._stopContinuousSmelting();
                    else this._showToast('Already smelting ' + this._smeltType);
                } else {
                    this._startContinuousSmelting('bronze');
                }
                this._refreshCaveFurnaceModal();
            };
        }
    }

    // Reuse same smelting control methods as Town but ensure they exist in Cave
    _startContinuousSmelting(type) {
        if (this.smeltingActive) return;
        this.smeltingActive = true;
        this._smeltType = type;
        this._attemptSmelt(type);
        // only create repeating event if immediate attempt didn't stop smelting (materials available)
        if (this.smeltingActive) {
            this._smeltingEvent = this.time.addEvent({ delay: this.smeltingInterval, callback: () => this._attemptSmelt(type), callbackScope: this, loop: true });
        }
        this._showToast('Started smelting ' + (type === 'copper' ? 'Copper Bars' : 'Bronze'));
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(true);
        this._destroyHUD(); this._createHUD();
        this._refreshCaveFurnaceModal();
    }

    _stopContinuousSmelting() {
        if (!this.smeltingActive) return;
        this.smeltingActive = false;
        if (this._smeltingEvent) { this._smeltingEvent.remove(false); this._smeltingEvent = null; }
        this._showToast('Smelting stopped');
        this._smeltType = null;
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(false);
        this._refreshCaveFurnaceModal();
        this._destroyHUD(); this._createHUD();
    }

    _attemptSmelt(type) {
        const inv = this.char.inventory = this.char.inventory || [];
        const find = (id) => inv.find(x => x && x.id === id);
        const copper = find('copper_ore');
        const tin = find('tin_ore');
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        if (type === 'copper') {
            const have = (copper && copper.qty) || 0;
            if (have < 2) { this._stopContinuousSmelting(); this._showToast('Out of Copper Ore'); return; }
            copper.qty -= 2; if (copper.qty <= 0) inv.splice(inv.indexOf(copper), 1);
            let bar = find('copper_bar'); if (bar) bar.qty = (bar.qty || 0) + 1; else inv.push({ id: 'copper_bar', name: 'Copper Bar', qty: 1 });
            const newQty = (find('copper_bar') && find('copper_bar').qty) || 1;
            this._showToast(`Smelted 1x Copper Bar! (${newQty} total)`);
            // smithing xp
            this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
            this.char.smithing.exp = (this.char.smithing.exp || 0) + 12;
        } else if (type === 'bronze') {
            const haveC = (copper && copper.qty) || 0;
            const haveT = (tin && tin.qty) || 0;
            if (haveC < 1 || haveT < 1) { this._stopContinuousSmelting(); this._showToast('Out of materials for Bronze'); return; }
            copper.qty -= 1; if (copper.qty <= 0) inv.splice(inv.indexOf(copper), 1);
            tin.qty -= 1; if (tin.qty <= 0) inv.splice(inv.indexOf(tin), 1);
            let b = find('bronze_bar'); if (b) b.qty = (b.qty || 0) + 1; else inv.push({ id: 'bronze_bar', name: 'Bronze Bar', qty: 1 });
            const newQty = (find('bronze_bar') && find('bronze_bar').qty) || 1;
            this._showToast(`Smelted 1x Bronze! (${newQty} total)`);
            this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
            this.char.smithing.exp = (this.char.smithing.exp || 0) + 15;
        }
        if (this.char.smithing) {
            while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                this.char.smithing.exp -= this.char.smithing.expToLevel;
                this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
            }
        }
        this._persistCharacter((this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null);
        this._destroyHUD(); this._createHUD();
        this._refreshCaveFurnaceModal();
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
                    this.scene.start('Town', { character: this.char, username: username });
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
        }

        // check level up
        while (mining.exp >= mining.expToLevel) {
            mining.exp -= mining.expToLevel;
            mining.level = (mining.level || 1) + 1;
            mining.expToLevel = Math.floor(mining.expToLevel * 1.25);
            this._showToast('Mining level up! L' + mining.level, 2200);
        }

        this.char.mining = mining;

        // persist immediately
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);

        // update HUD (simple re-render of HUD element)
        this._destroyHUD();
        this._createHUD();
    }

    // Start continuous mining: attempt immediately and then repeatedly until stopped
    _startContinuousMining() {
        if (this.miningActive) return;
        this.miningActive = true;
        // immediate first swing
        this._attemptMine();
        // repeat every 600ms
        this._miningEvent = this.time.addEvent({ delay: this.miningInterval, callback: this._attemptMine, callbackScope: this, loop: true });
        // show mining indicator
        this._showMiningIndicator();
    }

    _stopContinuousMining() {
        this.miningActive = false;
        if (this._miningEvent) {
            this._miningEvent.remove(false);
            this._miningEvent = null;
        }
        this._hideMiningIndicator();
    }
}
