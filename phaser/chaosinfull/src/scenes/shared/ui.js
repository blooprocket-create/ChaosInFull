import { effectiveStats, makeStatPill, formatSkillLine, checkClassLevelUps } from './stats.js';
// Shared UI utilities: Inventory, Equipment, and Stats modals.
// Each function accepts a Phaser.Scene instance as the first arg and operates on scene.char.

// inject light shared styles once
if (typeof document !== 'undefined' && !document.getElementById('shared-ui-styles')) {
    const s = document.createElement('style'); s.id = 'shared-ui-styles';
    s.innerHTML = `
        #inventory-modal, #equipment-modal, #stats-modal, #workbench-modal, #furnace-modal, #storage-modal { box-shadow: 0 10px 30px rgba(0,0,0,0.6); font-family: Arial, Helvetica, sans-serif; }
        #inventory-modal button, #equipment-modal button, #stats-modal button, #workbench-modal button { transition: background 140ms ease, transform 120ms ease; }
        #inventory-modal button:hover, #equipment-modal button:hover, #stats-modal button:hover, #workbench-modal button:hover { transform: translateY(-2px); filter:brightness(1.05); }
    #stats-modal .pill { padding:6px 10px; border-radius:999px; background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02)); color:#fff; font-weight:700; display:inline-flex; align-items:center; gap:8px; }
    .pill .pill-value { color:#ffd27a; margin-left:6px; font-weight:800; }
    .item-icon { width:18px; height:18px; display:inline-block; vertical-align:middle; margin-right:6px; }

    /* Inventory / storage grid styles */
    .grid-scroll { max-height:360px; overflow-y:auto; overflow-x:hidden; padding:8px; }
    .slot-grid { display:grid; grid-template-columns: repeat(5, 64px); gap:8px; }
    .slot { width:64px; height:64px; border-radius:8px; background: rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; position:relative; cursor:pointer; transition:transform 120ms ease, box-shadow 160ms ease; }
    .slot:hover { transform: translateY(-4px); box-shadow: 0 6px 18px rgba(0,0,0,0.5); }
    .slot .qty { position:absolute; right:6px; bottom:6px; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:999px; font-size:12px; }
    .slot .slot-label { position:absolute; left:6px; top:6px; font-size:10px; color: rgba(255,255,255,0.85); pointer-events:none; max-width:52px; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; }

    /* Custom vertical scrollbar: hidden until hover, thumb color controlled via --scroll-thumb-color */
    .grid-scroll { --scroll-thumb-color: rgba(255,255,255,0.12); }
    .grid-scroll::-webkit-scrollbar { width:10px; }
    .grid-scroll::-webkit-scrollbar-track { background: transparent; }
    .grid-scroll::-webkit-scrollbar-thumb { background: var(--scroll-thumb-color); border-radius:999px; transition: background-color 220ms ease, opacity 180ms ease; opacity:0; }
    .grid-scroll:hover::-webkit-scrollbar-thumb { opacity:1; }
    .grid-scroll { scrollbar-width: thin; scrollbar-color: var(--scroll-thumb-color) transparent; }
    .grid-scroll:not(:hover) { /* Firefox fallback: make track invisible until hover */ }
    /* Item tooltip: glassy panel with rarity accent. Title etched, body marker-like */
    #shared-item-tooltip { position:fixed; pointer-events:none; z-index:9999; min-width:160px; max-width:320px; padding:10px 12px; border-radius:10px; color:#fff; opacity:0; transform:translateY(6px) scale(0.98); transition:opacity 180ms ease, transform 220ms cubic-bezier(.2,.9,.3,1); backdrop-filter: blur(6px) saturate(120%); -webkit-backdrop-filter: blur(6px) saturate(120%); box-shadow: 0 10px 30px rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.06);
    }
    #shared-item-tooltip.show { opacity:1; transform:translateY(0) scale(1); }
    #shared-item-tooltip .tt-title { font-weight:800; font-size:14px; margin-bottom:6px; /* etched effect */ color: rgba(255,255,255,0.92); text-shadow: 0 -1px 0 rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03); }
    #shared-item-tooltip .tt-desc { font-size:12px; color: rgba(240,240,240,0.9); margin-bottom:6px; font-family: 'Segoe UI', Roboto, 'Comic Sans MS', cursive; }
    #shared-item-tooltip .tt-stats { font-size:12px; color: #ffd27a; font-family: 'Segoe UI', Roboto, 'Comic Sans MS', cursive; display:flex; flex-direction:column; gap:4px; }
    #shared-item-tooltip.tt-rare { border-color: rgba(100,170,255,0.18); background: linear-gradient(180deg, rgba(100,170,255,0.06), rgba(255,255,255,0.02)); }
    #shared-item-tooltip.tt-epic { border-color: rgba(200,100,255,0.2); background: linear-gradient(180deg, rgba(200,100,255,0.06), rgba(255,255,255,0.02)); }
        #shared-item-tooltip.tt-legendary { border-color: rgba(255,200,80,0.22); background: linear-gradient(180deg, rgba(255,200,80,0.06), rgba(255,255,255,0.02)); }
        #shared-item-tooltip.tt-common { border-color: rgba(255,255,255,0.06); background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); }
        #shared-item-tooltip.tt-uncommon { border-color: rgba(100,255,100,0.18); background: linear-gradient(180deg, rgba(100,255,100,0.06), rgba(255,255,255,0.02)); }
        /* Modal scaffold */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:210; opacity:0; pointer-events:none; transition:opacity 160ms ease; }
        .modal-overlay.show { opacity:1; pointer-events:auto; }
        .modal-card { background: linear-gradient(135deg, rgba(43,47,31,0.96), rgba(12,14,8,0.94)); color:#f1f1f1; border-radius:16px; padding:18px; min-width:720px; max-width:min(920px, 90vw); max-height:85vh; display:flex; flex-direction:column; gap:14px; border:1px solid rgba(255,255,255,0.06); box-shadow:0 18px 48px rgba(0,0,0,0.7); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .modal-card h3, .modal-card h4 { margin:0; }
        .modal-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .modal-title { font-size:20px; font-weight:800; letter-spacing:0.02em; }
        .modal-subtitle { margin:0; font-size:13px; color:rgba(255,255,255,0.72); }
        .modal-body { display:flex; gap:12px; overflow:hidden; }
        .modal-column { display:flex; flex-direction:column; }
        .modal-close { margin-left:auto; }

        .btn { appearance:none; border:none; border-radius:10px; padding:8px 14px; font-weight:600; cursor:pointer; transition:background 150ms ease, transform 120ms ease, box-shadow 160ms ease; text-align:center; }
        .btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        .btn:disabled { cursor:not-allowed; opacity:0.55; transform:none; box-shadow:none; }
        .btn-primary { background:#6b8f4a; color:#fff; }
        .btn-primary:hover:not(:disabled) { background:#7da757; }
        .btn-secondary { background:rgba(255,255,255,0.08); color:#f1f1f1; }
        .btn-secondary:hover:not(:disabled) { background:rgba(255,255,255,0.12); }
        .btn-ghost { background:transparent; color:#d5d5d5; border:1px solid rgba(255,255,255,0.14); }
        .btn-ghost:hover:not(:disabled) { background:rgba(255,255,255,0.08); }

        .input-small { background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 8px; color:#f1f1f1; width:80px; font-size:14px; font-weight:600; }
        .input-small:focus { outline:none; border-color:rgba(255,210,122,0.5); box-shadow:0 0 0 2px rgba(255,210,122,0.12); }

        /* Workbench specific */
        #workbench-modal { font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .workbench-body { display:grid; grid-template-columns:160px minmax(0,1fr) 320px; gap:16px; height:100%; max-height:520px; align-items:stretch; }
        .workbench-categories { display:flex; flex-direction:column; gap:10px; overflow-y:auto; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.05); border-radius:14px; padding:12px; }
        .wb-cat-btn { border:none; border-radius:12px; padding:10px 12px; background:rgba(255,255,255,0.05); color:#dcdcdc; font-weight:600; text-align:left; cursor:pointer; transition:background 150ms ease, transform 120ms ease; }
        .wb-cat-btn:hover { background:rgba(255,255,255,0.12); transform:translateX(2px); }
        .wb-cat-btn.is-active { background:#6b8f4a; color:#fff; box-shadow:0 8px 22px rgba(107,143,74,0.26); }

        .workbench-recipes { display:flex; flex-direction:column; gap:10px; overflow-y:auto; background:rgba(0,0,0,0.18); border:1px solid rgba(255,255,255,0.05); border-radius:14px; padding:12px; }
        .wb-recipe-btn { border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:10px 12px; background:rgba(255,255,255,0.04); color:#f7f7f7; display:flex; flex-direction:column; align-items:flex-start; gap:4px; cursor:pointer; transition:border-color 140ms ease, background 140ms ease, transform 120ms ease; }
        .wb-recipe-btn:hover:not(:disabled) { border-color:rgba(255,210,122,0.35); background:rgba(255,210,122,0.12); transform:translateY(-1px); }
        .wb-recipe-btn.is-active { border-color:rgba(255,210,122,0.6); background:rgba(255,210,122,0.16); box-shadow:0 10px 26px rgba(255,210,122,0.18); }
        .wb-recipe-btn.is-crafting { border-color:rgba(255,239,191,0.85); background:rgba(255,239,191,0.22); }
        .wb-recipe-btn .wb-recipe-name { font-weight:700; font-size:15px; }
        .wb-recipe-btn .wb-recipe-meta { font-size:12px; color:rgba(255,255,255,0.65); display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .wb-recipe-btn .wb-recipe-meta span { display:inline-flex; align-items:center; gap:4px; }
        .wb-recipe-btn:disabled { cursor:not-allowed; opacity:0.55; transform:none; }
        .wb-recipe-status { font-size:11px; letter-spacing:0.06em; padding:2px 8px; border-radius:999px; text-transform:uppercase; background:rgba(255,255,255,0.1); color:#fff; }
        .wb-recipe-status.ready { background:rgba(107,143,74,0.25); color:#d4f2c3; }
        .wb-recipe-status.missing { background:rgba(204,108,92,0.28); color:#ffc2b9; }
        .wb-recipe-status.locked { background:rgba(150,150,150,0.22); color:rgba(255,255,255,0.62); }

        .workbench-recipes::-webkit-scrollbar,
        .workbench-categories::-webkit-scrollbar,
        .workbench-details::-webkit-scrollbar { width:10px; }
        .workbench-recipes::-webkit-scrollbar-thumb,
        .workbench-categories::-webkit-scrollbar-thumb,
        .workbench-details::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.14); border-radius:999px; }

        .workbench-details { gap:12px; background:rgba(0,0,0,0.28); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:14px; overflow-y:auto; }
        .workbench-recipe-header { display:flex; flex-direction:column; gap:4px; }
        .workbench-recipe-header .workbench-recipe-title { font-size:18px; font-weight:800; color:#fff; }
        .workbench-recipe-header .workbench-recipe-sub { font-size:13px; color:rgba(255,255,255,0.72); display:flex; gap:10px; flex-wrap:wrap; }
        .workbench-section-heading { font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.58); }
        .workbench-reqs { display:flex; flex-direction:column; gap:8px; }
        .wb-req { border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px 12px; background:rgba(255,255,255,0.04); display:flex; justify-content:space-between; align-items:center; cursor:default; transition:border-color 140ms ease, background 140ms ease, transform 120ms ease; text-align:left; }
        .wb-req:hover { transform:translateY(-1px); }
        .wb-req:disabled { cursor:not-allowed; opacity:0.55; transform:none; }
        .wb-req.is-ready { border-color:rgba(107,143,74,0.55); background:rgba(107,143,74,0.18); }
        .wb-req.is-missing { border-color:rgba(204,108,92,0.6); background:rgba(204,108,92,0.16); }
        .wb-req .wb-req-name { font-weight:700; color:#fff; font-size:14px; }
        .wb-req .wb-req-counts { font-size:12px; color:rgba(255,255,255,0.68); display:flex; gap:8px; align-items:center; }
        .wb-req .wb-req-reserved { color:#ffd27a; font-weight:700; }
        .wb-req .wb-req-have { color:rgba(255,255,255,0.62); }

        .workbench-alert { background:rgba(204,108,92,0.16); border:1px solid rgba(204,108,92,0.45); color:#ffc2b9; padding:10px 12px; border-radius:12px; font-size:13px; line-height:1.4; }
        .workbench-ready { background:rgba(107,143,74,0.16); border:1px solid rgba(107,143,74,0.42); color:#d4f2c3; padding:10px 12px; border-radius:12px; font-size:13px; }

        .workbench-actions { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; }
        .workbench-actions .workbench-actions-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .workbench-actions .workbench-actions-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .workbench-progress { display:flex; align-items:center; justify-content:center; min-height:80px; }
        .workbench-progress canvas { width:72px; height:72px; }

        .workbench-message { min-height:20px; font-size:13px; font-weight:600; color:#ffcc99; }
        .workbench-message.success { color:#b6f7b6; }
        .workbench-message.warn { color:#ffd27a; }
        .workbench-message.error { color:#ff9b9b; }
    `;
    document.head.appendChild(s);
}

