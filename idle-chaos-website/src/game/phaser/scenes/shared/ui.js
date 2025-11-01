import { effectiveStats, makeStatPill, formatSkillLine, checkClassLevelUps } from './stats.js';
import { getTabsForClass, TALENT_TAB_ORDER, getTalentTab, ensureCharTalents, processTalentAllocation, getTalentDefById } from '../../data/talents.js';
// Shared UI utilities: Inventory, Equipment, and Stats modals.
// Each function accepts a Phaser.Scene instance as the first arg and operates on scene.char.

// inject light shared styles once
if (typeof document !== 'undefined' && !document.getElementById('shared-ui-styles')) {
    const s = document.createElement('style'); s.id = 'shared-ui-styles';
    s.innerHTML = `
        /* Prevent horizontal scrollbars globally (and ensure modals don't cause page scroll) */
        html, body { overflow-x: hidden !important; }
        /* Also explicitly prevent horizontal scrolling inside overlay/modal elements */
        .modal-overlay, .modal-card { overflow-x: hidden; }

        #inventory-modal, #equipment-modal, #stats-modal, #workbench-modal, #furnace-modal, #storage-modal { box-shadow: 0 10px 30px rgba(0,0,0,0.6); font-family: Arial, Helvetica, sans-serif; }
        #inventory-modal button, #equipment-modal button, #stats-modal button, #workbench-modal button { transition: background 140ms ease, transform 120ms ease; }
        #inventory-modal button:hover, #equipment-modal button:hover, #stats-modal button:hover, #workbench-modal button:hover { transform: translateY(-2px); filter:brightness(1.05); }
    #stats-modal .pill { padding:6px 10px; border-radius:999px; background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02)); color:#fff; font-weight:700; display:inline-flex; align-items:center; gap:8px; }
    .pill .pill-value { color:#ffd27a; margin-left:6px; font-weight:800; }
     /* Make item icons fill their slot container. Use object-fit to preserve aspect ratio.
         We keep them block-level so they size to their parent and add a subtle rounding. */
    .icon-wrap { width:48px; height:48px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:8px; }
    .item-icon { max-width:100%; max-height:100%; width:auto; height:auto; display:block; object-fit:contain; border-radius:8px; vertical-align:middle; }

    /* Inventory / storage grid styles */
    .grid-scroll { max-height:360px; overflow-y:auto; overflow-x:hidden; padding:8px; }
    .slot-grid { display:grid; grid-template-columns: repeat(5, 64px); gap:8px; }
    .slot { width:64px; height:64px; border-radius:8px; background: rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; position:relative; cursor:pointer; transition:transform 120ms ease, box-shadow 160ms ease; }
    .slot:hover { transform: translateY(-4px); box-shadow: 0 6px 18px rgba(0,0,0,0.5); }
    .slot .qty { position:absolute; right:6px; bottom:6px; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:999px; font-size:12px; }
    .slot .slot-label { position:absolute; left:6px; top:6px; font-size:10px; color: rgba(255,255,255,0.85); pointer-events:none; max-width:52px; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; }

        /* Custom vertical scrollbar: visible, themed thumb that matches the login/character-select accent.
           We keep the thumb subtle by default and increase opacity on hover. --theme-scroll-thumb is the
           global accent used for scroll thumbs; per-modal code can override --theme-scroll-thumb on a container. */
    :root { --theme-scroll-thumb: rgba(160,40,30,0.9); --theme-scroll-track: linear-gradient(180deg, rgba(10,10,12,0.6), rgba(18,18,20,0.6)); }
    .grid-scroll { --scroll-thumb-color: var(--theme-scroll-thumb); }
    .grid-scroll::-webkit-scrollbar { width:10px; }
    .grid-scroll::-webkit-scrollbar-track { background: var(--theme-scroll-track); border-radius:8px; }
    .grid-scroll::-webkit-scrollbar-thumb { background: var(--scroll-thumb-color); border-radius:999px; border:2px solid rgba(0,0,0,0.35); transition: background-color 200ms ease, opacity 160ms ease; opacity:0.28; }
    .grid-scroll:hover::-webkit-scrollbar-thumb { opacity:1; }
    .grid-scroll { scrollbar-width: thin; scrollbar-color: var(--scroll-thumb-color) transparent; }
    /* Item tooltip: glassy panel with rarity accent. Title etched, body marker-like */
    #shared-item-tooltip { position:fixed; pointer-events:none; z-index:9999; min-width:160px; max-width:320px; padding:10px 12px; border-radius:10px; color:#fff; opacity:0; transform:translateY(6px) scale(0.98); transition:opacity 180ms ease, transform 220ms cubic-bezier(.2,.9,.3,1); backdrop-filter: blur(6px) saturate(120%); -webkit-backdrop-filter: blur(6px) saturate(120%); box-shadow: 0 10px 30px rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.06);
    }
    #shared-item-tooltip.show { opacity:1; transform:translateY(0) scale(1); }
    /* Skill tooltip (small, transient) */
    #shared-skill-tooltip { position:fixed; pointer-events:none; z-index:10000; min-width:120px; max-width:260px; padding:8px 10px; border-radius:8px; color:#fff; opacity:0; transform:translateY(6px) scale(0.98); transition:opacity 140ms ease, transform 160ms cubic-bezier(.2,.9,.3,1); background: rgba(18,18,20,0.96); border:1px solid rgba(255,255,255,0.04); font-size:13px; }
    #shared-skill-tooltip.show { opacity:1; transform:translateY(0) scale(1); }
    #shared-item-tooltip .tt-title { font-weight:800; font-size:14px; margin-bottom:6px; /* etched effect */ color: rgba(255,255,255,0.92); text-shadow: 0 -1px 0 rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03); }
    #shared-item-tooltip .tt-desc { font-size:12px; color: rgba(240,240,240,0.9); margin-bottom:6px; font-family: 'Segoe UI', Roboto, 'Comic Sans MS', cursive; }
    #shared-item-tooltip .tt-value { font-size:12px; color: #ffd27a; margin-bottom:6px; font-family: 'Segoe UI', Roboto, 'Comic Sans MS', cursive; }
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
    .workbench-details::-webkit-scrollbar-thumb { background: var(--theme-scroll-thumb); border-radius:999px; border:2px solid rgba(0,0,0,0.28); }

          /* Ensure modals (including the compact stats modal) get the same themed scrollbars
              - targets the modal element itself and modal-card containers which may host scrolling */
          #stats-modal::-webkit-scrollbar,
          .modal-card::-webkit-scrollbar,
          .modal-overlay::-webkit-scrollbar { width:10px; }
          #stats-modal::-webkit-scrollbar-track,
          .modal-card::-webkit-scrollbar-track { background: var(--theme-scroll-track); border-radius:8px; }
          #stats-modal::-webkit-scrollbar-thumb,
          .modal-card::-webkit-scrollbar-thumb { background: var(--theme-scroll-thumb); border-radius:999px; border:2px solid rgba(0,0,0,0.28); transition: background-color 200ms ease, opacity 160ms ease; opacity:0.32; }
          #stats-modal:hover::-webkit-scrollbar-thumb, .modal-card:hover::-webkit-scrollbar-thumb { opacity:1; }
          /* Firefox fallback for modal elements */
          #stats-modal, .modal-card { scrollbar-width: thin; scrollbar-color: var(--theme-scroll-thumb) transparent; }

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
    /* Equipment grid - centered, requested layout */
    .equip-grid { display:flex; justify-content:center; align-items:center; padding:8px 0; }
    /* 3x4 layout updated to include dedicated mining/woodcutting tool slots */
    .equip-slots { display:grid; grid-template-columns: repeat(3, 96px); grid-template-rows: repeat(4, 96px); gap:12px; grid-template-areas: "ring1 head ring2" "amulet armor weapon" "fishing legs woodcutting" "mining boots empty"; justify-content:center; }
    .equip-slot { width:96px; height:96px; border-radius:12px; background:rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:6px; cursor:pointer; position:relative; border:1px solid rgba(255,255,255,0.04); }
    .equip-slot.empty { opacity:0.55; }
    .equip-slot .slot-name { font-size:12px; color:#ddd; text-align:center; max-width:86px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .equip-slot .slot-icon { font-size:20px; }
    .equip-slot .unequip-btn { position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.35); color:#fff; border:none; padding:4px 6px; border-radius:6px; cursor:pointer; font-size:11px; }
    /* rarity tint classes (fallback border colors) */
    .slot-rarity-common { border-color: rgba(255,255,255,0.06) !important; }
    .slot-rarity-uncommon { border-color: rgba(100,255,100,0.45) !important; }
    .slot-rarity-rare { border-color: rgba(100,170,255,0.45) !important; }
    .slot-rarity-epic { border-color: rgba(200,100,255,0.5) !important; }
    .slot-rarity-legendary { border-color: rgba(255,200,80,0.55) !important; }
    /* Talent card and skill-slot visuals */
    .talent-card{transition: transform 140ms ease, box-shadow 160ms ease, filter 160ms ease;border:1px solid rgba(255,255,255,0.04);}
    .talent-card:hover{transform: translateY(-6px);box-shadow: 0 12px 30px rgba(0,0,0,0.6);}
    .talent-card.passive{border-left:4px solid rgba(255,210,122,0.18);}
    .talent-card.active{border-left:4px solid rgba(180,120,255,0.22);}
    .talent-card .talent-meta{display:flex;gap:8px;align-items:center;}
    .talent-card .talent-icon{width:18px;height:18px;border-radius:4px;flex:0 0 auto;}
    .talent-card{display:flex;flex-direction:column;border-radius:6px;padding:8px;background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.04));margin:6px;color:#fff;min-height:72px}
    .talent-card.unlearned{filter:grayscale(70%);opacity:0.8}
    .talent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .talent-badge{font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.25);display:inline-block;margin-top:6px}
    /* Themed skill bar to match login/character-select: blocky cards, red accent, Metal Mania heading feel */
    #global-skill-bar { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 9999; display:flex; gap:10px; padding:8px; background: linear-gradient(180deg, rgba(12,12,14,0.96), rgba(18,18,20,0.96)); border-left:8px solid rgba(120,20,20,0.95); border:3px solid #111; border-radius:6px; box-shadow: 0 30px 80px rgba(0,0,0,0.9); font-family: 'Share Tech Mono', monospace; }
    .skill-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:72px;gap:6px;padding:8px;border-radius:6px;background:linear-gradient(180deg,rgba(14,14,16,0.96),rgba(8,8,10,0.96));border:2px solid rgba(30,30,30,0.7);cursor:pointer;transition:background-color 140ms ease,border-color 120ms ease,color 120ms ease;text-align:center;color:#e6d7cf}
    /* Hover: gentle tint only (no translate/box-shadow) to avoid visual glitches */
    .skill-slot:hover{ background: linear-gradient(180deg, rgba(20,12,12,0.98), rgba(26,14,14,0.98)); border-color: rgba(140,30,30,0.95); }
    .skill-slot.selected{ border-color: rgba(255,180,120,0.95); }
    .skill-icon{width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,0.02);color:#ffd27a}
    .skill-label{font-family:'Metal Mania',cursive;font-size:0.85rem;color:#f0c9b0;letter-spacing:0.5px}
    .mana-badge{position:absolute;right:8px;top:6px;background:rgba(120,20,20,0.9);color:#fff;padding:4px 6px;border-radius:6px;font-size:11px;font-weight:800}
    .cooldown-overlay{position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(180deg,rgba(0,0,0,0.6),rgba(0,0,0,0.6));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;border-radius:6px}
    .cooldown-active{filter:grayscale(30%);opacity:0.95}
    `;
    document.head.appendChild(s);
}

// Tooltip helpers (create on-demand)
function ensureTooltip() {
    if (typeof document === 'undefined') return null;
    let t = document.getElementById('shared-item-tooltip');
    if (t) return t;
    t = document.createElement('div'); t.id = 'shared-item-tooltip';
    t.innerHTML = `<div class='tt-title'></div><div class='tt-desc'></div><div class='tt-value' style='display:none'></div><div class='tt-stats'></div>`;
    document.body.appendChild(t);
    return t;
}

function ensureSkillTooltip() {
    if (typeof document === 'undefined') return null;
    let t = document.getElementById('shared-skill-tooltip');
    if (t) return t;
    t = document.createElement('div'); t.id = 'shared-skill-tooltip';
        t.innerHTML = `<div id='skill-title' style='font-weight:800;margin-bottom:6px;'></div><div id='skill-body' style='font-size:13px; line-height: 1.3;'></div>`;
    document.body.appendChild(t);
    return t;
}

function msToEta(ms) {
    if (!ms || isNaN(ms)) return 'N/A';
    if (ms < 1000) return `${ms} ms`;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

function estimateSuccessChance(level = 1, toolSkillBonus = 0, difficulty = 12) {
    // Simple, conservative formula:
    // base = level / (level + difficulty)
    // toolSkillBonus is additive skill points (not percent)
    const effective = Math.max(0, level + (toolSkillBonus || 0));
    const base = effective > 0 ? (effective / (effective + difficulty)) : 0.05;
    return Math.round(Math.max(1, Math.min(99, base * 100)));
}

function showSkillTooltip(scene, skillName, lines, anchorEl) {
    const t = ensureSkillTooltip(); if (!t) return;
    const title = t.querySelector('#skill-title'); const body = t.querySelector('#skill-body'); const now = Date.now();
    if (title) title.textContent = skillName;

    // Normalize skill key (map display label to character property)
    const labelToKey = { 'Mining': 'mining', 'Smithing': 'smithing', 'Cooking': 'cooking', 'Woodcutting': 'woodcutting', 'Fishing': 'fishing' };
    const key = labelToKey[skillName] || (skillName && skillName.toLowerCase && skillName.toLowerCase());
    const char = (scene && scene.char) ? scene.char : {};
    const skillObj = (key && char[key]) ? char[key] : (char[key] = { level: 1, exp: 0, expToLevel: 100 });

    // Gather basic numbers
    const level = (skillObj && typeof skillObj.level === 'number') ? skillObj.level : 1;
    const exp = (skillObj && typeof skillObj.exp === 'number') ? skillObj.exp : 0;
    const next = (skillObj && (skillObj.expToLevel || skillObj.next || skillObj.expToNext)) || null;

    // Determine ms per attempt for this skill
    const eff = effectiveStats(char);
    const miningMs = (typeof scene.miningInterval === 'number') ? scene.miningInterval : 2800;
    const smithingMs = (typeof scene.smeltingInterval === 'number') ? scene.smeltingInterval : 2800;
    const cookingMs = (typeof scene.craftingInterval === 'number') ? scene.craftingInterval : 2800;
    const woodcuttingMs = 3000;
    const fishingMs = (eff && typeof eff.fishingSpeedMs === 'number') ? eff.fishingSpeedMs : 3000;
    const speedMap = { mining: miningMs, smithing: smithingMs, cooking: cookingMs, woodcutting: woodcuttingMs, fishing: fishingMs };
    const speedMs = speedMap[key] || 3000;

    // Tool/equipment bonuses
    let toolSkillBonus = 0;
    if (key === 'fishing' && char.equipment && char.equipment.fishing) {
        const iid = char.equipment.fishing.id;
        const idef = (window && window.ITEM_DEFS) ? window.ITEM_DEFS[iid] : null;
        if (idef && idef.fishingBonus) toolSkillBonus += (idef.fishingBonus.skill || 0);
    }

    // Build tooltip lines
    const out = [];
    if (Array.isArray(lines)) for (const l of lines) out.push(l);
    out.push(`Level: ${level}`);
    if (next) out.push(`Exp: ${exp} / ${next}`);
    if (next) {
        const need = Math.max(0, next - exp);
        // Assumptions for ETA: assume ~5 exp per success (conservative). This is an estimate.
        const expPerSuccess = 5;
        const successPct = (key === 'fishing') ? estimateSuccessChance(level + toolSkillBonus, toolSkillBonus, 12) : estimateSuccessChance(level, 0, 12);
        const successFrac = Math.max(0.01, successPct / 100);
        const expPerAttempt = expPerSuccess * successFrac;
        const attemptsNeeded = expPerAttempt > 0 ? Math.ceil(need / expPerAttempt) : Infinity;
        const totalMs = attemptsNeeded * speedMs;
        out.push(`ETA to next: ${next ? msToEta(totalMs) : 'N/A'}`);
        out.push(`Attempts ≈ ${isFinite(attemptsNeeded) ? attemptsNeeded : '∞'} (avg)`);
    }
    out.push(`Speed: ${speedMs} ms (${msToEta(speedMs)})`);
    // Success chance / modifiers for gathering skills (not relevant for pure craft skills)
    if (key === 'fishing') {
        const chance = estimateSuccessChance(level + toolSkillBonus, toolSkillBonus, 12);
        out.push(`Estimated success: ${chance}%`);
        if (toolSkillBonus) out.push(`Tool bonus: +${toolSkillBonus} skill`);
    }

    if (body) body.innerHTML = out.map(l => `<div>${l}</div>`).join('');

    // position near anchor with adjustments
    let x = 24, y = 24;
    if (anchorEl && anchorEl.getBoundingClientRect) {
        const r = anchorEl.getBoundingClientRect();
        x = Math.max(8, r.right + 10);
        y = Math.max(8, r.top);
        if (y + t.offsetHeight > window.innerHeight - 12) y = window.innerHeight - t.offsetHeight - 12;
        // if tooltip would overflow right edge, move it left of anchor
        if (x + t.offsetWidth > window.innerWidth - 12) x = Math.max(8, r.left - t.offsetWidth - 10);
    }
    t.style.left = x + 'px'; t.style.top = Math.max(8, y) + 'px';
    requestAnimationFrame(() => t.classList.add('show'));
}

function hideSkillTooltip() { const t = document.getElementById('shared-skill-tooltip'); if (!t) return; t.classList.remove('show'); }

function buildStatLines(def) {
    const lines = [];
        if (!def) return lines;
        if (!def) return lines;
    if (def.statBonus) {
        for (const k of Object.keys(def.statBonus)) lines.push(`+${def.statBonus[k]} ${k.toUpperCase()}`);
    }
    // Support alternate spellings/keys for defense (defence, def) and top-level defense value
    const defVal = (typeof def.defense !== 'undefined' && def.defense !== null) ? def.defense :
                   (typeof def.defence !== 'undefined' && def.defence !== null) ? def.defence :
                   (typeof def.def !== 'undefined' && def.def !== null) ? def.def : null;
    if (defVal !== null) lines.push(`+${defVal} DEF`);
    // Support damage arrays (most items use `damage: [min,max]`) and single-value weaponDamage
    if (Array.isArray(def.damage) && def.damage.length >= 2) {
        lines.push(`DMG: ${def.damage[0]}-${def.damage[1]}`);
    } else if (typeof def.weaponDamage !== 'undefined' && def.weaponDamage !== null) {
        lines.push(`DMG: ${def.weaponDamage}`);
    }
    return lines;
}

// Stat tooltip helpers
function ensureStatTooltip() {
    if (typeof document === 'undefined') return null;
    let t = document.getElementById('shared-stat-tooltip');
    if (t) return t;
    t = document.createElement('div'); t.id = 'shared-stat-tooltip';
    t.style.position = 'fixed'; t.style.pointerEvents = 'none'; t.style.zIndex = '10001'; t.style.minWidth = '160px'; t.style.maxWidth = '360px'; t.style.padding = '8px 10px'; t.style.borderRadius = '8px'; t.style.color = '#fff'; t.style.opacity = '0'; t.style.transform = 'translateY(6px) scale(0.98)'; t.style.transition = 'opacity 160ms ease, transform 180ms cubic-bezier(.2,.9,.3,1)'; t.style.background = 'rgba(18,18,20,0.96)'; t.style.border = '1px solid rgba(255,255,255,0.04)';
    t.innerHTML = `<div id='stat-title' style='font-weight:800;margin-bottom:6px;'></div><div id='stat-body' style='font-size:13px;line-height:1.3;'></div>`;
    document.body.appendChild(t);
    return t;
}

function hideStatTooltip() { const t = document.getElementById('shared-stat-tooltip'); if (!t) return; t.style.opacity = '0'; t.style.transform = 'translateY(6px) scale(0.98)'; }

function showStatTooltip(scene, title, lines, anchorEl) {
    const t = ensureStatTooltip(); if (!t) return;
    const titleEl = t.querySelector('#stat-title'); const bodyEl = t.querySelector('#stat-body');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = (Array.isArray(lines) && lines.length) ? lines.map(l=>`<div>${l}</div>`).join('') : `<div>No modifiers</div>`;
    // position near anchor
    let x = 24, y = 24;
    if (anchorEl && anchorEl.getBoundingClientRect) {
        const r = anchorEl.getBoundingClientRect();
        x = Math.max(8, r.right + 10);
        y = Math.max(8, r.top);
        if (y + t.offsetHeight > window.innerHeight - 12) y = window.innerHeight - t.offsetHeight - 12;
        if (x + t.offsetWidth > window.innerWidth - 12) x = Math.max(8, r.left - t.offsetWidth - 10);
    }
    t.style.left = x + 'px'; t.style.top = Math.max(8, y) + 'px';
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0) scale(1)'; });
}

