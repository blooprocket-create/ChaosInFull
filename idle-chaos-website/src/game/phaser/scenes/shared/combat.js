import { checkClassLevelUps } from './stats.js';
import { persistCharacter } from './persistence.js';
import { getTalentDefById, ensureCharTalents, computeTalentModifiers } from '../../data/talents.js';
import { bindSkillBarKeys, unbindSkillBarKeys, bindTalentKey, unbindTalentKey, refreshSkillBarHUD } from './ui.js';
import { setCircleCentered, setBodySizeCentered } from '../../shared/physicsHelpers.js';
import { addPhysicsOverlap } from '../../shared/cleanupManager.js';
import { enableInvertCircle, updateInvertCircle, disableInvertCircle, enableHellscape, disableHellscape } from './pipelines.js';

// ========== Safe Data Accessors ==========
// These helpers prevent null/undefined crashes when accessing enemy/entity data
// that may be destroyed or invalid during rapid combat scenarios.

/**
 * Safely get data from a Phaser game object
 * @param {Object} obj - The game object (typically an enemy sprite)
 * @param {string} key - The data key to retrieve
 * @param {*} defaultValue - Value to return if getData fails or object is invalid
 * @returns {*} The data value or defaultValue
 */
function safeGetData(obj, key, defaultValue = null) {
    try {
        if (obj && typeof obj.getData === 'function') {
            const value = obj.getData(key);
            return value !== undefined ? value : defaultValue;
        }
    } catch (e) {
        // Object may have been destroyed mid-access
    }
    return defaultValue;
}

/**
 * Safely set data on a Phaser game object
 * @param {Object} obj - The game object
 * @param {string} key - The data key to set
 * @param {*} value - The value to set
 * @returns {boolean} True if successful, false otherwise
 */
function safeSetData(obj, key, value) {
    try {
        if (obj && typeof obj.setData === 'function') {
            obj.setData(key, value);
            return true;
        }
    } catch (e) {
        // Object may have been destroyed mid-access
    }
    return false;
}

// ========== End Safe Data Accessors ==========

// ========== Hellscape Atmosphere Helpers ==========
// Ember particle overlay to enhance hellish mood during stealth.
function ensureHellEmbers(scene) {
    try {
        if (!scene || !scene.add || scene._hellEmbers) return false;
        const cam = scene.cameras && scene.cameras.main;
        // Create a tiny orange circle texture if not present
        const key = '__ember_px';
        try {
            const texMgr = scene.textures;
            if (texMgr && !texMgr.exists(key)) {
                const g = scene.add.graphics();
                g.fillStyle(0xFF6A00, 1.0);
                g.fillCircle(4, 4, 4);
                g.generateTexture(key, 8, 8);
                g.destroy();
            }
        } catch (e) {}

        if (!scene.add.particles) return false;
        const particles = scene.add.particles(key);
        if (!particles) return false;
        particles.setDepth(10000);
        particles.setScrollFactor(0); // screen-space overlay
        const emitter = particles.createEmitter({
            x: { min: 0, max: (cam && cam.width) || 800 },
            y: () => ((cam && cam.height) || 600) + 10,
            lifespan: { min: 1200, max: 2600 },
            speedY: { min: -60, max: -120 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.35, end: 0.0 },
            alpha: { start: 0.9, end: 0.0 },
            tint: [0xFF9A00, 0xFF5500, 0xFF2A00, 0xFFD180],
            gravityY: 0,
            rotate: { min: -45, max: 45 },
            blendMode: 'ADD',
            frequency: 100,
            quantity: 1,
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Rectangle(0, ((cam && cam.height) || 600) - 8, ((cam && cam.width) || 800), 1),
                quantity: 16
            }
        });
        scene._hellEmbers = { particles, emitter };
        return true;
    } catch (e) { return false; }
}

function clearHellEmbers(scene) {
    try {
        if (scene && scene._hellEmbers) {
            try { scene._hellEmbers.emitter && scene._hellEmbers.emitter.stop(); } catch (e) {}
            try { scene._hellEmbers.particles && scene._hellEmbers.particles.destroy(); } catch (e) {}
            scene._hellEmbers = null;
            return true;
        }
    } catch (e) {}
    return false;
}
// ========== End Hellscape Atmosphere Helpers ==========

// Phaser 3.60+ removed ParticleEmitterManager. Provide a helper to gate usage.
function _supportsLegacyParticles(scene) {
    try {
        const ver = (typeof Phaser !== 'undefined' && Phaser.VERSION) ? Phaser.VERSION : '0.0.0';
        const parts = ver.split('.');
        const major = parseInt(parts[0] || '0', 10);
        const minor = parseInt(parts[1] || '0', 10);
        const versionNum = major + (minor / 100);
        if (versionNum >= 3.60) return false;
    } catch (e) {}
    try { return !!(scene && scene.add && scene.add.particles); } catch (e) { return false; }
}

// Primary stat mapping per class (used for damage calculations and summons)
const PRIMARY_STAT_BY_CLASS = {
    beginner: 'luk',
    horror: 'str',
    ravager: 'str',
    sanguine: 'str',
    occultis: 'int',
    hexweaver: 'int',
    astral_scribe: 'int',
    stalker: 'agi',
    nightblade: 'agi',
    shade_dancer: 'agi'
};

function getPrimaryStatKeyForClass(classId) {
    const key = (typeof classId === 'string') ? classId.toLowerCase() : (classId && String(classId).toLowerCase());
    return PRIMARY_STAT_BY_CLASS[key] || 'str';
}

// Helper: compute player's physics-body center (fall back to sprite x/y)
function getPlayerCenter(ctx) {
    try {
        if (!ctx) return { x: 0, y: 0 };
        const p = ctx.player || null;
        if (p && p.body && typeof p.body.x === 'number' && typeof p.body.width === 'number') {
            return { x: p.body.x + (p.body.width / 2), y: p.body.y + (p.body.height / 2) };
        }
        return { x: (p && typeof p.x === 'number') ? p.x : 0, y: (p && typeof p.y === 'number') ? p.y : 0 };
    } catch (e) { return { x: (ctx && ctx.player && ctx.player.x) || 0, y: (ctx && ctx.player && ctx.player.y) || 0 }; }
}

function pdist(ctx, x2, y2) {
    const p = getPlayerCenter(ctx);
    return Phaser.Math.Distance.Between(p.x, p.y, x2 || 0, y2 || 0);
}

function ensureDamageLayer(ctx) {
    if (!ctx || !ctx.add) return null;
    if (!ctx.damageLayer) {
        try {
            ctx.damageLayer = ctx.add.layer();
            try { if (typeof ctx.damageLayer.setDepth === 'function') ctx.damageLayer.setDepth(6); } catch (e) {}
        } catch (e) { ctx.damageLayer = null; }
    }
    return ctx.damageLayer || null;
}

function spawnDustBursts(scene, x, y, radius) {
    if (!scene || !scene.add || !scene.tweens) return;
    try {
        const pieces = 8;
        for (let i = 0; i < pieces; i++) {
            const ang = (Math.PI * 2 * i / pieces) + Phaser.Math.FloatBetween(-0.2, 0.2);
            const dist = Phaser.Math.FloatBetween(radius * 0.35, radius * 0.55);
            const rx = Math.cos(ang);
            const ry = Math.sin(ang);
            const debris = scene.add.rectangle(x, y, Phaser.Math.Between(6, 12), 3, 0x8c5a3a, 0.75).setDepth(6);
            debris.setAngle(Phaser.Math.RadToDeg(ang));
            scene.tweens.add({
                targets: debris,
                x: x + rx * dist,
                y: y + ry * dist,
                alpha: 0,
                duration: Phaser.Math.Between(220, 320),
                ease: 'Quad.easeOut',
                onComplete: () => { try { debris.destroy(); } catch (e) {} }
            });
        }
    } catch (e) {}
}

function highlightEnemy(scene, enemy, opts = {}) {
    if (!scene || !enemy || !scene.add) return;
    try {
        const radius = Math.max(18, ((enemy.displayWidth || enemy.width || 32) + (enemy.displayHeight || enemy.height || 32)) * 0.25);
        const color = opts.color || 0xff334d;
        const depth = (enemy.depth || 7) + 0.2;
        const ring = scene.add.circle(enemy.x, enemy.y, radius, color, 0.2).setDepth(depth);
        ring.setScale(0.3);
        if (scene.tweens && scene.tweens.add) {
            scene.tweens.add({
                targets: ring,
                scale: 1,
                alpha: 0,
                duration: opts.duration ? Math.min(360, opts.duration * 0.4) : 320,
                ease: 'Cubic.easeOut',
                onComplete: () => { try { ring.destroy(); } catch (e) {} }
            });
        } else {
            scene.time && scene.time.delayedCall && scene.time.delayedCall(320, () => { try { ring.destroy(); } catch (e) {} });
        }
        const slash = scene.add.rectangle(enemy.x, enemy.y, radius * 1.6, 4, color, 0.45).setDepth(depth + 0.01);
        slash.setAngle(45);
        if (scene.tweens && scene.tweens.add) {
            scene.tweens.add({
                targets: slash,
                alpha: 0,
                scaleX: 0.3,
                duration: 260,
                ease: 'Quad.easeOut',
                onComplete: () => { try { slash.destroy(); } catch (e) {} }
            });
        } else {
            scene.time && scene.time.delayedCall && scene.time.delayedCall(260, () => { try { slash.destroy(); } catch (e) {} });
        }
    } catch (e) {}
}

function spawnDashTrail(scene, startX, startY, targetX, targetY, color) {
    if (!scene || !scene.add) return;
    try {
        const steps = 6;
        const ang = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Phaser.Math.Linear(startX, targetX, t);
            const y = Phaser.Math.Linear(startY, targetY, t);
            const after = scene.add.rectangle(x, y, 32, 10, color || 0xff6677, 0.18).setDepth(7);
            after.setAngle(Phaser.Math.RadToDeg(ang));
            if (scene.tweens && scene.tweens.add) {
                scene.tweens.add({
                    targets: after,
                    alpha: 0,
                    scaleX: 0.4,
                    duration: 240,
                    ease: 'Sine.easeOut',
                    onComplete: () => { try { after.destroy(); } catch (e) {} }
                });
            } else {
                scene.time && scene.time.delayedCall && scene.time.delayedCall(240, () => { try { after.destroy(); } catch (e) {} });
            }
        }
        const finishSlash = scene.add.rectangle(targetX, targetY, 30, 6, color || 0xff6677, 0.35).setDepth(7.2);
        finishSlash.setAngle(Phaser.Math.RadToDeg(ang));
        if (scene.tweens && scene.tweens.add) {
            scene.tweens.add({
                targets: finishSlash,
                alpha: 0,
                scaleX: 0.3,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => { try { finishSlash.destroy(); } catch (e) {} }
            });
        } else {
            scene.time && scene.time.delayedCall && scene.time.delayedCall(200, () => { try { finishSlash.destroy(); } catch (e) {} });
        }
    } catch (e) {}
}

function markActivationSuccess(scene, tid) {
    try {
        if (!scene) return;
        if (!scene._talentActivationState || scene._talentActivationState.id !== tid) {
            scene._talentActivationState = { id: tid, success: true };
        } else {
            scene._talentActivationState.success = true;
        }
    } catch (e) {}
}

function getWeaponDamageRange(scene) {
    try {
        if (scene && scene.char && scene.char.equipped && scene.char.equipped.weapon) {
            const weapon = scene.char.equipped.weapon;
            return [weapon.minDamage || 1, weapon.maxDamage || 3];
        }
    } catch (e) {}
    return [1, 3];
}

function spawnArcaneSigil(scene, x, y, radius, opts = {}) {
    if (!scene || !scene.add) return null;
    try {
        const container = scene.add.container(x, y).setDepth(opts.depth != null ? opts.depth : 7);
        const baseColor = opts.fillColor != null ? opts.fillColor : 0x2a0d4a;
        const strokeColor = opts.strokeColor != null ? opts.strokeColor : 0xa884ff;
        const innerColor = opts.innerColor != null ? opts.innerColor : 0xffffff;

        const outer = scene.add.circle(0, 0, radius, baseColor, opts.fillAlpha != null ? opts.fillAlpha : 0.28);
        outer.setStrokeStyle(2, strokeColor, 0.85);
        container.add(outer);

        const inner = scene.add.circle(0, 0, radius * 0.45, innerColor, 0.1);
        inner.setBlendMode(Phaser.BlendModes.ADD);
        container.add(inner);

        for (let i = 0; i < 3; i++) {
            const line = scene.add.rectangle(0, 0, radius * 1.3, 3, strokeColor, 0.8);
            line.setBlendMode(Phaser.BlendModes.ADD);
            line.setAngle(i * 60);
            container.add(line);
        }

        if (scene.tweens && scene.tweens.add) {
            scene.tweens.add({ targets: container, angle: 120, duration: 1000, repeat: -1, ease: 'Linear' });
            scene.tweens.add({ targets: outer, alpha: { from: 0.35, to: 0.15 }, yoyo: true, repeat: -1, duration: 420 });
        }

        return {
            destroy: () => { try { container.destroy(); } catch (e) {} }
        };
    } catch (e) { return null; }
}

function spawnArcaneShield(scene, x, y, radius, color, opts = {}) {
    if (!scene || !scene.add) return null;
    try {
        const container = scene.add.container(x, y).setDepth(opts.depth != null ? opts.depth : 7.5);
        const base = scene.add.circle(0, 0, radius, color || 0x66bbff, 0.22);
        base.setStrokeStyle(2, 0xaad8ff, 0.9);
        container.add(base);

        const inner = scene.add.circle(0, 0, radius * 0.55, 0xffffff, 0.12);
        inner.setBlendMode(Phaser.BlendModes.ADD);
        container.add(inner);

        const orbiters = [];
        for (let i = 0; i < 3; i++) {
            const orb = scene.add.circle(Math.cos(i * Phaser.Math.PI2 / 3) * radius * 0.65, Math.sin(i * Phaser.Math.PI2 / 3) * radius * 0.65, 6, 0xaad8ff, 0.9);
            orb.setBlendMode(Phaser.BlendModes.ADD);
            container.add(orb);
            orbiters.push(orb);
        }

        if (scene.tweens && scene.tweens.add) {
            scene.tweens.add({ targets: container, angle: 180, duration: 1200, repeat: -1, ease: 'Linear' });
            scene.tweens.add({ targets: orbiters, alpha: { from: 1, to: 0.35 }, yoyo: true, repeat: -1, duration: 360, ease: 'Sine.easeInOut' });
            scene.tweens.add({ targets: base, alpha: { from: 0.28, to: 0.12 }, yoyo: true, repeat: -1, duration: 420 });
        }

        return {
            destroy: () => { try { container.destroy(); } catch (e) {} }
        };
    } catch (e) { return null; }
}

function spawnBlinkAfterimage(scene, startX, startY, targetX, targetY, color) {
    if (!scene || !scene.add) return;
    try {
        const start = scene.add.circle(startX, startY, 16, color || 0x9966ff, 0.22).setDepth(9);
        start.setBlendMode(Phaser.BlendModes.ADD);
        const end = scene.add.circle(targetX, targetY, 20, color || 0x9966ff, 0.18).setDepth(9.2);
        end.setBlendMode(Phaser.BlendModes.ADD);

        if (scene.tweens && scene.tweens.add) {
            scene.tweens.add({ targets: start, alpha: 0, scale: 1.4, duration: 200, ease: 'Quad.easeOut', onComplete: () => { try { start.destroy(); } catch (e) {} } });
            scene.tweens.add({ targets: end, alpha: 0, scale: 1.6, duration: 260, ease: 'Quad.easeOut', onComplete: () => { try { end.destroy(); } catch (e) {} } });
        } else {
            scene.time && scene.time.delayedCall && scene.time.delayedCall(200, () => { try { start.destroy(); } catch (e) {} });
            scene.time && scene.time.delayedCall && scene.time.delayedCall(260, () => { try { end.destroy(); } catch (e) {} });
        }
    } catch (e) {}
}

function ensureKnifeSwarmAssets(scene) {
    if (!scene || !scene.textures || !scene.make) return false;
    let ok = true;
    try {
        if (!scene.textures.exists('fx_knife_blade')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xfaf9ff, 1);
            g.fillTriangle(16, 0, 32, 16, 0, 16);
            g.fillStyle(0x1a2236, 1);
            g.fillTriangle(16, 5, 24, 15, 8, 15);
            g.lineStyle(1.6, 0x7bd3ff, 0.85);
            g.strokeTriangle(16, 1, 31, 15, 1, 15);
            g.generateTexture('fx_knife_blade', 32, 16);
            g.destroy();
        }
    } catch (e) { ok = false; }
    try {
        if (!scene.textures.exists('fx_knife_spark')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xffffff, 0.9);
            g.fillCircle(4, 4, 4);
            g.fillStyle(0x8fb9ff, 0.9);
            g.fillCircle(4, 4, 2.4);
            g.generateTexture('fx_knife_spark', 8, 8);
            g.destroy();
        }
    } catch (e) { ok = false; }
    return ok;
}

function ensureNeedleAssets(scene) {
    if (!scene || !scene.textures || !scene.make) return false;
    let ok = true;
    try {
        if (!scene.textures.exists('fx_needle')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            // draw a thin needle: long thin triangle pointing right (we'll rotate as needed)
            g.fillStyle(0xfff4e6, 1);
            g.fillRect(0, 2, 18, 4);
            g.fillTriangle(18, 0, 26, 4, 18, 8);
            g.lineStyle(1, 0xedd8b3, 0.9);
            g.strokeRect(0, 2, 18, 4);
            g.generateTexture('fx_needle', 28, 10);
            g.destroy();
        }
    } catch (e) { ok = false; }
    return ok;
}

function ensureVoidOrbAssets(scene) {
    if (!scene || !scene.textures || !scene.make) return false;
    let ok = true;
    try {
        if (!scene.textures.exists('fx_void_orb')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            // soft purple orb with inner bright core
            g.fillStyle(0x2b004b, 0.95);
            g.fillCircle(8, 8, 8);
            g.fillStyle(0xe9d7ff, 0.95);
            g.fillCircle(8, 8, 3);
            g.generateTexture('fx_void_orb', 16, 16);
            g.destroy();
        }
    } catch (e) { ok = false; }
    try {
        if (!scene.textures.exists('fx_void_spark')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(3, 3, 3);
            g.fillStyle(0xcfa0ff, 0.95);
            g.fillCircle(3, 3, 1.6);
            g.generateTexture('fx_void_spark', 6, 6);
            g.destroy();
        }
    } catch (e) { ok = false; }
    return ok;
}

function ensureVoidZoneAssets(scene) {
    if (!scene || !scene.textures || !scene.make) return false;
    let ok = true;
    try {
        if (!scene.textures.exists('fx_void_zone')) {
            // create a soft radial void texture (64x64)
            const size = 64;
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            // layered circles to simulate a soft core + ring
            g.fillStyle(0x140018, 1);
            g.fillCircle(size/2, size/2, size/2);
            // inner brightish core
            g.fillStyle(0x3a003a, 0.85);
            g.fillCircle(size/2, size/2, Math.floor(size * 0.36));
            // soft lighter ring
            for (let i = 0; i < 6; i++) {
                const a = 0.06 + (i * 0.02);
                const r = Math.floor(size * (0.42 + i * 0.03));
                g.fillStyle(0x6e2b8f, a);
                g.fillCircle(size/2, size/2, r);
            }
            // inner spark
            g.fillStyle(0xe9d7ff, 0.85);
            g.fillCircle(size/2, size/2, 6);
            g.generateTexture('fx_void_zone', size, size);
            g.destroy();
        }
    } catch (e) { ok = false; }
    return ok;
}

function createVoidZoneEmitter(scene, target, depth) {
    if (!scene || !scene.textures || !scene.textures.exists('fx_void_spark')) return null;
    if (!_supportsLegacyParticles(scene)) return null;
    try {
        const particles = scene.add.particles('fx_void_spark');
        if (typeof depth === 'number') particles.setDepth(depth + 0.05);
        const emitter = particles.createEmitter({
            x: target.x, y: target.y,
            lifespan: { min: 220, max: 420 },
            speed: { min: 6, max: 44 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.9, end: 0 },
            quantity: 1,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 120,
            angle: { min: 0, max: 360 }
        });
        try { emitter.startFollow && emitter.startFollow(target); } catch (e) {}
        particles._emitter = emitter;
        return particles;
    } catch (e) { return null; }
}

function createVoidOrbTrailEmitter(scene, target, depth) {
    if (!scene || !scene.textures) return null;
    if (!_supportsLegacyParticles(scene)) return null;
    try {
        if (!scene.textures.exists('fx_void_spark')) return null;
        const particles = scene.add.particles('fx_void_spark');
        if (typeof depth === 'number') particles.setDepth(depth - 0.01);
        // make trail blobs persist longer so the orbs leave a more visible trail
        const emitter = particles.createEmitter({
            lifespan: { min: 360, max: 720 }, // increased lifespan (ms)
            alpha: { start: 0.9, to: 0 },
            scale: { start: 0.9, end: 0 },
            speed: { min: 8, max: 48 },
            quantity: 1,
            frequency: 60,
            blendMode: Phaser.BlendModes.ADD
        });
        try { emitter.startFollow && emitter.startFollow(target); } catch (e) {}
        particles._emitter = emitter;
        return particles;
    } catch (e) { return null; }
}

function ensureAuraAssets(scene) {
    if (!scene || !scene.textures || !scene.make) return false;
    let ok = true;
    try {
        if (!scene.textures.exists('fx_aura_ice')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            // soft icy glow
            g.fillStyle(0xcfefff, 0.85);
            g.fillCircle(12, 12, 12);
            g.generateTexture('fx_aura_ice', 24, 24);
            g.destroy();
        }
    } catch (e) { ok = false; }
    try {
        if (!scene.textures.exists('fx_ice_pop')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(3, 3, 3);
            g.fillStyle(0xaee6ff, 0.95);
            g.fillCircle(3, 3, 1.6);
            g.generateTexture('fx_ice_pop', 6, 6);
            g.destroy();
        }
    } catch (e) { ok = false; }
    return ok;
}

function createKnifeTrailEmitter(scene, target, depth) {
    if (!scene || !scene.textures || !scene.textures.exists('fx_knife_spark')) return null;
    if (!_supportsLegacyParticles(scene)) return null;
    try {
        const particles = scene.add.particles('fx_knife_spark');
        if (typeof depth === 'number') particles.setDepth(depth);
        const emitter = particles.createEmitter({
            lifespan: { min: 140, max: 240 },
            alpha: { start: 0.7, end: 0 },
            scale: { start: 0.7, end: 0 },
            quantity: 1,
            frequency: 45,
            speedX: { min: -22, max: 22 },
            speedY: { min: -22, max: 22 }
        });
        emitter.startFollow(target);
        particles._emitter = emitter;
        return particles;
    } catch (e) { return null; }
}


