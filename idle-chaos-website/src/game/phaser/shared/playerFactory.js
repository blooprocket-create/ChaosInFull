// Centralized player creation helper
// Usage: import { createPlayer } from '../shared/playerFactory.js';
export function createPlayer(scene, x = 120, y = 120, key = 'dude_idle', opts = {}) {
    if (!scene || !scene.physics || !scene.add) return null;
    const player = scene.physics.add.sprite(x, y, key);
    // default depth (scenes may reassign after creation)
    player.setDepth((opts.depth != null) ? opts.depth : 2);
    player.setCollideWorldBounds(true);
    try {
        const pw = Math.round(player.displayWidth || (player.width || 32));
        const ph = Math.round(player.displayHeight || (player.height || 48));
        const bw = Math.max(12, Math.round(pw * 0.44));
        const bh = Math.max(14, Math.round(ph * 0.55));
        const offsetX = Math.max(0, Math.round((pw - bw) / 2));
        const offsetY = Math.max(0, Math.round(ph - bh - Math.max(2, Math.round(ph * 0.06))));
        if (player.body && typeof player.body.setSize === 'function') player.body.setSize(bw, bh);
        if (player.body && typeof player.body.setOffset === 'function') player.body.setOffset(offsetX, offsetY);
    } catch (e) {
        try { if (player.body && typeof player.body.setSize === 'function') player.body.setSize(20, 40); if (player.body && typeof player.body.setOffset === 'function') player.body.setOffset(6, 8); } catch (e2) {}
    }
    try { if (player.body && typeof player.body.setDamping === 'function') player.body.setDamping(true); } catch (e) {}
    try { if (player.body) player.body.useDamping = true; } catch (e) {}
    try { if (player.body && typeof player.body.setDrag === 'function') player.body.setDrag(0.001); } catch (e) {}
    try { if (player.body) player.body.maxSpeed = Math.max(player.body.maxSpeed || 0, opts.maxSpeed || 420); } catch (e) {}
    // top-down: disable gravity by default
    try { if (player.body) player.body.allowGravity = false; } catch (e) {}
    return player;
}