export function showItemTooltip(scene, itemOrId, anchorEl) {
    if (typeof document === 'undefined') return;
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    let def = null; let name = ''; let desc = '';
        if (!itemOrId) return;
        if (!itemOrId) return;
        if (typeof itemOrId === 'string') { def = defs[itemOrId] || null; name = (def && def.name) || itemOrId; desc = (def && def.desc) || (def && def.description) || ''; }
    else if (itemOrId && itemOrId.id) { def = defs[itemOrId.id] || null; name = itemOrId.name || (def && def.name) || itemOrId.id; }
    else { def = defs[itemOrId] || null; name = (def && def.name) || itemOrId; }
    desc = (def && def.desc) || (def && def.description) || '';
    const t = ensureTooltip(); if (!t) return;
    // set rarity class and tag title color
    const rarity = (def && def.rarity) || 'common'; t.className = '';
    t.classList.add(`tt-${rarity}`);
    try {
        const titleColor = RARITY_TITLE_COLORS[rarity] || RARITY_TITLE_COLORS.common;
        const titleEl = t.querySelector('.tt-title');
        if (titleEl) titleEl.style.color = titleColor;
        // slightly strengthen border tint for visible contrast
        if (rarity && rarity !== 'common') t.style.borderColor = (RARITY_COLORS[rarity] || RARITY_COLORS.common);
        else t.style.borderColor = 'rgba(255,255,255,0.06)';
    } catch (e) {}
    // fill content
    const titleEl = t.querySelector('.tt-title'); const descEl = t.querySelector('.tt-desc'); const valueEl = t.querySelector('.tt-value'); const statsEl = t.querySelector('.tt-stats');
    if (titleEl) titleEl.textContent = name;
    if (descEl) descEl.textContent = desc || '';
    // value display (optional)
    try {
        if (valueEl) {
            if (def && typeof def.value !== 'undefined' && def.value !== null) {
                valueEl.style.display = 'block';
                valueEl.textContent = '\uD83D\uDCB0 Value: ' + (def.value || 0);
            } else {
                valueEl.style.display = 'none';
                valueEl.textContent = '';
            }
        }
    } catch (e) {}
    // hint for usable items (double-click to use in the inventory)
    if (def && def.usable) {
        if (descEl) descEl.textContent = (descEl.textContent ? descEl.textContent + ' ' : '') + '(Double-click to use)';
    }
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

// Shared helper for updating quest progress and checking completion
export function updateQuestProgressAndCheckCompletion(scene, type, itemId, amount = 1) {
    if (!scene || !scene.char) return;
    const updateQuestProgress = (window && window.updateQuestProgress) ? window.updateQuestProgress : null;
    if (!updateQuestProgress) return;

    // Update progress
    updateQuestProgress(scene.char, type, itemId, amount);

    // Lightweight diagnostics to help verify quest progress wiring in-game
    try {
        if (typeof console !== 'undefined' && console.debug) {
            const idStr = (itemId === null || typeof itemId === 'undefined') ? '-' : String(itemId);
            console.debug(`[quests] progress type=${type} item=${idStr} amount=${amount}`);
        }
    } catch (e) {}

    // Persist character to save progress
    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
    if (scene._persistCharacter) scene._persistCharacter(username);

    // Refresh quest log if open
    try { if (window.__shared_ui && window.__shared_ui.refreshQuestLogModal && scene._questLogModal) window.__shared_ui.refreshQuestLogModal(scene); } catch (e) {}
}

// Register quest indicators for multiple NPC display objects.
// mapping: { giverId: displayObject }
export function registerQuestIndicators(scene, mapping) {
    if (!scene || !mapping || typeof mapping !== 'object') return;
    try {
        if (!scene._registeredQuestIndicators) scene._registeredQuestIndicators = { entries: [], updateFn: null };
        const entries = scene._registeredQuestIndicators.entries;
        for (const giverId of Object.keys(mapping || {})) {
            const target = mapping[giverId];
            if (!target) continue;
            // If this display object already has indicators attached, skip
            if (target._questIndicator || target._questBubble) {
                entries.push({ giverId, obj: target });
                continue;
            }
            // create indicator and bubble anchored to the display object
            try {
                const ind = scene.add.text(target.x || 0, (target.y || 0) - 56, '', { fontSize: '18px', color: '#ffd27a', backgroundColor: 'rgba(0,0,0,0.0)' }).setOrigin(0.5).setDepth(3.0);
                ind.setVisible(false);
                const bub = scene.add.text(target.x || 0, (target.y || 0) - 82, '', { fontSize: '12px', color: '#fff', backgroundColor: 'rgba(10,10,12,0.85)', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(3.1);
                bub.setVisible(false);
                target._questIndicator = ind;
                target._questBubble = bub;
                entries.push({ giverId, obj: target });
            } catch (e) {
                try { console.warn && console.warn('[registerQuestIndicators] failed to create visuals for', giverId, e); } catch (e2) {}
            }
        }

        if (!scene._registeredQuestIndicators.updateFn) {
            const upd = function() {
                try {
                    const regs = (scene._registeredQuestIndicators && scene._registeredQuestIndicators.entries) ? scene._registeredQuestIndicators.entries : [];
                    for (const entry of regs) {
                        try {
                            const giver = entry.giverId;
                            const dsp = entry.obj;
                            if (!dsp) continue;
                            const ind = dsp._questIndicator;
                            const bub = dsp._questBubble;
                            if (!ind || !bub) continue;
                            // position above NPC
                            ind.x = dsp.x || ind.x;
                            ind.y = (dsp.y || ind.y) - 56;
                            bub.x = dsp.x || bub.x;
                            bub.y = (dsp.y || bub.y) - 82;

                            // determine available/active quests for this giver
                            let available = [];
                            try {
                                if (typeof window.getAvailableQuests === 'function') {
                                    available = window.getAvailableQuests(scene.char, (scene && scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.location) || null) || [];
                                }
                            } catch (e) { available = []; }
                            available = (available || []).filter(q => q && q.giver === giver);

                            let active = (scene.char && Array.isArray(scene.char.activeQuests)) ? (scene.char.activeQuests || []) : [];
                            // Filter active quests relevant to this NPC: either given by this NPC OR handed in to this NPC.
                            try {
                                if (typeof window.getQuestById === 'function') {
                                    active = active.filter(aq => { try { const d = window.getQuestById(aq.id); return d && (d.giver === giver || d.handInNpc === giver); } catch (e) { return false; } });
                                } else {
                                    active = active.filter(aq => { try { const def = (window && window.QUEST_DEFS && window.QUEST_DEFS[aq.id]) ? window.QUEST_DEFS[aq.id] : null; return def && (def.giver === giver || def.handInNpc === giver); } catch (e) { return false; } });
                                }
                            } catch (e) { active = []; }

                            let ready = null;
                            for (const a of (active || [])) {
                                try {
                                    if (typeof window.checkQuestCompletion === 'function' && window.checkQuestCompletion(scene.char, a.id)) { ready = a; break; }
                                } catch (e) {}
                            }

                            if (ready) {
                                ind.setText('❗'); ind.setVisible(true);
                                const def = (typeof window.getQuestById === 'function') ? window.getQuestById(ready.id) : ((window && window.QUEST_DEFS && window.QUEST_DEFS[ready.id]) ? window.QUEST_DEFS[ready.id] : null);
                                bub.setText((def && def.name) ? def.name : (ready.id || 'Quest'));
                                bub.setVisible(true);
                            } else if (available && available.length) {
                                ind.setText('❓'); ind.setVisible(true);
                                const def = available[0];
                                bub.setText((def && def.name) ? def.name : (def && def.id) ? def.id : 'New Quest');
                                bub.setVisible(true);
                            } else {
                                ind.setVisible(false);
                                bub.setVisible(false);
                            }
                        } catch (e) { /* per-entry silent */ }
                    }
                } catch (e) { /* global silent */ }
            };
            scene._registeredQuestIndicators.updateFn = upd;
            scene.events.on('update', upd);
            scene.events.once('shutdown', () => {
                try {
                    const regs = (scene._registeredQuestIndicators && scene._registeredQuestIndicators.entries) ? scene._registeredQuestIndicators.entries : [];
                    for (const entry of regs) {
                        try { if (entry && entry.obj && entry.obj._questIndicator && entry.obj._questIndicator.destroy) entry.obj._questIndicator.destroy(); } catch (e) {}
                        try { if (entry && entry.obj && entry.obj._questBubble && entry.obj._questBubble.destroy) entry.obj._questBubble.destroy(); } catch (e) {}
                        try { if (entry && entry.obj) { entry.obj._questIndicator = null; entry.obj._questBubble = null; } } catch (e) {}
                    }
                } catch (e) {}
                try { if (scene._registeredQuestIndicators && scene._registeredQuestIndicators.updateFn) scene.events.off('update', scene._registeredQuestIndicators.updateFn); } catch (e) {}
                scene._registeredQuestIndicators = null;
            });
        }
    } catch (e) {
        try { console.warn && console.warn('[registerQuestIndicators] error', e); } catch (e2) {}
    }
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
        window.__shared_ui.useItemFromSlot = useItemFromSlot;
        // inventory convenience helpers
        window.__shared_ui.addItemToInventory = addItemToInventory;
        window.__shared_ui.removeItemFromInventory = removeItemFromInventory;
        // modal helpers
        window.__shared_ui.openInventoryModal = openInventoryModal;
        window.__shared_ui.closeInventoryModal = closeInventoryModal;
        window.__shared_ui.refreshInventoryModal = refreshInventoryModal;
        window.__shared_ui.refreshStatsModal = refreshStatsModal;
        window.__shared_ui.openQuestLogModal = openQuestLogModal;
        window.__shared_ui.closeQuestLogModal = closeQuestLogModal;
        window.__shared_ui.refreshQuestLogModal = refreshQuestLogModal;
        // quest helpers
        window.__shared_ui.updateQuestProgressAndCheckCompletion = updateQuestProgressAndCheckCompletion;
        // equipment helpers
        window.__shared_ui.applyEquipmentBonuses = applyEquipmentBonuses;
        window.__shared_ui.removeEquipmentBonuses = removeEquipmentBonuses;
        window.__shared_ui.equipItemFromInventory = equipItemFromInventory;
        window.__shared_ui.unequipItem = unequipItem;
        // indicator helpers
        window.__shared_ui.registerQuestIndicators = registerQuestIndicators;
        window.__shared_ui.reconcileEquipmentBonuses = reconcileEquipmentBonuses;
    }
} catch (e) {}

// -------------------- Settings modal --------------------------------------
// Persisted settings key in localStorage
const SETTINGS_KEY = 'chaosinfull_settings_v1';

function loadSettings() {
    try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return {};
        return JSON.parse(raw) || {};
    } catch (e) { return {}; }
}

function saveSettings(obj) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj || {}));
    } catch (e) {}
}

export function applySettingsToScene(scene, settings) {
    if (!scene) return;
    const s = settings || loadSettings();
    // apply global sound volumes where possible
    try {
        const g = (scene.sys && scene.sys.game) ? scene.sys.game : (window && window.game) ? window.game : null;
        if (g && g.sound) {
            // Treat sfxVolume as the global sound manager volume (affects all sounds except when background music has its own volume applied)
            if (typeof s.sfxVolume === 'number') try { g.sound.volume = Number(s.sfxVolume); } catch (e) {}
        }
        // keep handy references for other code
        if (typeof window !== 'undefined') {
            window.__game_settings = Object.assign({}, window.__game_settings || {}, s);
        }
    } catch (e) {}
    // attack range indicator: if enabled, create one for this scene
    try {
        if (s.showAtkRange) {
            if (typeof ensureAttackRangeIndicator === 'function') ensureAttackRangeIndicator(scene, true);
        } else {
            if (typeof ensureAttackRangeIndicator === 'function') ensureAttackRangeIndicator(scene, false);
        }
    } catch (e) {}
}

