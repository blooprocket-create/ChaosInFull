import { effectiveStats, makeStatPill, formatSkillLine, checkClassLevelUps } from './stats.js';
// Shared UI utilities: Inventory, Equipment, and Stats modals.
// Each function accepts a Phaser.Scene instance as the first arg and operates on scene.char.

// inject light shared styles once
if (typeof document !== 'undefined' && !document.getElementById('shared-ui-styles')) {
    const s = document.createElement('style'); s.id = 'shared-ui-styles';
    s.innerHTML = `
        #inventory-modal, #equipment-modal, #stats-modal, #workbench-modal, #furnace-modal { box-shadow: 0 10px 30px rgba(0,0,0,0.6); font-family: Arial, Helvetica, sans-serif; }
        #inventory-modal button, #equipment-modal button, #stats-modal button, #workbench-modal button { transition: background 140ms ease, transform 120ms ease; }
        #inventory-modal button:hover, #equipment-modal button:hover, #stats-modal button:hover, #workbench-modal button:hover { transform: translateY(-2px); filter:brightness(1.05); }
    #stats-modal .pill { padding:6px 10px; border-radius:999px; background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02)); color:#fff; font-weight:700; display:inline-flex; align-items:center; gap:8px; }
    .pill .pill-value { color:#ffd27a; margin-left:6px; font-weight:800; }
    .item-icon { width:18px; height:18px; display:inline-block; vertical-align:middle; margin-right:6px; }
    `;
    document.head.appendChild(s);
}

export function openInventoryModal(scene) {
    if (!scene) return;
    if (scene._inventoryModal) return;
    const char = scene.char = scene.char || {};
    if (!Array.isArray(char.inventory)) char.inventory = [];
    const inv = char.inventory;
    const modal = document.createElement('div');
    modal.id = 'inventory-modal';
    modal.style.position = 'fixed';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%,-50%)';
    modal.style.zIndex = '230';
    modal.style.background = 'linear-gradient(135deg,#1a1a1f, #0f0f12)';
    modal.style.padding = '12px';
    modal.style.borderRadius = '12px';
    modal.style.color = '#fff';
    modal.style.minWidth = '360px';
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Inventory</strong><button id='inv-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='inv-items' style='display:flex;flex-direction:column;gap:6px;max-height:360px;overflow:auto;'></div>`;
    document.body.appendChild(modal);
    scene._inventoryModal = modal;
    const closeBtn = modal.querySelector('#inv-close');
    if (closeBtn) closeBtn.onclick = () => closeInventoryModal(scene);
    refreshInventoryModal(scene);
}

export function closeInventoryModal(scene) {
    if (!scene) return;
    if (scene._inventoryModal && scene._inventoryModal.parentNode) scene._inventoryModal.parentNode.removeChild(scene._inventoryModal);
    scene._inventoryModal = null;
}

