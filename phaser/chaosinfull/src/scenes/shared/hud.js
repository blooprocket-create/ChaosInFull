// Shared HUD helper used by multiple scenes (Town, Cave, etc.)
export function createHUD(scene) {
    if (!scene) return;
    // remove existing HUD if present
    try { if (scene.hud && scene.hud.parentNode) scene.hud.parentNode.removeChild(scene.hud); } catch(e) {}
    const char = scene.char || {};
    const name = char.name || 'Character';
    const level = char.level || 1;
    let eff = { str:0,int:0,agi:0,luk:0,defense:0 };
    try { if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(char); } catch(e) {}
    const maxhp = char.maxhp || (100 + level * 10 + ((eff.str || 0) * 10));
    const hp = char.hp || maxhp;
    const maxmana = char.maxmana || (50 + level * 5 + ((eff.int || 0) * 10));
    const mana = char.mana || maxmana;
    const exp = char.exp || 0;
    const expToLevel = char.expToLevel || 100;
    const mining = char.mining || { level: 1, exp: 0, expToLevel: 100 };
    const smithing = char.smithing || { level: 1, exp: 0, expToLevel: 100 };
    const showSmithing = (!!scene.smeltingActive) || (!!scene._furnaceModal) || (!!scene.craftingActive) || (!!scene._workbenchModal);

    const idBase = (scene && scene.scene && scene.scene.key) ? scene.scene.key.toLowerCase() : 'scene';
    const hud = document.createElement('div');
    hud.id = idBase + '-hud';
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
            <span style="font-size:1em; font-weight:700; color:#e44; letter-spacing:1px;">${name} <span style='color:#fff; font-size:0.9em;'>- Lv ${level}</span></span>
            <button id="${charBtnId}" style="pointer-events:auto; background:#222; color:#eee; border:none; border-radius:6px; font-size:0.8em; padding:2px 6px; margin-left:8px; box-shadow:0 0 4px #a00; cursor:pointer; font-family:inherit; opacity:0.85;">⇦</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
            <div style="height:12px; background:#2a0a16; border-radius:6px; overflow:hidden; position:relative;">
                <div style="height:100%; width:${Math.max(0, Math.min(100, (hp / maxhp) * 100))}%; background:#e44; border-radius:6px; position:absolute; left:0; top:0;"></div>
                <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${hp}/${maxhp}</span>
            </div>
            <div style="height:12px; background:#181a2a; border-radius:6px; overflow:hidden; position:relative;">
                <div style="height:100%; width:${Math.max(0, Math.min(100, (mana / maxmana) * 100))}%; background:#44e; border-radius:6px; position:absolute; left:0; top:0;"></div>
                <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${mana}/${maxmana}</span>
            </div>
            <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                <div style="height:100%; width:${showSmithing ? Math.max(0, Math.min(100, (smithing.exp / smithing.expToLevel) * 100)) : Math.max(0, Math.min(100, (exp / expToLevel) * 100))}%; background:#ee4; border-radius:6px; position:absolute; left:0; top:0;"></div>
                <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">${showSmithing ? (smithing.exp + '/' + smithing.expToLevel + ' (Smithing L' + smithing.level + ')') : (exp + '/' + expToLevel)}</span>
            </div>
        </div>
    `;

    document.body.appendChild(hud);
    scene.hud = hud;

    // Wire character select button
    setTimeout(() => {
        const btn = document.getElementById(charBtnId);
        if (btn) btn.onclick = (e) => { e.stopPropagation(); try { scene._persistCharacter && scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null); } catch(e){}; scene.scene.start('CharacterSelect'); };
    }, 0);
}

export function destroyHUD(scene) {
    if (!scene) return;
    try { if (scene.hud && scene.hud.parentNode) scene.hud.parentNode.removeChild(scene.hud); } catch(e) {}
    scene.hud = null;
}

export default { createHUD, destroyHUD };
