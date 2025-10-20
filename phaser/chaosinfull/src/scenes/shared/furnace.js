import { ITEM_DEFS } from '../../data/items.js';
import { RECIPE_DEFS } from '../../data/recipes.js';

const OVERLAY_ID = 'furnace-overlay';
const MODAL_ID = 'furnace-modal';
const RECIPES_LIST_ID = 'furnace-recipes';
const DETAILS_ID = 'furnace-details';
const PROGRESS_ID = 'furnace-progress';
const MESSAGE_ID = 'furnace-message';

const DEFAULT_INTERVAL = 2800;

function getFurnaceRecipes() {
    return Object.values(RECIPE_DEFS)
        .filter(r => r && r.tool === 'furnace')
        .sort((a, b) => {
            const levelDiff = (a.reqLevel || 0) - (b.reqLevel || 0);
            if (levelDiff !== 0) return levelDiff;
            return (a.name || a.id).localeCompare(b.name || b.id);
        });
}

function getState(scene) {
    if (!scene.__furnaceState) {
        scene.__furnaceState = {
            selectedCategory: null,
            selectedRecipe: null,
            count: 1,
            countManual: false,
            continuous: false,
            hasFocusedRecipe: false
        };
    }
    return scene.__furnaceState;
}

function getFurnaceRecipeDefs() {
    if (typeof window !== 'undefined' && window.RECIPE_DEFS) return window.RECIPE_DEFS;
    return RECIPE_DEFS || {};
}

function normalizeCategory(value) {
    if (!value || typeof value !== 'string') return 'misc';
    const trimmed = value.trim().toLowerCase();
    return trimmed || 'misc';
}

