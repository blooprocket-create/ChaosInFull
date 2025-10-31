const FLOOR_THEMES = {
    town: {
        baseColor: 0x202028,
        accentColor: 0x2b2c38,
        accentRange: [-20, 18],
        tileSize: 36,
        tilePadding: 1,
        tileLineColor: 0x06070a,
        tileLineAlpha: 0.08,
        highlight: { width: 0.34, height: 0.22, offsetY: 12, alpha: 0.16, color: 0x11131a },
        noise: { color: 0x000000, density: 0.00028, alpha: [0.05, 0.18], radius: [1, 3] },
        speckle: { color: 0x40445e, density: 0.00022, alpha: [0.08, 0.24], size: [2, 4] },
        veins: { color: 0x15171f, alpha: 0.18, min: 36, max: 82 }
    },
    field: {
        baseColor: 0x192517,
        accentColor: 0x243b1e,
        accentRange: [-16, 14],
    // tileSize increased to 64 so ground tiles match the 64px grass spritesheets
    tileSize: 64,
    tilePadding: 0,
        tileLineColor: 0x0c130d,
        tileLineAlpha: 0.06,
        highlight: { width: 0.38, height: 0.26, offsetY: 14, alpha: 0.18, color: 0x0f180f },
        noise: { color: 0x09140a, density: 0.00032, alpha: [0.06, 0.2], radius: [1, 3] },
        speckle: { color: 0x355030, density: 0.0002, alpha: [0.1, 0.28], size: [2, 4] },
        veins: { color: 0x162612, alpha: 0.22, min: 42, max: 96 },
        // optional spritesheets to use for ground tiles. Each spritesheet is expected
        // to be a 3x3 grid of 64px tiles (frames 0..8). When present, these are
        // used instead of the procedural square tiles to create a richer ground.
        groundSprites: { keys: ['grass_01', 'grass_02'], frameSize: 64 }
    },
    forest: {
        baseColor: 0x1a2616,
        accentColor: 0x2c4a2a,
        accentRange: [-14, 16],
    // tileSize increased to 64 so ground tiles match the 64px grass spritesheets
    tileSize: 64,
    tilePadding: 0,
        tileLineColor: 0x0c140c,
        tileLineAlpha: 0.08,
        highlight: { width: 0.32, height: 0.24, offsetY: 10, alpha: 0.22, color: 0x0f1b10 },
        noise: { color: 0x060b07, density: 0.00034, alpha: [0.08, 0.22], radius: [1, 3] },
        speckle: { color: 0x304e2c, density: 0.00025, alpha: [0.12, 0.32], size: [2, 4] },
        veins: { color: 0x0f1d11, alpha: 0.28, min: 40, max: 90 },
        groundSprites: { keys: ['forest_01', 'forest_02'], frameSize: 64 }
    },
    cave: {
        baseColor: 0x2b2926,
        accentColor: 0x3c3833,
        accentRange: [-18, 14],
        tileSize: 34,
        tilePadding: 1,
        tileLineColor: 0x090808,
        tileLineAlpha: 0.1,
        highlight: { width: 0.36, height: 0.2, offsetY: 18, alpha: 0.18, color: 0x181716 },
        noise: { color: 0x050505, density: 0.00036, alpha: [0.08, 0.22], radius: [1, 3] },
        speckle: { color: 0x3f3b38, density: 0.00018, alpha: [0.12, 0.3], size: [2, 4] },
        veins: { color: 0x141210, alpha: 0.22, min: 48, max: 104 }
    },
    goblin: {
        baseColor: 0x2a221b,
        accentColor: 0x3c2f26,
        accentRange: [-18, 16],
        tileSize: 36,
        tilePadding: 1,
        tileLineColor: 0x0a0604,
        tileLineAlpha: 0.1,
        highlight: { width: 0.34, height: 0.22, offsetY: 14, alpha: 0.2, color: 0x1a120c },
        noise: { color: 0x120a05, density: 0.00034, alpha: [0.07, 0.24], radius: [1, 3] },
        speckle: { color: 0x4a3728, density: 0.0002, alpha: [0.14, 0.34], size: [2, 4] },
        veins: { color: 0x1b130c, alpha: 0.24, min: 42, max: 100 }
    },
    dock_ground: {
        baseColor: 0x3f2d20,
        accentColor: 0x523b28,
        accentRange: [-18, 16],
        tileSize: 34,
        tilePadding: 1,
        tileLineColor: 0x120b06,
        tileLineAlpha: 0.1,
        highlight: { width: 0.36, height: 0.18, offsetY: 10, alpha: 0.18, color: 0x21160c },
        noise: { color: 0x140902, density: 0.00038, alpha: [0.08, 0.24], radius: [1, 3] },
        speckle: { color: 0x5c402d, density: 0.00022, alpha: [0.12, 0.34], size: [2, 4] },
        veins: { color: 0x1a0f07, alpha: 0.24, min: 42, max: 96 }
    },
    dock_water: {
        baseColor: 0x17253a,
        accentColor: 0x223a5a,
        accentRange: [-14, 18],
        tileSize: 40,
        tilePadding: 1,
        tileLineColor: 0x0b121f,
        tileLineAlpha: 0.08,
        highlight: { width: 0.44, height: 0.3, offsetY: 0, alpha: 0.26, color: 0x14304d },
        noise: { color: 0x0b1624, density: 0.00028, alpha: [0.08, 0.22], radius: [1, 3] },
        speckle: { color: 0x2b4a73, density: 0.00016, alpha: [0.14, 0.3], size: [2, 4] },
        veins: { color: 0x142337, alpha: 0.2, min: 52, max: 112 }
    }
};