// Ensure procedural textures used by Knife Swarm exist so the skill has a consistent visual even without baked assets.
function sharedTryAttack(silentMiss = false, preferredTarget = null) {
    if (!this.player || !this.enemies) return;
    // Pull effective stats first so we can derive a sane base cooldown when no explicit override is set
    const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
        ? window.__shared_ui.stats.effectiveStats(this.char)
        : { str: 0 };
    const baseCd = (this.attackCooldown != null)
        ? this.attackCooldown
        : ((effStats && typeof effStats.attackSpeedMs === 'number') ? effStats.attackSpeedMs : 520);
    const cooldown = baseCd;
    // respect attack cooldown for performing an attack, but allow calling function to still run movement
    if (this.time && this.time.now < (this.nextAttackTime || 0)) return;
    if (this.time) this.nextAttackTime = this.time.now + cooldown;


    // Determine equipped weapon and its damage range (falls back to simple base if no weapon)
    const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    let weaponDef = null;
    try {
        const we = (this.char && this.char.equipment && this.char.equipment.weapon) ? this.char.equipment.weapon : null;
        if (we && we.id && itemDefs[we.id]) weaponDef = itemDefs[we.id];
    } catch (e) { weaponDef = null; }

    let weaponMin = 6, weaponMax = 10;
    if (weaponDef && Array.isArray(weaponDef.damage) && weaponDef.damage.length >= 2) {
        weaponMin = Number(weaponDef.damage[0]) || weaponMin;
        weaponMax = Number(weaponDef.damage[1]) || weaponMax;
    }

    // Class-based primary stat: beginner->luk, horror->str, occultis->int, stalker->agi
    const cls = (this.char && this.char.class) ? this.char.class : 'beginner';
    const primaryStatKey = getPrimaryStatKeyForClass(cls);
    const primaryStat = (effStats && typeof effStats[primaryStatKey] === 'number') ? effStats[primaryStatKey] : ((effStats && effStats.str) || 0);

    // Compute base damage: handle staffs as spell/ranged weapons (use INT as primary) and preserve melee for others
    let baseDamage = 0;
    let isStaff = false;
    try {
        isStaff = !!(weaponDef && (weaponDef.weaponType === 'staff' || /staff/i.test(weaponDef.id || '') || /staff/i.test(weaponDef.name || '')));
        if (isStaff) {
            // Staffs scale from INT (spell power). Use a spell-style base but keep weapon damage range as flavour.
            const intPrimary = (effStats && typeof effStats.int === 'number') ? effStats.int : 0;
            const baseSpell = Math.max(8, (intPrimary * 2) + 6);
            baseDamage = Phaser.Math.Between(weaponMin, weaponMax) + (intPrimary * 2);
            // If no weapon damage present, fall back to baseSpell
            if (!weaponDef || !Array.isArray(weaponDef.damage) || weaponDef.damage.length < 2) baseDamage = baseSpell;
        } else {
            baseDamage = Phaser.Math.Between(weaponMin, weaponMax) + (primaryStat * 2);
        }
    } catch (e) {
        baseDamage = Phaser.Math.Between(weaponMin, weaponMax) + (primaryStat * 2);
    }
    // Apply talent-based weapon damage modifiers (flat then percent) and gold-based weapon bonus
    try {
        const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
        const wmod = tmods['weaponDamage'] || null;
        if (wmod) {
            const flat = Number(wmod.flat || 0);
            const pct = Number(wmod.percent || 0);
            baseDamage = Number(baseDamage) + flat;
            if (pct) baseDamage = baseDamage * (1 + (pct / 100));
        }
        const goldWeapon = tmods['goldWeaponDamage'] || null;
        if (goldWeapon && this.char && typeof this.char.gold === 'number' && this.char.gold >= 10) {
            const flatPerPower = Number(goldWeapon.flat || 0);
            if (flatPerPower) {
                const power = Math.floor(Math.log10(Math.max(1, this.char.gold)));
                if (power > 0) baseDamage += (power * flatPerPower);
            }
        }
    } catch (e) {}
    // Determine the effective melee/ranged reach before attempting to find targets.
    // Weapon may change attack range: staffs and items with "range" should be treated as ranged
    let defaultRange = (this.attackRange != null) ? this.attackRange : 68;
    try {
        if (weaponDef) {
            if (typeof weaponDef.range === 'number') defaultRange = weaponDef.range;
            else if (/staff/i.test(weaponDef.id || '') || /staff/i.test(weaponDef.name || '')) defaultRange = 220;
        }
    } catch (e) {}
    let range = defaultRange;
    try {
        if (this.char && this.char._terrorFormEnabled) {
            // Terror Form increases attack range (double)
            range = Math.round(range * 2);
        }
    } catch (e) {}

    let hitSomething = false;
    // If a preferredTarget is provided, attack only that. Otherwise pick the single nearest enemy in range.
    const candidates = [];
    if (preferredTarget) {
        candidates.push(preferredTarget);
    } else {
        // find nearest enemy within range
        try {
            const nearest = this._getEnemyInRange ? this._getEnemyInRange(range) : this._findNearestEnemy ? this._findNearestEnemy() : null;
            if (nearest) candidates.push(nearest);
        } catch (e) {}
    }

    // Only attempt to damage the chosen target(s) (usually single nearest enemy)
    candidates.forEach((enemy) => {
        if (!enemy || !safeGetData(enemy, 'alive')) return;
    const dist = pdist(this, enemy.x, enemy.y);
        if (dist <= range) {
            // play attack animation (directional mine/slash) if available
            try {
                const _pc = getPlayerCenter(this);
                const ang = Phaser.Math.Angle.Between(_pc.x, _pc.y, enemy.x, enemy.y);
                const dx = Math.cos(ang); const dy = Math.sin(ang);
                const facing = (Math.abs(dx) > Math.abs(dy)) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
                const atkKey = 'mine_' + facing;
                // Ensure directional or fallback mine animation matches the attack cooldown
                try {
                    const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
                    const tex = this.textures.get(mineKey);
                    let frameNames = [];
                    if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
                    const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
                    const rows = 4; // up,left,down,right
                    const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
                    const durationMs = Math.max(120, cooldown);
                    let fps = 8;
                    if (framesPerRow > 0) {
                        fps = Math.max(1, Math.round(framesPerRow / (durationMs / 1000)));
                        // recreate directional animation so fps matches
                        const rowIndex = { up: 0, left: 1, down: 2, right: 3 }[facing] || 2;
                        const start = rowIndex * framesPerRow;
                        const end = start + framesPerRow - 1;
                        try { if (this.anims.exists(atkKey)) this.anims.remove(atkKey); } catch (e) {}
                        try { this.anims.create({ key: atkKey, frames: this.anims.generateFrameNumbers(mineKey, { start: start, end: end }), frameRate: fps, repeat: 0 }); } catch (e) {}
                    } else if (totalFrames > 0) {
                        fps = Math.max(1, Math.round(totalFrames / (durationMs / 1000)));
                        try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                        try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
                    }
                } catch (e) {}

                if (this.player && this.anims) {
                    // mark attacking so other code doesn't override the attack anim
                    try { this._attacking = true; } catch (e) {}
                    // play directional or fallback
                    if (this.anims.exists(atkKey)) this.player.anims.play(atkKey, true);
                    else if (this.anims.exists('mine')) this.player.anims.play('mine', true);
                    // clear attacking flag when the attack animation completes
                    try {
                        const onComplete = (anim, frame) => {
                            try {
                                if (anim && anim.key && (anim.key === atkKey || anim.key === 'mine')) {
                                    this._attacking = false;
                                }
                            } catch (ee) {}
                        };
                        if (this.player && this.player.once) this.player.once('animationcomplete', onComplete);
                    } catch (e) {}
                }
            } catch (e) {}
            hitSomething = true;
            // route player damage through the centralized handler so crits/lifesteal apply
            try {
                if (isStaff && this.add && this.tweens) {
                    // Visual: spawn a lightning orb that travels to the enemy then applies damage
                    try {
                        const _pc = getPlayerCenter(this);
                        const startX = _pc.x || 0;
                        const startY = _pc.y || 0;
                        const orb = this.add.circle(startX, startY, 8, 0x88ccff, 0.95).setDepth(10);
                        if (orb.setBlendMode) try { orb.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                        // small pulse/tween to travel
                        const dist = Phaser.Math.Distance.Between(startX, startY, enemy.x || 0, enemy.y || 0);
                        const speed = 1200; // px/s
                        const duration = Math.max(140, Math.round((dist / speed) * 1000));
                        this.tweens.add({ targets: orb, x: enemy.x, y: enemy.y, duration: duration, ease: 'Quad.easeOut', onComplete: () => {
                            try {
                                // impact flash
                                try { const fx = this.add.circle(enemy.x, enemy.y, 18, 0x88ddff, 0.28).setDepth((enemy.depth || 7) + 0.2); if (this.tweens) this.tweens.add({ targets: fx, alpha: 0, scale: 1.6, duration: 240, onComplete: () => { try { fx.destroy(); } catch (e) {} } }); } catch (e) {}
                                // apply damage now
                                try { _dealPlayerDamage(this, enemy, baseDamage, '#ffee66', { isSpell: true }); } catch (e) {}
                            } catch (e) {}
                            try { if (orb && orb.destroy) orb.destroy(); } catch (e) {}
                        } });
                    } catch (e) {
                        // fallback to direct damage if VFX fails
                        try { _dealPlayerDamage(this, enemy, baseDamage, '#ffee66', { isSpell: true }); } catch (ee) {}
                    }
                } else {
                    try { _dealPlayerDamage(this, enemy, baseDamage, '#ffee66', { isSpell: isStaff }); } catch (e) {}
                }
            } catch (e) {}

            // Cleave: if the player has cleave_mastery points, hit nearby secondary targets
            try {
                const talentMods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
                const cleavePct = Number((talentMods['cleaveDamage'] && talentMods['cleaveDamage'].percent) || 0);
                // compute extra targets from talent rank: 1 extra per 25 ranks, max 5
                const cleaveRank = _getTalentRank && _getTalentRank(this.char, 'cleave_mastery') ? _getTalentRank(this.char, 'cleave_mastery') : 0;
                // Design: rank 1 -> 1 extra target, +1 extra per 25 ranks, up to 5 extra targets
                const extraTargets = Math.min(5, 1 + Math.floor((Number(cleaveRank || 0)) / 25));
                if (extraTargets > 0 && cleavePct > 0) {
                    // find other enemies in a small radius around the primary hit
                    const cleaveRadius = 96;
                    const others = (this.enemies && this.enemies.getChildren) ? this.enemies.getChildren().filter(e => e && safeGetData(e, 'alive') && e !== enemy) : [];
                    // sort by distance
                    others.sort((a,b) => {
                        const da = pdist(this, a.x, a.y);
                        const db = pdist(this, b.x, b.y);
                        return da - db;
                    });
                    let taken = 0;
                    for (let i = 0; i < others.length && taken < extraTargets; i++) {
                        try {
                            const e = others[i];
                            const d = pdist(this, e.x, e.y);
                            if (d <= cleaveRadius) {
                                const cleaveDmg = Math.max(1, (baseDamage * (cleavePct / 100)));
                                _dealPlayerDamage(this, e, cleaveDmg, '#ffd4b3');
                                // small visual
                                try { highlightEnemy(this, e, { color: 0xffcc88, duration: 220 }); } catch (ee) {}
                                taken++;
                            }
                        } catch (ee) {}
                    }
                }
            } catch (e) {}
        }
    });

    if (!hitSomething && !silentMiss && this._showToast) {
        this._showToast('Your attack hits nothing...', 900);
    }
}


function sharedHandleEnemyDeath(enemy) {
    if (!enemy) return;
    const defId = safeGetData(enemy, 'defId');
    const def = (defId && this.enemyDefs) ? this.enemyDefs[defId] : null;
    safeSetData(enemy, 'alive', false);
    if (this._detachEnemyBars) this._detachEnemyBars(enemy);
    if (enemy.disableBody) enemy.disableBody(true, true);
    const spawn = safeGetData(enemy, 'spawn');
    if (spawn) spawn.active = null;
    this._rollDrops(def);
    this._gainExperience(def && def.exp ? def.exp : 0);
    // Abyssal Conjurer: chance to spawn a temporary friendly minion when the player slays an enemy
    try {
        const rank = _getTalentRank && _getTalentRank(this.char, 'abyssal_conjurer') ? _getTalentRank(this.char, 'abyssal_conjurer') : 0;
        if (rank && rank > 0) {
            try {
                // Use project's talent helper to compute chance (keeps behavior consistent)
                let chancePct = 0;
                try {
                    const tmods = (typeof computeTalentModifiers === 'function') ? computeTalentModifiers(this.char) : (this.char && this.char._talentModifiers) || {};
                    const obj = tmods && tmods['abyssalSummonChance'] ? tmods['abyssalSummonChance'] : null;
                    if (obj) {
                        // prefer percent field for percent-based scalings, otherwise fall back to flat
                        chancePct = Number(obj.percent != null ? obj.percent : obj.flat || 0) || 0;
                    }
                } catch (e) { chancePct = 0; }
                if (Math.random() * 100 <= (chancePct || 0)) {
                    // spawn one or more proper minion entities (sprites) per successful proc
                    try {
                        // Only one minion should spawn per kill (user requested single spawn)
                        const spawnCount = 1;
                        const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(this.char) : {};
                        for (let si = 0; si < spawnCount; si++) {
                            try {
                                // Spawn the minion at the enemy's death location (preferred) otherwise fallback to player
                                const _pc = getPlayerCenter(this);
                                const px = (enemy && typeof enemy.x === 'number') ? enemy.x : ((_pc && typeof _pc.x === 'number') ? _pc.x : 0);
                                const py = (enemy && typeof enemy.y === 'number') ? enemy.y : ((this.player && typeof this.player.y === 'number') ? this.player.y : 0);
                                const spawnX = px + Phaser.Math.Between(-22 - si * 8, 22 + si * 8);
                                const spawnY = py + Phaser.Math.Between(-18 - si * 6, 18 + si * 6);
                                // create a sprite for the minion (reuse an existing small character sheet if available)
                                let minion = null;
                                try {
                                    if (this.add && this.textures && this.textures.exists('rowan_idle')) {
                                        minion = this.add.sprite(spawnX, spawnY, 'rowan_idle').setDepth((this.player && this.player.depth) ? this.player.depth + 0.25 : 9.5);
                                        // start small and pop in with a short tween for a nicer summon
                                        try { minion.setScale(0.2); } catch (e) {}
                                        try { if (this.anims && this.anims.exists('idle_down')) minion.anims.play('idle_down'); } catch (e) {}
                                        try {
                                            if (this.tweens) this.tweens.add({ targets: minion, scale: { from: 0.2, to: 0.64 }, ease: 'Back.easeOut', duration: 320 });
                                            else minion.setScale(0.64);
                                        } catch (e) { try { minion.setScale(0.64); } catch (ee) {} }
                                    } else if (this.add) {
                                        minion = this.add.sprite(spawnX, spawnY, null).setDepth((this.player && this.player.depth) ? this.player.depth + 0.25 : 9.5);
                                        try { minion.setTint && minion.setTint(0x5b2b8a); } catch (e) {}
                                        try { minion.setScale(0.36); } catch (e) {}
                                    }
                                } catch (e) { minion = null; }
                                if (!minion) continue;
                                try { if (this.physics && this.physics.add) this.physics.add.existing(minion); } catch (e) {}

                                // configure stats: make minion a proper entity with stats based on the PLAYER
                                try {
                                    // compute player's average damage using equipped weapon and primary stat where possible
                                    let playerAvgDmg = 6;
                                    try {
                                        const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                                        const we = (this.char && this.char.equipment && this.char.equipment.weapon) ? this.char.equipment.weapon : null;
                                        let weaponDef = null;
                                        try { if (we && we.id && itemDefs[we.id]) weaponDef = itemDefs[we.id]; } catch (e) { weaponDef = null; }
                                        let weaponMin = 6, weaponMax = 10;
                                        if (weaponDef && Array.isArray(weaponDef.damage) && weaponDef.damage.length >= 2) {
                                            weaponMin = Number(weaponDef.damage[0]) || weaponMin;
                                            weaponMax = Number(weaponDef.damage[1]) || weaponMax;
                                        }
                                        const avgWeapon = (weaponMin + weaponMax) / 2;
                                        // class primary stat mapping (best-effort): use effective stats computed earlier
                                        const cls = (this.char && this.char.class) ? this.char.class : 'beginner';
                                        const pkey = getPrimaryStatKeyForClass(cls);
                                        const pstat = (eff && typeof eff[pkey] === 'number') ? eff[pkey] : ((eff && eff.str) || 0);
                                        // approximate player damage similar to sharedTryAttack: weapon base + primaryStat*2
                                        playerAvgDmg = Math.max(1, Math.round(avgWeapon + (pstat * 2)));
                                    } catch (e) { playerAvgDmg = 6; }

                                    // set minion hp/damage to 30% of player's hp and damage
                                    const playerHp = Math.max(8, Number((this.char && this.char.maxhp) || 24));
                                    minion.maxhp = Math.max(6, Math.round(playerHp * 0.30));
                                    minion.hp = minion.maxhp;
                                    minion._isAbyssal = true;
                                    minion._owner = this.player;
                                    minion._hitsRemaining = 1 + Math.floor(Math.max(0, rank) / 4);
                                    minion._strikeDmg = Math.max(1, Math.round(playerAvgDmg * 0.30));
                                } catch (e) {
                                    minion.maxhp = 8; minion.hp = 8; minion._strikeDmg = 2; minion._hitsRemaining = 1;
                                }

                                // health bar for minion
                                try {
                                    const hbW = 32; const hbH = 6;
                                    minion.healthBarBg = this.add.rectangle(minion.x, minion.y - 20, hbW, hbH, 0x000000, 0.6).setDepth((minion.depth || 9.5) + 0.01);
                                    minion.healthBar = this.add.rectangle(minion.x - (hbW/2) + (hbW/2), minion.y - 20, hbW, hbH, 0x8b5bff, 1).setOrigin(0, 0.5).setDepth((minion.depth || 9.5) + 0.02);
                                    minion.healthBar.fullWidth = hbW;
                                    if (this.time && this.time.addEvent) {
                                        const updater = this.time.addEvent({ delay: 120, loop: true, callback: () => {
                                            try {
                                                if (!minion || !minion.active) { try { updater.remove(false); } catch (e) {} return; }
                                                const ratio = Math.max(0, Math.min(1, (minion.hp || 0) / Math.max(1, minion.maxhp || 1)));
                                                try { if (minion.healthBarBg) minion.healthBarBg.setPosition(minion.x, minion.y - 20); } catch (e) {}
                                                try { if (minion.healthBar) { minion.healthBar.setPosition(minion.x - (minion.healthBar.fullWidth / 2), minion.y - 20); minion.healthBar.displayWidth = (minion.healthBar.fullWidth || hbW) * ratio; } } catch (e) {}
                                            } catch (e) {}
                                        }});
                                        minion._barUpdater = updater;
                                    }
                                } catch (e) {}

                                // Spawn visuals: shadow, flash, optional particle trail (follow the minion)
                                try {
                                    // shadow under the minion
                                    try {
                                        const sh = this.add.ellipse(minion.x, minion.y + 10, 22, 10, 0x000000, 0.45).setDepth((minion.depth || 9.5) - 0.05);
                                        sh.setScale(1);
                                        minion._spawnShadow = sh;
                                    } catch (e) { minion._spawnShadow = null; }
                                    // flash / burst
                                    try {
                                        const fl = this.add.circle(minion.x, minion.y - 6, 18, 0x9b4bff, 0.92).setDepth((minion.depth || 9.5) + 0.03);
                                        if (fl.setBlendMode) try { fl.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                                        if (this.tweens) this.tweens.add({ targets: fl, scale: { from: 0.6, to: 1.8 }, alpha: { from: 0.95, to: 0 }, duration: 320, ease: 'Cubic.easeOut', onComplete: () => { try { fl.destroy(); } catch (e) {} } });
                                        minion._spawnFlash = fl;
                                    } catch (e) { minion._spawnFlash = null; }
                                    // optional particle emitter if fx texture exists
                                    try {
                                        if (_supportsLegacyParticles(this) && this.add && this.textures && this.textures.exists('fx_void_orb')) {
                                            const pm = this.add.particles('fx_void_orb');
                                            const emitter = pm.createEmitter({ x: minion.x, y: minion.y, speed: { min: 6, max: 28 }, scale: { start: 0.18, end: 0 }, alpha: { start: 0.95, end: 0 }, lifespan: 600, quantity: 1, frequency: 120 });
                                            emitter.startFollow && emitter.startFollow(minion);
                                            minion._spawnEmitter = pm;
                                        } else {
                                            minion._spawnEmitter = null;
                                        }
                                    } catch (e) { minion._spawnEmitter = null; }
                                } catch (e) {}

                                // seeker behavior
                                let seekerTimer = null;
                                const speed = 220;
                                const findNearest = () => {
                                    try {
                                        const list = (this.enemies && this.enemies.getChildren) ? this.enemies.getChildren().filter(e => e && safeGetData(e, 'alive')) : [];
                                        if (!list || !list.length) return null;
                                        list.sort((a,b) => Phaser.Math.Distance.Between(minion.x, minion.y, a.x, a.y) - Phaser.Math.Distance.Between(minion.x, minion.y, b.x, b.y));
                                        return list[0] || null;
                                    } catch (e) { return null; }
                                };
                                try {
                                    if (this.time && this.time.addEvent) {
                                        seekerTimer = this.time.addEvent({ delay: 160, loop: true, callback: () => {
                                            try {
                                                if (!minion || !minion.body || !minion.active) { if (seekerTimer) seekerTimer.remove(false); return; }
                                                const target = findNearest();
                                                if (!target) return;
                                                try {
                                                    if (this.physics && typeof this.physics.moveToObject === 'function') this.physics.moveToObject(minion, target, speed);
                                                    else if (minion.body && typeof minion.body.setVelocity === 'function') {
                                                        const ang = Phaser.Math.Angle.Between(minion.x, minion.y, target.x, target.y);
                                                        minion.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
                                                    }
                                                } catch (e) {}
                                            } catch (e) {}
                                        }});
                                    }
                                } catch (e) { seekerTimer = null; }

                                // overlap & impact
                                try {
                                    if (this.physics && this.enemies && this.enemies.getChildren && typeof this.physics.add.overlap === 'function') {
                                        addPhysicsOverlap(this, minion, this.enemies, (m, targ) => {
                                            try {
                                                if (!m || !targ || !safeGetData(targ, 'alive')) return;
                                                if (m._consuming) return; m._consuming = true;
                                                try { _dealPlayerDamage(this, targ, m._strikeDmg || 1, '#cc99ff'); } catch (e) {}
                                                try { const fx = this.add.circle(targ.x, targ.y, 12, 0xb88bff, 0.28).setDepth((targ.depth || 7) + 0.1); if (this.tweens) this.tweens.add({ targets: fx, alpha: 0, scale: 1.6, duration: 220, onComplete: () => { try { fx.destroy(); } catch (e) {} } }); } catch (e) {}
                                                try { m._hitsRemaining = Math.max(0, (m._hitsRemaining || 0) - 1); } catch (e) {}
                                                // damage minion state handling if you want (e.g., minion hp goes down on collisions)
                                                if (m._hitsRemaining <= 0) {
                                                    try { if (seekerTimer && typeof seekerTimer.remove === 'function') seekerTimer.remove(false); } catch (e) {}
                                                    try { if (m._barUpdater && typeof m._barUpdater.remove === 'function') m._barUpdater.remove(false); } catch (e) {}
                                                    try { if (m.healthBar) m.healthBar.destroy(); } catch (e) {}
                                                    try { if (m.healthBarBg) m.healthBarBg.destroy(); } catch (e) {}
                                                    try { if (m && m._spawnEmitter && typeof m._spawnEmitter.destroy === 'function') m._spawnEmitter.destroy(); } catch (e) {}
                                                    try { if (m && m._spawnFlash && typeof m._spawnFlash.destroy === 'function') m._spawnFlash.destroy(); } catch (e) {}
                                                    try { if (m && m._spawnShadow && typeof m._spawnShadow.destroy === 'function') m._spawnShadow.destroy(); } catch (e) {}
                                                    try { if (m && m.destroy) m.destroy(); } catch (e) {}
                                                } else {
                                                    try { if (targ.body && typeof targ.body.setVelocity === 'function') { const ang = Phaser.Math.Angle.Between(m.x, m.y, targ.x, targ.y); targ.body.setVelocity(Math.cos(ang) * 120, Math.sin(ang) * 120); } } catch (e) {}
                                                }
                                                m._consuming = false;
                                            } catch (e) {}
                                        });
                                    }
                                } catch (e) {}

                                // lifetime cleanup
                                try {
                                    if (this.time && this.time.addEvent) this.time.addEvent({ delay: 8000, callback: () => {
                                        try { if (seekerTimer && typeof seekerTimer.remove === 'function') seekerTimer.remove(false); } catch (e) {}
                                        try { if (minion && minion._barUpdater && typeof minion._barUpdater.remove === 'function') minion._barUpdater.remove(false); } catch (e) {}
                                        try { if (minion && minion.healthBar) minion.healthBar.destroy(); } catch (e) {}
                                        try { if (minion && minion.healthBarBg) minion.healthBarBg.destroy(); } catch (e) {}
                                        try { if (minion && minion._spawnEmitter && typeof minion._spawnEmitter.destroy === 'function') minion._spawnEmitter.destroy(); } catch (e) {}
                                        try { if (minion && minion._spawnFlash && typeof minion._spawnFlash.destroy === 'function') minion._spawnFlash.destroy(); } catch (e) {}
                                        try { if (minion && minion._spawnShadow && typeof minion._spawnShadow.destroy === 'function') minion._spawnShadow.destroy(); } catch (e) {}
                                        try { if (minion && minion.destroy) minion.destroy(); } catch (e) {}
                                    } });
                                } catch (e) {}
                            } catch (e) {}
                        }
                        try { if (this._showToast) this._showToast('Abyssal Conjurer: minor ally summoned', 900); } catch (e) {}
                    } catch (e) {}
                }
            } catch (e) {}
        }
    } catch (e) {}
    // Update quest progress for killing enemies
    if (defId && window && window.__shared_ui && window.__shared_ui.updateQuestProgressAndCheckCompletion) {
        window.__shared_ui.updateQuestProgressAndCheckCompletion(this, 'kill', defId, 1);
    }
    if (this._updateHUD) this._updateHUD();
    if (this._persistCharacter) this._persistCharacter(this.username);
    if (this.time && this.time.addEvent) {
        this.time.addEvent({
            delay: (spawn && spawn.respawn) || 5000,
            callback: () => { if (spawn && !spawn.active && this._spawnEnemy) this._spawnEnemy(spawn); }
        });
    }
    // if we were auto-targeting this enemy, clear the target and indicator
    try { if (this.autoTarget === enemy && this._clearAutoTarget) this._clearAutoTarget(); } catch (e) {}
}

function sharedRollDrops(def) {
    if (!def || !this.char) return;
    const lukStat = ((this.char.stats && this.char.stats.luk) || 0) + ((this.char._equipBonuses && this.char._equipBonuses.luk) || 0);
    const dropsAwarded = [];
    const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};

    if (Array.isArray(def.drops)) {
        def.drops.forEach(drop => {
            if (!drop || !drop.itemId) return;
            const baseChance = drop.baseChance || 0;
            const bonus = (drop.luckBonus || 0) * lukStat;
            // apply talent drop rate (percent points)
            const dropRatePct = Number((tmods['dropRate'] && (tmods['dropRate'].percent || tmods['dropRate'].flat)) || 0);
            const chance = Math.min(0.99, baseChance + bonus + (dropRatePct / 100));
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
        const goldDropRatePct = Number((tmods['goldDropRate'] && (tmods['goldDropRate'].percent || tmods['goldDropRate'].flat)) || 0);
        const chance = Math.min(0.99, baseChance + bonus);
        if (Math.random() <= chance) {
            const min = Math.max(0, Math.floor(def.gold.min || 0));
            const max = Math.max(min, Math.floor(def.gold.max || min));
            goldAwarded = Phaser.Math.Between(min, max);
            // apply gold drop rate talent (percent)
            if (goldAwarded > 0 && goldDropRatePct) {
                goldAwarded = Math.max(0, Math.round(goldAwarded * (1 + (goldDropRatePct / 100))));
            }
            // apply global goldGain talent (e.g., five_finger_discount, camouflage_cache secondScaling)
            try {
                const goldGainPct = Number((tmods['goldGain'] && (tmods['goldGain'].percent || tmods['goldGain'].flat)) || 0);
                if (goldAwarded > 0 && goldGainPct) {
                    goldAwarded = Math.max(0, Math.round(goldAwarded * (1 + (goldGainPct / 100))));
                }
            } catch (e) {}
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
    // Apply characterXpGain modifier from talents
    let finalAmount = amount;
    try {
        const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
        const xpBonus = tmods['characterXpGain'];
        if (xpBonus) {
            const bonusPct = Number(xpBonus.percent || 0);
            const bonusFlat = Number(xpBonus.flat || 0);
            finalAmount = amount * (1 + bonusPct / 100) + bonusFlat;
        }
    } catch (e) {}
    this.char.exp = (this.char.exp || 0) + finalAmount;
    const leveled = checkClassLevelUps(this);
    if (leveled && this._showToast) this._showToast('Level up!', 1800);
}

function sharedShowToast(text, timeout = 1400) {
    if (!text) return;
    try {
        if (window && window.__shared_ui && typeof window.__shared_ui.showToast === 'function') {
            return window.__shared_ui.showToast(this, text, timeout);
        }
    } catch (e) { /* ignore shared ui errors */ }
    if (typeof document === 'undefined') return;
    try {
        // Move to top-center for global toasts
        if (!this._toastContainer) {
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '14px';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            container.style.zIndex = '210';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
            this._toastContainer = container;
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
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(6px)';
            setTimeout(() => {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }, 220);
        }, timeout);
    } catch (e) { /* ignore toast errors */ }
}

function sharedClearToasts() {
    try {
        if (this._toastContainer && this._toastContainer.parentNode) {
            this._toastContainer.parentNode.removeChild(this._toastContainer);
        }
    } catch (e) { /* ignore */ }
    this._toastContainer = null;
}

// Buff HUD: persistent top-center display showing active short-term buffs
function sharedCreateBuffHUD(scene) {
    if (!scene || typeof document === 'undefined') return null;
    try {
        if (!scene._buffContainer) {
            const c = document.createElement('div');
            c.style.position = 'fixed';
            c.style.top = '56px';
            c.style.left = '50%';
            c.style.transform = 'translateX(-50%)';
            c.style.zIndex = '211';
            c.style.pointerEvents = 'none';
            c.style.display = 'flex';
            c.style.gap = '8px';
            document.body.appendChild(c);
            scene._buffContainer = c;
        }
        return scene._buffContainer;
    } catch (e) { return null; }
}

function sharedDestroyBuffHUD(scene) {
    if (!scene) return;
    try {
        if (scene._buffContainer && scene._buffContainer.parentNode) scene._buffContainer.parentNode.removeChild(scene._buffContainer);
    } catch (e) {}
    scene._buffContainer = null;
}

function sharedUpdateBuffHUD(scene) {
    if (!scene || typeof document === 'undefined') return;
    try {
        const container = sharedCreateBuffHUD(scene);
        if (!container) return;
        // collect active buffs from scene.char
        const char = scene.char || {};
        const now = Date.now();
        const buffs = [];
        try {
            if (char._postStealthDodge && char._postStealthDodge.expiresAt && char._postStealthDodge.expiresAt > now) {
                const rem = Math.ceil((char._postStealthDodge.expiresAt - now) / 1000);
                buffs.push({ key: 'Dodge', text: `${Math.round(char._postStealthDodge.percent || 0)}% Dodge`, secs: rem });
            }
            if (char._postStealthHaste && char._postStealthHaste.expiresAt && char._postStealthHaste.expiresAt > now) {
                const rem = Math.ceil((char._postStealthHaste.expiresAt - now) / 1000);
                buffs.push({ key: 'Haste', text: `${Math.round(char._postStealthHaste.percent || 0)}% Haste`, secs: rem });
            }
            if (char._postStealthCritDmgBuff && char._postStealthCritDmgBuff.expiresAt && char._postStealthCritDmgBuff.expiresAt > now) {
                const rem = Math.ceil((char._postStealthCritDmgBuff.expiresAt - now) / 1000);
                buffs.push({ key: 'Crit+', text: `+${Math.round(char._postStealthCritDmgBuff.percent || 0)}% Crit Dmg`, secs: rem });
            }
            if (typeof char._stealthPoints === 'number' && char._stealthPoints > 0) {
                buffs.push({ key: 'StealthPts', text: `${Math.floor(char._stealthPoints)} SP`, secs: null });
            }
        } catch (e) {}

        // rebuild container children
        while (container.firstChild) container.removeChild(container.firstChild);
        buffs.forEach(b => {
            try {
                const el = document.createElement('div');
                el.style.background = 'rgba(8,8,10,0.86)';
                el.style.color = '#fff';
                el.style.padding = '6px 10px';
                el.style.borderRadius = '8px';
                el.style.fontFamily = 'UnifrakturCook, cursive';
                el.style.fontSize = '13px';
                el.style.pointerEvents = 'none';
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.alignItems = 'center';
                const label = document.createElement('div');
                label.textContent = b.text;
                const sub = document.createElement('div');
                sub.style.fontSize = '11px';
                sub.style.opacity = '0.85';
                sub.textContent = (b.secs != null) ? `${b.secs}s` : '';
                el.appendChild(label);
                el.appendChild(sub);
                container.appendChild(el);
            } catch (e) {}
        });
        // hide container if no buffs
        try { container.style.display = (buffs.length > 0) ? 'flex' : 'none'; } catch (e) {}
    } catch (e) {}
}

function sharedShowDamageNumber(x, y, text, color = '#fff') {
    if (!this || !this.add) return;
    const layer = ensureDamageLayer(this);
    if (!layer) return;
    try {
        const label = this.add.text(x, y, text, { fontSize: '18px', color, fontFamily: 'UnifrakturCook, cursive' })
            .setOrigin(0.5)
            .setDepth(6);
        if (layer.add) layer.add(label);
        if (this.tweens && this.tweens.add) {
            this.tweens.add({
                targets: label,
                y: y - 30,
                alpha: 0,
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => { try { label.destroy(); } catch (e) {} }
            });
        } else {
            setTimeout(() => { try { label.destroy(); } catch (e) {} }, 600);
        }
    } catch (e) { /* ignore */ }
}

function sharedCreatePlayerHealthBar() {
    if (!this || !this.add) return;
    this._destroyPlayerHealthBar && this._destroyPlayerHealthBar();
    const cfg = this._playerHpBarConfig || {};
    const width = (cfg.width != null) ? cfg.width : 70;
    const height = (cfg.height != null) ? cfg.height : 8;
    const color = (cfg.color != null) ? cfg.color : 0xff4444;
    const bgColor = (cfg.bgColor != null) ? cfg.bgColor : 0x000000;
    const bgAlpha = (cfg.bgAlpha != null) ? cfg.bgAlpha : 0.55;
    const depth = (cfg.depth != null) ? cfg.depth : 4;
    const offset = (cfg.offsetY != null) ? cfg.offsetY : 60;
    try {
        this.playerHpBarBg = this.add.rectangle(0, 0, width, height, bgColor, bgAlpha).setDepth(depth);
        this.playerHpBar = this.add.rectangle(0, 0, width, height, color).setDepth(depth);
        this.playerHpBar.fullWidth = width;
        this.playerHpBarOffset = offset;
        if (this.playerHpBarBg.setOrigin) this.playerHpBarBg.setOrigin(0.5);
        if (this.playerHpBar.setOrigin) this.playerHpBar.setOrigin(0.5);
        this._updatePlayerHealthBar();
    } catch (e) {
        this.playerHpBarBg = null;
        this.playerHpBar = null;
    }
}

function sharedUpdatePlayerHealthBar() {
    if (!this || !this.player || !this.playerHpBar || !this.playerHpBarBg) return;
    try {
        const ratio = Math.max(0, Math.min(1, (this.char && this.char.hp) ? (this.char.hp / Math.max(1, this.char.maxhp || 1)) : 0));
        const width = this.playerHpBar.fullWidth || 70;
        this.playerHpBar.displayWidth = width * ratio;
        const offset = (this.playerHpBarOffset != null) ? this.playerHpBarOffset : 60;
        const barY = this.player.y - offset;
        this.playerHpBarBg.setPosition(this.player.x, barY);
        this.playerHpBar.setPosition(this.player.x, barY);
    } catch (e) { /* ignore */ }
}

function sharedDestroyPlayerHealthBar() {
    try { if (this.playerHpBar) this.playerHpBar.destroy(); } catch (e) {}
    try { if (this.playerHpBarBg) this.playerHpBarBg.destroy(); } catch (e) {}
    this.playerHpBar = null;
    this.playerHpBarBg = null;
}

function sharedAttachEnemyBars(enemy) {
    if (!enemy || !this || !this.add) return;
    const cfg = this._enemyBarConfig || {};
    const width = (cfg.width != null) ? cfg.width : 50;
    const height = (cfg.height != null) ? cfg.height : 6;
    const offsetY = (cfg.offsetY != null) ? cfg.offsetY : 50;
    const depth = (cfg.depth != null) ? cfg.depth : 3;
    const showName = (cfg.showName !== undefined) ? cfg.showName : true;
    try {
        enemy.healthBarBg = this.add.rectangle(enemy.x, enemy.y - offsetY, width, height, 0x000000, 0.55).setDepth(depth);
        enemy.healthBar = this.add.rectangle(enemy.x, enemy.y - offsetY, width, height, 0xff5555).setDepth(depth);
        enemy.healthBar.fullWidth = width;
        if (enemy.healthBarBg.setOrigin) enemy.healthBarBg.setOrigin(0.5);
        if (enemy.healthBar.setOrigin) enemy.healthBar.setOrigin(0.5);
        this._updateEnemyHealthBar(enemy);
        if (showName) {
            try {
                const defId = safeGetData(enemy, 'defId');
                const def = (defId && this.enemyDefs) ? this.enemyDefs[defId] : null;
                const name = (def && def.name) || defId || 'Enemy';
                let level = 1;
                if (def && typeof def.level === 'number') level = def.level;
                else if (def && def.tier === 'epic') level = 5;
                else if (def && def.tier === 'boss') level = 10;
                const labelOffset = (cfg.nameOffset != null) ? cfg.nameOffset : (offsetY + 14);
                enemy.nameLabel = this.add.text(enemy.x, enemy.y - labelOffset, `${name} | ${level}`, { fontSize: '14px', color: '#ffffff', fontFamily: 'UnifrakturCook, cursive' }).setOrigin(0.5).setDepth(depth);
            } catch (e) {
                enemy.nameLabel = null;
            }
        } else {
            enemy.nameLabel = null;
        }
        // Create a small poison-stack indicator (icon + count) next to the health bar.
        try {
            const px = enemy.x;
            const py = enemy.y - offsetY;
            const halfW = (width || 50) * 0.5;
            // small green circle as icon
            enemy.poisonIcon = this.add.circle(px + halfW + 8, py, 6, 0x66ff66, 0.95).setDepth(depth + 0.1);
            // text showing stack count (or dot)
            enemy.poisonLabel = this.add.text(px + halfW + 18, py, '', { fontSize: '12px', color: '#66ff66', fontFamily: 'UnifrakturCook, cursive' }).setOrigin(0, 0.5).setDepth(depth + 0.1);
            if (enemy.poisonIcon) enemy.poisonIcon.setVisible(false);
            if (enemy.poisonLabel) enemy.poisonLabel.setVisible(false);
        } catch (e) {
            enemy.poisonIcon = null;
            enemy.poisonLabel = null;
        }
        this._updateEnemyBarPosition(enemy);
    } catch (e) { /* ignore */ }
}

function sharedUpdateEnemyHealthBar(enemy) {
    if (!enemy || !enemy.healthBar) return;
    try {
        const hp = Math.max(0, safeGetData(enemy, 'hp', 0));
        const maxhp = Math.max(1, safeGetData(enemy, 'maxhp', 1));
        const ratio = Math.max(0, Math.min(1, hp / maxhp));
        enemy.healthBar.displayWidth = (enemy.healthBar.fullWidth || 50) * ratio;
        // Update poison-stack indicator (visible when enemy has poison or poisonStacks)
        try {
            const stacks = Math.max(0, Number(safeGetData(enemy, 'poisonStacks', 0)));
            const p = safeGetData(enemy, 'poison');
            const hasPoison = !!((p && p.expiresAt && p.expiresAt > Date.now()) || stacks > 0);
            const hbX = (enemy.healthBarBg && typeof enemy.healthBarBg.x === 'number') ? enemy.healthBarBg.x : enemy.x;
            const hbY = (enemy.healthBarBg && typeof enemy.healthBarBg.y === 'number') ? enemy.healthBarBg.y : enemy.y - ((this._enemyBarConfig && this._enemyBarConfig.offsetY) ? this._enemyBarConfig.offsetY : 50);
            const halfW = (enemy.healthBar && enemy.healthBar.fullWidth ? enemy.healthBar.fullWidth : (this._enemyBarConfig && this._enemyBarConfig.width) ? this._enemyBarConfig.width : 50) * 0.5;
            if (enemy.poisonIcon) {
                enemy.poisonIcon.setPosition(hbX + halfW + 8, hbY);
                enemy.poisonIcon.setVisible(hasPoison);
            }
            if (enemy.poisonLabel) {
                if (hasPoison) {
                    enemy.poisonLabel.setText(stacks > 0 ? String(stacks) : '\u2022');
                    enemy.poisonLabel.setPosition(hbX + halfW + 18, hbY);
                    enemy.poisonLabel.setVisible(true);
                } else {
                    enemy.poisonLabel.setVisible(false);
                }
            }
        } catch (e) {}
    } catch (e) { /* ignore */ }
}

function sharedUpdateEnemyBarPosition(enemy) {
    if (!enemy || !enemy.healthBarBg) return;
    const cfg = this._enemyBarConfig || {};
    const offsetY = (cfg.offsetY != null) ? cfg.offsetY : 50;
    const nameOffset = (cfg.nameOffset != null) ? cfg.nameOffset : (offsetY + 14);
    try {
        const y = enemy.y - offsetY;
        enemy.healthBarBg.setPosition(enemy.x, y);
        if (enemy.healthBar) enemy.healthBar.setPosition(enemy.x, y);
        if (enemy.nameLabel) enemy.nameLabel.setPosition(enemy.x, enemy.y - nameOffset);
    } catch (e) { /* ignore */ }
}

function sharedDetachEnemyBars(enemy) {
    if (!enemy) return;
    try { if (enemy.healthBar) enemy.healthBar.destroy(); } catch (e) {}
    try { if (enemy.healthBarBg) enemy.healthBarBg.destroy(); } catch (e) {}
    try { if (enemy.nameLabel) enemy.nameLabel.destroy(); } catch (e) {}
    try { if (enemy.poisonIcon) enemy.poisonIcon.destroy(); } catch (e) {}
    try { if (enemy.poisonLabel) enemy.poisonLabel.destroy(); } catch (e) {}
    enemy.healthBar = null;
    enemy.healthBarBg = null;
    enemy.nameLabel = null;
    enemy.poisonIcon = null;
    enemy.poisonLabel = null;
}

function sharedPersistCharacter(username) {
    const cfg = this._persistConfig || {};
    persistCharacter(this, username, cfg);
}


function sharedGetEnemyInRange(range) {
    if (!this.enemies || !this.enemies.getChildren) return null;
    let limit = (range != null) ? range : (this.attackRange != null ? this.attackRange : 68);
    try {
        const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const we = (this.char && this.char.equipment && this.char.equipment.weapon) ? this.char.equipment.weapon : null;
        const weaponDef = (we && we.id && itemDefs[we.id]) ? itemDefs[we.id] : null;
        if (weaponDef) {
            if (typeof weaponDef.range === 'number') limit = weaponDef.range;
            else if (/staff/i.test(weaponDef.id || '') || /staff/i.test(weaponDef.name || '')) limit = 220;
        }
    } catch (e) {}
    return this.enemies.getChildren().find(enemy => enemy && safeGetData(enemy, 'alive') &&
        pdist(this, enemy.x, enemy.y) <= limit);
}

    // Simple path blockage test: sample points along the line and check for overlap with static obstacles
    function sharedIsPathBlocked(player, target) {
        try {
            if (!player || !target || !this.obstacles || !this.obstacles.getChildren) return false;
            const samples = (this._pathSamplePoints != null) ? this._pathSamplePoints : 6;
            const children = this.obstacles.getChildren();
            for (let i = 1; i <= samples; i++) {
                const t = i / (samples + 1);
                const sx = Phaser.Math.Interpolation.Linear([player.x, target.x], t);
                const sy = Phaser.Math.Interpolation.Linear([player.y, target.y], t);
                for (let j = 0; j < children.length; j++) {
                    const ob = children[j];
                    if (!ob) continue;
                    // approximate obstacle bounds
                    let ow = (ob.displayWidth || ob.width || 16);
                    let oh = (ob.displayHeight || ob.height || 16);
                    try { if (ob.body && ob.body.width) ow = ob.body.width; if (ob.body && ob.body.height) oh = ob.body.height; } catch (e) {}
                    const radius = Math.max(ow, oh) * 0.5 + ((this._pathObstaclePadding != null) ? this._pathObstaclePadding : 6);
                    const d = Phaser.Math.Distance.Between(sx, sy, ob.x, ob.y);
                    if (d <= radius) return true;
                }
            }
        } catch (e) {}
        return false;
    }

    function sharedStartAvoidance(target) {
        if (!target || !this.player) return;
        try {
            this._avoidance = this._avoidance || { active: false, side: 1 };
            // toggle side to try alternate sides on repeated blocks
            this._avoidance.side = (this._avoidance.side === 1) ? -1 : 1;
            const _pc = getPlayerCenter(this);
            const ang = Phaser.Math.Angle.Between(_pc.x, _pc.y, target.x, target.y);
            const perp = ang + (Math.PI / 2) * this._avoidance.side;
            const dist = (this._avoidDistance != null) ? this._avoidDistance : 48;
            const wx = target.x + Math.cos(perp) * dist;
            const wy = target.y + Math.sin(perp) * dist;
            this._avoidance.waypoint = { x: wx, y: wy };
            this._avoidance.expiry = (this.time && this.time.now) ? (this.time.now + ((this._avoidDuration != null) ? this._avoidDuration : 1200)) : (Date.now() + 1200);
            this._avoidance.active = true;
        } catch (e) { /* ignore */ }
    }

    function sharedClearAvoidance() {
        try { if (this._avoidance) { this._avoidance.active = false; this._avoidance.waypoint = null; } } catch (e) {}
    }

    // -------------------- Shared Enemy AI (FSM) ---------------------------------
    function sharedEnemyOnAttack(enemy, target) {
        // Default enemy attack handler; scenes can override by replacing onAttack
        if (!enemy || !target || !this) return;
        try {
            const now = (this.time && this.time.now) ? this.time.now : Date.now();
            const def = (this.enemyDefs) ? this.enemyDefs[safeGetData(enemy, 'defId')] : null;
            const cooldown = (def && def.attackCooldown != null) ? def.attackCooldown : (this.attackCooldown != null ? this.attackCooldown : 1200);
            const next = safeGetData(enemy, 'nextAttack', 0);
            if (this.time && this.time.now < next) return; // still on cooldown
            safeSetData(enemy, 'nextAttack', now + cooldown);

            const minD = (def && def.damage && def.damage[0]) ? def.damage[0] : 1;
            const maxD = (def && def.damage && def.damage[1]) ? def.damage[1] : 4;
            const raw = Phaser.Math.Between(minD, maxD);
            const effStats = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                ? window.__shared_ui.stats.effectiveStats(this.char)
                : { defense: 0 };
            const playerDefense = (effStats && effStats.defense) || 0;
            let mitigated = Math.max(1, raw - Math.floor(playerDefense / 2));
            // Apply talent-based damage reduction (flat then percent) if present
            try {
                const tmods = (this && this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
                const dr = tmods['damageReduction'] || null;
                if (dr) {
                    const flat = Number(dr.flat || 0);
                    const pct = Number(dr.percent || 0);
                    if (flat) mitigated = Math.max(0, mitigated - flat);
                    if (pct) mitigated = Math.max(0, Math.round(mitigated * (1 - (pct / 100))));
                    mitigated = Math.max(1, mitigated);
                }
            } catch (e) {}
            try {
                // If Shadowstep stealth is active, block incoming damage entirely while stealth lasts
                try {
                    const nowTs = Date.now();
                    if (this.char && this.char._shadowstep && this.char._shadowstep.stealth && this.char._shadowstep.expiresAt && this.char._shadowstep.expiresAt > nowTs) {
                        // fully block damage
                        mitigated = 0;
                    } else {
                        // Post-stealth dodge buff (evasive_flourish) — chance to avoid incoming attacks for a short duration
                        try {
                            if (this.char && this.char._postStealthDodge && this.char._postStealthDodge.expiresAt && this.char._postStealthDodge.expiresAt > nowTs) {
                                const pct = Number(this.char._postStealthDodge.percent || 0);
                                if (pct > 0 && (Math.random() * 100) < pct) {
                                    mitigated = 0;
                                    try { const _pc = getPlayerCenter(this); if (this._showDamageNumber) this._showDamageNumber(_pc.x, _pc.y - 28, `Miss`, '#66ffcc'); } catch (e) {}
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
                try {
                    // record combat timestamp (player was damaged)
                    try { this._lastCombatAt = Date.now(); } catch (e) {}
                    let incoming = mitigated;
                    // Mana Shield (passive): absorbs damage from a mana-derived shield first
                    try {
                        const ms = (this.char && this.char._manaShield) ? this.char._manaShield : null;
                        if (ms && typeof ms.current === 'number' && ms.current > 0) {
                            const used = Math.min(ms.current, incoming);
                            ms.current = Math.max(0, ms.current - used);
                            incoming = Math.max(0, incoming - used);
                        }
                    } catch (e) {}
                    // Dark Shield (burst-on-low-hp): consumes next
                    try {
                        const ds = (this.char && this.char._darkShield) ? this.char._darkShield : null;
                        if (ds && typeof ds.remaining === 'number' && ds.remaining > 0) {
                            const used = Math.min(ds.remaining, incoming);
                            ds.remaining = Math.max(0, ds.remaining - used);
                            incoming = Math.max(0, incoming - used);
                        }
                    } catch (e) {}
                    this.char.hp = Math.max(0, (this.char.hp || this.char.maxhp) - incoming);
                } catch (e) { this.char.hp = Math.max(0, (this.char.hp || this.char.maxhp) - mitigated); }
            } catch (e) {}
            try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
            try { if (this._updatePlayerHealthBar) this._updatePlayerHealthBar(); } catch (e) {}
            try { if (mitigated > 0 && this._showDamageNumber) this._showDamageNumber(target.x, target.y - 28, `-${mitigated}`, '#ff5555'); } catch (e) {}
            // Dark Shield: when player drops below threshold, grant a temporary shield that scales with max mana
            try {
                const tmods_pre = (this && this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
                const magicShieldPct = Math.max(0, Number((tmods_pre['magicShield'] && (tmods_pre['magicShield'].percent || tmods_pre['magicShield'].flat)) || 0));
                try {
                    const hpNow = Number(this.char && this.char.hp || 0);
                    const maxHp = Math.max(1, Number(this.char && this.char.maxhp || 1));
                    const shouldTrigger = (magicShieldPct > 0 && hpNow > 0 && hpNow <= Math.max(1, Math.round(maxHp * 0.35)));
                    if (shouldTrigger) {
                        try {
                            if (!this.char._darkShield || !(this.char._darkShield && this.char._darkShield.remaining > 0)) {
                                const shieldAmount = Math.max(1, Math.round((Number(this.char.maxmana || 0) * (magicShieldPct / 100))));
                                this.char._darkShield = { remaining: shieldAmount, expiresAt: Date.now() + 6000 };
                                try { if (this._showToast) this._showToast('Dark Shield activated!', 900); } catch (e) {}
                                try { const _pc = getPlayerCenter(this); spawnArcaneShield && spawnArcaneShield(this, _pc.x, _pc.y, 28, 0x552266); } catch (e) {}
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            } catch (e) {}

            // Terror Aura: if player has terror_aura talents, melee attackers that hit the player take a DOT
            try {
                const tmods = (this && this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
                const auraPct = Number((tmods['terrorAuraDamage'] && (tmods['terrorAuraDamage'].percent || tmods['terrorAuraDamage'].flat)) || 0);
                const auraEnabled = !!(this && this.char && this.char._terrorAuraEnabled);
                if (auraPct > 0 && auraEnabled) {
                    try {
                        const auraRadius = 96;
                        const d = pdist(this, enemy.x, enemy.y);
                        if (d <= auraRadius) {
                            const durationMs = 3000;
                            const tickMs = 1000;
                            const maxhp = Math.max(1, safeGetData(enemy, 'maxhp', 10));
                            const total = maxhp * (auraPct / 100);
                            const ticks = Math.max(1, Math.floor(durationMs / tickMs));
                            const perTick = total / ticks;
                            const now = Date.now();
                            let prev = null;
                            try { prev = safeGetData(enemy, 'terror'); } catch (ee) { prev = null; }
                            if (prev && prev.expiresAt && prev.expiresAt > now) {
                                const remaining = Math.max(0, prev.expiresAt - now);
                                const newPerTick = (prev.amountPerTick || 0) + perTick;
                                const newExpiry = now + Math.max(remaining, durationMs);
                                const terror = { amountPerTick: newPerTick, tickMs: tickMs, expiresAt: newExpiry, nextTick: prev.nextTick || (now + tickMs) };
                                safeSetData(enemy, 'terror', terror);
                            } else {
                                const terror = { amountPerTick: perTick, tickMs: tickMs, expiresAt: now + durationMs, nextTick: now + tickMs };
                                safeSetData(enemy, 'terror', terror);
                            }
                            try { spawnShockwave(this, enemy.x, enemy.y, 18, 0xff88aa, (enemy.depth || 7) + 0.2); } catch (ee) {}
                        }
                    } catch (e) {}
                }
            } catch (e) {}
            if (this.char.hp <= 0 && this._onPlayerDown) this._onPlayerDown();
        } catch (e) { /* swallow */ }
    }

    function sharedUpdateEnemiesAI() {
        // Lightweight FSM run per-scene; preserves prior scene behavior but upgrades to WANDER->CHASE->ATTACK
        if (!this.enemies || !this.player || !this.time) return;
        const now = this.time.now;
        const cfg = this._enemyAIConfig || {};
        // defaults
        const defaults = {
            detectionRadius: cfg.detectionRadius != null ? cfg.detectionRadius : 220,
            fovDegrees: cfg.fovDegrees != null ? cfg.fovDegrees : 150,
            lostSightGraceMs: cfg.lostSightGraceMs != null ? cfg.lostSightGraceMs : 800,
            attackWindupMs: cfg.attackWindupMs != null ? cfg.attackWindupMs : 180,
            attackRecoveryMs: cfg.attackRecoveryMs != null ? cfg.attackRecoveryMs : 260,
            attackBuffer: cfg.attackBuffer != null ? cfg.attackBuffer : 6,
            separationRadius: cfg.separationRadius != null ? cfg.separationRadius : 18,
            separationForce: cfg.separationForce != null ? cfg.separationForce : 0.6,
            patrolIdleMin: cfg.patrolIdleMin != null ? cfg.patrolIdleMin : 300,
            patrolIdleMax: cfg.patrolIdleMax != null ? cfg.patrolIdleMax : 1400,
            debug: !!cfg.debug
        };

        // reuse a single graphics object for debug draws
        if (defaults.debug && !this._enemyAIDebugGraphics && this.add && this.add.graphics) {
            this._enemyAIDebugGraphics = this.add.graphics();
            this._enemyAIDebugGraphics.setDepth(9.5);
        }
        if (this._enemyAIDebugGraphics) this._enemyAIDebugGraphics.clear();

        // iterate enemies
        const children = this.enemies.getChildren ? this.enemies.getChildren() : [];
        for (let i = 0; i < children.length; i++) {
            const enemy = children[i];
            if (!enemy || !safeGetData(enemy, 'alive')) continue;
            // Respect stun flag: if enemy has a stun that hasn't expired, keep it immobilized and skip AI
            try {
                const stun = safeGetData(enemy, 'stun');
                if (stun && stun.expiresAt) {
                    const nowTs = Date.now();
                    if (stun.expiresAt > nowTs) {
                        try { if (enemy.setVelocity) enemy.setVelocity(0,0); else if (enemy.body && enemy.body.setVelocity) enemy.body.setVelocity(0,0); } catch (e) {}
                        // update healthbar position if needed and continue (do not run AI)
                        try { if (this._updateEnemyBarPosition) this._updateEnemyBarPosition(enemy); } catch (e) {}
                        continue;
                    } else {
                        safeSetData(enemy, 'stun', null);
                    }
                }
            } catch (e) {}
            // Track Shadowstep stealth state; while stealthed, enemies should wander as if the player is unseen
            let _playerStealthed = false;
            try {
                const nowTs = Date.now();
                if (this && this.char && this.char._shadowstep && this.char._shadowstep.stealth && this.char._shadowstep.expiresAt && this.char._shadowstep.expiresAt > nowTs) {
                    _playerStealthed = true;
                    // ensure AI bag and prefer WANDER state
                    if (!enemy._ai) enemy._ai = { state: 'WANDER' };
                    const wasChasing = enemy._ai.state === 'CHASE' || enemy._ai.state === 'ATTACK';
                    if (enemy._ai.state !== 'WANDER') {
                        enemy._ai.state = 'WANDER';
                        enemy._ai.busyUntil = 0;
                    }
                    // Avoid per-tick "nextMove" push-outs; only adjust if missing, stale, or absurdly far
                    try {
                        const baseNow = (typeof now !== 'undefined') ? now : nowTs;
                        const nm = enemy._ai.nextMove || 0;
                        // If they were chasing/attacking, force a near-term wander pick so they don't idle-freeze
                        if (wasChasing) {
                            const jitter = (Phaser && Phaser.Math && Phaser.Math.Between) ? Phaser.Math.Between(60, 180) : 120;
                            enemy._ai.nextMove = baseNow + jitter;
                            enemy._ai.waypoint = null;
                        } else if (!nm || nm < baseNow || (nm - baseNow) > 2000) {
                            const jitter = (Phaser && Phaser.Math && Phaser.Math.Between) ? Phaser.Math.Between(120, 360) : 240;
                            enemy._ai.nextMove = baseNow + jitter;
                        }
                    } catch (e) {}
                    // do NOT clear waypoint or zero velocity; let WANDER logic handle movement
                    try { if (this._updateEnemyBarPosition) this._updateEnemyBarPosition(enemy); } catch (e) {}
                }
            } catch (e) {}
            const def = this.enemyDefs[safeGetData(enemy, 'defId')] || { moveSpeed: 50, attackRange: 36, damage: [1,4], attackCooldown: 1200 };
            // ensure ai bag
            let ai = enemy._ai;
            if (!ai) { ai = { state: 'WANDER', waypoint: null, nextMove: now + Phaser.Math.Between(200, 1200), lostSightUntil: 0, busyUntil: 0 }; enemy._ai = ai; }

            // distances & vectors
            const _pc = getPlayerCenter(this);
            const dx = _pc.x - enemy.x; const dy = _pc.y - enemy.y;
            const distToPlayer = Math.sqrt(dx*dx + dy*dy);

            // debug draw
            if (defaults.debug && this._enemyAIDebugGraphics) {
                try { this._enemyAIDebugGraphics.lineStyle(1, 0x66ff88, 0.15); this._enemyAIDebugGraphics.strokeCircle(enemy.x, enemy.y, defaults.detectionRadius); } catch (e) {}
                try { this._enemyAIDebugGraphics.fillStyle(0xffff00, 0.06); this._enemyAIDebugGraphics.fillCircle(enemy.x, enemy.y, def.attackRange || 36); } catch (e) {}
                try { this._enemyAIDebugGraphics.fillStyle(0xffffff, 0.001); this._enemyAIDebugGraphics.fillCircle(enemy.x, enemy.y, 2); } catch (e) {}
            }

            // compute facing vector (use current velocity if present, otherwise fallback)
            let fvx = 0, fvy = 1;
            try { if (enemy.body && enemy.body.velocity) { fvx = enemy.body.velocity.x; fvy = enemy.body.velocity.y; const clen = Math.sqrt(fvx*fvx + fvy*fvy); if (clen > 0.01) { fvx /= clen; fvy /= clen; } else { fvx = 0; fvy = 1; } } } catch (e) {}

            // detection check: within radius, within FOV, and LOS clear
            let canSee = false;
            try {
                if (!_playerStealthed) {
                    const detection = (def.detectionRadius != null) ? def.detectionRadius : defaults.detectionRadius;
                    if (distToPlayer <= detection) {
                        // angle between facing and to-player
                        const topx = dx / (distToPlayer || 1); const topy = dy / (distToPlayer || 1);
                        const dot = (fvx * topx) + (fvy * topy);
                        const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
                        if (angleDeg <= ((def.fovDegrees != null) ? def.fovDegrees : defaults.fovDegrees)) {
                            // LOS
                            const blocked = (this._isPathBlocked && this._isPathBlocked(enemy, this.player));
                            if (!blocked) canSee = true;
                        }
                    }
                } else {
                    canSee = false; // force unseen while stealthed
                }
            } catch (e) { canSee = false; }

            // state transitions
            if (ai.state !== 'ATTACK' && canSee) {
                ai.state = 'CHASE';
                ai.lostSightUntil = now + ((def.lostSightGraceMs != null) ? def.lostSightGraceMs : defaults.lostSightGraceMs);
            }

            if (ai.state === 'CHASE') {
                // if LOS lost, allow grace
                if (!canSee) {
                    if (now > ai.lostSightUntil) { ai.state = 'WANDER'; ai.waypoint = null; }
                } else {
                    // approach player with hysteresis: stop at stopDistance
                    const attackRange = (def.attackRange != null) ? def.attackRange : (this.attackRange != null ? this.attackRange : 36);
                    const stopDistance = Math.max(4, attackRange - ((def.attackBuffer != null) ? def.attackBuffer : defaults.attackBuffer));
                    if (distToPlayer <= attackRange) {
                        ai.state = 'ATTACK'; ai.busyUntil = now + ((def.attackWindupMs != null) ? def.attackWindupMs : defaults.attackWindupMs);
                        // halt movement
                        try { enemy.setVelocity(0,0); } catch (e) {}
                    } else {
                        // steer toward player
                        const spd = Math.max(10, (def.moveSpeed || 50));
                        const ang = Math.atan2(dy, dx);
                        const vx = Math.cos(ang) * spd; const vy = Math.sin(ang) * spd;
                        // separation force from nearby enemies
                        let sepX = 0, sepY = 0;
                        try {
                            for (let j = 0; j < children.length; j++) {
                                if (j === i) continue;
                                const other = children[j];
                                if (!other || !safeGetData(other, 'alive')) continue;
                                const odx = enemy.x - other.x; const ody = enemy.y - other.y;
                                const dd = Math.sqrt(odx*odx + ody*ody);
                                if (dd > 0 && dd < ((def.separationRadius != null) ? def.separationRadius : defaults.separationRadius)) {
                                    const inv = 1 - (dd / ((def.separationRadius != null) ? def.separationRadius : defaults.separationRadius));
                                    sepX += (odx / dd) * inv; sepY += (ody / dd) * inv;
                                }
                            }
                        } catch (e) {}
                        if (sepX || sepY) {
                            const sforce = ((def.separationForce != null) ? def.separationForce : defaults.separationForce);
                            enemy.setVelocity(vx + sepX * sforce * spd, vy + sepY * sforce * spd);
                        } else {
                            try { enemy.setVelocity(vx, vy); } catch (e) {}
                        }
                    }
                }
            } else if (ai.state === 'ATTACK') {
                // wait for windup then perform onAttack, then recovery
                if (now >= ai.busyUntil) {
                    // perform actual attack only if LOS remains
                    const blocked = (this._isPathBlocked && this._isPathBlocked(enemy, this.player));
                    if (!blocked && safeGetData(enemy, 'alive')) {
                        try { if (this.onAttack) this.onAttack.call(this, enemy, this.player); } catch (e) {}
                    }
                    // set recovery
                    ai.state = 'CHASE';
                    ai.lostSightUntil = now + ((def.lostSightGraceMs != null) ? def.lostSightGraceMs : defaults.lostSightGraceMs);
                    // apply recovery pause
                    ai.busyUntil = now + ((def.attackRecoveryMs != null) ? def.attackRecoveryMs : defaults.attackRecoveryMs);
                } else {
                    // stationary during windup
                    try { enemy.setVelocity(0,0); } catch (e) {}
                }
            } else { // WANDER
                // if recently saw player and chase, fallback handled above
                const nextMove = ai.nextMove || 0;
                if (ai.waypoint && ai.waypoint.x != null) {
                    const wx = ai.waypoint.x; const wy = ai.waypoint.y;
                    const ddx = wx - enemy.x; const ddy = wy - enemy.y; const dlen = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
                    // arrive: slow down as we approach
                    const patrolRadius = (def.patrolRadius != null) ? def.patrolRadius : 120;
                    const desiredSpeed = Math.max(20, (def.moveSpeed || 50) * Math.min(1, dlen / patrolRadius));
                    const ang = Math.atan2(ddy, ddx);
                    try { enemy.setVelocity(Math.cos(ang) * desiredSpeed, Math.sin(ang) * desiredSpeed); } catch (e) {}
                    if (dlen < 8) {
                        ai.waypoint = null; ai.nextMove = now + Phaser.Math.Between(defaults.patrolIdleMin, defaults.patrolIdleMax);
                        try { enemy.setVelocity(0,0); } catch (e) {}
                    }
                } else {
                    if (now >= nextMove) {
                        // pick new waypoint inside spawn/patrol radius or bounds
                        const spawn = safeGetData(enemy, 'spawn');
                        let cx = (spawn && spawn.x != null) ? spawn.x : enemy.x;
                        let cy = (spawn && spawn.y != null) ? spawn.y : enemy.y;
                        const pr = (def.patrolRadius != null) ? def.patrolRadius : 120;
                        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        const r = Phaser.Math.Between(Math.max(8, Math.floor(pr*0.25)), pr);
                        const wx = cx + Math.cos(ang) * r; const wy = cy + Math.sin(ang) * r;
                        ai.waypoint = { x: Phaser.Math.Clamp(wx, (this._bounds && this._bounds.x1) ? this._bounds.x1 : -9999, (this._bounds && this._bounds.x2) ? this._bounds.x2 : 9999,
                                                        ), y: Phaser.Math.Clamp(wy, (this._bounds && this._bounds.y1) ? this._bounds.y1 : -9999, (this._bounds && this._bounds.y2) ? this._bounds.y2 : 9999) };
                        ai.nextMove = now + Phaser.Math.Between(defaults.patrolIdleMin, defaults.patrolIdleMax);
                    } else {
                        // idle
                        try { enemy.setVelocity(0,0); } catch (e) {}
                    }
                }
            }

            // ensure bounds
            try { if (this._constrainEnemyToBounds) this._constrainEnemyToBounds(enemy); } catch (e) {}
            // update healthbar
            try { if (this._updateEnemyBarPosition) this._updateEnemyBarPosition(enemy); } catch (e) {}
        }
    }

function sharedFindNearestEnemy() {
    if (!this.enemies || !this.enemies.getChildren || !this.player) return null;
    const children = this.enemies.getChildren();
    let best = null; let bestDist = Infinity;
    for (let i = 0; i < children.length; i++) {
        const e = children[i];
        if (!e || !safeGetData(e, 'alive')) continue;
    const d = pdist(this, e.x, e.y);
        if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
}

function sharedSetAutoTarget(enemy) {
    if (!enemy) return;
    this.autoTarget = enemy;
    // create or reuse indicator
    try {
        // create a pulsing additive glow behind the enemy (larger than the sprite)
        if (this.add) {
            // remove existing indicator if present
            try { if (this.autoTargetIndicator && this.autoTargetIndicator.destroy) { if (this.autoTargetIndicator._pulseTween) { try{ this.autoTargetIndicator._pulseTween.stop(); }catch(e){} } this.autoTargetIndicator.destroy(); } } catch (e) {}

            const color = (this._targetIndicatorColor != null) ? this._targetIndicatorColor : 0xff66aa;
            const scroll = (this._targetIndicatorScroll != null) ? this._targetIndicatorScroll : 0;
            // radius: based on enemy display size
            const ew = Math.max(1, (enemy.displayWidth || enemy.width || 32));
            const eh = Math.max(1, (enemy.displayHeight || enemy.height || 32));
            const radius = Math.max(ew, eh) * 0.7 + ((this._targetIndicatorOffset != null) ? this._targetIndicatorOffset * 0.0 : 0);
            const depth = (this._targetIndicatorDepth != null) ? this._targetIndicatorDepth : (enemy.depth ? Math.max(0, enemy.depth - 0.01) : 1.6);
            const alpha = 0.45;
            try {
                this.autoTargetIndicator = this.add.circle(enemy.x, enemy.y, radius, color, alpha).setDepth(depth).setScrollFactor(scroll);
                if (this.autoTargetIndicator.setBlendMode) this.autoTargetIndicator.setBlendMode(Phaser.BlendModes.ADD);
                // gentle pulsing
                if (this.tweens && this.tweens.add) {
                    try {
                        this.autoTargetIndicator._pulseTween = this.tweens.add({ targets: this.autoTargetIndicator, scale: { from: 0.92, to: 1.08 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    } catch (e) {}
                }
            } catch (e) {}
        }
    } catch (e) {}
}

function sharedClearAutoTarget() {
    this.autoTarget = null;
    try {
        if (this.autoTargetIndicator) {
            try { if (this.autoTargetIndicator._pulseTween) this.autoTargetIndicator._pulseTween.stop(); } catch (ee) {}
            try { if (this.autoTargetIndicator.destroy) this.autoTargetIndicator.destroy(); } catch (ee) {}
        }
    } catch (e) {}
    this.autoTargetIndicator = null;
}

export const combatMixin = {
    _tryAttack: sharedTryAttack,
    _handleEnemyDeath: sharedHandleEnemyDeath,
    _rollDrops: sharedRollDrops,
    _addItemToInventory: sharedAddItemToInventory,
    _gainExperience: sharedGainExperience,
    _showToast: sharedShowToast,
    _clearToasts: sharedClearToasts,
    _showDamageNumber: sharedShowDamageNumber,
    _createPlayerHealthBar: sharedCreatePlayerHealthBar,
    _updatePlayerHealthBar: sharedUpdatePlayerHealthBar,
    _destroyPlayerHealthBar: sharedDestroyPlayerHealthBar,
    _attachEnemyBars: sharedAttachEnemyBars,
    _updateEnemyHealthBar: sharedUpdateEnemyHealthBar,
    _updateEnemyBarPosition: sharedUpdateEnemyBarPosition,
    _detachEnemyBars: sharedDetachEnemyBars,
    _persistCharacter: sharedPersistCharacter,
    _getEnemyInRange: sharedGetEnemyInRange,
    _findNearestEnemy: sharedFindNearestEnemy,
    _setAutoTarget: sharedSetAutoTarget,
    _clearAutoTarget: sharedClearAutoTarget,
    _isPathBlocked: sharedIsPathBlocked,
    _startAvoidance: sharedStartAvoidance,
    _clearAvoidance: sharedClearAvoidance
    ,
    // New enemy AI FSM integration (shared, opt-in by scenes via existing _updateEnemiesAI wrapper)
    onAttack: sharedEnemyOnAttack,
    _updateEnemiesAI_shared: sharedUpdateEnemiesAI
};

export function applyCombatMixin(target) {
    if (!target) return;
    Object.assign(target, combatMixin);
    try {
        // When mixin is applied to a scene prototype, wrap its create/shutdown so we register talent handlers on the instance
        const originalCreate = target.create;
        target.create = function wrappedCreate() {
            try {
                if (typeof originalCreate === 'function') originalCreate.apply(this, arguments);
            } catch (err) {
                try {
                    const key = (this && this.scene && this.scene.key) || '<unknown>';
                    if (typeof console !== 'undefined' && console.error) console.error('[applyCombatMixin] create failed for scene', key, err);
                } catch (logErr) { /* ignore logging failure */ }
                throw err;
            }
            try { registerTalentHandlers && registerTalentHandlers(this); } catch (err) {
                try {
                    const key = (this && this.scene && this.scene.key) || '<unknown>';
                    if (typeof console !== 'undefined' && console.error) console.error('[applyCombatMixin] registerTalentHandlers failed for scene', key, err);
                } catch (logErr) { /* ignore logging failure */ }
            }
        };
        const originalShutdown = target.shutdown;
        target.shutdown = function wrappedShutdown() {
            try { unregisterTalentHandlers && unregisterTalentHandlers(this); } catch (err) {
                try {
                    const key = (this && this.scene && this.scene.key) || '<unknown>';
                    if (typeof console !== 'undefined' && console.error) console.error('[applyCombatMixin] unregisterTalentHandlers failed for scene', key, err);
                } catch (logErr) { /* ignore logging failure */ }
            }
            try {
                if (typeof originalShutdown === 'function') originalShutdown.apply(this, arguments);
            } catch (err) {
                try {
                    const key = (this && this.scene && this.scene.key) || '<unknown>';
                    if (typeof console !== 'undefined' && console.error) console.error('[applyCombatMixin] shutdown failed for scene', key, err);
                } catch (logErr) { /* ignore logging failure */ }
                throw err;
            }
        };
    } catch (e) { /* ignore */ }
}

export function initAutoCombat(scene, opts = {}) {
    // AutoCombat/advanced auto features have been temporarily removed from the project.
    // Keep this function as a safe no-op so existing scenes that call `initAutoCombat`
    // won't attempt to create keys, indicators, or attach complex behavior.
    if (!scene) return null;
    try {
        // ensure auto flags are off and no toggle key is present
        scene.autoAttack = false;
        if (scene.autoToggleKey && scene.autoToggleKey.destroy) {
            try { scene.autoToggleKey.destroy(); } catch (e) {}
        }
        scene.autoToggleKey = null;
        // remove any existing indicators/target markers to be safe
        try { if (scene.autoIndicator && scene.autoIndicator.destroy) scene.autoIndicator.destroy(); } catch (e) {}
        scene.autoIndicator = null;
        try { if (scene.autoTargetIndicator && scene.autoTargetIndicator.destroy) scene.autoTargetIndicator.destroy(); } catch (e) {}
        scene.autoTargetIndicator = null;
    } catch (e) {}
    return null;
}

export function teardownAutoCombat(scene) {
    if (!scene) return;
    if (scene.autoIndicator && scene.autoIndicator.destroy) {
        scene.autoIndicator.destroy();
    }
    scene.autoIndicator = null;
    scene.autoToggleKey = null;
}

// --- Talent activation handlers -------------------------------------------------
function _getTalentRank(char, talentId) {
    try {
        if (!char || !talentId) return 0;
        ensureCharTalents && ensureCharTalents(char);
        const allocsByTab = char.talents && char.talents.allocations ? char.talents.allocations : {};
        for (const tabId of Object.keys(allocsByTab)) {
            const allocs = allocsByTab[tabId];
            if (allocs && typeof allocs[talentId] !== 'undefined') return allocs[talentId] || 0;
        }
    } catch (e) { /* ignore */ }
    return 0;
}

function _applyDamageToEnemy(scene, enemy, amount, color) {
    try {
        if (!enemy) return;
        // optional params: color, showPopup (boolean) and labelText (string)
        const showPopup = (arguments.length >= 5) ? Boolean(arguments[4]) : true;
        const labelText = (arguments.length >= 6) ? arguments[5] : null;
        const hp = Math.max(0, (safeGetData(enemy, 'hp') || 0) - amount);
        safeSetData(enemy, 'hp', hp);
        if (showPopup) {
            if (scene && scene._showDamageNumber) scene._showDamageNumber(enemy.x, enemy.y - 42, (labelText != null) ? labelText : `-${Math.round(amount)}`, color || '#ffcc66');
        }
        if (scene && scene._updateEnemyHealthBar) scene._updateEnemyHealthBar(enemy);
        if (hp <= 0 && scene && scene._handleEnemyDeath) scene._handleEnemyDeath(enemy);
    } catch (e) {}
}

// Apply player-sourced damage: handle crits and lifesteal using effectiveStats, then apply damage.
function _dealPlayerDamage(scene, enemy, baseAmount, color, opts) {
    try {
        if (!scene || !scene.char || !enemy) return baseAmount;
        // read effective stats (uses shared UI helper when available)
        const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
            ? window.__shared_ui.stats.effectiveStats(scene.char)
            : {};
        const isSpell = !!(opts && opts.isSpell);
        let final = Number(baseAmount || 0);
        // crit roll — allow forced crits (from talents like Shadowstep)
        const critChance = Math.max(0, Math.min(100, Number(eff.critChance || 0)));
            // include transient ricochet/marksman bonuses to crit chance
            let transientCritBonus = 0;
            try { transientCritBonus = Number((scene && scene.char && scene.char._ricochetCritBonus) || 0); } catch (e) { transientCritBonus = 0; }
            try { const mf = (scene && scene.char && scene.char._marksmanFocusBonuses) ? Number(scene.char._marksmanFocusBonuses.critChance || 0) : 0; transientCritBonus += mf; } catch (e) {}
            // Astral Acuity: spell crit bonus
            let spellCritBonus = 0;
            try { const tmodsEarly = (scene && scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {}; spellCritBonus = isSpell ? Math.max(0, Number((tmodsEarly['spellCritChance'] && (tmodsEarly['spellCritChance'].percent || tmodsEarly['spellCritChance'].flat)) || 0)) : 0; } catch (e) { spellCritBonus = 0; }
            let critRoll = (Math.random() * 100) < (critChance + transientCritBonus + spellCritBonus);
        try {
            if (scene && scene.char && scene.char._forceNextCrit) {
                critRoll = true;
                try { delete scene.char._forceNextCrit; } catch (e) { scene.char._forceNextCrit = false; }
            }
        } catch (e) {}
        if (critRoll) {
            let critPct = Math.max(100, Number(eff.critDmgPercent || 150));
            try {
                const cb = (scene && scene.char && scene.char._postStealthCritDmgBuff) ? scene.char._postStealthCritDmgBuff : null;
                if (cb && cb.expiresAt && cb.expiresAt > Date.now()) {
                    critPct = critPct + Number(cb.percent || 0);
                }
            } catch (e) {}
            // include marksman focus crit damage bonus if present
            try { const mf = (scene && scene.char && scene.char._marksmanFocusBonuses) ? Number(scene.char._marksmanFocusBonuses.critDmg || 0) : 0; if (mf) critPct = critPct + mf; } catch (e) {}
            final = final * (critPct / 100);
        }
        // Ambush: if this damage was initiated while player was stealthed, apply ambush bonus
        try {
            const now = Date.now();
            const wasStealthed = !!(scene && scene.char && scene.char._shadowstep && scene.char._shadowstep.stealth && scene.char._shadowstep.expiresAt && scene.char._shadowstep.expiresAt > now);
            if (wasStealthed) {
                const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                const ambushMod = tmods['stealthAttackDamage'] || null;
                const critBuffMod = tmods['stealthCritDmg'] || null;
                const extraPct = Number((ambushMod && (ambushMod.percent || ambushMod.flat)) || 0);
                if (extraPct > 0) {
                    final = final * (1 + (extraPct / 100));
                }
                const critBuffPct = Math.max(0, Number((critBuffMod && (critBuffMod.percent || critBuffMod.flat)) || 0));
                if (critBuffPct > 0) {
                    try { scene.char._postStealthCritDmgBuff = { percent: critBuffPct, expiresAt: now + 4000 }; } catch (e) {}
                    try { if (scene.time && typeof scene.time.addEvent === 'function') scene.time.addEvent({ delay: 4000, callback: () => { try { if (scene && scene.char) scene.char._postStealthCritDmgBuff = null; } catch (e) {} } }); } catch (e) {}
                }
                try { if (scene._showToast) scene._showToast('Ambush!', 700); } catch (e) {}
                // (Silent Steps consumption moved to apply-time so crits consume points regardless of whether the hit began from stealth)
            }
        } catch (e) {}
        // Silent Steps: consume stealth points on critical strikes (consume in groups of 10 to grant extra crit damage)
        try {
            if (critRoll && scene && scene.char && Number(scene.char._stealthPoints || 0) > 0) {
                let silentDef = null; let silentRank = 0;
                try { const found = getTalentDefById && getTalentDefById('silent_steps'); if (found) { silentDef = found.def; } } catch (e) { silentDef = null; }
                try { silentRank = _getTalentRank && _getTalentRank(scene.char, 'silent_steps') ? _getTalentRank(scene.char, 'silent_steps') : 0; } catch (e) { silentRank = 0; }
                let perGroupPct = 0;
                try {
                    if (silentDef && silentDef.scaling) {
                        const s = silentDef.scaling || {}; const base = Number(s.base || 0); const per = Number(s.perRank || 0);
                        perGroupPct = base + per * Math.max(0, (silentRank - 1));
                    }
                } catch (e) { perGroupPct = 0; }
                if (perGroupPct > 0) {
                    try {
                        const pts = Math.max(0, Math.floor(Number(scene.char._stealthPoints || 0)));
                        const groups = Math.floor(pts / 10);
                        if (pts > 0 && groups >= 0) {
                            // consume all points; extra (non-multiple) points are discarded
                            const usedPoints = pts;
                            const extraPctTotal = groups * perGroupPct;
                            if (extraPctTotal > 0) final = final * (1 + (extraPctTotal / 100));
                            scene.char._stealthPoints = 0;
                            try { if (scene._showToast) scene._showToast(`Consumed ${usedPoints} Stealth Points (+${extraPctTotal}% crit dmg)`, 800); } catch (e) {}
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}

        // apply damage to enemy and show combined crit label when applicable
        try {
            const labelText = critRoll ? `-${Math.round(final)} CRIT` : null;
            // Hunter's Formula: if target is poisoned, increase damage by poisonTargetBonus
            try {
                const poisonTargetBonus = Math.max(0, Number((tmods['poisonTargetBonus'] && (tmods['poisonTargetBonus'].percent || tmods['poisonTargetBonus'].flat)) || 0));
                let targetHasPoison = false;
                try {
                    const p = safeGetData(enemy, 'poison');
                    const stacks = Number(safeGetData(enemy, 'poisonStacks') || 0);
                    if ((p && p.expiresAt && p.expiresAt > Date.now()) || stacks > 0) targetHasPoison = true;
                } catch (e) { targetHasPoison = false; }
                if (poisonTargetBonus > 0 && targetHasPoison) {
                    final = final * (1 + (poisonTargetBonus / 100));
                    try { if (scene._showToast) scene._showToast("Hunter's Formula: bonus vs poisoned target", 600); } catch (e) {}
                }
            } catch (e) {}
            // Staff / spell damage modifiers (Wood Lover): apply after crits and other multipliers
            try {
                const tmodsLate = (scene && scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                if (isSpell) {
                    const staffMods = tmodsLate['staffDamage'] || null;
                    if (staffMods) {
                        const flat = Number(staffMods.flat || 0);
                        const pct = Number(staffMods.percent || 0);
                        if (flat) final = Number(final) + flat;
                        if (pct) final = final * (1 + (pct / 100));
                    }
                }
                _applyDamageToEnemy(scene, enemy, final, critRoll ? '#ffef66' : color, true, labelText);
            } catch (e) { _applyDamageToEnemy(scene, enemy, final, critRoll ? '#ffef66' : color, true, labelText); }
            try {
                // mark last combat time when player deals damage
                if (scene) scene._lastCombatAt = Date.now();
            } catch (e) {}
        } catch (e) {}
        // Planar Echo: duplicate spells occasionally
        try {
            if (isSpell) {
                const tmodsDup = (scene && scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                const dupPct = Math.max(0, Number((tmodsDup['spellDuplicate'] && (tmodsDup['spellDuplicate'].percent || tmodsDup['spellDuplicate'].flat)) || 0));
                if (dupPct > 0 && (Math.random() * 100) < dupPct) {
                    try {
                        if (scene && scene.time && typeof scene.time.addEvent === 'function') {
                            scene.time.addEvent({ delay: 110, callback: () => { try { _applyDamageToEnemy(scene, enemy, Math.max(1, Math.round(final * 0.9)), '#ccddff'); } catch (e) {} } });
                        } else {
                            _applyDamageToEnemy(scene, enemy, Math.max(1, Math.round(final * 0.9)), '#ccddff');
                        }
                        try { if (scene && scene._showToast) scene._showToast('Planar Echo!', 700); } catch (e) {}
                    } catch (e) {}
                }
            }
        } catch (e) {}
        // lifesteal: heal player by percentage of final damage dealt.
        // Support crit-only lifesteal via talent 'critLifesteal' if present.
        const lsPct = Math.max(0, Number(eff.lifestealPercent || 0));
        const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
        const critLsPct = Math.max(0, Number((tmods['critLifesteal'] && (tmods['critLifesteal'].percent || tmods['critLifesteal'].flat)) || 0));
        // If crit-only lifesteal exists, only apply it on crits. Otherwise, apply generic lifesteal when present.
        const applyPct = (critRoll && critLsPct > 0) ? critLsPct : lsPct;
        if (applyPct > 0 && scene.char) {
            try {
                const heal = Math.max(0, Math.round(final * (applyPct / 100)));
                if (heal > 0) {
                    scene.char.hp = Math.min((scene.char.maxhp || scene.char.hp || 1), (Number(scene.char.hp || 0) + heal));
                    // show green heal number above player
                    try { if (scene._showDamageNumber) scene._showDamageNumber(scene.player.x, scene.player.y - 36, `+${heal}`, '#66ff88'); } catch (e) {}
                    try { if (scene._updatePlayerHealthBar) scene._updatePlayerHealthBar(); } catch (e) {}
                }
            } catch (e) {}
        }

            // Crit mana refund (Rune Overflow), Shadow Mosaic extra-hit, and Bleed application from talents
            try {
                const tmodsLocal = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                // Rune Overflow: on crit, refund a portion of damage as mana
                try {
                    const critManaPct = Math.max(0, Number((tmodsLocal['critManaRefund'] && (tmodsLocal['critManaRefund'].percent || tmodsLocal['critManaRefund'].flat)) || 0));
                    if (critRoll && critManaPct > 0 && scene && scene.char) {
                        try {
                            const manaGain = Math.max(0, Math.round(final * (critManaPct / 100)));
                            scene.char.mana = Math.min(Number(scene.char.maxmana || scene.char.mana || 0), Number(scene.char.mana || 0) + manaGain);
                            try { if (scene._showDamageNumber) scene._showDamageNumber(scene.player.x, scene.player.y - 36, `+${manaGain}M`, '#66bbff'); } catch (e) {}
                            try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {}
                        } catch (e) {}
                    }
                } catch (e) {}
                // Shadow Mosaic: chance to apply an extra (weaker) hit
                try {
                    const shadowChance = Math.max(0, Number((tmodsLocal['shadowDamage'] && (tmodsLocal['shadowDamage'].percent || tmodsLocal['shadowDamage'].flat)) || 0));
                    if (shadowChance > 0 && Math.random() * 100 < shadowChance) {
                        try {
                            if (scene && scene.time && typeof scene.time.addEvent === 'function') {
                                scene.time.addEvent({ delay: 110, callback: () => {
                                    try { _applyDamageToEnemy(scene, enemy, Math.max(1, Math.round(final * 0.6)), '#ccddff'); } catch (e) {}
                                    try { if (scene._showToast) scene._showToast('Shadow Mosaic!', 700); } catch (e) {}
                                } });
                            } else {
                                _applyDamageToEnemy(scene, enemy, Math.max(1, Math.round(final * 0.6)), '#ccddff');
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            } catch (e) {}

            // Bleed application from talents: roll chance and attach/augment DOT on enemy
        try {
            if (scene && scene.char && enemy && safeGetData(enemy, 'alive')) {
                const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                const bleedChance = Number((tmods['bleedChance'] && (tmods['bleedChance'].percent || tmods['bleedChance'].flat)) || 0);
                if (bleedChance > 0 && (Math.random() * 100) < bleedChance) {
                    const bleedDamagePct = Number((tmods['bleedDamagePercent'] && (tmods['bleedDamagePercent'].percent || tmods['bleedDamagePercent'].flat)) || 20);
                    // apply bleed over 5 seconds, tick every 1s
                    const durationMs = 5000;
                    const tickMs = 1000;
                    const totalBleed = Math.max(0, Number(final || 0) * (bleedDamagePct / 100));
                    const ticks = Math.max(1, Math.floor(durationMs / tickMs));
                    const perTick = Math.max(0, totalBleed / ticks);
                    const now = Date.now();
                    try {
                        // merge with existing bleed if present
                        let prev = null;
                        try { prev = safeGetData(enemy, 'bleed'); } catch (e) { prev = null; }
                        if (prev && prev.expiresAt && prev.expiresAt > now) {
                            // extend and add stack
                            const remaining = Math.max(0, prev.expiresAt - now);
                            // average perTick for simplicity (additive)
                            const newPerTick = (prev.amountPerTick || 0) + perTick;
                            const newExpiry = now + Math.max(remaining, durationMs);
                            const bleed = { amountPerTick: newPerTick, tickMs: tickMs, expiresAt: newExpiry, nextTick: prev.nextTick || (now + tickMs) };
                            safeSetData(enemy, 'bleed', bleed);
                        } else {
                            const bleed = { amountPerTick: perTick, tickMs: tickMs, expiresAt: now + durationMs, nextTick: now + tickMs };
                            safeSetData(enemy, 'bleed', bleed);
                        }
                        // small visual on apply
                        try { const c = scene.add.circle(enemy.x, enemy.y, 10, 0xff4444, 0.22).setDepth((enemy.depth || 7) + 0.2); if (scene.tweens) scene.tweens.add({ targets: c, alpha: 0, scale: 1.4, duration: 420, onComplete: () => { try { c.destroy(); } catch(e){} } }); } catch(e){}
                    } catch (e) {}
                }
            }
        } catch (e) {}
        // Poison Weapons: on any hit, add a poison stack (stacks up to 5)
        try {
            if (scene && scene.char && enemy && safeGetData(enemy, 'alive')) {
                const tmodsLocal = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                const poisonPct = Math.max(0, Number((tmodsLocal['poisonDamage'] && (tmodsLocal['poisonDamage'].percent || tmodsLocal['poisonDamage'].flat)) || 0));
                if (poisonPct > 0) {
                    try {
                        const stacks = Math.max(0, Number(safeGetData(enemy, 'poisonStacks') || 0));
                        if (stacks < 5) {
                            try { safeSetData(enemy, 'poisonStacks', stacks + 1); } catch (e) {}
                            // apply a poison DOT scaled from the hit damage and the talent's percent
                            const poisonTotal = Math.max(1, Math.round(final * (poisonPct / 100)));
                            _applyPoisonDot(scene, enemy, poisonTotal, 4000);
                            try { if (scene._showToast) scene._showToast('Poison stack applied', 400); } catch (e) {}
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}

        // Razor Feathers: on critical strikes, apply an additional DoT based on critDoT scaling
        try {
            if (critRoll && scene && scene.char && enemy && safeGetData(enemy, 'alive')) {
                const tmodsLocal = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                const critDoTPct = Math.max(0, Number((tmodsLocal['critDoT'] && (tmodsLocal['critDoT'].percent || tmodsLocal['critDoT'].flat)) || 0));
                if (critDoTPct > 0) {
                    try {
                        const dotTotal = Math.max(1, Math.round(final * (critDoTPct / 100)));
                        // reuse poison DOT helper for simplicity (green effect)
                        _applyPoisonDot(scene, enemy, dotTotal, 4000);
                        try { if (scene._showToast) scene._showToast('Razor Feathers: additional DoT!', 600); } catch (e) {}
                    } catch (e) {}
                }
            }
        } catch (e) {}
        // If Shadowstep stealth is active, end stealth on first player-sourced damage (consume)
        try {
            if (scene && scene.char && scene.char._shadowstep && scene.char._shadowstep.stealth) {
                try {
                    // apply post-stealth effects (e.g., evasive_flourish) before clearing stealth
                    try { applyPostStealthEffects && applyPostStealthEffects(scene); } catch (e) {}
                    if (scene.player && typeof scene.player.setAlpha === 'function') scene.player.setAlpha(1);
                } catch (e) {}
                try { scene.char._shadowstep = null; } catch (e) {}
                try { scene.char._shadowstepDR = null; } catch (e) {}
                // Disable hellscape effect when stealth is broken early
                try { disableHellscape(scene); } catch (e) {}
                try { clearHellEmbers(scene); } catch (e) {}
                try { if (scene._showToast) scene._showToast('Stealth broken by attack', 700); } catch (e) {}
            }
        } catch (e) {}
        // Toxic Precision: on critical hits, chance to apply extra Poison stacks/dot
        try {
            if (critRoll && scene && scene.char && enemy && safeGetData(enemy, 'alive')) {
                const tmodsLocal = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                const chance = Math.max(0, Number((tmodsLocal['poisonApplyChance'] && (tmodsLocal['poisonApplyChance'].percent || tmodsLocal['poisonApplyChance'].flat)) || 0));
                if (chance > 0 && (Math.random() * 100) < chance) {
                    // compute base poison damage as a portion of dealt final damage
                    const basePct = 0.4; // 40% of hit as poison over time
                    let poisonDamageTotal = Math.max(0, final * basePct);
                    // amplify by poisonDamage talent if present
                    const poisonDmgPct = Math.max(0, Number((tmodsLocal['poisonDamage'] && (tmodsLocal['poisonDamage'].percent || tmodsLocal['poisonDamage'].flat)) || 0));
                    if (poisonDmgPct > 0) poisonDamageTotal = poisonDamageTotal * (1 + (poisonDmgPct / 100));
                    _applyPoisonDot(scene, enemy, Math.max(1, Math.round(poisonDamageTotal)), 4000);
                    try { if (scene._showToast) scene._showToast('Toxic Precision: Poison applied!', 700); } catch (e) {}
                }
            }
        } catch (e) {}
        return final;
    } catch (e) { return baseAmount; }
}

// Helper: apply a short poison DOT to an enemy
function _applyPoisonDot(scene, enemy, totalDamage, durationMs = 4000) {
    try {
        if (!scene || !enemy) return;
        const tickMs = 1000;
        const ticks = Math.max(1, Math.floor(durationMs / tickMs));
        const perTick = totalDamage / ticks;
        const now = Date.now();
        let prev = null;
        try { prev = safeGetData(enemy, 'poison'); } catch (e) { prev = null; }
        if (prev && prev.expiresAt && prev.expiresAt > now) {
            const remaining = Math.max(0, prev.expiresAt - now);
            const newPerTick = (prev.amountPerTick || 0) + perTick;
            const newExpiry = now + Math.max(remaining, durationMs);
            const poison = { amountPerTick: newPerTick, tickMs: tickMs, expiresAt: newExpiry, nextTick: prev.nextTick || (now + tickMs) };
            safeSetData(enemy, 'poison', poison);
        } else {
            const poison = { amountPerTick: perTick, tickMs: tickMs, expiresAt: now + durationMs, nextTick: now + tickMs };
            safeSetData(enemy, 'poison', poison);
        }
        try { const p = scene.add.circle(enemy.x, enemy.y, 6, 0x66ff66, 0.18).setDepth((enemy.depth || 7) + 0.2); if (scene.tweens) scene.tweens.add({ targets: p, alpha: 0, scale: 1.2, duration: 260, onComplete: () => { try { p.destroy(); } catch (e) {} } }); } catch (e) {}
    } catch (e) {}
}

// Helper: recreate directional animations from a given spritesheet key but keep the
// same animation keys used by the rest of the code (e.g., 'walk_up', 'mine_left', 'idle_down').
function recreateDirectionalAnimsFromSheet(scene, sheetKey, baseName, frameRate, repeat, singleFrameForIdle = false) {
    if (!scene || !scene.anims || !scene.textures) return;
    try {
        // Some sheets use a different row ordering (notably some mine/slash sheets).
        // Allow per-sheet overrides here so directional rows map to the correct facing.
        const SHEET_DIR_ORDERS = {
            // common default is ['up','left','down','right']
            'dude_mine': ['down','left','up','right'], // older slash sheet uses down on row0
            'dude_mine_terror': ['down','left','up','right']
        };
        const defaultDirs = ['up','left','down','right'];
        const tex = scene.textures.get(sheetKey);
        let frameNames = [];
        if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
        const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
        const rows = 4;
        const framesPerRow = totalFrames > 0 ? Math.floor(totalFrames / rows) : 0;
        const dirs = SHEET_DIR_ORDERS[sheetKey] || defaultDirs;
        if (framesPerRow > 0) {
            for (let r = 0; r < rows; r++) {
                const dir = dirs[r] || defaultDirs[r];
                const start = r * framesPerRow;
                const end = start + framesPerRow - 1;
                const key = baseName + '_' + dir;
                try { if (scene.anims.exists(key)) scene.anims.remove(key); } catch (e) {}
                try {
                    if (singleFrameForIdle) {
                        scene.anims.create({ key: key, frames: scene.anims.generateFrameNumbers(sheetKey, { start: start, end: start }), frameRate: frameRate, repeat: repeat });
                    } else {
                        scene.anims.create({ key: key, frames: scene.anims.generateFrameNumbers(sheetKey, { start: start, end: end }), frameRate: frameRate, repeat: repeat });
                    }
                } catch (e) { /* ignore per-dir */ }
            }
            return;
        }
        // fallback non-directional
        const fallbackKey = baseName;
        try { if (scene.anims.exists(fallbackKey)) scene.anims.remove(fallbackKey); } catch (e) {}
        try {
            const frames = scene.anims.generateFrameNumbers(sheetKey);
            if (frames && frames.length) scene.anims.create({ key: fallbackKey, frames: frames, frameRate: frameRate, repeat: repeat });
        } catch (e) {}
    } catch (e) {}
}

// Switch global player animations and player texture to/from terror variant.
function switchPlayerTerrorAnims(scene, enable) {
    if (!scene) return;
    try {
        const useSuffix = enable ? '_terror' : '';
        // recreate directional animations using the appropriate sheets
        try { recreateDirectionalAnimsFromSheet(scene, 'dude_walk' + useSuffix, 'walk', 8, -1, false); } catch (e) {}
        try { recreateDirectionalAnimsFromSheet(scene, 'dude_run' + useSuffix, 'run', 12, -1, false); } catch (e) {}
        try { recreateDirectionalAnimsFromSheet(scene, 'dude_idle' + useSuffix, 'idle', 4, -1, true); } catch (e) {}
        // For the mine/slash animation, terror uses a 128px sheet; create placeholders for directional mine_* keys
        try { recreateDirectionalAnimsFromSheet(scene, 'dude_mine' + useSuffix, 'mine', 8, 0, false); } catch (e) {}

        // swap player's texture so immediate frame matches new animations
        try {
            if (scene.player && typeof scene.player.setTexture === 'function') {
                const texKey = enable ? 'dude_idle_terror' : 'dude_idle';
                try { scene.player.setTexture(texKey); } catch (e) { /* ignore */ }
                // recompute body size similar to createPlayer to avoid large hurtboxes
                try {
                    const pw = Math.round(scene.player.displayWidth || (scene.player.width || 32));
                    const ph = Math.round(scene.player.displayHeight || (scene.player.height || 48));
                    const bw = Math.max(12, Math.round(pw * 0.44));
                    const bh = Math.max(14, Math.round(ph * 0.55));
                    const offsetX = Math.max(0, Math.round((pw - bw) / 2));
                    const offsetY = Math.max(0, Math.round(ph - bh - Math.max(2, Math.round(ph * 0.06))));
                    if (scene.player.body && typeof scene.player.body.setSize === 'function') scene.player.body.setSize(bw, bh);
                    if (scene.player.body && typeof scene.player.body.setOffset === 'function') scene.player.body.setOffset(offsetX, offsetY);
                } catch (e) {}
            }
        } catch (e) {}

        // optional indicator on scene to allow other systems to read state
        try { if (!scene.char) scene.char = {}; scene.char._terrorFormEnabled = !!enable; } catch (e) {}
        try { if (scene._showToast) scene._showToast(enable ? 'Terror Form active' : 'Terror Form normal', 900); } catch (e) {}
    } catch (e) {}
}

function _talentActivatedHandler(payload) {
    try {
        const scene = this;
        if (!payload || !scene || !scene.char) return;
        try {
            const dbg = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent);
            if (dbg) console.debug('[talentActivated] received', { payload: payload, cooldowns: (scene.char && scene.char.talents && scene.char.talents.cooldowns) ? scene.char.talents.cooldowns : null, now: Date.now() });
        } catch (e) {}
        const tid = payload.talentId;
        const found = getTalentDefById ? getTalentDefById(tid) : null;
        const def = (found && found.def) ? found.def : (payload.def || null);
        const tabId = (found && found.tabId) ? found.tabId : payload.tabId || null;
        const rank = _getTalentRank(scene.char, tid) || 0;
        const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(scene.char) : {};

        if (!scene._talentActivationState || scene._talentActivationState.id !== tid) {
            scene._talentActivationState = { id: tid, success: false };
        } else {
            scene._talentActivationState.success = false;
        }

        // Match computeTalentModifiers formula: effective value at rank R = base + per * (R - 1)
        const scaledValue = (def && def.scaling) ? (() => {
            try {
                const s = def.scaling; const r = Math.max(0, Number(rank || 0));
                const base = Number(s.base || 0); const per = Number(s.perRank || 0);
                return base + per * Math.max(0, (r - 1));
            } catch (e) { return 0; }
        })() : 0;

        switch (tid) {
            case 'bonecrusher_training': {
                const radius = 96;
                const baseWeapon = Math.max(6, 10 + ((eff && eff.str) || 0) * 2);
                const dmgPercent = scaledValue || 120;
                const dmg = baseWeapon * (dmgPercent / 100);
                const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren() : [];
                const nowTs = Date.now();
                enemies.forEach(e => { if (e && safeGetData(e, 'alive')) {
                    try {
                        const d = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, e.x, e.y);
                        if (d <= radius) {
                            _dealPlayerDamage(scene, e, dmg, '#ffb3b3');
                            // apply a solid 3 second stun to the enemy
                            try {
                                const stun = { expiresAt: nowTs + 3000 };
                                safeSetData(e, 'stun', stun);
                                // immediately halt movement
                                try { if (e.body && typeof e.body.setVelocity === 'function') e.body.setVelocity(0, 0); else if (typeof e.setVelocity === 'function') e.setVelocity(0,0); } catch (ee) {}
                                // small visual to indicate stun
                                try { const p = scene.add.rectangle(e.x, e.y, 28, 8, 0xffff66, 0.18).setDepth((e.depth || 7) + 0.2); if (scene.tweens) scene.tweens.add({ targets: p, alpha: 0, y: e.y - 12, duration: 600, delay: 240, onComplete: () => { try { p.destroy(); } catch (e) {} } }); } catch (ee) {}
                            } catch (ee) {}
                        }
                    } catch (err) {}
                }});
                try { spawnShockwave(scene, scene.player.x, scene.player.y, radius, 0xffa366, 8); } catch (e) {}
                try { spawnDustBursts(scene, scene.player.x, scene.player.y, radius); } catch (e) {}
                try { if (scene.cameras && scene.cameras.main && scene.cameras.main.shake) scene.cameras.main.shake(200, 0.012); } catch (e) {}
                try { if (scene._showToast) scene._showToast('Bonecrusher Smash!', 800); } catch (e) {}
                markActivationSuccess(scene, tid);
                break;
            }
            case 'rupture_form': {
                const shred = scaledValue || 20;
                const durationMs = 6000;
                const enemy = scene._getEnemyInRange ? scene._getEnemyInRange() : null;
                if (enemy && safeGetData(enemy, 'alive')) {
                    try {
                        const now = Date.now();
                        safeSetData(enemy, 'armorShredPercent', shred);
                        safeSetData(enemy, 'armorShredExpiry', now + durationMs);
                        if (scene._showToast) scene._showToast(`Applied Rupture (${shred}% armor shred)`, 1200);
                        try { highlightEnemy(scene, enemy, { color: 0xff334d, duration: durationMs }); } catch (e) {}
                        markActivationSuccess(scene, tid);
                    } catch (e) {}
                } else {
                    try { if (scene._showToast) scene._showToast('No target'); } catch (e) {}
                }
                break;
            }
            case 'ghastly_drive': {
                try {
                    const dashDist = 160;
                    // Prefer player's movement direction (velocity) when dashing, fallback to facing or pointer
                    let ang = 0;
                    try {
                        const body = scene.player && scene.player.body;
                        if (body && body.velocity && (Math.abs(body.velocity.x) > 0.5 || Math.abs(body.velocity.y) > 0.5)) {
                            ang = Math.atan2(body.velocity.y, body.velocity.x);
                        } else if (scene._facing) {
                            const fmap = { left: Math.PI, right: 0, up: -Math.PI/2, down: Math.PI/2 };
                            ang = fmap[scene._facing] || 0;
                        } else if (scene.input && scene.input.activePointer) {
                            ang = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.input.activePointer.worldX, scene.input.activePointer.worldY);
                        } else if (scene.player && typeof scene.player.rotation === 'number') {
                            ang = scene.player.rotation;
                        }
                    } catch (e) { ang = 0; }
                    const startX = scene.player.x;
                    const startY = scene.player.y;
                    const targetX = startX + Math.cos(ang) * dashDist;
                    const targetY = startY + Math.sin(ang) * dashDist;
                    if (scene.player && scene.player.body && typeof scene.player.body.reset === 'function') {
                        scene.player.body.reset(targetX, targetY);
                        try { scene.player.setVelocity(0, 0); } catch (e) {}
                    } else if (scene.tweens && scene.player) {
                        scene.tweens.add({ targets: scene.player, x: targetX, y: targetY, ease: 'Cubic.easeOut', duration: 180 });
                    } else { scene.player.x = targetX; scene.player.y = targetY; }
                    try { spawnDashTrail(scene, startX, startY, targetX, targetY, 0xff6677); } catch (e) {}
                    const dmgPercent = scaledValue || 40;
                    const baseWeapon = Math.max(6, 10 + ((eff && eff.str) || 0) * 2);
                    const dmg = baseWeapon * (dmgPercent / 100);
                    const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren() : [];
                    // Compute distance from enemy to dash segment (player -> target) using projection onto segment
                    try {
                        const ax = startX; const ay = startY; const bx = targetX; const by = targetY;
                        const vx = bx - ax; const vy = by - ay;
                        const vlen2 = (vx * vx + vy * vy) || 1;
                        enemies.forEach(e => {
                            try {
                                if (!e || !safeGetData(e, 'alive')) return;
                                const px = e.x; const py = e.y;
                                // projection t of P onto AB
                                const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / vlen2));
                                const cx = ax + vx * t; const cy = ay + vy * t;
                                const dx = px - cx; const dy = py - cy;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist <= 28) _dealPlayerDamage(scene, e, dmg, '#ffdddd');
                            } catch (ee) {}
                        });
                    } catch (e) {}
                    try { if (scene._showToast) scene._showToast('Ghastly Drive!', 700); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'blood_ritual_reserve': {
                try {
                    // Channel: drain small amounts of MANA over time to restore HP (talent definition updated by user)
                    // Assumptions: scaledValue (if present) treated as percent of max MANA drained per tick; otherwise default ~6% per tick.
                    const durationMs = (scaledValue && Number(scaledValue) > 0) ? Math.max(800, Math.round(Number(scaledValue) * 1000)) : (4000 + (Number(rank || 0) * 300));
                    const tickMs = 800;
                    const ticks = Math.max(1, Math.floor(durationMs / tickMs));
                    const maxmana = Math.max(1, (scene.char && scene.char.maxmana) ? Number(scene.char.maxmana) : 100);
                    const drainPctPerTick = (scaledValue && Number(scaledValue) > 0 && Number(scaledValue) <= 100) ? Number(scaledValue) : 6;
                    const manaDrainPerTick = Math.max(1, Math.round(maxmana * (drainPctPerTick / 100)));
                    const healthGainPerTick = Math.max(1, Math.round(manaDrainPerTick * 0.9));

                    const startX = (scene.player && typeof scene.player.x === 'number') ? scene.player.x : 0;
                    const startY = (scene.player && typeof scene.player.y === 'number') ? scene.player.y : 0;

                    // track active channel so other systems may cancel if needed
                    try { scene.char._bloodRitualReserve = { active: true, startedAt: Date.now(), ticks: ticks }; } catch (e) {}

                    let tickCount = 0;
                    let shieldFx = null;
                    try { shieldFx = spawnArcaneShield && spawnArcaneShield(scene, scene.player.x, scene.player.y, 28, 0x5b1466); } catch (e) { shieldFx = null; }

                    // channel progress bar visuals
                    let channelBarBg = null; let channelBarFG = null;
                    const barWidth = 68; const barHeight = 8; const barOffset = 44;
                    try {
                        if (scene && scene.add) {
                            channelBarBg = scene.add.rectangle(scene.player.x, scene.player.y - barOffset, barWidth, barHeight, 0x000000, 0.55).setDepth(11);
                            channelBarFG = scene.add.rectangle(scene.player.x - (barWidth * 0.5), scene.player.y - barOffset, 2, barHeight, 0x9b4bff, 0.95).setOrigin(0, 0.5).setDepth(11.1);
                        }
                    } catch (e) { channelBarBg = null; channelBarFG = null; }

                    let channelTimer = null;
                    try {
                        if (scene.time && scene.time.addEvent) {
                            channelTimer = scene.time.addEvent({ delay: tickMs, loop: true, callback: () => {
                                try {
                                    tickCount++;
                                    // cancel if player moved or died
                                    try {
                                        if (!scene || !scene.player || !scene.char) { if (channelTimer) channelTimer.remove(false); cleanup(); return; }
                                        const moved = Phaser.Math.Distance.Between(startX, startY, scene.player.x, scene.player.y) > 8;
                                        if (moved) { if (channelTimer) channelTimer.remove(false); cleanup(); return; }
                                        if (Number(scene.char.hp || 0) <= 0) { if (channelTimer) channelTimer.remove(false); cleanup(); return; }
                                    } catch (e) {}

                                    // compute available mana to drain
                                    try {
                                        const available = Math.max(0, Math.floor(Number(scene.char.mana || 0)));
                                        const drain = Math.min(manaDrainPerTick, available);
                                        if (drain <= 0) { if (channelTimer) channelTimer.remove(false); cleanup(); return; }
                                        scene.char.mana = Math.max(0, Number(scene.char.mana || 0) - drain);
                                        scene.char.hp = Math.min(Number(scene.char.maxhp || scene.char.hp || 1), Number(scene.char.hp || 0) + healthGainPerTick);
                                    } catch (e) {}

                                    try { if (scene._updatePlayerHealthBar) scene._updatePlayerHealthBar(); } catch (e) {}
                                    try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {}

                                    // tick visual
                                    try {
                                        const p = scene.add.circle(scene.player.x, scene.player.y - 22, 10, 0x66bbff, 0.18).setDepth(9.5);
                                        if (scene.tweens) scene.tweens.add({ targets: p, y: scene.player.y - 48, alpha: 0, scale: 1.2, duration: 520, onComplete: () => { try { p.destroy(); } catch (e) {} } });
                                    } catch (e) {}

                                    // update channel bar progress & position
                                    try {
                                        if (channelBarBg) channelBarBg.setPosition(scene.player.x, scene.player.y - barOffset);
                                        if (channelBarFG) {
                                            const progress = Math.max(0, Math.min(1, (tickCount / Math.max(1, ticks))));
                                            channelBarFG.setPosition(scene.player.x - (barWidth * 0.5), scene.player.y - barOffset);
                                            channelBarFG.displayWidth = Math.max(2, Math.round(barWidth * progress));
                                        }
                                    } catch (e) {}

                                    if (tickCount >= ticks) { if (channelTimer) channelTimer.remove(false); cleanup(); return; }
                                } catch (e) {}
                            } });
                        } else {
                            // fallback: simple immediate application if timers unavailable
                            for (let i = 0; i < ticks; i++) {
                                try {
                                    const available = Math.max(0, Math.floor(Number(scene.char.mana || 0)));
                                    const drain = Math.min(manaDrainPerTick, available);
                                    if (drain <= 0) break;
                                    scene.char.mana = Math.max(0, Number(scene.char.mana || 0) - drain);
                                    scene.char.hp = Math.min(Number(scene.char.maxhp || scene.char.hp || 1), Number(scene.char.hp || 0) + healthGainPerTick);
                                } catch (e) {}
                            }
                            cleanup();
                        }
                    } catch (e) {}

                    function cleanup() {
                        try { if (scene && scene.char) scene.char._bloodRitualReserve = null; } catch (e) {}
                        try { if (shieldFx && typeof shieldFx.destroy === 'function') shieldFx.destroy(); } catch (e) {}
                        try { if (channelTimer && typeof channelTimer.remove === 'function') channelTimer.remove(false); } catch (e) {}
                        try { if (channelBarFG && channelBarFG.destroy) channelBarFG.destroy(); } catch (e) {}
                        try { if (channelBarBg && channelBarBg.destroy) channelBarBg.destroy(); } catch (e) {}
                    }

                    try { if (scene._showToast) scene._showToast('Blood Ritual: channeling', 900); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'void_path': {
                try {
                    // Void Path: leave damaging void zones along the player's path for a short duration
                    const durationMs = Math.max(2400, 3000 + (Number(rank || 0) * 200));
                    // placeInterval: how frequently we stamp a void zone along the path.
                    // Lower values make the path denser; clamp to a safe minimum of 40ms to avoid extreme churn.
                    const placeInterval = Math.max(40, 220 - (Number(rank || 0) * 8)); // min 40ms
                    // cap concurrent zones to prevent explosion of objects (safety guard)
                    const maxZones = 48;
                    const zoneLifetime = Math.max(800, 1200); // how long each zone lasts
                    const baseSpell = Math.max(6, ((eff && eff.int) || 0) * 2 + 6);
                    const dmgPercent = scaledValue || 60;
                    const dmg = Math.max(1, Math.round(baseSpell * (dmgPercent / 100)));
                    // make path radius scale with rank so higher ranks produce a larger void path
                    const zoneRadius = Math.max(18, 22 + (Number(rank || 0) * 3));
                    const zoneDepth = (scene.player && typeof scene.player.depth === 'number') ? scene.player.depth + 0.15 : 8.5;

                    const zones = [];
                    let placer = null;

                    const spawnZoneAtPlayer = () => {
                        try {
                            if (!scene || !scene.player) return;
                            const zx = scene.player.x; const zy = scene.player.y;
                            try { ensureVoidZoneAssets && ensureVoidZoneAssets(scene); } catch (e) {}
                            let z = null;
                            if (scene.textures && scene.textures.exists && scene.textures.exists('fx_void_zone')) {
                                try {
                                    z = scene.add.image(zx, zy, 'fx_void_zone').setDepth(zoneDepth);
                                    if (z.setBlendMode) try { z.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                                    z.setOrigin(0.5, 0.5);
                                    z.setScale((zoneRadius * 2) / 64);
                                } catch (e) { z = null; }
                            }
                            if (!z) {
                                try { z = scene.add.circle(zx, zy, zoneRadius, 0x2a0040, 0.22).setDepth(zoneDepth); } catch (e) { z = null; }
                            }

                            try { if (z && scene.physics && scene.physics.add) scene.physics.add.existing(z); } catch (e) {}
                            if (z && z.body) {
                                try { z.body.setAllowGravity && z.body.setAllowGravity(false); } catch (e) {}
                                try { setCircleCentered(z, zoneRadius); } catch (e) {}
                                try { z.body.immovable = true; } catch (e) {}
                            }
                            if (!z) return;
                            z._hitIds = new Set();

                            // nice pulse + slow rotation
                            try {
                                if (scene.tweens && z) {
                                    try { scene.tweens.add({ targets: z, scale: { from: z.scale, to: (z.scale || 1) * 1.08 }, alpha: { from: 0.95, to: 0.6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } catch (e) {}
                                    try { scene.tweens.add({ targets: z, angle: 360, duration: 6000, repeat: -1, ease: 'Linear' }); } catch (e) {}
                                }
                            } catch (e) {}

                            // emitter
                            try { z._emitter = createVoidZoneEmitter && createVoidZoneEmitter(scene, z, zoneDepth); } catch (e) { z._emitter = null; }

                            // overlap handling: damage each enemy at most once per zone
                            try {
                                if (scene.physics && scene.enemies && scene.enemies.getChildren && typeof scene.physics.add.overlap === 'function') {
                                    addPhysicsOverlap(scene, z, scene.enemies, function(zoneObj, enemy) {
                                        try {
                                            if (!zoneObj || !enemy || !safeGetData(enemy, 'alive')) return;
                                            const id = enemy._uid || (enemy._uid = Math.random().toString(36).slice(2));
                                            if (zoneObj._hitIds && zoneObj._hitIds.has(id)) return;
                                            try { zoneObj._hitIds.add(id); } catch (e) {}
                                            _dealPlayerDamage(scene, enemy, dmg, '#b38bff', { isSpell: true });
                                            try {
                                                const fx = scene.add.circle(enemy.x, enemy.y, 14, 0x4b1a6d, 0.26).setDepth((enemy.depth || 7) + 0.12);
                                                if (scene.tweens) scene.tweens.add({ targets: fx, alpha: 0, scale: 1.6, duration: 260, onComplete: () => { try { fx.destroy(); } catch (e) {} } });
                                            } catch (e) {}
                                        } catch (e) {}
                                    });
                                }
                            } catch (e) {}

                            zones.push(z);
                            // destroy zone after lifetime and cleanup emitter
                            try {
                                if (scene.time && scene.time.addEvent) {
                                    scene.time.addEvent({ delay: zoneLifetime, callback: () => {
                                        try {
                                            if (z && z._emitter) {
                                                try { if (z._emitter._emitter && typeof z._emitter._emitter.stop === 'function') z._emitter._emitter.stop(); } catch (ee) {}
                                                try { z._emitter.destroy(); } catch (ee) {}
                                                z._emitter = null;
                                            }
                                        } catch (e) {}
                                        try { if (z && z.destroy) z.destroy(); } catch (e) {}
                                        const idx = zones.indexOf(z); if (idx >= 0) zones.splice(idx, 1);
                                    } });
                                }
                            } catch (e) {}
                        } catch (e) {}
                    };

                    // start placing zones at intervals
                    try {
                        if (scene.time && scene.time.addEvent) {
                            placer = scene.time.addEvent({ delay: placeInterval, loop: true, callback: spawnZoneAtPlayer });
                            // stop placer after duration
                            scene.time.addEvent({ delay: durationMs, callback: () => {
                                try { if (placer && typeof placer.remove === 'function') placer.remove(false); } catch (e) {}
                                // cleanup remaining zones
                                try { for (let i = 0; i < zones.length; i++) { try { if (zones[i] && zones[i].destroy) zones[i].destroy(); } catch (e) {} } } catch (e) {}
                            } });
                        } else {
                            // fallback: place a few static zones around player
                            const count = Math.max(2, Math.floor(durationMs / placeInterval));
                            for (let i = 0; i < count; i++) spawnZoneAtPlayer();
                        }
                    } catch (e) {}

                    try { if (scene._showToast) scene._showToast('Void Path active', 900); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'sigilcraft': {
                try {
                    const delayMs = 600;
                    const baseRadius = 64;
                    const rankFactor = Math.min(3, 1 + Math.max(0, (Number(rank || 1) - 1)) * (2 / 99));
                    const radius = baseRadius * rankFactor;
                    const dmgPercent = scaledValue || 80;
                    const baseSpell = Math.max(8, ((eff && eff.int) || 0) * 2 + 6);
                    const dmg = baseSpell * (dmgPercent / 100);
                    let sx = scene.player.x + 48; let sy = scene.player.y;
                    if (scene.input && scene.input.activePointer) { sx = scene.input.activePointer.worldX || sx; sy = scene.input.activePointer.worldY || sy; }
                    const sigFx = spawnArcaneSigil(scene, sx, sy, radius, { depth: 7.2, fillColor: 0x4b1a6d });
                    scene.time && scene.time.addEvent({ delay: delayMs, callback: () => {
                        try {
                            const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren() : [];
                            enemies.forEach(e => { if (e && safeGetData(e, 'alive')) {
                                const d = Phaser.Math.Distance.Between(sx, sy, e.x, e.y);
                                if (d <= radius) _dealPlayerDamage(scene, e, dmg, '#c8b3ff', { isSpell: true });
                            }});
                        } catch (e) {} finally {
                            if (sigFx && typeof sigFx.destroy === 'function') sigFx.destroy();
                        }
                    } });
                    try { if (scene._showToast) scene._showToast('Placed Sigil', 700); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'forbidden_balls': {
                try {
                    // Forbidden Balls: spawn a ring of void-orbs that orbit the player for a short duration.
                    // If an enemy enters trigger range, that orb will detach and home to the enemy.
                    const count = Math.max(3, Math.round(scaledValue || (1 + (Number(rank || 0)))));
                    const baseSpell = Math.max(6, ((eff && eff.int) || 0) * 2 + 6);
                    const dmgPercent = (typeof secondScaling !== 'undefined' && secondScaling) ? (secondScaling.base || scaledValue || 100) : (scaledValue || 100);
                    // secondScaling is used in talents.js to express percent damage; prefer that when present
                    const dmg = Math.max(1, Math.round(baseSpell * ((Number((eff && eff.secondScaling && eff.secondScaling.value) || 0) || (typeof secondScaling !== 'undefined' && secondScaling && secondScaling.base) || (dmgPercent)) / 100)));
                    // fallback simpler dmg derivation if above fails
                    const finalDmg = Math.max(1, Math.round(baseSpell * ((Number((scaledValue || 100)) / 100))));
                    const usedDmg = isNaN(dmg) || dmg <= 0 ? finalDmg : dmg;
                    const ballDepth = (scene.player && typeof scene.player.depth === 'number') ? scene.player.depth + 0.2 : 9.2;
                    // orbit parameters
                    const orbitDuration = 2200; // ms the orbs orbit before expiring
                    // Use a modest initial orbit radius (~64px) so the ring is not huge
                    const orbitRadius = 48;
                    const orbitSpeedBase = 0.15; // radians per tick (~40ms)
                    const triggerRange = 96; // when an enemy is within this distance from the orb, it will detach

                    // ensure assets
                    try { ensureVoidOrbAssets && ensureVoidOrbAssets(scene); } catch (e) {}

                    const orbs = [];
                    for (let i = 0; i < count; i++) {
                        try {
                            const ang = (Math.PI * 2 * i) / Math.max(1, count);
                            const spawnX = scene.player.x + Math.cos(ang) * orbitRadius;
                            const spawnY = scene.player.y + Math.sin(ang) * orbitRadius;
                            let orb = null;
                            try { if (scene.physics && scene.physics.add && scene.textures && scene.textures.exists('fx_void_orb')) orb = scene.physics.add.image(spawnX, spawnY, 'fx_void_orb'); } catch (e) { orb = null; }
                            if (!orb) {
                                try { orb = scene.add.circle(spawnX, spawnY, 8, 0x2b004b, 0.95).setDepth(ballDepth); if (scene.physics && scene.physics.add) scene.physics.add.existing(orb); } catch (e) { orb = null; }
                            }
                            if (!orb) continue;
                            if (orb.setOrigin) orb.setOrigin(0.5, 0.5);
                            if (orb.setDepth) orb.setDepth(ballDepth);
                            try { if (orb.setBlendMode) orb.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                            if (orb.body) {
                                try { orb.body.setAllowGravity && (orb.body.setAllowGravity(false)); } catch (e) {}
                                try { setCircleCentered(orb, 8); } catch (e) {}
                            }

                            orb._orbit = { angle: ang, radius: orbitRadius, speed: orbitSpeedBase + (Math.random() - 0.5) * 0.02 };
                            orb._orbiting = true;
                            orb._detached = false;
                            orb._createdAt = Date.now();
                            orb._dmg = usedDmg;

                            // trail/glow polish
                            try { if (typeof createVoidOrbTrail === 'function') orb._trail = createVoidOrbTrail(scene, orb, ballDepth - 0.1); } catch (e) {}

                            // per-orb orbit updater: position around current player position and look for enemies
                            let orbitTimer = null;
                            try {
                                if (scene.time && scene.time.addEvent) {
                                    orbitTimer = scene.time.addEvent({ delay: 40, loop: true, callback: () => {
                                        try {
                                            if (!orb || !orb.active) { if (orbitTimer) orbitTimer.remove(false); return; }
                                            // if detached, remove this orbit updater
                                            if (!orb._orbiting) { if (orbitTimer) { orbitTimer.remove(false); orbitTimer = null; } return; }
                                            // update angle and position relative to player
                                            try {
                                                orb._orbit.angle += orb._orbit.speed;
                                                const cx = (scene.player && typeof scene.player.x === 'number') ? scene.player.x : orb.x;
                                                const cy = (scene.player && typeof scene.player.y === 'number') ? scene.player.y : orb.y;
                                                const nx = cx + Math.cos(orb._orbit.angle) * orb._orbit.radius;
                                                const ny = cy + Math.sin(orb._orbit.angle) * orb._orbit.radius;
                                                if (typeof orb.setPosition === 'function') orb.setPosition(nx, ny);
                                            } catch (e) {}

                                            // check for nearby enemies to trigger homing
                                            try {
                                                const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren().filter(e => e && safeGetData(e, 'alive')) : [];
                                                if (enemies && enemies.length) {
                                                    for (let ei = 0; ei < enemies.length; ei++) {
                                                        const e = enemies[ei];
                                                        if (!e) continue;
                                                        const d = Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y);
                                                        if (d <= triggerRange) {
                                                            // detach and home to this enemy
                                                            orb._orbiting = false;
                                                            orb._detached = true;
                                                            const target = e;
                                                            const speed = 420;
                                                            // enable homing movement
                                                            try {
                                                                if (scene.physics && typeof scene.physics.moveToObject === 'function') {
                                                                    scene.physics.moveToObject(orb, target, speed);
                                                                } else if (orb.body && typeof orb.body.setVelocity === 'function') {
                                                                    const ang2 = Phaser.Math.Angle.Between(orb.x, orb.y, target.x, target.y);
                                                                    orb.body.setVelocity(Math.cos(ang2) * speed, Math.sin(ang2) * speed);
                                                                    if (orb.setRotation) orb.setRotation(ang2);
                                                                }
                                                            } catch (e) {}

                                                            // setup homing updater to re-target if enemy dies
                                                            let homingTimer = null;
                                                            try {
                                                                if (scene.time && scene.time.addEvent) {
                                                                    homingTimer = scene.time.addEvent({ delay: 100, loop: true, callback: () => {
                                                                        try {
                                                                            if (!orb || !orb.body || !orb.active) { if (homingTimer) homingTimer.remove(false); return; }
                                                                            if (!target || !safeGetData(target, 'alive')) {
                                                                                // find new nearest
                                                                                const nearby = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren().filter(x => x && safeGetData(x, 'alive')) : [];
                                                                                if (!nearby || !nearby.length) return;
                                                                                nearby.sort((a, b) => Phaser.Math.Distance.Between(orb.x, orb.y, a.x, a.y) - Phaser.Math.Distance.Between(orb.x, orb.y, b.x, b.y));
                                                                                const next = nearby[0];
                                                                                if (next) {
                                                                                    try { if (scene.physics && typeof scene.physics.moveToObject === 'function') scene.physics.moveToObject(orb, next, speed); else if (orb.body && typeof orb.body.setVelocity === 'function') { const ang3 = Phaser.Math.Angle.Between(orb.x, orb.y, next.x, next.y); orb.body.setVelocity(Math.cos(ang3)*speed, Math.sin(ang3)*speed); if (orb.setRotation) orb.setRotation(ang3); } } catch (e) {}
                                                                                }
                                                                            } else {
                                                                                try { if (scene.physics && typeof scene.physics.moveToObject === 'function') scene.physics.moveToObject(orb, target, speed); else if (orb.body && typeof orb.body.setVelocity === 'function') { const ang4 = Phaser.Math.Angle.Between(orb.x, orb.y, target.x, target.y); orb.body.setVelocity(Math.cos(ang4)*speed, Math.sin(ang4)*speed); if (orb.setRotation) orb.setRotation(ang4); } } catch (e) {}
                                                                            }
                                                                        } catch (e) {}
                                                                    }});
                                                                }
                                                            } catch (e) {}

                                                            // once detached, we break out of enemy loop
                                                            break;
                                                        }
                                                    }
                                                }
                                            } catch (e) {}

                                            // expire after orbitDuration
                                            try {
                                                if (Date.now() - (orb._createdAt || 0) >= orbitDuration) {
                                                    orb._orbiting = false;
                                                    try { if (orbitTimer && orbitTimer.remove) orbitTimer.remove(false); } catch (e) {}
                                                    try { if (orb && orb.destroy) orb.destroy(); } catch (e) {}
                                                }
                                            } catch (e) {}
                                        } catch (e) {}
                                    }});
                                }
                            } catch (e) {}

                            // overlap handling: same as before, apply damage on impact
                            try {
                                if (scene.physics && scene.enemies && scene.enemies.getChildren && typeof scene.physics.add.overlap === 'function') {
                                    addPhysicsOverlap(scene, orb, scene.enemies, function(proj, enemy) {
                                        try {
                                            if (!proj || proj._hit) return;
                                            proj._hit = true;
                                            try { proj._orbiting = false; } catch (ee) {}
                                            try { if (proj.body) { try { if (typeof proj.body.setVelocity === 'function') proj.body.setVelocity(0, 0); } catch (e) {} if (scene.physics && scene.physics.world && typeof scene.physics.world.disableBody === 'function') { try { scene.physics.world.disableBody(proj.body); } catch (e) {} } else if (typeof proj.body.enable !== 'undefined') { try { proj.body.enable = false; } catch (e) {} } } } catch (e) {}
                                            try { if (typeof proj.setActive === 'function') proj.setActive(false); } catch (e) {}
                                            try { if (typeof proj.setVisible === 'function') proj.setVisible(false); } catch (e) {}

                                            if (!enemy || !safeGetData(enemy, 'alive')) {
                                                try { if (proj && proj.destroy) proj.destroy(); } catch (ee) {}
                                                return;
                                            }

                                            _dealPlayerDamage(scene, enemy, proj._dmg || usedDmg, '#bfa6ff', { isSpell: true });
                                            try {
                                                const c = scene.add.circle(enemy.x, enemy.y, 18, 0xa04bff, 0.28).setDepth(enemy.depth ? enemy.depth + 0.1 : ballDepth + 0.1);
                                                if (scene.tweens) scene.tweens.add({ targets: c, alpha: 0, scale: 1.8, duration: 260, onComplete: () => { try { c.destroy(); } catch (e) {} } });
                                                else scene.time && scene.time.delayedCall && scene.time.delayedCall(260, () => { try { c.destroy(); } catch (e) {} });
                                            } catch (e) {}
                                        } catch (ee) {}
                                        try { if (proj && proj.destroy) proj.destroy(); } catch (ee) {}
                                    });
                                }
                            } catch (e) {}

                            orbs.push(orb);
                        } catch (e) {}
                    }

                    try { if (scene._showToast) scene._showToast('Forbidden Balls!', 700); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'mana_conduction': {
                try {
                    const strength = scaledValue || 15;
                    const durationMs = 6000;
                    const maxhp = Math.max(1, scene.char.maxhp || 100);
                    const absorb = Math.round(maxhp * (strength / 100));
                    scene.char._manaWard = { remaining: absorb, expiresAt: Date.now() + durationMs };
                    try { if (scene._showToast) scene._showToast('Mana Ward active', 900); } catch (e) {}
                    let shieldFx = null;
                    try { shieldFx = spawnArcaneShield(scene, scene.player.x, scene.player.y, 34, 0x66bbff); } catch (e) {}
                    if (shieldFx && shieldFx.destroy && scene.time && scene.time.addEvent) {
                        scene.time.addEvent({ delay: durationMs, callback: () => { try { shieldFx.destroy(); } catch (e) {} } });
                    }
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'eagle_eye': {
                try {
                    // Eagle Shot: spawn a single arrow projectile that flies to the chosen target
                    const enemy = scene._getEnemyInRange ? scene._getEnemyInRange(520) : null;
                    const baseRanged = Math.max(6, 10 + ((eff && eff.agi) || 0) * 2);
                    const dmgPercent = scaledValue || 200;
                    const dmg = baseRanged * (dmgPercent / 100);

                    // create arrow visual (a thin triangle pointing right), position at player
                    const arrow = scene.add.triangle(scene.player.x, scene.player.y, -8, -3, 12, 0, -8, 3, 0xffe0b3).setDepth(9);
                    arrow.setOrigin(0.5, 0.5);

                    // determine aim direction (enemy > pointer > facing > default)
                    let ang = 0;
                    if (enemy) {
                        ang = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, enemy.x, enemy.y);
                    } else if (scene.input && scene.input.activePointer && (scene.input.activePointer.worldX || scene.input.activePointer.worldY)) {
                        ang = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.input.activePointer.worldX, scene.input.activePointer.worldY);
                    } else if (scene._facing) {
                        const fmap = { left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 };
                        ang = fmap[scene._facing] || 0;
                    }
                    arrow.setRotation(ang);

                    // physics and velocity
                    try { if (scene.physics && scene.physics.add) scene.physics.add.existing(arrow); } catch (e) {}
                    try {
                        if (arrow.body) {
                            arrow.body.setAllowGravity(false);
                            const speed = 780;
                            const vx = Math.cos(ang) * speed; const vy = Math.sin(ang) * speed;
                            if (typeof arrow.body.setVelocity === 'function') arrow.body.setVelocity(vx, vy);
                            // fine-tune hitbox
                            try { if (typeof arrow.body.setSize === 'function') arrow.body.setSize(18, 6); } catch (e) {}
                        }
                    } catch (e) {}

                    // overlap handling: when arrow hits an enemy, apply damage and spawn impact effect
                    try {
                        if (scene.physics && scene.enemies && scene.enemies.getChildren && typeof scene.physics.add.overlap === 'function') {
                            const cb = function(p, enemyHit) {
                                try {
                                    if (!enemyHit || !safeGetData(enemyHit, 'alive')) return;
                                    _dealPlayerDamage(scene, enemyHit, dmg, '#ffd8b3');
                                    // small impact pulse
                                    try { const c = scene.add.circle(enemyHit.x, enemyHit.y, 14, 0xffd4a6, 0.22).setDepth(10); if (scene.tweens) scene.tweens.add({ targets: c, alpha: 0, scale: 1.6, duration: 220, onComplete: () => { try { c.destroy(); } catch(e){} } }); } catch(e){}
                                    // Ricochet Calibration: if talent learned, ricochet to another nearby enemy with reduced damage and a crit chance bonus
                                    try {
                                        const rank = _getTalentRank && _getTalentRank(scene.char, 'ricochet_calibration') ? _getTalentRank(scene.char, 'ricochet_calibration') : 0;
                                        if (rank && rank > 0) {
                                            // compute crit chance bonus for ricochet from talent definition (fallback formula)
                                            let critBonus = 0;
                                            try {
                                                // talent was authored with "Scaling" incorrectly in file; derive using known base/perRank if needed
                                                critBonus = 4 + 0.6 * Math.max(0, rank - 1);
                                            } catch (e) { critBonus = 4; }
                                            // find nearest other alive enemy within 220px
                                            try {
                                                const others = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren().filter(e => e && safeGetData(e, 'alive') && e !== enemyHit) : [];
                                                if (others && others.length) {
                                                    others.sort((a,b) => Phaser.Math.Distance.Between(enemyHit.x, enemyHit.y, a.x, a.y) - Phaser.Math.Distance.Between(enemyHit.x, enemyHit.y, b.x, b.y));
                                                    const target = others.find(o => Phaser.Math.Distance.Between(enemyHit.x, enemyHit.y, o.x, o.y) <= 220);
                                                    if (target) {
                                                        const ricDmg = Math.max(1, Math.round(dmg * 0.6));
                                                        try {
                                                            // apply transient crit bonus for this ricochet hit
                                                            scene.char._ricochetCritBonus = (scene.char._ricochetCritBonus || 0) + critBonus;
                                                            _dealPlayerDamage(scene, target, ricDmg, '#ffd8b3');
                                                        } finally {
                                                            try { delete scene.char._ricochetCritBonus; } catch (e) { scene.char._ricochetCritBonus = 0; }
                                                        }
                                                        try { if (scene._showToast) scene._showToast('Ricochet!', 700); } catch (e) {}
                                                    }
                                                }
                                            } catch (e) {}
                                        }
                                    } catch (e) {}
                                    try { if (p && p.destroy) p.destroy(); } catch (ee) {}
                                } catch (ee) {}
                            };
                            addPhysicsOverlap(scene, arrow, scene.enemies, cb);
                        }
                    } catch (e) {}

                    // lifetime cleanup in case it misses
                    try { if (scene.time && scene.time.addEvent) scene.time.addEvent({ delay: 1200, callback: () => { try { if (arrow && arrow.destroy) arrow.destroy(); } catch (e) {} } }); } catch (e) {}

                    // slight trail: spawn fading dots along path for polish
                    try {
                        const trailCount = 6;
                        for (let i = 1; i <= trailCount; i++) {
                            const dDelay = i * 30;
                            if (scene.time && scene.time.addEvent) scene.time.addEvent({ delay: dDelay, callback: (() => {
                                try {
                                    const trail = scene.add.circle(scene.player.x + Math.cos(ang) * 8 * i, scene.player.y + Math.sin(ang) * 8 * i, 2, 0xfff1d6, 0.95).setDepth(8);
                            if (scene.tweens) scene.tweens.add({ targets: trail, alpha: 0, scale: 1.4, duration: 260, ease: 'Cubic.easeOut', onComplete: () => { try { trail.destroy(); } catch (e) {} } });
                        } catch (e) {}
                    }) });
                }
                    } catch (e) {}

                    try { if (scene._showToast) scene._showToast('Eagle Shot!', 600); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'shadowstep': {
                try {
                    const teleDist = 120;
                    // Interpret scaledValue as stealth duration (seconds)
                    const stealthSeconds = Number(scaledValue) || 3;
                    // DR amount while stealthed: fully block (100%). Keep UI-compatible _shadowstepDR for display.
                    const drAmount = 100;
                    // Teleport in the direction the player is facing or moving. Fallback to pointer if unknown.
                    let ang = 0;
                    try {
                        const body = scene.player && scene.player.body;
                        if (body && body.velocity && (Math.abs(body.velocity.x) > 0.5 || Math.abs(body.velocity.y) > 0.5)) {
                            ang = Math.atan2(body.velocity.y, body.velocity.x);
                        } else if (scene._facing) {
                            const fmap = { left: Math.PI, right: 0, up: -Math.PI/2, down: Math.PI/2 };
                            ang = fmap[scene._facing] || 0;
                        } else if (scene.input && scene.input.activePointer) {
                            ang = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.input.activePointer.worldX, scene.input.activePointer.worldY);
                        }
                    } catch (e) { ang = 0; }
                    const startX = scene.player.x;
                    const startY = scene.player.y;
                    const tx = startX + Math.cos(ang) * teleDist;
                    const ty = startY + Math.sin(ang) * teleDist;
                    if (scene.player && scene.player.body && typeof scene.player.body.reset === 'function') {
                        scene.player.body.reset(tx, ty);
                        try { scene.player.setVelocity(0, 0); } catch (e) {}
                    } else if (scene.tweens && scene.player) {
                        scene.tweens.add({ targets: scene.player, x: tx, y: ty, duration: 150, ease: 'Cubic.easeOut' });
                    } else {
                        scene.player.x = tx; scene.player.y = ty;
                    }

                    const now = Date.now();
                    const durMs = Math.max(300, Math.round(stealthSeconds * 1000));
                    // mark stealth state on the character
                    try {
                        if (!scene.char) scene.char = {};
                        scene.char._shadowstep = { stealth: true, startsAt: now, durationMs: durMs, expiresAt: now + durMs };
                        // keep compatibility with UI which expects _shadowstepDR.amount
                        scene.char._shadowstepDR = { amount: drAmount, expiresAt: now + durMs };
                        // force next player-sourced attack to crit
                        scene.char._forceNextCrit = true;
                        // Silent Steps: immediately grant 20 stealth points on shadowstep (cap at 100)
                        try { scene.char._stealthPoints = Math.min(100, Math.max(0, Number(scene.char._stealthPoints || 0) + 20)); } catch (e) {}
                        // initialize stealth movement tracking
                        try { scene.char._stealthAccum = 0; scene.char._lastStealthPos = { x: scene.player.x, y: scene.player.y }; } catch (e) {}
                    } catch (e) {}

                    // visual: reduce player alpha to indicate stealth and spawn an afterimage
                    try {
                        if (scene.player && typeof scene.player.setAlpha === 'function') scene.player.setAlpha(0.24);
                        spawnBlinkAfterimage(scene, startX, startY, tx, ty, 0x222222);
                        // Enable hellscape effect when entering shadowstep (Sin City vibe)
                        enableHellscape(scene, 0.9, 0.15, {
                            chromatic: 0.6,
                            grain: 0.2,
                            flicker: 0.15,
                            vignetteBoost: 0.3,
                            redBoost: 0.2,
                            edgeRedness: 0.6,
                            pulseStrength: 1.0,   // stronger heartbeat baseline
                            pulseSpeed: 1.0,
                            dynamicPulse: true,   // ramp pulse as stealth runs out
                            sinCity: true,
                            grayAmount: 0.9,
                            redIsolation: 0.75,
                            contrast: 0.6
                        });
                        // Add ember overlay for atmosphere
                        ensureHellEmbers(scene);
                    } catch (e) {}

                    // schedule stealth expiry cleanup
                    try {
                        if (scene.time && typeof scene.time.addEvent === 'function') {
                            scene.time.addEvent({ delay: durMs, callback: () => {
                                try {
                                    if (scene && scene.char) {
                                        // clear stealth flags
                                        try {
                                            // apply post-stealth effects (evasive_flourish) when stealth naturally expires
                                            try { applyPostStealthEffects && applyPostStealthEffects(scene); } catch (e) {}
                                        } catch (e) {}
                                        try { if (scene.player && typeof scene.player.setAlpha === 'function') scene.player.setAlpha(1); } catch (e) {}
                                        try { scene.char._shadowstep = null; } catch (e) {}
                                        try { scene.char._shadowstepDR = null; } catch (e) {}
                                        // Disable hellscape effect when stealth expires and clear embers
                                        try { disableHellscape(scene); } catch (e) {}
                                        try { clearHellEmbers(scene); } catch (e) {}
                                    }
                                } catch (e) {}
                            } });
                        }
                    } catch (e) {}

                    try { if (scene._showToast) scene._showToast('Shadowstep - stealthed', 900); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'hex_engine': {
                try {
                    try { const dbg = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent); if (dbg) console.debug('[hex_engine] activating blink for', scene && scene.char && scene.char.talents ? scene.char.talents : null); } catch (e) {}
                    // Simple blink/teleport effect for the Hex Engine talent
                    const teleDist = 160;
                    // Teleport in the direction the player is facing or moving. Fallback to pointer if unknown.
                    let ang = 0;
                    try {
                        const body = scene.player && scene.player.body;
                        if (body && body.velocity && (Math.abs(body.velocity.x) > 0.5 || Math.abs(body.velocity.y) > 0.5)) {
                            ang = Math.atan2(body.velocity.y, body.velocity.x);
                        } else if (scene._facing) {
                            const fmap = { left: Math.PI, right: 0, up: -Math.PI/2, down: Math.PI/2 };
                            ang = fmap[scene._facing] || 0;
                        } else if (scene.input && scene.input.activePointer) {
                            ang = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.input.activePointer.worldX, scene.input.activePointer.worldY);
                        }
                    } catch (e) { ang = 0; }
                    const startX = scene.player.x; const startY = scene.player.y;
                    const tx = startX + Math.cos(ang) * teleDist; const ty = startY + Math.sin(ang) * teleDist;
                    try {
                        if (scene.player && scene.player.body && typeof scene.player.body.reset === 'function') {
                            scene.player.body.reset(tx, ty);
                            try { scene.player.setVelocity(0, 0); } catch (ee) {}
                        } else if (scene.player) {
                            scene.player.x = tx; scene.player.y = ty;
                        }
                    } catch (e) {}
                    try { if (scene._showToast) scene._showToast('Hex Engine - Blink!', 700); } catch (e) {}
                    // small visual pulse at destination
                    try { spawnBlinkAfterimage(scene, startX, startY, tx, ty, 0x9966ff); } catch (e) {}
                    try { const dbg = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent); if (dbg) console.debug('[hex_engine] blink tween to', tx, ty); } catch (e) {}
                    try { const p = scene.add.circle(tx, ty, 18, 0x9966ff, 0.18).setDepth(9); if (scene.tweens) scene.tweens.add({ targets: p, alpha: 0, scale: 1.6, duration: 300, onComplete: () => { try { p.destroy(); } catch(e){} } }); } catch(e){}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'knife_swarm': {
                try {
                    if (scene._showToast) scene._showToast('[DEBUG] knife_swarm handler entered', 1500);
                    const baseKnives = 6;
                    const extraPerFive = Math.floor(Math.max(0, rank || 0) / 5);
                    const total = baseKnives + extraPerFive;
                    const [projMin, projMax] = getWeaponDamageRange(scene);
                    const avgWeapon = (projMin + projMax) / 2;
                    const baseRanged = Math.max(6, avgWeapon + (((eff && eff.agi) || 0) * 1.1) + (((eff && eff.luk) || 0) * 0.35));
                    let dmgPercent = scaledValue || 6;
                    const knifeMods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers['knifeDamage'] : null;
                    if (knifeMods) {
                        dmgPercent += Number(knifeMods.flat || 0);
                        dmgPercent *= (1 + (Number(knifeMods.percent || 0) / 100));
                    }
                    const knifeDamage = Math.max(1, baseRanged * (dmgPercent / 100));

                    const assetsReady = ensureKnifeSwarmAssets(scene);
                    const spawnRadius = 26;
                    const knifeDepth = (scene.player && typeof scene.player.depth === 'number') ? scene.player.depth + 0.2 : 9.2;
                    const speed = 420;
                    const lifetime = 900;
                    const launchGap = 45;
                    const step = total > 0 ? ((Math.PI * 2) / total) : 0;

                    let baseAng = 0;
                    try {
                        if (scene.input && scene.input.activePointer && (scene.input.activePointer.worldX || scene.input.activePointer.worldY)) {
                            baseAng = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.input.activePointer.worldX, scene.input.activePointer.worldY);
                        } else if (scene._facing) {
                            const fmap = { left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 };
                            baseAng = fmap[scene._facing] || 0;
                        }
                    } catch (e) { baseAng = 0; }

                    for (let i = 0; i < total; i++) {
                        const ang = Phaser.Math.Angle.Wrap(baseAng + (step * i));
                        const spawnX = scene.player.x + Math.cos(ang) * spawnRadius;
                        const spawnY = scene.player.y + Math.sin(ang) * spawnRadius;
                        let knife = null;
                        if (assetsReady && scene.physics && scene.physics.add) {
                            try { knife = scene.physics.add.image(spawnX, spawnY, 'fx_knife_blade'); } catch (e) { knife = null; }
                        }
                        if (!knife && assetsReady && scene.add) {
                            try {
                                knife = scene.add.image(spawnX, spawnY, 'fx_knife_blade');
                                if (knife && scene.physics && scene.physics.add) scene.physics.add.existing(knife);
                            } catch (e) { knife = null; }
                        }
                        if (!knife) {
                            try {
                                knife = scene.add.triangle(spawnX, spawnY, 0, -6, 12, 0, 0, 6, 0xffffff);
                                if (knife && scene.physics && scene.physics.add) scene.physics.add.existing(knife);
                            } catch (e) { knife = null; }
                        }
                        if (!knife) continue;

                        if (knife.setDepth) knife.setDepth(knifeDepth);
                        if (knife.setOrigin) knife.setOrigin(0.5, 0.5);
                        if (knife.setRotation) knife.setRotation(ang);
                        try { if (knife.setBlendMode) knife.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                        if (knife.setAlpha) knife.setAlpha(0);

                        if (knife.body) {
                            knife.body.allowGravity = false;
                            if (knife.body.setVelocity) knife.body.setVelocity(0, 0);
                            try { setBodySizeCentered(knife, 14, 6); } catch (e) {}
                        }

                        const trail = createKnifeTrailEmitter(scene, knife, knifeDepth - 0.2);
                        if (knife.once) {
                            knife.once('destroy', () => {
                                try { if (trail) trail.destroy(); } catch (e) {}
                            });
                        }

                        if (scene.tweens && typeof scene.tweens.add === 'function') {
                            scene.tweens.add({ targets: knife, alpha: { from: 0, to: 1 }, duration: 90, delay: i * launchGap, ease: 'Cubic.easeOut' });
                            scene.tweens.add({ targets: knife, rotation: knife.rotation + Phaser.Math.DegToRad(360), duration: 520, ease: 'Linear', repeat: -1 });
                        } else if (knife.setAlpha) {
                            knife.setAlpha(1);
                        }

                        const launchDelay = i * launchGap + 60;
                        const applyVelocity = () => {
                            if (!knife || !knife.active) return;
                            const vx = Math.cos(ang) * speed;
                            const vy = Math.sin(ang) * speed;
                            if (knife.body && knife.body.setVelocity) {
                                knife.body.setVelocity(vx, vy);
                            } else if (scene.tweens && typeof scene.tweens.add === 'function') {
                                scene.tweens.add({ targets: knife, x: knife.x + vx * (lifetime / 1000), y: knife.y + vy * (lifetime / 1000), duration: lifetime, ease: 'Linear' });
                            } else {
                                knife.x += vx * 0.016;
                                knife.y += vy * 0.016;
                            }
                        };

                        if (scene.time && scene.time.addEvent) {
                            scene.time.addEvent({ delay: launchDelay, callback: applyVelocity });
                        } else {
                            applyVelocity();
                        }

                        if (scene.physics && knife.body && scene.enemies && scene.enemies.getChildren && typeof scene.physics.add.overlap === 'function') {
                            addPhysicsOverlap(scene, knife, scene.enemies, function(proj, enemy) {
                                if (!enemy || !safeGetData(enemy, 'alive')) return;
                                try {
                                    _dealPlayerDamage(scene, enemy, knifeDamage, '#fffbcc');
                                    if (scene.add) {
                                        const slash = scene.add.rectangle(enemy.x, enemy.y, 24, 3, 0xfff0cc, 0.7).setDepth(enemy.depth ? enemy.depth + 0.1 : knifeDepth + 0.1);
                                        slash.setRotation(ang);
                                        if (scene.tweens && typeof scene.tweens.add === 'function') {
                                            scene.tweens.add({ targets: slash, alpha: 0, scaleX: 0.2, duration: 170, ease: 'Cubic.easeIn', onComplete: () => { try { slash.destroy(); } catch (ee) {} } });
                                        } else {
                                            scene.time && scene.time.delayedCall && scene.time.delayedCall(170, () => { try { slash.destroy(); } catch (ee) {} });
                                        }
                                    }
                                } catch (ee) {}
                                try { if (proj && proj.destroy) proj.destroy(); } catch (ee) {}
                            });
                        }

                        if (scene.time && scene.time.addEvent) {
                            scene.time.addEvent({
                                delay: launchDelay + lifetime,
                                callback: () => { try { if (knife && knife.destroy) knife.destroy(); } catch (e) {} }
                            });
                        } else {
                            try { scene.time && scene.time.delayedCall && scene.time.delayedCall(lifetime, () => { try { knife.destroy(); } catch (e) {} }); } catch (e) {}
                        }
                    }
                    try { if (scene._showToast) scene._showToast('Knife Swarm!', 700); } catch (e) {}
                    if (scene._showToast) scene._showToast('[DEBUG] About to markActivationSuccess for knife_swarm', 1500);
                    markActivationSuccess(scene, tid);
                    if (scene._showToast) scene._showToast('[DEBUG] markActivationSuccess completed for knife_swarm', 1500);
                } catch (e) {
                    if (scene._showToast) scene._showToast(`[DEBUG] knife_swarm exception: ${e.message}`, 2000);
                }
                break;
            }
            case 'needle_rain': {
                try {
                    if (scene._showToast) scene._showToast('[DEBUG] needle_rain handler entered', 1500);
                    // Needle Rain: spawn projectiles from above into an AOE over time
                    const projCount = Math.max(1, Math.round(scaledValue || 5));
                    const [projMin, projMax] = getWeaponDamageRange(scene);
                    const avgWeapon = (projMin + projMax) / 2;
                    const baseRanged = Math.max(6, avgWeapon + (((eff && eff.agi) || 0) * 1.1) + (((eff && eff.luk) || 0) * 0.35));
                    // damage per needle is a modest portion of weapon base
                    const perNeedleDmg = Math.max(1, Math.round(baseRanged * 0.45));

                    // area center: pointer if available, otherwise player
                    let cx = scene.player.x; let cy = scene.player.y;
                    try { if (scene.input && scene.input.activePointer && typeof scene.input.activePointer.worldX === 'number') { cx = scene.input.activePointer.worldX; cy = scene.input.activePointer.worldY; } } catch (e) {}

                    const areaRadius = 120;
                    const depth = (scene.player && typeof scene.player.depth === 'number') ? scene.player.depth + 0.2 : 9.2;

                    // spawn projectiles over time (every 200ms)
                    const interval = 200;
                    let spawned = 0;
                    const rainEvent = (scene.time && scene.time.addEvent) ? scene.time.addEvent({ delay: interval, repeat: Math.max(0, projCount - 1), callback: function() {
                        try {
                            // choose random point in circle
                            const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
                            const r = Phaser.Math.FloatBetween(0, areaRadius);
                            const tx = cx + Math.cos(ang) * r;
                            const ty = cy + Math.sin(ang) * r;
                                    // spawn off-screen above the camera so needles come from the top
                                    const camTop = (scene.cameras && scene.cameras.main && scene.cameras.main.worldView) ? scene.cameras.main.worldView.y : Math.max(0, ty - 240);
                                    const topOffset = Phaser.Math.Between(40, 120);
                                    const spawnY = camTop - topOffset;
                                    const spawnX = tx + Phaser.Math.FloatBetween(-24, 24);
                                    let proj = null;
                                    // ensure procedural needle asset exists
                                    const assetsReady = ensureNeedleAssets(scene);
                                    if (scene.physics && scene.physics.add) {
                                        try { proj = scene.physics.add.image(spawnX, spawnY, assetsReady ? 'fx_needle' : null); } catch (e) { proj = null; }
                                    }
                                    if ((!proj || (proj && !proj.texture)) && scene.add) {
                                        // fallback: use a small image or rectangle so it's visible
                                        try {
                                            if (assetsReady) {
                                                proj = scene.add.image(spawnX, spawnY, 'fx_needle').setDepth(depth);
                                                if (scene.physics && scene.physics.add) try { scene.physics.add.existing(proj); } catch (e) {}
                                            } else {
                                                proj = scene.add.rectangle(spawnX, spawnY, 6, 2, 0xffeedd, 1).setDepth(depth);
                                                if (scene.physics && scene.physics.add) try { scene.physics.add.existing(proj); } catch (e) {}
                                            }
                                        } catch (e) { proj = null; }
                                    }
                                    if (!proj) return;
                                    // visually point toward landing point
                                    try {
                                        const angToTarget = Phaser.Math.Angle.Between(spawnX, spawnY, tx, ty);
                                        if (proj.setRotation) proj.setRotation(angToTarget);
                                    } catch (e) {}
                                    try { if (proj.setOrigin) proj.setOrigin(0.5, 0.5); } catch (e) {}
                                    try { if (proj.setDepth) proj.setDepth(depth); } catch (e) {}
                                    try { if (proj.setBlendMode) proj.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                                    try { if (proj.body) proj.body.allowGravity = false; } catch (e) {}

                                    // compute falling motion and land at (tx,ty) with an AOE on impact
                                    const vx = Phaser.Math.FloatBetween(-40, 40);
                                    const vy = Phaser.Math.Between(420, 680);
                                    try {
                                        // compute duration based on distance and vertical speed
                                        const dist = Math.max(1, ty - spawnY);
                                        const fallDuration = Math.max(120, Math.round((dist / (vy || 420)) * 1000));
                                        // ensure no lingering velocity
                                        try { if (proj.body && typeof proj.body.setVelocity === 'function') proj.body.setVelocity(0, 0); } catch (e) {}

                                        const impact = () => {
                                            try {
                                                const impactRadius = 32; // landing AOE
                                                const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren() : [];
                                                for (let ii = 0; ii < enemies.length; ii++) {
                                                    const e = enemies[ii];
                                                    if (!e || !safeGetData(e, 'alive')) continue;
                                                    try {
                                                        const d = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
                                                        if (d <= impactRadius) _dealPlayerDamage(scene, e, perNeedleDmg, '#fff0dd');
                                                    } catch (ee) {}
                                                }
                                                // visual impact pulse
                                                try {
                                                    const fx = scene.add.circle(tx, ty, impactRadius, 0xffeedd, 0.14).setDepth((scene.player && scene.player.depth ? scene.player.depth + 0.2 : 9.2));
                                                    if (scene.tweens) scene.tweens.add({ targets: fx, alpha: 0, scale: 1.2, duration: 320, ease: 'Cubic.easeOut', onComplete: () => { try { fx.destroy(); } catch (e) {} } });
                                                } catch (ee) {}
                                            } catch (e) {}
                                            try { if (proj && proj.destroy) proj.destroy(); } catch (e) {}
                                        };

                                        if (scene.tweens && typeof scene.tweens.add === 'function') {
                                            scene.tweens.add({ targets: proj, x: tx, y: ty, duration: fallDuration, ease: 'Linear', onComplete: impact });
                                        } else if (scene.time && scene.time.addEvent) {
                                            scene.time.addEvent({ delay: fallDuration, callback: impact });
                                        } else {
                                            setTimeout(impact, Math.max(180, fallDuration));
                                        }
                                    } catch (e) {}
                                    spawned++;
                        } catch (e) {}
                    } }) : null;

                    try { if (scene._showToast) scene._showToast('Needle Rain!', 700); } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'terror_form': {
                try {
                    // Toggle the visual Terror Form: swap player sprite/animations to terror variants
                    if (!scene.char) scene.char = {};
                    // recompute talent modifiers so manaCostPerSec and aura damage are available
                    try { if (typeof computeTalentModifiers === 'function') computeTalentModifiers(scene.char); } catch (e) {}
                    scene.char._terrorFormEnabled = !scene.char._terrorFormEnabled;
                    const on = !!scene.char._terrorFormEnabled;
                    try { switchPlayerTerrorAnims && switchPlayerTerrorAnims(scene, on); } catch (e) {}

                    // Always drain mana per second while Terror Form is active
                    if (on) {
                        // Setup a periodic event to drain mana
                        if (scene._terrorFormManaDrainEvent && scene._terrorFormManaDrainEvent.remove) {
                            try { scene._terrorFormManaDrainEvent.remove(false); } catch (e) {}
                        }
                        scene._terrorFormManaDrainEvent = null;
                        const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                        // Use the same drain rate as the aura (manaCostPerSec)
                        let manaCostPerSec = 0;
                        try {
                            const mval = tmods['manaCostPerSec'];
                            // Always use .flat if present, since computeTalentModifiers always outputs {flat, percent}
                            if (mval && typeof mval.flat === 'number') manaCostPerSec = Number(mval.flat) || 0;
                            else if (typeof mval === 'number') manaCostPerSec = Number(mval) || 0;
                            else if (mval && typeof mval.percent === 'number') manaCostPerSec = Number(mval.percent) || 0;
                            else manaCostPerSec = 0;
                        } catch (e) { manaCostPerSec = 0; }
                        if (manaCostPerSec > 0 && scene.time && typeof scene.time.addEvent === 'function') {
                            const tickMs = 500;
                            scene._terrorFormManaDrainEvent = scene.time.addEvent({ delay: tickMs, loop: true, callback: function() {
                                try {
                                    if (!scene.char._terrorFormEnabled) {
                                        if (scene._terrorFormManaDrainEvent && scene._terrorFormManaDrainEvent.remove) scene._terrorFormManaDrainEvent.remove(false);
                                        scene._terrorFormManaDrainEvent = null;
                                        return;
                                    }
                                    const drain = Math.max(0, manaCostPerSec * (tickMs / 1000));
                                    if (typeof scene.char.mana === 'number') {
                                        if (scene.char.mana >= drain) {
                                            scene.char.mana = Math.max(0, scene.char.mana - drain);
                                        } else {
                                            // Not enough mana: disable Terror Form
                                            scene.char._terrorFormEnabled = false;
                                            try { switchPlayerTerrorAnims && switchPlayerTerrorAnims(scene, false); } catch (e) {}
                                            if (scene._showToast) scene._showToast('Not enough mana: Terror Form disabled', 1200);
                                            if (scene._terrorFormManaDrainEvent && scene._terrorFormManaDrainEvent.remove) scene._terrorFormManaDrainEvent.remove(false);
                                            scene._terrorFormManaDrainEvent = null;
                                            // Also disable aura if it was enabled
                                            scene.char._terrorAuraEnabled = false;
                                            try { if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.destroy) scene._terrorAuraIndicator.destroy(); } catch (e) {}
                                            scene._terrorAuraIndicator = null;
                                            try { if (scene._auraEmitter) { scene._auraEmitter.destroy(); } } catch (e) {}
                                            scene._auraEmitter = null;
                                            try { if (scene._terrorAuraRange && scene._terrorAuraRange.destroy) scene._terrorAuraRange.destroy(); } catch (e) {}
                                            scene._terrorAuraRange = null;
                                            return;
                                        }
                                        if (scene._updateHUD) scene._updateHUD();
                                    }
                                } catch (e) {}
                            }});
                        }
                    } else {
                        // Remove mana drain event if disabling form
                        if (scene._terrorFormManaDrainEvent && scene._terrorFormManaDrainEvent.remove) {
                            try { scene._terrorFormManaDrainEvent.remove(false); } catch (e) {}
                        }
                        scene._terrorFormManaDrainEvent = null;
                        // Also disable aura if it was enabled
                        scene.char._terrorAuraEnabled = false;
                        try { if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.destroy) scene._terrorAuraIndicator.destroy(); } catch (e) {}
                        scene._terrorAuraIndicator = null;
                        try { if (scene._auraEmitter) { scene._auraEmitter.destroy(); } } catch (e) {}
                        scene._auraEmitter = null;
                        try { if (scene._terrorAuraRange && scene._terrorAuraRange.destroy) scene._terrorAuraRange.destroy(); } catch (e) {}
                        scene._terrorAuraRange = null;
                    }

                    // If the terror_form talent has an aura component (defined by terrorAuraDamage),
                    // enable the aura when entering form and disable when leaving.
                    try {
                        const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                        const auraPct = Number((tmods['terrorAuraDamage'] && (tmods['terrorAuraDamage'].percent || tmods['terrorAuraDamage'].flat)) || 0);
                        if (auraPct > 0 && on) {
                            scene.char._terrorAuraEnabled = true;
                            // small indicator and range circle created/maintained by the aura monitor
                            try { if (scene._showToast) scene._showToast('Terror Form & Aura enabled', 900); } catch (e) {}
                        } else if (!on) {
                            // turn off aura when leaving form
                            scene.char._terrorAuraEnabled = false;
                            try { if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.destroy) scene._terrorAuraIndicator.destroy(); } catch (e) {}
                            scene._terrorAuraIndicator = null;
                            try { if (scene._auraEmitter) { scene._auraEmitter.destroy(); } } catch (e) {}
                            scene._auraEmitter = null;
                            try { if (scene._terrorAuraRange && scene._terrorAuraRange.destroy) scene._terrorAuraRange.destroy(); } catch (e) {}
                            scene._terrorAuraRange = null;
                            try { if (scene._showToast) scene._showToast('Terror Form disabled', 700); } catch (e) {}
                        }
                    } catch (e) {}

                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            case 'terror_aura': {
                try {
                    // Toggle a sustained aura on the character. The aura monitor (registered elsewhere)
                    // observes talent modifiers and will create particle emitters. Here we flip an
                    // explicit enabled flag so the scene can charge mana per second or show HUD state.
                    try {
                        if (!scene.char) scene.char = {};
                        scene.char._terrorAuraEnabled = !scene.char._terrorAuraEnabled;
                        const on = !!scene.char._terrorAuraEnabled;
                        try { if (scene._showToast) scene._showToast(on ? 'Terror Aura enabled' : 'Terror Aura disabled', 900); } catch (e) {}
                        // optionally create a small indicator on the player when enabled
                        if (on) {
                            try { scene._terrorAuraIndicator = scene.add.circle(scene.player.x, scene.player.y, 10, 0xff88aa, 0.12).setDepth(9); if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.setBlendMode) scene._terrorAuraIndicator.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                        } else {
                            try { if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.destroy) scene._terrorAuraIndicator.destroy(); } catch (e) {}
                            scene._terrorAuraIndicator = null;
                        }
                    } catch (e) {}
                    markActivationSuccess(scene, tid);
                } catch (e) {}
                break;
            }
            default: break;
        }
        // Post-activation: Occult Resurgence - chance to reset a cooldown on another learned active
        try {
            try {
                const success = !!(scene && scene._talentActivationState && scene._talentActivationState.success);
                if (success && scene && scene.char) {
                    const tmodsPost = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                    const resetPct = Math.max(0, Number((tmodsPost['cooldownResetChance'] && (tmodsPost['cooldownResetChance'].percent || tmodsPost['cooldownResetChance'].flat)) || 0));
                    if (resetPct > 0 && (Math.random() * 100) < resetPct) {
                        // choose a learned active to refresh (prefer skillBar slots, then learnedActives)
                        const candidates = new Set();
                        try {
                            if (Array.isArray(scene.char.talents && scene.char.talents.skillBar ? scene.char.talents.skillBar : [])) {
                                (scene.char.talents.skillBar || []).forEach(s => { if (s) candidates.add(s); });
                            }
                        } catch (e) {}
                        try { if (Array.isArray(scene.char.learnedActives)) scene.char.learnedActives.forEach(a => { if (a && a.id) candidates.add(a.id); }); } catch (e) {}
                        // remove the talent we just used
                        try { if (candidates.has(tid)) candidates.delete(tid); } catch (e) {}
                        const arr = Array.from(candidates).filter(x => x);
                        if (arr && arr.length) {
                            const pick = arr[Math.floor(Math.random() * arr.length)];
                            try {
                                if (!scene.char.talents) scene.char.talents = { cooldowns: {} };
                                if (!scene.char.talents.cooldowns) scene.char.talents.cooldowns = {};
                                // clear cooldown so UI and activations treat it as ready
                                scene.char.talents.cooldowns[pick] = Date.now();
                                try { if (scene._showToast) scene._showToast('Occult Resurgence: cooldown refreshed', 1100); } catch (e) {}
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) {}
        } catch (e) {}
    } catch (e) { /* swallow */ }
}

// Apply buffs that trigger when stealth ends (either by timeout or by breaking on attack)
function applyPostStealthEffects(scene) {
    try {
        if (!scene || !scene.char) return;
        const now = Date.now();
        const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
        const dodgePct = Number((tmods['postStealthDodge'] && (tmods['postStealthDodge'].percent || tmods['postStealthDodge'].flat)) || 0);
        const hastePct = Number((tmods['postStealthHaste'] && (tmods['postStealthHaste'].percent || tmods['postStealthHaste'].flat)) || 0);
        const durMs = 3000; // 3s as per talent description
        if (dodgePct > 0) {
            try { scene.char._postStealthDodge = { percent: dodgePct, expiresAt: now + durMs }; } catch (e) {}
        }
        if (hastePct > 0) {
            try {
                scene.char._postStealthHaste = { percent: hastePct, expiresAt: now + durMs };
                // apply immediate attack cooldown reduction; if no explicit cooldown is set, derive base from effective stats
                try {
                    const eff = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                        ? window.__shared_ui.stats.effectiveStats(scene.char)
                        : null;
                    const baseCd = (typeof scene.attackCooldown === 'number')
                        ? scene.attackCooldown
                        : ((eff && typeof eff.attackSpeedMs === 'number') ? eff.attackSpeedMs : 520);
                    if (typeof scene.attackCooldown === 'number') {
                        scene._postStealthPrevAttackCooldown = scene._postStealthPrevAttackCooldown || scene.attackCooldown;
                    } else {
                        scene._postStealthPrevAttackCooldown = undefined;
                    }
                    const newCd = Math.max(60, Math.round(baseCd / (1 + (hastePct / 100))));
                    scene.attackCooldown = newCd;
                } catch (e) {}
                // schedule restore of attack cooldown when haste expires
                try {
                    if (scene.time && typeof scene.time.addEvent === 'function') {
                        scene.time.addEvent({ delay: durMs, callback: () => {
                            try {
                                try { scene.char._postStealthHaste = null; } catch (e) {}
                                if (typeof scene._postStealthPrevAttackCooldown !== 'undefined') {
                                    try { scene.attackCooldown = scene._postStealthPrevAttackCooldown; } catch (e) {}
                                } else {
                                    // no explicit previous cooldown; clear override so base (effectiveStats) is used again
                                    try { scene.attackCooldown = null; } catch (e) {}
                                }
                                scene._postStealthPrevAttackCooldown = null;
                            } catch (e) {}
                        } });
                    }
                } catch (e) {}
            } catch (e) {}
        }
        if ((dodgePct > 0 || hastePct > 0) && scene._showToast) {
            try { scene._showToast('Evasive Flourish active', 800); } catch (e) {}
        }
        // cleanup stealth movement trackers (we're no longer stealthed)
        try { scene.char._lastStealthPos = null; scene.char._stealthAccum = 0; } catch (e) {}
    } catch (e) {}
}

export function registerTalentHandlers(scene) {
    if (!scene || !scene.events) return;
    if (scene._talentHandlerRegistered) return;
    const bound = _talentActivatedHandler.bind(scene);
    scene.events.on('talentActivated', bound);
    scene._talentHandler = bound;
    scene._talentHandlerRegistered = true;
    // bind global skill keys for convenience (talent key is handled by scene-level keys)
    try {
        if (typeof bindSkillBarKeys === 'function') {
            bindSkillBarKeys(scene);
            try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugKeyBind) console.debug('[registerTalentHandlers] bindSkillBarKeys called for scene', scene && scene.scene && scene.scene.key); } catch (e) {}
        }
    } catch (e) {}
    // ensure the skill bar HUD exists and is rendered for this scene (even if no talents assigned)
    try {
        if (typeof refreshSkillBarHUD === 'function') refreshSkillBarHUD(scene);
        try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugKeyBind) console.debug('[registerTalentHandlers] refreshSkillBarHUD called for scene', scene && scene.scene && scene.scene.key); } catch (e) {}
    } catch (e) {}
    // passive regen tick: apply hp/mana regen per second from effectiveStats (non-safe zone regen)
    try {
        if (!scene._passiveRegenEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._passiveRegenEvent = scene.time.addEvent({ delay: 1000, loop: true, callback: function() {
                try {
                    const char = scene.char;
                    if (!char) return;
                    const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(char) : null;
                    if (!eff) return;
                    // ensure stored maxima exist
                    char.maxhp = (typeof char.maxhp === 'number') ? char.maxhp : (eff.maxhp || char.maxhp || 1);
                    char.maxmana = (typeof char.maxmana === 'number') ? char.maxmana : (eff.maxmana || char.maxmana || 0);
                    try { char.hp = (typeof char.hp === 'number') ? Math.min(char.maxhp, char.hp + (eff.hpRegen || 0)) : Math.min(char.maxhp, (eff.maxhp || char.maxhp || 1)); } catch (e) {}
                    try { char.mana = (typeof char.mana === 'number') ? Math.min(char.maxmana, char.mana + (eff.manaRegen || 0)) : Math.min(char.maxmana, (eff.maxmana || char.maxmana || 0)); } catch (e) {}
                    try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {}
                    // Mana Shield passive regen: only regen when out of combat
                    try {
                        const tmods = (char && char._talentModifiers) ? char._talentModifiers : {};
                        const manaShieldPct = Math.max(0, Number((tmods['manaShieldStrength'] && (tmods['manaShieldStrength'].percent || tmods['manaShieldStrength'].flat)) || 0));
                        const manaShieldRegen = Math.max(0, Number((tmods['manaShieldRegenPerSec'] && (tmods['manaShieldRegenPerSec'].flat || tmods['manaShieldRegenPerSec'].percent)) || 0));
                        if (manaShieldPct > 0) {
                            const maxShield = Math.max(0, Math.round((char.maxmana || 0) * (manaShieldPct / 100)));
                            if (!char._manaShield) char._manaShield = { current: 0, max: maxShield };
                            else char._manaShield.max = maxShield;
                            // clamp current
                            char._manaShield.current = Math.max(0, Math.min(char._manaShield.max, Number(char._manaShield.current || 0)));
                            // only regen when out of combat (5s threshold)
                            try {
                                const now = Date.now();
                                const out = (!scene._lastCombatAt) ? true : ((now - (scene._lastCombatAt || 0)) > 5000);
                                if (out && manaShieldRegen > 0) {
                                    char._manaShield.current = Math.min(char._manaShield.max, (Number(char._manaShield.current || 0) + manaShieldRegen));
                                    try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {}
                                }
                            } catch (e) {}
                        }
                    } catch (e) {}
                } catch (e) {}
            } });
        }
    } catch (e) {}
    // Stealth movement tracker for Silent Steps: accumulate points per X pixels moved while stealthed
    try {
        if (!scene._stealthMovementEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._stealthMovementEvent = scene.time.addEvent({ delay: 180, loop: true, callback: function() {
                try {
                    if (!scene || !scene.player || !scene.char) return;
                    const nowTs = Date.now();
                    // only accumulate while shadowstep stealth is active
                    if (!(scene.char._shadowstep && scene.char._shadowstep.stealth && scene.char._shadowstep.expiresAt && scene.char._shadowstep.expiresAt > nowTs)) return;
                    // require the talent to be learned (silent_steps)
                    const rank = _getTalentRank && _getTalentRank(scene.char, 'silent_steps') ? _getTalentRank(scene.char, 'silent_steps') : 0;
                    if (!rank || rank <= 0) return;
                    try {
                        // track last position and accumulate distance
                        const last = scene.char._lastStealthPos || { x: scene.player.x, y: scene.player.y };
                        const dx = (scene.player.x || 0) - (last.x || 0);
                        const dy = (scene.player.y || 0) - (last.y || 0);
                        const moved = Math.sqrt(dx*dx + dy*dy) || 0;
                        let accum = Number(scene.char._stealthAccum || 0) + moved;
                        const per = 20; // px per point
                        const gained = Math.floor(accum / per);
                        if (gained > 0) {
                            // add gained stealth points but cap at 100
                            scene.char._stealthPoints = Math.min(100, Math.max(0, Number(scene.char._stealthPoints || 0) + gained));
                            accum = accum % per;
                            try { if (scene._showToast) scene._showToast(`+${gained} Stealth Point(s)`, 600); } catch (e) {}
                        }
                        scene.char._stealthAccum = accum;
                        scene.char._lastStealthPos = { x: scene.player.x, y: scene.player.y };
                    } catch (e) {}
                } catch (e) {}
            } });
        }
    } catch (e) {}
    // Standing monitor for Marksman Focus: if player stands still for ~1s, grant Eagle Shot bonuses
    try {
        if (!scene._standingMonitorEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._standingMonitorEvent = scene.time.addEvent({ delay: 200, loop: true, callback: function() {
                try {
                    if (!scene || !scene.player || !scene.char) return;
                    const rank = _getTalentRank && _getTalentRank(scene.char, 'marksman_focus') ? _getTalentRank(scene.char, 'marksman_focus') : 0;
                    if (!rank || rank <= 0) {
                        // ensure cleared
                        scene.char._marksmanFocusBonuses = null;
                        scene.char._standingAccum = 0;
                        scene.char._lastStandPos = null;
                        return;
                    }
                    const last = scene.char._lastStandPos || { x: scene.player.x, y: scene.player.y };
                    const dx = (scene.player.x || 0) - (last.x || 0);
                    const dy = (scene.player.y || 0) - (last.y || 0);
                    const moved = Math.sqrt(dx*dx + dy*dy) || 0;
                    // small movement tolerance (pixel jitter)
                    if (moved <= 4) {
                        scene.char._standingAccum = (Number(scene.char._standingAccum || 0) + 200);
                    } else {
                        scene.char._standingAccum = 0;
                    }
                    scene.char._lastStandPos = { x: scene.player.x, y: scene.player.y };
                    if (Number(scene.char._standingAccum || 0) >= 1000) {
                        // compute bonuses from talent modifiers
                        const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                        const critChanceBonus = Number((tmods['eagleCritChance'] && (tmods['eagleCritChance'].percent || tmods['eagleCritChance'].flat)) || 0);
                        const critDmgBonus = Number((tmods['eagleCritDmg'] && (tmods['eagleCritDmg'].percent || tmods['eagleCritDmg'].flat)) || 0);
                        scene.char._marksmanFocusBonuses = { critChance: critChanceBonus, critDmg: critDmgBonus };
                        // mark as standing for glyphic_anchor (standing damage reduction)
                        try {
                            scene.char._isStanding = true;
                            const standingDR = Math.max(0, Number((tmods['standingDR'] && (tmods['standingDR'].percent || tmods['standingDR'].flat)) || 0));
                            scene.char._standingDRPercent = standingDR;
                        } catch (e) { scene.char._isStanding = true; }
                    } else {
                        scene.char._marksmanFocusBonuses = null;
                        try { scene.char._isStanding = false; scene.char._standingDRPercent = null; } catch (e) {}
                    }
                } catch (e) {}
            } });
        }
    } catch (e) {}
    // periodic HUD updater for cooldown overlays (tick several times per second so remaining seconds update)
    try {
        if (!scene._skillBarCooldownEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._skillBarCooldownEvent = scene.time.addEvent({ delay: 250, loop: true, callback: function() {
                try {
                    // refreshSkillBarHUD will rebuild the skill bar DOM showing current cooldown remaining
                    try { if (typeof refreshSkillBarHUD === 'function') refreshSkillBarHUD(scene); } catch (e) {}
                } catch (e) {}
            } });
        }
    } catch (e) {}
    // Buff HUD updater: refresh the persistent buff display
    try {
        if (!scene._buffMonitorEvent && scene.time && typeof scene.time.addEvent === 'function') {
            // create HUD immediately
            try { sharedCreateBuffHUD(scene); } catch (e) {}
            scene._buffMonitorEvent = scene.time.addEvent({ delay: 300, loop: true, callback: function() {
                try { sharedUpdateBuffHUD(scene); } catch (e) {}
            } });
        }
    } catch (e) {}
    // Aura monitor: create/destroy icy aura emitter around player when terror_aura is present
    try {
        if (!scene._auraMonitorEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._auraMonitorEvent = scene.time.addEvent({ delay: 500, loop: true, callback: function() {
                try {
                    if (!scene || !scene.char) return;
                    const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                    const auraPct = Number((tmods['terrorAuraDamage'] && (tmods['terrorAuraDamage'].percent || tmods['terrorAuraDamage'].flat)) || 0);
                    const enabled = !!(scene.char && scene.char._terrorAuraEnabled);
                    if (auraPct > 0 && enabled) {
                        // ensure emitter exists
                        if (!scene._auraEmitter && _supportsLegacyParticles(scene)) {
                            try {
                                ensureAuraAssets(scene);
                                if (scene.add && scene.add.particles && scene.textures && scene.textures.exists('fx_aura_ice')) {
                                    const p = scene.add.particles('fx_aura_ice');
                                    try { p.setDepth(8); } catch (e) {}
                                    const emitter = p.createEmitter({
                                        lifespan: { min: 700, max: 1200 },
                                        speed: { min: 6, max: 18 },
                                        alpha: { start: 0.5, end: 0 },
                                        scale: { start: 0.9, end: 0.15 },
                                        quantity: 1,
                                        frequency: 120,
                                        rotate: { min: 0, max: 360 }
                                    });
                                    try { emitter.startFollow && emitter.startFollow(scene.player); } catch (e) { p._emitter = emitter; }
                                    scene._auraEmitter = p;
                                    scene._auraEmitter._emitter = emitter;
                                }
                            } catch (e) {}
                        }
                        // ensure a persistent range indicator exists and follow the player smoothly
                        try {
                            const auraRadius = 96;
                            if (!scene._terrorAuraRange && scene.add) {
                                try {
                                    scene._terrorAuraRange = scene.add.circle(scene.player.x, scene.player.y, auraRadius, 0xff88aa, 0.06).setDepth(4);
                                    if (scene._terrorAuraRange && scene._terrorAuraRange.setBlendMode) scene._terrorAuraRange.setBlendMode(Phaser.BlendModes.ADD);
                                } catch (e) { scene._terrorAuraRange = null; }
                            }
                            // also ensure a small indicator (close to player) exists for clarity
                            if (!scene._terrorAuraIndicator && scene.add) {
                                try { scene._terrorAuraIndicator = scene.add.circle(scene.player.x, scene.player.y, 10, 0xff88aa, 0.12).setDepth(9); if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.setBlendMode) scene._terrorAuraIndicator.setBlendMode(Phaser.BlendModes.ADD); } catch (e) { scene._terrorAuraIndicator = null; }
                            }
                            // register a per-frame follow so the visuals do not stutter (use scene update event)
                            try {
                                if (!scene._terrorAuraFollow) {
                                    scene._terrorAuraFollow = function() {
                                        try {
                                            if (scene._terrorAuraRange && scene.player) scene._terrorAuraRange.setPosition(scene.player.x, scene.player.y);
                                            if (scene._terrorAuraIndicator && scene.player) scene._terrorAuraIndicator.setPosition(scene.player.x, scene.player.y);
                                            // Update invert circle shader each frame for smooth tracking (exclude player)
                                            try {
                                                const hole = Math.max(12, Math.min(28, (scene.player?.displayWidth || 32) * 0.35));
                                                updateInvertCircle(scene, auraRadius, 22, 1.0, hole);
                                            } catch (e) {}
                                        } catch (e) {}
                                    };
                                    try { if (scene.events && scene.events.on) scene.events.on('update', scene._terrorAuraFollow); } catch (e) {}
                                }
                                // do one immediate pos sync in case update won't run for a frame
                                try { if (scene._terrorAuraRange && scene.player) scene._terrorAuraRange.setPosition(scene.player.x, scene.player.y); } catch (e) {}
                                try { if (scene._terrorAuraIndicator && scene.player) scene._terrorAuraIndicator.setPosition(scene.player.x, scene.player.y); } catch (e) {}
                                // Ensure the invert circle effect is enabled and synced immediately
                                try {
                                    const hole = Math.max(12, Math.min(28, (scene.player?.displayWidth || 32) * 0.35));
                                    enableInvertCircle(scene, auraRadius, 22, 1.0, hole);
                                    updateInvertCircle(scene, auraRadius, 22, 1.0, hole);
                                } catch (e) {}
                            } catch (e) {}
                        } catch (e) {}
                        // drain mana per tick if manaCostPerSec talent present
                        try {
                            // resolve manaCostPerSec robustly: allow numeric or object with .flat/.percent
                            let manaCostPerSec = 0;
                            try {
                                const mval = tmods['manaCostPerSec'];
                                if (typeof mval === 'number') manaCostPerSec = Number(mval) || 0;
                                else if (mval && (typeof mval.flat === 'number' || typeof mval.percent === 'number')) manaCostPerSec = Number(mval.flat != null ? mval.flat : mval.percent) || 0;
                                else manaCostPerSec = Number((mval && (mval.flat || mval.percent)) || 0) || 0;
                            } catch (e) { manaCostPerSec = 0; }
                            if (manaCostPerSec > 0 && scene.char) {
                                const tickSec = (scene && scene._auraMonitorEvent && typeof scene._auraMonitorEvent.delay === 'number') ? (scene._auraMonitorEvent.delay / 1000) : 0.5;
                                const drain = Math.max(0, manaCostPerSec * tickSec);
                                if (typeof scene.char.mana === 'number') {
                                    if (scene.char.mana >= drain) {
                                        scene.char.mana = Math.max(0, scene.char.mana - drain);
                                    } else {
                                        // Not enough mana: disable aura and cleanup
                                        try { scene.char._terrorAuraEnabled = false; } catch (e) {}
                                        // remove update follower
                                        try { if (scene._terrorAuraFollow && scene.events && scene.events.off) scene.events.off('update', scene._terrorAuraFollow); } catch (e) {}
                                        scene._terrorAuraFollow = null;
                                        try { if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.destroy) scene._terrorAuraIndicator.destroy(); } catch (e) {}
                                        scene._terrorAuraIndicator = null;
                                        try { if (scene._auraEmitter) { scene._auraEmitter.destroy(); } } catch (e) {}
                                        scene._auraEmitter = null;
                                        try { if (scene._terrorAuraRange && scene._terrorAuraRange.destroy) scene._terrorAuraRange.destroy(); } catch (e) {}
                                        scene._terrorAuraRange = null;
                                        try { if (scene._showToast) scene._showToast('Not enough mana: Terror Aura disabled', 1200); } catch (e) {}
                                        // disable invert circle effect
                                        try { disableInvertCircle(scene); } catch (e) {}
                                    }
                                    try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {}
                                }
                            }
                        } catch (e) {}
                    } else {
                        // remove emitter and visuals if present
                        try { if (scene._terrorAuraFollow && scene.events && scene.events.off) scene.events.off('update', scene._terrorAuraFollow); } catch (e) {}
                        scene._terrorAuraFollow = null;
                        if (scene._auraEmitter) {
                            try { scene._auraEmitter.destroy(); } catch (e) {}
                            scene._auraEmitter = null;
                        }
                        try { if (scene._terrorAuraIndicator && scene._terrorAuraIndicator.destroy) scene._terrorAuraIndicator.destroy(); } catch (e) {}
                        scene._terrorAuraIndicator = null;
                        try { if (scene._terrorAuraRange && scene._terrorAuraRange.destroy) scene._terrorAuraRange.destroy(); } catch (e) {}
                        scene._terrorAuraRange = null;
                        // Also disable the invert circle effect
                        try { disableInvertCircle(scene); } catch (e) {}
                    }
                } catch (e) {}
            } });
        }
    } catch (e) {}
    // bleed DOT tick processor: apply bleed damage per tick stored on enemies
    try {
        if (!scene._bleedTickEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._bleedTickEvent = scene.time.addEvent({ delay: 300, loop: true, callback: function() {
                try {
                    const now = Date.now();
                    const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren() : [];
                    for (let i = 0; i < enemies.length; i++) {
                        const e = enemies[i];
                        if (!e || !safeGetData(e, 'alive')) continue;
                        const dotKeys = ['bleed', 'terror', 'poison'];
                        for (let k = 0; k < dotKeys.length; k++) {
                            const key = dotKeys[k];
                            let b = null;
                            try { b = safeGetData(e, key); } catch (e2) { b = null; }
                            if (!b) continue;
                            try {
                                if (b.expiresAt && b.expiresAt <= now) { safeSetData(e, key, null); continue; }
                                if (b.nextTick && b.nextTick <= now) {
                                    // apply damage without crit/lifesteal
                                    try {
                                        const colorMap = { bleed: '#ff6666', terror: '#ff88aa', poison: '#66ff66' };
                                        const dmgColor = colorMap[key] || '#ff88aa';
                                        _applyDamageToEnemy(scene, e, b.amountPerTick, dmgColor);
                                    } catch (ee) {}
                                    b.nextTick = now + (b.tickMs || 1000);
                                    safeSetData(e, key, b);
                                    // small pop visual: prefer ice-pop particles when available (fx_ice_pop), fallback to simple circle
                                    try {
                                        if (_supportsLegacyParticles(scene) && scene && scene.textures && scene.textures.exists && scene.textures.exists('fx_ice_pop') && scene.add && scene.add.particles) {
                                            try {
                                                const parts = scene.add.particles('fx_ice_pop');
                                                const em = parts.createEmitter({
                                                    lifespan: { min: 220, max: 360 },
                                                    speed: { min: 28, max: 72 },
                                                    scale: { start: 0.9, end: 0.2 },
                                                    quantity: 8,
                                                    rotate: { min: 0, max: 360 }
                                                });
                                                try { if (em && typeof em.explode === 'function') em.explode(8, e.x, e.y - 6); }
                                                catch (ee) { }
                                                // destroy particle system shortly after burst to avoid buildup
                                                try { if (scene.time && scene.time.addEvent) scene.time.addEvent({ delay: 480, callback: () => { try { parts.destroy(); } catch (e) {} } }); }
                                                catch (ee) {}
                                            } catch (ee) {
                                                // fallback
                                                const circleColorMap = { bleed: 0xff6666, terror: 0xff88aa, poison: 0x66ff66 };
                                                const circColor = circleColorMap[key] || 0xff88aa;
                                                const p = scene.add.circle(e.x, e.y - 6, 6, circColor, 0.24).setDepth((e.depth || 7) + 0.2);
                                                if (scene.tweens) scene.tweens.add({ targets: p, alpha: 0, scale: 1.2, duration: 260, onComplete: () => { try { p.destroy(); } catch (e) {} } });
                                            }
                                        } else {
                                            const circleColorMap = { bleed: 0xff6666, terror: 0xff88aa, poison: 0x66ff66 };
                                            const circColor = circleColorMap[key] || 0xff88aa;
                                            const p = scene.add.circle(e.x, e.y - 6, 6, circColor, 0.24).setDepth((e.depth || 7) + 0.2);
                                            if (scene.tweens) scene.tweens.add({ targets: p, alpha: 0, scale: 1.2, duration: 260, onComplete: () => { try { p.destroy(); } catch (e) {} } });
                                        }
                                    } catch (ee) {}
                                }
                            } catch (e3) {}
                        }
                    }
                } catch (e) {}
            } });
        }
    } catch (e) {}
    // Unholy Frenzy periodic controller: triggers frenzy buff based on talent cooldown scaling
    try {
        if (!scene._frenzyEvent && scene.time && typeof scene.time.addEvent === 'function') {
            scene._frenzyEvent = scene.time.addEvent({ delay: 500, loop: true, callback: function() {
                try {
                    if (!scene || !scene.char) return;
                    const now = Date.now();
                    const tmods = (scene.char && scene.char._talentModifiers) ? scene.char._talentModifiers : {};
                    const cooldownSec = Number((tmods['frenzyCooldownSeconds'] && (tmods['frenzyCooldownSeconds'].flat || tmods['frenzyCooldownSeconds'].percent)) || 30);
                    if (!scene._frenzyNextTime) scene._frenzyNextTime = now + Math.max(1000, Math.round(cooldownSec * 1000));

                    // start frenzy when the timer elapses
                    if (now >= (scene._frenzyNextTime || 0)) {
                        const buffPct = Number((tmods['frenzyAttackSpeed'] && (tmods['frenzyAttackSpeed'].percent || tmods['frenzyAttackSpeed'].flat)) || 0);
                        if (buffPct > 0 && !scene._frenzyActive) {
                            scene._frenzyActive = true;
                            scene._prevAttackCooldown = (typeof scene.attackCooldown === 'number') ? scene.attackCooldown : 520;
                            const newCd = Math.max(60, Math.round(scene._prevAttackCooldown / (1 + (buffPct / 100))));
                            scene.attackCooldown = newCd;
                            scene._frenzyExpiresAt = now + 8000;
                            try { if (scene._showToast) scene._showToast('Unholy Frenzy!', 900); } catch (e) {}
                            try { scene._frenzyFx = spawnArcaneSigil(scene, scene.player.x, scene.player.y, 28, { depth: 9, fillColor: 0x662222 }); } catch (e) {}
                        }
                        scene._frenzyNextTime = now + Math.max(1000, Math.round(cooldownSec * 1000));
                    }

                    // check for expiry
                    if (scene._frenzyActive && scene._frenzyExpiresAt && now >= scene._frenzyExpiresAt) {
                        scene._frenzyActive = false;
                        try { if (typeof scene._prevAttackCooldown !== 'undefined') scene.attackCooldown = scene._prevAttackCooldown; } catch (e) {}
                        scene._frenzyExpiresAt = null;
                        try { if (scene._frenzyFx && typeof scene._frenzyFx.destroy === 'function') scene._frenzyFx.destroy(); } catch (e) {}
                        try { if (scene._showToast) scene._showToast('Frenzy ended', 700); } catch (e) {}
                    }
                } catch (e) {}
            } });
        }
    } catch (e) {}
}

export function unregisterTalentHandlers(scene) {
    if (!scene || !scene.events) return;
    if (!scene._talentHandlerRegistered) return;
    try { scene.events.off('talentActivated', scene._talentHandler); } catch (e) {}
    scene._talentHandler = null;
    scene._talentHandlerRegistered = false;
    try {
        if (typeof unbindSkillBarKeys === 'function') unbindSkillBarKeys(scene);
        try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugKeyBind) console.debug('[unregisterTalentHandlers] unbindSkillBarKeys called for scene', scene && scene.scene && scene.scene.key); } catch (e) {}
    } catch (e) {}
    try { if (typeof unbindTalentKey === 'function') unbindTalentKey(scene); } catch (e) {}
    // remove periodic HUD updater if present
    try { if (scene._skillBarCooldownEvent && scene._skillBarCooldownEvent.remove) { scene._skillBarCooldownEvent.remove(false); } scene._skillBarCooldownEvent = null; } catch (e) {}
    // also remove passive regen event if present
    try { if (scene._passiveRegenEvent && scene._passiveRegenEvent.remove) { scene._passiveRegenEvent.remove(false); } scene._passiveRegenEvent = null; } catch (e) {}
    // remove bleed tick event if present
    try { if (scene._bleedTickEvent && scene._bleedTickEvent.remove) { scene._bleedTickEvent.remove(false); } scene._bleedTickEvent = null; } catch (e) {}
    // remove stealth movement tracker
    try { if (scene._stealthMovementEvent && scene._stealthMovementEvent.remove) { scene._stealthMovementEvent.remove(false); } scene._stealthMovementEvent = null; } catch (e) {}
    // remove standing monitor for marksman focus
    try { if (scene._standingMonitorEvent && scene._standingMonitorEvent.remove) { scene._standingMonitorEvent.remove(false); } scene._standingMonitorEvent = null; } catch (e) {}
    // remove frenzy controller if present and restore attack cooldown
    try {
        if (scene._frenzyEvent && scene._frenzyEvent.remove) { scene._frenzyEvent.remove(false); }
        scene._frenzyEvent = null;
        if (scene._frenzyActive) {
            try { if (typeof scene._prevAttackCooldown !== 'undefined') scene.attackCooldown = scene._prevAttackCooldown; } catch (e) {}
            scene._frenzyActive = false;
        }
        try { if (scene._frenzyFx && typeof scene._frenzyFx.destroy === 'function') scene._frenzyFx.destroy(); } catch (e) {}
        scene._frenzyFx = null;
        scene._frenzyExpiresAt = null;
        scene._frenzyNextTime = null;
        scene._prevAttackCooldown = null;
    } catch (e) {}
}

export default {
    combatMixin,
    applyCombatMixin,
    initAutoCombat,
    teardownAutoCombat
};
