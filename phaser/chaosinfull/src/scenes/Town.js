// Clean Town scene implementation
export class Town extends Phaser.Scene {
    constructor() { super('Town'); }

    preload() {
        this.load.image('town_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    // Fog overlay (DOM canvas below HUD)
    this._createFog();

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

        // Animations
        this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
        this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

        // Input (WASD + E)
        this.keys = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E });

        // Character data
        const char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!char.mining) char.mining = { level: 1, exp: 0, expToLevel: 100 };
    if (!char.inventory) char.inventory = [];
        this.char = char;

        // HUD
        this._createHUD();

    // Portal on left
    const portalX = 80;
    const portalY = platformY - 70;
    this.portal = this.add.circle(portalX, portalY, 28, 0x6644aa, 0.9).setDepth(1.5);
        this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Enter Cave', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.portalPrompt.setVisible(false);

    // Furnace on right side (combine ores into bars)
    const furnaceX = this.scale.width - 120;
    const furnaceY = platformY - 70;
    this.furnace = this.add.rectangle(furnaceX, furnaceY, 56, 56, 0x8b4b0f, 1).setDepth(1.5);
    this.tweens.add({ targets: this.furnace, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });
    this.furnacePrompt = this.add.text(furnaceX, furnaceY - 60, '[E] Use Furnace', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.furnacePrompt.setVisible(false);
    // furnace active indicator (hidden until smelting starts)
    this._furnaceIndicator = this.add.text(furnaceX, furnaceY - 40, '🔥', { fontSize: '20px' }).setOrigin(0.5).setDepth(2);
    this._furnaceIndicator.setVisible(false);
    // smithing skill on character
    if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };
        // smelting state (works similar to mining timing)
        this.smeltingActive = false;
        this._smeltingEvent = null;
        this.smeltingInterval = 3500; // ms per bar (matches mining)

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
            this._clearToasts();
        });
    }

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
            <div style='margin-bottom:8px;'>Inventory: Copper Ore: <span id='furnace-copper-qty'>${copperOreQty}</span> — Tin Ore: <span id='furnace-tin-qty'>${tinOreQty}</span></div>
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
            if (this.smeltingActive) {
                if (this._smeltType === 'copper') this._stopContinuousSmelting();
                else this._showToast('Already smelting ' + this._smeltType);
            } else {
                this._startContinuousSmelting('copper');
            }
            updateDisplayLocal();
        };
        if (btnBronze) btnBronze.onclick = () => {
            if (this.smeltingActive) {
                if (this._smeltType === 'bronze') this._stopContinuousSmelting();
                else this._showToast('Already smelting ' + this._smeltType);
            } else {
                this._startContinuousSmelting('bronze');
            }
            updateDisplayLocal();
        };
        // initialize labels/state
        this._refreshFurnaceModal();
        // HUD should reflect smithing while furnace modal is open
        this._destroyHUD(); this._createHUD();
    }

    _closeFurnaceModal() {
        if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
        this._furnaceModal = null;
        // restore HUD display and hide furnace indicator
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(false);
        this._destroyHUD(); this._createHUD();
    }

    // Start continuous smelting of a given recipe ('copper' or 'bronze')
    _startContinuousSmelting(type) {
        if (this.smeltingActive) return;
        this.smeltingActive = true;
        this._smeltType = type;
        // immediate first attempt
        this._attemptSmelt(type);
        // if the immediate attempt didn't stop smelting (materials available), schedule repeats
        if (this.smeltingActive) {
            this._smeltingEvent = this.time.addEvent({ delay: this.smeltingInterval, callback: () => this._attemptSmelt(type), callbackScope: this, loop: true });
        }
        // show indicator and ensure modal open
        this._showToast('Started smelting ' + (type === 'copper' ? 'Copper Bars' : 'Bronze'));
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(true);
        // update HUD to smithing view
        this._destroyHUD(); this._createHUD();
        this._refreshFurnaceModal();
    }

    _stopContinuousSmelting() {
        if (!this.smeltingActive) return;
        this.smeltingActive = false;
        if (this._smeltingEvent) { this._smeltingEvent.remove(false); this._smeltingEvent = null; }
        this._showToast('Smelting stopped');
        this._smeltType = null;
        if (this._furnaceIndicator) this._furnaceIndicator.setVisible(false);
        this._refreshFurnaceModal();
        // HUD revert
        this._destroyHUD(); this._createHUD();
    }

    // Attempt a single smelt of specified type. Shows toast for each produced bar and persists.
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
            // award smithing XP for smelting
            this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
            this.char.smithing.exp = (this.char.smithing.exp || 0) + 12; // 12 XP per bar
        } else if (type === 'bronze') {
            const haveC = (copper && copper.qty) || 0;
            const haveT = (tin && tin.qty) || 0;
            if (haveC < 1 || haveT < 1) { this._stopContinuousSmelting(); this._showToast('Out of materials for Bronze'); return; }
            copper.qty -= 1; if (copper.qty <= 0) inv.splice(inv.indexOf(copper), 1);
            tin.qty -= 1; if (tin.qty <= 0) inv.splice(inv.indexOf(tin), 1);
            let b = find('bronze_bar'); if (b) b.qty = (b.qty || 0) + 1; else inv.push({ id: 'bronze_bar', name: 'Bronze Bar', qty: 1 });
            const newQty = (find('bronze_bar') && find('bronze_bar').qty) || 1;
            this._showToast(`Smelted 1x Bronze! (${newQty} total)`);
            // award smithing XP for smelting bronze
            this.char.smithing = this.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
            this.char.smithing.exp = (this.char.smithing.exp || 0) + 15; // 15 XP per bronze
        }
        // check smithing level up
        if (this.char.smithing) {
            while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                this.char.smithing.exp -= this.char.smithing.expToLevel;
                this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
            }
        }
        // persist and update HUD even if modal is closed
        this._persistCharacter(username);
        this._destroyHUD(); this._createHUD();
        this._refreshFurnaceModal();
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
        if (btnCopper) {
            if (this.smeltingActive && this._smeltType === 'copper') { btnCopper.textContent = 'Stop Smelting Copper'; btnCopper.style.background = '#aa4422'; }
            else { btnCopper.textContent = 'Smelt Copper Bar (2x Copper Ore)'; btnCopper.style.background = '#6b4f3a'; }
            // disable if other recipe is active
            btnCopper.disabled = this.smeltingActive && this._smeltType !== 'copper';
            btnCopper.style.opacity = btnCopper.disabled ? '0.6' : '1';
        }
        if (btnBronze) {
            if (this.smeltingActive && this._smeltType === 'bronze') { btnBronze.textContent = 'Stop Smelting Bronze'; btnBronze.style.background = '#aa4422'; }
            else { btnBronze.textContent = 'Smelt Bronze (1x Copper Ore + 1x Tin Ore)'; btnBronze.style.background = '#7a5f3a'; }
            btnBronze.disabled = this.smeltingActive && this._smeltType !== 'bronze';
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
                        userObj.characters[i].mining = this.char.mining;
                        userObj.characters[i].inventory = this.char.inventory;
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

    // --- HUD helpers ---
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
    // show smithing bar when furnace modal is open or smelting active
    const showSmithing = (!!this.smeltingActive) || (!!this._furnaceModal);

        this.hud = document.createElement('div');
        this.hud.id = 'town-hud';
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
                <button id="hud-charselect-btn" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">⇦</button>
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
                <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:${showSmithing ? Math.max(0, Math.min(100, (smithing.exp / smithing.expToLevel) * 100)) : Math.max(0, Math.min(100, (exp / expToLevel) * 100))}%; background:#ee4; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${showSmithing ? (smithing.exp + '/' + smithing.expToLevel + ' (Smithing L' + smithing.level + ')') : (exp + '/' + expToLevel)}</span>
                </div>
                <!-- Mining bar removed per request: mining tracked in data only -->
            </div>
        `;

        document.body.appendChild(this.hud);

        // attach click handler to button (allow pointer events only on the button)
        setTimeout(() => {
            const btn = document.getElementById('hud-charselect-btn');
            if (btn) {
                btn.onclick = (e) => { e.stopPropagation(); this.scene.start('CharacterSelect'); };
            }
        }, 0);
    }

    _destroyHUD() {
        if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
        this.hud = null;
    }

    // Persist mining skill to localStorage (finds char by name)
    _persistMiningForActiveChar(username) {
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
        } catch (e) {
            console.warn('Could not persist mining skill', e);
        }
    }

    _stopFog() {
        if (this._fogRaf) cancelAnimationFrame(this._fogRaf);
        this._fogRaf = null;
        if (this.fogCanvas && this.fogCanvas.parentNode) this.fogCanvas.parentNode.removeChild(this.fogCanvas);
        this.fogCanvas = null;
        this.fogCtx = null;
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
                                    userObj.characters[i].lastLocation = { scene: 'Cave', x: this.player.x, y: this.player.y };
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
                    this.scene.start('Cave', { character: this.char, username: username });
                }
            } else {
                this.portalPrompt.setVisible(false);
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
            }
        }
    }
}

