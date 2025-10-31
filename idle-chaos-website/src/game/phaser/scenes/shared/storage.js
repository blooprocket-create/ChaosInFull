// Shared localStorage helpers with defensive parsing so callers do not need to
// repeat the same try/catch plumbing throughout scenes.

const USER_PREFIX = 'cif_user_';

function getStorage() {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
}

function safeParse(value, fallback) {
    if (typeof value !== 'string') return fallback;
    try {
        return JSON.parse(value);
    } catch (e) {
        return fallback;
    }
}

export function loadJson(key, fallback = null) {
    const storage = getStorage();
    if (!storage) return fallback;
    const raw = storage.getItem(key);
    return safeParse(raw, fallback);
}

export function saveJson(key, value) {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

export function loadUser(username, fallback = null) {
    if (!username) return fallback;
    return loadJson(USER_PREFIX + username, fallback);
}

export function saveUser(username, userObj) {
    if (!username || !userObj) return false;
    return saveJson(USER_PREFIX + username, userObj);
}

export function iterUsers(callback) {
    const storage = getStorage();
    if (!storage || typeof callback !== 'function') return;
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key || !key.startsWith(USER_PREFIX)) continue;
        const value = loadJson(key, null);
        callback(key, value);
    }
}

export function deleteUser(username) {
    const storage = getStorage();
    if (!storage || !username) return false;
    try {
        storage.removeItem(USER_PREFIX + username);
        return true;
    } catch (e) {
        return false;
    }
}

export default {
    loadJson,
    saveJson,
    loadUser,
    saveUser,
    iterUsers,
    deleteUser,
};
