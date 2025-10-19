import { checkClassLevelUps } from './shared/stats.js';

export class InnerField extends Phaser.Scene {
    constructor() {
        super('InnerField');
    }

    preload() {
        this.load.image('inner_bg', 'assets/town_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
        this.enemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        this.username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        const dataChar = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        this.char = dataChar || {};
        if (!this.char.inventory) this.char.inventory = [];
        if (!this.char.equipment) this.char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null };
        if (!this.char.stats) this.char.stats = this.char.stats || { str:0,int:0,agi:0,luk:0 };
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'inner_bg').setDisplaySize(this.scale.width, this.scale.height).setDepth(0);
        const platformHeight = 60;
        const platformY = this.scale.height - (platformHeight / 2);
        const platform = this.add.rectangle(this.scale.width / 2, platformY, this.scale.width, platformHeight, 0x222222, 0.85).setDepth(1);
        this.physics.add.existing(platform, true);

        const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || (this.scale.width / 2);
        const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || (platformY - 70);

        this.player = this.physics.add.sprite(spawnX, spawnY, 'dude');
        this.player.setDepth(2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 40);
        this.player.body.setOffset(6, 8);
        this.physics.add.collider(this.player, platform);

        if (!this.anims.exists('left')) this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        if (!this.anims.exists('turn')) this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
        if (!this.anims.exists('right')) this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

        this.keys = (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) ? window.__shared_keys.attachCommonKeys(this) : null;
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackCooldown = 520;
        this.attackRange = 68;
        this.nextAttackTime = 0;

        this._createHUD();

        this.enemies = this.physics.add.group();
        this.spawnPoints = this._buildSpawnPoints(platformY - 70);
        this.spawnPoints.forEach(spawn => this._spawnEnemy(spawn));