export function refreshInventoryModal(scene) {
    if (!scene || !scene._inventoryModal) return;
    const container = document.getElementById('inv-items');
    if (!container) return;
    container.innerHTML = '';
    const inv = scene.char.inventory || [];
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    for (const it of inv) {
        if (!it) continue;
        const def = defs && defs[it.id];
    const name = it.name || (def && def.name) || it.id;
    // small inline icon based on item type
    let icon = '';
    if (def && def.weapon) icon = `<span class='item-icon'>⚔️</span>`;
    else if (def && def.armor) icon = `<span class='item-icon'>🛡️</span>`;
    else icon = `<span class='item-icon'>📦</span>`;
        const qty = it.qty || 1;
        const meta = [];
        if (def && def.weapon) meta.push('Weapon ' + (def.damage ? def.damage.join('-') : ''));
        if (def && def.stackable) meta.push('Stackable'); else meta.push('Unique');
        let bonusStr = '';
        let bonusTitle = '';
        if (def && def.statBonus) {
            const parts = [];
            for (const k of Object.keys(def.statBonus)) parts.push('+' + def.statBonus[k] + ' ' + k.toUpperCase());
            bonusStr = parts.map(p => `<span class='pill' title='${p}'>${p}</span>`).join(' ');
            bonusTitle = parts.join(', ');
        }
        const el = document.createElement('div');
        el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.alignItems = 'center'; el.style.padding = '8px'; el.style.background = 'rgba(255,255,255,0.02)'; el.style.borderRadius = '8px';
    el.innerHTML = `<div><strong title='${name}'>${icon}${name}</strong><div style='font-size:0.85em;color:#ccc;margin-top:4px;' title='${bonusTitle}'>${meta.join(' • ')} ${bonusStr ? ' ' + bonusStr : ''}</div></div><div style='text-align:right'>${qty}</div>`;
        // equip/unequip
        if (defs && defs[it.id] && (defs[it.id].weapon || defs[it.id].armor)) {
            const btn = document.createElement('button'); btn.style.marginLeft = '8px'; btn.style.padding = '6px 8px'; btn.style.border = 'none'; btn.style.borderRadius = '6px'; btn.style.cursor = 'pointer';
            const equippedSlots = Object.keys(scene.char.equipment || {}).filter(s => scene.char.equipment && scene.char.equipment[s] && scene.char.equipment[s].id === it.id);
            if (equippedSlots.length > 0) {
                btn.textContent = 'Unequip';
                btn.onclick = () => { unequipItem(scene, equippedSlots[0]); refreshInventoryModal(scene); refreshEquipmentModal(scene); };
            } else {
                btn.textContent = 'Equip';
                btn.onclick = () => { equipItemFromInventory(scene, it.id); refreshInventoryModal(scene); refreshEquipmentModal(scene); };
            }
            const right = el.querySelector('div[style*="text-align:right"]');
            if (right) right.appendChild(btn);
        }
        container.appendChild(el);
    }
}

// Equipment modal
export function openEquipmentModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    if (!char.equipment) char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null };
    if (scene._equipmentModal) return;
    const modal = document.createElement('div');
    modal.id = 'equipment-modal';
    modal.style.position = 'fixed';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%,-50%)';
    modal.style.zIndex = '235';
    modal.style.background = 'linear-gradient(135deg,#1a1a1f, #0f0f12)';
    modal.style.padding = '12px';
    modal.style.borderRadius = '12px';
    modal.style.color = '#fff';
    modal.style.minWidth = '360px';
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Equipment</strong><button id='equip-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='equip-list' style='display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto;'></div>`;
    document.body.appendChild(modal);
    scene._equipmentModal = modal;
    const closeBtn = modal.querySelector('#equip-close'); if (closeBtn) closeBtn.onclick = () => closeEquipmentModal(scene);
    refreshEquipmentModal(scene);
}

export function closeEquipmentModal(scene) {
    if (!scene) return;
    if (scene._equipmentModal && scene._equipmentModal.parentNode) scene._equipmentModal.parentNode.removeChild(scene._equipmentModal);
    scene._equipmentModal = null;
}