function toTitleCase(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatCategoryLabel(normalized, raw) {
    if (raw && typeof raw === 'string' && raw.trim().length) {
        return toTitleCase(raw.trim());
    }
    switch (normalized) {
        case 'ore': return 'Ores';
        case 'bar': return 'Bars';
        case 'misc':
        default:
            return 'Misc';
    }
}

function buildCategoryData(recipes) {
    const map = new Map();
    for (const key of Object.keys(recipes || {})) {
        const recipe = recipes[key];
        if (!recipe || recipe.tool !== 'furnace') continue;
        const normalized = normalizeCategory(recipe.category);
        if (!map.has(normalized)) {
            map.set(normalized, { label: formatCategoryLabel(normalized, recipe.category), count: 0 });
        }
        map.get(normalized).count += 1;
    }
    const ordered = Array.from(map.keys()).sort((a,b) => map.get(a).label.localeCompare(map.get(b).label));
    const labels = {};
    map.forEach((v,k) => labels[k] = v.label);
    return { ordered, labels };
}

function findCategoryForRecipe(recipeId) {
    const defs = getFurnaceRecipeDefs();
    for (const k of Object.keys(defs || {})) {
        const r = defs[k];
        if (!r) continue;
        const id = r.id || k;
        if (id === recipeId) return normalizeCategory(r.category);
    }
    return null;
}

function getSmeltingDelay(scene) {
    if (scene && typeof scene.smeltingInterval === 'number') return Math.max(200, scene.smeltingInterval);
    return DEFAULT_INTERVAL;
}

function getRecipeById(id) {
    if (!id) return null;
    const def = RECIPE_DEFS[id];
    return def && def.tool === 'furnace' ? def : null;
}

function getInventorySlots(scene) {
    if (!scene || !scene.char) return [];
    if (window && window.__shared_ui && window.__shared_ui.initSlots) {
        return window.__shared_ui.initSlots(scene.char.inventory || []);
    }
    return (scene.char.inventory || []).map(slot => slot ? { ...slot } : null);
}

function getAvailableQty(scene, itemId) {
    if (!itemId) return 0;
    const slots = getInventorySlots(scene);
    let total = 0;
    for (const slot of slots) {
        if (slot && slot.id === itemId) total += slot.qty || 1;
    }
    return total;
}

function getCraftableCount(scene, recipe) {
    if (!scene || !recipe) return 0;
    // Use cooking level for food/fish/meat recipes, smithing level for others
    const isCookable = recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat');
    const playerLevel = isCookable
        ? ((scene.char && scene.char.cooking && scene.char.cooking.level) || 1)
        : ((scene.char && scene.char.smithing && scene.char.smithing.level) || 1);
    if ((recipe.reqLevel || 1) > playerLevel) return 0;
    let max = Infinity;
    for (const req of (recipe.requires || [])) {
        const have = getAvailableQty(scene, req.id);
        const need = req.qty || 1;
        max = Math.min(max, Math.floor(have / need));
        if (max <= 0) return 0;
    }
    return max === Infinity ? 0 : max;
}

function updateMessage(scene, text = '', tone = 'info') {
    if (!scene) return;
    const el = scene._furnaceMessageEl || (scene._furnaceModal && scene._furnaceModal.querySelector(`#${MESSAGE_ID}`));
    if (!el) return;
    el.textContent = text;
    el.classList.remove('is-warn', 'is-success', 'is-info');
    if (text) el.classList.add(tone === 'warn' ? 'is-warn' : tone === 'success' ? 'is-success' : 'is-info');
}

function ensureFurnaceState(scene) {
    const state = getState(scene);
    const recipes = getFurnaceRecipes();
    if (!state.selectedRecipe && recipes.length) state.selectedRecipe = recipes[0].id;
    const recipe = getRecipeById(state.selectedRecipe);
    if (!recipe && recipes.length) {
        state.selectedRecipe = recipes[0].id;
    }
    return state;
}

function clampCount(scene, recipe, value) {
    const state = getState(scene);
    const max = getCraftableCount(scene, recipe);
    if (max === 0) {
        state.count = 1;
        return;
    }
    state.count = Math.max(1, Math.min(value, max));
}

function renderRecipes(scene) {
    if (!scene._furnaceModal) return;
    const listEl = scene._furnaceModal.querySelector(`#${RECIPES_LIST_ID}`);
    if (!listEl) return;
    const state = getState(scene);
    const recipes = getFurnaceRecipes();
    listEl.innerHTML = '';

    // If categories are available, render as recipe buttons in this column (middle column)
    if (!recipes.length) {
        const empty = document.createElement('div');
        empty.className = 'furnace-empty';
        empty.textContent = 'No furnace recipes unlocked yet.';
        listEl.appendChild(empty);
        state.selectedRecipe = null;
        return;
    }

    // Determine category filter
    const defs = getFurnaceRecipeDefs();
    const cat = state.selectedCategory || null;
    const keys = Object.keys(defs).filter(k => defs[k] && defs[k].tool === 'furnace' && (!cat || normalizeCategory(defs[k].category) === cat));
    keys.sort((a,b) => {
        const ra = defs[a] || {};
        const rb = defs[b] || {};
        const levelDiff = (ra.reqLevel || 0) - (rb.reqLevel || 0);
        if (levelDiff !== 0) return levelDiff;
        return (ra.name || a).localeCompare(rb.name || b);
    });

    if (!keys.length) {
        const empty = document.createElement('div');
        empty.className = 'furnace-empty';
        empty.textContent = 'No recipes in this category yet.';
        listEl.appendChild(empty);
        renderDetails(scene);
        return;
    }

    if (!state.selectedRecipe) {
        state.selectedRecipe = defs[keys[0]]?.id || keys[0];
    }

    keys.forEach(key => {
        const recipe = defs[key];
        if (!recipe) return;
        const recipeId = recipe.id || key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wb-recipe-btn';
        btn.dataset.recipe = recipeId;

        const nameEl = document.createElement('div');
        nameEl.className = 'wb-recipe-name';
        nameEl.textContent = recipe.name || recipeId;
        btn.appendChild(nameEl);

        const meta = document.createElement('div');
        meta.className = 'wb-recipe-meta';
        const lvlSpan = document.createElement('span'); lvlSpan.textContent = `Lv ${recipe.reqLevel || 1}`; meta.appendChild(lvlSpan);
        const parts = (recipe.requires || []).map(req => { const label = (ITEM_DEFS[req.id] && ITEM_DEFS[req.id].name) || req.id; return req.qty && req.qty > 1 ? `${label} x${req.qty}` : label; });
        if (parts.length) { const mats = document.createElement('span'); mats.textContent = parts.join(' | '); meta.appendChild(mats); }
        btn.appendChild(meta);

        if (state.selectedRecipe === recipeId) btn.classList.add('is-active');

        btn.addEventListener('click', () => {
            const active = scene._furnaceActive;
            if (active && active.recipeId !== recipeId) cancelSmelting(scene, true);
            // ensure category highlight updates when a recipe is clicked
            try {
                let cat = null;
                try { cat = normalizeCategory(recipe.category); } catch (e) {}
                if (!cat) cat = findCategoryForRecipe(recipeId);
                if (cat) state.selectedCategory = cat;
            } catch (e) {}
            state.selectedRecipe = recipeId;
            state.countManual = false;
            renderFurnace(scene);
            // also re-render categories to update the active class
            try { renderCategories(scene); } catch (e) {}
        });

        listEl.appendChild(btn);
    });
}

function renderCategories(scene) {
    if (!scene._furnaceModal) return;
    const catsEl = scene._furnaceModal.querySelector('#furnace-cats');
    if (!catsEl) return;
    const state = getState(scene);
    const recipes = getFurnaceRecipeDefs();
    const { ordered, labels } = buildCategoryData(recipes);
    state.categoryLabels = labels;
    catsEl.innerHTML = '';
    if (!ordered.length) {
        const empty = document.createElement('div'); empty.className = 'workbench-alert'; empty.textContent = 'No furnace recipes unlocked yet.'; catsEl.appendChild(empty); state.selectedCategory = null; return;
    }
    if (!state.selectedCategory || !labels[state.selectedCategory]) state.selectedCategory = ordered[0];
    ordered.forEach(category => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'wb-cat-btn'; if (category === state.selectedCategory) btn.classList.add('is-active'); btn.textContent = labels[category] || toTitleCase(category);
        btn.addEventListener('click', () => {
            const activeCat = (scene._furnaceActive && scene._furnaceActive.recipeId) ? normalizeCategory(getRecipeById(scene._furnaceActive.recipeId)?.category) : null;
            if (activeCat && activeCat !== category) { cancelSmelting(scene, true); }
            state.selectedCategory = category; state.selectedRecipe = null; state.countManual = false; updateMessage(scene, ''); renderFurnace(scene);
        });
        catsEl.appendChild(btn);
    });
}