        this.physics.add.collider(this.enemies, platform);
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            if (!enemy.getData('alive')) return;
            enemy.setVelocityX(enemy.x < player.x ? -60 : 60);
        });

        this._createPortals(platformY - 70);
        this._updateHUD();

        this.events.once('shutdown', () => this.shutdown());
        this.events.once('destroy', () => this.destroy());
    }

    update() {
        if (!this.player || !this.keys) return;

        const speed = 190;
        if (this.keys.left && this.keys.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('left', true);
        } else if (this.keys.right && this.keys.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (this.keys.up && this.keys.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-400);
        }

        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            this._tryAttack();
        }

        this._updateEnemiesAI();
        this._checkReturnPortal();
    }

    _buildSpawnPoints(groundY) {
        return [
            { x: this.scale.width * 0.35, y: groundY, type: 'slime_common', respawn: 4000, active: null },
            { x: this.scale.width * 0.55, y: groundY, type: 'slime_common', respawn: 4500, active: null },
            { x: this.scale.width * 0.75, y: groundY, type: 'slime_epic', respawn: 9000, active: null },
            { x: this.scale.width * 0.9, y: groundY, type: 'slime_boss', respawn: 16000, active: null },
        ];
    }

    _updateEnemiesAI() {
        const now = this.time.now;
        const player = this.player;
        const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : { defense: 0 };
        const playerDefense = (effStats && effStats.defense) || 0;
        this.enemies.children.iterate((enemy) => {
            if (!enemy) return;
            if (!enemy.getData('alive')) return;
            const def = this.enemyDefs[enemy.getData('defId')];
            if (!def) return;
            const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
            if (distance > 500) {
                enemy.setVelocityX(0);
                return;
            }
            if (distance > def.attackRange) {
                const dir = player.x < enemy.x ? -1 : 1;
                enemy.setVelocityX(dir * def.moveSpeed);
                enemy.anims.play(dir === -1 ? 'left' : 'right', true);
            } else {
                enemy.setVelocityX(0);
                if (now >= enemy.getData('nextAttack')) {
                    enemy.setData('nextAttack', now + def.attackCooldown);
                    const dmg = Phaser.Math.Between(def.damage[0], def.damage[1]);
                    const mitigated = Math.max(1, dmg - Math.floor(playerDefense / 2));
                    this.char.hp = Math.max(0, (this.char.hp || this.char.maxhp) - mitigated);
                    this._updateHUD();
                    this._showToast(`The ${def.name} hits you for ${mitigated} damage!`);
                    if (this.char.hp <= 0) {
                        this._onPlayerDown();
                    }
                }
            }
        });
    }

    _tryAttack() {
        if (this.time.now < this.nextAttackTime) return;
        this.nextAttackTime = this.time.now + this.attackCooldown;
        const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : { str: 0 };
        const strength = (effStats && effStats.str) || 0;
        const baseDamage = Phaser.Math.Between(6, 10) + strength * 2;
        let hitSomething = false;
        this.enemies.children.iterate((enemy) => {
            if (!enemy || !enemy.getData('alive')) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (dist <= this.attackRange) {
                hitSomething = true;
                const hp = enemy.getData('hp') - baseDamage;
                enemy.setData('hp', hp);
                this._showToast(`You strike the ${this.enemyDefs[enemy.getData('defId')].name} for ${baseDamage}!`, 1100);
                if (hp <= 0) {
                    this._handleEnemyDeath(enemy);
                }
            }
        });
        if (!hitSomething) {
            this._showToast('Your attack hits nothing...', 900);
        }
    }

    _handleEnemyDeath(enemy) {
        const def = this.enemyDefs[enemy.getData('defId')];
        enemy.setData('alive', false);
        enemy.disableBody(true, true);
        const spawn = enemy.getData('spawn');
        if (spawn) spawn.active = null;
        this._rollDrops(def);
        this._gainExperience(def.exp || 0);
        this._updateHUD();
        this._persistCharacter(this.username);
        this.time.addEvent({
            delay: (spawn && spawn.respawn) || 5000,
            callback: () => {
                if (!spawn) return;
                if (!spawn.active) this._spawnEnemy(spawn);
            }
        });
    }

    _rollDrops(def) {
        if (!def || !def.drops) return;
        const luk = ((this.char && this.char.stats && this.char.stats.luk) || 0) + (this.char._equipBonuses && this.char._equipBonuses.luk || 0);
        const dropsAwarded = [];
        def.drops.forEach(drop => {
            const baseChance = drop.baseChance || 0;
            const bonus = (drop.luckBonus || 0) * luk;
            const chance = Math.min(0.99, baseChance + bonus);
            if (Math.random() <= chance) {
                const qty = Phaser.Math.Between(drop.minQty || 1, drop.maxQty || 1);
                this._addItemToInventory(drop.itemId, qty);
                dropsAwarded.push({ itemId: drop.itemId, qty });
            }
        });
        if (dropsAwarded.length) {
            const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
            dropsAwarded.forEach(drop => {
                const name = (defs && defs[drop.itemId] && defs[drop.itemId].name) || drop.itemId;
                this._showToast(`Loot: ${drop.qty}x ${name}`, 1600);
            });
        } else {
            this._showToast('No loot this time...', 1000);
        }
    }

    _addItemToInventory(itemId, qty) {
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const inv = this.char.inventory = this.char.inventory || [];
        const def = defs[itemId];
        if (def && def.stackable) {
            let entry = inv.find(x => x && x.id === itemId);
            if (entry) entry.qty = (entry.qty || 0) + qty;
            else inv.push({ id: itemId, name: (def && def.name) || itemId, qty });
        } else {
            for (let i = 0; i < qty; i++) inv.push({ id: itemId, name: (def && def.name) || itemId, qty: 1 });
        }
        if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal && this._inventoryModal) window.__shared_ui.refreshInventoryModal(this);
    }

    _gainExperience(amount) {
        if (!amount) return;
        this.char.exp = (this.char.exp || 0) + amount;
        const leveled = checkClassLevelUps(this);
        if (leveled) this._showToast('Level up!', 1800);
    }

    _onPlayerDown() {
        this._showToast('You are overwhelmed! Returning to the entrance...', 2000);
        this.player.disableBody(true, true);
        this.time.addEvent({
            delay: 1800,
            callback: () => {
                this.char.hp = this.char.maxhp;
                this._persistCharacter(this.username);
                this.scene.start('Town', { character: this.char, username: this.username, spawnX: this.scale.width * 0.2, spawnY: this.scale.height - 120 });
            }
        });
    }

    _checkReturnPortal() {
        if (!this.returnPortal || !this.player) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.returnPortal.x, this.returnPortal.y);
        if (dist <= 60) {
            this.returnPrompt.setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                this.char.lastLocation = { scene: 'InnerField', x: this.player.x, y: this.player.y };
                this._persistCharacter(this.username);
                this.scene.start('Town', { character: this.char, username: this.username, spawnX: this.scale.width * 0.8, spawnY: this.scale.height - 120 });
            }
        } else {
            this.returnPrompt.setVisible(false);
        }
    }

    _createPortals(groundY) {
        const portalX = this.scale.width * 0.1;
        this.returnPortal = this.add.circle(portalX, groundY, 26, 0x4b7bd6, 0.85).setDepth(1.5);
        this.tweens.add({ targets: this.returnPortal, scale: { from: 1, to: 1.1 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.returnPrompt = this.add.text(portalX, groundY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this.returnPrompt.setVisible(false);
    }

    _recalculateVitals() {
        const stats = (window && window.__shared_ui && window.__shared_ui.stats) ? window.__shared_ui.stats.effectiveStats(this.char) : null;
        const eff = stats || { str:0,int:0,agi:0,luk:0,defense:0 };
        const level = this.char.level || 1;
        this.char.maxhp = this.char.maxhp || (100 + level * 10 + ((eff.str || 0) * 10));
        this.char.maxmana = this.char.maxmana || (50 + level * 5 + ((eff.int || 0) * 10));
        if (!this.char.expToLevel) this.char.expToLevel = 100;
    }

    _persistCharacter(username) {
        if (!username || !this.char) return;
        try {
            const key = 'cif_user_' + username;
            const userObj = JSON.parse(localStorage.getItem(key));
            if (userObj && userObj.characters) {
                this.char.lastLocation = { scene: 'InnerField', x: (this.player && this.player.x) || null, y: (this.player && this.player.y) || null };
                let found = false;
                for (let i = 0; i < userObj.characters.length; i++) {
                    const uc = userObj.characters[i];
                    if (!uc) continue;
                    if ((uc.id && this.char.id && uc.id === this.char.id) || (!uc.id && uc.name === this.char.name)) {
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
        } catch (e) { /* ignore persist errors */ }
    }

    _createHUD() {
        if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this);
    }

    _updateHUD() {
        if (window && window.__hud_shared && window.__hud_shared.updateHUD) window.__hud_shared.updateHUD(this);
    }

    _destroyHUD() {
        if (window && window.__hud_shared && window.__hud_shared.destroyHUD) window.__hud_shared.destroyHUD(this);
    }

    _showToast(text, timeout = 1400) {
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

    shutdown() {
        this._persistCharacter(this.username);
        this._destroyHUD();
        this._clearToasts();
    }

    destroy() {
        this.shutdown();
    }

    _spawnEnemy(spawn) {
        if (!spawn || spawn.active) return;
        const def = this.enemyDefs[spawn.type];
        if (!def) return;
        const enemy = this.physics.add.sprite(spawn.x, spawn.y, 'dude');
        enemy.setDepth(1.8);
        enemy.setTint(def.tier === 'boss' ? 0xff66aa : def.tier === 'epic' ? 0x66ddff : 0x66ff66);
        enemy.body.setCollideWorldBounds(true);
        enemy.body.setSize(20, 40);
        enemy.body.setOffset(6, 8);
        enemy.setData('defId', spawn.type);
        enemy.setData('hp', def.maxhp);
        enemy.setData('maxhp', def.maxhp);
        enemy.setData('alive', true);
        enemy.setData('spawn', spawn);
        enemy.setData('nextAttack', 0);
        this.enemies.add(enemy);
        if (this.ground) this.physics.add.collider(enemy, this.ground);
        spawn.active = enemy;
    }
}

export default InnerField;
