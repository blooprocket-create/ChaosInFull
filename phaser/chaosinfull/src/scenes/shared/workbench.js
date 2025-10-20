import { ITEM_DEFS } from '../../data/items.js';
import { RECIPE_DEFS } from '../../data/recipes.js';

function getWorkbenchState(scene) {
    if (!scene.__workbenchState) {
        scene.__workbenchState = {
            selectedCategory: 'weapon',
            selectedRecipe: null,
            count: 1,
            countManual: false,
            hasFocusedRecipe: false
        };
    }
    return scene.__workbenchState;
}

export function openWorkbench(scene) {
    const state = getWorkbenchState(scene);
    if (scene._workbenchModal) return;

    const overlay = document.createElement('div');
    overlay.id = 'workbench-overlay';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) closeWorkbench(scene);
    });

    const modal = document.createElement('div');
    modal.id = 'workbench-modal';
    modal.className = 'modal-card';
    overlay.appendChild(modal);

    const head = document.createElement('div');
    head.className = 'modal-head';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Workbench';
    head.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'workbench-close';
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-secondary modal-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => closeWorkbench(scene));
    head.appendChild(closeBtn);
    modal.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'modal-subtitle';
    desc.textContent = 'Craft gear with bars from the furnace.';
    modal.appendChild(desc);

    const body = document.createElement('div');
    body.className = 'modal-body workbench-body';

    const cats = document.createElement('nav');
    cats.id = 'wb-cats';
    cats.className = 'modal-column workbench-categories';

    const recipesCol = document.createElement('section');
    recipesCol.id = 'wb-recipes';
    recipesCol.className = 'modal-column workbench-recipes';

    const details = document.createElement('section');
    details.id = 'wb-details';
    details.className = 'modal-column workbench-details';

    body.appendChild(cats);
    body.appendChild(recipesCol);
    body.appendChild(details);
    modal.appendChild(body);

    const msg = document.createElement('div');
    msg.id = 'workbench-msg';
    msg.className = 'workbench-message';
    modal.appendChild(msg);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    scene._workbenchOverlay = overlay;
    scene._workbenchModal = modal;
    scene._workbenchMessageEl = msg;
    state.selectedCategory = state.selectedCategory || 'weapon';
    state.selectedRecipe = state.selectedRecipe || null;
    state.count = state.count || 1;
    state.countManual = false;
    state.hasFocusedRecipe = false;

    scene._workbenchEscHandler = (ev) => {
        if (ev.key === 'Escape') closeWorkbench(scene);
    };
    window.addEventListener('keydown', scene._workbenchEscHandler);

    renderCategories(scene);
    refreshWorkbench(scene);
}

export function closeWorkbench(scene) {
    if (scene._workbenchActiveCraft) {
        scene._workbenchActiveCraft.silent = true;
        cancelWorkbench(scene, true);
    }
    if (scene._workbenchEscHandler) {
        window.removeEventListener('keydown', scene._workbenchEscHandler);
        scene._workbenchEscHandler = null;
    }
    if (scene._workbenchOverlay && scene._workbenchOverlay.parentNode) {
        scene._workbenchOverlay.parentNode.removeChild(scene._workbenchOverlay);
    } else if (scene._workbenchModal && scene._workbenchModal.parentNode) {
        scene._workbenchModal.parentNode.removeChild(scene._workbenchModal);
    }
    scene._workbenchOverlay = null;
    scene._workbenchModal = null;
    scene._workbenchMessageEl = null;
    const state = getWorkbenchState(scene);
    state.hasFocusedRecipe = false;
    state.countManual = false;
    try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {
        try { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } catch (_) {}
    }
}

export function refreshWorkbench(scene) {
    if (!scene._workbenchModal) return;
    renderCategories(scene);
    renderRecipeColumn(scene);
    updateCraftProgress(scene, scene._workbenchActiveCraft);
}