export function refreshEquipmentModal(scene) {
    if (!scene || !scene._equipmentModal) return;
    const container = scene._equipmentModal.querySelector('#equip-list');
    container.innerHTML = '';
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const equip = scene.char.equipment || {};
    const slots = ['weapon','head','armor','legs','boots','ring1','ring2','amulet'];
    for (const s of slots) {
        const eq = equip[s];
        const el = document.createElement('div'); el.style.display='flex'; el.style.justifyContent='space-between'; el.style.alignItems='center'; el.style.padding='6px'; el.style.background='rgba(255,255,255,0.02)'; el.style.borderRadius='8px';
        const left = document.createElement('div');
        const eqName = eq && defs[eq.id] ? defs[eq.id].name : (eq ? eq.name : 'Empty');
        let icon = '';
        if (eq && defs && defs[eq.id]) {
            const d = defs[eq.id]; if (d.weapon) icon = `<span class='item-icon'>⚔️</span>`; else if (d.armor) icon = `<span class='item-icon'>🛡️</span>`; else icon = `<span class='item-icon'>📦</span>`;
        }
        let eqBonus = '';
        let eqBonusTitle = '';
        if (eq && defs && defs[eq.id] && defs[eq.id].statBonus) {
            const parts = [];
            for (const k of Object.keys(defs[eq.id].statBonus)) parts.push('+' + defs[eq.id].statBonus[k] + ' ' + k.toUpperCase());
            eqBonus = parts.map(p => `<span class='pill' title='${p}'>${p}</span>`).join(' ');
            eqBonusTitle = parts.join(', ');
        }
    left.innerHTML = `<strong>${s.toUpperCase()}</strong><div style='font-size:0.85em;color:#ccc;' title='${eqBonusTitle}'>${icon}${eqName}${eqBonus ? ' ' + eqBonus : ''}</div>`;
        const right = document.createElement('div');
        if (eq) {
            const btn = document.createElement('button'); btn.textContent = 'Unequip'; btn.style.padding='6px 8px'; btn.style.border='none'; btn.style.borderRadius='6px'; btn.style.cursor='pointer';
            btn.onclick = () => { unequipItem(scene, s); refreshEquipmentModal(scene); refreshInventoryModal(scene); };
            right.appendChild(btn);
        }
        el.appendChild(left); el.appendChild(right); container.appendChild(el);
    }
}

// Stats modal
export function openStatsModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    if (!char.stats) char.stats = { str:0,int:0,agi:0,luk:0 };
    if (!char.mining) char.mining = { level:1, exp:0, expToLevel:100 };
    if (!char.smithing) char.smithing = { level:1, exp:0, expToLevel:100 };
    if (scene._statsModal) return;
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%,-50%)'; modal.style.zIndex = '240';
    modal.style.background = 'linear-gradient(135deg,#111, #050507)'; modal.style.color = '#fff'; modal.style.padding = '14px'; modal.style.borderRadius = '12px'; modal.style.minWidth = '320px';
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Stats & Skills</strong><button id='stats-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='stats-list' style='display:flex;flex-wrap:wrap;gap:8px;'></div><div id='skills-list' style='margin-top:10px;display:flex;flex-direction:column;gap:6px;'></div>`;
    document.body.appendChild(modal);
    scene._statsModal = modal;
    modal.querySelector('#stats-close').onclick = () => closeStatsModal(scene);
    refreshStatsModal(scene);
}

export function closeStatsModal(scene) {
    if (!scene) return;
    if (scene._statsModal && scene._statsModal.parentNode) scene._statsModal.parentNode.removeChild(scene._statsModal);
    scene._statsModal = null;
}

export function refreshStatsModal(scene) {
    if (!scene || !scene._statsModal) return;
    const container = scene._statsModal.querySelector('#stats-list');
    const skills = scene._statsModal.querySelector('#skills-list');
    container.innerHTML = ''; skills.innerHTML = '';
    const char = scene.char || {};
    const eff = effectiveStats(char);
    container.innerHTML += makeStatPill('STR', eff.str);
    container.innerHTML += makeStatPill('INT', eff.int);
    container.innerHTML += makeStatPill('AGI', eff.agi);
    container.innerHTML += makeStatPill('LUK', eff.luk);
    container.innerHTML += makeStatPill('DEF', eff.defense);
    const mining = char.mining || { level:1, exp:0, expToLevel:100 };
    const smithing = char.smithing || { level:1, exp:0, expToLevel:100 };
    skills.innerHTML += `<div style='font-size:0.95em;color:#ddd;'>${formatSkillLine('Mining', mining)}</div>`;
    skills.innerHTML += `<div style='font-size:0.95em;color:#ddd;'>${formatSkillLine('Smithing', smithing)}</div>`;
}

