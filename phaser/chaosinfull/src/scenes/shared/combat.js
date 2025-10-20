import { checkClassLevelUps } from './stats.js';

function sharedTryAttack(silentMiss = false, preferredTarget = null) {
    if (!this.player || !this.enemies) return;
    const cooldown = (this.attackCooldown != null) ? this.attackCooldown : 520;
    if (this.time && this.time.now < (this.nextAttackTime || 0)) return;
    if (this.time) this.nextAttackTime = this.time.now + cooldown;

    const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
        ? window.__shared_ui.stats.effectiveStats(this.char)
        : { str: 0 };
    const strength = (effStats && effStats.str) || 0;
    const baseDamage = Phaser.Math.Between(6, 10) + strength * 2;
    let hitSomething = false;
    const candidates = preferredTarget ? [preferredTarget] : (this.enemies.getChildren ? this.enemies.getChildren() : []);
    const range = (this.attackRange != null) ? this.attackRange : 68;

    candidates.forEach((enemy) => {
        if (!enemy || !enemy.getData || !enemy.getData('alive')) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (dist <= range) {
            hitSomething = true;
            const hp = enemy.getData('hp') - baseDamage;
            enemy.setData('hp', hp);
            if (this._showDamageNumber) this._showDamageNumber(enemy.x, enemy.y - 42, `-${baseDamage}`, '#ffee66');
            if (this._updateEnemyHealthBar) this._updateEnemyHealthBar(enemy);
            if (hp <= 0) this._handleEnemyDeath(enemy);
        }
    });

    if (!hitSomething && !silentMiss && this._showToast) {
        this._showToast('Your attack hits nothing...', 900);
    }
}

function sharedHandleEnemyDeath(enemy) {
    if (!enemy) return;
    const defId = enemy.getData ? enemy.getData('defId') : null;
    const def = (defId && this.enemyDefs) ? this.enemyDefs[defId] : null;
    if (enemy.setData) enemy.setData('alive', false);
    if (this._detachEnemyBars) this._detachEnemyBars(enemy);
    if (enemy.disableBody) enemy.disableBody(true, true);
    const spawn = enemy.getData ? enemy.getData('spawn') : null;
    if (spawn) spawn.active = null;
    this._rollDrops(def);
    this._gainExperience(def && def.exp ? def.exp : 0);
    if (this._updateHUD) this._updateHUD();
    if (this._persistCharacter) this._persistCharacter(this.username);
    if (this.time && this.time.addEvent) {
        this.time.addEvent({
            delay: (spawn && spawn.respawn) || 5000,
            callback: () => { if (spawn && !spawn.active && this._spawnEnemy) this._spawnEnemy(spawn); }
        });
    }
}

function sharedRollDrops(def) {
    if (!def || !this.char) return;
    const lukStat = ((this.char.stats && this.char.stats.luk) || 0) + ((this.char._equipBonuses && this.char._equipBonuses.luk) || 0);
    const dropsAwarded = [];

    if (Array.isArray(def.drops)) {
        def.drops.forEach(drop => {
            if (!drop || !drop.itemId) return;
            const baseChance = drop.baseChance || 0;
            const bonus = (drop.luckBonus || 0) * lukStat;
            const chance = Math.min(0.99, baseChance + bonus);
            if (Math.random() <= chance) {
                const qty = Phaser.Math.Between(drop.minQty || 1, drop.maxQty || 1);
                this._addItemToInventory(drop.itemId, qty);
                dropsAwarded.push({ itemId: drop.itemId, qty });
            }
        });
    }

    let goldAwarded = 0;
    if (def.gold && typeof def.gold === 'object') {
        const baseChance = def.gold.chance || 0;
        const bonus = (def.gold.luckBonus || 0) * lukStat;
        const chance = Math.min(0.99, baseChance + bonus);
        if (Math.random() <= chance) {
            const min = Math.max(0, Math.floor(def.gold.min || 0));
            const max = Math.max(min, Math.floor(def.gold.max || min));
            goldAwarded = Phaser.Math.Between(min, max);
            try { this.char.gold = (this.char.gold || 0) + goldAwarded; } catch (e) { /* ignore */ }
        }
    }

    const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    if (dropsAwarded.length || goldAwarded) {
        const parts = dropsAwarded.map(drop => {
            const name = (itemDefs && itemDefs[drop.itemId] && itemDefs[drop.itemId].name) || drop.itemId;
            return `${drop.qty}x ${name}`;
        });
        if (goldAwarded) parts.push(`Gold +${goldAwarded}`);
        if (this._showToast) this._showToast('Loot: ' + parts.join(', '), 2000);
    } else if (this._showToast) {
        this._showToast('No loot this time...', 1000);
    }
}

