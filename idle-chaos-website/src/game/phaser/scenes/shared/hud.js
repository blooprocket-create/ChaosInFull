import { subscribe as subscribeGameState, getState as getGameState } from '../../state/gameState.js';

const ACTIVITY_META = {
    mining: { label: 'Mining', color: '#6fe2ff' },
    smithing: { label: 'Smithing', color: '#ffb347' },
    woodcutting: { label: 'Woodcutting', color: '#85ff6b' },
    fishing: { label: 'Fishing', color: '#5ab0ff' },
    cooking: { label: 'Cooking', color: '#ff7fb3' },
    idle: { label: 'Character', color: '#ffee66' }
};

function applyThemeStyles(hud, theme = 'calm') {
    if (!hud) return;
    hud.dataset.theme = theme;
    if (theme === 'hellscape') {
        hud.style.background = 'rgba(60, 12, 12, 0.7)';
        hud.style.boxShadow = '0 0 14px rgba(255, 64, 64, 0.35)';
        hud.style.border = '1px solid rgba(255,80,80,0.4)';
    } else {
        hud.style.background = 'rgba(20, 10, 30, 0.55)';
        hud.style.boxShadow = '0 0 14px rgba(80, 120, 255, 0.3)';
        hud.style.border = '1px solid rgba(255,255,255,0.08)';
    }
}

function normalizeActivity(activity) {
    if (!activity) return 'idle';
    const str = String(activity).trim().toLowerCase();
    return ACTIVITY_META[str] ? str : 'idle';
}