// Tooltip helpers (create on-demand)
function ensureTooltip() {
    if (typeof document === 'undefined') return null;
    let t = document.getElementById('shared-item-tooltip');
    if (t) return t;
    t = document.createElement('div'); t.id = 'shared-item-tooltip';
    t.innerHTML = `<div class='tt-title'></div><div class='tt-desc'></div><div class='tt-stats'></div>`;
    document.body.appendChild(t);
    return t;
}

function buildStatLines(def) {
    const lines = [];
    if (!def) return lines;
    if (def.statBonus) {
        for (const k of Object.keys(def.statBonus)) lines.push(`+${def.statBonus[k]} ${k.toUpperCase()}`);
    }
    if (def.defense) lines.push(`+${def.defense} DEF`);
    if (def.weaponDamage) lines.push(`DMG: ${def.weaponDamage}`);
    return lines;
}

export function showItemTooltip(scene, itemOrId, anchorEl) {
    if (typeof document === 'undefined') return;
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    let def = null; let name = ''; let desc = '';
    if (!itemOrId) return;
    if (typeof itemOrId === 'string') { def = defs[itemOrId] || null; name = (def && def.name) || itemOrId; }
    else if (itemOrId && itemOrId.id) { def = defs[itemOrId.id] || null; name = itemOrId.name || (def && def.name) || itemOrId.id; }
    else { def = defs[itemOrId] || null; name = (def && def.name) || itemOrId; }
    desc = (def && def.desc) || (def && def.description) || '';
    const t = ensureTooltip(); if (!t) return;
    // set rarity class
    const rarity = (def && def.rarity) || 'common'; t.className = '';
    t.classList.add(`tt-${rarity}`);
    // fill content
    const titleEl = t.querySelector('.tt-title'); const descEl = t.querySelector('.tt-desc'); const statsEl = t.querySelector('.tt-stats');
    if (titleEl) titleEl.textContent = name;
    if (descEl) descEl.textContent = desc || '';
    // stats
    statsEl.innerHTML = '';
    const statLines = buildStatLines(def);
    for (const ln of statLines) {
        const div = document.createElement('div'); div.textContent = ln; statsEl.appendChild(div);
    }
    // position relative to anchorEl if provided
    let x = 24, y = 24;
    if (anchorEl && anchorEl.getBoundingClientRect) {
        const r = anchorEl.getBoundingClientRect();
        // prefer above the slot
        x = Math.max(8, r.left + (r.width / 2) - 120);
        y = r.top - 12 - t.offsetHeight;
        // if not enough space above, place below
        if (y < 8) y = r.bottom + 12;
    }
    t.style.left = Math.min(window.innerWidth - 16 - 320, Math.max(8, x)) + 'px';
    t.style.top = Math.max(8, y) + 'px';
    // show
    requestAnimationFrame(() => { t.classList.add('show'); });
    // also tint the nearest grid scrollbar if scene modal present
    try { const modal = (scene && scene._inventoryModal) ? scene._inventoryModal : (scene && scene._storageModal) ? scene._storageModal : null; if (modal) { const scroll = modal.querySelector('.grid-scroll'); if (scroll) { const c = RARITY_COLORS[rarity] || RARITY_COLORS.common; scroll.style.setProperty('--scroll-thumb-color', c); } } } catch (e) {}
}