function buildRequirementRow(scene, req) {
    const row = document.createElement('div');
    row.className = 'furnace-req-row';
    const item = ITEM_DEFS[req.id];
    const name = (item && item.name) || req.id;
    const have = getAvailableQty(scene, req.id);
    const need = req.qty || 1;
    const ok = have >= need;
    row.innerHTML = `
        <div class='furnace-req-name'>${name}</div>
        <div class='furnace-req-count ${ok ? 'ok' : 'missing'}'>${have} / ${need}</div>
    `;
    return row;
}

function renderDetails(scene) {
    if (!scene._furnaceModal) return;
    const details = scene._furnaceModal.querySelector(`#${DETAILS_ID}`);
    if (!details) return;
    details.innerHTML = '';
    const state = ensureFurnaceState(scene);
    const recipe = getRecipeById(state.selectedRecipe);
    if (!recipe) {
        const placeholder = document.createElement('div');
        placeholder.className = 'workbench-alert';
        placeholder.textContent = 'Select a recipe to see its requirements.';
        details.appendChild(placeholder);
        return;
    }

    const items = ITEM_DEFS || {};
    const craftable = getCraftableCount(scene, recipe);
    let count = Math.max(1, state.count || 1);
    if (!state.countManual) {
        if (craftable > 0) count = Math.min(count, craftable);
        state.count = count;
    } else {
        state.count = count;
    }

    const validation = (function() {
        const res = { levelOk: true, missing: [] };
        // determine which skill's level to check (cooking for food recipes)
        const reqLevel = recipe.reqLevel || 1;
        const playerLevel = (recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat'))
            ? ((scene.char && scene.char.cooking && scene.char.cooking.level) || 1)
            : ((scene.char && scene.char.smithing && scene.char.smithing.level) || 1);
        const lvlOk = playerLevel >= reqLevel;
        res.levelOk = lvlOk;
        if (!lvlOk) return res;
        for (const req of (recipe.requires || [])) {
            const need = Math.max(1, req.qty || 1) * count;
            const have = getAvailableQty(scene, req.id);
            if (have < need) res.missing.push({ id: req.id, need, have });
        }
        return res;
    })();

    const active = scene._furnaceActive && !scene._furnaceActive.continuous ? scene._furnaceActive : null;
    const isSmeltingThis = !!(scene._furnaceActive && scene._furnaceActive.recipeId === recipe.id);

    const header = document.createElement('div'); header.className = 'workbench-recipe-header';
    header.innerHTML = `<div class='workbench-recipe-title'>${recipe.name || recipe.id}</div>`;
    const sub = document.createElement('div'); sub.className = 'workbench-recipe-sub';
    if (recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat')) {
        sub.innerHTML = `Cooking Lv ${recipe.reqLevel || 1} • ${recipe.cookingXp || 0} xp per cook • Max craftable: ${craftable}`;
    } else {
        sub.innerHTML = `Smithing Lv ${recipe.reqLevel || 1} • ${recipe.smithingXp || 0} xp per craft • Max craftable: ${craftable}`;
    }
    header.appendChild(sub);
    // If this recipe is cookable (food/fish/meat) show estimated success chance based on cooking level and INT
    try {
        const cookable = recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat');
        if (cookable) {
            const cooking = scene.char.cooking = scene.char.cooking || { level: 1, exp: 0, expToLevel: 100 };
            const cookLevel = cooking.level || 1;
            const intStat = (scene.char && scene.char.stats && scene.char.stats.int) || 0;
            const baseChance = 0.45 + Math.min(0.4, (cookLevel - 1) * 0.02) + Math.min(0.14, intStat * 0.01);
            const successChance = Math.max(0.3, Math.min(0.99, baseChance));
            const chanceEl = document.createElement('div'); chanceEl.className = 'workbench-recipe-chance'; chanceEl.style.marginTop = '6px'; chanceEl.style.fontSize = '13px'; chanceEl.style.opacity = '0.95';
            chanceEl.textContent = `Success chance: ${Math.round(successChance * 100)}% (Cooking L${cookLevel} • INT ${intStat})`;
            header.appendChild(chanceEl);
        }
    } catch (e) { /* ignore UI chance calc errors */ }
    details.appendChild(header);

    const reqHeading = document.createElement('div'); reqHeading.className = 'workbench-section-heading'; reqHeading.textContent = 'Materials'; details.appendChild(reqHeading);
    const reqList = document.createElement('div'); reqList.className = 'workbench-reqs';
    for (const req of (recipe.requires || [])) {
        const per = Math.max(1, req.qty || 1);
        const need = per * count;
        const have = getAvailableQty(scene, req.id);
        const def = items[req.id] || {};
        const name = def.name || req.id;
        const row = document.createElement('div'); row.className = 'wb-req';
        row.classList.add(have >= need ? 'is-ready' : 'is-missing');
        row.innerHTML = `<div class='wb-req-name'>${name}</div><div class='wb-req-counts'><span class='wb-req-reserved'>Need ${need}</span><span class='wb-req-have'>Have ${have}</span></div>`;
        reqList.appendChild(row);
    }
    details.appendChild(reqList);

    if (!validation.levelOk) {
        const alert = document.createElement('div'); alert.className = 'workbench-alert';
    if (recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat')) alert.textContent = `Requires Cooking level ${recipe.reqLevel || 1}.`;
    else alert.textContent = `Requires Smithing level ${recipe.reqLevel || 1}.`;
        details.appendChild(alert);
    } else if (validation.missing.length) {
        const alert = document.createElement('div'); alert.className = 'workbench-alert';
        const parts = validation.missing.map(entry => { const d = items[entry.id]; const label = (d && d.name) || entry.id; return `${label} (${entry.have}/${entry.need})`; });
        alert.textContent = `Missing materials: ${parts.join(', ')}`;
        details.appendChild(alert);
    } else if (isSmeltingThis) {
        const ready = document.createElement('div'); ready.className = 'workbench-ready'; ready.textContent = `Smelting in progress (${scene._furnaceActive.produced || 0}/${scene._furnaceActive.total || 0})...`; details.appendChild(ready);
    } else {
        const ready = document.createElement('div'); ready.className = 'workbench-ready'; ready.textContent = `All materials ready for ${count} craft${count > 1 ? 's' : ''}.`; details.appendChild(ready);
    }

    const progress = document.createElement('div'); progress.id = PROGRESS_ID; progress.className = 'workbench-progress'; details.appendChild(progress);

    const actions = document.createElement('div'); actions.className = 'workbench-actions';
    const left = document.createElement('div'); left.className = 'workbench-actions-left';
    const maxBtn = document.createElement('button'); maxBtn.type = 'button'; maxBtn.className = 'btn btn-secondary'; maxBtn.textContent = 'Max'; maxBtn.disabled = isSmeltingThis || craftable <= 0;
    maxBtn.addEventListener('click', () => {
        const max = getCraftableCount(scene, recipe);
        if (max <= 0) { updateMessage(scene, 'No materials available to craft this.', 'warn'); return; }
        state.countManual = true; state.count = Math.max(1, max); updateMessage(scene, `Set count to maximum craftable (${max}).`, 'success'); renderFurnace(scene);
    });
    left.appendChild(maxBtn);
    actions.appendChild(left);

    const right = document.createElement('div'); right.className = 'workbench-actions-right';
    const countLabel = document.createElement('label'); countLabel.textContent = 'Count'; right.appendChild(countLabel);
    const countInput = document.createElement('input'); countInput.type = 'number'; countInput.min = '1'; countInput.value = state.count || 1; countInput.className = 'input-small'; countInput.disabled = isSmeltingThis;
    countInput.addEventListener('input', () => {
        const val = Math.max(1, parseInt(countInput.value, 10) || 1);
        countInput.value = val; state.count = val; state.countManual = true; renderFurnace(scene);
    });
    right.appendChild(countInput);

    const startBtn = document.createElement('button'); startBtn.type = 'button'; startBtn.className = 'btn btn-primary'; startBtn.textContent = isSmeltingThis ? 'Smelting...' : `Smelt ${state.count || 1}`;
    const readyToSmelt = validation.levelOk && validation.missing.length === 0 && !isSmeltingThis;
    startBtn.disabled = !readyToSmelt;
    startBtn.addEventListener('click', () => { if (startBtn.disabled) return; // if continuous mode enabled, startSmelting handles it
        begin: startSmelting(scene);
    });
    right.appendChild(startBtn);

    const cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.className = 'btn btn-ghost'; cancelBtn.textContent = 'Cancel'; cancelBtn.disabled = !isSmeltingThis; cancelBtn.addEventListener('click', () => cancelSmelting(scene));
    right.appendChild(cancelBtn);

    actions.appendChild(right);
    details.appendChild(actions);

    updateProgress(scene);
}

function updateProgress(scene) {
    if (!scene._furnaceModal) return;
    const progressEl = scene._furnaceModal.querySelector(`#${PROGRESS_ID}`);
    if (!progressEl) return;
    const active = scene._furnaceActive;
    if (!active) {
        progressEl.innerHTML = `<div class='progress-note'>Not currently smelting.</div>`;
        return;
    }
    if (active.continuous) {
        progressEl.innerHTML = `<div class='progress-note'>Continuous smelting in progress… ${active.produced || 0} bars produced.</div>`;
        return;
    }
    const total = Math.max(1, active.total || 1);
    const produced = Math.min(active.produced || 0, total);
    let ratio = produced / total;
    if (active.event && typeof active.event.getProgress === 'function') {
        ratio = Math.min(1, (produced + active.event.getProgress()) / total);
    }
    const percent = Math.round(ratio * 100);
    progressEl.innerHTML = `
        <div class='progress-bar'>
            <div class='progress-fill' style='width:${percent}%'></div>
        </div>
        <div class='progress-label'>${produced} / ${total} complete</div>
    `;
}

function renderFurnace(scene) {
    if (!scene._furnaceModal) return;
    renderRecipes(scene);
    renderDetails(scene);
    updateMessage(scene);
}

function onSmeltTick(scene) {
    const active = scene._furnaceActive;
    if (!active) return;
    const recipe = getRecipeById(active.recipeId);
    if (!recipe) {
        finishSmelting(scene, 'Recipe unavailable.', 'warn');
        return;
    }
    const success = smeltOnce(scene, recipe);
    if (!success) {
        finishSmelting(scene, 'Out of materials or inventory space.', 'warn');
        return;
    }
    active.produced = (active.produced || 0) + 1;
    if (!active.continuous && active.produced >= active.total) {
        finishSmelting(scene, `Finished smelting ${recipe.name}.`, 'success');
        return;
    }
    updateProgress(scene);
}

function smeltOnce(scene, recipe) {
    if (!scene || !recipe) return false;
    const requirements = recipe.requires || [];
    for (const req of requirements) {
        if (getAvailableQty(scene, req.id) < (req.qty || 1)) return false;
    }

    for (const req of requirements) {
        const qtyNeeded = req.qty || 1;
        if (window && window.__shared_ui && window.__shared_ui.removeItemFromInventory) {
            const ok = window.__shared_ui.removeItemFromInventory(scene, req.id, qtyNeeded);
            if (!ok) return false;
        } else {
            const inv = scene.char.inventory = scene.char.inventory || [];
            let remaining = qtyNeeded;
            for (let i = 0; i < inv.length && remaining > 0; i++) {
                const slot = inv[i];
                if (!slot || slot.id !== req.id) continue;
                if (slot.qty && slot.qty > remaining) {
                    slot.qty -= remaining;
                    remaining = 0;
                    break;
                }
                remaining -= slot.qty || 1;
                inv[i] = null;
            }
            if (remaining > 0) return false;
            scene.char.inventory = inv.filter(Boolean);
        }
    }

    const prodId = recipe.id || recipe.recipeId;
    const prodDef = ITEM_DEFS[prodId];

    // If this is a food/fish/meat recipe, apply chance-based cooking using cooking level and INT
    let cookedSuccessfully = true;
    const isCookableCategory = recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat');
    let lastComputedSuccessChance = null;
    if (isCookableCategory) {
        try {
            const cooking = scene.char.cooking = scene.char.cooking || { level: 1, exp: 0, expToLevel: 100 };
            const cookLevel = cooking.level || 1;
            const intStat = (scene.char && scene.char.stats && scene.char.stats.int) || 0;
            // base success chance increases with level and INT; clamp between 30% and 99%
            const baseChance = 0.45 + Math.min(0.4, (cookLevel - 1) * 0.02) + Math.min(0.14, intStat * 0.01);
            const successChance = Math.max(0.3, Math.min(0.99, baseChance));
            lastComputedSuccessChance = successChance;
            const roll = Math.random();
            cookedSuccessfully = roll <= successChance;
            if (!cookedSuccessfully) {
                // failure: show toast and give partial XP
                scene._showToast && scene._showToast('Cooking failed — it got burnt.', 1400);
            }
        } catch (e) { cookedSuccessfully = true; }
    }

    if (cookedSuccessfully) {
        if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) {
            const added = window.__shared_ui.addItemToInventory(scene, prodId, 1);
            if (!added) return false;
        } else {
            const inv = scene.char.inventory = scene.char.inventory || [];
            if (prodDef && prodDef.stackable) {
                let slot = inv.find(x => x && x.id === prodId);
                if (slot) slot.qty = (slot.qty || 0) + 1;
                else inv.push({ id: prodId, name: (prodDef && prodDef.name) || prodId, qty: 1 });
            } else {
                inv.push({ id: prodId, name: (prodDef && prodDef.name) || prodId, qty: 1 });
            }
        }
    } else {
        // Failed: don't add the product. Grant a fraction of cooking XP (if defined)
        try {
            if (recipe.cookingXp) {
                const cooking = scene.char.cooking = scene.char.cooking || { level: 1, exp: 0, expToLevel: 100 };
                const partial = Math.max(1, Math.floor((recipe.cookingXp || 0) * 0.25));
                cooking.exp = (cooking.exp || 0) + partial;
                while (cooking.exp >= cooking.expToLevel) {
                    cooking.exp -= cooking.expToLevel;
                    cooking.level = (cooking.level || 1) + 1;
                    cooking.expToLevel = Math.floor(cooking.expToLevel * 1.25);
                    scene._showToast && scene._showToast(`Cooking level up! L${cooking.level}`, 1800);
                }
                try { if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) {}
            }
        } catch (e) {}
        // On failure, if a burnt item exists (burnt_fish or burnt_meat), give it to player
        try {
            const burntId = (recipe.category === 'fish') ? 'burnt_fish' : (recipe.category === 'meat') ? 'burnt_meat' : 'burnt_food';
            const burntDef = ITEM_DEFS[burntId];
            if (burntDef) {
                if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) window.__shared_ui.addItemToInventory(scene, burntId, 1);
                else {
                    const inv = scene.char.inventory = scene.char.inventory || [];
                    if (burntDef && burntDef.stackable) {
                        let slot = inv.find(x => x && x.id === burntId);
                        if (slot) slot.qty = (slot.qty || 0) + 1; else inv.push({ id: burntId, name: (burntDef && burntDef.name) || burntId, qty: 1 });
                    } else {
                        inv.push({ id: burntId, name: (burntDef && burntDef.name) || burntId, qty: 1 });
                    }
                }
            }
        } catch (e) { /* ignore burnt item grant errors */ }
        scene._showToast && scene._showToast(`Failed to cook ${recipe.name || prodId}.`, 1400);
        return true; // treat as consumed materials but no product (burnt item may have been given)
    }

    // Award smithing XP if this is not a food recipe
    if (recipe.category !== 'food') {
        const smithing = scene.char.smithing = scene.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
        smithing.exp = (smithing.exp || 0) + (recipe.smithingXp || 0);
        while (smithing.exp >= smithing.expToLevel) {
            smithing.exp -= smithing.expToLevel;
            smithing.level = (smithing.level || 1) + 1;
            smithing.expToLevel = Math.floor(smithing.expToLevel * 1.25);
            scene._showToast && scene._showToast(`Smithing level up! L${smithing.level}`, 1800);
        }
    }

    // Award cooking XP for food recipes
    try {
        if (recipe.cookingXp) {
            const cooking = scene.char.cooking = scene.char.cooking || { level: 1, exp: 0, expToLevel: 100 };
            cooking.exp = (cooking.exp || 0) + (recipe.cookingXp || 0);
            while (cooking.exp >= cooking.expToLevel) {
                cooking.exp -= cooking.expToLevel;
                cooking.level = (cooking.level || 1) + 1;
                cooking.expToLevel = Math.floor(cooking.expToLevel * 1.25);
                scene._showToast && scene._showToast(`Cooking level up! L${cooking.level}`, 1800);
            }
            try { if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) {}
        }
    } catch (e) {}

    try {
        const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
        if (scene._persistCharacter) scene._persistCharacter(username);
    } catch (e) { /* ignore */ }

    try { if (scene._inventoryModal && scene._refreshInventoryModal) scene._refreshInventoryModal(); } catch (e) { /* ignore */ }
    try { if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) { /* ignore */ }
    try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {
        try { if (scene._destroyHUD) { scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch (_) {}
    }

    scene._showToast && scene._showToast(`Smelted 1x ${(prodDef && prodDef.name) || recipe.name || prodId}!`, 1400);
    return true;
}

function finishSmelting(scene, message, tone = 'info') {
    if (!scene) return;
    const active = scene._furnaceActive;
    if (active && active.event) {
        active.event.remove(false);
        active.event = null;
    }
    scene._furnaceActive = null;
    setFurnaceFlame(scene, false);
    updateMessage(scene, message || '', tone);
    updateProgress(scene);
}

function startSmelting(scene) {
    if (!scene) return;
    const state = ensureFurnaceState(scene);
    const recipe = getRecipeById(state.selectedRecipe);
    if (!recipe) return;
    const playerLevel = (recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat'))
        ? ((scene.char && scene.char.cooking && scene.char.cooking.level) || 1)
        : ((scene.char && scene.char.smithing && scene.char.smithing.level) || 1);
    if ((recipe.reqLevel || 1) > playerLevel) {
        updateMessage(scene, (recipe && (recipe.category === 'food' || recipe.category === 'fish' || recipe.category === 'meat')) ? 'Cooking level too low for this recipe.' : 'Smithing level too low for this recipe.', 'warn');
        return;
    }
    const available = getCraftableCount(scene, recipe);
    if (available <= 0) {
        updateMessage(scene, 'You need more materials.', 'warn');
        return;
    }
    if (scene._furnaceActive) cancelSmelting(scene, true);

    const count = state.continuous ? 0 : Math.max(1, Math.min(state.count || 1, available));
    if (!state.continuous) state.count = count;

    const active = {
        recipeId: recipe.id,
        total: state.continuous ? 0 : count,
        produced: 0,
        continuous: !!state.continuous,
        event: null
    };
    const delay = getSmeltingDelay(scene);
    active.event = scene.time.addEvent({
        delay,
        callback: onSmeltTick,
        callbackScope: null,
        args: [scene],
        loop: true
    });
    scene._furnaceActive = active;
    setFurnaceFlame(scene, true);
    updateMessage(scene, state.continuous ? 'Continuous smelting started.' : `Smelting ${count}× ${recipe.name || recipe.id}…`, 'info');
    updateProgress(scene);
}

function cancelSmelting(scene, silent = false) {
    if (!scene || !scene._furnaceActive) return;
    finishSmelting(scene, silent ? '' : 'Smelting stopped.', silent ? 'info' : 'warn');
}

export function createFurnace(scene, x, y) {
    if (!scene) return null;
    try {
        if (!scene.anims.exists('furnace_burn')) {
            const tex = scene.textures.get('furnace');
            let endFrame = 3;
            if (tex && tex.frames) {
                const numeric = Object.keys(tex.frames)
                    .map(key => Number(key))
                    .filter(n => Number.isFinite(n));
                if (numeric.length) endFrame = Math.max(...numeric);
            }
            if (endFrame >= 1) {
                scene.anims.create({
                    key: 'furnace_burn',
                    frames: scene.anims.generateFrameNumbers('furnace', { start: 1, end: endFrame }),
                    frameRate: 6,
                    repeat: -1
                });
            }
        }
    } catch (e) { /* ignore animation creation errors */ }

    let sprite = null;
    try {
        sprite = scene.add.sprite(x, y, 'furnace', 0).setOrigin(0.5).setDepth(1.5);
        scene.furnace = sprite;
        setFurnaceFlame(scene, false);
    } catch (e) { sprite = null; }

    try {
        if (scene.events) {
            scene.events.once('shutdown', () => {
                cancelSmelting(scene, true);
                closeFurnace(scene);
            });
        }
    } catch (e) { /* ignore */ }
    return sprite;
}

export function setFurnaceFlame(scene, active) {
    if (!scene) return;
    const furnaceSprite = scene.furnace || scene._furnace || null;
    if (!furnaceSprite) return;
    if (active) {
        try {
            if (!scene.anims.exists('furnace_burn')) {
                const tex = scene.textures.get('furnace');
                let endFrame = 3;
                if (tex && tex.frames) {
                    const numeric = Object.keys(tex.frames)
                        .map(key => Number(key))
                        .filter(n => Number.isFinite(n));
                    if (numeric.length) endFrame = Math.max(...numeric);
                }
                if (endFrame >= 1) {
                    scene.anims.create({
                        key: 'furnace_burn',
                        frames: scene.anims.generateFrameNumbers('furnace', { start: 1, end: endFrame }),
                        frameRate: 6,
                        repeat: -1
                    });
                }
            }
            furnaceSprite.play('furnace_burn', true);
        } catch (e) { /* ignore */ }
    } else {
        try { if (furnaceSprite.anims) furnaceSprite.anims.stop(); } catch (e) { /* ignore */ }
        try { if (furnaceSprite.setFrame) furnaceSprite.setFrame(0); } catch (e) { /* ignore */ }
    }
}

export function openFurnace(scene) {
    if (!scene) return;
    ensureFurnaceState(scene);
    if (scene._furnaceOverlay) {
        refreshFurnace(scene);
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) closeFurnace(scene);
    });

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'modal-card furnace-card';
    overlay.appendChild(modal);

    const head = document.createElement('div');
    head.className = 'modal-head';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Furnace';
    head.appendChild(title);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-secondary modal-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => closeFurnace(scene));
    head.appendChild(closeBtn);
    modal.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'modal-subtitle';
    desc.textContent = 'Smelt ores into refined bars. Hold Shift to begin continuous smelting.';
    modal.appendChild(desc);

    const body = document.createElement('div');
    // Use workbench-like three-column layout: categories | recipes | details
    body.className = 'modal-body workbench-body furnace-body';
    const catsCol = document.createElement('nav');
    catsCol.id = 'furnace-cats';
    catsCol.className = 'modal-column workbench-categories';
    const recipesCol = document.createElement('section');
    recipesCol.id = RECIPES_LIST_ID;
    recipesCol.className = 'modal-column workbench-recipes furnace-recipes';
    const detailsCol = document.createElement('section');
    detailsCol.id = DETAILS_ID;
    detailsCol.className = 'modal-column workbench-details furnace-details';
    body.appendChild(catsCol);
    body.appendChild(recipesCol);
    body.appendChild(detailsCol);
    modal.appendChild(body);

    const message = document.createElement('div');
    message.id = MESSAGE_ID;
    message.className = 'modal-message';
    modal.appendChild(message);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    scene._furnaceOverlay = overlay;
    scene._furnaceModal = modal;
    scene._furnaceMessageEl = message;

    // initialize category selection
    const state = getState(scene);
    const defs = getFurnaceRecipeDefs();
    const { ordered } = buildCategoryData(defs);
    state.selectedCategory = state.selectedCategory || (ordered[0] || null);

    scene._furnaceEscHandler = (ev) => {
        if (ev.key === 'Escape') closeFurnace(scene);
    };
    window.addEventListener('keydown', scene._furnaceEscHandler);

    renderFurnace(scene);
    renderCategories(scene);
}

