// Helper for persisting character data in localStorage with consistent semantics across scenes.
// Usage: persistCharacter(scene, username, { includeLocation: true, assignFields: ['woodcutting'] })
export function persistCharacter(scene, username, options = {}) {
    if (!scene || !username || !scene.char) return;
    if (typeof localStorage === 'undefined') return;

    const cfg = Object.assign({
        includeLocation: true,
        replace: true,
        assignFields: null,
        sceneKey: null,
        locationFormatter: null,
        onBeforeSave: null,
        onAfterSave: null,
        merge: null,
        logErrors: false
    }, options || {});

    try {
        const key = 'cif_user_' + username;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        const userObj = JSON.parse(stored);
        if (!userObj || !Array.isArray(userObj.characters)) return;

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
            try { cfg.onBeforeSave(scene, char, userObj); } catch (e) {}
        }

        let found = false;
        for (let i = 0; i < userObj.characters.length; i++) {
            const uc = userObj.characters[i];
            if (!uc) continue;
            const sameId = uc.id && char.id && uc.id === char.id;
            const sameName = !uc.id && uc.name === char.name;
            if (sameId || sameName) {
                if (cfg.assignFields && cfg.assignFields.length) {
                    const target = userObj.characters[i];
                    for (let j = 0; j < cfg.assignFields.length; j++) {
                        const field = cfg.assignFields[j];
                        target[field] = char[field];
                    }
                } else if (cfg.replace === false && typeof cfg.merge === 'function') {
                    try {
                        userObj.characters[i] = cfg.merge(uc, char) || uc;
                    } catch (e) {
                        userObj.characters[i] = Object.assign({}, uc, char);
                    }
                } else if (cfg.replace === false) {
                    userObj.characters[i] = Object.assign({}, uc, char);
                } else {
                    userObj.characters[i] = char;
                }
                found = true;
                break;
            }
        }

        if (!found) {
            let inserted = false;
            for (let i = 0; i < userObj.characters.length; i++) {
                if (!userObj.characters[i]) {
                    userObj.characters[i] = char;
                    inserted = true;
                    break;
                }
            }
            if (!inserted) userObj.characters.push(char);
        }

        localStorage.setItem(key, JSON.stringify(userObj));

        // Also forward critical state to server if the client bridge is available
        try {
            const charId = (char && char.id) || null;
            if (charId && typeof window !== 'undefined' && window.__cif_persist) {
                // Patch core fields (gold/flags/fishing/equipment/talents + last location/scene)
                const patch = {};
                if (typeof char.gold === 'number') patch.gold = Math.max(0, Math.floor(char.gold));
                if (char.flags) patch.flags = char.flags;
                if (char.fishing) patch.fishing = char.fishing;
                if (char.equipment) patch.equipment = char.equipment;
                if (char.talents) patch.talents = char.talents;
                // Include tutorial completion flag so routine saves capture it
                if (char.tutorialCompleted === true) patch.tutorialCompleted = true;
                if (char.lastLocation && typeof char.lastLocation === 'object') {
                    patch.lastScene = char.lastLocation.scene || null;
                    if (typeof char.lastLocation.x === 'number') patch.lastX = char.lastLocation.x;
                    if (typeof char.lastLocation.y === 'number') patch.lastY = char.lastLocation.y;
                } else if (cfg.includeLocation !== false && scene.player) {
                    // Fallback: if location formatter above set char.lastLocation, otherwise derive now
                    patch.lastScene = (scene.scene && scene.scene.key) || null;
                    if (scene.player) { patch.lastX = scene.player.x || null; patch.lastY = scene.player.y || null; }
                }
                try { if (Object.keys(patch).length) window.__cif_persist.saveCharacterPatch(charId, patch); } catch (e) {}
                // Inventory snapshot (slots -> map)
                try {
                    if (Array.isArray(char.inventory)) {
                        const map = {};
                        for (const s of char.inventory) { if (s && s.id) { map[s.id] = (map[s.id] || 0) + (s.qty || 1); } }
                        window.__cif_persist.saveInventory(charId, map);
                    }
                } catch (e) {}
                // Quests snapshot
                try {
                    const active = Array.isArray(char.activeQuests) ? char.activeQuests.map(q => ({ id: q && q.id, progress: q && q.progress })) : [];
                    const completed = Array.isArray(char.completedQuests) ? char.completedQuests.slice() : [];
                    if (active.length || completed.length) window.__cif_persist.saveQuests(charId, active, completed);
                } catch (e) {}
            }
        } catch (e) { /* ignore server forward errors */ }

        if (typeof cfg.onAfterSave === 'function') {
            try { cfg.onAfterSave(scene, char, userObj); } catch (e) {}
        }
    } catch (e) {
        if (cfg.logErrors && typeof console !== 'undefined' && console.warn) {
            console.warn('persistCharacter failed', e);
        }
    }
}

// Helper to load character data from localStorage
export function loadCharacter(username, characterId) {
    if (!username || !characterId || typeof localStorage === 'undefined') return null;
    try {
        const key = 'cif_user_' + username;
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const userObj = JSON.parse(stored);
        if (!userObj || !Array.isArray(userObj.characters)) return null;
        for (const char of userObj.characters) {
            if (char && char.id === characterId) {
                // Initialize quest data if missing
                if (!char.activeQuests) char.activeQuests = [];
                if (!char.completedQuests) char.completedQuests = [];
                if (!char.gold) char.gold = 0;
                // Attempt server hydration asynchronously (non-breaking). Merge & persist when available.
                try {
                    if (typeof window !== 'undefined' && window.__cif_persist && window.__cif_persist.loadCharacterFull) {
                        window.__cif_persist.loadCharacterFull(characterId).then(serverChar => {
                            if (serverChar && typeof serverChar === 'object') {
                                try {
                                    // Merge shallow fields
                                    Object.assign(char, serverChar);
                                    // Persist merged snapshot back to localStorage for subsequent synchronous loads
                                    const updatedBlob = JSON.parse(localStorage.getItem(key) || '{}');
                                    if (updatedBlob && Array.isArray(updatedBlob.characters)) {
                                        for (let i = 0; i < updatedBlob.characters.length; i++) {
                                            if (updatedBlob.characters[i] && updatedBlob.characters[i].id === characterId) {
                                                updatedBlob.characters[i] = char;
                                                break;
                                            }
                                        }
                                        localStorage.setItem(key, JSON.stringify(updatedBlob));
                                    }
                                } catch (e) { /* ignore merge errors */ }
                            }
                        }).catch(() => {});
                    }
                } catch (e) { /* ignore server load init errors */ }
                return char;
            }
        }
    } catch (e) {
        console.warn('loadCharacter failed', e);
    }
    return null;
}

export default {
    persistCharacter,
    loadCharacter
};