export function hideItemTooltip() {
    if (typeof document === 'undefined') return;
    const t = document.getElementById('shared-item-tooltip'); if (!t) return; t.classList.remove('show');
}

// expose tooltip and core helpers to the global shared object if present
try {
    if (typeof window !== 'undefined') {
        window.__shared_ui = window.__shared_ui || {};
        // tooltip helpers
        window.__shared_ui.showItemTooltip = showItemTooltip;
        window.__shared_ui.hideItemTooltip = hideItemTooltip;
        // low-level slot/inventory helpers
        window.__shared_ui.initSlots = initSlots;
        window.__shared_ui.getQtyInSlots = getQtyInSlots;
        window.__shared_ui.addItemToSlots = addItemToSlots;
        window.__shared_ui.removeItemFromSlots = removeItemFromSlots;
        // inventory convenience helpers
        window.__shared_ui.addItemToInventory = addItemToInventory;
        window.__shared_ui.removeItemFromInventory = removeItemFromInventory;
        // modal helpers
        window.__shared_ui.openInventoryModal = openInventoryModal;
        window.__shared_ui.closeInventoryModal = closeInventoryModal;
        window.__shared_ui.refreshInventoryModal = refreshInventoryModal;
        window.__shared_ui.refreshStatsModal = refreshStatsModal;
        // equipment helpers
        window.__shared_ui.applyEquipmentBonuses = applyEquipmentBonuses;
        window.__shared_ui.removeEquipmentBonuses = removeEquipmentBonuses;
        window.__shared_ui.equipItemFromInventory = equipItemFromInventory;
        window.__shared_ui.unequipItem = unequipItem;
        window.__shared_ui.reconcileEquipmentBonuses = reconcileEquipmentBonuses;
    }
} catch (e) {}