export function closeFurnace(scene) {
    if (!scene) return;
    if (scene._furnaceEscHandler) {
        window.removeEventListener('keydown', scene._furnaceEscHandler);
        scene._furnaceEscHandler = null;
    }
    if (scene._furnaceOverlay && scene._furnaceOverlay.parentNode) {
        scene._furnaceOverlay.parentNode.removeChild(scene._furnaceOverlay);
    }
    scene._furnaceOverlay = null;
    scene._furnaceModal = null;
    scene._furnaceMessageEl = null;
}

export function refreshFurnace(scene) {
    if (!scene || !scene._furnaceModal) return;
    renderFurnace(scene);
}

export { openFurnace as openFurnaceModal };
export { closeFurnace as closeFurnaceModal };
export { refreshFurnace as refreshFurnaceModal };
export { startSmelting as startContinuousSmelting };
export { cancelSmelting as stopContinuousSmelting };

export default {
    createFurnace,
    setFurnaceFlame,
    openFurnace,
    closeFurnace,
    refreshFurnace,
    startSmelting,
    cancelSmelting,
    openFurnaceModal: openFurnace,
    closeFurnaceModal: closeFurnace,
    refreshFurnaceModal: refreshFurnace,
    startContinuousSmelting: startSmelting,
    stopContinuousSmelting: cancelSmelting
};