export function createHUD(scene) {
    if (!scene) return;
    const char = scene.char || {};
    const idBase = (scene && scene.scene && scene.scene.key) ? scene.scene.key.toLowerCase() : 'scene';
    const hudId = idBase + '-hud';

    if (scene.hud && scene.hud.parentNode && scene.hud.id === hudId) {
        try { updateHUD(scene); } catch (e) { /* ignore */ }
        return scene.hud;
    }

    if (scene._hudStateUnsub && typeof scene._hudStateUnsub === 'function') {
        try { scene._hudStateUnsub(); } catch (e) { /* ignore */ }
        scene._hudStateUnsub = null;
    }

    const hud = document.createElement('div');
    hud.id = hudId;
    hud.style.position = 'fixed';
    // Position: top offset should respect the app's navbar height
    // We'll compute this dynamically and update on resize
    hud.style.left = '8px';
    hud.style.width = '200px';
    hud.style.padding = '8px';
    hud.style.zIndex = '100';
    hud.style.pointerEvents = 'auto';
    hud.style.display = 'flex';
    hud.style.flexDirection = 'column';
    hud.style.alignItems = 'flex-start';
    hud.style.backdropFilter = 'blur(8px)';
    hud.style.borderRadius = '16px';
    hud.style.color = '#eee';
    hud.style.fontFamily = 'UnifrakturCook, cursive';
    applyThemeStyles(hud, getGameState().theme);

    // Compute HUD top offset based on <header> height
    const recalcHudTop = () => {
        try {
            const header = document.querySelector('header');
            const navH = header && header.getBoundingClientRect ? Math.max(0, Math.round(header.getBoundingClientRect().height)) : 0;
            const topPx = Math.max(8, navH + 8);
            hud.style.top = topPx + 'px';
        } catch (e) {
            hud.style.top = '8px';
        }
    };
    recalcHudTop();
    // Bind resize handler and clean up on scene shutdown
    const boundResize = () => recalcHudTop();
    window.addEventListener('resize', boundResize);
    try {
        scene.events && scene.events.once && scene.events.once('shutdown', () => {
            try { window.removeEventListener('resize', boundResize); } catch (_) {}
        });
    } catch (_) {}

    const charBtnId = idBase + '-hud-charselect-btn';
    const settingsBtnId = idBase + '-hud-settings-btn';
    const returnBtnId = idBase + '-hud-return-btn';
    hud.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px;">
            <span id="${hudId}-name" style="font-size:1em; font-weight:700; color:#e44; letter-spacing:1px;">${char.name || 'Character'} <span id="${hudId}-level" style='color:#fff; font-size:0.9em;'>- Lv ${char.level || 1}</span></span>
                <div style="display:flex; gap:6px; align-items:center;">
                <button id="${charBtnId}" title="Save character" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">💾</button>
                <button id="${settingsBtnId}" title="Settings" style="pointer-events:auto; background:#1b2430; color:#ffd27a; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:2px; box-shadow:0 0 4px rgba(0,0,0,0.4); cursor:pointer; font-family:inherit; opacity:0.95;">⚙️</button>
                <button id="${returnBtnId}" title="Return to character select" style="pointer-events:auto; background:#111; color:#fff; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:2px; box-shadow:0 0 4px rgba(0,0,0,0.4); cursor:pointer; font-family:inherit; opacity:0.95;">⤺</button>
            </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
            <div style="height:12px; background:#2a0a16; border-radius:6px; overflow:hidden; position:relative;">
                <div id="${hudId}-hp-bar" style="height:100%; width:100%; background:#e44; border-radius:6px; position:absolute; left:0; top:0;"></div>
                <span id="${hudId}-hp-text" style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">0/0</span>
            </div>
            <div style="height:12px; background:#181a2a; border-radius:6px; overflow:hidden; position:relative;">
                <div id="${hudId}-mana-bar" style="height:100%; width:100%; background:#44e; border-radius:6px; position:absolute; left:0; top:0;"></div>
                <span id="${hudId}-mana-text" style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">0/0</span>
            </div>
            <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                <div id="${hudId}-xp-bar" style="height:100%; width:100%; background:#ee4; border-radius:6px; position:absolute; left:0; top:0;"></div>
                <span id="${hudId}-xp-text" style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">0/0</span>
            </div>
        </div>
    `;

    document.body.appendChild(hud);
    scene.hud = hud;

    setTimeout(() => {
    const btn = document.getElementById(charBtnId);
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                try {
                    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
                    if (username && scene.char) {
                        const key = 'cif_user_' + username;
                        const userObj = JSON.parse(localStorage.getItem(key)) || { characters: [] };
                        if (!Array.isArray(userObj.characters)) userObj.characters = [];
                        let found = false;
                        for (let i = 0; i < userObj.characters.length; i++) {
                            const uc = userObj.characters[i];
                            if (!uc) continue;
                            if ((uc.id && scene.char.id && uc.id === scene.char.id) || (!uc.id && uc.name === scene.char.name)) {
                                userObj.characters[i] = scene.char;
                                userObj.characters[i].lastLocation = {
                                    scene: (scene.scene && scene.scene.key) || null,
                                    x: (scene.player && scene.player.x) || null,
                                    y: (scene.player && scene.player.y) || null
                                };
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            for (let i = 0; i < userObj.characters.length; i++) {
                                if (!userObj.characters[i]) {
                                    userObj.characters[i] = scene.char;
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (!found) userObj.characters.push(scene.char);
                        localStorage.setItem(key, JSON.stringify(userObj));
                        scene._showToast && scene._showToast('Character saved.');
                    }
                } catch (err) {
                    console.warn('HUD save character error', err);
                }
            };
        }

        // Settings button
        try {
            const settingsBtn = document.getElementById(settingsBtnId);
            if (settingsBtn) {
                settingsBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    try {
                        if (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.openSettingsModal === 'function') {
                            window.__shared_ui.openSettingsModal(scene);
                        } else {
                            // fallback: try global helper
                            if (typeof window !== 'undefined' && typeof window.openSettingsModal === 'function') window.openSettingsModal(scene);
                            else alert('Settings not available');
                        }
                    } catch (e) { console.warn('Settings button error', e); }
                };
            }
        } catch (e) { /* ignore */ }

        // Return to Character Select button
        try {
            const returnBtn = document.getElementById(returnBtnId);
            if (returnBtn) {
                returnBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    try {
                        // Save current character first (reuse same logic as save button)
                        const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
                        if (username && scene.char) {
                            const key = 'cif_user_' + username;
                            const userObj = JSON.parse(localStorage.getItem(key)) || { characters: [] };
                            if (!Array.isArray(userObj.characters)) userObj.characters = [];
                            let found = false;
                            for (let i = 0; i < userObj.characters.length; i++) {
                                const uc = userObj.characters[i];
                                if (!uc) continue;
                                if ((uc.id && scene.char.id && uc.id === scene.char.id) || (!uc.id && uc.name === scene.char.name)) {
                                    userObj.characters[i] = scene.char;
                                    userObj.characters[i].lastLocation = {
                                        scene: (scene.scene && scene.scene.key) || null,
                                        x: (scene.player && scene.player.x) || null,
                                        y: (scene.player && scene.player.y) || null
                                    };
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                for (let i = 0; i < userObj.characters.length; i++) {
                                    if (!userObj.characters[i]) {
                                        userObj.characters[i] = scene.char;
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (!found) userObj.characters.push(scene.char);
                            localStorage.setItem(key, JSON.stringify(userObj));
                            scene._showToast && scene._showToast('Character saved.');
                        }
                    } catch (saveErr) {
                        console.warn('HUD return: save error', saveErr);
                    }

                    // Confirm navigation
                    const proceed = window.confirm && window.confirm('Return to character select? Any unsaved temporary progress will be saved now. Continue?');
                    if (proceed) {
                        try {
                            // Transition to CharacterSelect scene
                            if (scene && scene.scene && typeof scene.scene.start === 'function') {
                                scene.scene.start('CharacterSelect');
                            } else if (scene && scene.game && scene.game.scene && typeof scene.game.scene.start === 'function') {
                                scene.game.scene.start('CharacterSelect');
                            }
                        } catch (navErr) {
                            console.warn('HUD return navigation error', navErr);
                        }
                    }
                };
            }
        } catch (err) {
            console.warn('HUD return button setup error', err);
        }
    }, 0);

    scene._hudStateUnsub = subscribeGameState((gs) => {
        updateHUD(scene, { activity: gs.activity, theme: gs.theme });
    });

    updateHUD(scene);
    // Ensure the global skill bar is created for this scene and keybindings bound.
    try {
        if (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.refreshSkillBarHUD === 'function') {
            try { window.__shared_ui.refreshSkillBarHUD(scene); } catch (e) {}
        }
        if (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.bindSkillBarKeys === 'function') {
            try { window.__shared_ui.bindSkillBarKeys(scene); } catch (e) {}
        }
    } catch (e) {}
    // Re-apply persisted UI settings (e.g., attack range indicator) for this scene
    try {
        if (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.applySettingsToScene === 'function') {
            try { window.__shared_ui.applySettingsToScene(scene, window.__game_settings || {}); } catch (e) {}
        }
    } catch (e) {}
    return hud;
}

export function updateHUD(scene, options = {}) {
    if (!scene || !scene.hud) return;

    const state = getGameState();
    const char = scene.char || {};
    const hudId = scene.hud.id;
    const level = char.level || 1;

    let derived = null;
    const ensureDerived = () => {
        if (derived) return derived;
        try {
            if (typeof window !== 'undefined' &&
                window.__shared_ui &&
                window.__shared_ui.stats &&
                typeof window.__shared_ui.stats.effectiveStats === 'function') {
                derived = window.__shared_ui.stats.effectiveStats(char) || null;
            }
        } catch (e) { derived = null; }
        if (!derived) {
            const stats = char.stats || {};
            const str = stats.str || 0;
            const int = stats.int || 0;
            derived = {
                maxhp: Math.max(1, Math.floor(100 + level * 10 + (str * 10))),
                maxmana: Math.max(0, Math.floor(50 + level * 5 + (int * 10)))
            };
        }
        return derived;
    };

    const derivedVitals = ensureDerived();
    const maxhp = Math.max(1, Math.floor(
        (char.maxhp != null && char.maxhp > 0)
            ? char.maxhp
            : (derivedVitals && derivedVitals.maxhp) || 1
    ));
    const hp = Math.max(0, Math.min(maxhp, Math.floor(
        (char.hp != null) ? char.hp : maxhp
    )));
    const maxmanaRaw = (char.maxmana != null && char.maxmana > 0)
        ? char.maxmana
        : (derivedVitals && derivedVitals.maxmana);
    const maxmana = Math.max(1, Math.floor(maxmanaRaw != null ? maxmanaRaw : 1));
    const mana = Math.max(0, Math.min(maxmana, Math.floor(
        (char.mana != null) ? char.mana : maxmana
    )));

    const activityFromState = options.activity != null ? options.activity : state.activity;
    const charActivity = char.activity ? normalizeActivity(char.activity) : 'idle';
    const activityKey = normalizeActivity(activityFromState || charActivity);
    const meta = ACTIVITY_META[activityKey] || ACTIVITY_META.idle;

    const xpSources = {
        mining: char.mining || {},
        smithing: char.smithing || {},
        woodcutting: char.woodcutting || {},
        fishing: char.fishing || {},
        cooking: char.cooking || {}
    };

    const source = xpSources[activityKey] || char;
    const currentExp = Math.max(0, Math.floor(source.exp || 0));
    const targetExp = Math.max(1, Math.floor(source.expToLevel || char.expToLevel || 100));
    const sourceLevel = source.level != null ? source.level : level;
    const expPct = Math.max(0, Math.min(100, (currentExp / targetExp) * 100));

    const nameEl = document.getElementById(`${hudId}-name`);
    const levelEl = document.getElementById(`${hudId}-level`);
    const hpBar = document.getElementById(`${hudId}-hp-bar`);
    const hpText = document.getElementById(`${hudId}-hp-text`);
    const manaBar = document.getElementById(`${hudId}-mana-bar`);
    const manaText = document.getElementById(`${hudId}-mana-text`);
    const xpBar = document.getElementById(`${hudId}-xp-bar`);
    const xpText = document.getElementById(`${hudId}-xp-text`);

    if (nameEl) {
        try {
            const lvl = document.getElementById(`${hudId}-level`);
            if (lvl && nameEl.firstChild && nameEl.firstChild.nodeType === Node.TEXT_NODE) {
                nameEl.firstChild.nodeValue = `${char.name || 'Character'} `;
            } else if (lvl) {
                nameEl.insertBefore(document.createTextNode(`${char.name || 'Character'} `), lvl);
            } else {
                nameEl.textContent = `${char.name || 'Character'} `;
            }
        } catch (e) {
            nameEl.textContent = `${char.name || 'Character'} `;
        }
    }
    if (levelEl) levelEl.textContent = `- Lv ${level}`;

    if (hpBar) hpBar.style.width = `${maxhp > 0 ? Math.max(0, Math.min(100, (hp / maxhp) * 100)) : 0}%`;
    if (hpText) hpText.textContent = `${hp}/${maxhp}`;

    if (manaBar) manaBar.style.width = `${maxmana > 0 ? Math.max(0, Math.min(100, (mana / maxmana) * 100)) : 0}%`;
    if (manaText) manaText.textContent = `${mana}/${maxmana}`;

    if (xpBar) {
        xpBar.style.width = `${expPct}%`;
        xpBar.style.background = meta.color;
    }
    if (xpText) {
        if (activityKey === 'idle') {
            xpText.textContent = `${currentExp}/${targetExp} (Lv ${sourceLevel})`;
        } else {
            xpText.textContent = `${currentExp}/${targetExp} (${meta.label} L${sourceLevel})`;
        }
    }

    applyThemeStyles(scene.hud, options.theme || state.theme);
}

export function destroyHUD(scene) {
    if (!scene) return;
    if (scene._hudStateUnsub && typeof scene._hudStateUnsub === 'function') {
        try { scene._hudStateUnsub(); } catch (e) { /* ignore */ }
    }
    scene._hudStateUnsub = null;
    try { if (scene.hud && scene.hud.parentNode) scene.hud.parentNode.removeChild(scene.hud); } catch (e) { /* ignore */ }
    scene.hud = null;
}

export default { createHUD, updateHUD, destroyHUD };
