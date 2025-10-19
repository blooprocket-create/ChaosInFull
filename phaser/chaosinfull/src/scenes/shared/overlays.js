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
    const w = safeWindow();
    if (!w || !w.document) return { destroy() {} };

    const id = (suffix) => `${config.idPrefix}-${suffix}`;
    removeExistingCanvas(id('fog'));
    removeExistingCanvas(id('ember'));
    removeExistingCanvas(id('shadow'));
    removeExistingCanvas(id('vignette'));

    const canvases = {
        fog: w.document.createElement('canvas'),
        ember: w.document.createElement('canvas'),
        shadow: w.document.createElement('canvas'),
        vignette: w.document.createElement('canvas'),
    };

    canvases.fog.id = id('fog');
    canvases.ember.id = id('ember');
    canvases.shadow.id = id('shadow');
    canvases.vignette.id = id('vignette');

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

    sizeCanvas(canvases.fog, config.zIndexBase);
    sizeCanvas(canvases.ember, config.zIndexBase + 10);
    sizeCanvas(canvases.shadow, config.zIndexBase + 20);
    sizeCanvas(canvases.vignette, config.zIndexBase + 30);

    const appendOrder = [canvases.fog, canvases.ember, canvases.shadow, canvases.vignette];
    appendOrder.forEach((c) => w.document.body.appendChild(c));

    const fogCtx = canvases.fog.getContext('2d', { willReadFrequently: true });
    const emberCtx = canvases.ember.getContext('2d', { willReadFrequently: true });
    const shadowCtx = canvases.shadow.getContext('2d', { willReadFrequently: true });
    const vignetteCtx = canvases.vignette.getContext('2d', { willReadFrequently: true });

    const fogParticles = [];
    for (let i = 0; i < config.fogCount; i++) {
        fogParticles.push({
            x: Math.random() * canvases.fog.width,
            y: Math.random() * canvases.fog.height,
            r: 40 + Math.random() * 60,
            vx: 0.14 + Math.random() * 0.22,
            vy: -0.06 + Math.random() * 0.14,
            alpha: 0.13 + Math.random() * 0.12,
            color: config.fogColors[Math.floor(Math.random() * config.fogColors.length)],
        });
    }

    const embers = [];
    for (let i = 0; i < config.emberCount; i++) {
        embers.push({
            x: Math.random() * canvases.ember.width,
            y: Math.random() * canvases.ember.height,
            r: 0.5 + Math.random() * 1,
            alpha: 0.5 + Math.random() * 0.3,
            dx: (Math.random() - 0.5) * 1.2,
            dy: -0.6 - Math.random() * 1.2,
            color: 'rgba(255,80,0,0.8)',
        });
    }

    let shadowX = -300;
    let shadowY = canvases.shadow.height * 0.7;
    let vignetteTime = 0;
    let breathPeriod = 6 + Math.random() * 2;
    let breathIntensity = 0.45 + Math.random() * 0.25;
    let rafId = null;

    const draw = () => {
        // Fog
        if (fogCtx) {
            fogCtx.clearRect(0, 0, canvases.fog.width, canvases.fog.height);
            for (const p of fogParticles) {
                fogCtx.beginPath();
                fogCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                fogCtx.fillStyle = p.color;
                fogCtx.globalAlpha = p.alpha;
                fogCtx.fill();
                fogCtx.globalAlpha = 1;
                p.x += p.vx;
                p.y += p.vy;
                if (p.x - p.r > canvases.fog.width) p.x = -p.r;
                if (p.y + p.r < 0) p.y = canvases.fog.height + p.r;
            }
        }

        // Embers
        if (emberCtx) {
            emberCtx.clearRect(0, 0, canvases.ember.width, canvases.ember.height);
            embers.forEach((e) => {
                const fadeLimit = 0.25;
                const fade = Math.max(0, 1 - Math.max(0, (e.y / (canvases.ember.height * fadeLimit))));
                emberCtx.beginPath();
                emberCtx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                emberCtx.fillStyle = e.color;
                emberCtx.globalAlpha = e.alpha * fade;
                emberCtx.shadowColor = 'orange';
                emberCtx.shadowBlur = 8;
                emberCtx.fill();
                emberCtx.globalAlpha = 1;
                e.x += e.dx;
                e.y += e.dy;
                if (e.y < -10 || e.x < -10 || e.x > canvases.ember.width + 10) {
                    e.x = Math.random() * canvases.ember.width;
                    e.y = canvases.ember.height + 10;
                }
            });
        }

        // Shadow
        if (shadowCtx) {
            shadowCtx.clearRect(0, 0, canvases.shadow.width, canvases.shadow.height);
            shadowCtx.save();
            shadowCtx.globalAlpha = 0.22 + 0.13 * Math.abs(Math.sin(Date.now() / 4000));
            shadowCtx.filter = 'blur(12px)';
            shadowCtx.beginPath();
            shadowCtx.ellipse(shadowX, shadowY, 120, 260, 0, 0, Math.PI * 2);
            shadowCtx.fillStyle = '#0a0106';
            shadowCtx.fill();
            shadowCtx.restore();
            shadowX += 0.10;
            if (shadowX > canvases.shadow.width + 300) shadowX = -300;
        }

        // Vignette
        if (vignetteCtx) {
            vignetteTime += 1 / 60;
            if (Math.random() < 0.002) {
                breathPeriod = 6 + Math.random() * 2;
                breathIntensity = 0.45 + Math.random() * 0.25;
            }
            const phase = Math.sin((vignetteTime / breathPeriod) * Math.PI * 2);
            const alpha = breathIntensity + 0.45 * Math.abs(phase);
            vignetteCtx.clearRect(0, 0, canvases.vignette.width, canvases.vignette.height);
            const grad = vignetteCtx.createRadialGradient(
                canvases.vignette.width / 2,
                canvases.vignette.height / 2,
                Math.min(canvases.vignette.width, canvases.vignette.height) / 2.2,
                canvases.vignette.width / 2,
                canvases.vignette.height / 2,
                Math.max(canvases.vignette.width, canvases.vignette.height) / 1.1
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.7, `rgba(30,0,20,${alpha})`);
            grad.addColorStop(1, `rgba(0,0,0,${alpha + 0.38})`);
            vignetteCtx.fillStyle = grad;
            vignetteCtx.fillRect(0, 0, canvases.vignette.width, canvases.vignette.height);
        }

        rafId = w.requestAnimationFrame(draw);
    };

    const resizeHandler = () => {
        const { width, height } = dims();
        appendOrder.forEach((canvas) => {
            canvas.width = width;
            canvas.height = height;
            // keep style sizing intact
        });
        shadowY = canvases.shadow.height * 0.7;
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
            if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
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
