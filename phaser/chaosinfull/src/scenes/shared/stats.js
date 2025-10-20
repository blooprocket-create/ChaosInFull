// Shared stats helper: compute effective stats and provide small rendering helpers
export function effectiveStats(char) {
    const base = Object.assign({}, (char.stats || { str:0, int:0, agi:0, luk:0 }));
    const equip = char._equipBonuses || { str:0, int:0, agi:0, luk:0, defense:0 };
    // Temporary buffs (from consumables) may add stat bonuses or defense
    const buffs = Array.isArray(char._buffs) ? char._buffs : (Array.isArray(char.buffs) ? char.buffs : []);
    const buffTotals = { str:0, int:0, agi:0, luk:0, defense:0 };
    try {
        for (const b of buffs) {
            if (!b) continue;
            if (b.statBonus) {
                for (const k of Object.keys(b.statBonus || {})) {
                    buffTotals[k] = (buffTotals[k] || 0) + (b.statBonus[k] || 0);
                }
            }
            if (typeof b.defense === 'number') buffTotals.defense = (buffTotals.defense || 0) + b.defense;
        }
    } catch (e) {}
    const str = (base.str||0) + (equip.str||0);
    const int = (base.int||0) + (equip.int||0);
    const agi = (base.agi||0) + (equip.agi||0);
    const luk = (base.luk||0) + (equip.luk||0);
    const defense = (char.defenseBonus||0) + (equip.defense||0) + (buffTotals.defense || 0);
    // include buff stat totals into effective stats
    const effStr = str + (buffTotals.str || 0);
    const effInt = int + (buffTotals.int || 0);
    const effAgi = agi + (buffTotals.agi || 0);
    const effLuk = luk + (buffTotals.luk || 0);
    // Derived vitals (centralized formulas):
    // maxhp = 100 + level*10 + STR*10
    // maxmana = 50 + level*5 + INT*10
    // attackSpeed = base speed modified by AGI (higher agi -> faster attacks). We invert to a ms-per-attack metric lower is faster.
    const level = (char.level || 1);
    // Always compute vitals from canonical formula using level + effective stats.
    // Do NOT prefer stored char.maxhp/char.maxmana here because those may be stale.
    const computedMaxHp = Math.max(1, Math.floor((100 + level * 10 + (effStr * 10))));
    const computedMaxMana = Math.max(0, Math.floor((50 + level * 5 + (effInt * 10))));
    const maxhp = computedMaxHp;
    const maxmana = computedMaxMana;
    // baseline ms/attack = 1000, agi reduces it by up to 40% at 100 AGI. Formula: ms = 1000 * (1 - clamp(agi / 250, 0, 0.4))
    const agiFactor = Math.max(0, Math.min(0.4, (effAgi / 250)));
    const attackSpeedMs = Math.max(120, Math.floor(1000 * (1 - agiFactor)));
    return {
        str: effStr, int: effInt, agi: effAgi, luk: effLuk, defense,
        // canonical derived vitals
        maxhp, maxmana, attackSpeedMs
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
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
        try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) { /* ignore */ }
    }

    // If we leveled, recompute and assign vitals so stored character reflects new maxima.
    // This ensures HUD and other scenes read the updated values.
    if (leveled && scene && scene.char) {
        try {
            const effAfter = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                ? window.__shared_ui.stats.effectiveStats(scene.char)
                : { maxhp: (100 + (scene.char.level || 1) * 10 + (((scene.char.stats && scene.char.stats.str) || 0) * 10)), maxmana: (50 + (scene.char.level || 1) * 5 + (((scene.char.stats && scene.char.stats.int) || 0) * 10)) };
            // overwrite stored maxima to the authoritative computed values
            scene.char.maxhp = (effAfter && typeof effAfter.maxhp === 'number') ? effAfter.maxhp : scene.char.maxhp;
            scene.char.maxmana = (effAfter && typeof effAfter.maxmana === 'number') ? effAfter.maxmana : scene.char.maxmana;
            // clamp current hp/mana to new maxima
            if (typeof scene.char.hp !== 'number' || scene.char.hp > scene.char.maxhp) scene.char.hp = scene.char.maxhp;
            if (typeof scene.char.mana !== 'number' || scene.char.mana > scene.char.maxmana) scene.char.mana = scene.char.maxmana;
        } catch (e) { /* ignore */ }
    }
    return leveled;
}
