// Shared HUD helper used by multiple scenes (Town, Cave, etc.)
export function createHUD(scene) {
    if (!scene) return;
    const char = scene.char || {};
    const idBase = (scene && scene.scene && scene.scene.key) ? scene.scene.key.toLowerCase() : 'scene';
    const hudId = idBase + '-hud';

    // If HUD exists for this scene, update it in-place
    if (scene.hud && scene.hud.parentNode && scene.hud.id === hudId) {
        try { updateHUD(scene); } catch (e) { /* ignore */ }
        return scene.hud;
    }

    // Otherwise build HUD DOM structure with named child elements for in-place updates
    const hud = document.createElement('div');
    hud.id = hudId;
    hud.style.position = 'fixed';
    hud.style.top = '8px';
    hud.style.left = '8px';
    hud.style.width = '200px';
    hud.style.padding = '8px';
    hud.style.zIndex = '100';
    hud.style.pointerEvents = 'auto';
    hud.style.display = 'flex';
    hud.style.flexDirection = 'column';
    hud.style.alignItems = 'flex-start';
    hud.style.background = 'rgba(20,10,30,0.55)';
    hud.style.backdropFilter = 'blur(8px)';
    hud.style.borderRadius = '16px';
    hud.style.color = '#eee';
    hud.style.fontFamily = 'UnifrakturCook, cursive';

    const charBtnId = idBase + '-hud-charselect-btn';
    hud.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px;">
            <span id="${hudId}-name" style="font-size:1em; font-weight:700; color:#e44; letter-spacing:1px;">${char.name || 'Character'} <span id="${hudId}-level" style='color:#fff; font-size:0.9em;'>- Lv ${char.level || 1}</span></span>
            <button id="${charBtnId}" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">⇦</button>
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

    // wire char select button
    setTimeout(() => {
        const btn = document.getElementById(charBtnId);
        if (btn) btn.onclick = (e) => {
            e.stopPropagation();
            try {
                const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
                if (username && scene.char) {
                    try {
                        const key = 'cif_user_' + username;
                        const userObj = JSON.parse(localStorage.getItem(key)) || { characters: [] };
                        if (!userObj.characters) userObj.characters = [];
                        let found = false;
                        for (let i = 0; i < userObj.characters.length; i++) {
                            const uc = userObj.characters[i];
                            if (!uc) continue;
                            if ((uc.id && scene.char.id && uc.id === scene.char.id) || (!uc.id && uc.name === scene.char.name)) {
                                userObj.characters[i] = scene.char;
                                userObj.characters[i].lastLocation = { scene: (scene.scene && scene.scene.key) || null, x: (scene.player && scene.player.x) || null, y: (scene.player && scene.player.y) || null };
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            let placed = false;
                            for (let i = 0; i < userObj.characters.length; i++) {
                                if (!userObj.characters[i]) { userObj.characters[i] = scene.char; userObj.characters[i].lastLocation = { scene: (scene.scene && scene.scene.key) || null, x: (scene.player && scene.player.x) || null, y: (scene.player && scene.player.y) || null }; placed = true; break; }
                            }
                            if (!placed) { scene.char.lastLocation = { scene: (scene.scene && scene.scene.key) || null, x: (scene.player && scene.player.x) || null, y: (scene.player && scene.player.y) || null }; userObj.characters.push(scene.char); }
                        }
                        localStorage.setItem(key, JSON.stringify(userObj));
                    } catch (e) { console.warn('Could not persist character before charselect', e); }
                }
            } catch (e) { /* ignore */ }
            scene.scene.start('CharacterSelect');
        };
    }, 0);
}

export function updateHUD(scene) {
    if (!scene || !scene.hud) return;
    const hud = scene.hud;
    const char = scene.char || {};
    let eff = { str:0,int:0,agi:0,luk:0,defense:0, maxhp:0, maxmana:0, attackSpeedMs:1000 };
    try { if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(char); } catch(e) {}
    const level = char.level || 1;
    const maxhp = (typeof char.maxhp === 'number' && char.maxhp > 0) ? char.maxhp : (eff.maxhp || 0);
    const hp = (typeof char.hp === 'number') ? char.hp : maxhp;
    const maxmana = (typeof char.maxmana === 'number' && char.maxmana > 0) ? char.maxmana : (eff.maxmana || 0);
    const mana = (typeof char.mana === 'number') ? char.mana : maxmana;
    const exp = char.exp || 0;
    const expToLevel = char.expToLevel || 100;
    const mining = char.mining || { level: 1, exp: 0, expToLevel: 100 };
    const smithing = char.smithing || { level: 1, exp: 0, expToLevel: 100 };
    const activity = (char && char.activity) ? char.activity : null;

    const idBase = (scene && scene.scene && scene.scene.key) ? scene.scene.key.toLowerCase() : 'scene';
    const hudId = idBase + '-hud';
    const nameEl = document.getElementById(`${hudId}-name`);
    const levelEl = document.getElementById(`${hudId}-level`);
    const hpBar = document.getElementById(`${hudId}-hp-bar`);
    const hpText = document.getElementById(`${hudId}-hp-text`);
    const manaBar = document.getElementById(`${hudId}-mana-bar`);
    const manaText = document.getElementById(`${hudId}-mana-text`);
    const xpBar = document.getElementById(`${hudId}-xp-bar`);
    const xpText = document.getElementById(`${hudId}-xp-text`);

    if (nameEl) nameEl.textContent = `${char.name || 'Character'} `;
    if (levelEl) levelEl.textContent = `- Lv ${level}`;
    if (hpBar) hpBar.style.width = maxhp > 0 ? (Math.max(0, Math.min(100, (hp / maxhp) * 100)) + '%') : '0%';
    if (hpText) hpText.textContent = `${hp}/${maxhp}`;
    if (manaBar) manaBar.style.width = maxmana > 0 ? (Math.max(0, Math.min(100, (mana / maxmana) * 100)) + '%') : '0%';
    if (manaText) manaText.textContent = `${mana}/${maxmana}`;
    const xpPct = (activity === 'mining') ? Math.max(0, Math.min(100, (mining.exp / mining.expToLevel) * 100)) : (activity === 'smithing') ? Math.max(0, Math.min(100, (smithing.exp / smithing.expToLevel) * 100)) : Math.max(0, Math.min(100, (exp / expToLevel) * 100));
    if (xpBar) xpBar.style.width = xpPct + '%';
    if (xpText) xpText.textContent = (activity === 'mining') ? (mining.exp + '/' + mining.expToLevel + ' (Mining L' + mining.level + ')') : (activity === 'smithing') ? (smithing.exp + '/' + smithing.expToLevel + ' (Smithing L' + smithing.level + ')') : (exp + '/' + expToLevel);
}

export function destroyHUD(scene) {
    if (!scene) return;
    try { if (scene.hud && scene.hud.parentNode) scene.hud.parentNode.removeChild(scene.hud); } catch(e) {}
    scene.hud = null;
}

export default { createHUD, updateHUD, destroyHUD };
