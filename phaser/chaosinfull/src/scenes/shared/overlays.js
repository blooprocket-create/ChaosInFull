// Shared helper for atmospheric overlay canvases (fog, embers, shadow, vignette)
// Provides a clean lifecycle: call createAtmosphericOverlays(scene, options) in create(),
// then invoke destroy() during scene shutdown to stop animations, remove listeners, and
// detach canvases. The helper favours Phaser's scale events over global window listeners.

/* eslint-disable no-undef */

const DEFAULTS = {
    idPrefix: 'overlay',
    zIndexBase: 50,
    fogCount: 220,
    emberCount: 600,
    fogColors: [
        'rgba(255,255,255,0.18)',
        'rgba(200,200,255,0.15)',
        'rgba(180,180,200,0.13)'
    ],
};

function safeWindow() {
    return (typeof window !== 'undefined') ? window : null;
}

function removeExistingCanvas(id) {
    const w = safeWindow();
    if (!w) return;
    const existing = w.document.getElementById(id);
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }
}

export function createAtmosphericOverlays(scene, opts = {}) {
    const config = Object.assign({}, DEFAULTS, opts || {});
    // layers: array of layer names to create; default is all
    const layers = Array.isArray(config.layers) ? config.layers : ['fog', 'ember', 'shadow', 'vignette', 'fireflies'];
    const w = safeWindow();
    if (!w || !w.document) return { destroy() {} };

    const id = (suffix) => `${config.idPrefix}-${suffix}`;
    // remove any existing canvases for this idPrefix (safe)
    ['fog', 'ember', 'shadow', 'vignette', 'fireflies'].forEach(s => removeExistingCanvas(id(s)));

    const canvases = {};
    if (layers.includes('fog')) canvases.fog = w.document.createElement('canvas');
    if (layers.includes('ember')) canvases.ember = w.document.createElement('canvas');
    if (layers.includes('shadow')) canvases.shadow = w.document.createElement('canvas');
    if (layers.includes('vignette')) canvases.vignette = w.document.createElement('canvas');
    if (layers.includes('fireflies')) canvases.fireflies = w.document.createElement('canvas');

    if (canvases.fog) canvases.fog.id = id('fog');
    if (canvases.ember) canvases.ember.id = id('ember');
    if (canvases.shadow) canvases.shadow.id = id('shadow');
    if (canvases.vignette) canvases.vignette.id = id('vignette');
    if (canvases.fireflies) canvases.fireflies.id = id('fireflies');

    const dims = () => ({
        width: w.innerWidth || 0,
        height: w.innerHeight || 0,
    });

    function sizeCanvas(canvas, zIndex, pointerEvents = 'none') {
        const { width, height } = dims();
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = pointerEvents;
        canvas.style.zIndex = `${zIndex}`;
    }

    const appendOrder = [];
    if (canvases.fog) { sizeCanvas(canvases.fog, config.zIndexBase); appendOrder.push(canvases.fog); }
    if (canvases.ember) { sizeCanvas(canvases.ember, config.zIndexBase + 10); appendOrder.push(canvases.ember); }
    if (canvases.shadow) { sizeCanvas(canvases.shadow, config.zIndexBase + 20); appendOrder.push(canvases.shadow); }
    if (canvases.vignette) { sizeCanvas(canvases.vignette, config.zIndexBase + 30); appendOrder.push(canvases.vignette); }
    if (canvases.fireflies) { sizeCanvas(canvases.fireflies, config.zIndexBase + 40); appendOrder.push(canvases.fireflies); }
    const gameContainer = w.document.getElementById('game-container');
    appendOrder.forEach((c) => {
        try {
            if (gameContainer && gameContainer.parentNode) gameContainer.parentNode.insertBefore(c, gameContainer.nextSibling);
            else w.document.body.appendChild(c);
        } catch (e) { try { w.document.body.appendChild(c); } catch(_) {} }
    });
    if (canvases.fireflies) {
        try { console.debug && console.debug('overlays: created fireflies canvas', canvases.fireflies.id, 'zIndex', canvases.fireflies.style.zIndex); } catch (e) { /* ignore */ }
    }

    const fogCtx = canvases.fog ? canvases.fog.getContext('2d', { willReadFrequently: true }) : null;
    const emberCtx = canvases.ember ? canvases.ember.getContext('2d', { willReadFrequently: true }) : null;
    const shadowCtx = canvases.shadow ? canvases.shadow.getContext('2d', { willReadFrequently: true }) : null;
    const vignetteCtx = canvases.vignette ? canvases.vignette.getContext('2d', { willReadFrequently: true }) : null;

    const fireCtx = canvases.fireflies ? canvases.fireflies.getContext('2d', { willReadFrequently: true }) : null;

    const fireflies = [];
    const spawnFirefly = () => {
        const { width, height } = dims();
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.3,
            r: 0.6 + Math.random() * 1.1,
            life: 1.0,
            flickerPhase: Math.random() * Math.PI * 2,
        };
    };
    if (canvases.fireflies) {
        const { width, height } = dims();
        for (let i = 0; i < 80; i++) fireflies.push(spawnFirefly());
    }

    const fogParticles = [];
    if (canvases.fog) {
        const { width, height } = dims();
        for (let i = 0; i < config.fogCount; i++) {
            fogParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 40 + Math.random() * 60,
                vx: 0.14 + Math.random() * 0.22,
                vy: -0.06 + Math.random() * 0.14,
                alpha: 0.13 + Math.random() * 0.12,
                color: config.fogColors[Math.floor(Math.random() * config.fogColors.length)],
            });
        }
    }

    const emberFadeStart = 0.65;
    const emberFadeEnd = 0.9;
    const spawnEmber = () => {
        const { width, height } = dims();
        return {
            x: Math.random() * width,
            y: height + Math.random() * (height * 0.25),
            r: 0.5 + Math.random() * 1,
            alpha: 0.5 + Math.random() * 0.3,
            dx: (Math.random() - 0.5) * 1.2,
            dy: -0.6 - Math.random() * 1.2,
            color: 'rgba(255,80,0,0.8)',
        };
    };

    const embers = [];
    if (canvases.ember) {
        for (let i = 0; i < config.emberCount; i++) embers.push(spawnEmber());
    }

    let shadowX = -300;
    let shadowY = (canvases.shadow ? dims().height * 0.7 : (dims().height * 0.7));
    let vignetteTime = 0;
    let breathPeriod = 6 + Math.random() * 2;
    let breathIntensity = 0.45 + Math.random() * 0.25;
    let rafId = null;

    const draw = () => {
            // Fog
            if (fogCtx && canvases.fog) {
                const cw = canvases.fog.width; const ch = canvases.fog.height;
                fogCtx.clearRect(0, 0, cw, ch);
                for (const p of fogParticles) {
                    fogCtx.beginPath();
                    fogCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    fogCtx.fillStyle = p.color;
                    fogCtx.globalAlpha = p.alpha;
                    fogCtx.fill();
                    fogCtx.globalAlpha = 1;
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x - p.r > cw) p.x = -p.r;
                    if (p.y + p.r < 0) p.y = ch + p.r;
                }
            }

        // Embers
        if (emberCtx && canvases.ember) {
            const cw = canvases.ember.width; const ch = canvases.ember.height;
            emberCtx.clearRect(0, 0, cw, ch);
            embers.forEach((e, idx) => {
                const normalized = Math.max(0, Math.min(1, 1 - (e.y / ch)));
                let fadeMultiplier = 1;
                if (normalized >= emberFadeStart) {
                    const range = Math.max(0.0001, emberFadeEnd - emberFadeStart);
                    const t = Math.min(1, (normalized - emberFadeStart) / range);
                    fadeMultiplier = 1 - t;
                }
                fadeMultiplier = Math.max(0, Math.min(1, fadeMultiplier));
                emberCtx.beginPath();
                emberCtx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                emberCtx.fillStyle = e.color;
                emberCtx.globalAlpha = e.alpha * fadeMultiplier;
                emberCtx.shadowColor = 'orange';
                emberCtx.shadowBlur = 8;
                emberCtx.fill();
                emberCtx.globalAlpha = 1;
                e.x += e.dx;
                e.y += e.dy;
                if (e.y < -20 || e.x < -10 || e.x > cw + 10) {
                    embers[idx] = spawnEmber();
                }
            });
        }

        // Shadow
        if (shadowCtx && canvases.shadow) {
            const cw = canvases.shadow.width; const ch = canvases.shadow.height;
            shadowCtx.clearRect(0, 0, cw, ch);
            shadowCtx.save();
            shadowCtx.globalAlpha = 0.22 + 0.13 * Math.abs(Math.sin(Date.now() / 4000));
            shadowCtx.filter = 'blur(12px)';
            shadowCtx.beginPath();
            shadowCtx.ellipse(shadowX, shadowY, 120, 260, 0, 0, Math.PI * 2);
            shadowCtx.fillStyle = '#0a0106';
            shadowCtx.fill();
            shadowCtx.restore();
            shadowX += 0.10;
            if (shadowX > cw + 300) shadowX = -300;
        }

        // Vignette
        if (vignetteCtx && canvases.vignette) {
            vignetteTime += 1 / 60;
            if (Math.random() < 0.002) {
                breathPeriod = 6 + Math.random() * 2;
                breathIntensity = 0.45 + Math.random() * 0.25;
            }
            const phase = Math.sin((vignetteTime / breathPeriod) * Math.PI * 2);
            const alpha = breathIntensity + 0.45 * Math.abs(phase);
            const cw = canvases.vignette.width; const ch = canvases.vignette.height;
            vignetteCtx.clearRect(0, 0, cw, ch);
            const grad = vignetteCtx.createRadialGradient(
                cw / 2,
                ch / 2,
                Math.min(cw, ch) / 2.2,
                cw / 2,
                ch / 2,
                Math.max(cw, ch) / 1.1
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.7, `rgba(30,0,20,${alpha})`);
            grad.addColorStop(1, `rgba(0,0,0,${alpha + 0.38})`);
            vignetteCtx.fillStyle = grad;
            vignetteCtx.fillRect(0, 0, cw, ch);
        }

        // Fireflies
        if (fireCtx && canvases.fireflies) {
            const cw = canvases.fireflies.width; const ch = canvases.fireflies.height;
            fireCtx.clearRect(0, 0, cw, ch);
            for (const f of fireflies) {
                // flicker
                f.flickerPhase += 0.06 + Math.random() * 0.03;
                const flick = 0.5 + 0.5 * Math.sin(f.flickerPhase);
                const alpha = 0.45 * flick + 0.15;
                fireCtx.beginPath();
                fireCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                fireCtx.fillStyle = `rgba(240,230,140,${alpha})`;
                fireCtx.shadowColor = 'rgba(255,220,120,0.9)';
                fireCtx.shadowBlur = 8;
                fireCtx.fill();
                fireCtx.shadowBlur = 0;
                // move
                f.x += f.vx + (Math.random() - 0.5) * 0.2;
                f.y += f.vy + (Math.random() - 0.5) * 0.15;
                // wrap
                if (f.x < -10) f.x = cw + 10;
                if (f.x > cw + 10) f.x = -10;
                if (f.y < -10) f.y = ch + 10;
                if (f.y > ch + 10) f.y = -10;
            }
        }

        rafId = w.requestAnimationFrame(draw);
    };

    const resizeHandler = () => {
        const { width, height } = dims();
        appendOrder.forEach((canvas) => {
            try { canvas.width = width; canvas.height = height; } catch (e) { /* ignore */ }
        });
        shadowY = (canvases.shadow ? canvases.shadow.height : height) * 0.7;
        // ensure fireflies canvas resized too (dimensions updated above)
        // reposition or re-seed particles if needed
    };

    const cleanupFns = [];
    const usePhaserScale = !!(scene && scene.scale && scene.scale.on);
    if (usePhaserScale) {
        const phaserHandler = () => resizeHandler();
        scene.scale.on('resize', phaserHandler);
        cleanupFns.push(() => {
            if (scene && scene.scale && scene.scale.off) {
                scene.scale.off('resize', phaserHandler);
            }
        });
    }

    w.addEventListener('resize', resizeHandler);
    cleanupFns.push(() => w.removeEventListener('resize', resizeHandler));

    resizeHandler();
    rafId = w.requestAnimationFrame(draw);

    function destroy() {
        if (rafId) {
            w.cancelAnimationFrame(rafId);
            rafId = null;
        }
        cleanupFns.forEach((fn) => {
            try { fn(); } catch (e) { /* ignore */ }
        });
        cleanupFns.length = 0;
        appendOrder.forEach((canvas) => {
            try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) { /* ignore */ }
        });
    }

    return {
        destroy,
        canvases,
    };
}

export default {
    createAtmosphericOverlays,
};
