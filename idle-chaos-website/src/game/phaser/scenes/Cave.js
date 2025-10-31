import ORE_DEFS from '../data/ores.js';
import { onSkillLevelUp, ensureCharTalents } from '../data/talents.js';
import { applySafeZoneRegen } from './shared/stats.js';
import { updateQuestProgress, getQuestById, canStartQuest, startQuest, checkQuestCompletion, completeQuest, getAvailableQuests } from '../data/quests.js';
import { createPlayer } from '../shared/playerFactory.js';
import { buildThemedFloor, applyAmbientFx, cleanupAmbientFx } from './shared/environment.js';
import { updateSmoothPlayerMovement, playDirectionalAnimation, updateDepthForTopDown } from './shared/movement.js';
import { setCircleCentered } from '../shared/physicsHelpers.js';
import { setSceneKey, setSceneActivity, clearActivity } from '../state/gameState.js';
import { applyCombatMixin } from './shared/combat.js';
import { attach as attachCleanup, addTimeEvent } from '../shared/cleanupManager.js';
// Cave scene: HUD similar to Town, WASD+E controls, right-side portal, one mining node for testing
export class Cave extends Phaser.Scene {
    constructor() {
        super('Cave');
    }

    preload() {
        this.load.image('cave_bg', 'assets/cave_bg.png');
        this.load.image('tin', 'assets/tin.png');
        this.load.image('copper', 'assets/copper.png');
        // ore defs (used for procedural generation)
        try { if (typeof ORE_DEFS === 'undefined') { /* ensure import will work at module scope */ } } catch (e) {}
        this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('furnace', 'assets/furnace.png', { frameWidth: 64, frameHeight: 96 });
    }

    create() {
        // Ensure cleanup manager is attached early to track disposables in this scene
        try { attachCleanup(this); } catch (e) {}
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        // responsive centers
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        try {
            this._caveFloor = buildThemedFloor(this, 'cave');
        } catch (e) {
            this.cameras.main.setBackgroundColor('#2b2a28');
    }
        applyAmbientFx(this, 'cave');

        this.add.text(centerX, 32, 'The Cave', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

    // Player spawn (allow restoring last position via spawnX/spawnY)
    // For top-down cave: spawn near left-center by default unless overridden
    const spawnX = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnX) || Math.max(120, this.scale.width * 0.18);
    const spawnY = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.spawnY) || Math.round(this.scale.height * 0.55);
    // create player via centralized helper; Cave uses default collider sizing from createPlayer
    this.player = createPlayer(this, spawnX, spawnY, 'dude_idle');
    // Debug: log animation lifecycle events for this player to diagnose why mine animations end early
    try {
        if (this.player && this.player.on) {
            this.player.on('animationstart', (anim, frame) => {
                try { console.debug && console.debug('player animationstart', { key: anim && anim.key, frame: frame && frame.index }); } catch (e) {}
            });
            this.player.on('animationcomplete', (anim, frame) => {
                try { console.debug && console.debug('player animationcomplete', { key: anim && anim.key, frame: frame && frame.index }); } catch (e) {}
            });
        }
    } catch (e) {}

    // Player animations are registered globally in Boot (walk/run/idle/mine). Scenes use those keys.

    // Input: WASD + E + I (inventory) + U (equipment) + X (stats) - centralized
    if (window && window.__shared_keys && window.__shared_keys.attachCommonKeys) this.keys = window.__shared_keys.attachCommonKeys(this);