// Background music helper: play/stop/set-volume a persistent background track managed via the game's sound manager.
export function playBackgroundMusic(scene, key, opts = {}) {
    if (!scene || !key) return null;
    try {
        window.__shared_ui = window.__shared_ui || {};
        window.__shared_ui._bgMusicCreating = window.__shared_ui._bgMusicCreating || {};
        const gm = scene.sys && scene.sys.game ? scene.sys.game : null;
        if (!gm || !gm.sound) return null;
        const existing = window.__shared_ui._bgMusic || null;
        const existingKey = window.__shared_ui._bgMusicKey || null;
        const loop = (typeof opts.loop === 'boolean') ? opts.loop : true;
        const vol = (typeof opts.volume === 'number') ? opts.volume : ((window && window.__game_settings && typeof window.__game_settings.musicVolume === 'number') ? window.__game_settings.musicVolume : 1);

        // If same key already tracked, reuse it
        if (existing && existingKey === key) {
            try { existing.setLoop(loop); existing.setVolume(vol); if (!existing.isPlaying) existing.play(); } catch (e) {}
            window.__shared_ui._bgMusic = existing; window.__shared_ui._bgMusicKey = key;
            return existing;
        }

        // If another call is already creating/initializing this key, avoid racing.
        // Try to reuse the tracked instance if it exists; otherwise schedule a short retry
        // so the in-flight creator can finish instead of silently returning null.
        if (window.__shared_ui._bgMusicCreating[key]) {
            try {
                if (window.__shared_ui._bgMusic && window.__shared_ui._bgMusicKey === key) {
                    try { window.__shared_ui._bgMusic.setLoop && window.__shared_ui._bgMusic.setLoop(loop); } catch (e) {}
                    try { window.__shared_ui._bgMusic.setVolume && window.__shared_ui._bgMusic.setVolume(vol); } catch (e) {}
                    try { if (!window.__shared_ui._bgMusic.isPlaying && typeof window.__shared_ui._bgMusic.play === 'function') window.__shared_ui._bgMusic.play(); } catch (e) {}
                    return window.__shared_ui._bgMusic;
                }
            } catch (e) {}
            try {
                window.__shared_ui._bgMusicRetrying = window.__shared_ui._bgMusicRetrying || {};
                if (!window.__shared_ui._bgMusicRetrying[key]) {
                    window.__shared_ui._bgMusicRetrying[key] = true;
                    setTimeout(() => {
                        try {
                            window.__shared_ui._bgMusicRetrying[key] = false;
                            // Retry once after a short delay to pick up the instance created by the other caller
                            playBackgroundMusic(scene, key, opts);
                        } catch (e) {}
                    }, 80);
                }
            } catch (e) {}
            return null;
        }

        // Robust: try to find an already-loaded sound with this key in the game's sound manager
        try {
            const mgrSounds = (gm.sound && gm.sound.sounds) ? gm.sound.sounds : [];
            for (const s of mgrSounds) {
                try {
                    if (!s) continue;
                    if (s.key === key) {
                        // found an existing sound instance; dispose of previously tracked instance if different
                        if (existing && existing !== s) {
                            try { if (existing.isPlaying) existing.stop(); } catch (e) {}
                            try { existing.destroy && existing.destroy(); } catch (e) {}
                        }
                        try { s.setLoop(loop); s.setVolume(vol); if (!s.isPlaying) s.play(); } catch (e) {}
                        window.__shared_ui._bgMusic = s; window.__shared_ui._bgMusicKey = key;
                        // Stop any other duplicates with same key (leave this one running)
                        try {
                            for (const other of mgrSounds) {
                                if (!other || other === s) continue;
                                try { if (other.key === key) { if (other.isPlaying) other.stop(); try { other.destroy && other.destroy(); } catch (e) {} } } catch (e) {}
                            }
                        } catch (e) {}
                        return s;
                    }
                } catch (e) { /* per-sound ignored */ }
            }
        } catch (e) { /* ignore scan errors */ }

        // No existing instance found: stop/destroy any previously tracked instance and create a new one
        if (existing) {
            try { if (existing.isPlaying) existing.stop(); } catch (e) {}
            try { existing.destroy && existing.destroy(); } catch (e) {}
        }

        // mark that we're creating this key so concurrent calls don't race
        window.__shared_ui._bgMusicCreating[key] = true;
        let snd = null;
        try {
            snd = gm.sound.add(key, { loop: loop, volume: vol });
            // register as tracked before play to ensure re-entrant callers see the instance
            window.__shared_ui._bgMusic = snd;
            window.__shared_ui._bgMusicKey = snd ? key : null;
            if (snd && typeof snd.play === 'function') snd.play();
            // After creating/playing, aggressively stop/destroy other instances with same key
            try {
                const mgrSounds2 = (gm.sound && gm.sound.sounds) ? gm.sound.sounds : [];
                for (const other of mgrSounds2) {
                    if (!other || other === snd) continue;
                    try {
                        if (other.key === key) {
                            if (other.isPlaying) other.stop();
                            try { other.destroy && other.destroy(); } catch (e) {}
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        } catch (e) {
            try { snd = scene.sound.add(key, { loop: loop, volume: vol }); window.__shared_ui._bgMusic = snd; window.__shared_ui._bgMusicKey = snd ? key : null; if (snd && typeof snd.play === 'function') snd.play(); } catch (e2) { snd = null; }
        } finally {
            try { window.__shared_ui._bgMusicCreating[key] = false; } catch (e) {}
        }
        return snd;
    } catch (e) { return null; }
}

export function stopBackgroundMusic() {
    try {
        window.__shared_ui = window.__shared_ui || {};
        const existing = window.__shared_ui._bgMusic || null;
        if (existing) {
            try { if (existing.isPlaying) existing.stop(); } catch (e) {}
            try { existing.destroy && existing.destroy(); } catch (e) {}
        }
        window.__shared_ui._bgMusic = null; window.__shared_ui._bgMusicKey = null;
    } catch (e) {}
}

export function setBackgroundMusicVolume(vol) {
    try {
        window.__shared_ui = window.__shared_ui || {};
        const existing = window.__shared_ui._bgMusic || null;
        if (existing && typeof existing.setVolume === 'function') existing.setVolume(Number(vol));
        // persist to settings
        try { const s = loadSettings(); s.musicVolume = Number(vol); saveSettings(s); if (typeof window !== 'undefined') window.__game_settings = Object.assign({}, window.__game_settings || {}, s); } catch (e) {}
    } catch (e) {}
}

// Create/destroy a persistent circle that shows the player's attack range for a scene
function computeEffectiveAttackRange(scene) {
    if (!scene) return 68;
    let defaultRange = (scene.attackRange != null) ? scene.attackRange : 68;
    try {
        const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const we = (scene && scene.char && scene.char.equipment && scene.char.equipment.weapon) ? scene.char.equipment.weapon : null;
        let weaponDef = null;
        if (we && we.id && itemDefs[we.id]) weaponDef = itemDefs[we.id];
        if (weaponDef) {
            if (typeof weaponDef.range === 'number') defaultRange = weaponDef.range;
            else if (/staff/i.test(weaponDef.id || '') || /staff/i.test(weaponDef.name || '')) defaultRange = 220;
        }
    } catch (e) {}
    return defaultRange;
}

export function ensureAttackRangeIndicator(scene, enabled) {
    if (!scene || !scene.add) return;
    try {
        if (!enabled) {
            try { if (scene._atkRangeIndicator && scene._atkRangeIndicator.destroy) scene._atkRangeIndicator.destroy(); } catch (e) {}
            scene._atkRangeIndicator = null;
            if (scene._atkRangeUpdateHandler && scene.events && typeof scene.events.off === 'function') {
                try { scene.events.off('update', scene._atkRangeUpdateHandler); } catch (e) {}
                scene._atkRangeUpdateHandler = null;
            }
            return;
        }
        // create indicator if missing
        if (!scene._atkRangeIndicator) {
            const radius = computeEffectiveAttackRange(scene);
            const color = 0xff6666;
            try {
                const c = scene.add.circle(scene.player ? scene.player.x : 0, scene.player ? scene.player.y : 0, radius, color, 0.12).setDepth(2.2);
                if (c.setBlendMode) try { c.setBlendMode(Phaser.BlendModes.ADD); } catch (e) {}
                scene._atkRangeIndicator = c;
            } catch (e) { scene._atkRangeIndicator = null; }
        }
        // update handler to keep circle following player and reacting to attackRange changes
        if (!scene._atkRangeUpdateHandler) {
            const handler = function() {
                try {
                    if (!scene || !scene._atkRangeIndicator) return;
                    const r = computeEffectiveAttackRange(scene);
                    scene._atkRangeIndicator.setRadius && scene._atkRangeIndicator.setRadius(r);
                    if (scene.player) {
                        scene._atkRangeIndicator.setPosition(scene.player.x, scene.player.y);
                    }
                } catch (e) {}
            };
            scene._atkRangeUpdateHandler = handler;
            try { scene.events.on('update', handler); } catch (e) {}
        }
    } catch (e) {}
}

export function openSettingsModal(scene) {
    if (!scene) return;
    if (scene._settingsModal) return;
    const current = Object.assign({ musicVolume: 1, sfxVolume: 1, alwaysRun: false, showAtkRange: false }, loadSettings());
    const modal = document.createElement('div'); modal.id = 'settings-modal'; modal.className = 'modal-overlay show'; modal.style.zIndex = '260';
    modal.innerHTML = `
        <div class='modal-card' style='min-width:520px; max-width:760px;'>
            <div class='modal-head'>
                <div>
                    <div class='modal-title'>Settings</div>
                    <div class='modal-subtitle'>Audio, gameplay and misc options</div>
                </div>
                <div class='modal-close'><button id='settings-close' class='btn btn-ghost'>Close</button></div>
            </div>
            <div class='modal-body'>
                <div style='flex:0 0 260px; display:flex; flex-direction:column; gap:12px;'>
                    <div><strong>Sound</strong></div>
                    <div>Music Volume: <input id='settings-music' type='range' min='0' max='1' step='0.01' value='${current.musicVolume}' class='input-small' /></div>
                    <div>SFX Volume: <input id='settings-sfx' type='range' min='0' max='1' step='0.01' value='${current.sfxVolume}' class='input-small' /></div>
                    <div style='margin-top:8px;'><strong>Gameplay</strong></div>
                    <div><label><input id='settings-alwaysrun' type='checkbox' ${current.alwaysRun ? 'checked' : ''} /> Always run</label></div>
                    <div><label><input id='settings-showatk' type='checkbox' ${current.showAtkRange ? 'checked' : ''} /> Show attack range</label></div>
                </div>
                <div style='flex:1 1 360px; display:flex; flex-direction:column; gap:12px;'>
                    <div><strong>Misc</strong></div>
                    <div style='display:flex;gap:8px;'><button id='settings-switchchar' class='btn btn-secondary'>Switch Characters</button><button id='settings-logout' class='btn btn-ghost'>Log Out</button></div>
                    <div style='margin-top:8px;color:rgba(255,255,255,0.82);font-size:13px;'>Changes persist locally and apply immediately.</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    scene._settingsModal = modal;
    const closeBtn = modal.querySelector('#settings-close'); if (closeBtn) closeBtn.onclick = () => closeSettingsModal(scene);
    // wire controls
    const music = modal.querySelector('#settings-music'); const sfx = modal.querySelector('#settings-sfx');
    const always = modal.querySelector('#settings-alwaysrun'); const showatk = modal.querySelector('#settings-showatk');
    if (music) music.oninput = music.onchange = () => {
        try {
            current.musicVolume = Number(music.value);
            saveSettings(current);
            applySettingsToScene(scene, current);
            try { if (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.setBackgroundMusicVolume === 'function') window.__shared_ui.setBackgroundMusicVolume(current.musicVolume); } catch (e) {}
        } catch (e) {}
    };
    if (sfx) sfx.oninput = sfx.onchange = () => {
        try { current.sfxVolume = Number(sfx.value); saveSettings(current); applySettingsToScene(scene, current); } catch (e) {}
    };
    if (always) always.onchange = () => {
        try { current.alwaysRun = Boolean(always.checked); saveSettings(current); if (typeof window !== 'undefined') window.__game_settings = Object.assign({}, window.__game_settings || {}, { alwaysRun: current.alwaysRun }); } catch (e) {}
    };
    if (showatk) showatk.onchange = () => {
        try { current.showAtkRange = Boolean(showatk.checked); saveSettings(current); applySettingsToScene(scene, current); } catch (e) {}
    };
    const switchBtn = modal.querySelector('#settings-switchchar'); if (switchBtn) switchBtn.onclick = () => {
        try {
            saveSettings(current);
            if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
            try { closeSettingsModal(scene); } catch (e) {}
            setTimeout(() => { try { scene.scene.start('CharacterSelect'); } catch (e) {} }, 80);
        } catch (e) {}
    };
    const logoutBtn = modal.querySelector('#settings-logout'); if (logoutBtn) logoutBtn.onclick = () => {
        try {
            saveSettings(current);
            if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
            try { closeSettingsModal(scene); } catch (e) {}
            setTimeout(() => { try { scene.scene.start('Login'); } catch (e) {} }, 80);
        } catch (e) {}
    };
}

export function closeSettingsModal(scene) {
    if (!scene) return;
    if (scene._settingsModal && scene._settingsModal.parentNode) scene._settingsModal.parentNode.removeChild(scene._settingsModal);
    scene._settingsModal = null;
}

// expose settings helper globally
try { if (typeof window !== 'undefined') { window.__shared_ui = window.__shared_ui || {}; window.__shared_ui.openSettingsModal = openSettingsModal; window.__shared_ui.applySettingsToScene = applySettingsToScene; window.__shared_ui.ensureAttackRangeIndicator = ensureAttackRangeIndicator; } } catch (e) {}
try { if (typeof window !== 'undefined') { window.__shared_ui = window.__shared_ui || {}; window.__shared_ui.playBackgroundMusic = playBackgroundMusic; window.__shared_ui.stopBackgroundMusic = stopBackgroundMusic; window.__shared_ui.setBackgroundMusicVolume = setBackgroundMusicVolume; } } catch (e) {}

// Initialize global settings object from storage so other modules (movement.js) can read it
try { if (typeof window !== 'undefined') { window.__game_settings = Object.assign({}, window.__game_settings || {}, loadSettings()); } } catch (e) {}

// Inventory slot constants
const SLOT_COLS = 5;
const SLOT_COUNT = 50;

// Rarity -> color map (used for scrollbar tint on hover)
const RARITY_COLORS = {
    common: 'rgba(255,255,255,0.12)',
    uncommon: 'rgba(100,255,100,0.9)',
    rare: 'rgba(100,170,255,0.9)',
    epic: 'rgba(200,100,255,0.95)',
    legendary: 'rgba(255,200,80,0.95)'
};

// Title color mapping for rarities (used to tint the item name for better contrast)
const RARITY_TITLE_COLORS = {
    common: '#ffffff',
    uncommon: '#8ef58a',
    rare: '#66baff',
    epic: '#d08cff',
    legendary: '#ffd27a'
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

// Use an item from the scene's inventory by slot index. Supports heal/mana potions and bag_of_gold.
function useItemFromSlot(scene, slotIndex) {
    try {
        try { console.log && console.log('[useItemFromSlot] called', { slotIndex }); } catch(e) {}
        if (!scene || !scene.char) return false;
        scene.char.inventory = initSlots(scene.char.inventory || []);
        const slots = scene.char.inventory;
        if (slotIndex < 0 || slotIndex >= slots.length) return false;
        const s = slots[slotIndex]; if (!s || !s.id) return false;
    try { console.log && console.log('[useItemFromSlot] slot item', { id: s.id, qty: s.qty }); } catch(e) {}
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const def = defs[s.id] || {};
        let acted = false;
        let attempted = false; // whether we attempted to use the item (so clicks are considered handled even if no effect)
        // heal
        if (def.healAmount) {
            try { console.log && console.log('[useItemFromSlot] healAmount detected', def.healAmount, 'usable?', def.usable); } catch(e) {}
            attempted = true;
            if (!def.usable) { if (scene._showToast) scene._showToast('Cannot use that item'); }
            else {
                // compute effective maxhp
                let eff = null; try { if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(scene.char); } catch (e) {}
                const maxhp = (eff && typeof eff.maxhp === 'number') ? eff.maxhp : ((typeof scene.char.maxhp === 'number' && scene.char.maxhp > 0) ? scene.char.maxhp : Math.max(1, 100 + (scene.char.level || 1) * 10));
                const currentHp = (typeof scene.char.hp === 'number') ? scene.char.hp : maxhp;
                if (currentHp >= maxhp) {
                    if (scene._showToast) scene._showToast('Already at full health');
                } else {
                    scene.char.hp = Math.min(maxhp, currentHp + Number(def.healAmount || 0));
                    acted = true;
                    if (scene._showToast) scene._showToast(`${def.name || s.id} used (+${def.healAmount} HP)`);
                }
            }
        }
        // mana
        if (def.manaAmount) {
            try { console.log && console.log('[useItemFromSlot] manaAmount detected', def.manaAmount, 'usable?', def.usable); } catch(e) {}
            attempted = true;
            if (!def.usable) { if (scene._showToast) scene._showToast('Cannot use that item'); }
            else {
                let eff = null; try { if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(scene.char); } catch (e) {}
                const maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : ((typeof scene.char.maxmana === 'number' && scene.char.maxmana > 0) ? scene.char.maxmana : Math.max(0, Math.floor(50 + (scene.char.level || 1) * 5 + (((scene.char.stats && scene.char.stats.int) || 0) * 10))));
                const currentMana = (typeof scene.char.mana === 'number') ? scene.char.mana : maxmana;
                if (currentMana >= maxmana) {
                    if (scene._showToast) scene._showToast('Already at full mana');
                } else {
                    scene.char.mana = Math.min(maxmana, currentMana + Number(def.manaAmount || 0));
                    acted = true;
                    if (scene._showToast) scene._showToast(`${def.name || s.id} used (+${def.manaAmount} Mana)`);
                }
            }
        }
        // bag of gold or items that convert to gold via value
        if ((s.id === 'bag_of_gold' || (def && def.value && def.convertToGold)) && def.usable) {
            try { console.log && console.log('[useItemFromSlot] bag_of_gold or convertToGold used'); } catch(e) {}
            const goldGain = Number(def.value || 0);
            scene.char.gold = (typeof scene.char.gold === 'number') ? scene.char.gold + goldGain : goldGain;
            acted = true;
            if (scene._showToast) scene._showToast(`Gained ${goldGain} gold`);
        }
        // teleport scroll: move player to Town scene (persist first)
        if (s.id === 'teleport_scroll' && def.usable) {
            try { console.log && console.log('[useItemFromSlot] teleport_scroll used'); } catch(e) {}
            attempted = true;
            acted = true;
            if (scene._showToast) scene._showToast(`${def.name || s.id} used`);
            try {
                const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null;
                if (scene._persistCharacter) scene._persistCharacter(username);
            } catch (e) {}
            // schedule the scene transition after this function returns so inventory removal and persistence happen first
            try { setTimeout(() => { try { if (scene && scene.scene && typeof scene.scene.start === 'function') scene.scene.start('Town', { character: scene.char, username: (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null }); } catch(e) {} }, 80); } catch (e) {}
        }
        // buff items: apply temporary stat bonuses (def.buff expected: { statBonus: {...}, defense: n, duration: ms })
        if (def && def.usable && def.buff && (def.buff.statBonus || def.buff.defense || def.buff.duration)) {
            try { console.log && console.log('[useItemFromSlot] buff item used', def.buff); } catch(e) {}
            const duration = Number(def.buff.duration || 30000);
            const buffId = (s.id || 'buff') + '_' + Date.now() + '_' + Math.floor(Math.random()*9999);
            attempted = true;
            const buffObj = { id: buffId, source: s.id, statBonus: def.buff.statBonus || {}, defense: def.buff.defense || 0, expiresAt: Date.now() + duration };
            if (!scene.char._buffs) scene.char._buffs = [];
            scene.char._buffs.push(buffObj);
            acted = true;
            if (scene._showToast) scene._showToast(`${def.name || s.id} used (buff applied)`);
            // schedule buff removal using scene timer when possible
            try {
                if (scene.time && typeof scene.time.addEvent === 'function') {
                    scene.time.addEvent({ delay: duration, callback: () => {
                        try {
                            if (scene && scene.char && scene.char._buffs) {
                                scene.char._buffs = scene.char._buffs.filter(b => b && b.id !== buffId);
                            }
                        } catch (e) {}
                        try { if (scene._updateHUD) scene._updateHUD(); } catch(e) {}
                        try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) {}
                    } });
                } else {
                    // fallback: remove after timeout
                    setTimeout(() => { try { if (scene && scene.char && scene.char._buffs) scene.char._buffs = scene.char._buffs.filter(b => b && b.id !== buffId); } catch(e) {} try { if (scene._updateHUD) scene._updateHUD(); } catch(e) {} try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch(e) {} }, duration + 50);
                }
            } catch (e) {}
        }
        // If we applied an effect, consume one and refresh UI/HUD and persist
        if (acted) {
            // remove one from slot array
            removeItemFromSlots(scene.char.inventory, s.id, 1);
            // persist if available
            try { const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username); } catch (e) {}
            // refresh inventory modal and HUD if present
            try { if (scene._refreshInventoryModal) scene._refreshInventoryModal(); } catch(e) {}
            try { if (scene._updateHUD) scene._updateHUD(); else if (scene._createHUD) scene._createHUD(); } catch(e) {}
            // hide tooltip (avoid stale tooltip when slot removed)
            try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch(e) {}
            return true;
        }
        // If we attempted to use the item (it was usable) but it had no actionable effect
        // (for example HP was already full), treat the click as handled so the
        // inventory double-click does not fall back to equipping the item.
        if (attempted) return true;
    } catch (e) { console.warn('useItemFromSlot error', e); }
    return false;
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
    // Position: far right, vertically centered
    modal.style.right = '16px';
    modal.style.left = '';
    modal.style.top = '50%';
    modal.style.transform = 'translateY(-50%)';
    modal.style.zIndex = '230';
    modal.style.background = 'linear-gradient(135deg,#1a1a1f, #0f0f12)';
    modal.style.padding = '12px';
    modal.style.borderRadius = '12px';
    modal.style.color = '#fff';
    modal.style.minWidth = '420px';
    // include gold display in header so players can see current gold in inventory modal
    const currentGold = (char && typeof char.gold === 'number') ? char.gold : 0;
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:12px;'><div style='display:flex;align-items:center;gap:10px;'><strong>Inventory</strong><div style='display:inline-flex;align-items:center;gap:6px;background:rgba(0,0,0,0.25);padding:6px 8px;border-radius:8px;font-weight:700;color:#ffd27a;'>💰<span id='inv-gold'>${currentGold}</span></div></div><button id='inv-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='inv-items' class='grid-scroll'><div id='inv-grid' class='slot-grid'></div></div>`;
    document.body.appendChild(modal);
    scene._inventoryModal = modal;
    const closeBtn = modal.querySelector('#inv-close');
    if (closeBtn) closeBtn.onclick = () => closeInventoryModal(scene);
    // Auto-clean on scene shutdown
    try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { closeInventoryModal(scene); } catch (e) {} }); } catch (e) {}
    refreshInventoryModal(scene);
}

export function closeInventoryModal(scene) {
    if (!scene) return;
    if (scene._inventoryModal && scene._inventoryModal.parentNode) scene._inventoryModal.parentNode.removeChild(scene._inventoryModal);
    scene._inventoryModal = null;
    try {
        if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip();
    } catch (e) {}
    try { if (typeof hideStatTooltip === 'function') hideStatTooltip(); } catch (e) {}
    try { if (typeof hideSkillTooltip === 'function') hideSkillTooltip(); } catch (e) {}
}

export function refreshInventoryModal(scene) {
    if (!scene || !scene._inventoryModal) return;
    const grid = scene._inventoryModal.querySelector('#inv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const inv = scene.char.inventory = initSlots(scene.char.inventory);
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    // Attach a delegated click handler once per modal grid so clicks work reliably
    try {
        if (grid && !grid._invHandlerAttached) {
            const delegatedClick = (ev) => {
                // Normalize event target to an Element and find the nearest .slot.
                let target = ev.target;
                // If the initial target is not an Element (e.g. a Text node), walk up to a parent element.
                if (target && target.nodeType !== 1) target = target.parentElement;
                // If still not an Element, abort.
                if (!target || typeof target.closest !== 'function') return;
                // Find the slot element (may be the target itself or an ancestor)
                const slotEl = target.closest('.slot');
                if (!slotEl) return;
                const idx = Number(slotEl.dataset && slotEl.dataset.slotIndex);
                try { console.debug && console.debug('[inventory][delegated] clicked slot', { slotIndex: idx, item: (target && target.dataset && target.dataset.slotIndex) }); } catch(e) {}
                if (!isNaN(idx)) {
                    try {
                        // Do not call useItemFromSlot on single clicks — that prevents
                        // double-click (ondblclick) from being the reliable trigger for use/equip.
                        // Instead, focus the slot so keyboard Enter/Space can still trigger use.
                        if (slotEl && typeof slotEl.focus === 'function') slotEl.focus();
                    } catch (e) { try { console.warn && console.warn('[inventory][delegated] handler error', e); } catch(_) {} }
                }
            };
            grid.addEventListener('click', delegatedClick);
            // keyboard support for focused slot elements
            grid.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    const active = document.activeElement;
                    if (active && active.classList && active.classList.contains('slot')) {
                        ev.preventDefault();
                        const idx = Number(active.dataset && active.dataset.slotIndex);
                        if (!isNaN(idx) && window && window.__shared_ui && typeof window.__shared_ui.useItemFromSlot === 'function') {
                            try { const ok = window.__shared_ui.useItemFromSlot(scene, idx); try { console.debug && console.debug('[inventory][delegated] key use returned', ok); } catch(e) {} } catch(e) {}
                        }
                    }
                }
            });
            grid._invHandlerAttached = true;
        }
    } catch (e) { /* ignore delegation attach errors */ }
    // update gold display if present
    try { const goldEl = scene._inventoryModal.querySelector('#inv-gold'); if (goldEl) goldEl.textContent = '' + ((scene.char && scene.char.gold) ? scene.char.gold : 0); } catch (e) {}
    // render each slot
    for (let i = 0; i < inv.length; i++) {
        const s = inv[i];
    const slotEl = document.createElement('div'); slotEl.className = 'slot'; slotEl.dataset.slotIndex = i;
    // ensure the slot is positioned and sits above potential overlays so clicks/dblclicks reach it
    try { slotEl.style.position = slotEl.style.position || 'relative'; slotEl.style.zIndex = '20'; slotEl.style.userSelect = 'none'; } catch (e) {}
        if (s) {
            const def = defs && defs[s.id];
            let iconHtml = '📦';
            if (def) {
                if (def.icon) iconHtml = "<div class='icon-wrap'><img src='" + def.icon + "' class='item-icon' /></div>";
                else if (def.weapon) iconHtml = "<div class='icon-wrap'>⚔️</div>";
                else if (def.armor) iconHtml = "<div class='icon-wrap'>🛡️</div>";
            }
            const name = s.name || (def && def.name) || s.id;
            slotEl.innerHTML = "<div title='" + name + "'>" + iconHtml + "</div><div class='slot-label'>" + name + "</div>";
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
            // double-click: use consumable items or equip weapons/armor
            slotEl.ondblclick = () => {
                try {
                    const idx = Number(slotEl.dataset && slotEl.dataset.slotIndex);
                    try { console.log && console.log('[slot dblclick] idx', idx, 'itemId', (def && def.id) || (s && s.id)); } catch(e) {}
                    // If item is usable, attempt to use it first
                    if (def && def.usable && !isNaN(idx) && window && window.__shared_ui && typeof window.__shared_ui.useItemFromSlot === 'function') {
                        const used = window.__shared_ui.useItemFromSlot(scene, idx);
                        try { console.log && console.log('[slot dblclick] useItemFromSlot returned', used); } catch(e) {}
                        if (used) {
                            // refresh UI after use
                            try { refreshInventoryModal(scene); } catch(e) {}
                            try { refreshEquipmentModal(scene); } catch(e) {}
                            return;
                        }
                    }
                    // otherwise, if equippable, equip on double-click (legacy behavior)
                    // Treat items with explicit `slot`, `tool`, or classic `weapon`/`armor` as equippable
                    try {
                        const isEquippable = !!(def && (def.slot || def.tool || def.weapon || def.armor));
                        if (isEquippable) {
                            try {
                                equipItemFromInventory(scene, s.id);
                                try { refreshInventoryModal(scene); } catch(e) {}
                                try { refreshEquipmentModal(scene); } catch(e) {}
                                // verify equip succeeded: scan equipment for this id
                                const eq = scene.char && scene.char.equipment ? scene.char.equipment : {};
                                let found = false;
                                try { for (const k of Object.keys(eq||{})) { const v = eq[k]; if (v && v.id === s.id) { found = true; break; } } } catch(e) {}
                                if (found) {
                                    try { if (scene._showToast) scene._showToast(`Equipped ${def && def.name ? def.name : s.id}`); } catch(e) {}
                                } else {
                                    try { if (scene._showToast) scene._showToast(`Could not equip ${def && def.name ? def.name : s.id}`); } catch(e) {}
                                    try { console.warn && console.warn('[inventory] equip failed for', s.id, 'scene.char.equipment=', scene.char && scene.char.equipment); } catch(e) {}
                                }
                            } catch (e) { console.warn && console.warn('[inventory] equip-on-dblclick error', e); }
                        }
                    } catch (e) { console.warn && console.warn('[inventory] equip-on-dblclick error', e); }
                } catch (e) { console.warn && console.warn('[inventory] dblclick handler error', e); }
            };
            // single-click: keep existing behavior for inventory modal (no deposit here)
            // single-click: attempt to use consumable items (potions, bags of gold)
            // ensure slot is focusable and keyboard accessible; delegated grid handler will handle clicks
            try { slotEl.style.pointerEvents = 'auto'; } catch (e) {}
            try { slotEl.setAttribute('role', 'button'); slotEl.setAttribute('tabindex', '0'); } catch (e) {}
            // small per-slot key handler for accessibility (Enter/Space)
            try {
                slotEl.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        const idx = Number(slotEl.dataset && slotEl.dataset.slotIndex);
                        if (!isNaN(idx) && window && window.__shared_ui && typeof window.__shared_ui.useItemFromSlot === 'function') {
                            try { const ok = window.__shared_ui.useItemFromSlot(scene, idx); try { console.debug && console.debug('[inventory] slot key use returned', ok); } catch(e) {} } catch(e) {}
                        }
                    }
                });
            } catch (e) {}
            // Add a small 'Use' button for usable items (clicking stops propagation so it doesn't trigger dblclick)
            try {
                if (def && def.usable) {
                    const useBtn = document.createElement('button');
                    useBtn.className = 'use-btn';
                    useBtn.textContent = 'Use';
                    useBtn.style.cssText = 'position:absolute;left:6px;bottom:6px;background:#2b6be6;color:#fff;border:none;padding:4px 6px;border-radius:6px;cursor:pointer;font-size:12px;z-index:50;pointer-events:auto;';
                    useBtn.onclick = (ev) => {
                        ev.stopPropagation();
                        try {
                            const idx = Number(slotEl.dataset && slotEl.dataset.slotIndex);
                            if (isNaN(idx)) return;
                            console.log && console.log('[use-btn] clicked slot', idx, 'item', s && s.id);
                            // Call the local function directly (same as debug header) to avoid
                            // relying on window.__shared_ui being present or stale.
                            const ok = typeof useItemFromSlot === 'function' ? useItemFromSlot(scene, idx) : false;
                            console.log && console.log('[use-btn] useItemFromSlot returned', ok);
                            if (ok) {
                                try { refreshInventoryModal(scene); } catch (e) {}
                                try { refreshEquipmentModal(scene); } catch (e) {}
                            }
                        } catch (e) { console.warn && console.warn('[use-btn] error', e); }
                    };
                    slotEl.appendChild(useBtn);
                }
            } catch (e) {}
        }
        grid.appendChild(slotEl);
    }
}