// Equip/unequip helpers used internally by shared UI
export function equipItemFromInventory(scene, itemId) {
    const inv = scene.char.inventory = scene.char.inventory || [];
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const def = defs[itemId]; if (!def) { scene._showToast && scene._showToast('Unknown item'); return; }
    let slot = null; if (def.weapon) slot = 'weapon'; else if (def.armor) slot = 'armor'; else { scene._showToast && scene._showToast('Cannot equip this item'); return; }
    const idx = inv.findIndex(x => x && x.id === itemId);
    if (idx === -1) { scene._showToast && scene._showToast('Item not in inventory'); return; }
    const it = inv[idx]; if (it.qty && it.qty > 1) { it.qty -= 1; } else { inv.splice(idx,1); }
    if (!scene.char.equipment) scene.char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null };
    const prev = scene.char.equipment[slot]; if (prev) { scene.char.inventory.push({ id: prev.id, name: prev.name, qty:1 }); removeEquipmentBonuses(scene, prev); }
    scene.char.equipment[slot] = { id: itemId, name: def.name || itemId };
    applyEquipmentBonuses(scene, scene.char.equipment[slot]);
    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function unequipItem(scene, slot) {
    if (!scene.char.equipment) return; const eq = scene.char.equipment[slot]; if (!eq) return; removeEquipmentBonuses(scene, eq); scene.char.inventory = scene.char.inventory || []; scene.char.inventory.push({ id: eq.id, name: eq.name, qty:1 }); scene.char.equipment[slot] = null; const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function applyEquipmentBonuses(scene, eq) {
    if (!eq || !eq.id) return; const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {}; const def = defs[eq.id]; if (!def) return; if (!scene.char._equipBonuses) scene.char._equipBonuses = { str:0,int:0,agi:0,luk:0,defense:0 }; if (def.statBonus) { for (const k of Object.keys(def.statBonus)) scene.char._equipBonuses[k] = (scene.char._equipBonuses[k]||0) + def.statBonus[k]; } if (def.defense) scene.char._equipBonuses.defense = (scene.char._equipBonuses.defense||0) + def.defense;
    // refresh stats modal and HUD if open
        // refresh stats modal and HUD if open (prefer in-place update)
        try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
    try { if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) {}
}

export function removeEquipmentBonuses(scene, eq) {
    if (!eq || !eq.id) return; const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {}; const def = defs[eq.id]; if (!def) return; if (!scene.char._equipBonuses) scene.char._equipBonuses = { str:0,int:0,agi:0,luk:0,defense:0 }; if (def.statBonus) { for (const k of Object.keys(def.statBonus)) scene.char._equipBonuses[k] = (scene.char._equipBonuses[k]||0) - def.statBonus[k]; } if (def.defense) scene.char._equipBonuses.defense = (scene.char._equipBonuses.defense||0) - def.defense;
    // refresh stats modal and HUD if open
        // refresh stats modal and HUD if open (prefer in-place update)
        try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
    try { if (scene._statsModal && window && window.__shared_ui && window.__shared_ui.refreshStatsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) {}
}

// Recompute equipment bonuses from the equipped items and set scene.char._equipBonuses
export function reconcileEquipmentBonuses(scene) {
    if (!scene || !scene.char) return;
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const equip = scene.char.equipment || {};
    scene.char._equipBonuses = { str:0,int:0,agi:0,luk:0,defense:0 };
    for (const slot of Object.keys(equip || {})) {
        const eq = equip[slot];
        if (!eq || !eq.id) continue;
        const def = defs[eq.id];
        if (!def) continue;
        if (def.statBonus) {
            for (const k of Object.keys(def.statBonus)) scene.char._equipBonuses[k] = (scene.char._equipBonuses[k]||0) + def.statBonus[k];
        }
        if (def.defense) scene.char._equipBonuses.defense = (scene.char._equipBonuses.defense||0) + def.defense;
    }
}

// expose stats helpers to the shared UI export so callers can compute effective stats
export const stats = { effectiveStats, makeStatPill, formatSkillLine, checkClassLevelUps };