        // Character data from scene settings
        this.char = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.character) || {};
        if (!this.char.mining) this.char.mining = { level: 1, exp: 0, expToLevel: 100 };
        if (!this.char.inventory) this.char.inventory = [];
        setSceneKey('Cave');
        setSceneActivity(this, 'idle', { silent: true, source: 'scene-init' });
    // Reconcile equipment bonuses through shared helper so UI shows effective stats
    try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses(this); } catch (e) { /* ignore */ }

        // HUD (same condensed HUD as Town, without mining bar)
    if (window && window.__hud_shared && window.__hud_shared.createHUD) window.__hud_shared.createHUD(this); else this._createHUD();
    // atmospheric overlays (fog, embers, shadow, vignette, fireflies)
    try { if (window && window.__overlays_shared && window.__overlays_shared.createAtmosphericOverlays) { this._overlays = window.__overlays_shared.createAtmosphericOverlays(this, { idPrefix: 'cave', zIndexBase: 120, layers: ['fireflies'] }); } } catch (e) { this._overlays = null; }
    try { ensureCharTalents && ensureCharTalents(this.char); } catch (e) {}
    this._startSafeZoneRegen();

    // Right-side portal to return to Town; requires proximity + E
    // move portal a bit left so it doesn't hug the wall too tightly
    const portalX = Math.max(120, this.scale.width - 120);
    // position portal toward right-center of the cave
    const portalY = Math.round(this.scale.height * 0.55);
        try {
            const portalHelper = (window && window.__portal_shared) ? window.__portal_shared : require('./shared/portal.js');
            const pobj = portalHelper.createPortal(this, portalX, portalY, { depth: 1.5, targetScene: 'Town', promptLabel: 'Return to Town' });
            this.portal = pobj.display;
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
            try { addTimeEvent(this, { delay: 220, callback: () => { if (pobj && pobj.tryUpgrade) pobj.tryUpgrade(); } }); } catch (e) {}
        } catch (e) {
            this.portal = this.add.circle(portalX, portalY, 28, 0x2266aa, 0.9).setDepth(1.5);
            this.tweens.add({ targets: this.portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
            this.portalPrompt = this.add.text(portalX, portalY - 60, '[E] Return to Town', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
            this.portalPrompt.setVisible(false);
        }

    // Ensure the player's initial spawn is at the portal on scene load so node placement
    // (which happens after this block) will avoid the portal location.
    try {
        if (this.player && this.portal) {
            const px = this.portal.x || portalX;
            const py = this.portal.y || portalY;
            // set visual position
            try { this.player.setPosition(px, py); } catch (e) {}
            // if Arcade body exists, reset it so collisions align
            try { if (this.player.body && typeof this.player.body.reset === 'function') this.player.body.reset(px, py); } catch (e) {}
        }
    } catch (e) { }

    // Furnace in cave (convenience) - place in the scene center
    // use the responsive centers computed earlier so furnace sits at the visual center
    const furnaceX = Math.round(centerX);
    const furnaceY = Math.round(centerY);
    // create furnace via shared helper (centralized)
    try { if (window && window.__furnace_shared && window.__furnace_shared.createFurnace) { window.__furnace_shared.createFurnace(this, furnaceX, furnaceY); } else { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); this._setFurnaceFlame(false); } } catch (e) { try { this.furnace = this.add.sprite(furnaceX, furnaceY, 'furnace', 0).setOrigin(0.5).setDepth(1.5); this._setFurnaceFlame(false); } catch(_) {} }
    this.furnacePrompt = this.add.text(furnaceX, furnaceY - 60, '[E] Use Furnace', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
    this.furnacePrompt.setVisible(false);
    // furnace animation will indicate active state (no separate emoji indicator)
    // Wayne Mineson NPC (tutorial mining guide)
    try {
        const wayneX = Math.max(80, Math.round(centerX - (this.scale.width * 0.18)));
        const wayneY = Math.round(centerY * 0.9);
        if (this.textures && this.textures.exists && this.textures.exists('rowan_idle')) {
            // ensure Wayne's animations (based on the rowan sheet) exist in this scene
            try { this._ensureWayneAnimations && this._ensureWayneAnimations(); } catch (e) {}
            this._wayne = this.add.sprite(wayneX, wayneY, 'rowan_idle').setOrigin(0.5, 0.9).setDepth(1.5);
            // tint to a brownish tone so Wayne looks distinct from Rowan
            try { this._wayne.setTint(0x996633); } catch (e) {}
        } else {
            this._wayne = this.add.rectangle(wayneX, wayneY, 48, 64, 0x996633, 1).setDepth(1.5);
        }
        this._wayneLabel = this.add.text(wayneX, wayneY - 50, 'Wayne Mineson', { fontSize: '16px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this._waynePrompt = this.add.text(wayneX, wayneY - 74, '[E] Talk to Wayne', { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(2);
        this._waynePrompt.setVisible(false);
        // wayne wandering state (mirrors Rowan)
        this._wayneState = {
            home: { x: wayneX, y: wayneY },
            radius: 110,
            speed: 32,
            facing: 'down',
            target: null,
            idleUntil: this.time.now + Phaser.Math.Between(1400, 2800)
        };
        // register for quest indicators if shared UI helper present
        try {
            if (window && window.__shared_ui && typeof window.__shared_ui.registerQuestIndicators === 'function') {
                window.__shared_ui.registerQuestIndicators(this, { 'wayne_mineson': this._wayne });
            }
        } catch (e) {}
        // mark travel objective for Wayne's tutorial (player arrived at Cave)
        try { this._updateWayneQuestProgress('travel', 'Cave', 1); } catch (e) {}
    } catch (e) {}
    // smithing skill
    if (!this.char.smithing) this.char.smithing = { level: 1, exp: 0, expToLevel: 100 };

    // Smelting state
    this.smeltingActive = false;
    this._smeltingEvent = null;
    this.smeltingInterval = 2800;

    // Procedural mining node generation: walls + nodes placed along cave edges
    // plus 1-2 clusters near the center. Prefer reading ore definitions from `src/data/ores.js` if available
    // (window.ORE_DEFS or import)
    let oreConfigs = [];
    try {
        const defs = (typeof ORE_DEFS !== 'undefined') ? ORE_DEFS : (window && window.ORE_DEFS) ? window.ORE_DEFS : null;
        if (defs) {
            for (const k of Object.keys(defs)) {
                const d = defs[k]; if (!d) continue;
                oreConfigs.push({ type: k, clusters: d.clusters || 2, perCluster: d.perCluster || 3, clusterRadius: d.clusterRadius || 96 });
            }
        }
    } catch (e) { /* fallback to hardcoded */ }
    if (!oreConfigs.length) {
        oreConfigs = [ { type: 'tin', clusters: 3, perCluster: 4, clusterRadius: 96 }, { type: 'copper', clusters: 2, perCluster: 3, clusterRadius: 110 } ];
    }
    const placedNodes = [];
    const margin = 96;
    const minSeparation = 56; // min distance between nodes
    // logical bounds where nodes and decorations may be placed
    const bounds = { x1: margin, x2: this.scale.width - margin, y1: 120, y2: this.scale.height - 120 };

    // Create solid cave walls that extend to (and slightly past) the screen edges.
    // Walls are dark brown and fully opaque so the cave feels enclosed.
    this._caveWalls = this._caveWalls || [];
    try {
        const worldW = this.scale.width;
        const worldH = this.scale.height;
        const extra = 48; // extend past edges for safety
        const wallColor = 0x3b2a14; // dark brown

        // Create organic walls using overlapping circular/oval segments.
        // Each edge is approximated by a chain of overlapping circles with varied radii
        // so the visual boundary reads as ovals while each circle also gets a static collider.
        const makeEdgeCircles = (points) => {
            for (const p of points) {
                try {
                    const c = this.add.circle(p.x, p.y, p.r, wallColor, 1).setDepth(1.0);
                    try { this.physics.add.existing(c, true); } catch (e) {}
                    try { if (typeof setCircleCentered === 'function') setCircleCentered(c, Math.max(6, Math.round(p.r))); } catch (e) {}
                    try { if (this.player && this.player.body) this.physics.add.collider(this.player, c); } catch (e) {}
                    this._caveWalls.push(c);
                } catch (e) { /* ignore individual circle failures */ }
            }
        };

    // Top / bottom chains (denser; increased to better match left-side visuals)
    const segCountX = Math.max(80, Math.round(worldW / 12));
        const topPoints = [];
        const bottomPoints = [];
        for (let i = 0; i < segCountX; i++) {
            const t = i / Math.max(1, segCountX - 1);
            const x = -extra + t * (worldW + extra * 2);
            const jitter = Phaser.Math.Between(-14, 14);
            // use smaller radii so many overlapping circles form a smooth organic edge
            // then scale top/bottom radii up to better match the left-side visuals
            let rTop = Phaser.Math.Between(Math.max(14, Math.round(worldW / 160)), Math.max(32, Math.round(worldW / 80)));
            let rBottom = Phaser.Math.Between(Math.max(14, Math.round(worldW / 160)), Math.max(32, Math.round(worldW / 80)));
            // enlarge top/bottom to approximately 3x to match the left cluster size
            rTop = Math.max(12, Math.round(rTop * 3));
            rBottom = Math.max(12, Math.round(rBottom * 3));
            // align to the screen edge (top should be near y=0)
            topPoints.push({ x: x, y: Math.round(-rTop / 2) + Phaser.Math.Between(-10, 10), r: rTop });
            // bottom aligned beyond the bottom edge (y ~= worldH + r/2)
            bottomPoints.push({ x: x, y: Math.round(worldH + rBottom / 2) + Phaser.Math.Between(-10, 10), r: rBottom });
        }
        makeEdgeCircles(topPoints);
        makeEdgeCircles(bottomPoints);

        // Add extra top/bottom clusters to match the left-side density and scale
        const extraTopCount = Math.max(20, Math.round(segCountX * 0.8));
        const extraBottomCount = Math.max(20, Math.round(segCountX * 0.8));
        const topExtra = [];
        const bottomExtra = [];
        for (let i = 0; i < extraTopCount; i++) {
            const x = Phaser.Math.Between(-extra, worldW + extra);
            const r = Phaser.Math.Between(12, 64);
            topExtra.push({ x: x, y: Math.round(-r / 2) + Phaser.Math.Between(-12, 12), r: r });
        }
        for (let i = 0; i < extraBottomCount; i++) {
            const x = Phaser.Math.Between(-extra, worldW + extra);
            const r = Phaser.Math.Between(12, 64);
            bottomExtra.push({ x: x, y: Math.round(worldH + r / 2) + Phaser.Math.Between(-12, 12), r: r });
        }
        makeEdgeCircles(topExtra);
        makeEdgeCircles(bottomExtra);

        // Left / right chains (much denser on Y and with extra left-side cluster)
        const segCountY = Math.max(50, Math.round(worldH / 22));
        const leftPoints = [];
        const rightPoints = [];
        for (let i = 0; i < segCountY; i++) {
            const t = i / Math.max(1, segCountY - 1);
            const y = -extra + t * (worldH + extra * 2);
            const jitter = Phaser.Math.Between(-18, 18);
            const rLeft = Phaser.Math.Between(Math.max(14, Math.round(worldH / 160)), Math.max(32, Math.round(worldH / 80)));
            // compute rRight similarly then enlarge to match left-side visual scale
            let rRight = Phaser.Math.Between(Math.max(14, Math.round(worldH / 160)), Math.max(32, Math.round(worldH / 80)));
            rRight = Math.max(12, Math.round(rRight * 3));
            // left aligned beyond left edge (x ~= -r/2)
            leftPoints.push({ x: Math.round(-rLeft / 2) + Phaser.Math.Between(-10, 10), y: y, r: rLeft });
            // right aligned beyond right edge (x ~= worldW + r/2)
            rightPoints.push({ x: Math.round(worldW + rRight / 2) + Phaser.Math.Between(-10, 10), y: y, r: rRight });
        }

        // Add a much larger left-side cluster of circles to guarantee dense coverage
        const extraLeftCount = Math.max(30, Math.round(segCountY * 4.5));
        for (let i = 0; i < extraLeftCount; i++) {
            const y = Phaser.Math.Between(bounds.y1 - extra, bounds.y2 + extra);
            const x = bounds.x1 - Phaser.Math.Between(24, 140) - Phaser.Math.Between(0, 40);
            const r = Phaser.Math.Between(12, 56);
            leftPoints.push({ x: x, y: y, r: r });
        }

        makeEdgeCircles(leftPoints);
        makeEdgeCircles(rightPoints);
    } catch (e) { /* ignore physics failures */ }

    const isTooClose = (x, y) => {
        // avoid furnace and portal
        try { if (this.furnace && Phaser.Math.Distance.Between(x, y, this.furnace.x, this.furnace.y) < 120) return true; } catch (e) {}
        try { if (this.portal && Phaser.Math.Distance.Between(x, y, this.portal.x, this.portal.y) < 120) return true; } catch (e) {}
        // avoid player spawn
        try { if (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 80) return true; } catch (e) {}
        // avoid cave walls (keep nodes a bit away from wall rects)
        try {
            if (this._caveWalls && this._caveWalls.length) {
                for (const w of this._caveWalls) {
                    if (!w || !w.body) continue;
                    // approximate by checking distance to visual bounds
                    const wr = w.getBounds ? w.getBounds() : null;
                    if (wr && Phaser.Geom.Rectangle.Contains(wr, x, y)) return true;
                }
            }
        } catch (e) {}
        for (const p of placedNodes) if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < minSeparation) return true;
        return false;
    };

    // Place nodes along cave edges first (top/bottom/left/right near walls)
    // Limit total nodes to avoid overcrowding on smaller screens. Distribute the cap
    // across ores so each ore gets at least one chance to spawn.
    // increase node density: smaller denominator -> more nodes on typical viewports
    const MAX_NODES = Math.max(16, Math.round((this.scale.width * this.scale.height) / 45000));
    // use ceil so distribution doesn't underallocate when MAX_NODES is not divisible
    const perOreCap = Math.max(1, Math.ceil(MAX_NODES / Math.max(1, oreConfigs.length)));
    for (const cfg of oreConfigs) {
        let remainingForThisOre = perOreCap;
        const edgeCount = cfg.edgeCount || Math.max(4, (cfg.perCluster || 2) * 2);
        for (let i = 0; i < edgeCount; i++) {
            if (placedNodes.length >= MAX_NODES) break;
            if (remainingForThisOre <= 0) break;
            let side = Phaser.Math.Between(0, 3); // 0=top,1=right,2=bottom,3=left
            let nx = 0, ny = 0;
            // prefer to attach nodes to the inner edge of the nearest wall circle so they
            // appear on the accessible side (toward the scene center) instead of outside
            // the visible cave. If no wall circle found, fall back to inset placement.
            const nodeRadius = 28;
            const innerGap = 8;
            const findWallCircleForSide = (side, targetX, targetY) => {
                if (!this._caveWalls || !this._caveWalls.length) return null;
                let best = null; let bestDist = 1e9;
                for (const w of this._caveWalls) {
                    if (!w) continue;
                    const wr = (w.getBounds && typeof w.getBounds === 'function') ? w.getBounds() : null;
                    if (!wr) continue;
                    const cx = wr.x + wr.width / 2;
                    const cy = wr.y + wr.height / 2;
                    // filter by side approximate position
                    if (side === 0 && cy > bounds.y1 + 40) continue; // top circles should be above
                    if (side === 2 && cy < bounds.y2 - 40) continue; // bottom circles should be below
                    if (side === 3 && cx > bounds.x1 + 40) continue; // left circles should be left
                    if (side === 1 && cx < bounds.x2 - 40) continue; // right circles should be right
                    // measure distance to desired target to pick the closest wall segment
                    const d = Phaser.Math.Distance.Between(targetX || cx, targetY || cy, cx, cy);
                    if (d < bestDist) { bestDist = d; best = { w, cx, cy, wr }; }
                }
                return best;
            };
            const edgeInset = 24; // distance from the inner edge where nodes sit
            if (side === 0) { // top
                const tx = Phaser.Math.Between(bounds.x1 + 20, bounds.x2 - 20);
                const hit = findWallCircleForSide(0, tx, bounds.y1);
                if (hit) {
                    const radius = Math.round(hit.w.displayWidth ? hit.w.displayWidth / 2 : (hit.w.width || hit.w.radius || 32));
                    nx = Phaser.Math.Clamp(Math.round(hit.cx + Phaser.Math.Between(-Math.round(radius/2), Math.round(radius/2))), bounds.x1, bounds.x2);
                    ny = Math.round(hit.cy + radius + nodeRadius + innerGap);
                } else {
                    nx = Phaser.Math.Between(bounds.x1 + 20, bounds.x2 - 20);
                    ny = bounds.y1 + edgeInset + Phaser.Math.Between(-8, 8);
                }
            } else if (side === 2) { // bottom
                const tx = Phaser.Math.Between(bounds.x1 + 20, bounds.x2 - 20);
                const hit = findWallCircleForSide(2, tx, bounds.y2);
                if (hit) {
                    const radius = Math.round(hit.w.displayWidth ? hit.w.displayWidth / 2 : (hit.w.width || hit.w.radius || 32));
                    nx = Phaser.Math.Clamp(Math.round(hit.cx + Phaser.Math.Between(-Math.round(radius/2), Math.round(radius/2))), bounds.x1, bounds.x2);
                    ny = Math.round(hit.cy - radius - nodeRadius - innerGap);
                } else {
                    nx = Phaser.Math.Between(bounds.x1 + 20, bounds.x2 - 20);
                    ny = bounds.y2 - edgeInset + Phaser.Math.Between(-8, 8);
                }
            } else if (side === 3) { // left
                const ty = Phaser.Math.Between(bounds.y1 + 20, bounds.y2 - 20);
                const hit = findWallCircleForSide(3, bounds.x1, ty);
                if (hit) {
                    const radius = Math.round(hit.w.displayWidth ? hit.w.displayWidth / 2 : (hit.w.width || hit.w.radius || 32));
                    nx = Math.round(hit.cx + radius + nodeRadius + innerGap);
                    ny = Phaser.Math.Clamp(Math.round(hit.cy + Phaser.Math.Between(-Math.round(radius/2), Math.round(radius/2))), bounds.y1, bounds.y2);
                } else {
                    nx = bounds.x1 + edgeInset + Phaser.Math.Between(-8, 8);
                    ny = Phaser.Math.Between(bounds.y1 + 20, bounds.y2 - 20);
                }
            } else { // right
                const ty = Phaser.Math.Between(bounds.y1 + 20, bounds.y2 - 20);
                const hit = findWallCircleForSide(1, bounds.x2, ty);
                if (hit) {
                    const radius = Math.round(hit.w.displayWidth ? hit.w.displayWidth / 2 : (hit.w.width || hit.w.radius || 32));
                    nx = Math.round(hit.cx - radius - nodeRadius - innerGap);
                    ny = Phaser.Math.Clamp(Math.round(hit.cy + Phaser.Math.Between(-Math.round(radius/2), Math.round(radius/2))), bounds.y1, bounds.y2);
                } else {
                    nx = bounds.x2 - edgeInset + Phaser.Math.Between(-8, 8);
                    ny = Phaser.Math.Between(bounds.y1 + 20, bounds.y2 - 20);
                }
            }
            nx = Phaser.Math.Clamp(nx, bounds.x1, bounds.x2);
            ny = Phaser.Math.Clamp(ny, bounds.y1, bounds.y2);
            let tries = 0;
            while (isTooClose(nx, ny) && tries < 25) {
                side = Phaser.Math.Between(0, 3);
                if (side === 0) { nx = Phaser.Math.Between(bounds.x1 + 20, bounds.x2 - 20); ny = bounds.y1 + edgeInset + Phaser.Math.Between(-12, 12); }
                else if (side === 2) { nx = Phaser.Math.Between(bounds.x1 + 20, bounds.x2 - 20); ny = bounds.y2 - edgeInset + Phaser.Math.Between(-12, 12); }
                else if (side === 3) { nx = bounds.x1 + edgeInset + Phaser.Math.Between(-12, 12); ny = Phaser.Math.Between(bounds.y1 + 20, bounds.y2 - 20); }
                else { nx = bounds.x2 - edgeInset + Phaser.Math.Between(-12, 12); ny = Phaser.Math.Between(bounds.y1 + 20, bounds.y2 - 20); }
                nx = Phaser.Math.Clamp(nx, bounds.x1, bounds.x2);
                ny = Phaser.Math.Clamp(ny, bounds.y1, bounds.y2);
                tries++;
            }
            if (!isTooClose(nx, ny)) {
                this._createMiningNode(nx, ny, cfg.type);
                placedNodes.push({ x: nx, y: ny, type: cfg.type });
                remainingForThisOre--;
            }
        }

        // Now create 1-2 center clusters (avoid overlapping other objects)
        const centerClusters = Math.min(2, Math.max(1, cfg.centerClusters || Math.max(1, Math.floor((cfg.clusters || 1)))));
        const centerArea = { x1: bounds.x1 + 120, x2: bounds.x2 - 120, y1: bounds.y1 + 80, y2: bounds.y2 - 80 };
        for (let c = 0; c < centerClusters; c++) {
            if (placedNodes.length >= MAX_NODES) break;
            if (remainingForThisOre <= 0) break;
            let cx = Phaser.Math.Between(centerArea.x1, centerArea.x2);
            let cy = Phaser.Math.Between(centerArea.y1, centerArea.y2);
            let attempts = 0;
            while (isTooClose(cx, cy) && attempts < 40) {
                cx = Phaser.Math.Between(centerArea.x1, centerArea.x2);
                cy = Phaser.Math.Between(centerArea.y1, centerArea.y2);
                attempts++;
            }
            if (isTooClose(cx, cy)) continue;
            for (let i = 0; i < (cfg.perCluster || 3); i++) {
                if (placedNodes.length >= MAX_NODES) break;
                if (remainingForThisOre <= 0) break;
                let angle = Math.random() * Math.PI * 2;
                let rad = Math.random() * (cfg.clusterRadius || 80);
                let nx = Math.round(cx + Math.cos(angle) * rad);
                let ny = Math.round(cy + Math.sin(angle) * rad);
                nx = Phaser.Math.Clamp(nx, bounds.x1, bounds.x2);
                ny = Phaser.Math.Clamp(ny, bounds.y1, bounds.y2);
                let innerAttempts = 0;
                while (isTooClose(nx, ny) && innerAttempts < 20) {
                    angle = Math.random() * Math.PI * 2; rad = Math.random() * (cfg.clusterRadius || 80);
                    nx = Math.round(cx + Math.cos(angle) * rad);
                    ny = Math.round(cy + Math.sin(angle) * rad);
                    nx = Phaser.Math.Clamp(nx, bounds.x1, bounds.x2);
                    ny = Phaser.Math.Clamp(ny, bounds.y1, bounds.y2);
                    innerAttempts++;
                }
                if (!isTooClose(nx, ny)) {
                    this._createMiningNode(nx, ny, cfg.type);
                    placedNodes.push({ x: nx, y: ny, type: cfg.type });
                    remainingForThisOre--;
                }
            }
        }
        // Optional mid-cluster between edge and center to create a gradation
        const midClusters = Math.max(0, (cfg.midClusters != null) ? cfg.midClusters : 1);
        const midArea = { x1: bounds.x1 + 60, x2: bounds.x2 - 60, y1: bounds.y1 + 40, y2: bounds.y2 - 40 };
        for (let m = 0; m < midClusters; m++) {
            if (placedNodes.length >= MAX_NODES) break;
            if (remainingForThisOre <= 0) break;
            let mx = Phaser.Math.Between(midArea.x1, midArea.x2);
            let my = Phaser.Math.Between(midArea.y1, midArea.y2);
            let mattempts = 0;
            while (isTooClose(mx, my) && mattempts < 30) {
                mx = Phaser.Math.Between(midArea.x1, midArea.x2);
                my = Phaser.Math.Between(midArea.y1, midArea.y2);
                mattempts++;
            }
            if (isTooClose(mx, my)) continue;
            const midCount = Math.max(1, Math.round((cfg.perCluster || 3) / 2));
            for (let i = 0; i < midCount; i++) {
                if (placedNodes.length >= MAX_NODES) break;
                if (remainingForThisOre <= 0) break;
                const angle = Math.random() * Math.PI * 2;
                const rad = Math.random() * ((cfg.clusterRadius || 80) * 0.7);
                let nx = Math.round(mx + Math.cos(angle) * rad);
                let ny = Math.round(my + Math.sin(angle) * rad);
                nx = Phaser.Math.Clamp(nx, bounds.x1, bounds.x2);
                ny = Phaser.Math.Clamp(ny, bounds.y1, bounds.y2);
                let innerAttempts = 0;
                while (isTooClose(nx, ny) && innerAttempts < 12) {
                    const angle2 = Math.random() * Math.PI * 2;
                    const rad2 = Math.random() * ((cfg.clusterRadius || 80) * 0.7);
                    nx = Math.round(mx + Math.cos(angle2) * rad2);
                    ny = Math.round(my + Math.sin(angle2) * rad2);
                    nx = Phaser.Math.Clamp(nx, bounds.x1, bounds.x2);
                    ny = Phaser.Math.Clamp(ny, bounds.y1, bounds.y2);
                    innerAttempts++;
                }
                if (!isTooClose(nx, ny)) {
                    this._createMiningNode(nx, ny, cfg.type);
                    placedNodes.push({ x: nx, y: ny, type: cfg.type });
                    remainingForThisOre--;
                }
            }
        }
    }
    // Add several scattered filler nodes (proportional to MAX_NODES) and ensure they're tracked
    const fillerCount = Math.max(8, Math.round(MAX_NODES * 0.18));
    for (let i = 0; i < fillerCount; i++) {
        if (placedNodes.length >= MAX_NODES) break;
        let sx = Phaser.Math.Between(bounds.x1, bounds.x2);
        let sy = Phaser.Math.Between(bounds.y1, bounds.y2);
        let tries = 0;
        while (isTooClose(sx, sy) && tries < 40) { sx = Phaser.Math.Between(bounds.x1, bounds.x2); sy = Phaser.Math.Between(bounds.y1, bounds.y2); tries++; }
        if (isTooClose(sx, sy)) continue;
        // pick an ore type cycling through available configs so distribution stays varied
        const oreType = (oreConfigs && oreConfigs.length) ? oreConfigs[i % oreConfigs.length].type : ((i % 2 === 0) ? 'tin' : 'copper');
        this._createMiningNode(sx, sy, oreType);
        placedNodes.push({ x: sx, y: sy, type: oreType });
    }

    // Cave decorations: rocks and stalactites
    try {
        const decoCount = Math.max(6, Math.round((this.scale.width * this.scale.height) / 60000));
        for (let i = 0; i < decoCount; i++) {
            let rx = Phaser.Math.Between(bounds.x1, bounds.x2);
            let ry = Phaser.Math.Between(bounds.y1, bounds.y2);
            let tries = 0;
            while (isTooClose(rx, ry) && tries < 30) { rx = Phaser.Math.Between(bounds.x1, bounds.x2); ry = Phaser.Math.Between(bounds.y1, bounds.y2); tries++; }
            if (isTooClose(rx, ry)) continue;
            // draw rock: layered circles
            const r = Phaser.Math.Between(10, 28);
            const base = this.add.circle(rx, ry, r, 0x2f2b26, 1).setDepth(0.9);
            const shade = this.add.circle(rx - r*0.22, ry - r*0.18, Math.round(r*0.6), 0x1f1d1a, 0.9).setDepth(1.0);
            // slight random rotation/scale via tween
            this.tweens.add({ targets: [base, shade], scale: { from: 0.98, to: 1.02 }, yoyo: true, repeat: -1, duration: 2200 + Math.random()*1200, ease: 'Sine.easeInOut' });
            // add a static circular collider for the decoration so the player bumps into it
                    try {
                        if (this.physics && this.physics.add) {
                            // create invisible collider zone aligned precisely with visual circle
                            // display circle radius should match visual r (not doubled)
                            const dz = this.add.circle(rx - r, ry - r, r, 0x000000, 0).setOrigin(0, 0).setDepth(0.9);
                            try { this.physics.add.existing(dz, true); } catch (e) {}
                            try { if (typeof setCircleCentered === 'function') setCircleCentered(dz, Math.max(6, Math.round(r))); } catch (e) {}
                            try { if (this.player && this.player.body) this.physics.add.collider(this.player, dz); } catch (e) {}
                            base._decorZone = dz;
                            shade._decorZone = dz;
                            this._decorColliders = this._decorColliders || [];
                            this._decorColliders.push(dz);
                        }
                    } catch (e) {}
        }
        // stalactites: draw at top edge as small triangles
        const stalCount = Math.max(4, Math.round(this.scale.width / 180));
        for (let i = 0; i < stalCount; i++) {
            const sx = Phaser.Math.Between(bounds.x1, bounds.x2);
            const syTop = Phaser.Math.Between(40, 90);
            const g = this.add.graphics().setDepth(0.95);
            const w = Phaser.Math.Between(12, 36);
            g.fillStyle(0x1f1d1a, 1);
            g.beginPath();
            g.moveTo(sx, syTop);
            g.lineTo(sx - w/2, syTop + Phaser.Math.Between(24, 50));
            g.lineTo(sx + w/2, syTop + Phaser.Math.Between(24, 50));
            g.closePath();
            g.fillPath();
            // subtle bob via tween
            this.tweens.add({ targets: g, y: { from: 0, to: 2 }, yoyo: true, repeat: -1, duration: 3000 + Math.random()*1000, ease: 'Sine.easeInOut' });
            // add a small circular collider under the stalactite so the player can't walk straight through
                    try {
                        if (this.physics && this.physics.add) {
                            const tipY = syTop + Phaser.Math.Between(18, 32);
                            const rsz = Math.max(8, Math.round(w / 4));
                            const sz = this.add.circle(sx - rsz, tipY - rsz, rsz, 0x000000, 0).setOrigin(0, 0).setDepth(0.95);
                            try { this.physics.add.existing(sz, true); } catch (e) {}
                            try { if (typeof setCircleCentered === 'function') setCircleCentered(sz, Math.max(6, rsz)); } catch (e) {}
                            try { if (this.player && this.player.body) this.physics.add.collider(this.player, sz); } catch (e) {}
                            g._decorZone = sz;
                            this._decorColliders = this._decorColliders || [];
                            this._decorColliders.push(sz);
                        }
                    } catch (e) {}
        }
    } catch (e) { /* ignore decoration failures */ }

    // continuous mining state
    this.miningActive = false;
    this._miningEvent = null;
    this.miningInterval = 2800; // ms between swings (tweakable)

        // Toast container
        this._toastContainer = null;



        // cleanup on shutdown
        this.events.once('shutdown', () => {
            clearActivity(this, { silent: true });
            setSceneKey(null);
            this._destroyHUD();
            this._clearToasts();
            this._stopSafeZoneRegen();
            cleanupAmbientFx(this);
            // cleanup mining indicator if present
            if (this._miningIndicator && this._miningIndicator.parent) {
                this._miningIndicator.destroy();
                this._miningIndicator = null;
            }
            // cleanup any mining node colliders and decoration colliders we created
            try {
                if (this.miningNodes && Array.isArray(this.miningNodes)) {
                    for (const n of this.miningNodes) {
                        try { if (n && n.colliderZone && n.colliderZone.destroy) n.colliderZone.destroy(); } catch (e) {}
                        // don't destroy n.collider if it's the sprite itself - sprite cleanup is handled elsewhere
                    }
                }
                if (this._decorColliders && Array.isArray(this._decorColliders)) {
                    for (const d of this._decorColliders) {
                        try { if (d && d.destroy) d.destroy(); } catch (e) {}
                    }
                    this._decorColliders = null;
                }
                // destroy cave wall colliders if any
                try {
                    if (this._caveWalls && Array.isArray(this._caveWalls)) {
                        for (const w of this._caveWalls) {
                            try { if (w && w.destroy) w.destroy(); } catch (e) {}
                        }
                        this._caveWalls = null;
                    }
                } catch (e) {}
            } catch (e) {}
            // cleanup furnace modal if present
            if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
            this._furnaceModal = null;
            // destroy atmospheric overlays if created
            try { if (this._overlays && this._overlays.destroy) this._overlays.destroy(); } catch(e) {}
            this._overlays = null;
            // ensure furnace animation stopped
            try { this._setFurnaceFlame(false); } catch(e) {}
            // stop any smelting events
            if (this._smeltingEvent) { try { if (typeof this._smeltingEvent === 'function') this._smeltingEvent(); else this._smeltingEvent.remove && this._smeltingEvent.remove(false); } catch (e) {} this._smeltingEvent = null; }
            this._closeInventoryModal();
            if (this._keyHandlers && this.input && this.input.keyboard) {
                try {
                    if (this._keyHandlers.i) this.input.keyboard.off('keydown-I', this._keyHandlers.i);
                    if (this._keyHandlers.u) this.input.keyboard.off('keydown-U', this._keyHandlers.u);
                    if (this._keyHandlers.x) this.input.keyboard.off('keydown-X', this._keyHandlers.x);
                    if (this._keyHandlers.q) this.input.keyboard.off('keydown-Q', this._keyHandlers.q);
                    if (this._keyHandlers.t) this.input.keyboard.off('keydown-T', this._keyHandlers.t);
                } catch (e) { /* ignore key cleanup errors */ }
            }
        });
    }

    // Inventory modal is centralized in shared UI; thin wrappers kept for compatibility
    _startSafeZoneRegen() {
    const regenDelay = 1800;
    if (this.safeRegenEvent) { try { if (typeof this.safeRegenEvent === 'function') this.safeRegenEvent(); else this.safeRegenEvent.remove && this.safeRegenEvent.remove(false); } catch (e) {} }
    this.safeRegenEvent = addTimeEvent(this, { delay: regenDelay, loop: true, callback: this._tickSafeZoneRegen, callbackScope: this });
    }

    _stopSafeZoneRegen() {
        if (this.safeRegenEvent) { try { if (typeof this.safeRegenEvent === 'function') this.safeRegenEvent(); else this.safeRegenEvent.remove && this.safeRegenEvent.remove(false); } catch (e) {} this.safeRegenEvent = null; }
    }

    _tickSafeZoneRegen() {
        // delegate to centralized safe-zone regen helper which writes maxima and applies hp/mana regen
        if (!this.char) return;
        try { applySafeZoneRegen(this); } catch (e) {}
    }


    _openInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.openInventoryModal) return window.__shared_ui.openInventoryModal(this); }
    _closeInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.closeInventoryModal) return window.__shared_ui.closeInventoryModal(this); }
    _refreshInventoryModal() { if (window && window.__shared_ui && window.__shared_ui.refreshInventoryModal) return window.__shared_ui.refreshInventoryModal(this); }

    // Equipment modal is centralized; thin wrappers route to shared helpers
    _openEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.openEquipmentModal) return window.__shared_ui.openEquipmentModal(this); }
    _closeEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.closeEquipmentModal) return window.__shared_ui.closeEquipmentModal(this); }
    _refreshEquipmentModal() { if (window && window.__shared_ui && window.__shared_ui.refreshEquipmentModal) return window.__shared_ui.refreshEquipmentModal(this); }

    // Equip an item from inventory to the appropriate slot (weapon/armor)
    _equipItemFromInventory(itemId) {
        if (window && window.__shared_ui && window.__shared_ui.equipItemFromInventory) return window.__shared_ui.equipItemFromInventory(this, itemId);
    }

    _unequipItem(slot) { if (window && window.__shared_ui && window.__shared_ui.unequipItem) return window.__shared_ui.unequipItem(this, slot); }
    _applyEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.applyEquipmentBonuses) return window.__shared_ui.applyEquipmentBonuses(this, eq); }
    _removeEquipmentBonuses(eq) { if (window && window.__shared_ui && window.__shared_ui.removeEquipmentBonuses) return window.__shared_ui.removeEquipmentBonuses(this, eq); }

    // HUD copied/adapted from Town (without mining bar)
    _createHUD() { if (window && window.__hud_shared && window.__hud_shared.createHUD) return window.__hud_shared.createHUD(this); }

    _destroyHUD() { if (window && window.__hud_shared && window.__hud_shared.destroyHUD) return window.__hud_shared.destroyHUD(this); }

    _updateHUD() { if (window && window.__hud_shared && window.__hud_shared.updateHUD) return window.__hud_shared.updateHUD(this); try { this._destroyHUD(); this._createHUD(); } catch(e) {} }

    // --- Mining node creation ---
    // create a mining node of a given type ('tin' or 'copper')
    _createMiningNode(x, y, type = 'copper') {
        if (!this.miningNodes) this.miningNodes = [];
        // Prefer ore-specific definitions from ORE_DEFS (imported) if available
        const defs = (typeof ORE_DEFS !== 'undefined') ? ORE_DEFS : (window && window.ORE_DEFS) ? window.ORE_DEFS : null;
        const node = {};
        node.type = type;
        node.x = x; node.y = y; node.r = 28;
        let usedDef = null;
        if (defs && defs[type]) {
            usedDef = defs[type];
            node.baseChance = (usedDef.baseChance != null) ? usedDef.baseChance : 0.35;
            node.item = { id: (usedDef.itemId || (type + '_ore')), name: (usedDef.label || (type || 'Ore')) };
            node.color = usedDef.color || 0x776655;
            node.label = usedDef.label || (type.charAt(0).toUpperCase() + type.slice(1));
            node.minEfficiency = (usedDef.minEfficiency != null) ? usedDef.minEfficiency : 15;
            node.baseExp = (usedDef.baseExp != null) ? usedDef.baseExp : 15;
            node.baseYield = (usedDef.baseYield != null) ? usedDef.baseYield : 1;
            if (usedDef.failExp != null) node.failExp = usedDef.failExp;
            if (usedDef.maxMultiplier != null) node.maxMultiplier = usedDef.maxMultiplier;
            // use sprite key if available and loaded
            const spriteKey = usedDef.sprite || null;
            if (spriteKey && this.textures && this.textures.exists && this.textures.exists(spriteKey)) {
                try {
                    node.sprite = this.add.sprite(x, y, spriteKey).setOrigin(0.5).setDepth(1.2);
                    try {
                        const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                        // adjust visual sprite so its base sits roughly at the logical node center
                        const adjustedY = y + (node.r - (hh / 2));
                        node.sprite.y = adjustedY;
                        // keep the logical node center in sync with the visual sprite so
                        // proximity checks and prompts align with what the player sees
                        node.y = adjustedY;
                    } catch (e) {}
                } catch (e) {
                    node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
                }
            } else {
                node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
            }
        } else {
            // fallback legacy mapping for tin/copper
            const config = {
                tin: { color: 0x9bb7c9, baseChance: 0.45, item: { id: 'tin_ore', name: 'Tin Ore' }, label: 'Tin', minEfficiency: 12, baseExp: 12 },
                copper: { color: 0x8a7766, baseChance: 0.35, item: { id: 'copper_ore', name: 'Copper Ore' }, label: 'Copper', minEfficiency: 18, baseExp: 18 }
            };
            const cfg = config[type] || config.copper;
            node.baseChance = cfg.baseChance;
            node.item = cfg.item;
            node.color = cfg.color;
            node.label = cfg.label;
            node.minEfficiency = cfg.minEfficiency || 15;
            node.baseExp = cfg.baseExp || 15;
            node.baseYield = 1;
            if (type === 'tin' && this.textures.exists && this.textures.exists('tin')) {
                try {
                    node.sprite = this.add.sprite(x, y, 'tin').setOrigin(0.5).setDepth(1.2);
                    try {
                        const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                        const adjustedY = y + (node.r - (hh / 2));
                        node.sprite.y = adjustedY;
                        node.y = adjustedY;
                    } catch (e) { /* ignore positioning errors */ }
                } catch (e) {
                    node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
                }
            } else if (type === 'copper' && this.textures.exists && this.textures.exists('copper')) {
                try {
                    node.sprite = this.add.sprite(x, y, 'copper').setOrigin(0.5).setDepth(1.2);
                    try {
                        const hh = node.sprite.displayHeight || (node.sprite.frame && node.sprite.frame.realHeight) || 32;
                        const adjustedY = y + (node.r - (hh / 2));
                        node.sprite.y = adjustedY;
                        node.y = adjustedY;
                    } catch (e) { /* ignore positioning errors */ }
                } catch (e) {
                    node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
                }
            } else {
                node.sprite = this.add.circle(x, y, node.r, node.color, 1).setDepth(1.2);
            }
        }
        const promptText = node.minEfficiency
            ? `[E] Mine ${node.label}\n(Req Eff ${node.minEfficiency})`
            : `[E] Mine ${node.label}`;
    node.prompt = this.add.text(node.x, node.y - 60, promptText, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 }, align: 'center' }).setOrigin(0.5).setDepth(2);
        node.prompt.setVisible(false);
        // create a physics collider so the player bumps into the node instead of walking through it
        try {
            if (this.physics && this.physics.add) {
                // Prefer attaching a static circular body to a sprite if node.sprite is a real sprite
                const isSprite = node.sprite && node.sprite.texture && node.sprite instanceof Phaser.GameObjects.Sprite;
                if (isSprite) {
                    // Instead of attaching physics directly to the sprite (which can cause origin/offset
                    // mismatches for imported art), create a separate static circular collider zone centered
                    // on the node position so collisions match the visual circle placement precisely.
                        try {
                            const circ = Math.max(8, Math.round(node.r));
                            // display radius should be circ (not doubled). Position so origin 0,0 puts circle bounding box at node.x-circ,node.y-circ
                            const cz = this.add.circle(node.x - circ, node.y - circ, circ, 0x000000, 0).setOrigin(0, 0).setDepth(1.0);
                            try { this.physics.add.existing(cz, true); } catch (e) {}
                            try { if (typeof setCircleCentered === 'function') setCircleCentered(cz, circ); } catch (e) {}
                            try { if (this.player && this.player.body) this.physics.add.collider(this.player, cz); } catch (e) {}
                            node.colliderZone = cz;
                            this._decorColliders = this._decorColliders || [];
                            this._decorColliders.push(cz);
                        } catch (e) {
                        // fallback to earlier behavior below
                    }
                }
                // if we didn't attach to sprite, create a static circular collider (invisible)
                if (!node.collider) {
                    try {
                        const cz = this.add.circle(node.x, node.y, node.r, 0x000000, 0).setOrigin(0.5).setDepth(1.0);
                        if (this.physics && this.physics.add && this.physics.add.existing) this.physics.add.existing(cz, true);
                        try { if (typeof setCircleCentered === 'function') setCircleCentered(cz, Math.max(8, Math.round(node.r))); } catch (e) {}
                        try { if (this.player && this.player.body) this.physics.add.collider(this.player, cz); } catch (e) {}
                        node.colliderZone = cz;
                        // track for cleanup
                        this._decorColliders = this._decorColliders || [];
                        this._decorColliders.push(cz);
                    } catch (e) {
                        // ignore
                    }
                }
            }
        } catch (e) {
            // ignore if physics not available
        }
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

    _getMiningSnapshot() {
        const mining = this.char.mining = this.char.mining || { level: 1, exp: 0, expToLevel: 100 };
        const statsHelper = (window && window.__shared_ui && window.__shared_ui.stats && typeof window.__shared_ui.stats.effectiveStats === 'function')
            ? window.__shared_ui.stats.effectiveStats
            : null;
        const effStats = statsHelper ? statsHelper(this.char) : null;
        const baseStr = (this.char.stats && this.char.stats.str) || 0;
        const str = (effStats && typeof effStats.str === 'number') ? effStats.str : baseStr;

        let toolSkill = 0;
        let toolSpeed = 0;
        try {
            const equip = (this.char && this.char.equipment && this.char.equipment.mining) ? this.char.equipment.mining : null;
            const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : null;
            let equipDef = null;
            if (equip && equip.id && defs) equipDef = defs[equip.id] || null;
            const bonusSource = (equipDef && equipDef.miningBonus) || (equip && equip.miningBonus) || null;
            if (bonusSource) {
                toolSkill += Number(bonusSource.skill || 0);
                toolSpeed += Number(bonusSource.speedReductionMs || 0);
            }
        } catch (e) {}
        if (this.char && this.char._equipBonuses && typeof this.char._equipBonuses.mining === 'number') {
            toolSkill += this.char._equipBonuses.mining;
        }

        // Apply miningSpeed talent modifiers to toolSpeed
        try {
            const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
            const miningSpeedMod = tmods['miningSpeed'] || null;
            if (miningSpeedMod) {
                const flatBonus = Number(miningSpeedMod.flat || 0);
                const pctBonus = Number(miningSpeedMod.percent || 0);
                // Higher percent = faster mining = more speed reduction
                if (pctBonus) {
                    // Convert percent to additional speed reduction: e.g., 10% faster = 10% of base interval reduced
                    const baseInterval = this.miningInterval || 2800;
                    toolSpeed += Math.round(baseInterval * (pctBonus / 100));
                }
                toolSpeed += flatBonus;
            }
        } catch (e) {}

        const miningLevel = mining.level || 1;
        const efficiency = Math.max(0, Math.round(miningLevel * 3 + str * 1.5 + toolSkill * 5));

        return {
            efficiency,
            miningLevel,
            str,
            toolSkill,
            toolSpeed
        };
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
        // Delegate to shared furnace helper if present
        try { if (window && window.__furnace_shared && window.__furnace_shared.openFurnaceModal) { window.__furnace_shared.openFurnaceModal(this); return; } } catch (e) { /* ignore */ }
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
            <div style='margin-bottom:8px;'>Smelt ores into bars here. Open your Inventory (I) to view quantities.</span></div>
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
            const recipeId = 'copper_bar';
            if (this.smeltingActive) { if (this._smeltType === recipeId) this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
            else this._startContinuousSmelting(recipeId);
            updateDisplay(); this._refreshCaveFurnaceModal();
        };
        if (btnBronze) btnBronze.onclick = () => {
            const recipeId = 'bronze_bar';
            if (this.smeltingActive) { if (this._smeltType === recipeId) this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
            else this._startContinuousSmelting(recipeId);
            updateDisplay(); this._refreshCaveFurnaceModal();
        };

        this._refreshCaveFurnaceModal();
        // HUD switch to smithing
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _closeCaveFurnaceModal() {
        if (this._furnaceModal && this._furnaceModal.parentNode) this._furnaceModal.parentNode.removeChild(this._furnaceModal);
        this._furnaceModal = null;
    // Ensure furnace animation is stopped when the modal closes if not smelting
    try { if (!this.smeltingActive && this._setFurnaceFlame) this._setFurnaceFlame(false); } catch(e) {}
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _openWayneDialogue() {
        this._activeDialogueNpc = 'wayne';
        try { updateQuestProgress(this.char, 'talk', 'wayne_mineson', 1); } catch (e) {}

        const questId = 'tutorial_meet_wayne';
        const questDef = getQuestById ? getQuestById(questId) : null;
        const hadActive = (this.char.activeQuests || []).some(q => q.id === questId);
        let justCompleted = false;
        if (hadActive && checkQuestCompletion && checkQuestCompletion(this.char, questId)) {
            try { if (completeQuest) completeQuest(this.char, questId); justCompleted = true; } catch (e) {}
            const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
            if (this._persistCharacter) this._persistCharacter(username);
            try {
                if (window && window.__shared_ui) {
                    if (window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this);
                    if (window.__shared_ui.refreshInventoryModal) window.__shared_ui.refreshInventoryModal(this);
                    if (window.__shared_ui.refreshEquipmentModal) window.__shared_ui.refreshEquipmentModal(this);
                }
            } catch (e) {}
            try { if (this._updateHUD) this._updateHUD(); } catch (e) {}
            this._showToast('Quest completed: ' + ((questDef && questDef.name) || questId), 2200);
        }

        const nowCompleted = (this.char.completedQuests || []).includes(questId);
        const activeWayne = (this.char.activeQuests || []).find(q => q.id === questId);
        const bodyNodes = [];
        const optionConfigs = [];
        const objectiveStateFn = (typeof window !== 'undefined' && window.getQuestObjectiveState) ? window.getQuestObjectiveState : null;
        const equipQuestId = 'tutorial_equip_pickaxe_and_mine';
        const equipQuestDef = getQuestById ? getQuestById(equipQuestId) : null;
        const activeEquipQuest = (this.char.activeQuests || []).find(q => q.id === equipQuestId);
        const equipQuestCompleted = (this.char.completedQuests || []).includes(equipQuestId);
        const equipQuestReady = activeEquipQuest && checkQuestCompletion && checkQuestCompletion(this.char, equipQuestId);
        const availableWayneQuests = (typeof getAvailableQuests === 'function')
            ? (getAvailableQuests(this.char, 'Cave') || []).filter(q => q && q.giver === 'wayne_mineson')
            : [];
        const additionalWayneAvailable = availableWayneQuests.filter(q => q.id !== questId && q.id !== equipQuestId);
        const nextWayneQuest = additionalWayneAvailable.length ? additionalWayneAvailable[0] : null;
        const otherActiveWayne = (this.char.activeQuests || []).find(entry => {
            if (!entry || !entry.id || entry.id === questId || entry.id === equipQuestId) return false;
            const def = getQuestById ? getQuestById(entry.id) : null;
            return def && def.giver === 'wayne_mineson';
        });
        const otherActiveDef = otherActiveWayne ? (getQuestById ? getQuestById(otherActiveWayne.id) : null) : null;
        const otherActiveStates = otherActiveWayne && objectiveStateFn ? objectiveStateFn(this.char, otherActiveWayne.id) : null;

        if (equipQuestReady) {
            bodyNodes.push(this._createDialogueParagraph('You equipped the pickaxe and gathered what I asked for. Let me see.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, equipQuestId) : null;
            const list = this._buildObjectiveList(equipQuestDef, states);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Hand over the ore', onClick: () => { try { if (completeQuest) completeQuest(this.char, equipQuestId); const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null; if (this._persistCharacter) this._persistCharacter(username); if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); this._showToast('Quest completed: ' + ((equipQuestDef && equipQuestDef.name) || equipQuestId), 2200); } catch (e) {} this._closeDialogueOverlay(); } });
            optionConfigs.push({ label: 'Give me a moment.', onClick: () => this._closeDialogueOverlay() });
        } else if (activeEquipQuest) {
            bodyNodes.push(this._createDialogueParagraph('Keep using that pickaxe. The cave yields more if you get the rhythm right.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, equipQuestId) : null;
            const list = this._buildObjectiveList(equipQuestDef, states);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Back to mining.', onClick: () => this._closeDialogueOverlay() });
        } else if (otherActiveWayne && otherActiveDef) {
            bodyNodes.push(this._createDialogueParagraph(`You're already working on ${otherActiveDef.name || otherActiveWayne.id}. Stay focused and report back when it's done.`));
            const list = this._buildObjectiveList(otherActiveDef, otherActiveStates);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: 'Understood.', onClick: () => this._closeDialogueOverlay() });
        } else if (justCompleted || nowCompleted) {
            bodyNodes.push(this._createDialogueParagraph('You learned the basics of mining. Keep at it and you will make your fortune.'));
            if (!equipQuestCompleted) {
                if (equipQuestDef && equipQuestDef.description) bodyNodes.push(this._createDialogueParagraph(equipQuestDef.description));
                optionConfigs.push({ label: 'I will equip and mine.', onClick: () => {
                    if (!startQuest) { this._closeDialogueOverlay(); return; }
                    if ((this.char.activeQuests || []).some(q => q.id === equipQuestId)) { this._closeDialogueOverlay(); return; }
                    const started = startQuest(this.char, equipQuestId);
                    if (started) {
                        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                        if (this._persistCharacter) this._persistCharacter(username);
                        try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                        this._showToast('Quest started: ' + ((equipQuestDef && equipQuestDef.name) || equipQuestId), 2200);
                    }
                    this._closeDialogueOverlay();
                } });
                optionConfigs.push({ label: 'Maybe later.', onClick: () => this._closeDialogueOverlay() });
            } else if (nextWayneQuest) {
                if (nextWayneQuest.description) bodyNodes.push(this._createDialogueParagraph(nextWayneQuest.description));
                const list = this._buildObjectiveList(nextWayneQuest, null);
                if (list) bodyNodes.push(list);
                optionConfigs.push({ label: `Accept "${nextWayneQuest.name || nextWayneQuest.id}"`, onClick: () => {
                    if (!startQuest) { this._closeDialogueOverlay(); return; }
                    if ((this.char.activeQuests || []).some(q => q.id === nextWayneQuest.id)) { this._closeDialogueOverlay(); return; }
                    const started = startQuest(this.char, nextWayneQuest.id);
                    if (started) {
                        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                        if (this._persistCharacter) this._persistCharacter(username);
                        try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                        this._showToast('Quest started: ' + ((nextWayneQuest && nextWayneQuest.name) || nextWayneQuest.id), 2200);
                    }
                    this._closeDialogueOverlay();
                } });
                optionConfigs.push({ label: 'Maybe later.', onClick: () => this._closeDialogueOverlay() });
            } else {
                optionConfigs.push({ label: 'Goodbye.', onClick: () => this._closeDialogueOverlay() });
            }
        } else if (activeWayne) {
            bodyNodes.push(this._createDialogueParagraph('Wayne here. Focus your swings and watch the ore glint.'));
            const states = objectiveStateFn ? objectiveStateFn(this.char, questId) : null;
            const list = this._buildObjectiveList(questDef, states);
            if (list) bodyNodes.push(list);
            optionConfigs.push({ label: "I'll do it.", onClick: () => this._closeDialogueOverlay() });
        } else {
            bodyNodes.push(this._createDialogueParagraph('Ah, fresh face! I can show you the basics of mining if you like.'));
            optionConfigs.push({ label: 'Teach me mining', onClick: () => {
                if (!startQuest) { this._closeDialogueOverlay(); return; }
                if ((this.char.activeQuests || []).some(q => q.id === questId)) { this._closeDialogueOverlay(); return; }
                const started = startQuest(this.char, questId);
                if (started) {
                    const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                    if (this._persistCharacter) this._persistCharacter(username);
                    try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                    this._showToast('Quest started: ' + ((questDef && questDef.name) || questId), 2200);
                }
                this._closeDialogueOverlay();
            } });
            optionConfigs.push({ label: 'Not now', onClick: () => this._closeDialogueOverlay() });
        }

        this._renderDialogue('Wayne Mineson', bodyNodes, optionConfigs);
    }

    _updateWayneQuestProgress(type, itemId, amount = 1) {
        try {
            // Debug: show active quests and the target progress update for diagnostics
            try { console.debug && console.debug('Wayne quest progress tick', { type, itemId, amount, activeQuests: (this.char && this.char.activeQuests) || null }); } catch (e) {}
            if (window && window.__shared_ui && typeof window.__shared_ui.updateQuestProgressAndCheckCompletion === 'function') {
                window.__shared_ui.updateQuestProgressAndCheckCompletion(this, type, itemId, amount);
            } else {
                updateQuestProgress(this.char, type, itemId, amount);
                const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
                if (this._persistCharacter) this._persistCharacter(username);
                try { if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(this); } catch (e) {}
                try { console.debug && console.debug('Wayne quest progress after update', { type, itemId, amount, activeQuests: (this.char && this.char.activeQuests) || null }); } catch (e) {}
            }
        } catch (e) {}
    }

    _ensureDialogueOverlay() {
        if (this._dialogueOverlay) {
            return this._dialogueCard;
        }
        if (typeof document === 'undefined') return null;
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.65)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '245';

        const card = document.createElement('div');
        card.style.background = 'linear-gradient(135deg,#1f2b2f,#0f1619)';
        card.style.borderRadius = '12px';
        card.style.padding = '18px';
        card.style.color = '#fff';
        card.style.minWidth = '340px';
        card.style.maxWidth = '480px';
        card.style.boxShadow = '0 18px 32px rgba(0,0,0,0.55)';

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        this._dialogueOverlay = overlay;
        this._dialogueCard = card;
        return card;
    }

    _renderDialogue(title, bodyNodes, optionConfigs) {
        const card = this._ensureDialogueOverlay();
        if (!card) return;
        card.innerHTML = '';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        const heading = document.createElement('strong');
        heading.textContent = title;
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => this._closeDialogueOverlay();
        header.appendChild(heading);
        header.appendChild(closeBtn);
        card.appendChild(header);

        const body = document.createElement('div');
        body.style.marginTop = '12px';
        body.style.marginBottom = '16px';
        for (const node of bodyNodes) {
            if (node) body.appendChild(node);
        }
        card.appendChild(body);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.flexDirection = 'column';
        buttons.style.gap = '8px';
        for (const opt of optionConfigs) {
            const btn = document.createElement('button');
            btn.textContent = opt.label;
            btn.style.padding = '8px 12px';
            btn.style.border = 'none';
            btn.style.borderRadius = '8px';
            btn.style.cursor = 'pointer';
            btn.style.background = '#b46b2a';
            btn.style.color = '#fff';
            btn.onclick = () => {
                if (typeof opt.onClick === 'function') opt.onClick();
            };
            buttons.appendChild(btn);
        }
        card.appendChild(buttons);
    }

    _createDialogueParagraph(text) {
        if (typeof document === 'undefined') return null;
        const p = document.createElement('p');
        p.style.margin = '0 0 10px 0';
        p.textContent = text;
        return p;
    }

    _buildObjectiveList(questDef, progressStates) {
        if (typeof document === 'undefined') return null;
        if (!questDef || !Array.isArray(questDef.objectives) || questDef.objectives.length === 0) return null;
        const list = document.createElement('ul');
        list.style.margin = '8px 0 16px 16px';
        list.style.padding = '0';
        for (const obj of questDef.objectives) {
            const li = document.createElement('li');
            li.style.marginBottom = '4px';
            const required = obj.required || 1;
            const label = obj.description || obj.type;
            if (progressStates) {
                const targetId = obj.itemId || obj.enemyId || null;
                const state = progressStates.find(s => s && s.type === obj.type && (targetId ? s.itemId === targetId : true));
                const current = state ? Math.min(state.current || 0, required) : 0;
                li.textContent = `${label}: ${current} / ${required}`;
            } else {
                li.textContent = `${label}: ${required}`;
            }
            list.appendChild(li);
        }
        return list;
    }

    _closeDialogueOverlay() {
        if (this._dialogueOverlay && this._dialogueOverlay.parentNode) {
            try { this._dialogueOverlay.parentNode.removeChild(this._dialogueOverlay); } catch (e) {}
        }
        this._dialogueOverlay = null;
        this._dialogueCard = null;
        this._activeDialogueNpc = null;
    }

    _updateWayneAI(time, delta) {
        if (!this._wayne || !this._wayneState) return;
        const sprite = this._wayne;
        const state = this._wayneState;
        const now = (typeof time === 'number') ? time : (this.time ? this.time.now : 0);
        const dt = (typeof delta === 'number') ? delta : 16.6;

        if (this._activeDialogueNpc === 'wayne') {
            state.target = null;
            state.idleUntil = now + 200;
            try { if (this._playWayneAnimation) this._playWayneAnimation('idle', state.facing || 'down'); } catch (e) {}
            return;
        }

        if (state.target) {
            const dx = state.target.x - sprite.x;
            const dy = state.target.y - sprite.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = state.speed * (dt / 1000);
            if (dist <= step) {
                sprite.setPosition(state.target.x, state.target.y);
                state.target = null;
                state.idleUntil = now + Phaser.Math.Between(1400, 3200);
                try { if (this._playWayneAnimation) this._playWayneAnimation('idle', state.facing || 'down'); } catch (e) {}
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                const proposedX = sprite.x + nx * step;
                const proposedY = sprite.y + ny * step;
                // simple collision test against decoration colliders to avoid walking through them
                let blocked = false;
                try {
                    const rowanRadius = Math.max(12, (sprite.displayWidth || 48) / 2);
                    const colliders = this._decorColliders || [];
                    for (const cz of colliders) {
                        if (!cz) continue;
                        const cx = cz.x || 0; const cy = cz.y || 0;
                        const czRadius = (typeof cz.radius === 'number') ? cz.radius : ((cz.width && cz.width > 0) ? cz.width / 2 : 28);
                        const d = Phaser.Math.Distance.Between(proposedX, proposedY, cx, cy);
                        if (d < (rowanRadius + czRadius - 2)) { blocked = true; break; }
                    }
                } catch (e) { blocked = false; }
                if (!blocked) {
                    sprite.x = proposedX;
                    sprite.y = proposedY;
                }
                let facing;
                if (Math.abs(dx) > Math.abs(dy)) facing = dx < 0 ? 'left' : 'right';
                else facing = dy < 0 ? 'up' : 'down';
                state.facing = facing;
                try { if (this._playWayneAnimation) this._playWayneAnimation('walk', facing); } catch (e) {}
            }
        } else {
            if (!state.idleUntil || now >= state.idleUntil) {
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Phaser.Math.FloatBetween(24, state.radius || 110);
                let tx = state.home.x + Math.cos(angle) * distance;
                let ty = state.home.y + Math.sin(angle) * distance;
                const padding = 48;
                tx = Phaser.Math.Clamp(tx, padding, this.scale.width - padding);
                ty = Phaser.Math.Clamp(ty, padding, this.scale.height - padding);
                state.speed = Phaser.Math.FloatBetween(24, 38);
                state.target = { x: tx, y: ty };
            } else {
                try { if (this._playWayneAnimation) this._playWayneAnimation('idle', state.facing || 'down'); } catch (e) {}
            }
        }

        if (this._waynePrompt) {
            try { this._waynePrompt.setPosition(sprite.x, sprite.y - 74); } catch (e) {}
        }
        if (this._wayneLabel) {
            try { this._wayneLabel.setPosition(sprite.x, sprite.y - 50); } catch (e) {}
        }

        if (sprite.setDepth) {
            const depth = 1 + (sprite.y / Math.max(1, this.scale.height)) * 1.2;
            sprite.setDepth(depth);
        }
    }

    _ensureWayneAnimations() {
        const directions = ['up', 'left', 'down', 'right'];
        const sheets = [
            { key: 'rowan_idle', base: 'rowan_idle', frameRate: 3, repeat: -1 },
            { key: 'rowan_walk', base: 'rowan_walk', frameRate: 6, repeat: -1 }
        ];
        for (const sheet of sheets) {
            try {
                const tex = this.textures.get(sheet.key);
                if (!tex) continue;
                const total = tex.frameTotal || 0;
                if (!total) continue;
                const cols = Math.max(1, Math.floor(total / directions.length));
                directions.forEach((dir, rowIndex) => {
                    const start = rowIndex * cols;
                    if (start >= total) return;
                    let end = start + cols - 1;
                    end = Math.min(total - 1, end);
                    const animKey = `${sheet.base}_${dir}`;
                    if (this.anims.exists(animKey)) return;
                    try {
                        this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(sheet.key, { start, end }), frameRate: sheet.frameRate, repeat: sheet.repeat });
                    } catch (e) { /* ignore per-dir errors */ }
                });
            } catch (e) { /* ignore */ }
        }
    }

    _playWayneAnimation(mode, facing) {
        const sprite = this._wayne;
        if (!sprite || !this.anims) return;
        const key = `rowan_${mode}_${facing}`;
        if (!this.anims.exists(key)) return;
        const current = sprite.anims && sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null;
        if (current !== key) sprite.anims.play(key, true);
    }

    _refreshCaveFurnaceModal() {
        if (!this._furnaceModal) return;
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        const elC = document.getElementById('cave-furnace-copper-qty');
        const elT = document.getElementById('cave-furnace-tin-qty');
        if (elC) elC.textContent = findQty('copper_ore');
        if (elT) elT.textContent = findQty('tin_ore');
        const btnCopper = document.getElementById('cave-smelt-copper');
        const btnBronze = document.getElementById('cave-smelt-bronze');
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
            btnCopper.disabled = this.smeltingActive && this._smeltType !== 'copper_bar'; btnCopper.style.opacity = btnCopper.disabled ? '0.6' : '1';
            btnCopper.onclick = () => {
                if (this.smeltingActive) { if (this._smeltType === 'copper_bar') this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
                else this._startContinuousSmelting('copper_bar');
                this._refreshCaveFurnaceModal();
            };
        }
        if (btnBronze) {
            if (this.smeltingActive && this._smeltType === 'bronze_bar') { btnBronze.textContent = 'Stop Smelting ' + (bronzeRecipe && bronzeRecipe.name ? bronzeRecipe.name : 'Bronze'); btnBronze.style.background = '#aa4422'; }
            else { btnBronze.textContent = buildLabel(bronzeRecipe) || 'Smelt Bronze'; btnBronze.style.background = '#7a5f3a'; }
            btnBronze.disabled = this.smeltingActive && this._smeltType !== 'bronze_bar'; btnBronze.style.opacity = btnBronze.disabled ? '0.6' : '1';
            btnBronze.onclick = () => {
                if (this.smeltingActive) { if (this._smeltType === 'bronze_bar') this._stopContinuousSmelting(); else this._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[this._smeltType] ? (window.RECIPE_DEFS[this._smeltType].name || this._smeltType) : this._smeltType)); }
                else this._startContinuousSmelting('bronze_bar');
                this._refreshCaveFurnaceModal();
            };
        }
    }

    // Reuse same smelting control methods as Town but ensure they exist in Cave
    _startContinuousSmelting(type) {
        if (this.smeltingActive) return;
        const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
        const recipe = recipes[type];
        if (!recipe) { this._showToast('Unknown recipe'); return; }
        // quick requirement check before scheduling
        const inv = this.char.inventory || [];
        const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        let ok = true;
        for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
        if (!ok) { this._showToast('Missing materials'); return; }

        this.smeltingActive = true;
        this._smeltType = type;
        setSceneActivity(this, 'smithing', { source: 'smelting-start', timeout: 0 });
        // start furnace flame
        try { this._setFurnaceFlame(true); } catch(e) {}
        // schedule-first: wait interval, then call _attemptSmelt
    this._smeltingEvent = addTimeEvent(this, { delay: this.smeltingInterval, callback: this._attemptSmelt, callbackScope: this, args: [type], loop: true });
        this._showToast('Started smelting ' + (recipe.name || type));
    try { if (this._setFurnaceFlame) this._setFurnaceFlame(true); } catch(e) {}
        // show smithing HUD and refresh modal
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
        this._refreshCaveFurnaceModal();
    }

    _stopContinuousSmelting() {
    if (!this.smeltingActive) return;
    this.smeltingActive = false;
    if (this._smeltingEvent) { try { if (typeof this._smeltingEvent === 'function') this._smeltingEvent(); else this._smeltingEvent.remove && this._smeltingEvent.remove(false); } catch (e) {} this._smeltingEvent = null; }
        this._showToast('Smelting stopped');
        this._smeltType = null;
    // stop furnace flame
    try { this._setFurnaceFlame(false); } catch(e) {}
    try { if (this._setFurnaceFlame) this._setFurnaceFlame(false); } catch(e) {}
        if (this.miningActive) setSceneActivity(this, 'mining', { silent: true, source: 'smelting-stop', timeout: 0 });
        else clearActivity(this, { source: 'smelting-stop' });
        this._refreshCaveFurnaceModal();
    try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _attemptSmelt(recipeId) {
        const inv = this.char.inventory = this.char.inventory || [];
        const find = (id) => inv.find(x => x && x.id === id);
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
                try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
                this._showToast('Out of materials for ' + (recipe.name || recipeId));
                return;
            }
        }
        // consume materials (slot-aware when possible)
        for (const req of (recipe.requires || [])) {
            const qtyNeeded = (req.qty || 1);
            if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
                const ok = window.__shared_ui.removeItemFromInventory(this, req.id, qtyNeeded);
                if (!ok) { this._stopContinuousSmelting(); this._showToast('Out of materials for ' + (recipe.name || recipeId)); return; }
            } else {
                const it = find(req.id);
                if (it) {
                    it.qty -= qtyNeeded;
                    if (it.qty <= 0) {
                        if (window && window.__shared_ui && window.__shared_ui.removeItemFromSlots) {
                            window.__shared_ui.removeItemFromSlots(inv, req.id, 0);
                        } else {
                            inv.splice(inv.indexOf(it), 1);
                        }
                    }
                }
            }
        }
        // give product
        const prodId = recipe.id || recipeId;
        const prodDef = items && items[prodId];
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
    // refresh stats modal if open (smithing xp shown in skills)
    try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch(e) { /* ignore */ }
        if (this.char.smithing) {
            while (this.char.smithing.exp >= this.char.smithing.expToLevel) {
                this.char.smithing.exp -= this.char.smithing.expToLevel;
                this.char.smithing.level = (this.char.smithing.level || 1) + 1;
                this.char.smithing.expToLevel = Math.floor(this.char.smithing.expToLevel * 1.25);
                try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'smithing', 1); } catch (e) {}
                this._showToast('Smithing level up! L' + this.char.smithing.level, 1800);
            }
        }
        this._persistCharacter((this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null);
        // Avoid recreating HUD every tick; refresh modal and inventory UI only
        this._refreshCaveFurnaceModal();
        if (this._inventoryModal) this._refreshInventoryModal();
    }

    _setFurnaceFlame(active) {
        if (!this.furnace) return;
        if (active) {
            if (!this.anims.exists('furnace_burn')) console.warn('furnace_burn animation not found for furnace');
            try { this.furnace.play('furnace_burn', true); } catch (e) { console.warn('Could not play furnace animation', e); }
        } else {
            if (this.furnace.anims) this.furnace.anims.stop();
            if (this.furnace.setFrame) this.furnace.setFrame(0);
        }
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
        // Refresh inventory modal if open so changes appear immediately
        try { if (this._refreshInventoryModal) this._refreshInventoryModal(); } catch (e) { /* ignore */ }
    }

    update(time, delta) {
        if (!this.player || !this.keys) return;
        const movement = updateSmoothPlayerMovement(this, { baseSpeed: 180, runMultiplier: 1.6, smoothing: 0.18 });
        if (!movement) return;
        if (!this.miningActive) playDirectionalAnimation(this, movement);
        updateDepthForTopDown(this, { min: 0.9, max: 2.4 });

        // portal interaction
        if (this.portal) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const dist = Phaser.Math.Distance.Between(_px, _py, this.portal.x, this.portal.y);
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
                    this.scene.start('Town', { character: this.char, username: username, spawnX: 120, spawnY: this.portal ? this.portal.y : (this.scale.height - 120) });
                }
            } else { this.portalPrompt.setVisible(false); }
        }

        // furnace interaction (show prompt + open modal)
        if (this.furnace) {
            // compute distance using the player's physics-body center so interaction matches collision center
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const fdist = Phaser.Math.Distance.Between(_px, _py, this.furnace.x, this.furnace.y);
            if (fdist <= 56) {
                this.furnacePrompt.setVisible(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                    this._openFurnaceModal();
                }
            } else {
                this.furnacePrompt.setVisible(false);
                if (this._furnaceModal) this._closeCaveFurnaceModal();
            }
        }

        // Wayne Mineson interaction (tutorial NPC)
        try { if (this._updateWayneAI) this._updateWayneAI(time, delta); } catch (e) {}
        if (this._wayne) {
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            const wdist = Phaser.Math.Distance.Between(_px, _py, this._wayne.x, this._wayne.y);
            if (this._waynePrompt) this._waynePrompt.setVisible(wdist <= 56);
            if (wdist <= 56 && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
                try { this._openWayneDialogue && this._openWayneDialogue(); } catch (e) {}
            }
        }

        // mining node interaction (support multiple nodes)
        if (this.miningNodes && this.miningNodes.length) {
            let nearest = null;
            let nearestDist = 9999;
            // use player's physics-body center so proximity checks match the collider used for movement
            const _px = (this.player && this.player.body) ? (this.player.body.x + ((this.player.body.width||0) / 2)) : this.player.x;
            const _py = (this.player && this.player.body) ? (this.player.body.y + ((this.player.body.height||0) / 2)) : this.player.y;
            for (const node of this.miningNodes) {
                const dist = Phaser.Math.Distance.Between(_px, _py, node.x, node.y);
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
        const mining = this.char.mining = this.char.mining || { level: 1, exp: 0, expToLevel: 100 };
        const snapshot = this._getMiningSnapshot();

        const intervalMs = Math.max(200, this._currentMiningInterval || this.miningInterval || 2800);
        try {
            const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
            const tex = this.textures.get(mineKey);
            let frameNames = [];
            if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
            const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
            const rows = 4;
            const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
            const dir = this._facing || 'down';
            const rowIndex = { up: 0, left: 1, down: 2, right: 3 }[dir] || 2;
            if (framesPerRow > 0) {
                const startFrame = rowIndex * framesPerRow;
                const endFrame = startFrame + framesPerRow - 1;
                const fps = Math.max(1, Math.round(framesPerRow / (intervalMs / 1000)));
                const animKey = `mine_${dir}`;
                try { if (this.anims.exists(animKey)) this.anims.remove(animKey); } catch (e) {}
                try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(mineKey, { start: startFrame, end: endFrame }), frameRate: fps, repeat: 0 }); } catch (e) {}
            } else if (totalFrames > 0) {
                const fps = Math.max(1, Math.round(totalFrames / (intervalMs / 1000)));
                try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
            }
        } catch (e) {}

        try {
            const dir = this._facing || 'down';
            const dirAnimName = `mine_${dir}`;
            const usedDirectional = this.anims.exists(dirAnimName);
            const animKey = usedDirectional ? dirAnimName : (this.anims.exists('mine') ? 'mine' : null);
            if (this.player && animKey) this.player.anims.play(animKey, true);
            if (this.player) {
                if (usedDirectional) this.player.setFlipX(false);
                else this.player.setFlipX((this._facing || 'down') === 'left');
            }
        } catch (e) {}

        const requiredEff = Math.max(1, node.minEfficiency || 10);
        const ratioRaw = requiredEff > 0 ? snapshot.efficiency / requiredEff : snapshot.efficiency;
        const ratio = (Number.isFinite(ratioRaw) && ratioRaw > 0) ? ratioRaw : 0;
        const successChance = Math.min(1, Math.max(0, ratio));
        const success = Math.random() < successChance;

        const baseYield = Math.max(1, node.baseYield || 1);
        const baseExp = (node.baseExp != null) ? node.baseExp : 15;
        const maxMultiplier = (node.maxMultiplier != null) ? node.maxMultiplier : null;

        if (success) {
            const guaranteed = Math.max(1, Math.floor(ratio));
            const fractional = ratio - Math.floor(ratio);
            let multiplier = guaranteed;
            if (Math.random() < Math.max(0, Math.min(1, fractional))) multiplier += 1;
            if (maxMultiplier != null) multiplier = Math.min(maxMultiplier, multiplier);
            multiplier = Math.max(1, multiplier);

            node.item = node.item || { id: `${node.type || 'ore'}_ore`, name: node.label || 'Ore' };
            if (!node.item.name) node.item.name = node.label || 'Ore';
            let itemName = node.item.name;
            try {
                if (window && window.ITEM_DEFS && window.ITEM_DEFS[node.item.id] && window.ITEM_DEFS[node.item.id].name) {
                    itemName = window.ITEM_DEFS[node.item.id].name;
                }
            } catch (e) {}

            const quantity = Math.max(1, Math.round(baseYield * multiplier));

            let addedToShared = false;
            try {
                if (window && window.__shared_ui && typeof window.__shared_ui.addItemToInventory === 'function') {
                    window.__shared_ui.addItemToInventory(this, node.item.id, quantity);
                    addedToShared = true;
                }
            } catch (e) {}
            if (!addedToShared) {
                this.char.inventory = this.char.inventory || [];
                const slot = this.char.inventory.find(it => it && it.id === node.item.id);
                if (slot && typeof slot.qty === 'number') slot.qty += quantity;
                else this.char.inventory.push({ id: node.item.id, name: itemName, qty: quantity });
            }

            try {
                updateQuestProgress(this.char, 'mine', node.item.id, quantity);
                if (window && window.__shared_ui && window.__shared_ui.refreshQuestLogModal && this._questLogModal) {
                    window.__shared_ui.refreshQuestLogModal(this);
                }
            } catch (e) {}

            let xpGain = Math.max(1, Math.round(baseExp * multiplier));
            // Apply skillXpGain and miningXpGain talent modifiers
            try {
                const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                    ? window.__shared_ui.stats.effectiveStats(this.char)
                    : null;
                const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
                
                // General skill XP gain bonus
                if (eff && (eff.skillXpBonusPercent || eff.skillXpFlatBonus)) {
                    const flatBonus = Number(eff.skillXpFlatBonus || 0);
                    const pctBonus = Number(eff.skillXpBonusPercent || 0);
                    xpGain = Math.max(1, Math.round((xpGain + flatBonus) * (1 + (pctBonus / 100))));
                }
                
                // Mining-specific XP gain bonus
                const miningXpMod = tmods['miningXpGain'] || null;
                if (miningXpMod) {
                    const flatBonus = Number(miningXpMod.flat || 0);
                    const pctBonus = Number(miningXpMod.percent || 0);
                    xpGain = Math.max(1, Math.round((xpGain + flatBonus) * (1 + (pctBonus / 100))));
                }
            } catch (e) {}
            mining.exp = (mining.exp || 0) + xpGain;
            this._showToast(`You mined ${quantity}x ${itemName}! (+${xpGain} mining XP)`);
            this._playMiningSwingEffect(node, true);
            if (multiplier > 1 && node.sprite) {
                this.tweens.add({ targets: node.sprite, scale: { from: 1.12, to: 1.24 }, yoyo: true, duration: 220, ease: 'Sine.easeOut' });
            }
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
        } else {
            let failExp = (node.failExp != null) ? node.failExp : Math.max(1, Math.round(baseExp * 0.3));
            // Apply skillXpGain and miningXpGain talent modifiers
            try {
                const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                    ? window.__shared_ui.stats.effectiveStats(this.char)
                    : null;
                const tmods = (this.char && this.char._talentModifiers) ? this.char._talentModifiers : {};
                
                // General skill XP gain bonus
                if (eff && (eff.skillXpBonusPercent || eff.skillXpFlatBonus)) {
                    const flatBonus = Number(eff.skillXpFlatBonus || 0);
                    const pctBonus = Number(eff.skillXpBonusPercent || 0);
                    failExp = Math.max(1, Math.round((failExp + flatBonus) * (1 + (pctBonus / 100))));
                }
                
                // Mining-specific XP gain bonus
                const miningXpMod = tmods['miningXpGain'] || null;
                if (miningXpMod) {
                    const flatBonus = Number(miningXpMod.flat || 0);
                    const pctBonus = Number(miningXpMod.percent || 0);
                    failExp = Math.max(1, Math.round((failExp + flatBonus) * (1 + (pctBonus / 100))));
                }
            } catch (e) {}
            mining.exp = (mining.exp || 0) + failExp;
            const deficit = Math.max(0, Math.ceil(requiredEff - snapshot.efficiency));
            if (deficit > 0) this._showToast(`The vein resists (need +${deficit} efficiency). (+${failExp} mining XP)`);
            else this._showToast(`You swing and miss the sweet spot. (+${failExp} mining XP)`);
            this._playMiningSwingEffect(node, false);
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
        }

        while (mining.exp >= mining.expToLevel) {
            mining.exp -= mining.expToLevel;
            mining.level = (mining.level || 1) + 1;
            mining.expToLevel = Math.floor(mining.expToLevel * 1.25);
            this._showToast('Mining level up! L' + mining.level, 2200);
            try { onSkillLevelUp && onSkillLevelUp(this, this.char, 'mining', 1); } catch (e) {}
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && this._statsModal) window.__shared_ui.refreshStatsModal(this); } catch (e) {}
        }

        this.char.mining = mining;
        const username = (this.sys && this.sys.settings && this.sys.settings.data && this.sys.settings.data.username) || null;
        this._persistCharacter(username);
        try { this._updateHUD(); } catch (e) { try { this._destroyHUD(); this._createHUD(); } catch (_) {} }
    }
    _startContinuousMining() {
        if (this.miningActive) return;
        this.miningActive = true;
        // mark activity as mining so HUD shows mining progress
        setSceneActivity(this, 'mining', { source: 'mining-start', timeout: 0 });
        const snapshot = this._getMiningSnapshot();
        const baseInterval = this.miningInterval || 2800;
        const statReduction = Math.round((snapshot.miningLevel || 1) * 20 + (snapshot.str || 0) * 8);
        const toolReduction = Math.round(snapshot.toolSpeed || 0);
        let calculatedInterval = Math.max(800, baseInterval - statReduction - toolReduction);
        // Apply gatherSpeed talent modifiers
        try {
            const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                ? window.__shared_ui.stats.effectiveStats(this.char)
                : null;
            if (eff && (eff.gatherSpeedBonusPercent || eff.gatherSpeedFlatBonus)) {
                const flatBonus = Number(eff.gatherSpeedFlatBonus || 0);
                const pctBonus = Number(eff.gatherSpeedBonusPercent || 0);
                // Flat bonus reduces ms (negative = faster), percent bonus reduces duration
                calculatedInterval = Math.max(200, Math.round((calculatedInterval - flatBonus) / (1 + (pctBonus / 100))));
            }
        } catch (e) {}
        this._currentMiningInterval = calculatedInterval;
        // Play the swing animation immediately for feedback, but schedule the first mining attempt
        // to occur after the miningInterval so the player must wait the mining speed to get ore.
        try {
            // create/play directional or fallback mine animation matching the mining interval duration
            const mineKey = (this.char && this.char._terrorFormEnabled) ? 'dude_mine_terror' : 'dude_mine';
            const tex = this.textures.get(mineKey);
            let frameNames = [];
            if (tex && typeof tex.getFrameNames === 'function') frameNames = tex.getFrameNames();
            const totalFrames = (frameNames && frameNames.length) ? frameNames.length : 0;
            const rows = 4;
            const framesPerRow = (totalFrames > 0) ? Math.floor(totalFrames / rows) : 0;
            const dir = this._facing || 'down';
            const rowIndex = { up: 0, left: 1, down: 2, right: 3 }[dir] || 2;
            if (framesPerRow > 0) {
                const start = rowIndex * framesPerRow;
                const end = start + framesPerRow - 1;
                const durationMs = Math.max(200, this._currentMiningInterval || this.miningInterval || 2800);
                const fps = Math.max(1, Math.round(framesPerRow / (durationMs / 1000)));
                const animKey = 'mine_' + dir;
                try { if (this.anims.exists(animKey)) this.anims.remove(animKey); } catch (e) {}
                try { this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(mineKey, { start: start, end: end }), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists(animKey)) this.player.anims.play(animKey, true); } catch (e) {}
                try { if (this.player) this.player.setFlipX(false); } catch (e) {}
            } else if (totalFrames > 0) {
                const durationMs = Math.max(200, this._currentMiningInterval || this.miningInterval || 2800);
                const fps = Math.max(1, Math.round(totalFrames / (durationMs / 1000)));
                try { if (this.anims.exists('mine')) this.anims.remove('mine'); } catch (e) {}
                try { this.anims.create({ key: 'mine', frames: this.anims.generateFrameNumbers(mineKey), frameRate: fps, repeat: 0 }); } catch (e) {}
                try { if (this.player && this.anims.exists('mine')) this.player.anims.play('mine', true); } catch (e) {}
                try { if (this.player) this.player.setFlipX((this._facing || 'down') === 'left'); } catch (e) {}
            }
        } catch (e) {}
        // schedule the first actual mining attempt after the configured interval
        const delay = this._currentMiningInterval || this.miningInterval || 2800;
    this._miningEvent = addTimeEvent(this, { delay, callback: this._attemptMine, callbackScope: this, loop: true });
        // show mining indicator
        this._showMiningIndicator();
        // refresh HUD immediately so the mining bar appears
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }

    _stopContinuousMining() {
        this.miningActive = false;
        this._currentMiningInterval = null;
        if (this._miningEvent) { try { if (typeof this._miningEvent === 'function') this._miningEvent(); else this._miningEvent.remove && this._miningEvent.remove(false); } catch (e) {} this._miningEvent = null; }
        this._hideMiningIndicator();
        if (this.smeltingActive) setSceneActivity(this, 'smithing', { silent: true, source: 'mining-stop', timeout: 0 });
        else clearActivity(this, { source: 'mining-stop' });
        // refresh HUD so it reverts to class exp bar
        try { this._updateHUD(); } catch(e) { try { this._destroyHUD(); this._createHUD(); } catch(_) {} }
    }
}

applyCombatMixin(Cave.prototype);

