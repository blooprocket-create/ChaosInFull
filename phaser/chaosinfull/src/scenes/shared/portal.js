// Shared portal helper: createPortal(scene, x, y, opts)
// opts: { key?: animationKey, frameWidth?: number, frameHeight?: number, depth?: number, fallbackColor?: number }
export function ensurePortalAnim(scene, opts = {}) {
    const animKey = opts.key || 'portal_anim';
    if (scene.anims.exists(animKey)) return animKey;
    try {
        const tex = scene.textures.get('portal');
        const img = (tex && tex.getSourceImage && tex.getSourceImage()) || (tex && tex.source && tex.source[0] && tex.source[0].image);
        if (img) {
            const fw = opts.frameWidth || 32;
            const fh = opts.frameHeight || 32;
            const cols = Math.max(1, Math.floor(img.width / fw));
            const rows = Math.max(1, Math.floor(img.height / fh));
            const total = Math.max(1, cols * rows);
            if (total > 1) {
                scene.anims.create({ key: animKey, frames: scene.anims.generateFrameNumbers('portal', { start: 0, end: total - 1 }), frameRate: 10, repeat: -1 });
                return animKey;
            }
        }
    } catch (e) { /* ignore */ }
    return animKey;
}

export function createPortal(scene, x, y, opts = {}) {
    const depth = opts.depth != null ? opts.depth : 1.5;
    const animKey = opts.key || 'portal_anim';
    let usedFallback = false;
    let portal = null;
    try {
        ensurePortalAnim(scene, opts);
        portal = scene.add.sprite(x, y, 'portal', 0).setDepth(depth);
        if (scene.anims.exists(animKey)) {
            try { portal.play(animKey); } catch (e) { /* ignore play errors */ }
        } else {
            scene.tweens.add({ targets: portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        }
    } catch (e) {
        usedFallback = true;
        const color = opts.fallbackColor != null ? opts.fallbackColor : 0x6666cc;
        portal = scene.add.circle(x, y, 28, color, 0.95).setDepth(depth);
        scene.tweens.add({ targets: portal, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    }

    function tryUpgrade() {
        if (!usedFallback) return;
        try {
            if (scene.anims.exists(animKey) && portal && portal.destroy) {
                const px = portal.x; const py = portal.y;
                portal.destroy();
                portal = scene.add.sprite(px, py, 'portal', 0).setDepth(depth);
                try { portal.play(animKey); } catch (e) { /* ignore */ }
                usedFallback = false;
            }
        } catch (e) { /* ignore */ }
    }

    // expose small API: sprite (or circle), upgrade attempt, destroy
    return {
        get display() { return portal; },
        tryUpgrade,
        destroy: () => { try { if (portal && portal.destroy) portal.destroy(); } catch (e) {} }
    };
}

export default { ensurePortalAnim, createPortal };
