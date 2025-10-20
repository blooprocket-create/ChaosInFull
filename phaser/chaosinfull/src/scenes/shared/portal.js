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

    // If opts.targetScene or opts.onEnter provided, wire interaction logic here so
    // scenes don't need to duplicate proximity + E handling. Default behavior when
    // targetScene is provided: persist character and start that scene (pass spawnX/spawnY).
    let prompt = null;
    let updateHandler = null;
    if (opts && (opts.targetScene || opts.onEnter || opts.promptText)) {
        const promptText = opts.promptText || ('[E] ' + (opts.promptLabel || (opts.targetScene || 'Enter')));
        try {
            prompt = scene.add.text(x, y - 60, promptText, { fontSize: '14px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(depth + 0.5);
            prompt.setVisible(false);
        } catch (e) { prompt = null; }

        // proximity check on each update
        updateHandler = function () {
            try {
                if (!scene || !scene.player) return;
                // ensure an interact key is available (fallback if shared keys weren't attached)
                try {
                    if ((!scene.keys || !scene.keys.interact) && scene.input && scene.input.keyboard) {
                        scene.keys = scene.keys || {};
                        scene.keys.interact = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
                    }
                } catch (e) { /* ignore fallback errors */ }

                if (!scene.keys || !scene.keys.interact) return;
                const px = portal.x || (portal.body && portal.body.x) || x;
                const py = portal.y || (portal.body && portal.body.y) || y;
                const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, px, py);
                if (dist <= (opts.range || 60)) {
                    if (prompt) prompt.setVisible(true);
                    if (Phaser.Input.Keyboard.JustDown(scene.keys.interact)) {
                        // default persistence & scene start behavior
                        if (opts.onEnter && typeof opts.onEnter === 'function') {
                            try { opts.onEnter(scene, portal); } catch (e) {}
                        } else if (opts.targetScene) {
                            try {
                                const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
                                // persist character generically (replace stored character object)
                                try {
                                    const key = 'cif_user_' + username;
                                    const userObj = JSON.parse(localStorage.getItem(key));
                                    if (userObj && userObj.characters) {
                                        let found = false;
                                        for (let i = 0; i < userObj.characters.length; i++) {
                                            const uc = userObj.characters[i];
                                            if (!uc) continue;
                                            if ((uc.id && scene.char && scene.char.id && uc.id === scene.char.id) || (!uc.id && uc.name === (scene.char && scene.char.name))) {
                                                userObj.characters[i] = scene.char;
                                                userObj.characters[i].lastLocation = { scene: opts.targetScene, x: scene.player.x, y: py };
                                                found = true;
                                                break;
                                            }
                                        }
                                        if (!found) {
                                            for (let i = 0; i < userObj.characters.length; i++) {
                                                if (!userObj.characters[i]) { userObj.characters[i] = scene.char; found = true; break; }
                                            }
                                            if (!found) userObj.characters.push(scene.char);
                                        }
                                        localStorage.setItem(key, JSON.stringify(userObj));
                                    }
                                } catch (e) { /* ignore persist errors */ }

                                const spawnX = (opts.spawnX !== undefined) ? opts.spawnX : (scene.scale && Math.max(80, scene.scale.width * 0.12));
                                const spawnY = (opts.spawnY !== undefined) ? opts.spawnY : py;
                                try { scene.scene.start(opts.targetScene, { character: scene.char, username: username, spawnX: spawnX, spawnY: spawnY }); } catch (e) { /* ignore start errors */ }
                            } catch (e) { /* ignore */ }
                        }
                    }
                } else {
                    if (prompt) prompt.setVisible(false);
                }
            } catch (e) { /* ignore update errors */ }
        };

        // attach handler to scene update
        try { scene.events.on('update', updateHandler); } catch (e) {}
    }

    function destroy() {
        try { if (prompt && prompt.destroy) prompt.destroy(); } catch (e) {}
        try { if (portal && portal.destroy) portal.destroy(); } catch (e) {}
        try { if (updateHandler && scene && scene.events) scene.events.off('update', updateHandler); } catch (e) {}
    }

    // expose small API: sprite (or circle), upgrade attempt, destroy
    return {
        get display() { return portal; },
        tryUpgrade,
        destroy
    };
}

export default { ensurePortalAnim, createPortal };
