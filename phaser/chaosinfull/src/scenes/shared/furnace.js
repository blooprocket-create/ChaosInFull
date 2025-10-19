// Shared furnace helper functions to centralize smelting UI and logic for Town and Cave
export function openFurnaceModal(scene) {
    if (!scene) return;
    // reuse implementation previously duplicated in scenes but operate on passed-in scene
    if (scene._furnaceModal) return;
    const inv = scene.char.inventory || [];
    const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
    const modal = document.createElement('div');
    modal.id = (scene.scene && scene.scene.key === 'Cave') ? 'cave-furnace-modal' : 'furnace-modal';
    modal.style.position = 'fixed';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%,-50%)';
    modal.style.zIndex = '220';
    modal.style.background = 'linear-gradient(135deg,#241b2a 0%, #0f0b14 100%)';
    modal.style.padding = '18px';
    modal.style.borderRadius = '12px';
    modal.style.color = '#eee';
    modal.style.fontFamily = 'UnifrakturCook, cursive';
    modal.style.minWidth = '300px';

    modal.innerHTML = `
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'>
            <strong>Furnace</strong>
            <button id='furnace-close' style='background:#222;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;'>Close</button>
        </div>
        <div style='margin-bottom:8px;'>Smelt ores into bars here. Open your Inventory (I) to view quantities.</div>
        <div style='display:flex;flex-direction:column;gap:8px;'>
            <button id='smelt-copper' style='padding:8px;background:#6b4f3a;color:#fff;border:none;border-radius:8px;cursor:pointer;'>Smelt Copper Bar (2x Copper Ore)</button>
            <button id='smelt-bronze' style='padding:8px;background:#7a5f3a;color:#fff;border:none;border-radius:8px;cursor:pointer;'>Smelt Bronze (1x Copper Ore + 1x Tin Ore)</button>
        </div>
        <div id='furnace-msg' style='color:#ffcc99;margin-top:8px;min-height:18px;'></div>
    `;
    document.body.appendChild(modal);
    scene._furnaceModal = modal;

    const closeBtn = document.getElementById('furnace-close');
    if (closeBtn) closeBtn.onclick = () => closeFurnaceModal(scene);

    const btnCopper = document.getElementById('smelt-copper');
    const btnBronze = document.getElementById('smelt-bronze');
    if (btnCopper) btnCopper.onclick = () => {
        const recipeId = 'copper_bar';
        if (scene.smeltingActive) {
            if (scene._smeltType === recipeId) stopContinuousSmelting(scene);
            else scene._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[scene._smeltType] ? (window.RECIPE_DEFS[scene._smeltType].name || scene._smeltType) : scene._smeltType));
        } else {
            const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
            const recipe = recipes[recipeId];
            const inv = scene.char.inventory || [];
            const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
            let ok = true;
            for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
            const lvlOk = !(scene.char.smithing && (scene.char.smithing.level || 1) < (recipe.reqLevel || 1));
            if (!ok || !lvlOk) { scene._showToast('Missing materials or smithing level too low'); }
            else startContinuousSmelting(scene, recipeId);
        }
        refreshFurnaceModal(scene);
    };
    if (btnBronze) btnBronze.onclick = () => {
        const recipeId = 'bronze_bar';
        if (scene.smeltingActive) {
            if (scene._smeltType === recipeId) stopContinuousSmelting(scene);
            else scene._showToast('Already smelting ' + (window && window.RECIPE_DEFS && window.RECIPE_DEFS[scene._smeltType] ? (window.RECIPE_DEFS[scene._smeltType].name || scene._smeltType) : scene._smeltType));
        } else {
            const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
            const recipe = recipes[recipeId];
            const inv = scene.char.inventory || [];
            const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
            let ok = true;
            for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
            const lvlOk = !(scene.char.smithing && (scene.char.smithing.level || 1) < (recipe.reqLevel || 1));
            if (!ok || !lvlOk) { scene._showToast('Missing materials or smithing level too low'); }
            else startContinuousSmelting(scene, recipeId);
        }
        refreshFurnaceModal(scene);
    };

    refreshFurnaceModal(scene);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function closeFurnaceModal(scene) {
    if (!scene) return;
    if (scene._furnaceModal && scene._furnaceModal.parentNode) scene._furnaceModal.parentNode.removeChild(scene._furnaceModal);
    scene._furnaceModal = null;
    if (scene._furnaceIndicator && !scene.smeltingActive) scene._furnaceIndicator.setVisible(false);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function refreshFurnaceModal(scene) {
    if (!scene || !scene._furnaceModal) return;
    const inv = scene.char.inventory || [];
    const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
    const copperQty = findQty('copper_ore');
    const tinQty = findQty('tin_ore');
    const btnCopper = document.getElementById('smelt-copper');
    const btnBronze = document.getElementById('smelt-bronze');
    const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
    const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const copperRecipe = recipes['copper_bar'];
    const bronzeRecipe = recipes['bronze_bar'];
    const buildLabel = (r) => {
        if (!r) return '';
        try { return 'Smelt ' + (r.name || r.id) + ' (' + (r.requires || []).map(req => ((items[req.id] && items[req.id].name) || req.id) + (req.qty && req.qty > 1 ? ' x' + req.qty : '')).join(' + ') + ')'; }
        catch (e) { return 'Smelt ' + (r.name || r.id); }
    };
    if (btnCopper) {
        if (scene.smeltingActive && scene._smeltType === 'copper_bar') { btnCopper.textContent = 'Stop Smelting ' + (copperRecipe && copperRecipe.name ? copperRecipe.name : 'Copper'); btnCopper.style.background = '#aa4422'; }
        else { btnCopper.textContent = buildLabel(copperRecipe) || 'Smelt Copper Bar'; btnCopper.style.background = '#6b4f3a'; }
        const inv2 = scene.char.inventory || [];
        const findQty2 = (id) => { const it = inv2.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        let okCopper = true;
        for (const req of (copperRecipe.requires || [])) { if (findQty2(req.id) < (req.qty || 1)) { okCopper = false; break; } }
        const lvlOkCopper = !(scene.char.smithing && (scene.char.smithing.level || 1) < (copperRecipe.reqLevel || 1));
        btnCopper.disabled = (scene.smeltingActive && scene._smeltType !== 'copper_bar') || !okCopper || !lvlOkCopper;
        btnCopper.style.opacity = btnCopper.disabled ? '0.6' : '1';
    }
    if (btnBronze) {
        if (scene.smeltingActive && scene._smeltType === 'bronze_bar') { btnBronze.textContent = 'Stop Smelting ' + (bronzeRecipe && bronzeRecipe.name ? bronzeRecipe.name : 'Bronze'); btnBronze.style.background = '#aa4422'; }
        else { btnBronze.textContent = buildLabel(bronzeRecipe) || 'Smelt Bronze'; btnBronze.style.background = '#7a5f3a'; }
        const inv3 = scene.char.inventory || [];
        const findQty3 = (id) => { const it = inv3.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
        let okBronze = true;
        for (const req of (bronzeRecipe.requires || [])) { if (findQty3(req.id) < (req.qty || 1)) { okBronze = false; break; } }
        const lvlOkBronze = !(scene.char.smithing && (scene.char.smithing.level || 1) < (bronzeRecipe.reqLevel || 1));
        btnBronze.disabled = (scene.smeltingActive && scene._smeltType !== 'bronze_bar') || !okBronze || !lvlOkBronze;
        btnBronze.style.opacity = btnBronze.disabled ? '0.6' : '1';
    }
}

export function startContinuousSmelting(scene, recipeId) {
    if (!scene) return;
    if (scene.smeltingActive) return;
    const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
    const recipe = recipes[recipeId];
    if (!recipe) { scene._showToast('Unknown recipe'); return; }
    if (scene.char.smithing && (scene.char.smithing.level || 1) < (recipe.reqLevel || 1)) { scene._showToast('Smithing level too low'); return; }
    const inv = scene.char.inventory || [];
    const findQty = (id) => { const it = inv.find(x => x && x.id === id); return it ? (it.qty || 0) : 0; };
    let ok = true;
    for (const req of (recipe.requires || [])) { if (findQty(req.id) < (req.qty || 1)) { ok = false; break; } }
    if (!ok) { scene._showToast('Missing materials'); return; }

    scene.smeltingActive = true;
    scene._smeltType = recipeId;
    scene._smeltingEvent = scene.time.addEvent({ delay: scene.smeltingInterval, callback: attemptSmelt, callbackScope: scene, args: [recipeId], loop: true });
    scene._showToast('Started smelting ' + (recipe.name || recipeId));
    if (scene._furnaceIndicator) scene._furnaceIndicator.setVisible(true);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
    refreshFurnaceModal(scene);
}

export function stopContinuousSmelting(scene) {
    if (!scene || !scene.smeltingActive) return;
    scene.smeltingActive = false;
    if (scene._smeltingEvent) { scene._smeltingEvent.remove(false); scene._smeltingEvent = null; }
    scene._showToast('Smelting stopped');
    scene._smeltType = null;
    if (scene._furnaceIndicator) scene._furnaceIndicator.setVisible(false);
    refreshFurnaceModal(scene);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function attemptSmelt(recipeId) {
    // callback executed with scene as 'this'
    const scene = this;
    if (!scene) return;
    const inv = scene.char.inventory = scene.char.inventory || [];
    const find = (id) => inv.find(x => x && x.id === id);
    const recipes = (window && window.RECIPE_DEFS) ? window.RECIPE_DEFS : {};
    const items = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const recipe = recipes[recipeId];
    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
    if (!recipe) { stopContinuousSmelting(scene); scene._showToast('Unknown recipe'); return; }
    for (const req of (recipe.requires || [])) {
        const have = (find(req.id) && find(req.id).qty) || 0;
        if (have < (req.qty || 1)) { stopContinuousSmelting(scene); scene._showToast('Out of materials for ' + (recipe.name || recipeId)); return; }
    }
    for (const req of (recipe.requires || [])) {
        const it = find(req.id);
        if (it) { it.qty -= (req.qty || 1); if (it.qty <= 0) inv.splice(inv.indexOf(it), 1); }
    }
    const prodId = recipe.id || recipeId;
    const prodDef = items && items[prodId];
    if (prodDef && prodDef.stackable) {
        let ex = find(prodId);
        if (ex) ex.qty = (ex.qty || 0) + 1; else inv.push({ id: prodId, name: prodDef.name || recipe.name, qty: 1 });
    } else {
        inv.push({ id: prodId, name: (prodDef && prodDef.name) || recipe.name, qty: 1 });
    }
    const newQty = (find(prodId) && find(prodId).qty) || 1;
    scene._showToast(`Smelted 1x ${(prodDef && prodDef.name) || recipe.name}! (${newQty} total)`);
    scene.char.smithing = scene.char.smithing || { level: 1, exp: 0, expToLevel: 100 };
    scene.char.smithing.exp = (scene.char.smithing.exp || 0) + (recipe.smithingXp || 0);
    if (scene.char.smithing) {
        while (scene.char.smithing.exp >= scene.char.smithing.expToLevel) {
            scene.char.smithing.exp -= scene.char.smithing.expToLevel;
            scene.char.smithing.level = (scene.char.smithing.level || 1) + 1;
            scene.char.smithing.expToLevel = Math.floor(scene.char.smithing.expToLevel * 1.25);
            scene._showToast('Smithing level up! L' + scene.char.smithing.level, 1800);
        }
    }
    // refresh stats modal if open so skill and stat displays update
    try { if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) { /* ignore */ }
    scene._persistCharacter && scene._persistCharacter(username);
    refreshFurnaceModal(scene);
    if (scene._inventoryModal) scene._refreshInventoryModal && scene._refreshInventoryModal();
}