function sharedAddItemToInventory(itemId, qty = 1) {
    if (!this.char) return;
    const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const def = itemDefs[itemId];

    if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) {
        const added = window.__shared_ui.addItemToInventory(this, itemId, qty);
        if (!added && this._showToast) this._showToast('Inventory full');
    } else {
        const inv = this.char.inventory = this.char.inventory || [];
        if (def && def.stackable) {
            let entry = inv.find(x => x && x.id === itemId);
            if (entry) entry.qty = (entry.qty || 0) + qty;
            else inv.push({ id: itemId, name: (def && def.name) || itemId, qty });
        } else {
            for (let i = 0; i < qty; i++) inv.push({ id: itemId, name: (def && def.name) || itemId, qty: 1 });
        }
    }

    if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal && this._inventoryModal) {
        window.__shared_ui.refreshInventoryModal(this);
    }
}

function sharedGainExperience(amount) {
    if (!amount || !this.char) return;
    this.char.exp = (this.char.exp || 0) + amount;
    const leveled = checkClassLevelUps(this);
    if (leveled && this._showToast) this._showToast('Level up!', 1800);
}

function sharedToggleAutoAttack() {
    this.autoAttack = !this.autoAttack;
    const colors = this._autoToggleColors || { on: '#66ff88', off: '#ffd27a' };
    const labelFn = this._autoToggleLabel || ((state) => `Auto: ${state ? 'ON' : 'OFF'} (R)`);
    if (this.autoIndicator) {
        this.autoIndicator.setText(labelFn(this.autoAttack));
        this.autoIndicator.setColor(this.autoAttack ? colors.on : colors.off);
    }
    if (this._showToast) this._showToast(this.autoAttack ? 'Auto combat enabled' : 'Auto combat disabled', 1000);
}

function sharedGetEnemyInRange(range) {
    if (!this.enemies || !this.enemies.getChildren) return null;
    const limit = (range != null) ? range : (this.attackRange != null ? this.attackRange : 68);
    return this.enemies.getChildren().find(enemy => enemy && enemy.getData && enemy.getData('alive') &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= limit);
}

function sharedProcessAutoCombat() {
    if (!this.autoAttack) return;
    if (!this.time || this.time.now < (this.nextAttackTime || 0)) return;
    const target = this._getEnemyInRange(this.attackRange);
    if (target) this._tryAttack(true, target);
}

export const combatMixin = {
    _tryAttack: sharedTryAttack,
    _handleEnemyDeath: sharedHandleEnemyDeath,
    _rollDrops: sharedRollDrops,
    _addItemToInventory: sharedAddItemToInventory,
    _gainExperience: sharedGainExperience,
    _toggleAutoAttack: sharedToggleAutoAttack,
    _getEnemyInRange: sharedGetEnemyInRange,
    _processAutoCombat: sharedProcessAutoCombat
};

export function applyCombatMixin(target) {
    if (!target) return;
    Object.assign(target, combatMixin);
}

export function initAutoCombat(scene, opts = {}) {
    if (!scene || !scene.input || !scene.input.keyboard) return null;
    const keyCode = (opts.toggleKey != null) ? opts.toggleKey : Phaser.Input.Keyboard.KeyCodes.R;
    scene.autoAttack = !!opts.startOn;
    scene.autoToggleKey = scene.input.keyboard.addKey(keyCode);

    const onColor = opts.onColor || '#66ff88';
    const offColor = opts.offColor || '#ffd27a';
    const depth = (opts.depth != null) ? opts.depth : 5;
    const scrollFactor = (opts.scrollFactor != null) ? opts.scrollFactor : 0;
    const position = opts.position || { x: 16, y: 16 };
    const baseFormatter = opts.labelFormatter || ((state) => `Auto: ${state ? 'ON' : 'OFF'} (R)`);

    scene._autoToggleColors = { on: onColor, off: offColor };
    scene._autoToggleLabel = baseFormatter;

    const defaultStyle = {
        fontSize: '16px',
        color: scene.autoAttack ? onColor : offColor,
        fontFamily: 'UnifrakturCook, cursive'
    };
    const textStyle = Object.assign(defaultStyle, opts.textStyle || {});

    if (scene.autoIndicator && scene.autoIndicator.destroy) scene.autoIndicator.destroy();
    if (scene.add && scene.add.text) {
        scene.autoIndicator = scene.add.text(position.x, position.y, baseFormatter(scene.autoAttack), textStyle)
            .setDepth(depth)
            .setScrollFactor(scrollFactor);
    } else {
        scene.autoIndicator = null;
    }

    return scene.autoIndicator;
}

export function teardownAutoCombat(scene) {
    if (!scene) return;
    if (scene.autoIndicator && scene.autoIndicator.destroy) {
        scene.autoIndicator.destroy();
    }
    scene.autoIndicator = null;
    scene.autoToggleKey = null;
}

export default {
    combatMixin,
    applyCombatMixin,
    initAutoCombat,
    teardownAutoCombat
};