export function cancelWorkbench(scene, silent = false) {
    const active = scene._workbenchActiveCraft;
    if (!active || active.cancelled) return;
    active.silent = silent;
    active.cancelled = true;
    if (active.timeoutId) {
        clearTimeout(active.timeoutId);
        active.timeoutId = null;
    }
    if (active.remaining > 0) {
        for (const req of (active.requirements || [])) {
            const refund = Math.max(0, req.per || 0) * active.remaining;
            if (refund > 0) returnInventoryItems(scene, req.id, refund);
        }
        if (scene._inventoryModal) scene._refreshInventoryModal();
    }
    if (!silent) updateMessage(scene, 'Crafting cancelled.', 'warn');
    scene._workbenchActiveCraft = null;
    const state = getWorkbenchState(scene);
    state.countManual = false;
    const newMax = getCraftableCount(scene, active.recipe);
    state.count = Math.max(1, Math.min(state.count || 1, newMax || 1));
    updateCraftProgress(scene, null);
    refreshWorkbench(scene);
}

function renderCategories(scene) {
    if (!scene._workbenchModal) return;
    const catsEl = scene._workbenchModal.querySelector('#wb-cats');
    if (!catsEl) return;
    const state = getWorkbenchState(scene);
    const recipes = getRecipeDefs();
    const { ordered, labels } = buildCategoryData(recipes);
    state.categoryLabels = labels;

    catsEl.innerHTML = '';
    if (!ordered.length) {
        const empty = document.createElement('div');
        empty.className = 'workbench-alert';
        empty.textContent = 'No workbench recipes unlocked yet.';
        catsEl.appendChild(empty);
        state.selectedCategory = null;
        return;
    }

    if (!state.selectedCategory || !labels[state.selectedCategory]) {
        state.selectedCategory = ordered[0];
    }

    ordered.forEach((category) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wb-cat-btn';
        if (category === state.selectedCategory) btn.classList.add('is-active');
        const label = labels[category] || toTitleCase(category);
        btn.textContent = label;
        btn.addEventListener('click', () => {
            const activeCat = (scene._workbenchActiveCraft && scene._workbenchActiveCraft.recipe)
                ? normalizeCategory(scene._workbenchActiveCraft.recipe.category)
                : null;
            if (activeCat && activeCat !== category) {
                scene._workbenchActiveCraft.silent = true;
                cancelWorkbench(scene, true);
            }
            state.selectedCategory = category;
            state.selectedRecipe = null;
            state.countManual = false;
            updateMessage(scene, '');
            refreshWorkbench(scene);
        });
        catsEl.appendChild(btn);
    });
}

function buildCategoryData(recipes) {
    const map = new Map();
    for (const key of Object.keys(recipes || {})) {
        const recipe = recipes[key];
        if (!recipe || recipe.tool !== 'workbench') continue;
        const normalized = normalizeCategory(recipe.category);
        if (!map.has(normalized)) {
            map.set(normalized, { label: formatCategoryLabel(normalized, recipe.category), count: 0 });
        }
        map.get(normalized).count += 1;
    }
    const preferred = ['weapon', 'armor', 'helm', 'boots', 'legs', 'rings', 'amulets', 'misc'];
    const preferredSet = new Set(preferred);
    const ordered = preferred.filter(cat => map.has(cat));
    const extras = [];
    map.forEach((value, key) => {
        if (!preferredSet.has(key)) extras.push(key);
    });
    extras.sort((a, b) => {
        const labelA = map.get(a)?.label || toTitleCase(a);
        const labelB = map.get(b)?.label || toTitleCase(b);
        return labelA.localeCompare(labelB);
    });
    const labels = {};
    map.forEach((value, key) => { labels[key] = value.label; });
    return { ordered: ordered.concat(extras), labels };
}

function formatCategoryLabel(normalized, raw) {
    if (raw && typeof raw === 'string' && raw.trim().length) {
        return toTitleCase(raw.trim());
    }
    switch (normalized) {
        case 'weapon': return 'Weapons';
        case 'armor': return 'Armor';
        case 'helm': return 'Helms';
        case 'boots': return 'Boots';
        case 'legs': return 'Legs';
        case 'rings': return 'Rings';
        case 'amulets': return 'Amulets';
        case 'misc':
        default:
            return 'Misc';
    }
}