// Equipment modal
export function openEquipmentModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    if (!char.equipment) char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null, fishing:null, mining:null, woodcutting:null };
    if (scene._equipmentModal) return;
    const modal = document.createElement('div');
    modal.id = 'equipment-modal';
    modal.style.position = 'fixed';
    // Position: far left, vertically centered
    modal.style.left = '16px';
    modal.style.top = '50%';
    modal.style.transform = 'translateY(-50%)';
    modal.style.zIndex = '235';
    modal.style.background = 'linear-gradient(135deg,#1a1a1f, #0f0f12)';
    modal.style.padding = '12px';
    modal.style.borderRadius = '12px';
    modal.style.color = '#fff';
    modal.style.minWidth = '360px';
    // Equipment grid (no details pane) — we will use the floating tooltip on hover
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Equipment</strong><button id='equip-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='equip-body' class='modal-body'><div class='equip-grid'><div class='equip-slots' id='equip-slots'></div></div></div>`;
    document.body.appendChild(modal);
    scene._equipmentModal = modal;
    const closeBtn = modal.querySelector('#equip-close'); if (closeBtn) closeBtn.onclick = () => closeEquipmentModal(scene);
    // Auto-clean on scene shutdown
    try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { closeEquipmentModal(scene); } catch (e) {} }); } catch (e) {}
    refreshEquipmentModal(scene);
}

export function closeEquipmentModal(scene) {
    if (!scene) return;
    if (scene._equipmentModal && scene._equipmentModal.parentNode) scene._equipmentModal.parentNode.removeChild(scene._equipmentModal);
    scene._equipmentModal = null;
    try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {}
    try { if (typeof hideStatTooltip === 'function') hideStatTooltip(); } catch (e) {}
    try { if (typeof hideSkillTooltip === 'function') hideSkillTooltip(); } catch (e) {}
}

export function refreshEquipmentModal(scene) {
    if (!scene || !scene._equipmentModal) return;
    const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
    const equip = scene.char.equipment || {};
    const slotOrder = ['ring1','head','ring2','amulet','armor','weapon','mining','fishing','woodcutting','legs','boots'];
    const slotsContainer = scene._equipmentModal.querySelector('#equip-slots');
    if (!slotsContainer) return;
    slotsContainer.innerHTML = '';
    // layout mapping to place slots in visually meaningful positions
    const slotDisplayNames = { weapon: 'Weapon', head: 'Head', armor: 'Body', amulet: 'Amulet', fishing: 'Fishing Rod', mining: 'Pickaxe', woodcutting: 'Hatchet', legs: 'Legs', boots: 'Boots', ring1: 'Ring', ring2: 'Ring' };
    for (const s of slotOrder) {
        const eq = equip[s];
        const slotEl = document.createElement('div'); slotEl.className = 'equip-slot';
        if (!eq) slotEl.classList.add('empty');
    // assign grid area so slots follow requested layout
    const areaMap = { head: 'head', weapon: 'weapon', amulet: 'amulet', armor: 'armor', fishing: 'fishing', mining: 'mining', woodcutting: 'woodcutting', ring1: 'ring1', ring2: 'ring2', legs: 'legs', boots: 'boots' };
        const area = areaMap[s] || null;
        if (area) slotEl.style.gridArea = area;
        const iconSpan = document.createElement('div'); iconSpan.className = 'slot-icon';
        const nameSpan = document.createElement('div'); nameSpan.className = 'slot-name';
        // determine icon and tooltipable name
        if (eq && defs && defs[eq.id]) {
            const d = defs[eq.id];
            if (d && d.icon) iconSpan.innerHTML = "<div class='icon-wrap'><img src='" + d.icon + "' class='item-icon' /></div>";
            else iconSpan.innerHTML = d.weapon ? '⚔️' : (d.armor ? '🛡️' : '📦');
            nameSpan.textContent = d.name || eq.name || eq.id;
            // apply rarity tint via class or inline border color
            try {
                const rarity = (d && d.rarity) || 'common';
                const className = 'slot-rarity-' + (rarity || 'common');
                slotEl.classList.add(className);
                // fallback: if RARITY_COLORS is defined, set a subtle border tint using that color
                if (typeof RARITY_COLORS !== 'undefined' && RARITY_COLORS[rarity]) {
                    const c = RARITY_COLORS[rarity];
                    // use a translucent border color derived from the rarity tint
                    slotEl.style.borderColor = c.replace('0.9', '0.45');
                }
            } catch (e) {}
            // restore floating tooltip on hover/click
            slotEl.addEventListener('mouseenter', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(scene, eq, slotEl); } catch(e) {} });
            slotEl.addEventListener('mouseleave', () => { try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch(e) {} });
            slotEl.addEventListener('click', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(scene, eq, slotEl); } catch(e) {} });
        } else {
            iconSpan.innerHTML = '—';
            nameSpan.textContent = slotDisplayNames[s] || s;
            slotEl.addEventListener('mouseenter', () => { try { if (window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(scene, { id: null, name: slotDisplayNames[s] || s, description: '' }, slotEl); } catch(e) {} });
            slotEl.addEventListener('mouseleave', () => { try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch(e) {} });
        }
        slotEl.appendChild(iconSpan); slotEl.appendChild(nameSpan);
        // unequip button when occupied
        if (eq) {
            const btn = document.createElement('button'); btn.className = 'unequip-btn'; btn.textContent = 'Unequip';
            btn.onclick = (ev) => { ev.stopPropagation(); unequipItem(scene, s); refreshEquipmentModal(scene); refreshInventoryModal(scene); };
            slotEl.appendChild(btn);
        }
        // clicking the slot focuses details (simulate hover)
        slotEl.onclick = () => { try { if (eq && window && window.__shared_ui && window.__shared_ui.showItemTooltip) window.__shared_ui.showItemTooltip(scene, eq, slotEl); } catch(e) {} };
        slotsContainer.appendChild(slotEl);
    }
}

// Quest Log modal
export function openQuestLogModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    if (!char.activeQuests) char.activeQuests = [];
    if (!char.completedQuests) char.completedQuests = [];
    if (scene._questLogModal) return;
    const modal = document.createElement('div');
    modal.id = 'quest-log-modal';
    modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%,-50%)'; modal.style.zIndex = '240';
    modal.style.background = 'linear-gradient(135deg,#1a1a1f, #0f0f12)'; modal.style.color = '#fff'; modal.style.padding = '14px'; modal.style.borderRadius = '12px'; modal.style.minWidth = '400px'; modal.style.maxWidth = '600px'; modal.style.maxHeight = '80vh'; modal.style.overflowY = 'auto';
    modal.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'><strong>Quest Log</strong><button id='quest-log-close' style='background:#222;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button></div><div id='quest-log-body'></div>`;
    document.body.appendChild(modal);
    scene._questLogModal = modal;
    modal.querySelector('#quest-log-close').onclick = () => closeQuestLogModal(scene);
    // Auto-clean on scene shutdown
    try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { closeQuestLogModal(scene); } catch (e) {} }); } catch (e) {}
    refreshQuestLogModal(scene);
}

export function closeQuestLogModal(scene) {
    if (!scene) return;
    if (scene._questLogModal && scene._questLogModal.parentNode) scene._questLogModal.parentNode.removeChild(scene._questLogModal);
    scene._questLogModal = null;
    try { if (typeof hideStatTooltip === 'function') hideStatTooltip(); } catch (e) {}
    try { if (typeof hideSkillTooltip === 'function') hideSkillTooltip(); } catch (e) {}
}