// Inventory slot constants
const SLOT_COLS = 5;
const SLOT_COUNT = 50;

// Rarity -> color map (used for scrollbar tint on hover)
const RARITY_COLORS = {
    common: 'rgba(255,255,255,0.12)',
    rare: 'rgba(100,170,255,0.9)',
    epic: 'rgba(200,100,255,0.95)',
    legendary: 'rgba(255,200,80,0.95)'
};

function initSlots(arr) {
    let slots = Array.isArray(arr) ? arr.slice(0,SLOT_COUNT) : [];
    while (slots.length < SLOT_COUNT) slots.push(null);
    return slots;
}

function getDef(id) { return (window && window.ITEM_DEFS) ? window.ITEM_DEFS[id] : null; }

function getQtyInSlots(slots, id) {
    let n = 0; for (const s of slots) if (s && s.id === id) n += (s.qty || 1); return n;
}

function addItemToSlots(slots, itemId, qty) {
    qty = Math.max(1, Number(qty) || 1);
    const def = getDef(itemId) || {};
    // stackable flow: fill existing stacks first
    if (def.stackable) {
        const maxStack = def.maxStack || 999999;
        for (const s of slots) {
            if (!s) continue;
            if (s.id === itemId) {
                const can = maxStack - (s.qty || 0);
                const take = Math.min(can, qty);
                if (take > 0) { s.qty = (s.qty || 0) + take; qty -= take; if (qty <= 0) return true; }
            }
        }
        // place in empty slots
        for (let i = 0; i < slots.length && qty > 0; i++) {
            if (!slots[i]) {
                const put = Math.min(qty, def.maxStack || qty);
                slots[i] = { id: itemId, name: (def && def.name) || itemId, qty: put };
                qty -= put;
            }
        }
        return qty <= 0;
    }
    // non-stackable: one entry per slot
    for (let i = 0; i < slots.length && qty > 0; i++) {
        if (!slots[i]) {
            slots[i] = { id: itemId, name: (def && def.name) || itemId, qty: 1 };
            qty--; 
        }
    }
    return qty <= 0;
}

