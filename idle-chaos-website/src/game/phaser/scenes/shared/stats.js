// Shared stats helper: compute effective stats and provide small rendering helpers
import { onCharacterLevelUp, computeTalentModifiers } from '../../data/talents.js';
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
    // Base (raw) stats from char + equipment
    let str = (base.str||0) + (equip.str||0);
    let int = (base.int||0) + (equip.int||0);
    let agi = (base.agi||0) + (equip.agi||0);
    let luk = (base.luk||0) + (equip.luk||0);
    let defense = (char.defenseBonus||0) + (equip.defense||0) + (buffTotals.defense || 0);
    // include buff stat totals into effective stats
    // Apply temporary buff stat totals first
    let effStr = str + (buffTotals.str || 0);
    let effInt = int + (buffTotals.int || 0);
    let effAgi = agi + (buffTotals.agi || 0);
    let effLuk = luk + (buffTotals.luk || 0);

    // Apply talent modifiers (aggregated per-target). This will modify primary stats and other derived values.
    const talentMods = computeTalentModifiers && computeTalentModifiers(char) || {};
    function applyTalentToValue(value, targetName) {
        const m = talentMods[targetName];
        if (!m) return value;
        let v = Number(value || 0) + (Number(m.flat || 0) || 0);
        const pct = Number(m.percent || 0);
        if (!pct) return v;
        // Implement fractional carryover so tiny percent buffs accumulate across
        // repeated calls instead of being truncated away. Store per-character
        // leftovers on char._talentPercentCarry[targetName]. This keeps the
        // public API of effectiveStats stable while preserving fractional parts.
        const raw = v * (1 + (pct / 100));
        try {
            if (char) char._talentPercentCarry = char._talentPercentCarry || {};
        } catch (e) {
            // ignore if char isn't writable for some reason
        }
        const prev = (char && char._talentPercentCarry && Number(char._talentPercentCarry[targetName] || 0)) || 0;
        const total = raw + prev;
        const applied = Math.floor(total);
        try { if (char) char._talentPercentCarry[targetName] = Math.max(0, total - applied); } catch (e) {}
        return applied;
    }
    // common stat targets
    effStr = applyTalentToValue(effStr, 'str');
    effInt = applyTalentToValue(effInt, 'int');
    effAgi = applyTalentToValue(effAgi, 'agi');
    effLuk = applyTalentToValue(effLuk, 'luk');
    // Apply defense talents as well so talents targeting 'defense' affect the
    // derived defense value (e.g. thick_skin).
    defense = applyTalentToValue(defense, 'defense');
    // Derived vitals (centralized formulas):
    // maxhp = 100 + level*10 + STR*10
    // maxmana = 50 + level*5 + INT*10
    // attackSpeed = base speed modified by AGI (higher agi -> faster attacks). We invert to a ms-per-attack metric lower is faster.
    const level = (char.level || 1);
    // Always compute vitals from canonical formula using level + effective stats.
    // Do NOT prefer stored char.maxhp/char.maxmana here because those may be stale.
    let computedMaxHp = Math.max(1, Math.floor((100 + level * 10 + (effStr * 10))));
    let computedMaxMana = Math.max(0, Math.floor((50 + level * 5 + (effInt * 10))));
    const maxhp = computedMaxHp;
    const maxmana = computedMaxMana;
    // baseline ms/attack = 1000, agi reduces it by up to 40% at 100 AGI. Formula: ms = 1000 * (1 - clamp(agi / 250, 0, 0.4))
    const agiFactor = Math.max(0, Math.min(0.4, (effAgi / 250)));
    let attackSpeedMs = Math.max(120, Math.floor(1000 * (1 - agiFactor)));

    // Baseline movement speed: agile characters move faster even without talents.
    let movementSpeed = 180 + (effAgi * 0.8);
    try {
        if (char && char._equipBonuses && typeof char._equipBonuses.movementSpeed === 'number') {
            movementSpeed += Number(char._equipBonuses.movementSpeed || 0);
        }
    } catch (e) { /* ignore */ }
    const moveMod = talentMods['movementSpeed'] || null;
    if (moveMod) {
        const moveFlat = Number(moveMod.flat || 0);
        const movePct = Number(moveMod.percent || 0);
        movementSpeed = Number(movementSpeed) + moveFlat;
        if (movePct) movementSpeed = movementSpeed * (1 + (movePct / 100));
    }
    // Temporary post-stealth haste buff may include movement speed; apply if active
    try {
        if (char && char._postStealthHaste && char._postStealthHaste.expiresAt && char._postStealthHaste.expiresAt > Date.now()) {
            const h = Number(char._postStealthHaste.percent || 0);
            if (h > 0) movementSpeed = movementSpeed * (1 + (h / 100));
        }
    } catch (e) {}
    movementSpeed = Math.max(60, Math.round(movementSpeed));
    // Apply talent-based modifications for derived vitals
    // Direct max hp/mana modifiers (target keys may be 'maxHp'/'maxMana' or 'maxhp'/'maxmana')
    const hpMod = talentMods['maxHp'] || talentMods['maxhp'] || null;
    if (hpMod) {
        // apply flat then percent (use rounding for derived vitals so small
        // percent buffs produce sensible results immediately)
        computedMaxHp = Math.max(1, Math.round((computedMaxHp + (hpMod.flat || 0)) * (1 + ((hpMod.percent || 0) / 100))));
    }
    const manaMod = talentMods['maxMana'] || talentMods['maxmana'] || null;
    if (manaMod) {
        computedMaxMana = Math.max(0, Math.round((computedMaxMana + (manaMod.flat || 0)) * (1 + ((manaMod.percent || 0) / 100))));
    }
    // Attack speed: percent increases in talentMods.attackSpeed means faster attacks (reduce ms by percent)
    const atkMod = talentMods['attackSpeed'] || null;
    if (atkMod) {
        const pct = (atkMod.percent || 0);
        if (pct) attackSpeedMs = Math.max(80, Math.round(attackSpeedMs * (1 - (pct / 100))));
        if (atkMod.flat) attackSpeedMs = Math.max(80, Math.round(attackSpeedMs - atkMod.flat));
    }
    // Fishing: derive a basic fishing skill and fishingSpeedMs from effective LUK and any equipped fishing tool bonuses.
    // Base fishing skill scales with LUK: each point of LUK gives 0.2 fishing skill by default (this is a lightweight scaling).

    const baseFishingFromLuk = effLuk * 0.2; // e.g. 5 LUK -> 1 fishing skill
    // Check equipment fishing bonuses if available on the character object (reconciled into _equipBonuses or via item defs)
    let equipFishingSkillBonus = 0;
    let equipFishingSpeedReductionMs = 0;
    try {
        // If the character has an equipped fishing tool with id, look up its definition for fishingBonus
            if (char && char.equipment && char.equipment.fishing && char.equipment.fishing.id) {
            const defs = (typeof window !== 'undefined' && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
            const fdef = defs[char.equipment.fishing.id];
            if (fdef && fdef.fishingBonus) {
                equipFishingSkillBonus += (fdef.fishingBonus.skill || 0);
                equipFishingSpeedReductionMs += (fdef.fishingBonus.speedReductionMs || 0);
            }
        }
        // Also allow generic equip bonuses to include fishing skill under _equipBonuses.fishing if present
        if (char && char._equipBonuses && typeof char._equipBonuses.fishing === 'number') {
            equipFishingSkillBonus += char._equipBonuses.fishing;
        }
    } catch (e) { /* ignore */ }

    const fishingSkill = Math.max(0, Math.floor(baseFishingFromLuk + equipFishingSkillBonus));
    // Base fishing speed (ms) baseline 3000ms per attempt; LUK reduces time: each LUK reduces 5ms up to a cap (50% reduction)
    const baseFishingMs = 3000;
    const lukFishingReduction = Math.floor(Math.min(0.5 * baseFishingMs, effLuk * 5)); // each LUK reduces 5ms, cap at 50% of base
    let fishingSpeedMs = Math.max(500, baseFishingMs - lukFishingReduction - equipFishingSpeedReductionMs);

    // Passive regeneration: base formulas derived from primary stats (per-second values)
    // HP regen scales modestly with STR, mana regen scales with INT.
    let hpRegenPerSec = Math.max(0, Math.floor(1 + (effStr * 0.08))); // e.g. STR 5 -> ~1 + 0.4 -> 1
    let manaRegenPerSec = Math.max(0, Math.floor(1 + (effInt * 0.12))); // e.g. INT 5 -> ~1 + 0.6 -> 1
    // Apply talent modifiers if present (support targets 'hpRegen' and 'manaRegen')
    const hpRegenMod = talentMods['hpRegen'] || null;
    if (hpRegenMod) {
        hpRegenPerSec = Math.round((hpRegenPerSec + (hpRegenMod.flat || 0)) * (1 + ((hpRegenMod.percent || 0) / 100)));
        hpRegenPerSec = Math.max(0, hpRegenPerSec);
    }
    const manaRegenMod = talentMods['manaRegen'] || null;
    if (manaRegenMod) {
        manaRegenPerSec = Math.round((manaRegenPerSec + (manaRegenMod.flat || 0)) * (1 + ((manaRegenMod.percent || 0) / 100)));
        manaRegenPerSec = Math.max(0, manaRegenPerSec);
    }

    // Character/skill progression modifiers
    const lukXpBonus = Math.max(0, effLuk * 0.25); // LUK grants additive character XP %
    const charXpTalent = talentMods['characterXpGain'] || null;
    const charXpFlatBonus = charXpTalent ? Number(charXpTalent.flat || 0) : 0;
    const charXpBonusPercent = lukXpBonus + (charXpTalent ? Number(charXpTalent.percent || 0) : 0);

    const skillXpTalent = talentMods['skillXpGain'] || null;
    const skillXpFlatBonus = skillXpTalent ? Number(skillXpTalent.flat || 0) : 0;
    const skillXpBonusPercent = skillXpTalent ? Number(skillXpTalent.percent || 0) : 0;

    const gatherTalent = talentMods['gatherSpeed'] || null;
    const gatherSpeedFlatBonus = gatherTalent ? Number(gatherTalent.flat || 0) : 0;
    const gatherSpeedBonusPercent = gatherTalent ? Number(gatherTalent.percent || 0) : 0;

    const lootTalent = talentMods['dropRate'] || null;
    const lootDropFlatBonus = lootTalent ? Number(lootTalent.flat || 0) : 0;
    const lootDropBonusPercent = lootTalent ? Number(lootTalent.percent || 0) : 0;

    // Allow other systems to read raw aggregated talent modifiers via char._talentModifiers
    // Criticals, lifesteal: derive base values and then apply talent modifiers where present
    // Base crit chance derived from LUK and AGI (lightweight): each LUK gives 0.5%, each AGI gives 0.15%
    let baseCritChance = Math.max(0, Math.min(95, Math.floor(effLuk * 0.5 + effAgi * 0.15)));
    // Base crit damage percent: default 150% (i.e., 1.5x) plus small scaling from LUK
    let baseCritDmgPct = Math.max(100, Math.floor(150 + (effLuk * 1.2)));
    // Base lifesteal percent: default 0
    let baseLifestealPct = 0;
    // Apply talent modifiers.
    // For some stats that are expressed as percentage points (critChance, lifesteal, critDmg),
    // talent 'percent' values should be interpreted as additive percentage points rather
    // than multiplicative percent-of-base. We implement a small helper for those targets.
    function applyTalentAsAdditivePercent(targetName, baseValue) {
        const m = talentMods[targetName];
        if (!m) return baseValue;
        const flat = Number(m.flat || 0);
        const pct = Number(m.percent || 0);
        // interpret both flat and percent as additive percentage points
        return baseValue + flat + pct;
    }

    // Crit chance and lifesteal are shown as percentages; treat talent percent modifiers as additive points.
    const critChanceFinal = applyTalentAsAdditivePercent('critChance', baseCritChance);
    const critDmgAfter = applyTalentAsAdditivePercent('critDmg', baseCritDmgPct);
    const critDmgFinalAlt = applyTalentAsAdditivePercent('critDamage', critDmgAfter);
    // resolve final crit damage value from available talent modifiers (avoid referencing undeclared variables)
    const critDmgFinal = (typeof critDmgFinalAlt !== 'undefined' && critDmgFinalAlt !== null)
        ? critDmgFinalAlt
        : (typeof critDmgAfter !== 'undefined' && critDmgAfter !== null) ? critDmgAfter : baseCritDmgPct;
    const lifestealFinal = applyTalentAsAdditivePercent('lifesteal', baseLifestealPct);

    const result = {
        str: effStr, int: effInt, agi: effAgi, luk: effLuk, defense,
        // canonical derived vitals
        maxhp: computedMaxHp, maxmana: computedMaxMana, attackSpeedMs,
        movementSpeed,
        // fishing derived stats
        fishingSkill, fishingSpeedMs,
        hpRegen: hpRegenPerSec, manaRegen: manaRegenPerSec,
        // combat extras
        critChance: Math.max(0, Math.min(100, Math.round(critChanceFinal || 0))),
        critDmgPercent: Math.max(100, Math.round(critDmgFinal)),
        lifestealPercent: Math.max(0, Number(lifestealFinal || 0)),
        characterXpBonusPercent: Number(charXpBonusPercent || 0),
        characterXpFlatBonus: Number(charXpFlatBonus || 0),
        skillXpBonusPercent: Number(skillXpBonusPercent || 0),
        skillXpFlatBonus: Number(skillXpFlatBonus || 0),
        gatherSpeedBonusPercent: Number(gatherSpeedBonusPercent || 0),
        gatherSpeedFlatBonus: Number(gatherSpeedFlatBonus || 0),
        lootDropBonusPercent: Number(lootDropBonusPercent || 0),
        lootDropFlatBonus: Number(lootDropFlatBonus || 0)
    };
    try { if (char) char._talentModifiers = talentMods; } catch (e) {}
    try {
        if (char) {
            char._derivedBonuses = {
                movementSpeed,
                characterXpBonusPercent: Number(charXpBonusPercent || 0),
                characterXpFlatBonus: Number(charXpFlatBonus || 0),
                skillXpBonusPercent: Number(skillXpBonusPercent || 0),
                skillXpFlatBonus: Number(skillXpFlatBonus || 0),
                gatherSpeedBonusPercent: Number(gatherSpeedBonusPercent || 0),
                gatherSpeedFlatBonus: Number(gatherSpeedFlatBonus || 0),
                lootDropBonusPercent: Number(lootDropBonusPercent || 0),
                lootDropFlatBonus: Number(lootDropFlatBonus || 0)
            };
        }
    } catch (e) { /* ignore derived bonus assignment errors */ }
    return result;
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

// Apply a safe-zone regen tick for a scene. This reads authoritative effectiveStats for the
// scene's character, writes computed maxima back to the character object, applies hp and
// mana regeneration (clamped), and triggers a HUD refresh if available.
export function applySafeZoneRegen(scene) {
    if (!scene || !scene.char) return;
    try {
        const char = scene.char;
        const eff = typeof effectiveStats === 'function' ? effectiveStats(char) : null;
        if (!eff) return;
        // persist authoritative maxima back to character so other systems clamp against them
        if (typeof eff.maxhp === 'number') char.maxhp = eff.maxhp;
        if (typeof eff.maxmana === 'number') char.maxmana = eff.maxmana;

        // apply hp/mana regen scaled by the scene tick duration.
        // effectiveStats reports hpRegen/manaRegen as per-second integers; scenes schedule
        // safe-zone ticks at non-1s intervals (e.g. 1800ms). Multiply regen by the tick
        // duration in seconds so the per-second rates are honored.
        const tickSec = (scene && scene.safeRegenEvent && typeof scene.safeRegenEvent.delay === 'number')
            ? (scene.safeRegenEvent.delay / 1000)
            : 1.8;
        const hpBefore = (typeof char.hp === 'number') ? char.hp : char.maxhp;
        const manaBefore = (typeof char.mana === 'number') ? char.mana : char.maxmana;
        // Keep fractional leftovers between ticks so small per-second rates accumulate correctly.
        // Use char._pendingHpRegen and char._pendingManaRegen to store the fractional remainder.
        try { char._pendingHpRegen = typeof char._pendingHpRegen === 'number' ? char._pendingHpRegen : 0; } catch (e) { char._pendingHpRegen = 0; }
        try { char._pendingManaRegen = typeof char._pendingManaRegen === 'number' ? char._pendingManaRegen : 0; } catch (e) { char._pendingManaRegen = 0; }

        if (typeof eff.hpRegen === 'number' && eff.hpRegen > 0) {
            const hpFloat = (eff.hpRegen * tickSec) + (char._pendingHpRegen || 0);
            const hpGain = Math.floor(hpFloat);
            char._pendingHpRegen = Math.max(0, hpFloat - hpGain);
            if (hpGain > 0) char.hp = Math.min(char.maxhp, Math.max(0, hpBefore + hpGain));
            else if (typeof char.hp !== 'number' || char.hp > char.maxhp) char.hp = char.maxhp;
        } else {
            // no regen: clear any pending fractional leftover to avoid unexpected carryover
            char._pendingHpRegen = 0;
            if (typeof char.hp !== 'number' || char.hp > char.maxhp) char.hp = char.maxhp;
        }

        if (typeof eff.manaRegen === 'number' && eff.manaRegen > 0) {
            const manaFloat = (eff.manaRegen * tickSec) + (char._pendingManaRegen || 0);
            const manaGain = Math.floor(manaFloat);
            char._pendingManaRegen = Math.max(0, manaFloat - manaGain);
            if (manaGain > 0) char.mana = Math.min(char.maxmana, Math.max(0, manaBefore + manaGain));
            else if (typeof char.mana !== 'number' || char.mana > char.maxmana) char.mana = char.maxmana;
        } else {
            char._pendingManaRegen = 0;
            if (typeof char.mana !== 'number' || char.mana > char.maxmana) char.mana = char.maxmana;
        }

        // Refresh HUD if the scene exposes the standard helper
    try { if (typeof scene._updateHUD === 'function') scene._updateHUD(); else if (typeof window !== 'undefined' && window.__hud_shared && window.__hud_shared.updateHUD) window.__hud_shared.updateHUD(scene); } catch (e) {}
    } catch (e) { /* ignore regen errors */ }
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
    try { onCharacterLevelUp && onCharacterLevelUp(scene, char, 1); } catch (e) { /* ignore talent award errors */ }
        // apply race+class per-level growth on level up (use data-driven defs when available)
        const raceKey = (char.race || 'Human');
        const classKey = (char.class || 'beginner');
    const rdefs = (typeof window !== 'undefined' && window.RACE_DEFS) ? window.RACE_DEFS : {};
    const cdefs = (typeof window !== 'undefined' && window.CLASS_DEFS) ? window.CLASS_DEFS : {};
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
    try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) { /* ignore */ }
    }

    // If we leveled, recompute and assign vitals so stored character reflects new maxima.
    // This ensures HUD and other scenes read the updated values.
    if (leveled && scene && scene.char) {
        try {
            const effAfter = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
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
