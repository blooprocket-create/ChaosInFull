// Helper for persisting character data via the server bridge so legacy scenes keep a single code path.
// Usage: persistCharacter(scene, username, { includeLocation: true, onAfterSave: (scene) => {} })
// Lightweight in-memory tracker for inventory hydration state per character
// Using WeakMap avoids leaking across character switches
const __invState = new WeakMap();

function __getInvState(char) {
    let st = __invState.get(char);
    if (!st) { st = { hydrated: false, lastCount: 0 }; __invState.set(char, st); }
    return st;
}

function __countInventory(inv) {
    if (!Array.isArray(inv)) return 0;
    let c = 0; for (const s of inv) { if (s && s.id) c += (s.qty || 1); }
    return c;
}

export function persistCharacter(scene, username, options = {}) {
    void username; // kept for backwards-compatible signature
    if (!scene || !scene.char) return;

    const cfg = Object.assign({
        includeLocation: true,
        sceneKey: null,
        locationFormatter: null,
        onBeforeSave: null,
        onAfterSave: null,
        logErrors: false
    }, options || {});

    try {
        const char = scene.char;

        if (cfg.includeLocation !== false && scene.player) {
            let location = null;
            if (typeof cfg.locationFormatter === 'function') {
                try { location = cfg.locationFormatter(scene); } catch (e) { location = null; }
            } else {
                location = {
                    scene: cfg.sceneKey || (scene.scene && scene.scene.key) || null,
                    x: (scene.player && scene.player.x) || null,
                    y: (scene.player && scene.player.y) || null
                };
            }
            if (location && typeof location === 'object') {
                char.lastLocation = location;
            }
        }

        if (typeof cfg.onBeforeSave === 'function') {
            try { cfg.onBeforeSave(scene, char); } catch (e) {}
        }

        try {
            const charId = (char && char.id) || null;
            if (charId && typeof window !== 'undefined' && window.__cif_persist) {
                const patch = {};
                if (typeof char.gold === 'number') patch.gold = Math.max(0, Math.floor(char.gold));
                if (char.flags) patch.flags = char.flags;
                if (char.fishing) patch.fishing = char.fishing;
                if (char.equipment) patch.equipment = char.equipment;
                if (char.talents) patch.talents = char.talents;
                if (char.lastLocation && typeof char.lastLocation === 'object') {
                    patch.currentScene = char.lastLocation.scene || null;
                    if (typeof char.lastLocation.x === 'number') patch.lastX = char.lastLocation.x;
                    if (typeof char.lastLocation.y === 'number') patch.lastY = char.lastLocation.y;
                } else if (cfg.includeLocation !== false && scene.player) {
                    const sc = (scene.scene && scene.scene.key) || null;
                    patch.currentScene = sc;
                    if (scene.player) { patch.lastX = scene.player.x || null; patch.lastY = scene.player.y || null; }
                }
                try { if (Object.keys(patch).length) window.__cif_persist.saveCharacterPatch(charId, patch); } catch (e) {}
                try {
                    const invArray = Array.isArray(char.inventory) ? char.inventory : [];
                    const map = {};
                    for (const s of invArray) { if (s && s.id) { map[s.id] = (map[s.id] || 0) + (s.qty || 1); } }
                    const count = __countInventory(invArray);
                    const st = __getInvState(char);
                    const isHydrated = !!st.hydrated;
                    const shouldSend = isHydrated || count > 0;

                    if (shouldSend) {
                        try {
                            if (window.__debug && window.__debug.inventory) {
                                console.log('[persistCharacter] saveInventory', { id: charId, count, hydrated: isHydrated });
                            }
                        } catch (_) {}
                        window.__cif_persist.saveInventory(charId, map);
                        st.lastCount = count;
                        if (count > 0) st.hydrated = true;
                        __invState.set(char, st);
                    } else {
                        try {
                            if (window.__debug && window.__debug.inventory) {
                                console.log('[persistCharacter] skip saveInventory (not hydrated and empty)', { id: charId });
                            }
                        } catch (_) {}
                    }
                } catch (e) {}
                try {
                    const active = Array.isArray(char.activeQuests) ? char.activeQuests.map(q => ({ id: q && q.id, progress: q && q.progress })) : [];
                    const completed = Array.isArray(char.completedQuests) ? char.completedQuests.slice() : [];
                    if (active.length || completed.length) window.__cif_persist.saveQuests(charId, active, completed);
                } catch (e) {}
            }
        } catch (e) { /* ignore server forward errors */ }

        if (typeof cfg.onAfterSave === 'function') {
            try { cfg.onAfterSave(scene, char); } catch (e) {}
        }
    } catch (e) {
        if (cfg.logErrors && typeof console !== 'undefined' && console.warn) {
            console.warn('persistCharacter failed', e);
        }
    }
}

// Shared helper: Convert slot array -> map and push to ItemStack API via client bridge.
// Usage: syncInventoryToServer(scene)
export function syncInventoryToServer(scene) {
    try {
        if (!scene || !scene.char || !scene.char.id) return;
        if (typeof window === 'undefined' || !window.__cif_persist || typeof window.__cif_persist.saveInventory !== 'function') return;
        const inv = Array.isArray(scene.char.inventory) ? scene.char.inventory : [];
        const map = {};
        for (const s of inv) { if (s && s.id) map[s.id] = (map[s.id] || 0) + (s.qty || 1); }
        const count = __countInventory(inv);
        const st = __getInvState(scene.char);
        const isHydrated = !!st.hydrated;
        const shouldSend = isHydrated || count > 0; // prevent empty wipe before hydration

        if (shouldSend) {
            try {
                if (window.__debug && window.__debug.inventory) {
                    console.log('[syncInventoryToServer] saveInventory', { id: scene.char.id, count, hydrated: isHydrated });
                }
            } catch (_) {}
            window.__cif_persist.saveInventory(scene.char.id, map);
            st.lastCount = count;
            if (count > 0) st.hydrated = true;
            __invState.set(scene.char, st);
        } else {
            try {
                if (window.__debug && window.__debug.inventory) {
                    console.log('[syncInventoryToServer] skip saveInventory (not hydrated and empty)', { id: scene.char.id });
                }
            } catch (_) {}
        }
    } catch (e) { /* ignore */ }
}

export default {
    persistCharacter
};