function removeItemFromSlots(slots, itemId, qty) {
    qty = Math.max(1, Number(qty) || 1);
    // iterate and remove from stacks / entries
    for (let i = 0; i < slots.length && qty > 0; i++) {
        const s = slots[i]; if (!s) continue;
        if (s.id !== itemId) continue;
        if (s.qty && s.qty > qty) { s.qty -= qty; qty = 0; break; }
        // consume whole slot
        qty -= (s.qty || 1);
        slots[i] = null;
    }
    return qty <= 0;
}

function findFirstSlotIndex(slots, itemId) {
    for (let i = 0; i < slots.length; i++) if (slots[i] && slots[i].id === itemId) return i; return -1;
}

// export low-level helpers for legacy scenes that reference them
export { initSlots, addItemToSlots, removeItemFromSlots, getQtyInSlots };


export function openInventoryModal(scene) {
    if (!scene) return;
    if (scene._inventoryModal) return;
    const char = scene.char = scene.char || {};
    // ensure inventory is a slot array
    char.inventory = initSlots(char.inventory);
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
    modal.style.minWidth = '420px';
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Inventory</strong><button id='inv-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='inv-items' class='grid-scroll'><div id='inv-grid' class='slot-grid'></div></div>`;
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
    const grid = scene._inventoryModal.querySelector('#inv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const inv = scene.char.inventory = initSlots(scene.char.inventory);
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    // render each slot
    for (let i = 0; i < inv.length; i++) {
        const s = inv[i];
        const slotEl = document.createElement('div'); slotEl.className = 'slot'; slotEl.dataset.slotIndex = i;
        if (s) {
            const def = defs && defs[s.id];
            const icon = def && def.weapon ? '⚔️' : (def && def.armor ? '🛡️' : '📦');
            const name = s.name || (def && def.name) || s.id;
            slotEl.innerHTML = `<div title='${name}'>${icon}</div><div class='slot-label'>${name}</div>`;
            if (s.qty && s.qty > 1) {
                const q = document.createElement('div'); q.className = 'qty'; q.textContent = s.qty; slotEl.appendChild(q);
            }
            // hover: change scrollbar tint to rarity color
            slotEl.addEventListener('mouseenter', () => {
                const rarity = (def && def.rarity) || 'common';
                const c = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                const scroll = scene._inventoryModal.querySelector('.grid-scroll'); if (scroll) { scroll.style.setProperty('--scroll-thumb-color', c); }
                // show tooltip (if helper available)
                try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(scene, s, slotEl); } catch (e) {}
            });
            slotEl.addEventListener('mouseleave', () => {
                const scroll = scene._inventoryModal.querySelector('.grid-scroll'); if (scroll) { scroll.style.setProperty('--scroll-thumb-color', RARITY_COLORS.common); }
                try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {}
            });
            // double-click to equip if equippable
            slotEl.ondblclick = () => {
                if (defs && def && (def.weapon || def.armor)) { equipItemFromInventory(scene, s.id); refreshInventoryModal(scene); refreshEquipmentModal(scene); }
            };
            // single-click: keep existing behavior for inventory modal (no deposit here)
        }
        grid.appendChild(slotEl);
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
    if (!scene || !scene.char) return;
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const def = defs[itemId]; if (!def) { scene._showToast && scene._showToast('Unknown item'); return; }
    // Determine equipment slot. Prefer explicit `def.slot` when provided.
    let slot = null;
    if (def.slot) {
        slot = def.slot;
    } else if (def.weapon) {
        slot = 'weapon';
    } else if (def.armor) {
        // try to guess the correct armor sub-slot by id/name keywords
        const id = (def.id || '').toLowerCase();
        const name = (def.name || '').toLowerCase();
        if (id.includes('helmet') || name.includes('helmet') || id.includes('head')) slot = 'head';
        else if (id.includes('legs') || name.includes('leggings') || id.includes('leggings') || id.includes('leg')) slot = 'legs';
        else if (id.includes('boot') || name.includes('boots')) slot = 'boots';
        else if (id.includes('ring') || name.includes('ring')) slot = 'ring1';
        else if (id.includes('amulet') || name.includes('amulet')) slot = 'amulet';
        else slot = 'armor';
    } else { scene._showToast && scene._showToast('Cannot equip this item'); return; }
    // ensure slot array and remove one item
    scene.char.inventory = initSlots(scene.char.inventory);
    const removed = removeItemFromSlots(scene.char.inventory, itemId, 1);
    if (!removed) { scene._showToast && scene._showToast('Item not in inventory'); return; }
    if (!scene.char.equipment) scene.char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null };
    // handle ring auto-slotting: if item slot is 'ring', prefer ring1 then ring2
    if (slot === 'ring') {
        if (!scene.char.equipment.ring1) slot = 'ring1'; else if (!scene.char.equipment.ring2) slot = 'ring2'; else slot = 'ring1';
    }
    const prev = scene.char.equipment[slot]; if (prev) { addItemToSlots(scene.char.inventory, prev.id, 1); removeEquipmentBonuses(scene, prev); }
    scene.char.equipment[slot] = { id: itemId, name: def.name || itemId };
    applyEquipmentBonuses(scene, scene.char.equipment[slot]);
    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function unequipItem(scene, slot) {
    if (!scene || !scene.char || !scene.char.equipment) return; const eq = scene.char.equipment[slot]; if (!eq) return; removeEquipmentBonuses(scene, eq); scene.char.inventory = initSlots(scene.char.inventory); addItemToSlots(scene.char.inventory, eq.id, 1); scene.char.equipment[slot] = null; const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username);
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

// Expose helpers to operate on slot-based inventory from other scenes
export function addItemToInventory(scene, itemId, qty=1) { if (!scene || !scene.char) return false; scene.char.inventory = initSlots(scene.char.inventory); return addItemToSlots(scene.char.inventory, itemId, qty); }
export function removeItemFromInventory(scene, itemId, qty=1) { if (!scene || !scene.char) return false; scene.char.inventory = initSlots(scene.char.inventory); return removeItemFromSlots(scene.char.inventory, itemId, qty); }

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


