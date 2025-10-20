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
            selectedRecipe: null,
            count: 1,
            countManual: false,
            continuous: false
        };
    }
    return scene.__furnaceState;
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
    const playerLevel = (scene.char && scene.char.smithing && scene.char.smithing.level) || 1;
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

    if (!recipes.length) {
        const empty = document.createElement('div');
        empty.className = 'furnace-empty';
        empty.textContent = 'No furnace recipes unlocked yet.';
        listEl.appendChild(empty);
        state.selectedRecipe = null;
        return;
    }

    recipes.forEach((recipe) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wb-cat-btn';
        if (recipe.id === state.selectedRecipe) btn.classList.add('is-active');
        const label = recipe.name || recipe.id;
        btn.innerHTML = `<div class='wb-cat-label'>${label}</div><div class='wb-cat-sub'>Lv ${recipe.reqLevel || 1}</div>`;
        btn.addEventListener('click', () => {
            const active = scene._furnaceActive;
            if (active && active.recipeId !== recipe.id) cancelSmelting(scene, true);
            state.selectedRecipe = recipe.id;
            state.countManual = false;
            renderFurnace(scene);
        });
        listEl.appendChild(btn);
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
        const empty = document.createElement('div');
        empty.className = 'furnace-empty';
        empty.textContent = 'Select a recipe to begin smelting.';
        details.appendChild(empty);
        return;
    }

    const header = document.createElement('div');
    header.className = 'furnace-details-head';
    header.innerHTML = `
        <div class='furnace-title'>${recipe.name || recipe.id}</div>
        <div class='furnace-sub'>Requires Smithing Lv ${recipe.reqLevel || 1} • +${recipe.smithingXp || 0} XP</div>
    `;
    details.appendChild(header);

    const reqList = document.createElement('div');
    reqList.className = 'furnace-req-list';
    (recipe.requires || []).forEach(req => reqList.appendChild(buildRequirementRow(scene, req)));
    details.appendChild(reqList);

    const controls = document.createElement('div');
    controls.className = 'furnace-count-controls';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'btn btn-secondary';
    minus.textContent = '−';
    minus.addEventListener('click', () => {
        const current = state.count || 1;
        clampCount(scene, recipe, current - 1);
        state.countManual = true;
        renderFurnace(scene);
    });

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.className = 'furnace-count-input';
    input.value = state.count || 1;
    input.addEventListener('change', (ev) => {
        const value = Number(ev.target.value);
        if (Number.isFinite(value)) {
            clampCount(scene, recipe, value);
            state.countManual = true;
            renderFurnace(scene);
        }
    });

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'btn btn-secondary';
    plus.textContent = '+';
    plus.addEventListener('click', () => {
        const current = state.count || 1;
        clampCount(scene, recipe, current + 1);
        state.countManual = true;
        renderFurnace(scene);
    });

    const maxBtn = document.createElement('button');
    maxBtn.type = 'button';
    maxBtn.className = 'btn btn-secondary';
    maxBtn.textContent = 'Max';
    maxBtn.addEventListener('click', () => {
        const max = getCraftableCount(scene, recipe);
        clampCount(scene, recipe, max > 0 ? max : 1);
        state.countManual = true;
        renderFurnace(scene);
    });

    controls.appendChild(minus);
    controls.appendChild(input);
    controls.appendChild(plus);
    controls.appendChild(maxBtn);
    details.appendChild(controls);

    const continuousRow = document.createElement('label');
    continuousRow.className = 'furnace-toggle';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!state.continuous;
    chk.addEventListener('change', (ev) => {
        state.continuous = !!ev.target.checked;
        renderFurnace(scene);
    });
    continuousRow.appendChild(chk);
    continuousRow.appendChild(document.createTextNode(' Smelt continuously until materials run out'));
    details.appendChild(continuousRow);

    if (state.continuous) controls.classList.add('is-disabled');
    else controls.classList.remove('is-disabled');
    input.disabled = state.continuous;
    minus.disabled = state.continuous;
    plus.disabled = state.continuous;
    maxBtn.disabled = state.continuous;

    const actions = document.createElement('div');
    actions.className = 'furnace-actions';
    const startBtn = document.createElement('button');
    const active = scene._furnaceActive;
    const maxCraftable = getCraftableCount(scene, recipe);
    const playerLevel = (scene.char && scene.char.smithing && scene.char.smithing.level) || 1;

    if (active && active.recipeId === recipe.id) {
        startBtn.type = 'button';
        startBtn.className = 'btn btn-warn';
        startBtn.textContent = 'Stop Smelting';
        startBtn.addEventListener('click', () => cancelSmelting(scene));
    } else {
        startBtn.type = 'button';
        startBtn.className = 'btn btn-primary';
        const count = state.continuous ? '∞' : (state.count || 1);
        startBtn.textContent = state.continuous
            ? `Begin Smelting ${recipe.name}`
            : `Smelt ${count}× ${recipe.name}`;
        const disabled = playerLevel < (recipe.reqLevel || 1) || maxCraftable <= 0 || (active && active.recipeId !== recipe.id);
        startBtn.disabled = !!disabled;
        startBtn.addEventListener('click', () => startSmelting(scene));
    }
    actions.appendChild(startBtn);
    details.appendChild(actions);

    const progress = document.createElement('div');
    progress.id = PROGRESS_ID;
    progress.className = 'furnace-progress';
    details.appendChild(progress);
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

    const smithing = scene.char.smithing = scene.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
    smithing.exp = (smithing.exp || 0) + (recipe.smithingXp || 0);
    while (smithing.exp >= smithing.expToLevel) {
        smithing.exp -= smithing.expToLevel;
        smithing.level = (smithing.level || 1) + 1;
        smithing.expToLevel = Math.floor(smithing.expToLevel * 1.25);
        scene._showToast && scene._showToast(`Smithing level up! L${smithing.level}`, 1800);
    }

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
    const playerLevel = (scene.char && scene.char.smithing && scene.char.smithing.level) || 1;
    if ((recipe.reqLevel || 1) > playerLevel) {
        updateMessage(scene, 'Smithing level too low for this recipe.', 'warn');
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
    body.className = 'modal-body furnace-body';
    const recipesCol = document.createElement('section');
    recipesCol.id = RECIPES_LIST_ID;
    recipesCol.className = 'modal-column furnace-recipes';
    body.appendChild(recipesCol);
    const detailsCol = document.createElement('section');
    detailsCol.id = DETAILS_ID;
    detailsCol.className = 'modal-column furnace-details';
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

    scene._furnaceEscHandler = (ev) => {
        if (ev.key === 'Escape') closeFurnace(scene);
    };
    window.addEventListener('keydown', scene._furnaceEscHandler);

    renderFurnace(scene);
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
