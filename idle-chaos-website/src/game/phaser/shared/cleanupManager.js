// Centralized helpers to register disposables and auto-clean them on scene shutdown/destroy
// Usage: import * as cleanup from '../shared/cleanupManager'; then use helpers below.

const SCENE_KEY = '__disposables__';

function ensureSceneCleanup(scene) {
    if (!scene) return;
    if (!scene[SCENE_KEY]) {
        try { scene[SCENE_KEY] = new Set(); } catch (e) { scene[SCENE_KEY] = []; }
        // Run cleanup on shutdown and destroy
        try { scene.events && scene.events.once && scene.events.once('shutdown', () => runCleanup(scene)); } catch (e) {}
        try { scene.events && scene.events.once && scene.events.once('destroy', () => runCleanup(scene)); } catch (e) {}
    }
}

function runCleanup(scene) {
    const list = scene && scene[SCENE_KEY];
    if (!list) return;
    try {
        const arr = Array.from(list);
        // clear first to avoid reentrancy
        if (scene[SCENE_KEY].clear) scene[SCENE_KEY].clear(); else scene[SCENE_KEY] = null;
        for (let i = 0; i < arr.length; i++) {
            try { typeof arr[i] === 'function' && arr[i](); } catch (e) {}
        }
    } catch (e) {}
}

export function register(scene, disposer) {
    if (!scene || typeof disposer !== 'function') return disposer;
    ensureSceneCleanup(scene);
    try { scene[SCENE_KEY].add(disposer); } catch (e) { try { scene[SCENE_KEY].push(disposer); } catch (e2) {} }
    return disposer;
}

export function onSceneUpdate(scene, handler) {
    if (!scene || !scene.events || !scene.events.on || !handler) return null;
    try { scene.events.on('update', handler); } catch (e) {}
    return register(scene, () => { try { scene.events.off && scene.events.off('update', handler); } catch (e) {} });
}

export function addTimeEvent(scene, config) {
    if (!scene || !scene.time || !scene.time.addEvent) return null;
    const ev = scene.time.addEvent(config);
    return register(scene, () => { try { ev && ev.remove && ev.remove(false); } catch (e) {} });
}

export function addPhysicsOverlap(scene, obj1, obj2, cb, process, context) {
    if (!scene || !scene.physics || !scene.physics.add || !scene.physics.add.overlap) return null;
    const collider = scene.physics.add.overlap(obj1, obj2, cb, process, context);
    return register(scene, () => { try { collider && collider.destroy && collider.destroy(); } catch (e) {} });
}

export function addWindowListener(scene, type, fn, options) {
    if (typeof window === 'undefined' || !type || !fn) return null;
    try { window.addEventListener(type, fn, options); } catch (e) {}
    return register(scene, () => { try { window.removeEventListener(type, fn, options); } catch (e) {} });
}

export function addDocumentListener(scene, type, fn, options) {
    if (typeof document === 'undefined' || !type || !fn) return null;
    try { document.addEventListener(type, fn, options); } catch (e) {}
    return register(scene, () => { try { document.removeEventListener(type, fn, options); } catch (e) {} });
}

export function addKeyboardKey(scene, keyCode) {
    if (!scene || !scene.input || !scene.input.keyboard || !scene.input.keyboard.addKey) return null;
    const key = scene.input.keyboard.addKey(keyCode);
    return register(scene, () => { try { key && key.destroy && key.destroy(); } catch (e) {} });
}

export function registerDisposer(scene, disposer) {
    return register(scene, disposer);
}

export function attach(scene) {
    // noop helper to ensure events are hooked for this scene early
    ensureSceneCleanup(scene);
}
