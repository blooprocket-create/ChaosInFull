// Small helpers to center physics bodies relative to their sprite visuals
export function setCircleCentered(spriteOrBody, radius) {
    try {
        if (!spriteOrBody) return;
        const body = spriteOrBody.body ? spriteOrBody.body : spriteOrBody;
        if (!body) return;
        // compute visual size from sprite when available, otherwise use body dims
        const sprite = spriteOrBody.body ? spriteOrBody : null;
        const w = (sprite && (sprite.displayWidth || sprite.width)) || (body.width || 0);
        const h = (sprite && (sprite.displayHeight || sprite.height)) || (body.height || 0);
        const r = Math.max(0, Math.round(radius || 0));
        const ox = Math.round((w / 2) - r);
        const oy = Math.round((h / 2) - r);
        if (typeof body.setCircle === 'function') {
            try { body.setCircle(r, ox, oy); } catch (e) { /* ignore */ }
        } else if (typeof body.setSize === 'function') {
            try { body.setSize(r * 2, r * 2); if (typeof body.setOffset === 'function') body.setOffset(ox, oy); } catch (e) { /* ignore */ }
        }
    } catch (e) {}
}

export function setBodySizeCentered(sprite, width, height) {
    try {
        if (!sprite) return;
        const body = sprite.body ? sprite.body : null;
        if (!body) return;
        const w = Math.max(0, Math.round(width || 0));
        const h = Math.max(0, Math.round(height || 0));
        try { if (typeof body.setSize === 'function') body.setSize(w, h); } catch (e) {}
        // offset so the body is centered under the sprite visual
        try {
            const sw = (sprite.displayWidth || sprite.width) || w;
            const sh = (sprite.displayHeight || sprite.height) || h;
            const ox = Math.round((sw - w) / 2);
            const oy = Math.round((sh - h) / 2);
            if (typeof body.setOffset === 'function') body.setOffset(ox, oy);
        } catch (e) {}
    } catch (e) {}
}

export default { setCircleCentered, setBodySizeCentered };