export function refreshQuestLogModal(scene) {
    if (!scene || !scene._questLogModal) return;
    const body = scene._questLogModal.querySelector('#quest-log-body');
    body.innerHTML = '';
    const char = scene.char || {};
    const active = char.activeQuests || [];
    const completed = char.completedQuests || [];
    const quests = (window && window.QUEST_DEFS) ? window.QUEST_DEFS : {};
    const objectiveStateFn = (window && window.getQuestObjectiveState) ? window.getQuestObjectiveState : null;

    if (active.length > 0) {
        body.innerHTML += '<h4 style="margin:0 0 8px 0; color:#ffd27a;">Active Quests</h4>';
        for (const q of active) {
            const questId = (q && q.id) ? q.id : q;
            const def = quests[questId];
            const div = document.createElement('div');
            div.style.cssText = 'margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.02); border-radius:8px;';
            let inner = `<strong>${(def && def.name) || questId}</strong>`;
            const description = def && def.description ? def.description : '';
            if (description) inner += `<br><small>${description}</small>`;
            const progressStates = objectiveStateFn ? objectiveStateFn(scene.char, questId) : null;
            const rawProgress = Array.isArray(q && q.progress) ? q.progress : [];
            const objectives = Array.isArray(def && def.objectives) ? def.objectives : [];
            if (objectives.length > 0) {
                for (const obj of objectives) {
                    const targetId = obj.itemId || obj.enemyId || obj.id || obj.type;
                    let current = 0;
                    let required = obj.required || 1;
                    if (Array.isArray(progressStates)) {
                        const state = progressStates.find(s => s && s.type === obj.type && (targetId ? s.itemId === targetId : true));
                        if (state) {
                            required = state.required || required;
                            current = Math.min(state.current || 0, required);
                        }
                    } else {
                        const progressEntry = rawProgress.find(p => p && p.type === obj.type && (!targetId || p.itemId === targetId));
                        current = progressEntry && typeof progressEntry.current === 'number' ? progressEntry.current : 0;
                        required = progressEntry && typeof progressEntry.required === 'number' ? progressEntry.required : required;
                    }
                    inner += `<br><small>- ${obj.description || obj.type}: ${current} / ${required}</small>`;
                }
            } else if (rawProgress.length > 0) {
                for (const prog of rawProgress) {
                    const label = prog && (prog.itemId || prog.type) ? (prog.itemId || prog.type) : 'Objective';
                    const current = prog && typeof prog.current === 'number' ? prog.current : 0;
                    const required = prog && typeof prog.required === 'number' ? prog.required : 1;
                    inner += `<br><small>- ${label}: ${current} / ${required}</small>`;
                }
            }
            div.innerHTML = inner;
            body.appendChild(div);
        }
    } else {
        body.innerHTML += '<p style="color:#ccc;">No active quests.</p>';
    }

    if (completed.length > 0) {
        body.innerHTML += '<h4 style="margin:16px 0 8px 0; color:#8ef58a;">Completed Quests</h4>';
        for (const entry of completed) {
            const questId = (entry && entry.id) ? entry.id : entry;
            const def = quests[questId];
            const div = document.createElement('div');
            div.style.cssText = 'margin-bottom:8px; padding:6px; background:rgba(255,255,255,0.01); border-radius:6px;';
            div.innerHTML = `<strong style="color:#8ef58a;">${def ? def.name || questId : questId}</strong>`;
            body.appendChild(div);
        }
    }
}

// Stats modal
export function openStatsModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    if (!char.stats) char.stats = { str:0,int:0,agi:0,luk:0 };
    if (!char.mining) char.mining = { level:1, exp:0, expToLevel:100 };
    if (!char.smithing) char.smithing = { level:1, exp:0, expToLevel:100 };
    if (!char.woodcutting) char.woodcutting = { level:1, exp:0, expToLevel:100 };
    if (!char.cooking) char.cooking = { level:1, exp:0, expToLevel:100 };
    if (scene._statsModal) return;
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    // compact, themed modal centered on screen
    modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%,-50%)'; modal.style.zIndex = '240';
    modal.style.background = 'linear-gradient(180deg, rgba(12,12,14,0.98), rgba(18,18,20,0.98))';
    modal.style.color = '#efecea'; modal.style.padding = '12px'; modal.style.borderRadius = '8px';
    modal.style.minWidth = '420px'; modal.style.maxWidth = 'min(640px, 94vw)'; modal.style.maxHeight = '72vh'; modal.style.overflowY = 'auto'; modal.style.border = '3px solid #111'; modal.style.borderLeft = '8px solid rgba(120,20,20,0.95)';
    modal.innerHTML = `
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:12px;'>
            <div style="font-family:'Metal Mania', cursive; font-size:1.4rem; color:#f0c9b0;">Stats & Skills</div>
            <button id='stats-close' style='background:transparent;color:#bdbdbd;border:1px solid rgba(255,255,255,0.04);padding:6px 8px;border-radius:6px;cursor:pointer;'>Close</button>
        </div>
        <!-- Grid layout: top row = stats | skills ; bottom row = vitals & modifiers (spans full width) -->
        <div id='stats-body' style='display:grid;grid-template-columns: 240px 1fr;grid-template-rows: auto auto;gap:12px;align-items:start;'>
            <div id='stats-list' style='grid-column:1;grid-row:1; display:flex;flex-direction:column;gap:8px;'></div>
            <div id='skills-list' style='grid-column:2;grid-row:1; display:flex;flex-direction:column;gap:8px; min-width:180px;'></div>
            <div id='stats-bottom' style='grid-column:1 / span 2; grid-row:2; display:flex;flex-direction:column;gap:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.03);'></div>
        </div>
    `;
    document.body.appendChild(modal);
    scene._statsModal = modal;
    modal.querySelector('#stats-close').onclick = () => closeStatsModal(scene);
    // Auto-clean on scene shutdown
    try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { closeStatsModal(scene); } catch (e) {} }); } catch (e) {}
    refreshStatsModal(scene);
}

export function closeStatsModal(scene) {
    if (!scene) return;
    if (scene._statsModal && scene._statsModal.parentNode) scene._statsModal.parentNode.removeChild(scene._statsModal);
    scene._statsModal = null;
    try { if (window && window.__shared_ui && window.__shared_ui.hideItemTooltip) window.__shared_ui.hideItemTooltip(); } catch (e) {}
    try { if (typeof hideStatTooltip === 'function') hideStatTooltip(); } catch (e) {}
    try { if (typeof hideSkillTooltip === 'function') hideSkillTooltip(); } catch (e) {}
}