function toTitleCase(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function renderRecipeColumn(scene) {
    const state = getWorkbenchState(scene);
    const recipesCol = scene._workbenchModal.querySelector('#wb-recipes');
    if (!recipesCol) return;
    const recipes = getRecipeDefs();
    const items = ITEM_DEFS || {};
    const inv = scene.char ? (scene.char.inventory || []) : [];
    const findQty = (id) => {
        const it = inv.find(x => x && x.id === id);
        return it ? (it.qty || 0) : 0;
    };

    recipesCol.innerHTML = '';
    const cat = state.selectedCategory || 'weapon';
    const recKeys = Object.keys(recipes || {}).filter(key => {
        const r = recipes[key];
        return r && r.tool === 'workbench' && (normalizeCategory(r.category) === cat);
    }).sort((a, b) => {
        const ra = recipes[a];
        const rb = recipes[b];
        return (ra && (ra.name || ra.id || a)).localeCompare(rb && (rb.name || rb.id || b));
    });

    if (!recKeys.length) {
        const empty = document.createElement('div');
        empty.className = 'workbench-alert';
        empty.textContent = 'No recipes in this category yet.';
        recipesCol.appendChild(empty);
        renderDetails(scene, null);
        return;
    }

    if (!state.selectedRecipe) {
        const firstKey = recKeys[0];
        const def = recipes[firstKey];
        state.selectedRecipe = (def && def.id) ? def.id : firstKey;
    }

    const activeCraft = (scene._workbenchActiveCraft && !scene._workbenchActiveCraft.cancelled) ? scene._workbenchActiveCraft : null;
    const recipeMap = {};
    let firstFocusable = null;

    recKeys.forEach((key) => {
        const recipe = recipes[key];
        if (!recipe) return;
        const recipeId = recipe.id || key;
        recipeMap[recipeId] = recipe;
        const craftable = getCraftableCount(scene, recipe);

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
        const levelSpan = document.createElement('span');
        levelSpan.textContent = `Lv ${recipe.reqLevel || 1}`;
        meta.appendChild(levelSpan);
        const xpSpan = document.createElement('span');
        xpSpan.textContent = `${recipe.smithingXp || 0} xp`;
        meta.appendChild(xpSpan);
        const parts = (recipe.requires || []).map(req => {
            const label = (items[req.id] && items[req.id].name) || req.id;
            return req.qty && req.qty > 1 ? `${label} x${req.qty}` : label;
        });
        if (parts.length) {
            const mats = document.createElement('span');
            mats.textContent = parts.join(' | ');
            meta.appendChild(mats);
        }
        const ownEnough = craftable >= 1;
        const lvlOk = !(scene.char && scene.char.smithing && (scene.char.smithing.level || 1) < (recipe.reqLevel || 1));
        const status = document.createElement('span');
        status.className = 'wb-recipe-status';
        if (!lvlOk) {
            status.classList.add('locked');
            status.textContent = 'Locked';
        } else if (ownEnough) {
            status.classList.add('ready');
            status.textContent = 'Ready';
        } else {
            status.classList.add('missing');
            status.textContent = 'Missing';
        }
        meta.appendChild(status);
        btn.appendChild(meta);

        if (state.selectedRecipe === recipeId) btn.classList.add('is-active');
        if (activeCraft && activeCraft.recipe && activeCraft.recipe.id === recipeId) btn.classList.add('is-crafting');

        if (activeCraft && activeCraft.recipe && activeCraft.recipe.id !== recipeId) {
            btn.disabled = true;
        } else if (!lvlOk) {
            btn.disabled = true;
        }

        btn.addEventListener('click', () => {
            if (scene._workbenchActiveCraft && scene._workbenchActiveCraft.recipe && scene._workbenchActiveCraft.recipe.id !== recipeId) {
                scene._workbenchActiveCraft.silent = true;
                cancelWorkbench(scene, true);
            }
            state.selectedRecipe = recipeId;
            state.countManual = false;
            const clamp = Math.max(1, craftable || 1);
            state.count = Math.min(Math.max(1, state.count || 1), clamp);
            updateMessage(scene, '');
            refreshWorkbench(scene);
        });

        recipesCol.appendChild(btn);
        if (!firstFocusable && !btn.disabled) firstFocusable = btn;
    });

    if (!recipeMap[state.selectedRecipe]) {
        const firstKey = recKeys[0];
        const def = recipes[firstKey];
        state.selectedRecipe = (def && def.id) ? def.id : firstKey;
    }

    if (!state.hasFocusedRecipe && firstFocusable) {
        firstFocusable.focus();
        state.hasFocusedRecipe = true;
    }

    const selectedRecipe = recipeMap[state.selectedRecipe];
    renderDetails(scene, selectedRecipe || null);
}

function renderDetails(scene, recipe) {
    if (!scene._workbenchModal) return;
    const details = scene._workbenchModal.querySelector('#wb-details');
    if (!details) return;
    details.innerHTML = '';
    if (!recipe) {
        const placeholder = document.createElement('div');
        placeholder.className = 'workbench-alert';
        placeholder.textContent = 'Select a recipe to see its requirements.';
        details.appendChild(placeholder);
        return;
    }

    const state = getWorkbenchState(scene);
    const items = ITEM_DEFS || {};
    const craftable = getCraftableCount(scene, recipe);
    let count = Math.max(1, state.count || 1);
    if (!state.countManual) {
        if (craftable > 0) count = Math.min(count, craftable);
        state.count = count;
    } else {
        state.count = count;
    }

    const validation = canCraftRecipe(scene, recipe, count);
    const lvlOk = validation.levelOk;
    const missing = validation.missing;
    const active = (scene._workbenchActiveCraft && !scene._workbenchActiveCraft.cancelled) ? scene._workbenchActiveCraft : null;
    const isCraftingThis = !!(active && active.recipe && active.recipe.id === recipe.id);

    const header = document.createElement('div');
    header.className = 'workbench-recipe-header';
    const title = document.createElement('div');
    title.className = 'workbench-recipe-title';
    title.textContent = recipe.name || recipe.id;
    header.appendChild(title);
    const sub = document.createElement('div');
    sub.className = 'workbench-recipe-sub';
    const lvlSpan = document.createElement('span');
    lvlSpan.textContent = `Smithing Lv ${recipe.reqLevel || 1}`;
    sub.appendChild(lvlSpan);
    const xpSpan = document.createElement('span');
    xpSpan.textContent = `${recipe.smithingXp || 0} xp per craft`;
    sub.appendChild(xpSpan);
    const maxSpan = document.createElement('span');
    maxSpan.textContent = `Max craftable: ${craftable}`;
    sub.appendChild(maxSpan);
    header.appendChild(sub);
    details.appendChild(header);

    const reqHeading = document.createElement('div');
    reqHeading.className = 'workbench-section-heading';
    reqHeading.textContent = 'Materials';
    details.appendChild(reqHeading);

    const reqList = document.createElement('div');
    reqList.className = 'workbench-reqs';
    for (const req of (recipe.requires || [])) {
        const per = Math.max(1, req.qty || 1);
        const need = per * count;
        const have = countInventoryItems(scene, req.id);
        const itemDef = items[req.id];
        const name = (itemDef && itemDef.name) || req.id;

        const row = document.createElement('div');
        row.className = 'wb-req';
        row.classList.add(have >= need ? 'is-ready' : 'is-missing');

        const nameEl = document.createElement('div');
        nameEl.className = 'wb-req-name';
        nameEl.textContent = name;
        row.appendChild(nameEl);

        const countsWrap = document.createElement('div');
        countsWrap.className = 'wb-req-counts';
        const needEl = document.createElement('span');
        needEl.className = 'wb-req-reserved';
        needEl.textContent = `Need ${need}`;
        countsWrap.appendChild(needEl);
        const haveEl = document.createElement('span');
        haveEl.className = 'wb-req-have';
        haveEl.textContent = `Have ${have}`;
        countsWrap.appendChild(haveEl);
        row.appendChild(countsWrap);

        reqList.appendChild(row);
    }
    details.appendChild(reqList);

    if (!lvlOk) {
        const alert = document.createElement('div');
        alert.className = 'workbench-alert';
        alert.textContent = `Requires Smithing level ${recipe.reqLevel || 1}.`;
        details.appendChild(alert);
    } else if (missing.length) {
        const alert = document.createElement('div');
        alert.className = 'workbench-alert';
        const parts = missing.map(entry => {
            const itemDef = items[entry.id];
            const label = (itemDef && itemDef.name) || entry.id;
            return `${label} (${entry.have}/${entry.need})`;
        });
        alert.textContent = `Missing materials: ${parts.join(', ')}`;
        details.appendChild(alert);
    } else if (isCraftingThis) {
        const ready = document.createElement('div');
        ready.className = 'workbench-ready';
        ready.textContent = `Crafting in progress (${active.remaining} remaining)...`;
        details.appendChild(ready);
    } else {
        const ready = document.createElement('div');
        ready.className = 'workbench-ready';
        ready.textContent = `All materials ready for ${count} craft${count > 1 ? 's' : ''}.`;
        details.appendChild(ready);
    }

    const progress = document.createElement('div');
    progress.id = 'workbench-progress';
    progress.className = 'workbench-progress';
    details.appendChild(progress);

    const actions = document.createElement('div');
    actions.className = 'workbench-actions';

    const left = document.createElement('div');
    left.className = 'workbench-actions-left';
    const maxBtn = document.createElement('button');
    maxBtn.type = 'button';
    maxBtn.className = 'btn btn-secondary';
    maxBtn.textContent = 'Max';
    maxBtn.disabled = isCraftingThis || craftable <= 0;
    maxBtn.addEventListener('click', () => {
        const max = getCraftableCount(scene, recipe);
        if (max <= 0) {
            updateMessage(scene, 'No materials available to craft this.', 'warn');
            return;
        }
        state.countManual = true;
        state.count = Math.max(1, max);
        updateMessage(scene, `Set count to maximum craftable (${max}).`, 'success');
        refreshWorkbench(scene);
    });
    left.appendChild(maxBtn);
    actions.appendChild(left);

    const right = document.createElement('div');
    right.className = 'workbench-actions-right';
    const countLabel = document.createElement('label');
    countLabel.textContent = 'Count';
    right.appendChild(countLabel);
    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.min = '1';
    countInput.value = state.count || 1;
    countInput.className = 'input-small';
    countInput.disabled = isCraftingThis;
    countInput.addEventListener('input', () => {
        const val = Math.max(1, parseInt(countInput.value, 10) || 1);
        countInput.value = val;
        state.count = val;
        state.countManual = true;
        refreshWorkbench(scene);
    });
    right.appendChild(countInput);

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'btn btn-primary';
    startBtn.textContent = isCraftingThis ? 'Crafting...' : `Craft ${state.count || 1}`;
    const readyToCraft = lvlOk && missing.length === 0 && !isCraftingThis;
    startBtn.disabled = !readyToCraft;
    startBtn.addEventListener('click', () => {
        if (startBtn.disabled) return;
        beginCraft(scene, recipe);
    });
    right.appendChild(startBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.disabled = !isCraftingThis;
    cancelBtn.addEventListener('click', () => cancelWorkbench(scene));
    right.appendChild(cancelBtn);

    actions.appendChild(right);
    details.appendChild(actions);
}

function beginCraft(scene, recipe) {
    if (!scene || !recipe || !scene._workbenchModal) return;
    const state = getWorkbenchState(scene);
    const count = Math.max(1, state.count || 1);
    const validation = canCraftRecipe(scene, recipe, count);
    if (!validation.levelOk) {
        updateMessage(scene, `Requires Smithing level ${recipe.reqLevel || 1}.`, 'warn');
        return;
    }
    if (validation.missing.length) {
        const items = ITEM_DEFS || {};
        const parts = validation.missing.map(entry => {
            const def = items[entry.id];
            const label = (def && def.name) || entry.id;
            return `${label} (${entry.have}/${entry.need})`;
        });
        updateMessage(scene, `Missing materials: ${parts.join(', ')}`, 'warn');
        return;
    }

    const consumed = consumeRecipeMaterials(scene, recipe, count);
    if (!consumed) {
        updateMessage(scene, 'Could not remove materials from inventory.', 'error');
        return;
    }
    if (scene._inventoryModal) scene._refreshInventoryModal();

    const requirements = (recipe.requires || []).map(req => ({ id: req.id, per: Math.max(1, req.qty || 1) }));
    const duration = scene.craftingInterval || 2800;
    const active = {
        recipe,
        cancelled: false,
        silent: false,
        timeoutId: null,
        remaining: count,
        total: count,
        consumed,
        requirements
    };
    scene._workbenchActiveCraft = active;
    updateMessage(scene, `Crafting ${count}x ${recipe.name || recipe.id}...`, 'warn');
    refreshWorkbench(scene);

    const finishSuccess = () => {
        scene._workbenchActiveCraft = null;
        const newMax = getCraftableCount(scene, recipe);
        state.countManual = false;
        state.count = Math.max(1, Math.min(state.count || 1, newMax || 1));
        updateMessage(scene, `Crafted ${active.total}x ${recipe.name || recipe.id}`, 'success');
        refreshWorkbench(scene);
    };

    const craftOne = () => {
        if (active.cancelled) return;
        if (window && window.__shared_ui && window.__shared_ui.addItemToInventory) {
            window.__shared_ui.addItemToInventory(scene, recipe.id, 1);
        } else {
            const defs = ITEM_DEFS || {};
            const def = defs && defs[recipe.id];
            const target = scene.char.inventory = scene.char.inventory || [];
            if (def && def.stackable) {
                const existing = target.find(x => x && x.id === recipe.id);
                if (existing) existing.qty = (existing.qty || 0) + 1;
                else target.push({ id: recipe.id, name: (def && def.name) || recipe.name, qty: 1 });
            } else {
                target.push({ id: recipe.id, name: (recipe && recipe.name) || recipe.id, qty: 1 });
            }
        }
        scene.char.smithing = scene.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
        scene.char.smithing.exp = (scene.char.smithing.exp || 0) + (recipe.smithingXp || 0);
        while (scene.char.smithing.exp >= scene.char.smithing.expToLevel) {
            scene.char.smithing.exp -= scene.char.smithing.expToLevel;
            scene.char.smithing.level = (scene.char.smithing.level || 1) + 1;
            scene.char.smithing.expToLevel = Math.floor(scene.char.smithing.expToLevel * 1.25);
            scene._showToast?.('Smithing level up! L' + scene.char.smithing.level, 1800);
        }
        try {
            if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) {
                window.__shared_ui.refreshStatsModal(scene);
            }
        } catch (_) {}
        const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
        if (scene._persistCharacter) scene._persistCharacter(username);
        if (scene._inventoryModal) scene._refreshInventoryModal();
    };

    const scheduleNext = () => {
        if (active.cancelled) return;
        if (active.remaining <= 0) {
            finishSuccess();
            return;
        }
        active.timeoutId = window.setTimeout(() => {
            if (active.cancelled) return;
            craftOne();
            active.remaining -= 1;
            if (active.remaining <= 0) {
                finishSuccess();
                return;
            }
            refreshWorkbench(scene);
            scheduleNext();
        }, duration);
    };

    scheduleNext();
}
function getRecipeDefs() {
    if (typeof window !== 'undefined' && window.RECIPE_DEFS) return window.RECIPE_DEFS;
    return RECIPE_DEFS || {};
}

function normalizeCategory(value) {
    if (!value || typeof value !== 'string') return 'misc';
    const trimmed = value.trim().toLowerCase();
    return trimmed || 'misc';
}

function getCraftableCount(scene, recipe) {
    if (!scene || !recipe || !(recipe.requires || []).length) return 0;
    let minSets = Infinity;
    for (const req of (recipe.requires || [])) {
        const need = Math.max(1, req.qty || 1);
        const have = countInventoryItems(scene, req.id);
        minSets = Math.min(minSets, Math.floor(have / need));
    }
    if (minSets === Infinity) return 0;
    return Math.max(0, minSets);
}

function canCraftRecipe(scene, recipe, count = 1) {
    const result = { ok: true, levelOk: true, missing: [] };
    if (!scene || !recipe) { result.ok = false; return result; }
    const lvlOk = !(scene.char && scene.char.smithing && (scene.char.smithing.level || 1) < (recipe.reqLevel || 1));
    result.levelOk = lvlOk;
    if (!lvlOk) result.ok = false;
    for (const req of (recipe.requires || [])) {
        const need = Math.max(1, req.qty || 1) * Math.max(1, count);
        const have = countInventoryItems(scene, req.id);
        if (have < need) {
            result.ok = false;
            result.missing.push({ id: req.id, need, have });
        }
    }
    return result;
}

function consumeRecipeMaterials(scene, recipe, count) {
    const consumed = {};
    for (const req of (recipe.requires || [])) {
        const total = Math.max(1, req.qty || 1) * Math.max(1, count);
        if (total <= 0) continue;
        const ok = removeInventoryItems(scene, req.id, total);
        if (!ok) {
            for (const key of Object.keys(consumed)) returnInventoryItems(scene, key, consumed[key]);
            return null;
        }
        consumed[req.id] = (consumed[req.id] || 0) + total;
    }
    return consumed;
}

function removeInventoryItems(scene, itemId, qty) {
    if (qty <= 0) return true;
    const shared = (window && window.__shared_ui) || null;
    if (shared && shared.removeItemFromInventory) {
        return !!shared.removeItemFromInventory(scene, itemId, qty, true);
    }
    const inv = scene.char.inventory = scene.char.inventory || [];
    let total = 0;
    for (const slot of inv) {
        if (slot && slot.id === itemId) total += slot.qty || 1;
    }
    if (total < qty) return false;
    let remaining = qty;
    for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
        const slot = inv[i];
        if (!slot || slot.id !== itemId) continue;
        const take = Math.min(slot.qty || 1, remaining);
        slot.qty = (slot.qty || 1) - take;
        remaining -= take;
        if (slot.qty <= 0) inv.splice(i, 1);
    }
    return remaining === 0;
}