const AMBIENT_THEMES = {
    town: {
        overlayTop: 0x2a3050,
        overlayBottom: 0x121622,
        overlayAlpha: 0.22,
        overlayBlend: Phaser.BlendModes.SOFT_LIGHT,
        particleColor: 0x7ea2ff,
        particleAlpha: [0.28, 0],
        particleScale: [0.65, 0.15],
        particleSpeed: 18,
        particleLife: [5200, 9200],
        particleQuantity: 2
    },
    field: {
        overlayTop: 0x223121,
        overlayBottom: 0x0e140e,
        overlayAlpha: 0.2,
        overlayBlend: Phaser.BlendModes.OVERLAY,
        particleColor: 0x7fffb2,
        particleAlpha: [0.24, 0],
        particleScale: [0.55, 0.12],
        particleSpeed: 14,
        particleLife: [4800, 8800],
        particleQuantity: 2
    },
    forest: {
        overlayTop: 0x243a2a,
        overlayBottom: 0x101a12,
        overlayAlpha: 0.24,
        overlayBlend: Phaser.BlendModes.SOFT_LIGHT,
        particleColor: 0x6dd08a,
        particleAlpha: [0.26, 0],
        particleScale: [0.5, 0.15],
        particleSpeed: 12,
        particleLife: [5200, 9400],
        particleQuantity: 2
    },
    cave: {
        overlayTop: 0x2a2a35,
        overlayBottom: 0x111118,
        overlayAlpha: 0.28,
        overlayBlend: Phaser.BlendModes.SOFT_LIGHT,
        particleColor: 0xa0b8ff,
        particleAlpha: [0.2, 0],
        particleScale: [0.55, 0.18],
        particleSpeed: 10,
        particleLife: [5600, 9800],
        particleQuantity: 2
    },
    goblin: {
        overlayTop: 0x36271d,
        overlayBottom: 0x120906,
        overlayAlpha: 0.24,
        overlayBlend: Phaser.BlendModes.MULTIPLY,
        particleColor: 0xffa26b,
        particleAlpha: [0.24, 0],
        particleScale: [0.5, 0.14],
        particleSpeed: 16,
        particleLife: [5000, 9000],
        particleQuantity: 2
    },
    dock: {
        overlayTop: 0x1c293f,
        overlayBottom: 0x0c111c,
        overlayAlpha: 0.22,
        overlayBlend: Phaser.BlendModes.SCREEN,
        particleColor: 0x7ec8ff,
        particleAlpha: [0.24, 0],
        particleScale: [0.55, 0.16],
        particleSpeed: 14,
        particleLife: [5400, 9400],
        particleQuantity: 2
    }
};