export function refreshStatsModal(scene) {
    if (!scene || !scene._statsModal) return;
    const container = scene._statsModal.querySelector('#stats-list');
    const skills = scene._statsModal.querySelector('#skills-list');
    container.innerHTML = ''; skills.innerHTML = '';
    const char = scene.char || {};
    try { console.debug && console.debug('[refreshStatsModal] char.woodcutting =', char.woodcutting); } catch(e) {}
    // Defensive init: ensure woodcutting exists so UI can always render it
    if (!char.woodcutting) char.woodcutting = { level:1, exp:0, expToLevel:100 };
    const eff = effectiveStats(char);
    container.innerHTML += makeStatPill('STR', eff.str);
    container.innerHTML += makeStatPill('INT', eff.int);
    container.innerHTML += makeStatPill('AGI', eff.agi);
    container.innerHTML += makeStatPill('LUK', eff.luk);
    container.innerHTML += makeStatPill('DEF', eff.defense);
    // Attach hover tooltips to stat pills to show breakdowns (equipment, talents, buffs)
    try {
        const pills = (scene && scene._statsModal && scene._statsModal.querySelectorAll) ? scene._statsModal.querySelectorAll('.stat-pill') : [];
        const talentMods = (char && char._talentModifiers) ? char._talentModifiers : (typeof computeTalentModifiers === 'function' ? computeTalentModifiers(char) : (char && char._talentModifiers) || {});
        for (const p of pills) {
            try {
                const lbl = (p.textContent || '').split(':')[0].trim();
                p.addEventListener('mouseenter', (ev) => {
                    try {
                        const lines = [];
                        // Base stat
                        const key = lbl.toLowerCase();
                        // Base value: authoritative base from char.stats (primary) or 0
                        const baseVal = (char && char.stats && typeof char.stats[key] === 'number') ? char.stats[key] : 0;
                        lines.push(`Base: ${baseVal}`);
                        // Equipment total (from reconcileEquipmentBonuses) and per-item contributions
                        const equipTotals = (char && char._equipBonuses) ? char._equipBonuses : {};
                        const equipTotalForKey = (typeof equipTotals[key] === 'number') ? equipTotals[key] : ((key === 'def' || key === 'defense') ? ((equipTotals.defense || 0)) : 0);
                        if (equipTotalForKey) lines.push(`Equipment: ${equipTotalForKey}`);
                        // Equipment contributions (per-item)
                        try {
                            if (char && char.equipment) {
                                const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                                for (const slot of Object.keys(char.equipment || {})) {
                                    const it = char.equipment[slot];
                                    if (!it || !it.id) continue;
                                    const idef = defs[it.id] || null;
                                    if (!idef) continue;
                                    // Use buildStatLines for basic stat/dmg/def lines and also inspect custom keys (lifesteal, attackSpeed)
                                    const sl = buildStatLines(idef) || [];
                                    for (const s of sl) {
                                        if (s.toUpperCase().indexOf(lbl.toUpperCase()) !== -1) lines.push(`${s} (from ${idef.name || it.id})`);
                                    }
                                    // inspect other possible properties on item defs for non-standard bonuses
                                    try {
                                        if ((lbl.toLowerCase() === 'lifesteal') && (typeof idef.lifestealPercent === 'number' || typeof idef.lifesteal === 'number')) {
                                            const v = (typeof idef.lifestealPercent === 'number') ? idef.lifestealPercent : idef.lifesteal;
                                            lines.push(`+${v}% Lifesteal (from ${idef.name || it.id})`);
                                        }
                                        if ((lbl.toLowerCase() === 'attack speed' || lbl.toLowerCase() === 'attack_speed') && (typeof idef.attackSpeedPercent === 'number')) {
                                            lines.push(`+${idef.attackSpeedPercent}% Attack Speed (from ${idef.name || it.id})`);
                                        }
                                    } catch (e) {}
                                }
                            }
                        } catch (e) {}
                        // Buffs
                        try {
                            const buffs = Array.isArray(char._buffs) ? char._buffs : (Array.isArray(char.buffs) ? char.buffs : []);
                            for (const b of buffs) {
                                if (!b) continue;
                                if (b.statBonus && b.statBonus[key]) lines.push(`+${b.statBonus[key]} ${lbl} (buff)`);
                            }
                        } catch (e) {}
                        // Talent aggregated modifiers
                        try {
                            if (talentMods && talentMods[key]) {
                                const tmod = talentMods[key] || {};
                                if (tmod.flat) lines.push((tmod.flat>=0?'+':'')+tmod.flat+` ${lbl} (talents)`);
                                if (tmod.percent) lines.push((tmod.percent>=0?'+':'')+tmod.percent+`% ${lbl} (talents %)`);
                            }
                        } catch (e) {}
                        // Final effective value
                        const final = eff && typeof eff[key] !== 'undefined' ? eff[key] : (baseVal || 0);
                        lines.push(`Final: ${final}`);
                        showStatTooltip(scene, lbl, lines, p);
                    } catch (e) {}
                });
                p.addEventListener('mouseleave', () => { try { hideStatTooltip(); } catch (e) {} });
            } catch (e) {}
        }
    } catch (e) {}
    // Derived vitals panel (HP/Mana, regen, attack speed, damage estimates, fishing)
    try {
    // remove previously injected vitals panel if present to avoid duplicates when refreshing
    try { const prev = scene._statsModal && scene._statsModal.querySelector && scene._statsModal.querySelector('#stats-vitals'); if (prev && prev.parentNode) prev.parentNode.removeChild(prev); } catch (e) {}
    const vitals = document.createElement('div');
    vitals.id = 'stats-vitals';
        vitals.style.display = 'flex';
        vitals.style.flexDirection = 'column';
        vitals.style.gap = '6px';
        vitals.style.marginTop = '8px';

        const hpCur = (typeof char.hp === 'number') ? char.hp : (eff.maxhp || 0);
        const manaCur = (typeof char.mana === 'number') ? char.mana : (eff.maxmana || 0);

        // Simple bar rows
        const makeBarRow = (label, cur, max, color) => {
            const row = document.createElement('div'); row.style.display = 'flex'; row.style.flexDirection = 'column';
            const lbl = document.createElement('div'); lbl.style.fontSize = '13px'; lbl.style.fontWeight = '700'; lbl.style.marginBottom = '4px'; lbl.textContent = `${label}: ${cur}/${max}`;
            const bg = document.createElement('div'); bg.style.height = '10px'; bg.style.background = 'rgba(0,0,0,0.25)'; bg.style.borderRadius = '6px'; bg.style.overflow = 'hidden';
            const fg = document.createElement('div'); fg.style.height = '100%'; fg.style.width = (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0) + '%'; fg.style.background = color || '#888'; fg.style.transition = 'width 180ms linear';
            bg.appendChild(fg); row.appendChild(lbl); row.appendChild(bg);
            return row;
        };

        vitals.appendChild(makeBarRow('HP', hpCur, eff.maxhp || 1, '#e44'));
        vitals.appendChild(makeBarRow('Mana', manaCur, eff.maxmana || 1, '#44e'));

        // Derived stats grid
        const grid = document.createElement('div'); grid.style.display = 'grid'; grid.style.gridTemplateColumns = 'repeat(2, minmax(0,1fr))'; grid.style.gap = '6px'; grid.style.marginTop = '6px';

    // Prefer scene-level active modifiers (e.g. Unholy Frenzy toggling scene.attackCooldown) when present.
    const atkMs = (scene && scene._frenzyActive && typeof scene.attackCooldown === 'number') ? scene.attackCooldown : ((eff && typeof eff.attackSpeedMs === 'number') ? eff.attackSpeedMs : 1000);
        const atkPerSec = (atkMs > 0) ? (1000 / atkMs) : 0;
    // Base melee estimate (kept simple) then we augment with talent weaponDamage and goldWeaponDamage for display
    let meleeDmgEst = Math.round(8 + ((eff && eff.str) || 0) * 2);
        try {
            const talentMods = (char && char._talentModifiers) ? char._talentModifiers : {};
            const wmod = talentMods['weaponDamage'] || null;
            if (wmod) {
                const flat = Number(wmod.flat || 0);
                const pct = Number(wmod.percent || 0);
                meleeDmgEst = Math.max(1, Math.round((meleeDmgEst + flat) * (1 + (pct / 100))));
            }
            const gw = talentMods['goldWeaponDamage'] || null;
            if (gw && char && typeof char.gold === 'number' && char.gold >= 10) {
                const flatPerPower = Number(gw.flat || 0);
                if (flatPerPower) {
                    const power = Math.floor(Math.log10(Math.max(1, char.gold)));
                    if (power > 0) meleeDmgEst += Math.round(power * flatPerPower);
                }
            }
        } catch (e) {}
        const spellDmgEst = Math.round(6 + ((eff && eff.int) || 0) * 2);

        // Detect if the equipped weapon is a staff so the UI can show that auto-attacks
        // are treated as spell damage (staffs scale off INT in combat).
        let isStaffEquipped = false;
        let weaponDefForUI = null;
        try {
            const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
            const we = (char && char.equipment && char.equipment.weapon) ? char.equipment.weapon : null;
            if (we && we.id && itemDefs[we.id]) weaponDefForUI = itemDefs[we.id];
            isStaffEquipped = !!(weaponDefForUI && (weaponDefForUI.weaponType === 'staff' || /staff/i.test(weaponDefForUI.id || '') || /staff/i.test(weaponDefForUI.name || '')));
        } catch (e) { isStaffEquipped = false; }

        // Compute an Auto Attack estimate that mirrors combat: use INT scaling when a staff is equipped,
        // otherwise use the melee estimate. Apply weaponDamage and goldWeaponDamage talent modifiers
        // for display consistency with combat calculations.
        let autoAttackEst = meleeDmgEst;
        try {
            if (isStaffEquipped) {
                const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                let weaponMin = 6, weaponMax = 10;
                if (weaponDefForUI && Array.isArray(weaponDefForUI.damage) && weaponDefForUI.damage.length >= 2) {
                    weaponMin = Number(weaponDefForUI.damage[0]) || weaponMin;
                    weaponMax = Number(weaponDefForUI.damage[1]) || weaponMax;
                }
                const avgWeapon = Math.round((weaponMin + weaponMax) / 2);
                const intPrimary = (eff && typeof eff.int === 'number') ? eff.int : 0;
                let base = avgWeapon + (intPrimary * 2);
                if (!weaponDefForUI || !Array.isArray(weaponDefForUI.damage) || weaponDefForUI.damage.length < 2) base = Math.max(8, (intPrimary * 2) + 6);
                // apply talent mods like combat
                const talentMods = (char && char._talentModifiers) ? char._talentModifiers : {};
                const wmod = talentMods['weaponDamage'] || null;
                if (wmod) {
                    const flat = Number(wmod.flat || 0);
                    const pct = Number(wmod.percent || 0);
                    base = Math.max(1, Math.round((base + flat) * (1 + (pct / 100))));
                }
                const gw = talentMods['goldWeaponDamage'] || null;
                if (gw && char && typeof char.gold === 'number' && char.gold >= 10) {
                    const flatPerPower = Number(gw.flat || 0);
                    if (flatPerPower) {
                        const power = Math.floor(Math.log10(Math.max(1, char.gold)));
                        if (power > 0) base += Math.round(power * flatPerPower);
                    }
                }
                autoAttackEst = Math.max(1, Math.round(base));
            } else {
                autoAttackEst = meleeDmgEst;
            }
        } catch (e) { autoAttackEst = meleeDmgEst; }

    const makeCell = (title, body) => { const c = document.createElement('div'); c.className = 'stat-grid-cell'; c.style.background = 'rgba(255,255,255,0.02)'; c.style.padding = '8px'; c.style.borderRadius = '8px'; c.style.fontSize = '13px'; c.innerHTML = `<div style='font-weight:800;margin-bottom:6px;'>${title}</div><div style='color:rgba(255,255,255,0.88)'>${body}</div>`; return c; };

    grid.appendChild(makeCell('Attack Speed', `${atkMs} ms (${atkPerSec.toFixed(2)} atk/s)`));
    grid.appendChild(makeCell('Defense', `${(eff && eff.defense) || 0}`));
    // Show a single Auto Attack estimate which will represent melee or staff-based spell auto-attacks.
    grid.appendChild(makeCell('Auto Attack ≈', `${autoAttackEst}`));
    grid.appendChild(makeCell('Spell DMG ≈', `${spellDmgEst}`));
    // Crits & sustain
    grid.appendChild(makeCell('Crit Chance', `${(eff && typeof eff.critChance === 'number') ? eff.critChance + '%' : '0%'}`));
    grid.appendChild(makeCell('Crit Damage', `${(eff && typeof eff.critDmgPercent === 'number') ? eff.critDmgPercent + '%' : '150%'}`));
    grid.appendChild(makeCell('Lifesteal', `${(eff && typeof eff.lifestealPercent === 'number') ? eff.lifestealPercent + '%' : '0%'}`));
    grid.appendChild(makeCell('HP Regen', `${(eff && eff.hpRegen) || 0}/s`));
    grid.appendChild(makeCell('Mana Regen', `${(eff && eff.manaRegen) || 0}/s`));
    // Show computed movement speed (from effectiveStats)
    grid.appendChild(makeCell('MS', `${(eff && typeof eff.movementSpeed === 'number') ? eff.movementSpeed : 'N/A'} move speed`));
    // Additional talent-aware summaries
    try {
        const mods = char._talentModifiers || {};
        const dr = mods['damageReduction'] || {};
        const drText = (dr.flat ? (dr.flat>0?'+':'')+dr.flat : '') + (dr.percent ? (' ' + dr.percent + '%') : '');
        grid.appendChild(makeCell('Damage Reduction', drText || '0'));
        const critLs = mods['critLifesteal'] || {};
        const critLsText = (critLs.flat ? (critLs.flat>0?'+':'')+critLs.flat : '') + (critLs.percent ? (' ' + critLs.percent + '%') : '');
        grid.appendChild(makeCell('Crit Lifesteal', critLsText || '0%'));
        const gdr = mods['goldDropRate'] || mods['goldDrop'] || {};
        const gdrText = (gdr.flat ? (gdr.flat>0?'+':'')+gdr.flat : '') + (gdr.percent ? (' ' + gdr.percent + '%') : '');
        grid.appendChild(makeCell('Gold Drop Rate', gdrText || '0%'));
    } catch (e) {}

    vitals.appendChild(grid);

        // Talent modifiers quick summary (if present)
        try {
            const mods = char._talentModifiers || {};
            const keys = Object.keys(mods || {});
            if (keys.length) {
                const modBox = document.createElement('div'); modBox.style.marginTop = '8px'; modBox.style.padding = '8px'; modBox.style.borderRadius = '8px'; modBox.style.background = 'rgba(0,0,0,0.12)';
                const title = document.createElement('div'); title.style.fontWeight = '800'; title.style.marginBottom = '6px'; title.textContent = 'Talent Modifiers'; modBox.appendChild(title);
                const list = document.createElement('div'); list.style.display = 'flex'; list.style.flexWrap = 'wrap'; list.style.gap = '6px';
                for (const k of keys.slice(0,8)) {
                    const v = mods[k] || {}; const text = `${k}: ${v.flat ? (v.flat>0?'+':'')+v.flat : ''}${v.percent ? (v.percent? ' ' + v.percent + '%' : '') : ''}`.trim();
                    const pill = document.createElement('div'); pill.style.padding = '4px 8px'; pill.style.borderRadius = '999px'; pill.style.background = 'rgba(255,255,255,0.03)'; pill.style.fontSize = '12px'; pill.textContent = text || k;
                    list.appendChild(pill);
                }
                modBox.appendChild(list);
                vitals.appendChild(modBox);
            }
        } catch (e) {}

        // insert vitals panel into the bottom row container (stats-bottom)
        try {
            const bottom = scene._statsModal.querySelector && scene._statsModal.querySelector('#stats-bottom');
            if (bottom) bottom.appendChild(vitals); else if (container && container.parentNode) container.parentNode.insertBefore(vitals, container.nextSibling); else container.appendChild(vitals);
        } catch (e) {}

        // attach hover tooltips to derived stat cells (attack speed, dmg, crits, etc.)
        try {
            const bottom = scene._statsModal && scene._statsModal.querySelector ? scene._statsModal.querySelector('#stats-bottom') : null;
            const cells = bottom ? bottom.querySelectorAll('.stat-grid-cell') : [];
            const talentMods = (char && char._talentModifiers) ? char._talentModifiers : {};
            for (const c of cells) {
                try {
                    const titleEl = c.querySelector && c.querySelector('div');
                    const title = titleEl ? (titleEl.textContent || '').trim() : '';
                    c.addEventListener('mouseenter', () => {
                        try {
                            const lines = [];
                            if (title.indexOf('Attack Speed') !== -1) {
                                const baseMs = Math.max(120, Math.floor(1000 * (1 - Math.max(0, Math.min(0.4, ((eff && eff.agi) || 0) / 250)))));
                                lines.push(`Base (from AGI): ${baseMs} ms`);
                                const atk = talentMods['attackSpeed'] || null;
                                if (atk && atk.percent) lines.push(`Talents: ${atk.percent}% faster (${atk.percent}% attack speed)`);
                                if (atk && atk.flat) lines.push(`Talents: flat ${atk.flat} ms`);
                                lines.push(`Final: ${eff.attackSpeedMs} ms`);
                                    } else if (title.indexOf('Defense') !== -1) {
                                                // Base defense is character defenseBonus (not including equipment)
                                                const baseDef = (char && typeof char.defenseBonus === 'number') ? char.defenseBonus : 0;
                                                lines.push(`Base: ${baseDef}`);
                                                const equipDef = (char && char._equipBonuses && typeof char._equipBonuses.defense === 'number') ? char._equipBonuses.defense : 0;
                                                if (equipDef) lines.push(`Equipment: +${equipDef} DEF`);
                                // list per-item defense if available
                                                try { if (char && char.equipment) { const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {}; for (const s of Object.keys(char.equipment||{})) { const it = char.equipment[s]; if (!it || !it.id) continue; const idef = defs[it.id]||null; if (!idef) continue; const sl = buildStatLines(idef)||[]; for (const li of sl) { if (li.indexOf('DEF')!==-1) lines.push(`${li} (from ${idef.name||it.id})`); } } } } catch (e) {}
                                                const t = talentMods['defense'] || null; if (t && (t.flat||t.percent)) { if (t.flat) lines.push((t.flat>=0?'+':'')+t.flat+` DEF (talents)`); if (t.percent) lines.push((t.percent>=0?'+':'')+t.percent+`% DEF (talents %)`); }
                                                lines.push(`Final: ${eff.defense}`);
                            } else if (title.indexOf('Auto Attack') !== -1) {
                                // Auto Attack tooltip: adapt based on whether a staff is equipped
                                try {
                                    const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                                    const we = (char && char.equipment && char.equipment.weapon) ? char.equipment.weapon : null;
                                    const idef = (we && we.id && itemDefs[we.id]) ? itemDefs[we.id] : null;
                                    // list weapon/item stat lines if any
                                    try { if (char && char.equipment) { const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {}; for (const s of Object.keys(char.equipment||{})) { const it = char.equipment[s]; if (!it || !it.id) continue; const idef2 = defs[it.id]||null; if (!idef2) continue; const sl = buildStatLines(idef2)||[]; for (const li of sl) { if (li.indexOf('DMG')!==-1 || li.indexOf('DMG:')!==-1 || li.toLowerCase().indexOf('weapon')!==-1) lines.push(`${li} (from ${idef2.name||it.id})`); } } } } catch (e) {}
                                } catch (e) {}
                                // If staff equipped, show INT scaling and applied talent mods; otherwise show STR scaling info
                                try {
                                    const mods = char._talentModifiers || {};
                                    if (isStaffEquipped) {
                                        lines.push(`Staff treated as Spell: INT scaling: +${(eff && eff.int) ? (eff.int*2) : 0} approx`);
                                        // compute estimate similar to UI autoAttackEst logic
                                        const weaponMin = (idef && Array.isArray(idef.damage) && idef.damage.length>=2) ? Number(idef.damage[0]) : 6;
                                        const weaponMax = (idef && Array.isArray(idef.damage) && idef.damage.length>=2) ? Number(idef.damage[1]) : 10;
                                        const avgWeapon = Math.round((weaponMin + weaponMax) / 2);
                                        const intPrimary = (eff && typeof eff.int === 'number') ? eff.int : 0;
                                        let est = avgWeapon + (intPrimary * 2);
                                        if (!idef || !Array.isArray(idef.damage) || idef.damage.length < 2) est = Math.max(8, (intPrimary * 2) + 6);
                                        const wmod = mods['weaponDamage'] || null;
                                        if (wmod) {
                                            const flat = Number(wmod.flat || 0);
                                            const pct = Number(wmod.percent || 0);
                                            est = Math.max(1, Math.round((est + flat) * (1 + (pct / 100))));
                                            if (flat) lines.push(`+${flat} DMG (weapon talent flat)`);
                                            if (pct) lines.push(`+${pct}% DMG (weapon talent %)`);
                                        }
                                        const gw = mods['goldWeaponDamage'] || null;
                                        if (gw && char && typeof char.gold === 'number' && char.gold >= 10) {
                                            const flatPerPower = Number(gw.flat || 0);
                                            if (flatPerPower) {
                                                const power = Math.floor(Math.log10(Math.max(1, char.gold)));
                                                if (power > 0) {
                                                    const add = Math.round(power * flatPerPower);
                                                    est += add;
                                                    lines.push(`+${add} DMG (gold weapon bonus for ${char.gold} gold)`);
                                                }
                                            }
                                        }
                                        lines.push(`Estimate: ${est}`);
                                    } else {
                                        // melee path
                                        lines.push(`STR scaling: +${(eff && eff.str) ? (eff.str*2) : 0} approx`);
                                        const baseEst = Math.round(8 + ((eff && eff.str) || 0) * 2);
                                        let est = baseEst;
                                        const wmod = mods['weaponDamage'] || null;
                                        if (wmod) {
                                            const flat = Number(wmod.flat || 0);
                                            const pct = Number(wmod.percent || 0);
                                            est = Math.max(1, Math.round((est + flat) * (1 + (pct / 100))));
                                            if (flat) lines.push(`+${flat} DMG (weapon talent flat)`);
                                            if (pct) lines.push(`+${pct}% DMG (weapon talent %)`);
                                        }
                                        const gw = mods['goldWeaponDamage'] || null;
                                        if (gw && char && typeof char.gold === 'number' && char.gold >= 10) {
                                            const flatPerPower = Number(gw.flat || 0);
                                            if (flatPerPower) {
                                                const power = Math.floor(Math.log10(Math.max(1, char.gold)));
                                                if (power > 0) {
                                                    const add = Math.round(power * flatPerPower);
                                                    est += add;
                                                    lines.push(`+${add} DMG (gold weapon bonus for ${char.gold} gold)`);
                                                }
                                            }
                                        }
                                        lines.push(`Estimate: ${est}`);
                                    }
                                } catch (e) { lines.push(`Estimate: ${isStaffEquipped ? spellDmgEst : Math.round(8 + ((eff && eff.str) || 0) * 2)}`); }
                            } else if (title.indexOf('Spell DMG') !== -1) {
                                lines.push(`INT scaling: +${(eff && eff.int) ? (eff.int*2) : 0} approx`);
                                lines.push(`Estimate: ${Math.round(6 + ((eff && eff.int) || 0) * 2)}`);
                            } else if (title.indexOf('Crit Chance') !== -1) {
                                const baseCrit = Math.max(0, Math.min(95, Math.round(((eff && eff.luk)||0) * 0.5 + ((eff && eff.agi)||0) * 0.15)));
                                lines.push(`Base: ${baseCrit}% (LUK + AGI)`);
                                const t = talentMods['critChance'] || null; if (t && (t.flat||t.percent)) { if (t.flat) lines.push((t.flat>=0?'+':'')+t.flat+`% (talents)`); if (t.percent) lines.push((t.percent>=0?'+':'')+t.percent+`% (talents)`); }
                                lines.push(`Final: ${eff.critChance}%`);
                            } else if (title.indexOf('Crit Damage') !== -1) {
                                lines.push(`Base: ${Math.max(100, Math.floor(150 + ((eff && eff.luk)||0) * 1.2))}%`);
                                const t = talentMods['critDmg'] || talentMods['critDamage'] || null; if (t && (t.flat||t.percent)) { if (t.flat) lines.push((t.flat>=0?'+':'')+t.flat+`% (talents)`); if (t.percent) lines.push((t.percent>=0?'+':'')+t.percent+`% (talents)`); }
                                lines.push(`Final: ${eff.critDmgPercent}%`);
                            } else if (title.indexOf('Lifesteal') !== -1) {
                                // Lifesteal: gather from talents and equipment/buffs
                                const baseLs = 0;
                                lines.push(`Base: ${baseLs}%`);
                                // equipment lifesteal from item defs (lifestealPercent / lifesteal)
                                try {
                                    if (char && char.equipment) {
                                        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                                        for (const s of Object.keys(char.equipment||{})) {
                                            const it = char.equipment[s]; if (!it || !it.id) continue; const idef = defs[it.id]||null; if (!idef) continue;
                                            if (typeof idef.lifestealPercent === 'number') lines.push(`+${idef.lifestealPercent}% (from ${idef.name||it.id})`);
                                            else if (typeof idef.lifesteal === 'number') lines.push(`+${idef.lifesteal}% (from ${idef.name||it.id})`);
                                        }
                                    }
                                } catch (e) {}
                                // talents
                                try { const t = talentMods['lifesteal'] || null; if (t && (t.flat||t.percent)) { if (t.flat) lines.push((t.flat>=0?'+':'')+t.flat+`% (talents)`); if (t.percent) lines.push((t.percent>=0?'+':'')+t.percent+`% (talents %)`); } } catch (e) {}
                                // buffs
                                try { const buffs = Array.isArray(char._buffs) ? char._buffs : (Array.isArray(char.buffs) ? char.buffs : []); for (const b of buffs) { if (!b) continue; if (typeof b.lifestealPercent === 'number') lines.push(`+${b.lifestealPercent}% (buff)`); else if (typeof b.lifesteal === 'number') lines.push(`+${b.lifesteal}% (buff)`); } } catch (e) {}
                                lines.push(`Final: ${eff.lifestealPercent}%`);
                            } else if (title.indexOf('HP Regen') !== -1 || title.indexOf('Mana Regen') !== -1) {
                                if (title.indexOf('HP Regen') !== -1) {
                                    lines.push(`Base regen from STR: ${Math.max(0, Math.floor(1 + ((eff && eff.str)||0) * 0.08))}/s`);
                                    const t = talentMods['hpRegen'] || null; if (t && (t.flat||t.percent)) { lines.push(`Talents: ${t.flat||0} flat, ${t.percent||0}%`); }
                                    lines.push(`Final: ${eff.hpRegen}/s`);
                                } else {
                                    lines.push(`Base regen from INT: ${Math.max(0, Math.floor(1 + ((eff && eff.int)||0) * 0.12))}/s`);
                                    const t = talentMods['manaRegen'] || null; if (t) lines.push(`Talents: ${t.flat||0} flat, ${t.percent||0}%`);
                                    lines.push(`Final: ${eff.manaRegen}/s`);
                                }
                            } else if (title.indexOf('MS') !== -1) {
                                lines.push(`Base movement from AGI: ${Math.round(180 + ((eff && eff.agi)||0) * 0.8)}`);
                                const t = talentMods['movementSpeed'] || null; if (t) { if (t.flat) lines.push(`Talents: +${t.flat} MS`); if (t.percent) lines.push(`Talents: +${t.percent}% MS`); }
                                lines.push(`Final: ${eff.movementSpeed} move speed`);
                            } else if (title.indexOf('Damage Reduction') !== -1) {
                                // Damage Reduction: show flat and percent talent contributions and any temporary sources
                                try {
                                    const mods = char._talentModifiers || {};
                                    const dr = mods['damageReduction'] || {};
                                    if (typeof dr.flat === 'number' && dr.flat !== 0) lines.push((dr.flat >= 0 ? '+' : '') + dr.flat + ' flat damage reduction (talents)');
                                    if (typeof dr.percent === 'number' && dr.percent !== 0) lines.push((dr.percent >= 0 ? '+' : '') + dr.percent + '% damage reduction (talents)');
                                    if (char && char._shadowstepDR && char._shadowstepDR.amount) lines.push(`+${char._shadowstepDR.amount}% damage reduction (shadowstep)`);
                                    if (lines.length === 0) lines.push('No modifiers available');
                                } catch (e) { lines.push('No modifiers available'); }
                            } else if (title.indexOf('Crit Lifesteal') !== -1) {
                                try {
                                    const mods = char._talentModifiers || {};
                                    const cl = mods['critLifesteal'] || {};
                                    if (typeof cl.flat === 'number' && cl.flat !== 0) lines.push((cl.flat >= 0 ? '+' : '') + cl.flat + '% (flat) crit lifesteal');
                                    if (typeof cl.percent === 'number' && cl.percent !== 0) lines.push((cl.percent >= 0 ? '+' : '') + cl.percent + '% crit lifesteal');
                                    const ls = mods['lifesteal'] || {};
                                    if ((ls.flat || 0) || (ls.percent || 0)) lines.push(`Generic lifesteal: ${ls.percent || ls.flat || 0}%`);
                                    if (lines.length === 0) lines.push('No modifiers available');
                                } catch (e) { lines.push('No modifiers available'); }
                            } else if (title.indexOf('Gold Drop Rate') !== -1) {
                                try {
                                    const mods = char._talentModifiers || {};
                                    const gdr = mods['goldDropRate'] || mods['goldDrop'] || {};
                                    if (typeof gdr.flat === 'number' && gdr.flat !== 0) lines.push((gdr.flat >= 0 ? '+' : '') + gdr.flat + ' flat gold gain (talents)');
                                    if (typeof gdr.percent === 'number' && gdr.percent !== 0) lines.push((gdr.percent >= 0 ? '+' : '') + gdr.percent + '% gold gain (talents)');
                                    const drMod = char._talentModifiers && char._talentModifiers['dropRate'];
                                    if (drMod && (drMod.percent || drMod.flat)) lines.push(`Item drop bonus: ${drMod.percent || drMod.flat}%`);
                                    if (lines.length === 0) lines.push('No modifiers available');
                                } catch (e) { lines.push('No modifiers available'); }
                            }
                            if (lines.length === 0) lines.push('No modifiers available');
                            showStatTooltip(scene, title, lines, c);
                        } catch (e) {}
                    });
                    c.addEventListener('mouseleave', () => { try { hideStatTooltip(); } catch (e) {} });
                } catch (e) {}
            }
        } catch (e) {}
    } catch (e) {}
    // (Fishing moved to skill group tooltip; do not show as stat pills here)
    const mining = char.mining || { level:1, exp:0, expToLevel:100 };
    const smithing = char.smithing || { level:1, exp:0, expToLevel:100 };
    const woodcutting = char.woodcutting || { level:1, exp:0, expToLevel:100 };
    const cooking = char.cooking || { level:1, exp:0, expToLevel:100 };
    // Ensure all core skills are shown. Keep Woodcutting last for visibility.
    try {
        // highlight core gathering/crafting skills so they're visually obvious
        const highlightStyle = 'font-size:0.99em;color:#ffd27a;background:rgba(255,210,122,0.03);padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
        // derive skill speeds (defaults where not explicit)
        const miningMs = (typeof scene.miningInterval === 'number') ? scene.miningInterval : 2800;
        const smithingMs = (typeof scene.smeltingInterval === 'number') ? scene.smeltingInterval : 2800;
        const cookingMs = (typeof scene.craftingInterval === 'number') ? scene.craftingInterval : 2800;
        const woodcuttingMs = 3000;
        const fishingMs = (eff && typeof eff.fishingSpeedMs === 'number') ? eff.fishingSpeedMs : 3000;

        function makeSkillRow(label, skObj, ms) {
            const div = document.createElement('div'); div.style.cssText = highlightStyle; div.className = 'skill-row';
            div.innerHTML = `<div style='font-weight:700'>${label}</div><div style='opacity:0.9'>L${(skObj.level||1)}</div>`;
            // hover to show ms tooltip
            div.addEventListener('mouseenter', (ev) => { try { showSkillTooltip(scene, label, [`Speed: ${ms} ms`], div); } catch (e) {} });
            div.addEventListener('mouseleave', () => { try { hideSkillTooltip(); } catch (e) {} });
            return div;
        }

        skills.appendChild(makeSkillRow('Mining', mining, miningMs));
        skills.appendChild(makeSkillRow('Smithing', smithing, smithingMs));
        skills.appendChild(makeSkillRow('Cooking', cooking, cookingMs));
        skills.appendChild(makeSkillRow('Woodcutting', woodcutting, woodcuttingMs));
        skills.appendChild(makeSkillRow('Fishing', char.fishing || { level:1 }, fishingMs));
    } catch (e) {
        // fallback: if DOM insertion fails, append a simple text node
        try { if (skills) skills.appendChild(document.createTextNode('Mining: L' + (mining.level||1) + '\nSmithing: L' + (smithing.level||1) + '\nWoodcutting: L' + (woodcutting.level||1))); } catch (err) {}
    }
}