function returnInventoryItems(scene, itemId, qty) {
    if (qty <= 0) return;
    const shared = (window && window.__shared_ui) || null;
    if (shared && shared.addItemToInventory) {
        shared.addItemToInventory(scene, itemId, qty, true);
        return;
    }
    const items = ITEM_DEFS || {};
    const def = items[itemId];
    const inv = scene.char.inventory = scene.char.inventory || [];
    if (def && def.stackable) {
        const slot = inv.find(s => s && s.id === itemId);
        if (slot) slot.qty = (slot.qty || 0) + qty;
        else inv.push({ id: itemId, name: def.name || itemId, qty });
    } else {
        for (let i = 0; i < qty; i++) {
            inv.push({ id: itemId, name: (def && def.name) || itemId, qty: 1 });
        }
    }
}

function countInventoryItems(scene, itemId) {
    const inv = scene.char.inventory || [];
    let total = 0;
    for (const slot of inv) {
        if (slot && slot.id === itemId) total += slot.qty || 1;
    }
    return total;
}

function updateCraftProgress(scene, active) {
    if (!scene || !scene._workbenchModal) return;
    const progressEl = scene._workbenchModal.querySelector('#workbench-progress');
    if (!progressEl) return;
    if (!active || active.cancelled || active.remaining <= 0) {
        progressEl.innerHTML = '';
        return;
    }
    const completed = active.total - active.remaining;
    const total = active.total;
    progressEl.innerHTML = `<div class="workbench-progress-text">Crafting… ${completed}/${total} complete</div>`;
}

function updateMessage(scene, text = '', tone) {
    if (!scene || !scene._workbenchModal) return;
    if (!scene._workbenchMessageEl) {
        scene._workbenchMessageEl = scene._workbenchModal.querySelector('#workbench-msg');
    }
    const el = scene._workbenchMessageEl;
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('success', 'warn', 'error');
    if (tone) el.classList.add(tone);
}

export default {
    openWorkbench,
    closeWorkbench,
    refreshWorkbench,
    cancelWorkbench
};


