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