// --- Talent modal (minimal) ---
export function openTalentModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    try { ensureCharTalents && ensureCharTalents(char); } catch (e) {}
    if (scene._talentModal) return;
    const modal = document.createElement('div');
    modal.id = 'talent-modal';
    modal.className = 'modal-overlay show';
    modal.style.zIndex = '250';
    modal.innerHTML = `
        <div class='modal-card'>
            <div class='modal-head'>
                <div>
                    <div class='modal-title'>Talent Tree</div>
                    <div class='modal-subtitle'>Allocate talent points across tabs. Star points are separate.</div>
                </div>
                <div class='modal-close'><button id='talent-close' class='btn btn-ghost'>Close</button></div>
            </div>
            <div class='modal-body'>
                <div id='talent-tabs' style='width:180px; flex:0 0 180px; overflow:auto;'></div>
                <div id='talent-grid' style='flex:1 1 480px; overflow:auto; padding:6px; display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px;'></div>
                <div id='talent-info' style='width:260px; flex:0 0 260px; overflow:auto; padding:6px;'></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    scene._talentModal = modal;
    document.getElementById('talent-close').onclick = () => closeTalentModal(scene);
    // Auto-clean on scene shutdown
    try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { closeTalentModal(scene); } catch (e) {} }); } catch (e) {}
    // attach data and state
    scene._talentState = scene._talentState || { activeTab: null };
    // default active tab: first available for class
    const availableTabs = getTabsForClass(char.class);
    scene._talentState.availableTabs = availableTabs;
    scene._talentState.activeTab = scene._talentState.activeTab || (availableTabs && availableTabs[0]) || 'tab_beginner';
    refreshTalentModal(scene);
}

export function closeTalentModal(scene) {
    if (!scene) return;
    if (scene._talentModal && scene._talentModal.parentNode) scene._talentModal.parentNode.removeChild(scene._talentModal);
    scene._talentModal = null;
    scene._talentState = null;
    try { if (typeof hideStatTooltip === 'function') hideStatTooltip(); } catch (e) {}
    try { if (typeof hideSkillTooltip === 'function') hideSkillTooltip(); } catch (e) {}
}

export function refreshTalentModal(scene) {
    if (!scene || !scene._talentModal) return;
    const char = scene.char = scene.char || {};
    try { ensureCharTalents && ensureCharTalents(char); } catch (e) {}
    const state = scene._talentState = scene._talentState || { activeTab: null, availableTabs: getTabsForClass(char.class) };
    const tabsEl = scene._talentModal.querySelector('#talent-tabs');
    const gridEl = scene._talentModal.querySelector('#talent-grid');
    const infoEl = scene._talentModal.querySelector('#talent-info');
    if (!tabsEl || !gridEl || !infoEl) return;
    tabsEl.innerHTML = '';
    gridEl.innerHTML = '';
    infoEl.innerHTML = '';

    const tabs = state.availableTabs || getTabsForClass(char.class);
    for (const tid of tabs) {
        const tDef = getTalentTab(tid) || {};
        const btn = document.createElement('button'); btn.className = 'btn btn-secondary'; btn.style.display = 'block'; btn.style.width = '100%'; btn.style.marginBottom = '8px';
        btn.textContent = `${tDef.label || tid} (${tDef.type === 'star' ? 'Star' : 'Tab'})`;
        if (state.activeTab === tid) btn.style.border = '2px solid rgba(255,210,122,0.6)';
        btn.onclick = () => { state.activeTab = tid; refreshTalentModal(scene); };
        tabsEl.appendChild(btn);
    }

    const activeTabId = state.activeTab || tabs[0];
    const activeTabDef = getTalentTab(activeTabId) || {};
    // header info
    const header = document.createElement('div'); header.style.marginBottom = '8px';
    header.innerHTML = `<strong style='display:block;margin-bottom:6px;'>${activeTabDef.label || activeTabId}</strong><div style='font-size:12px;color:rgba(255,255,255,0.8)'>${activeTabDef.description || ''}</div>`;
    infoEl.appendChild(header);
    const unspent = (activeTabDef.type === 'star') ? (char.talents && char.talents.starPoints) || 0 : (char.talents && char.talents.unspentByTab && (char.talents.unspentByTab[activeTabId] || 0)) || 0;
    const pts = document.createElement('div'); pts.style.margin = '8px 0'; pts.innerHTML = `<div style='font-weight:800'>Unspent: <span style='color:#ffd27a'>${unspent}</span></div>`;
    infoEl.appendChild(pts);

    // Respec button
    const respecBtn = document.createElement('button'); respecBtn.className = 'btn btn-ghost'; respecBtn.textContent = 'Respec Tab';
    respecBtn.onclick = () => {
        try {
            const allocs = (char.talents && char.talents.allocations && char.talents.allocations[activeTabId]) || {};
            let refunded = 0;
            for (const k of Object.keys(allocs)) { refunded += (allocs[k] || 0); }
            if (activeTabDef.type === 'star') {
                char.talents.starPoints = (char.talents.starPoints || 0) + refunded;
            } else {
                char.talents.unspentByTab = char.talents.unspentByTab || {};
                char.talents.unspentByTab[activeTabId] = (char.talents.unspentByTab[activeTabId] || 0) + refunded;
            }
            // clear allocations and run de-learn logic for active talents
            try {
                if (char.talents && char.talents.allocations && char.talents.allocations[activeTabId]) {
                    const arr = char.talents.allocations[activeTabId];
                    for (const k of Object.keys(arr)) {
                        try { const prev = arr[k] || 0; if (prev > 0) processTalentAllocation(scene, char, activeTabId, k, prev, 0); } catch (e) {}
                    }
                }
            } catch (e) {}
            // clear allocations
            if (char.talents && char.talents.allocations) char.talents.allocations[activeTabId] = {};
            if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
            refreshTalentModal(scene);
        } catch (e) { console.warn('respec error', e); }
    };
    infoEl.appendChild(respecBtn);

    // talent cards
    const talents = Array.isArray(activeTabDef.talents) ? activeTabDef.talents : [];
    for (const t of talents) {
        const tid = t.id;
        const card = document.createElement('div'); card.style.background = 'rgba(255,255,255,0.03)'; card.style.padding = '8px'; card.style.borderRadius = '10px'; card.style.display = 'flex'; card.style.flexDirection = 'column'; card.style.gap = '6px';
        const name = document.createElement('div'); name.style.fontWeight = '800'; name.textContent = t.name || tid;
        const desc = document.createElement('div'); desc.style.fontSize = '12px'; desc.style.color = 'rgba(255,255,255,0.85)';
        // Determine current allocation before interpolation
        const alloc = (char.talents && char.talents.allocations && char.talents.allocations[activeTabId] && char.talents.allocations[activeTabId][tid]) || 0;
        // small formatter to produce clean numbers for display (trim unnecessary decimals)
        const formatDisplay = (v, type) => {
            const n = parseFloat(v || 0);
            if (isNaN(n)) return String(v);
            if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
            // show up to 2 decimals for fractional values
            return String(parseFloat(n.toFixed(2)));
        };
        // Interpolate {value} in descriptions based on current allocation (show current applied bonus when allocated)
        try {
            const s = (t && t.scaling) ? t.scaling : null;
            let displayVal = null;
            if (s) {
                const base = Number(s.base || 0); const per = Number(s.perRank || 0);
                const val = base + per * Math.max(0, alloc - 1);
                displayVal = formatDisplay(val, s.type || 'flat');
            }
            // secondary scaling interpolation (if present), e.g., extra targets or extra projectiles
            const s2 = (t && t.secondScaling) ? t.secondScaling : null;
            let displaySecondVal = null;
            if (s2) {
                const base2 = Number(s2.base || 0); const per2 = Number(s2.perRank || 0);
                const val2 = base2 + per2 * Math.max(0, alloc - 1);
                displaySecondVal = formatDisplay(val2, s2.type || 'flat');
            }
            let txt = t.description || '';
            if (displayVal !== null) txt = txt.replace(/\{value\}/g, '' + displayVal);
            if (displaySecondVal !== null) txt = txt.replace(/\{secondValue\}/g, '' + displaySecondVal);
            desc.textContent = txt;
        } catch (e) { desc.textContent = t.description || ''; }
        const controls = document.createElement('div'); controls.style.display = 'flex'; controls.style.justifyContent = 'space-between'; controls.style.alignItems = 'center';
        const rank = document.createElement('div'); rank.textContent = `Rank: ${alloc} / ${t.maxRank || 1}`; rank.style.fontWeight = '700';
        const btns = document.createElement('div'); btns.style.display = 'flex'; btns.style.gap = '6px';
        const dec = document.createElement('button'); dec.className = 'btn btn-ghost'; dec.textContent = '-'; dec.onclick = () => {
            try {
                if (alloc <= 0) return;
                const prevAlloc = alloc;
                const newAlloc = Math.max(0, (char.talents.allocations[activeTabId][tid]||0) - 1);
                char.talents.allocations[activeTabId][tid] = newAlloc;
                if (activeTabDef.type === 'star') { char.talents.starPoints = (char.talents.starPoints || 0) + 1; } else { char.talents.unspentByTab[activeTabId] = (char.talents.unspentByTab[activeTabId]||0) + 1; }
                try { processTalentAllocation(scene, char, activeTabId, tid, prevAlloc, newAlloc); } catch (e) { }
                if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
                refreshTalentModal(scene);
                try { refreshSkillBarHUD(scene); } catch (e) {}
                // Immediately refresh HUD and stats modal so stat changes from talents appear
                try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch (e) {}
                try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) {}
            } catch (e) {}
        };
        const inc = document.createElement('button'); inc.className = 'btn btn-primary'; inc.textContent = '+'; inc.onclick = () => {
            try {
                // determine available pool
                const pool = (activeTabDef.type === 'star') ? (char.talents.starPoints || 0) : (char.talents.unspentByTab && (char.talents.unspentByTab[activeTabId] || 0)) || 0;
                if (pool <= 0) return;
                char.talents.allocations[activeTabId] = char.talents.allocations[activeTabId] || {};
                const prevAlloc = alloc;
                const newAlloc = (char.talents.allocations[activeTabId][tid] || 0) + 1;
                char.talents.allocations[activeTabId][tid] = newAlloc;
                if (activeTabDef.type === 'star') { char.talents.starPoints = Math.max(0, (char.talents.starPoints||0) - 1); } else { char.talents.unspentByTab[activeTabId] = Math.max(0, (char.talents.unspentByTab[activeTabId]||0) - 1); }
                try { processTalentAllocation(scene, char, activeTabId, tid, prevAlloc, newAlloc); } catch (e) { }
                if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
                refreshTalentModal(scene);
                try { refreshSkillBarHUD(scene); } catch (e) {}
                // Immediately refresh HUD and stats modal so stat changes from talents appear
                try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch (e) {}
                try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) {}
            } catch (e) {}
        };
        btns.appendChild(dec); btns.appendChild(inc);
        controls.appendChild(rank); controls.appendChild(btns);
        // show mana cost and active/passive badge
        try {
            const meta = document.createElement('div'); meta.style.display = 'flex'; meta.style.gap = '8px'; meta.style.alignItems = 'center'; meta.style.marginTop = '6px';
            const tag = document.createElement('div'); tag.style.fontSize = '11px'; tag.style.padding = '4px 8px'; tag.style.borderRadius = '8px'; tag.style.background = t.kind === 'active' ? 'linear-gradient(90deg, rgba(180,120,255,0.06), rgba(180,120,255,0.02))' : 'linear-gradient(90deg, rgba(255,210,122,0.02), rgba(255,255,255,0.01))'; tag.style.color = t.kind === 'active' ? '#d8b3ff' : '#ffd27a'; tag.textContent = t.kind === 'active' ? 'Active' : 'Passive'; meta.appendChild(tag);
            if (t && typeof t.manaCost === 'number' && t.manaCost > 0) {
                const mc = document.createElement('div'); mc.style.fontSize = '12px'; mc.style.color = '#9fd6ff'; mc.textContent = `Mana: ${t.manaCost}`; meta.appendChild(mc);
            }
            card.appendChild(meta);
        } catch (e) {}
        // visual polish: learned vs unlearned style & small icon
        try {
            // ensure name acts as a header with flexible layout so we can append an icon
            name.style.display = 'flex'; name.style.alignItems = 'center'; name.style.justifyContent = 'space-between';
            const titleSpan = document.createElement('span'); titleSpan.style.fontWeight = '800'; titleSpan.textContent = t.name || tid;
            // small icon indicating active/passive (colored)
            const icon = document.createElement('div'); icon.style.width = '14px'; icon.style.height = '14px'; icon.style.borderRadius = '4px'; icon.style.marginLeft = '8px'; icon.style.flex = '0 0 auto';
            icon.style.background = (t.kind === 'active') ? '#b388ff' : '#ffd27a';
            // clear previous children then append title + icon
            name.innerHTML = '';
            name.appendChild(titleSpan); name.appendChild(icon);
            // gray-out unallocated talents for visual clarity
            if (!alloc || alloc <= 0) { card.style.filter = 'grayscale(56%)'; card.style.opacity = '0.78'; }
            else { card.style.filter = ''; card.style.opacity = '1'; }
        } catch (e) {}
        card.appendChild(name); card.appendChild(desc); card.appendChild(controls);
        // If this talent is active and allocated, show Assign button
        try {
            const isActive = (t && t.kind === 'active');
            const allocNow = (char.talents && char.talents.allocations && char.talents.allocations[activeTabId] && char.talents.allocations[activeTabId][tid]) || 0;
            if (isActive && allocNow > 0) {
                const assignBtn = document.createElement('button'); assignBtn.className = 'btn btn-secondary'; assignBtn.textContent = 'Assign to Skill Bar';
                assignBtn.style.marginTop = '6px';
                assignBtn.onclick = () => {
                    try {
                        assignActiveToNextSlot(scene, tid);
                        // persist and refresh UI
                        if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
                        refreshTalentModal(scene);
                        try { refreshSkillBarHUD(scene); } catch (e) {}
                        refreshSkillBarHUD(scene);
                    } catch (e) {}
                };
                card.appendChild(assignBtn);
            }
        } catch (e) {}
        gridEl.appendChild(card);
    }
}

// --- Skill bar HUD & assignment helpers ---
export function assignActiveToNextSlot(scene, talentId) {
    if (!scene || !scene.char) return;
    try {
        ensureCharTalents && ensureCharTalents(scene.char);
        const char = scene.char;
        // ensure talent is learned (present in learnedActives)
        if (!Array.isArray(char.learnedActives) || !char.learnedActives.find(x => x && x.id === talentId)) {
            try { if (scene._showToast) scene._showToast('You must learn this active first.'); } catch (e) {}
            return;
        }
        if (!char.talents) char.talents = { skillBar: new Array(9).fill(null) };
        for (let i = 0; i < 9; i++) {
            if (!char.talents.skillBar[i]) {
                char.talents.skillBar[i] = talentId;
                try { if (scene._showToast) scene._showToast(`Assigned ${talentId} to slot ${i+1}`); } catch (e) {}
                if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
                try { refreshSkillBarHUD(scene); } catch (e) {}
                return;
            }
        }
        try { if (scene._showToast) scene._showToast('Skill bar is full. Remove a skill first.'); } catch (e) {}
    } catch (e) {}
}

export function unassignSkillBarSlot(scene, slotIndex) {
    if (!scene || !scene.char) return;
    try {
        ensureCharTalents && ensureCharTalents(scene.char);
        const char = scene.char;
        if (!char.talents || !Array.isArray(char.talents.skillBar)) return;
        if (slotIndex < 0 || slotIndex >= char.talents.skillBar.length) return;
        const prev = char.talents.skillBar[slotIndex];
        char.talents.skillBar[slotIndex] = null;
        try { if (scene._showToast) scene._showToast(prev ? `Unassigned slot ${slotIndex+1}` : `Cleared slot ${slotIndex+1}`); } catch (e) {}
        if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
        try { refreshSkillBarHUD(scene); } catch (e) {}
    } catch (e) {}
}

export function refreshSkillBarHUD(scene) {
    if (typeof document === 'undefined') return;
    if (!scene || !scene.char) return;
    try {
        ensureCharTalents && ensureCharTalents(scene.char);
        const containerId = 'global-skill-bar';
        let el = document.getElementById(containerId);
        if (!el) {
            el = document.createElement('div'); el.id = containerId;
            el.style.position = 'fixed'; el.style.left = '50%'; el.style.bottom = '12px'; el.style.transform = 'translateX(-50%)'; el.style.zIndex = '9999'; el.style.display = 'flex'; el.style.gap = '8px'; el.style.padding = '6px';
            el.style.background = 'rgba(0,0,0,0.35)'; el.style.border = '1px solid rgba(255,255,255,0.06)'; el.style.borderRadius = '10px'; el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
            document.body.appendChild(el);
        }
        el.innerHTML = ''; // rebuild
        const char = scene.char;
        const defs = (char.learnedActives || []).reduce((m, a) => { if (a && a.id) m[a.id] = a; return m; }, {});
        const now = Date.now();
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div'); slot.className = 'skill-slot';
            // base visuals are handled via CSS; keep minimal inline fallbacks
            slot.style.background = 'rgba(255,255,255,0.02)';
            const assigned = (char.talents && Array.isArray(char.talents.skillBar)) ? char.talents.skillBar[i] : null;
            const assignedDef = assigned ? (defs[assigned] || null) : null;
            const nameLabel = assigned ? ((assignedDef && assignedDef.name) || assigned) : `(${i+1})`;
            // Show cooldown overlay if applicable
            let cooldownExpiry = null;
            try { cooldownExpiry = (char.talents && char.talents.cooldowns && char.talents.cooldowns[assigned]) || null; } catch (e) { cooldownExpiry = null; }
            const nowMs = Date.now();
            if (assigned && cooldownExpiry && nowMs < cooldownExpiry) {
                slot.classList.add('cooldown-active');
            }

            // icon
            const iconDiv = document.createElement('div'); iconDiv.className = 'skill-icon';
            // placeholder icon: prefer a small emoji or letter based on activeType
            try {
                if (assignedDef && assignedDef.kind === 'active') {
                    if (assignedDef.activeType === 'offensive') iconDiv.textContent = '⚔️';
                    else if (assignedDef.activeType === 'defensive') iconDiv.textContent = '🛡️';
                    else iconDiv.textContent = '✨';
                } else {
                    iconDiv.textContent = assigned ? '•' : '';
                }
            } catch (e) { iconDiv.textContent = assigned ? '•' : ''; }

            const labelDiv = document.createElement('div'); labelDiv.className = 'skill-label'; labelDiv.textContent = nameLabel;
            slot.appendChild(iconDiv); slot.appendChild(labelDiv);

            // mana badge if defined
            try {
                if (assignedDef && typeof assignedDef.manaCost === 'number' && assignedDef.manaCost > 0) {
                    const mc = document.createElement('div'); mc.className = 'mana-badge'; mc.textContent = String(assignedDef.manaCost);
                    slot.appendChild(mc);
                }
            } catch (e) {}

            // cooldown overlay element (hidden when not active)
            try {
                const overlay = document.createElement('div'); overlay.className = 'cooldown-overlay';
                if (assigned && cooldownExpiry && nowMs < cooldownExpiry) {
                    const remain = Math.ceil((cooldownExpiry - nowMs) / 1000);
                    overlay.textContent = `${remain}s`;
                    overlay.style.pointerEvents = 'none';
                    slot.appendChild(overlay);
                }
            } catch (e) {}

            slot.title = assigned ? `Click to unassign ${assigned}` : `Slot ${i+1} (click to clear)`;
            ((idx, assignedId, expiry) => { slot.onclick = () => { try { if (assignedId) {
                        const now2 = Date.now(); const exp = (scene.char && scene.char.talents && scene.char.talents.cooldowns) ? scene.char.talents.cooldowns[assignedId] : null;
                        if (exp && now2 < exp) { try { if (scene._showToast) scene._showToast('Ability on cooldown'); } catch (e) {} return; }
                        unassignSkillBarSlot(scene, idx);
                    } else { /* no-op */ } } catch (e) {} }; })(i, assigned, cooldownExpiry);
            el.appendChild(slot);
        }
    } catch (e) { /* ignore DOM errors */ }
}

// Activate a skill bar slot (keyboard or programmatic). Emits scene.events 'talentActivated' on success.
export function useTalentSlot(scene, slotIndex) {
    if (!scene || !scene.char) return false;
    try {
        ensureCharTalents && ensureCharTalents(scene.char);
        const char = scene.char;
        if (!char.talents || !Array.isArray(char.talents.skillBar)) return false;
        if (slotIndex < 0 || slotIndex >= char.talents.skillBar.length) return false;
        const talentId = char.talents.skillBar[slotIndex];
        if (!talentId) {
            try { if (scene._showToast) scene._showToast('No skill assigned to that slot'); } catch (e) {}
            return false;
        }
        // check learned
        if (!Array.isArray(char.learnedActives) || !char.learnedActives.find(x => x && x.id === talentId)) {
            try { if (scene._showToast) scene._showToast('Skill not learned'); } catch (e) {}
            return false;
        }
        // find talent def
        const found = getTalentDefById(talentId);
        const def = found && found.def ? found.def : null;
        if (!def) {
            try { if (scene._showToast) scene._showToast('Unknown talent'); } catch (e) {}
            return false;
        }
        const now = Date.now();
        const cdMap = char.talents.cooldowns || {};
        // normalize expiry to a number to avoid truthy non-numeric values causing incorrect cooldown checks
        const expiry = Number(cdMap[talentId] || 0);
        // optional debug logging (enable by setting window.__shared_ui.debugTalent = true)
        try {
            const dbg = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent);
            if (dbg) console.debug('[useTalentSlot] talentId=', talentId, 'expiry=', expiry, 'now=', now, 'cdMapEntry=', cdMap[talentId]);
        } catch (e) {}
        if (expiry && now < expiry) {
            try { if (scene._showToast) scene._showToast('Ability on cooldown'); } catch (e) {}
            return false;
        }
        // mana cost check: if talent defines a manaCost ensure character has enough and deduct before activation
        let manaCost = 0;
        let currentMana = 0;
        let manaDeducted = false;
        try {
            manaCost = (def && typeof def.manaCost === 'number') ? Number(def.manaCost || 0) : 0;
            if (manaCost > 0) {
                currentMana = (char && typeof char.mana === 'number') ? char.mana : ((typeof char.maxmana === 'number') ? char.maxmana : 0);
                if (currentMana < manaCost) {
                    try { if (scene._showToast) scene._showToast('Not enough mana'); } catch (e) {}
                    return false;
                }
                try { char.mana = Math.max(0, currentMana - manaCost); manaDeducted = true; } catch (e) {}
            }
        } catch (e) {}
        // trigger activation event so scene/game can handle effect
        let activationError = null;
        let activationHandled = false;
        try {
            if (scene.events && typeof scene.events.emit === 'function') {
                if (!scene._talentActivationState || scene._talentActivationState.id !== talentId) {
                    scene._talentActivationState = { id: talentId, success: false };
                } else {
                    scene._talentActivationState.success = false;
                }
                activationHandled = scene.events.emit('talentActivated', { talentId, slotIndex, def: def, tabId: (found && found.tabId) || null });
            }
        } catch (e) { activationError = e; }
        const activationState = (scene && scene._talentActivationState && scene._talentActivationState.id === talentId) ? scene._talentActivationState : null;
        const activationSucceeded = activationState ? !!activationState.success : activationHandled;
        if (activationError || !activationSucceeded) {
            try { if (typeof console !== 'undefined' && console.error) console.error('[talent] activation failed', talentId, activationError); } catch (e) {}
            if (manaDeducted) {
                try {
                    const maxMana = (typeof char.maxmana === 'number') ? char.maxmana : currentMana;
                    char.mana = Math.min(maxMana, currentMana);
                } catch (e) {}
            }
            try { if (scene._showToast) scene._showToast('Ability fizzled'); } catch (e) {}
            return false;
        }
        // apply cooldown if defined
        let cdMs = (def && def.cooldownMs) ? Number(def.cooldownMs || 0) : 0;
        // Ensure aggregated talent modifiers are available (effectiveStats will compute and write char._talentModifiers)
        try {
            if ((!char._talentModifiers || typeof char._talentModifiers !== 'object') && window && window.__shared_ui && window.__shared_ui.stats && typeof window.__shared_ui.stats.effectiveStats === 'function') {
                try { window.__shared_ui.stats.effectiveStats(char); } catch (e) {}
            }
        } catch (e) {}
        // If this talent defines a scaling target and the character has aggregated talent modifiers
        // for that target, allow overriding the cooldown based on the talent's scaling value.
        try {
            const scalingTarget = (def && def.scaling) ? def.scaling.target : null;
            const targetLooksLikeCooldown = typeof scalingTarget === 'string' && /cooldown/i.test(scalingTarget);
            const targetMods = (char && char._talentModifiers && scalingTarget) ? char._talentModifiers[scalingTarget] : null;
            if (targetMods && targetLooksLikeCooldown) {
                if (typeof targetMods.flat === 'number' && !isNaN(targetMods.flat)) {
                    cdMs = Math.max(0, Number(targetMods.flat || 0) * 1000);
                } else if (typeof targetMods.percent === 'number' && !isNaN(targetMods.percent) && cdMs > 0) {
                    cdMs = Math.max(0, cdMs * (1 - (targetMods.percent / 100)));
                }
            }
            const globalCdMods = (char && char._talentModifiers) ? char._talentModifiers['cooldownReduction'] : null;
            if (globalCdMods && cdMs > 0) {
                if (typeof globalCdMods.flat === 'number' && !isNaN(globalCdMods.flat)) {
                    cdMs = Math.max(0, cdMs - (Number(globalCdMods.flat || 0) * 1000));
                }
                if (typeof globalCdMods.percent === 'number' && !isNaN(globalCdMods.percent)) {
                    cdMs = Math.max(0, cdMs * (1 - (globalCdMods.percent / 100)));
                }
            }
        } catch (e) {}
        // Debug log final cooldown being applied
        try {
            const dbg = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.debugTalent);
            if (dbg) console.debug('[useTalentSlot] applying cooldown for', talentId, 'cdMs=', cdMs, 'mods=', (char && char._talentModifiers && def && def.scaling ? char._talentModifiers[def.scaling.target] : null));
        } catch (e) {}
        if (cdMs > 0) {
            try { char.talents.cooldowns = char.talents.cooldowns || {}; char.talents.cooldowns[talentId] = Date.now() + Math.round(cdMs); } catch (e) {}
        }
        // HUD refresh in case mana changed when activating
        try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch (e) {}
        if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
        try { refreshSkillBarHUD(scene); } catch (e) {}
        return true;
    } catch (e) { return false; }
}

// Key binding helpers
export function bindSkillBarKeys(scene) {
    if (!scene || typeof window === 'undefined') return;
    try {
        // Defensive: always remove any existing binding first to avoid duplicate handlers
        try { if (scene._skillBarKeysBound) unbindSkillBarKeys(scene); } catch (e) {}

        const handler = (ev) => {
            // map digits 1..9 to slot indices 0..8
            try {
                let idx = null;
                // Prefer KeyboardEvent.code when available (works regardless of Shift)
                if (ev && typeof ev.code === 'string') {
                    if (ev.code.startsWith('Digit')) {
                        const n = Number(ev.code.slice(5));
                        if (!isNaN(n)) idx = n - 1;
                    } else if (ev.code.startsWith('Numpad')) {
                        const n = Number(ev.code.slice(6));
                        if (!isNaN(n)) idx = n - 1;
                    }
                }
                // Fallback to keyCode (older browsers / event variations)
                if (idx === null && ev && typeof ev.keyCode === 'number') {
                    // Digit keys 1..9 are 49..57
                    if (ev.keyCode >= 49 && ev.keyCode <= 57) idx = ev.keyCode - 49;
                    // Numpad 1..9 sometimes report 97..105 on keypress-like events
                    else if (ev.keyCode >= 97 && ev.keyCode <= 105) idx = ev.keyCode - 97;
                }
                // Final fallback: examine ev.key for any digit character (handles shifted symbols like '!')
                if (idx === null && ev && ev.key) {
                    const m = String(ev.key).match(/[1-9]/);
                    if (m) idx = Number(m[0]) - 1;
                }
                if (idx !== null && idx >= 0 && idx <= 8) {
                    try { const ok = useTalentSlot(scene, idx); if (ok && ev && ev.preventDefault) ev.preventDefault(); } catch (e) {}
                }
            } catch (e) { /* swallow */ }
        };

        // Prefer Phaser input (scoped to the canvas) to avoid page-focus issues. Fall back to window if not available.
        try {
            if (scene && scene.input && scene.input.keyboard && typeof scene.input.keyboard.on === 'function') {
                scene.input.keyboard.on('keydown', handler);
                scene._skillBarKeyHandler = { phaser: true, fn: handler };
            } else {
                window.addEventListener('keydown', handler);
                scene._skillBarKeyHandler = { phaser: false, fn: handler };
            }
        } catch (e) {
            try { window.addEventListener('keydown', handler); scene._skillBarKeyHandler = { phaser: false, fn: handler }; } catch (ee) { /* swallow */ }
        }
        scene._skillBarKeysBound = true;
        // ensure cleanup on scene shutdown so we don't accumulate key listeners across scenes
        try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { unbindSkillBarKeys(scene); } catch (e) {} }); } catch (e) {}
        try { if (typeof window.__shared_ui !== 'undefined' && window.__shared_ui && window.__shared_ui.debugKeyBind) console.debug('[bindSkillBarKeys] bound keydown for scene', scene && scene.scene && scene.scene.key, 'phaser?', !!(scene && scene.input && scene.input.keyboard && typeof scene.input.keyboard.on === 'function')); } catch (e) {}
    } catch (e) {}
}

export function unbindSkillBarKeys(scene) {
    if (!scene || typeof window === 'undefined') return;
    try {
        if (!scene._skillBarKeysBound) return;
        try {
            if (scene._skillBarKeyHandler) {
                try {
                    if (scene._skillBarKeyHandler.phaser && scene.input && scene.input.keyboard && typeof scene.input.keyboard.off === 'function') {
                        scene.input.keyboard.off('keydown', scene._skillBarKeyHandler.fn);
                    } else if (scene._skillBarKeyHandler.fn) {
                        window.removeEventListener('keydown', scene._skillBarKeyHandler.fn);
                    }
                } catch (e) {}
                scene._skillBarKeyHandler = null;
            }
        } catch (e) {}
        scene._skillBarKeysBound = false;
        // Remove the global skill bar DOM so it doesn't persist when switching to non-game scenes
        try {
            const el = (typeof document !== 'undefined') ? document.getElementById('global-skill-bar') : null;
            if (el && el.parentNode) el.parentNode.removeChild(el);
        } catch (e) {}
        try { if (typeof window.__shared_ui !== 'undefined' && window.__shared_ui && window.__shared_ui.debugKeyBind) console.debug('[unbindSkillBarKeys] unbound keydown for scene', scene && scene.scene && scene.scene.key); } catch (e) {}
    } catch (e) {}
}

// Bind/unbind the 't' key to open the Talent modal for a scene
export function bindTalentKey(scene) {
    if (!scene || typeof window === 'undefined') return;
    try {
        if (scene._talentKeyHandler) return; // already bound
        const handler = (ev) => {
            try {
                const k = ev && (ev.key || (ev.keyCode ? String.fromCharCode(ev.keyCode) : null));
                if (!k) return;
                if ((k || '').toLowerCase() !== 't') return;
                // debounce guard to avoid multiple listeners causing repeated toggles
                const now = Date.now();
                try { if (scene._lastTalentToggle && (now - scene._lastTalentToggle) < 180) return; scene._lastTalentToggle = now; } catch (e) {}
                // toggle talent modal for this scene
                if (scene._talentModal) {
                    try { closeTalentModal(scene); } catch (e) {}
                } else {
                    try { openTalentModal(scene); } catch (e) {}
                }
                if (ev && ev.preventDefault) ev.preventDefault();
            } catch (e) {}
        };
        // Prefer Phaser input, fallback to window
        try {
            if (scene && scene.input && scene.input.keyboard && typeof scene.input.keyboard.on === 'function') {
                scene.input.keyboard.on('keydown-T', handler);
                // Phaser supports event names like 'keydown-T' for specific keys; also listen generic 'keydown' just in case
                scene._talentKeyHandler = { phaser: true, fn: handler };
            } else {
                window.addEventListener('keydown', handler);
                scene._talentKeyHandler = { phaser: false, fn: handler };
            }
        } catch (e) {
            try { window.addEventListener('keydown', handler); scene._talentKeyHandler = { phaser: false, fn: handler }; } catch (ee) {}
        }
        // ensure cleanup on scene shutdown so we don't accumulate key listeners across scenes
        try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { unbindTalentKey(scene); } catch (e) {} }); } catch (e) {}
    } catch (e) {}
}

export function unbindTalentKey(scene) {
    if (!scene || typeof window === 'undefined') return;
    try {
        if (!scene._talentKeyHandler) return;
        try {
            if (scene._talentKeyHandler.phaser && scene.input && scene.input.keyboard && typeof scene.input.keyboard.off === 'function') {
                // remove both specific and generic listeners if present
                try { scene.input.keyboard.off('keydown-T', scene._talentKeyHandler.fn); } catch (e) {}
                try { scene.input.keyboard.off('keydown', scene._talentKeyHandler.fn); } catch (e) {}
            } else if (scene._talentKeyHandler.fn) {
                window.removeEventListener('keydown', scene._talentKeyHandler.fn);
            }
        } catch (e) {}
        scene._talentKeyHandler = null;
    } catch (e) {}
}

// Convenience: register HUD helpers on the global shared UI object
try {
    if (typeof window !== 'undefined') {
        window.__shared_ui = window.__shared_ui || {};
        window.__shared_ui.refreshSkillBarHUD = refreshSkillBarHUD;
        window.__shared_ui.assignActiveToNextSlot = assignActiveToNextSlot;
        window.__shared_ui.unassignSkillBarSlot = unassignSkillBarSlot;
        window.__shared_ui.useTalentSlot = useTalentSlot;
        window.__shared_ui.bindSkillBarKeys = bindSkillBarKeys;
        window.__shared_ui.unbindSkillBarKeys = unbindSkillBarKeys;
        window.__shared_ui.bindTalentKey = bindTalentKey;
        window.__shared_ui.unbindTalentKey = unbindTalentKey;
    }
} catch (e) {}

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
    if (!scene.char.equipment) scene.char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null, fishing:null, mining:null, woodcutting:null };
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


