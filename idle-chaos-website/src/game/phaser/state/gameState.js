const DEFAULT_ACTIVITY_TIMEOUT = 3000;

const listeners = new Set();

const state = {
    activity: 'idle',
    lastActivityChange: Date.now(),
    theme: 'calm',
    hellscape: false,
    scene: null
};

let activityTimer = null;

function cloneState() {
    return {
        activity: state.activity,
        lastActivityChange: state.lastActivityChange,
        theme: state.theme,
        hellscape: state.hellscape,
        scene: state.scene
    };
}

function notify(options = {}) {
    const snapshot = cloneState();
    listeners.forEach((fn) => {
        try {
            fn(snapshot, options);
        } catch (err) {
            console.warn('GameState listener error', err);
        }
    });
}

function normalizeActivity(activity) {
    if (!activity) return 'idle';
    const str = String(activity).trim().toLowerCase();
    return str === 'idle' ? 'idle' : str;
}

function scheduleIdle(timeout) {
    if (activityTimer) {
        clearTimeout(activityTimer);
        activityTimer = null;
    }
    if (state.activity === 'idle') return;

    const delay = typeof timeout === 'number' ? timeout : DEFAULT_ACTIVITY_TIMEOUT;
    if (!(delay > 0)) return;

    activityTimer = setTimeout(() => {
        const now = Date.now();
        if (state.activity !== 'idle' && (now - state.lastActivityChange) >= delay - 25) {
            state.activity = 'idle';
            state.lastActivityChange = now;
            notify({ reason: 'timeout' });
        }
    }, delay);
}

export function getState() {
    return cloneState();
}

export function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    // Immediately emit current state to new subscriber
    try { listener(cloneState(), { initial: true }); } catch (err) { console.warn('GameState listener error', err); }
    return () => {
        listeners.delete(listener);
    };
}

export function setActivity(activity, options = {}) {
    const normalized = normalizeActivity(activity);
    const now = Date.now();
    const changed = state.activity !== normalized;
    state.activity = normalized;
    state.lastActivityChange = now;

    if (normalized === 'idle') {
        if (activityTimer) {
            clearTimeout(activityTimer);
            activityTimer = null;
        }
    } else {
        scheduleIdle(options.timeout);
    }

    if (!options.silent && (changed || options.force || options.emitOnRefresh)) {
        notify({ source: options.source || null });
    }

    return state.activity;
}

export function setSceneActivity(scene, activity, options = {}) {
    const normalized = normalizeActivity(activity);
    if (scene && scene.char) {
        try {
            scene.char.activity = normalized === 'idle' ? null : normalized;
        } catch (err) { /* ignore char assignment failures */ }
    }
    return setActivity(normalized, options);
}

export function clearActivity(scene, options = {}) {
    return setSceneActivity(scene, 'idle', { ...options, force: true });
}

export function touchActivity(activity, options = {}) {
    const normalized = normalizeActivity(activity);
    return setActivity(normalized, { ...options, emitOnRefresh: options.emitOnRefresh || false });
}

export function getActivity() {
    return state.activity;
}

export function setHellscape(enabled) {
    const flag = !!enabled;
    if (state.hellscape === flag) return state.hellscape;
    state.hellscape = flag;
    state.theme = flag ? 'hellscape' : 'calm';
    notify({ reason: 'theme' });
    return state.hellscape;
}

export function setTheme(theme) {
    const normalized = theme === 'hellscape' ? 'hellscape' : 'calm';
    if (state.theme === normalized) return state.theme;
    state.theme = normalized;
    state.hellscape = normalized === 'hellscape';
    notify({ reason: 'theme' });
    return state.theme;
}

export function setSceneKey(sceneKey) {
    const key = sceneKey || null;
    if (state.scene === key) return state.scene;
    state.scene = key;
    notify({ reason: 'scene' });
    return state.scene;
}

// keep body dataset in sync for global theming (best-effort in browser environments)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    subscribe((current) => {
        try {
            document.body.dataset.theme = current.theme || (current.hellscape ? 'hellscape' : 'calm');
        } catch (err) { /* ignore body mutations */ }
    });
}

export default {
    getState,
    subscribe,
    setActivity,
    setSceneActivity,
    clearActivity,
    touchActivity,
    getActivity,
    setSceneKey,
    setTheme,
    setHellscape
};
