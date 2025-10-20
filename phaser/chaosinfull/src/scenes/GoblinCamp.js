export class GoblinCamp extends Phaser.Scene {
    constructor() { super('GoblinCamp'); }

    preload() {
        this.load.image('goblin_bg', 'assets/goblin_bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.enemyDefs = (window && window.ENEMY_DEFS) ? window.ENEMY_DEFS : {};
        const sceneData = (this.sys && this.sys.settings && this.sys.settings.data) || {};
        this.username = sceneData.username || null;
        this.char = sceneData.character || {};
        if (!this.char.inventory) this.char.inventory = [];

        this._recalculateVitals();
        if (!this.char.hp || this.char.hp > this.char.maxhp) this.char.hp = this.char.maxhp;

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'goblin_bg').setDisplaySize(this.scale.width, this.scale.height).setDepth(0);

        const centerX = this.scale.width / 2;
        const platformHeight = 60;
        const platformY = this.scale.height - (platformHeight / 2);
        const platform = this.add.rectangle(centerX, platformY, this.scale.width, platformHeight, 0x332222, 0.9).setDepth(1);
        this.physics.add.existing(platform, true);

        const spawnX = (sceneData.spawnX !== undefined && sceneData.spawnX !== null) ? sceneData.spawnX : Math.max(120, this.scale.width * 0.12);
        const spawnY = (sceneData.spawnY !== undefined && sceneData.spawnY !== null) ? sceneData.spawnY : (platformY - 70);

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

        this._createHUD();

        // spawn goblins
        this.enemies = this.physics.add.group();
        this.spawnPoints = [
            { x: this.scale.width * 0.32, y: platformY - 70, type: 'goblin_common', respawn: 4500, active: null },
            { x: this.scale.width * 0.62, y: platformY - 70, type: 'goblin_girl', respawn: 5200, active: null }
        ];
        this.spawnPoints.forEach(sp => this._spawnEnemy(sp));
        this.physics.add.collider(this.enemies, platform);
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => { if (!enemy.getData('alive')) return; enemy.setVelocityX(enemy.x < player.x ? -60 : 60); });

        // portal back to OuterField
        const portalX = 80;
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const p = portalHelper.createPortal(this, portalX, platformY - 60, { depth: 1.5, targetScene: 'OuterField', spawnX: this.scale.width - 220, spawnY: this.scale.height - 120, promptLabel: 'Return to Outer Field' });
            this.outerPortal = p.display;
        } catch (e) {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const p = portalHelper.createPortal(this, portalX, platformY - 60, { depth: 1.5, targetScene: 'OuterField', spawnX: this.scale.width - 220, spawnY: this.scale.height - 120, promptLabel: 'Return to Outer Field' });
            this.outerPortal = p.display;
        }

        this.events.once('shutdown', () => this.shutdown());
    }

    update() {
        if (!this.player || !this.keys) return;
        const speed = 190;
        if (this.keys.left && this.keys.left.isDown) { this.player.setVelocityX(-speed); this.player.anims.play('left', true); }
        else if (this.keys.right && this.keys.right.isDown) { this.player.setVelocityX(speed); this.player.anims.play('right', true); }
        else { this.player.setVelocityX(0); this.player.anims.play('turn'); }
        if (this.keys.up && this.keys.up.isDown && this.player.body.blocked.down) this.player.setVelocityY(-420);

        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) this._tryAttack();

        this._updateEnemiesAI();
        this._updatePlayerHealthBar();
    }

    // Portal interaction handled by shared portal helper

    _spawnEnemy(spawn) { if (!spawn || spawn.active) return; const def = this.enemyDefs[spawn.type]; if (!def) return; const enemy = this.physics.add.sprite(spawn.x, spawn.y, 'dude'); enemy.setDepth(1.8); enemy.setTint(def.tier === 'boss' ? 0xff66aa : def.tier === 'epic' ? 0x66ddff : 0x66ff66); enemy.body.setCollideWorldBounds(true); enemy.body.setSize(20,40); enemy.body.setOffset(6,8); enemy.setData('defId', spawn.type); enemy.setData('hp', def.maxhp); enemy.setData('maxhp', def.maxhp); enemy.setData('alive', true); enemy.setData('spawn', spawn); enemy.setData('nextAttack', 0); this.enemies.add(enemy); this._attachEnemyBars(enemy); spawn.active = enemy; }

    _updateEnemiesAI() { const now = this.time.now; const player = this.player; const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : { defense:0 }; const playerDefense = (effStats && effStats.defense) || 0; this.enemies.children.iterate((enemy)=>{ if (!enemy) return; if (!enemy.getData('alive')) return; const def = this.enemyDefs[enemy.getData('defId')]; if (!def) return; const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y); if (distance > 500) { enemy.setVelocityX(0); this._updateEnemyBarPosition(enemy); return; } if (distance > def.attackRange) { const dir = player.x < enemy.x ? -1 : 1; enemy.setVelocityX(dir * def.moveSpeed); enemy.anims.play(dir === -1 ? 'left' : 'right', true); } else { enemy.setVelocityX(0); if (now >= enemy.getData('nextAttack')) { enemy.setData('nextAttack', now + def.attackCooldown); const dmg = Phaser.Math.Between(def.damage[0], def.damage[1]); const mitigated = Math.max(1, dmg - Math.floor(playerDefense /2)); this.char.hp = Math.max(0, (this.char.hp || this.char.maxhp) - mitigated); this._updateHUD(); this._updatePlayerHealthBar(); this._showDamageNumber(this.player.x, this.player.y - 28, `-${mitigated}`, '#ff5555'); if (this.char.hp <= 0) this._onPlayerDown(); } } this._updateEnemyBarPosition(enemy); }); }

    _tryAttack(silentMiss=false, preferredTarget=null){ if (this.time.now < this.nextAttackTime) return; this.nextAttackTime = this.time.now + (this.attackCooldown||520); const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : { str: 0 }; const strength = (effStats && effStats.str) || 0; const baseDamage = Phaser.Math.Between(6,10)+strength*2; let hitSomething=false; const targets = preferredTarget? [preferredTarget] : this.enemies.getChildren(); targets.forEach((enemy)=>{ if (!enemy || !enemy.getData('alive')) return; const dist = Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.x,enemy.y); if (dist <= (this.attackRange||68)) { hitSomething=true; const hp = enemy.getData('hp')-baseDamage; enemy.setData('hp',hp); this._showDamageNumber(enemy.x, enemy.y - 42, `-${baseDamage}`, '#ffee66'); this._updateEnemyHealthBar(enemy); if (hp <= 0) this._handleEnemyDeath(enemy); } }); if (!hitSomething && !silentMiss) this._showToast('Your attack hits nothing...',900); }

    _handleEnemyDeath(enemy){ const def = this.enemyDefs[enemy.getData('defId')]; enemy.setData('alive', false); this._detachEnemyBars(enemy); enemy.disableBody(true,true); const spawn = enemy.getData('spawn'); if (spawn) spawn.active = null; this._rollDrops(def); this._gainExperience(def.exp || 0); this._updateHUD(); this._persistCharacter(this.username); this.time.addEvent({ delay: (spawn && spawn.respawn) || 5000, callback: ()=>{ if (!spawn) return; if (!spawn.active) this._spawnEnemy(spawn); } }); }

    _onPlayerDown(){ this._showToast('You have been defeated! Returning to town...',2000); this.player.disableBody(true,true); this.time.addEvent({ delay: 1800, callback: ()=>{ this.char.hp = this.char.maxhp; this._persistCharacter(this.username); this.scene.start('Town', { character: this.char, username: this.username, spawnX: 120, spawnY: this.scale.height - 100 }); } }); }

    _recalculateVitals(){ const stats = (window && window.__shared_ui && window.__shared_ui.stats) ? window.__shared_ui.stats.effectiveStats(this.char) : null; const eff = stats || { str:0,int:0,agi:0,luk:0,defense:0 }; const level = this.char.level || 1; this.char.maxhp = (eff && typeof eff.maxhp === 'number') ? eff.maxhp : Math.max(1, Math.floor(100 + level *10 + ((eff.str||0)*10))); this.char.maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : Math.max(0, Math.floor(50 + level *5 + ((eff.int||0)*10))); if (!this.char.expToLevel) this.char.expToLevel = 100; }

    _persistCharacter(username){ if (!username || !this.char) return; try { const key = 'cif_user_' + username; const userObj = JSON.parse(localStorage.getItem(key)); if (userObj && userObj.characters) { this.char.lastLocation = { scene: 'GoblinCamp', x: (this.player && this.player.x) || null, y: (this.player && this.player.y) || null }; let found = false; for (let i = 0; i < userObj.characters.length; i++) { const uc = userObj.characters[i]; if (!uc) continue; if ((uc.id && this.char.id && uc.id === this.char.id) || (!uc.id && uc.name === this.char.name)) { userObj.characters[i] = this.char; found = true; break; } } if (!found) { for (let i = 0; i < userObj.characters.length; i++) { if (!userObj.characters[i]) { userObj.characters[i] = this.char; found = true; break; } } if (!found) userObj.characters.push(this.char); } localStorage.setItem(key, JSON.stringify(userObj)); } } catch (e) { /* ignore */ } }

    _createHUD(){ if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); }
    _updateHUD(){ if (window && window.__hud_shared && window.__hud_shared.updateHUD) window.__hud_shared.updateHUD(this); }
    _destroyHUD(){ if (window && window.__hud_shared && window.__hud_shared.destroyHUD) window.__hud_shared.destroyHUD(this); }
    _showToast(t,timeout=1400){ if (window && window.__shared_ui && window.__shared_ui.showToast) return window.__shared_ui.showToast(this,t,timeout); if (!this._toastContainer) { this._toastContainer = document.createElement('div'); this._toastContainer.style.position = 'fixed'; this._toastContainer.style.bottom = '14px'; this._toastContainer.style.left = '50%'; this._toastContainer.style.transform = 'translateX(-50%)'; this._toastContainer.style.zIndex = '210'; this._toastContainer.style.pointerEvents = 'none'; document.body.appendChild(this._toastContainer); } const el = document.createElement('div'); el.textContent = t; el.style.background = 'rgba(10,10,12,0.85)'; el.style.color = '#fff'; el.style.padding = '8px 12px'; el.style.marginTop = '6px'; el.style.borderRadius = '8px'; el.style.fontFamily = 'UnifrakturCook, cursive'; el.style.opacity = '0'; el.style.transition = 'opacity 180ms ease, transform 220ms ease'; el.style.transform = 'translateY(6px)'; this._toastContainer.appendChild(el); requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateY(0)'; }); setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; setTimeout(()=>{ if (el.parentNode) el.parentNode.removeChild(el); },220); }, timeout); }

    _showDamageNumber(x,y,text,color='#fff'){ if (!this.damageLayer) this.damageLayer = this.add.layer(); const label = this.add.text(x,y,text,{ fontSize:'18px', color, fontFamily:'UnifrakturCook, cursive'}).setOrigin(0.5).setDepth(6); this.damageLayer.add(label); this.tweens.add({ targets: label, y: y-30, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete:()=>label.destroy() }); }
    _attachEnemyBars(enemy){ const width=50,height=6; enemy.healthBarBg = this.add.rectangle(enemy.x, enemy.y - 50, width, height, 0x000000, 0.55).setDepth(3); enemy.healthBar = this.add.rectangle(enemy.x, enemy.y - 50, width, height, 0xff5555).setDepth(3); enemy.healthBar.fullWidth = width; enemy.healthBarBg.setOrigin(0.5); enemy.healthBar.setOrigin(0.5); this._updateEnemyHealthBar(enemy); this._updateEnemyBarPosition(enemy); }
    _updateEnemyHealthBar(enemy){ if (!enemy.healthBar) return; const hp = Math.max(0, enemy.getData('hp')); const maxhp = Math.max(1, enemy.getData('maxhp')); const ratio = Math.max(0, Math.min(1, hp/maxhp)); enemy.healthBar.displayWidth = (enemy.healthBar.fullWidth || 50) * ratio; }
    _updateEnemyBarPosition(enemy){ if (!enemy.healthBarBg) return; const y = enemy.y - 50; enemy.healthBarBg.setPosition(enemy.x,y); if (enemy.healthBar) enemy.healthBar.setPosition(enemy.x,y); }
    _detachEnemyBars(enemy){ if (enemy.healthBar) enemy.healthBar.destroy(); if (enemy.healthBarBg) enemy.healthBarBg.destroy(); enemy.healthBar = null; enemy.healthBarBg = null; }

    shutdown(){ this._persistCharacter(this.username); this._destroyHUD(); if (this.damageLayer) { this.damageLayer.destroy(); this.damageLayer = null; } }
}

export default GoblinCamp;