const ambientStore = new WeakMap();

function mergeNested(base, override) {
    const result = Object.assign({}, base || {});
    if (!override) return result;
    for (const key of Object.keys(override)) {
        const value = override[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = mergeNested(base ? base[key] : undefined, value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

function registerAmbient(scene, obj) {
    if (!scene || !obj) return;
    let list = ambientStore.get(scene);
    if (!list) {
        list = [];
        ambientStore.set(scene, list);
    }
    list.push(obj);
}

export function buildThemedFloor(scene, themeKey, options = {}) {
    const defaultTheme = FLOOR_THEMES[themeKey] || FLOOR_THEMES.town;
    const theme = mergeNested(defaultTheme, options);
    const width = (theme.bounds && theme.bounds.width) || scene.scale.width;
    const height = (theme.bounds && theme.bounds.height) || scene.scale.height;
    const offsetX = (theme.bounds && theme.bounds.x) || 0;
    const offsetY = (theme.bounds && theme.bounds.y) || 0;

    const tileSize = theme.tileSize || 36;
    const padding = theme.tilePadding != null ? theme.tilePadding : 1;

    const rt = scene.add.renderTexture(offsetX, offsetY, width, height).setOrigin(0).setDepth(theme.depth || 0);
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(theme.baseColor, 1);
    g.fillRect(0, 0, width, height);

    const baseColor = Phaser.Display.Color.ValueToColor(theme.baseColor);
    const accentColor = theme.accentColor != null ? Phaser.Display.Color.ValueToColor(theme.accentColor) : null;

    // If a ground sprite sheet is provided we use it to tile the ground
    // Expected spritesheet format: 3x3 frames (frames 0..8), frameSize in pixels (typically 64).
    let usedSpriteTiles = false;
    // If groundSprites provided, optionally create animated sprites or static tiles
    if (theme.groundSprites && Array.isArray(theme.groundSprites.keys) && theme.groundSprites.frameSize) {
        const sheetKeys = theme.groundSprites.keys;
        const frameSize = theme.groundSprites.frameSize;
        const framesPerSheet = 9; // 3x3
        const drawScale = (tileSize - padding * 2) / frameSize;
        usedSpriteTiles = true;

        const animated = theme.groundAnimated !== false; // default true

        // If animated, create a layer of sprites (one per tile) that play the ground animation.
        // Otherwise, draw static frames into the render texture.
        if (animated) {
            // create a container for the animated tiles so we can cleanup easily
            const container = scene.add.container(0, 0).setDepth(theme.depth != null ? theme.depth : 0);
            // ensure base renderTexture sits below animated sprites
            rt.setDepth((theme.depth != null ? theme.depth : 0));
            // register both RT and container for cleanup
            registerAmbient(scene, rt);
            registerAmbient(scene, container);

            for (let y = 0; y < height; y += tileSize) {
                for (let x = 0; x < width; x += tileSize) {
                    const sheet = sheetKeys[Phaser.Math.Between(0, sheetKeys.length - 1)];
                    if (!scene.textures.exists(sheet)) continue;
                    const animKey = `ground_${sheet}`;
                    // create sprite and play animation if anim exists, otherwise pick a random static frame
                    const sx = x + padding;
                    const sy = y + padding;
                    let spr = null;
                    try {
                        spr = scene.add.sprite(sx, sy, sheet).setOrigin(0).setScale(drawScale).setDepth((theme.depth != null ? theme.depth : 0) + 0.01);
                        if (scene.anims.exists(animKey)) {
                            spr.anims.play(animKey);
                            // desync animation by randomizing progress
                            try { spr.anims.setProgress(Math.random()); } catch (e) { /* ignore */ }
                        } else {
                            // pick a random frame
                            spr.setFrame(Phaser.Math.Between(0, framesPerSheet - 1));
                        }
                    } catch (e) {
                        // fallback: try creating an image
                        try { spr = scene.add.image(sx, sy, sheet, Phaser.Math.Between(0, framesPerSheet - 1)).setOrigin(0).setScale(drawScale).setDepth((theme.depth != null ? theme.depth : 0) + 0.01); } catch (e2) { spr = null; }
                    }
                    if (spr) {
                        container.add(spr);
                        registerAmbient(scene, spr);
                    }
                }
            }
        } else {
            for (let y = 0; y < height; y += tileSize) {
                for (let x = 0; x < width; x += tileSize) {
                    const sheet = sheetKeys[Phaser.Math.Between(0, sheetKeys.length - 1)];
                    const frame = Phaser.Math.Between(0, framesPerSheet - 1);
                    if (!scene.textures.exists(sheet)) continue;
                    const tmp = scene.add.image(0, 0, sheet, frame).setOrigin(0).setScale(drawScale).setVisible(false);
                    try {
                        rt.draw(tmp, x + padding, y + padding);
                    } catch (e) {
                        try { rt.draw(sheet, frame, x + padding, y + padding); } catch (e2) { /* ignore */ }
                    }
                    tmp.destroy();
                }
            }
        }
    }

    // If no sprite tiles were used, fall back to the procedural tile rectangles
    if (!usedSpriteTiles) {
        for (let y = 0; y < height; y += tileSize) {
            for (let x = 0; x < width; x += tileSize) {
                const variation = Phaser.Math.Between(theme.accentRange ? theme.accentRange[0] : -12, theme.accentRange ? theme.accentRange[1] : 12);
                const mix = accentColor
                    ? Phaser.Display.Color.Interpolate.ColorWithColor(baseColor, accentColor, 255, Phaser.Math.Clamp(variation + 128, 0, 255))
                    : { r: Phaser.Math.Clamp(baseColor.r + variation, 0, 255), g: Phaser.Math.Clamp(baseColor.g + variation, 0, 255), b: Phaser.Math.Clamp(baseColor.b + variation, 0, 255) };
                const color = Phaser.Display.Color.GetColor(Math.round(mix.r), Math.round(mix.g), Math.round(mix.b));
                g.fillStyle(color, 1);
                g.fillRect(x + padding, y + padding, tileSize - padding * 2, tileSize - padding * 2);
                if (theme.tileLineColor && theme.tileLineAlpha) {
                    g.lineStyle(1, theme.tileLineColor, theme.tileLineAlpha);
                    g.strokeRect(x + padding, y + padding, tileSize - padding * 2, tileSize - padding * 2);
                }
            }
        }
    }

    if (theme.noise && theme.noise.density) {
        const count = Math.round(width * height * theme.noise.density);
        for (let i = 0; i < count; i++) {
            const sx = Phaser.Math.Between(0, width);
            const sy = Phaser.Math.Between(0, height);
            const radius = Phaser.Math.Between(theme.noise.radius ? theme.noise.radius[0] : 1, theme.noise.radius ? theme.noise.radius[1] : 3);
            const alpha = Phaser.Math.FloatBetween(theme.noise.alpha ? theme.noise.alpha[0] : 0.08, theme.noise.alpha ? theme.noise.alpha[1] : 0.22);
            g.fillStyle(theme.noise.color || 0x000000, alpha);
            g.fillCircle(sx, sy, radius);
        }
    }

    if (theme.speckle && theme.speckle.density) {
        const count = Math.round(width * height * theme.speckle.density);
        for (let i = 0; i < count; i++) {
            const sx = Phaser.Math.Between(0, width);
            const sy = Phaser.Math.Between(0, height);
            const size = Phaser.Math.Between(theme.speckle.size ? theme.speckle.size[0] : 2, theme.speckle.size ? theme.speckle.size[1] : 4);
            const alpha = Phaser.Math.FloatBetween(theme.speckle.alpha ? theme.speckle.alpha[0] : 0.12, theme.speckle.alpha ? theme.speckle.alpha[1] : 0.3);
            g.fillStyle(theme.speckle.color || 0xffffff, alpha);
            g.fillRect(sx, sy, size, size * Phaser.Math.FloatBetween(0.4, 1.6));
        }
    }

    if (theme.veins) {
        const count = Math.round(width / 24);
        g.lineStyle(Phaser.Math.FloatBetween(0.6, 1.2), theme.veins.color || 0x111111, theme.veins.alpha || 0.18);
        for (let i = 0; i < count; i++) {
            const startX = Phaser.Math.Between(0, width);
            let startY = Phaser.Math.Between(0, height);
            const segments = Phaser.Math.Between(3, 6);
            let currentX = startX;
            let currentY = startY;
            g.beginPath();
            g.moveTo(currentX, currentY);
            for (let s = 0; s < segments; s++) {
                currentX += Phaser.Math.Between(-20, 20);
                currentY += Phaser.Math.Between(theme.veins.min || 40, theme.veins.max || 90) / segments;
                g.lineTo(currentX, currentY);
            }
            g.strokePath();
        }
    }

    if (theme.highlight && theme.highlight.alpha) {
        const highlight = theme.highlight;
        const hx = width * (highlight.x != null ? highlight.x : 0.5);
        const hy = height * (highlight.y != null ? highlight.y : 0.5) + (highlight.offsetY || 0);
        const hw = Math.max(60, Math.round(width * (highlight.width || 0.32)));
        const hh = Math.max(40, Math.round(height * (highlight.height || 0.2)));
        g.fillStyle(highlight.color || 0x000000, highlight.alpha);
        g.fillEllipse(hx, hy, hw, hh);
    }

    rt.draw(g, 0, 0);
    g.destroy();

    return rt;
}

function ensureParticleTexture(scene, key, color) {
    if (scene.textures.exists(key)) return;
    const size = 16;
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(color, 1);
    gfx.fillCircle(size / 2, size / 2, size / 2);
    gfx.generateTexture(key, size, size);
    gfx.destroy();
}

export function applyAmbientFx(scene, themeKey, options = {}) {
    const defaults = AMBIENT_THEMES[themeKey] || AMBIENT_THEMES.town;
    const theme = mergeNested(defaults, options);
    const width = scene.scale.width;
    const height = scene.scale.height;

    const overlay = scene.add.graphics().setScrollFactor(0).setDepth(theme.overlayDepth != null ? theme.overlayDepth : 4);
    const topColor = theme.overlayTop || 0x222530;
    const bottomColor = theme.overlayBottom || 0x111217;
    overlay.clear();
    overlay.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    overlay.fillRect(0, 0, width, height);
    overlay.setAlpha(theme.overlayAlpha != null ? theme.overlayAlpha : 0.2);
    overlay.setBlendMode(theme.overlayBlend != null ? theme.overlayBlend : Phaser.BlendModes.SOFT_LIGHT);

    scene.tweens.add({
        targets: overlay,
        alpha: {
            from: overlay.alpha,
            to: overlay.alpha * Phaser.Math.FloatBetween(0.55, 0.75)
        },
        duration: Phaser.Math.Between(3800, 5200),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });

    registerAmbient(scene, overlay);

    const particleKey = theme.particleKey || '__ambient_particle';
    ensureParticleTexture(scene, particleKey, theme.particleColor || 0xffffff);

    const sprites = [];
    const particleCount = Math.max(8, (theme.particleQuantity != null ? theme.particleQuantity : 2) * 10);
    const minLife = theme.particleLife ? theme.particleLife[0] : 5200;
    const maxLife = theme.particleLife ? theme.particleLife[1] : 9400;
    const speed = theme.particleSpeed || 16;
    const startAlpha = theme.particleAlpha ? theme.particleAlpha[0] : 0.24;
    const endAlpha = theme.particleAlpha ? theme.particleAlpha[1] : 0;
    const startScale = theme.particleScale ? theme.particleScale[0] : 0.6;
    const endScale = theme.particleScale ? theme.particleScale[1] : 0.15;
    const blendMode = theme.particleBlend != null ? theme.particleBlend : Phaser.BlendModes.ADD;

    for (let i = 0; i < particleCount; i++) {
        const sx = Phaser.Math.Between(0, width);
        const sy = Phaser.Math.Between(0, height);
        const scaleStart = Phaser.Math.FloatBetween(startScale * 0.7, startScale * 1.1);
        const sprite = scene.add.image(sx, sy, particleKey)
            .setDepth(theme.particleDepth != null ? theme.particleDepth : 5)
            .setScrollFactor(0)
            .setAlpha(startAlpha)
            .setScale(scaleStart);
        sprite.setBlendMode(blendMode);
        registerAmbient(scene, sprite);
        sprites.push(sprite);

        const duration = Phaser.Math.Between(minLife, maxLife);
        const offsetX = Phaser.Math.Between(-speed, speed);
        const offsetY = Phaser.Math.Between(-speed, speed);
        const tween = scene.tweens.add({
            targets: sprite,
            x: sprite.x + offsetX,
            y: sprite.y + offsetY,
            alpha: { from: startAlpha, to: endAlpha },
            scale: { from: scaleStart, to: endScale },
            duration,
            delay: Phaser.Math.Between(0, duration),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        scene._ambientTweens = scene._ambientTweens || [];
        scene._ambientTweens.push(tween);
    }

    return { overlay, sprites };
}

export function swayDecorations(scene, decorations, options = {}) {
    if (!scene || !scene.tweens || !Array.isArray(decorations)) return;
    const cfg = Object.assign({ angle: 3.5, scale: 0.04, duration: 2600 }, options);
    scene._ambientTweens = scene._ambientTweens || [];
    decorations.forEach((entry, index) => {
        const target = entry && entry.display ? entry.display : entry;
        if (!target || !target.scene) return;
        const baseAngle = Phaser.Math.FloatBetween(cfg.angle * 0.4, cfg.angle);
        const baseScale = Phaser.Math.FloatBetween(cfg.scale * 0.6, cfg.scale);
        const tween = scene.tweens.add({
            targets: target,
            angle: { from: -baseAngle, to: baseAngle },
            scaleX: { from: target.scaleX - baseScale, to: target.scaleX + baseScale },
            duration: Phaser.Math.Between(cfg.duration * 0.8, cfg.duration * 1.2),
            delay: index * Phaser.Math.Between(40, 90),
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        scene._ambientTweens.push(tween);
    });
}

export function cleanupAmbientFx(scene) {
    const list = ambientStore.get(scene);
    if (list) {
        for (const obj of list) {
            if (!obj) continue;
            try {
                if (obj.destroy) obj.destroy();
            } catch (e) { /* ignore */ }
        }
        ambientStore.delete(scene);
    }
    if (scene && scene._ambientTweens) {
        scene._ambientTweens.forEach((tween) => {
            try { tween.stop(); } catch (e) { /* ignore */ }
        });
        scene._ambientTweens = null;
    }
}

export default {
    buildThemedFloor,
    applyAmbientFx,
    swayDecorations,
    cleanupAmbientFx
};
