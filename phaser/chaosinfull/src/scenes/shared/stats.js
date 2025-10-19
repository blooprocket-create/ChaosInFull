// Shared stats helper: compute effective stats and provide small rendering helpers
export function effectiveStats(char) {
    const base = Object.assign({}, (char.stats || { str:0, int:0, agi:0, luk:0 }));
    const equip = char._equipBonuses || { str:0, int:0, agi:0, luk:0, defense:0 };
    return {
        str: (base.str||0) + (equip.str||0),
        int: (base.int||0) + (equip.int||0),
        agi: (base.agi||0) + (equip.agi||0),
        luk: (base.luk||0) + (equip.luk||0),
        defense: (char.defenseBonus||0) + (equip.defense||0)
    };
}

export function makeStatPill(label, value) {
    return `<div class='pill stat-pill' title='${label}'>${label}: <span class='pill-value'>${value}</span></div>`;
}

export function formatSkillLine(name, sk) {
    const level = (sk && sk.level) || 1;
    const exp = (sk && sk.exp) || 0;
    const expTo = (sk && sk.expToLevel) || 100;
    return `${name}: <strong>L${level}</strong> ${exp}/${expTo}`;
}

// Check and apply class level ups (char.exp -> char.level) and apply race-based stat growth
export function checkClassLevelUps(scene) {
    if (!scene || !scene.char) return;
    const char = scene.char;
    char.exp = char.exp || 0;
    char.expToLevel = char.expToLevel || 100;
    let leveled = false;
    while (char.exp >= char.expToLevel) {
        char.exp -= char.expToLevel;
        char.level = (char.level || 1) + 1;
        char.expToLevel = Math.floor(char.expToLevel * 1.25);
        // apply race+class per-level growth on level up (use data-driven defs when available)
        const raceKey = (char.race || 'Human');
        const classKey = (char.class || 'beginner');
        const rdefs = (window && window.RACE_DEFS) ? window.RACE_DEFS : {};
        const cdefs = (window && window.CLASS_DEFS) ? window.CLASS_DEFS : {};
        const racePer = (rdefs && rdefs[raceKey] && rdefs[raceKey].perLevel) ? rdefs[raceKey].perLevel : { str:1, int:1, agi:1, luk:1 };
        const classPer = (cdefs && cdefs[classKey] && cdefs[classKey].perLevel) ? cdefs[classKey].perLevel : { str:0, int:0, agi:0, luk:0 };
        if (!char.stats) char.stats = { str:0,int:0,agi:0,luk:0 };
        // sum race and class per-level values and round to nearest integer for applied growth
        const keys = ['str','int','agi','luk'];
        for (const k of keys) {
            const add = (racePer[k] || 0) + (classPer[k] || 0);
            // allow fractional accumulation: store fractional leftover in a temporary field
            const fracKey = `_frac_${k}`;
            char[fracKey] = char[fracKey] || 0;
            const totalAdd = char[fracKey] + add;
            const toApply = Math.floor(totalAdd + 0.000001); // apply integer portion
            char[fracKey] = totalAdd - toApply; // keep remainder
            char.stats[k] = (char.stats[k] || 0) + toApply;
        }
        // recalc defense base if present
        char.defenseBonus = char.defenseBonus || 0;
        scene._showToast && scene._showToast('Level up! L' + char.level, 2000);
        leveled = true;
    }
    if (leveled) {
        // when leveled, persist and refresh HUD + stats modal
        try { if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null); } catch(e) { /* ignore */ }
        try { if (scene._destroyHUD) scene._destroyHUD(); } catch(e) {}
        try { if (scene._createHUD) scene._createHUD(); } catch(e) {}
        try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) { /* ignore */ }
    }
    return leveled;
}
