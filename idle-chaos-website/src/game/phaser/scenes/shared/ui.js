import { effectiveStats, makeStatPill, formatSkillLine, checkClassLevelUps } from './stats.js';
import { syncInventoryToServer } from './persistence.js';
import { getTabsForClass, TALENT_TAB_ORDER, getTalentTab, ensureCharTalents, processTalentAllocation, getTalentDefById } from '../../data/talents.js';
// Talent / Buff icon resolution helper
// Attempts to derive an icon file path for a talent (or buff mapped to a talent) based on:
// 1. Explicit talent.icon (if author later adds)
// 2. Sanitized talent name PascalCase
// 3. PascalCase from id segments
// Override map handles irregular ids -> filenames.
function resolveTalentIcon(scene, talentLike) {
    try {
        if (!scene || !scene.char || !talentLike) return null;
        const cls = (scene.char.class || '').trim();
        if (!cls) return null;
        // Assets folder is 'Occultist' for all variations
        let folder = cls.charAt(0).toUpperCase() + cls.slice(1).toLowerCase(); // e.g. Horror, Occultist, Stalker, Beginner
        const override = {
            plus1str: 'Plus1Str', plus1int: 'Plus1Int', plus1agi: 'Plus1Agi',
            bonecrusher_training: 'BoneCrusher', bloodstaked_guard: 'Bloodstaked', wood_lover: 'StaffMastery', mining_exp_gain: 'MiningExpertise',
            hunter_s_formula: 'HuntersFormula', five_finger_discount: 'FiveFingerDiscount',
            shadowstep: 'ShadowStep', mana_shield: 'ManaShield', dark_shield: 'DarkShield', blood_ritual_reserve: 'BloodRitualReserve', unholy_frenzy: 'UnholyFrenzy', terror_form: 'TerrorForm'
        };
        const explicit = talentLike.icon; if (explicit) return explicit;
        const id = talentLike.id || talentLike.key || '';
        const name = talentLike.name || '';
        const candidates = [];
        if (override[id]) candidates.push(override[id]);
        // From name: remove non-alphanumerics and capitalize words
        if (name) {
            const nBase = name.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
            if (nBase) candidates.push(nBase);
        }
        // From id segments
        if (id) {
            const segBase = id.split(/[_\-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
            if (segBase) candidates.push(segBase);
        }
        // Deduplicate preserving order
        const uniq = []; for (const c of candidates) { if (uniq.indexOf(c) === -1) uniq.push(c); }
        for (const base of uniq) {
            // public asset path
            const path = `/phaser-game/assets/TalentIcons/${folder}/${base}.png`;
            return path; // Optimistic: browser onerror will fallback if missing
        }
        return null;
    } catch (e) { return null; }
}

// Resolve buff key -> talent-like stub to reuse talent icon logic
function resolveBuffIcon(scene, buff) {
    try {
        if (!buff) return null;
        const key = buff.key || buff.id || '';
        if (!key) return null;
        // Map buff keys that differ from talent ids
        const map = {
            mana_shield: 'mana_shield', dark_shield: 'dark_shield', unholy_frenzy: 'unholy_frenzy', blood_ritual: 'blood_ritual_reserve', marksman_focus: 'marksman_focus', standing_dr: 'glyphic_anchor', stealth_active: 'shadowstep'
        };
        const tid = map[key] || key;
        return resolveTalentIcon(scene, { id: tid, name: buff.label });
    } catch (e) { return null; }
}
// Shared UI utilities: Inventory, Equipment, and Stats modals.
// Each function accepts a Phaser.Scene instance as the first arg and operates on scene.char.

// Prune any expired temporary buffs on a character; returns number removed
function pruneExpiredBuffs(scene) {
    try {
        if (!scene || !scene.char) return 0;
        const arr = Array.isArray(scene.char._buffs) ? scene.char._buffs : (Array.isArray(scene.char.buffs) ? scene.char.buffs : null);
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const now = Date.now();
        const before = arr.length;
        const next = arr.filter(b => {
            try {
                if (!b) return false;
                if (typeof b.expiresAt === 'number') return b.expiresAt > now;
                return true; // no expiry -> keep
            } catch (e) { return true; }
        });
        if (next.length !== before) {
            scene.char._buffs = next;
            // also mirror to legacy field if used
            try { if (Array.isArray(scene.char.buffs)) scene.char.buffs = next.slice(); } catch (e) {}
            try { if (scene._updateHUD) scene._updateHUD(); } catch (e) {}
            return before - next.length;
        }
        return 0;
    } catch (e) { return 0; }
}

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
    .skill-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:72px;gap:6px;padding:8px;border-radius:6px;background:linear-gradient(180deg,rgba(14,14,16,0.96),rgba(8,8,10,0.96));border:2px solid rgba(30,30,30,0.7);cursor:pointer;transition:background-color 140ms ease,border-color 120ms ease,color 120ms ease;text-align:center;color:#e6d7cf;position:relative;}
    /* Hover: gentle tint only (no translate/box-shadow) to avoid visual glitches */
    .skill-slot:hover{ background: linear-gradient(180deg, rgba(20,12,12,0.98), rgba(26,14,14,0.98)); border-color: rgba(140,30,30,0.95); }
    .skill-slot.selected{ border-color: rgba(255,180,120,0.95); }
    .skill-icon{width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#ffd27a;overflow:hidden;}
    .skill-icon img{width:100%;height:100%;object-fit:cover;border-radius:6px;}
    .skill-label{font-family:'Metal Mania',cursive;font-size:0.75rem;color:#f0c9b0;letter-spacing:0.5px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .mana-badge{position:absolute;right:8px;top:6px;background:rgba(120,20,20,0.9);color:#fff;padding:4px 6px;border-radius:6px;font-size:11px;font-weight:800}
    .cooldown-overlay{position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(180deg,rgba(0,0,0,0.6),rgba(0,0,0,0.6));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;border-radius:6px}
    .cooldown-active{filter:grayscale(30%);opacity:0.95}
    /* Buffs panel inside the global skill bar */
    #global-skill-bar .skillbar-inner { display:flex; align-items:center; gap:12px; }
    #global-skill-bar .skill-slots { display:flex; align-items:center; gap:8px; }
    #global-skill-bar .buffs-panel { display:flex; align-items:center; gap:8px; margin-left:6px; padding-left:10px; border-left: 2px dashed rgba(255,255,255,0.08); }
    #global-skill-bar .buff-chip { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:58px; height:58px; padding:6px 8px; border-radius:6px; background:linear-gradient(180deg,rgba(20,20,22,0.96),rgba(12,12,14,0.96)); border:1px solid rgba(255,255,255,0.06); box-shadow: 0 6px 18px rgba(0,0,0,0.45) inset; color:#eee; font-size:12px; }
    #global-skill-bar .buff-chip .buff-name { font-weight:800; color:#ffd27a; text-shadow:0 1px 0 rgba(0,0,0,0.5); max-width:80px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #global-skill-bar .buff-chip .buff-eta { font-size:11px; color:#cfd; opacity:0.9; }
    #global-skill-bar .buff-chip.temporary { border-color: rgba(255,210,122,0.35); }
    #global-skill-bar .buff-chip.permanent { border-color: rgba(120,220,160,0.28); }
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
// Internal helper to notify external (React) UI like `QuestPanel` that quest data changed.
// The React panel polls `window.__phaserRegistry.get('questDirtyCount')` once per second.
// By bumping this counter immediately after any quest progress mutation we force an
// immediate refresh (next poll tick) so users see changes without manual refresh.
function _bumpQuestDirty() {
    try {
        const reg = (typeof window !== 'undefined') ? window.__phaserRegistry : null;
        if (reg && typeof reg.get === 'function' && typeof reg.set === 'function') {
            const cur = Number(reg.get('questDirtyCount') || 0);
            reg.set('questDirtyCount', cur + 1);
        } else if (typeof window !== 'undefined') {
            // Lightweight fallback shim so future gets don't crash; mimics DataManager subset
            if (!window.__phaserRegistry) {
                let _store = { questDirtyCount: 1 };
                window.__phaserRegistry = {
                    get: (k) => _store[k],
                    set: (k, v) => { _store[k] = v; }
                };
            }
        }
        // Dispatch an instant event for React panels (QuestPanel) to react immediately
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            try { window.dispatchEvent(new CustomEvent('questProgressChanged', { detail: { dirty: true } })); } catch (e) {}
        }
    } catch (e) { /* silent */ }
}

export function updateQuestProgressAndCheckCompletion(scene, type, itemId, amount = 1) {
    if (!scene || !scene.char) return;
    const updateQuestProgress = (window && window.updateQuestProgress) ? window.updateQuestProgress : null;
    if (!updateQuestProgress) return;

    // Update progress
    updateQuestProgress(scene.char, type, itemId, amount);
    _bumpQuestDirty();
    // More granular event with context for listeners that care about specific objective types
    try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('questProgressChangedDetailed', { detail: { type, itemId, amount } }));
        }
    } catch (e) {}

    // Lightweight diagnostics to help verify quest progress wiring in-game
    try {
        if (typeof console !== 'undefined' && console.debug) {
            const idStr = (itemId === null || typeof itemId === 'undefined') ? '-' : String(itemId);
            console.debug(`[quests] progress type=${type} item=${idStr} amount=${amount}`);
        }
    } catch (e) {}

    // Refresh quest tracker if it exists
    try { if (window.__shared_ui && window.__shared_ui.updateQuestTracker) window.__shared_ui.updateQuestTracker(scene); } catch (e) {}

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
            // Track previous indicator states to reduce log spam
            const indicatorStates = new Map(); // key: giverId, value: { visible, text }
            
            const upd = function() {
                try {
                    // Debug: Check if quest module is available (only warn once)
                    if (!window.__questModule) {
                        if (!scene._warnedNoQuestModule) {
                            console.warn('[Quest Indicators] window.__questModule not available');
                            scene._warnedNoQuestModule = true;
                        }
                        return;
                    }
                    
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
                                const questModule = window.__questModule;
                                if (questModule && typeof questModule.getAvailableQuests === 'function') {
                                    // Use scene key as location (e.g., 'Town', 'Cave', 'GraveForest')
                                    const location = (scene && scene.sys && scene.sys.settings && scene.sys.settings.key) || null;
                                    available = questModule.getAvailableQuests(scene.char, location) || [];
                                }
                            } catch (e) { 
                                console.warn('[Quest Indicators] Error getting available quests:', e);
                                available = []; 
                            }
                            available = (available || []).filter(q => q && q.giver === giver);

                            let active = (scene.char && Array.isArray(scene.char.activeQuests)) ? (scene.char.activeQuests || []) : [];
                            // Filter active quests relevant to this NPC: either given by this NPC OR handed in to this NPC.
                            try {
                                const questModule = window.__questModule;
                                if (questModule && typeof questModule.getQuestById === 'function') {
                                    active = active.filter(aq => { try { const d = questModule.getQuestById(aq.id); return d && (d.giver === giver || d.handInNpc === giver); } catch (e) { return false; } });
                                } else {
                                    active = active.filter(aq => { try { const def = (window && window.QUEST_DEFS && window.QUEST_DEFS[aq.id]) ? window.QUEST_DEFS[aq.id] : null; return def && (def.giver === giver || def.handInNpc === giver); } catch (e) { return false; } });
                                }
                            } catch (e) { active = []; }

                            let ready = null;
                            for (const a of (active || [])) {
                                try {
                                    const questModule = window.__questModule;
                                    // Show ❗ if quest is complete OR if player needs to talk to this NPC
                                    const isComplete = questModule && typeof questModule.checkQuestCompletion === 'function' && questModule.checkQuestCompletion(scene.char, a.id);
                                    const hasTalkObjective = a.progress && a.progress.some(obj => obj.type === 'talk' && obj.target === giver);
                                    if (isComplete || hasTalkObjective) { 
                                        ready = a; 
                                        break; 
                                    }
                                } catch (e) {}
                            }

                            let showIndicator = false;
                            let indicatorText = '';
                            let questName = '';

                            if (ready) {
                                showIndicator = true;
                                indicatorText = '❗';
                                const questModule = window.__questModule;
                                const def = (questModule && typeof questModule.getQuestById === 'function') ? questModule.getQuestById(ready.id) : ((window && window.QUEST_DEFS && window.QUEST_DEFS[ready.id]) ? window.QUEST_DEFS[ready.id] : null);
                                questName = (def && def.name) ? def.name : ready.id;
                                ind.setText('❗'); ind.setVisible(true);
                                bub.setText(questName);
                                bub.setVisible(true);
                            } else if (available && available.length) {
                                showIndicator = true;
                                indicatorText = '❓';
                                const def = available[0];
                                questName = (def && def.name) ? def.name : (def && def.id) ? def.id : 'New Quest';
                                ind.setText('❓'); ind.setVisible(true);
                                bub.setText(questName);
                                bub.setVisible(true);
                            } else {
                                ind.setVisible(false);
                                bub.setVisible(false);
                            }

                            // Only log when state changes
                            const prevState = indicatorStates.get(giver);
                            const newState = { visible: showIndicator, text: indicatorText, quest: questName };
                            if (!prevState || prevState.visible !== newState.visible || prevState.text !== newState.text || prevState.quest !== newState.quest) {
                                indicatorStates.set(giver, newState);
                                if (showIndicator) {
                                    console.log(`[Quest Indicators] ${giver}: ${indicatorText} ${questName}`);
                                } else {
                                    console.log(`[Quest Indicators] ${giver}: hidden`);
                                }
                            }
                        } catch (e) { 
                            console.warn('[Quest Indicators] Error processing NPC:', entry.giverId, e);
                        }
                    }
                } catch (e) { 
                    console.warn('[Quest Indicators] Global error:', e);
                }
            };
            scene._registeredQuestIndicators.updateFn = upd;
            scene.events.on('update', upd);
            
            // Force initial update so indicators show immediately
            try {
                console.log('[Quest Indicators] Registering for scene:', scene.sys.settings.key);
                console.log('[Quest Indicators] Character data:', {
                    hasChar: !!scene.char,
                    activeQuests: scene.char?.activeQuests?.length || 0,
                    completedQuests: scene.char?.completedQuests?.length || 0,
                    level: scene.char?.level
                });
                upd();
                console.log('[Quest Indicators] Initial update completed for', entries.length, 'NPCs');
            } catch (e) {
                console.warn('[Quest Indicators] Initial update failed:', e);
            }
            
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
        // expose prune for other modules (HUD)
        window.__shared_ui.pruneExpiredBuffs = pruneExpiredBuffs;
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
        // quest tracker (on-screen)
        window.__shared_ui.createQuestTracker = createQuestTracker;
        window.__shared_ui.updateQuestTracker = updateQuestTracker;
        window.__shared_ui.destroyQuestTracker = destroyQuestTracker;
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
        // skill bar helpers (buffs panel lives here)
        window.__shared_ui.refreshSkillBarHUD = refreshSkillBarHUD;
        window.__shared_ui.bindSkillBarKeys = bindSkillBarKeys;
        window.__shared_ui.unbindSkillBarKeys = unbindSkillBarKeys;
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

// Auto-use potions helper: checks current HP/Mana vs thresholds and consumes the smallest suitable potion.
// Rate-limited per type to avoid spam. Uses the centralized useItemFromSlot for consistent behavior.
export function maybeAutoUsePotions(scene) {
    try {
        if (!scene || !scene.char) return false;
        const settings = (typeof window !== 'undefined' && window.__game_settings) ? window.__game_settings : loadSettings();
        const autoHP = !!settings.autoUseHP;
        const autoMP = !!settings.autoUseMana;
        const hpThresh = Math.max(1, Math.min(99, Number(settings.autoUseHPThreshold != null ? settings.autoUseHPThreshold : 35)));
        const mpThresh = Math.max(1, Math.min(99, Number(settings.autoUseManaThreshold != null ? settings.autoUseManaThreshold : 20)));

        // Compute max/current via effective stats (fallbacks if missing)
        let eff = null;
        try { if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(scene.char); } catch (e) {}
        const maxhp = (eff && typeof eff.maxhp === 'number') ? eff.maxhp : ((typeof scene.char.maxhp === 'number' && scene.char.maxhp > 0) ? scene.char.maxhp : Math.max(1, 100 + (scene.char.level || 1) * 10));
        const maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : ((typeof scene.char.maxmana === 'number' && scene.char.maxmana > 0) ? scene.char.maxmana : Math.max(0, Math.floor(50 + (scene.char.level || 1) * 5 + (((scene.char.stats && scene.char.stats.int) || 0) * 10))));
        const curHp = (typeof scene.char.hp === 'number') ? scene.char.hp : maxhp;
        const curMp = (typeof scene.char.mana === 'number') ? scene.char.mana : maxmana;
        const hpPct = Math.max(0, Math.min(100, Math.floor((curHp / Math.max(1, maxhp)) * 100)));
        const mpPct = Math.max(0, Math.min(100, Math.floor((curMp / Math.max(1, maxmana)) * 100)));

        // Inventory slots
        scene.char.inventory = initSlots(scene.char.inventory || []);
        const slots = scene.char.inventory;
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};

        // Helper: find best potion slot index of a given type ('hp' or 'mana')
        function findBestPotionSlot(type) {
            const isHP = type === 'hp';
            const needed = isHP ? Math.max(0, maxhp - curHp) : Math.max(0, maxmana - curMp);
            const candidates = [];
            for (let i = 0; i < slots.length; i++) {
                const s = slots[i];
                if (!s || !s.id) continue;
                const d = defs[s.id] || {};
                if (!d.usable) continue;
                // Support percent-based potions (healPercent / manaPercent)
                let amt = 0;
                if (isHP) {
                    if (typeof d.healPercent === 'number' && d.healPercent > 0) {
                        amt = Math.floor(maxhp * (d.healPercent / 100));
                    } else {
                        amt = Number(d.healAmount || 0);
                    }
                } else {
                    if (typeof d.manaPercent === 'number' && d.manaPercent > 0) {
                        amt = Math.floor(maxmana * (d.manaPercent / 100));
                    } else {
                        amt = Number(d.manaAmount || 0);
                    }
                }
                if (!amt) continue;
                candidates.push({ idx: i, amount: amt });
            }
            if (!candidates.length) return -1;
            // sort ascending by amount to minimize overheal
            candidates.sort((a,b) => a.amount - b.amount);
            // choose the smallest that covers at least 60% of needed (avoid wasting super small pots when critically low)
            const minUseful = Math.max(1, Math.floor(needed * 0.6));
            const exact = candidates.find(c => c.amount >= minUseful);
            if (exact) return exact.idx;
            // fallback: smallest available
            return candidates[0].idx;
        }

        let used = false;
        const now = Date.now();
        const minInterval = 1500; // ms per type
        // HP
        if (autoHP && hpPct <= hpThresh && curHp < maxhp) {
            if (!scene._lastAutoHPUseAt || (now - scene._lastAutoHPUseAt) >= minInterval) {
                const slot = findBestPotionSlot('hp');
                if (slot >= 0) {
                    const ok = useItemFromSlot(scene, slot);
                    if (ok) { scene._lastAutoHPUseAt = now; used = true; }
                }
            }
        }
        // Mana
        if (autoMP && mpPct <= mpThresh && curMp < maxmana) {
            if (!scene._lastAutoManaUseAt || (now - scene._lastAutoManaUseAt) >= minInterval) {
                const slot = findBestPotionSlot('mana');
                if (slot >= 0) {
                    const ok = useItemFromSlot(scene, slot);
                    if (ok) { scene._lastAutoManaUseAt = now; used = true; }
                }
            }
        }
        return used;
    } catch (e) { return false; }
}

// Background music helper: play/stop/set-volume a persistent background track managed via the game's sound manager.
export function playBackgroundMusic(scene, key, opts = {}) {
    if (!scene || !key) return null;
    try {
        window.__shared_ui = window.__shared_ui || {};
        window.__shared_ui._bgMusicCreating = window.__shared_ui._bgMusicCreating || {};
        const gm = scene.sys && scene.sys.game ? scene.sys.game : null;
        if (!gm || !gm.sound) return null;
        // Allow caller/env to request fallback if primary missing
        const fallbackKey = (opts && typeof opts.fallbackKey === 'string') ? opts.fallbackKey : (key + '_fallback');
        const preferFallback = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_AUDIO_PREFER_FALLBACK === 'true'))
            || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
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
                    // If preferring fallback or primary not present, also allow matching fallback instance
                    if (fallbackKey && s.key === fallbackKey) {
                        try { s.setLoop(loop); s.setVolume(vol); if (!s.isPlaying) s.play(); } catch (e) {}
                        window.__shared_ui._bgMusic = s; window.__shared_ui._bgMusicKey = fallbackKey;
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
            // If we prefer fallback in dev, attempt fallback first
            if (preferFallback && fallbackKey) {
                try { snd = gm.sound.add(fallbackKey, { loop: loop, volume: vol }); } catch (e) { snd = null; }
            }
            if (!snd) {
                try { snd = gm.sound.add(key, { loop: loop, volume: vol }); } catch (e) { snd = null; }
            }
            // If primary failed (e.g., not preloaded), try fallback as a backup
            if (!snd && fallbackKey) {
                try { snd = gm.sound.add(fallbackKey, { loop: loop, volume: vol }); } catch (e) { snd = null; }
            }
            // register as tracked before play to ensure re-entrant callers see the instance
            window.__shared_ui._bgMusic = snd;
            window.__shared_ui._bgMusicKey = snd ? (snd && snd.key ? snd.key : key) : null;
            if (snd && typeof snd.play === 'function') snd.play();
            // After creating/playing, aggressively stop/destroy other instances with same key
            try {
                const mgrSounds2 = (gm.sound && gm.sound.sounds) ? gm.sound.sounds : [];
                for (const other of mgrSounds2) {
                    if (!other || other === snd) continue;
                    try {
                        if (other.key === key || (fallbackKey && other.key === fallbackKey)) {
                            if (other.isPlaying) other.stop();
                            try { other.destroy && other.destroy(); } catch (e) {}
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        } catch (e) {
            // Fallback path for scene.sound
            try {
                if (preferFallback && fallbackKey) {
                    try { snd = scene.sound.add(fallbackKey, { loop: loop, volume: vol }); } catch (_) { snd = null; }
                }
                if (!snd) {
                    try { snd = scene.sound.add(key, { loop: loop, volume: vol }); } catch (_) { snd = null; }
                }
                if (!snd && fallbackKey) {
                    try { snd = scene.sound.add(fallbackKey, { loop: loop, volume: vol }); } catch (_) { snd = null; }
                }
                window.__shared_ui._bgMusic = snd;
                window.__shared_ui._bgMusicKey = snd ? (snd && snd.key ? snd.key : key) : null;
                if (snd && typeof snd.play === 'function') snd.play();
            } catch (e2) { snd = null; }
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
    const current = Object.assign({ musicVolume: 1, sfxVolume: 1, alwaysRun: false, showAtkRange: false, autoUseHP: false, autoUseHPThreshold: 35, autoUseMana: false, autoUseManaThreshold: 20 }, loadSettings());
    const modal = document.createElement('div'); modal.id = 'settings-modal'; modal.className = 'modal-overlay show'; modal.style.zIndex = '260';
    modal.innerHTML = `
        <div class='modal-card' style='min-width:520px; max-width:760px; background: linear-gradient(180deg, rgba(12,12,14,0.98) 0%, rgba(18,18,20,0.96) 100%); border: 4px solid #111; border-left: 10px solid rgba(80,10,10,0.95); border-right: 2px solid #222; box-shadow: 0 30px 80px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.02); border-radius: 6px; overflow: hidden; color: #f0c9b0; font-family: "Share Tech Mono", monospace;'>
            <div class='modal-head'>
                <div>
                    <div class='modal-title'>Settings</div>
                    <div class='modal-subtitle'>Audio, gameplay and misc options</div>
                </div>
                <div class='modal-close'><button id='settings-close' class='btn btn-ghost'>Close</button></div>
            </div>
            <div class='modal-body'>
                <div style='flex:0 0 320px; display:flex; flex-direction:column; gap:12px;'>
                    <div><strong>Sound</strong></div>
                    <div>Music Volume: <input id='settings-music' type='range' min='0' max='1' step='0.01' value='${current.musicVolume}' class='input-small' /></div>
                    <div>SFX Volume: <input id='settings-sfx' type='range' min='0' max='1' step='0.01' value='${current.sfxVolume}' class='input-small' /></div>
                    <div style='margin-top:8px;'><strong>Gameplay</strong></div>
                    <div><label><input id='settings-alwaysrun' type='checkbox' ${current.alwaysRun ? 'checked' : ''} /> Always run</label></div>
                    <div><label><input id='settings-showatk' type='checkbox' ${current.showAtkRange ? 'checked' : ''} /> Show attack range</label></div>
                    <div style='margin-top:8px;'><strong>Auto-Use</strong></div>
                    <div style='display:flex;flex-direction:column;gap:6px;'>
                        <label style='display:flex;align-items:center;gap:8px;'><input id='settings-autohp' type='checkbox' ${current.autoUseHP ? 'checked' : ''} /> Auto-use Health Potions at or below <input id='settings-autohp-th' type='number' min='1' max='99' step='1' value='${current.autoUseHPThreshold}' class='input-small' style='width:64px;' />%</label>
                        <label style='display:flex;align-items:center;gap:8px;'><input id='settings-automp' type='checkbox' ${current.autoUseMana ? 'checked' : ''} /> Auto-use Mana Potions at or below <input id='settings-automp-th' type='number' min='1' max='99' step='1' value='${current.autoUseManaThreshold}' class='input-small' style='width:64px;' />%</label>
                        <div style='font-size:12px;color:rgba(255,255,255,0.7)'>Auto-use is rate-limited and picks the smallest potion that helps.</div>
                    </div>
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
    const autohp = modal.querySelector('#settings-autohp'); const autohpTh = modal.querySelector('#settings-autohp-th');
    const automp = modal.querySelector('#settings-automp'); const autompTh = modal.querySelector('#settings-automp-th');
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
    if (autohp) autohp.onchange = () => {
        try { current.autoUseHP = Boolean(autohp.checked); saveSettings(current); if (typeof window !== 'undefined') window.__game_settings = Object.assign({}, window.__game_settings || {}, { autoUseHP: current.autoUseHP }); } catch (e) {}
    };
    if (autohpTh) autohpTh.onchange = autohpTh.oninput = () => {
        try {
            const v = Math.max(1, Math.min(99, Number(autohpTh.value || 35)));
            current.autoUseHPThreshold = v; autohpTh.value = String(v);
            saveSettings(current);
            if (typeof window !== 'undefined') window.__game_settings = Object.assign({}, window.__game_settings || {}, { autoUseHPThreshold: current.autoUseHPThreshold });
        } catch (e) {}
    };
    if (automp) automp.onchange = () => {
        try { current.autoUseMana = Boolean(automp.checked); saveSettings(current); if (typeof window !== 'undefined') window.__game_settings = Object.assign({}, window.__game_settings || {}, { autoUseMana: current.autoUseMana }); } catch (e) {}
    };
    if (autompTh) autompTh.onchange = autompTh.oninput = () => {
        try {
            const v = Math.max(1, Math.min(99, Number(autompTh.value || 20)));
            current.autoUseManaThreshold = v; autompTh.value = String(v);
            saveSettings(current);
            if (typeof window !== 'undefined') window.__game_settings = Object.assign({}, window.__game_settings || {}, { autoUseManaThreshold: current.autoUseManaThreshold });
        } catch (e) {}
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
try { if (typeof window !== 'undefined') { window.__shared_ui = window.__shared_ui || {}; window.__shared_ui.playBackgroundMusic = playBackgroundMusic; window.__shared_ui.stopBackgroundMusic = stopBackgroundMusic; window.__shared_ui.setBackgroundMusicVolume = setBackgroundMusicVolume; window.__shared_ui.maybeAutoUsePotions = maybeAutoUsePotions; } } catch (e) {}

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
        const hasHealFlat = !!def.healAmount;
        const hasHealPercent = typeof def.healPercent === 'number' && def.healPercent > 0;
        if (hasHealFlat || hasHealPercent) {
            try { console.log && console.log('[useItemFromSlot] heal detected', { healAmount: def.healAmount, healPercent: def.healPercent, usable: def.usable }); } catch(e) {}
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
                    let rawHeal = hasHealPercent ? Math.floor(maxhp * (def.healPercent / 100)) : Number(def.healAmount || 0);
                    // Apply potionEffect scaling if present in effective stats
                    if (eff && typeof eff.potionEffect === 'number' && eff.potionEffect > 0) {
                        rawHeal = Math.floor(rawHeal * (1 + eff.potionEffect / 100));
                    }
                    rawHeal = Math.max(1, rawHeal);
                    const before = currentHp;
                    scene.char.hp = Math.min(maxhp, currentHp + rawHeal);
                    const actual = scene.char.hp - before;
                    acted = true;
                    if (scene._showToast) scene._showToast(`${def.name || s.id} used (+${actual} HP${hasHealPercent ? ' / ' + def.healPercent + '%': ''})`);
                }
            }
        }
        // mana
        const hasManaFlat = !!def.manaAmount;
        const hasManaPercent = typeof def.manaPercent === 'number' && def.manaPercent > 0;
        if (hasManaFlat || hasManaPercent) {
            try { console.log && console.log('[useItemFromSlot] mana detected', { manaAmount: def.manaAmount, manaPercent: def.manaPercent, usable: def.usable }); } catch(e) {}
            attempted = true;
            if (!def.usable) { if (scene._showToast) scene._showToast('Cannot use that item'); }
            else {
                let eff = null; try { if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(scene.char); } catch (e) {}
                const maxmana = (eff && typeof eff.maxmana === 'number') ? eff.maxmana : ((typeof scene.char.maxmana === 'number' && scene.char.maxmana > 0) ? scene.char.maxmana : Math.max(0, Math.floor(50 + (scene.char.level || 1) * 5 + (((scene.char.stats && scene.char.stats.int) || 0) * 10))));
                const currentMana = (typeof scene.char.mana === 'number') ? scene.char.mana : maxmana;
                if (currentMana >= maxmana) {
                    if (scene._showToast) scene._showToast('Already at full mana');
                } else {
                    let rawMana = hasManaPercent ? Math.floor(maxmana * (def.manaPercent / 100)) : Number(def.manaAmount || 0);
                    if (eff && typeof eff.potionEffect === 'number' && eff.potionEffect > 0) {
                        rawMana = Math.floor(rawMana * (1 + eff.potionEffect / 100));
                    }
                    rawMana = Math.max(1, rawMana);
                    const beforeM = currentMana;
                    scene.char.mana = Math.min(maxmana, currentMana + rawMana);
                    const actualM = scene.char.mana - beforeM;
                    acted = true;
                    if (scene._showToast) scene._showToast(`${def.name || s.id} used (+${actualM} Mana${hasManaPercent ? ' / ' + def.manaPercent + '%': ''})`);
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

// ===============================
// Skill Bar + Buffs Panel (HUD)
// ===============================

function ensureSkillBar() {
    if (typeof document === 'undefined') return null;
    let bar = document.getElementById('global-skill-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'global-skill-bar';
        const inner = document.createElement('div'); inner.className = 'skillbar-inner';
        const slots = document.createElement('div'); slots.className = 'skill-slots'; slots.id = 'skill-slots';
        const buffs = document.createElement('div'); buffs.className = 'buffs-panel'; buffs.id = 'skill-buffs';
        inner.appendChild(slots); inner.appendChild(buffs);
        bar.appendChild(inner);
        document.body.appendChild(bar);
    }
    return bar;
}

function collectActiveBuffs(scene) {
    const list = [];
    if (!scene || !scene.char) return list;
    const now = Date.now();
    try { if (typeof pruneExpiredBuffs === 'function') pruneExpiredBuffs(scene); } catch (e) {}
    // 1) Generic temporary buffs from items/skills stored in char._buffs
    try {
        const arr = Array.isArray(scene.char._buffs) ? scene.char._buffs : (Array.isArray(scene.char.buffs) ? scene.char.buffs : null);
        if (Array.isArray(arr)) {
            for (const b of arr) {
                if (!b) continue;
                const name = b.name || (b.source ? String(b.source).replace(/_/g,' ') : 'Buff');
                const remainingMs = (typeof b.expiresAt === 'number') ? (b.expiresAt - now) : null;
                if (remainingMs != null && remainingMs <= 0) continue;
                const eta = remainingMs != null ? Math.ceil(Math.max(0, remainingMs) / 1000) : null;
                list.push({ key: 'generic_' + (b.id || name), label: name, eta, temporary: remainingMs != null });
            }
        }
    } catch (e) {}
    // 2) Skill-based ephemeral buffs (from combat.js conventions)
    try {
        const c = scene.char;
        // Shadowstep: show active stealth window while it lasts
        try {
            if (c._shadowstep && c._shadowstep.stealth && typeof c._shadowstep.expiresAt === 'number' && c._shadowstep.expiresAt > now) {
                const eta = Math.ceil((c._shadowstep.expiresAt - now) / 1000);
                list.push({ key: 'stealth_active', label: 'Stealth', eta: eta, temporary: true });
            }
        } catch (ee) {}
        if (c._postStealthDodge && c._postStealthDodge.expiresAt > now) {
            list.push({ key: 'stealth_dodge', label: `Dodge ${Math.round(c._postStealthDodge.percent||0)}%`, eta: Math.ceil((c._postStealthDodge.expiresAt-now)/1000), temporary: true });
        }
        if (c._postStealthHaste && c._postStealthHaste.expiresAt > now) {
            list.push({ key: 'stealth_haste', label: `Haste ${Math.round(c._postStealthHaste.percent||0)}%`, eta: Math.ceil((c._postStealthHaste.expiresAt-now)/1000), temporary: true });
        }
        if (c._postStealthCritDmgBuff && c._postStealthCritDmgBuff.expiresAt > now) {
            list.push({ key: 'stealth_crit', label: `Crit Dmg +${Math.round(c._postStealthCritDmgBuff.percent||0)}%`, eta: Math.ceil((c._postStealthCritDmgBuff.expiresAt-now)/1000), temporary: true });
        }
        if (typeof c._stealthPoints === 'number' && c._stealthPoints > 0) {
            list.push({ key: 'stealth_points', label: `${Math.floor(c._stealthPoints)} SP`, eta: null, temporary: false });
        }
        if (c._manaShield && c._manaShield.max > 0) {
            const cur = Math.floor(c._manaShield.current || 0); const mx = Math.floor(c._manaShield.max || 0);
            list.push({ key: 'mana_shield', label: `Shield ${cur}/${mx}`, eta: null, temporary: false });
        }
        // Dark Shield (burst-on-low-hp) — show remaining absorb and its expiry if present
        try {
            if (c._darkShield && typeof c._darkShield.remaining === 'number' && c._darkShield.remaining > 0) {
                const eta = (typeof c._darkShield.expiresAt === 'number') ? Math.ceil((c._darkShield.expiresAt - now) / 1000) : null;
                if (eta == null || eta > 0) list.push({ key: 'dark_shield', label: `Dark Shield ${Math.floor(c._darkShield.remaining)}`, eta: eta, temporary: true });
            }
        } catch (ee) {}
        if (c._terrorAuraEnabled) {
            list.push({ key: 'terror_aura', label: 'Terror Aura', eta: null, temporary: false });
        }
        if (c._marksmanFocusBonuses) {
            const cc = Math.round(c._marksmanFocusBonuses.critChance || 0);
            const cd = Math.round(c._marksmanFocusBonuses.critDmg || 0);
            list.push({ key: 'marksman_focus', label: `Focus +${cc}%/${cd}%`, eta: null, temporary: false });
        }
        // Standing DR (glyphic_anchor): while standing, show DR percent
        try {
            if (c._isStanding && typeof c._standingDRPercent === 'number' && c._standingDRPercent > 0) {
                list.push({ key: 'standing_dr', label: `Standing DR +${Math.round(c._standingDRPercent)}%`, eta: null, temporary: false });
            }
        } catch (ee) {}
        // Blood Ritual Reserve: channeling state
        try {
            if (c._bloodRitualReserve && c._bloodRitualReserve.active) {
                list.push({ key: 'blood_ritual', label: 'Blood Ritual', eta: null, temporary: true });
            }
        } catch (ee) {}
        // Unholy Frenzy (scene-level flag/expiry managed in combat.js)
        try {
            if (scene._frenzyActive) {
                const eta = (typeof scene._frenzyExpiresAt === 'number') ? Math.ceil((scene._frenzyExpiresAt - now) / 1000) : null;
                if (eta == null || eta > 0) {
                    list.push({ key: 'unholy_frenzy', label: 'Unholy Frenzy', eta: eta, temporary: true });
                }
            }
        } catch (ee) {}
    } catch (e) {}
    return list;
}

// (removed duplicate minimal refreshSkillBarHUD/bind/unbind in favor of the full implementation below)


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
    // Apply Login scene styling
    modal.style.background = 'linear-gradient(180deg, rgba(12,12,14,0.98) 0%, rgba(18,18,20,0.96) 100%)';
    modal.style.border = '4px solid #111';
    modal.style.borderLeft = '10px solid rgba(80,10,10,0.95)';
    modal.style.borderRight = '2px solid #222';
    modal.style.boxShadow = '0 30px 80px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.02)';
    modal.style.borderRadius = '6px';
    modal.style.overflow = 'hidden';
    modal.style.padding = '12px';
    modal.style.color = '#f0c9b0';
    modal.style.fontFamily = "'Share Tech Mono', monospace";
    modal.style.minWidth = '420px';
    // include gold display in header so players can see current gold in inventory modal
    const currentGold = (char && typeof char.gold === 'number') ? char.gold : 0;
    modal.innerHTML = `
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:12px;'>
            <div style='display:flex;align-items:center;gap:10px;'>
                <strong style="font-weight:800; letter-spacing:0.02em;">Inventory</strong>
                <div style='display:inline-flex;align-items:center;gap:6px;background:rgba(0,0,0,0.25);padding:6px 8px;border-radius:8px;font-weight:700;color:#ffd27a;border:1px solid rgba(255,255,255,0.08);'>💰<span id='inv-gold'>${currentGold}</span></div>
            </div>
            <button id='inv-close' class='btn' style='padding:6px 10px; font-size:12px;'>Close</button>
        </div>
        <div id='inv-items' class='grid-scroll'><div id='inv-grid' class='slot-grid'></div></div>`;
    document.body.appendChild(modal);
    scene._inventoryModal = modal;
    const closeBtn = modal.querySelector('#inv-close');
    if (closeBtn) closeBtn.onclick = () => closeInventoryModal(scene);
    // Auto-clean on scene shutdown
    try { scene.events && scene.events.once && scene.events.once('shutdown', () => { try { closeInventoryModal(scene); } catch (e) {} }); } catch (e) {}
    // Fetch latest character snapshot (gold + inventory) from server on open to ensure consistency
    try {
        const charId = (scene && scene.char && scene.char.id) || (scene && scene._character && scene._character.id) || null;
        if (charId && typeof window !== 'undefined' && window.__cif_persist) {
            if (typeof window.__cif_persist.loadCharacterFull === 'function') {
                window.__cif_persist.loadCharacterFull(String(charId)).then((loaded) => {
                    try {
                        if (!loaded) return;
                        // Update gold from DB
                        if (typeof loaded.gold === 'number') scene.char.gold = loaded.gold;
                        // Update inventory slots from DB snapshot
                        if (Array.isArray(loaded.inventory)) {
                            scene.char.inventory = initSlots(loaded.inventory.map(s => (s ? { id: s.id, qty: s.qty } : null)));
                        }
                        refreshInventoryModal(scene);
                    } catch (e) { /* ignore refresh errors */ }
                }).catch(() => { /* ignore fetch errors */ });
            } else if (typeof window.__cif_persist.loadInventory === 'function') {
                // Fallback: at least refresh inventory from server if full loader not available
                window.__cif_persist.loadInventory(String(charId)).then((slots) => {
                    try {
                        if (!Array.isArray(slots)) return;
                        scene.char.inventory = initSlots(slots.map(s => (s ? { id: s.id, qty: s.qty } : null)));
                        refreshInventoryModal(scene);
                    } catch (e) { /* ignore refresh errors */ }
                }).catch(() => { /* ignore fetch errors */ });
            }
        }
    } catch (e) { /* silent */ }
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
        
        // Make slots draggable if they have an item
        if (s) {
            slotEl.draggable = true;
            slotEl.style.cursor = 'grab';
            
            // Drag start
            slotEl.addEventListener('dragstart', (ev) => {
                ev.dataTransfer.effectAllowed = 'move';
                ev.dataTransfer.setData('text/plain', i.toString());
                slotEl.style.opacity = '0.5';
                slotEl.style.cursor = 'grabbing';
            });
            
            // Drag end
            slotEl.addEventListener('dragend', (ev) => {
                slotEl.style.opacity = '1';
                slotEl.style.cursor = 'grab';
            });
        }
        
        // Allow all slots to be drop targets
        slotEl.addEventListener('dragover', (ev) => {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            slotEl.style.background = 'rgba(80,10,10,0.3)';
        });
        
        slotEl.addEventListener('dragleave', (ev) => {
            slotEl.style.background = '';
        });
        
        slotEl.addEventListener('drop', (ev) => {
            ev.preventDefault();
            slotEl.style.background = '';
            
            const fromIndex = parseInt(ev.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(slotEl.dataset.slotIndex);
            
            if (fromIndex === toIndex || isNaN(fromIndex) || isNaN(toIndex)) return;
            
            // Swap the items
            const temp = inv[fromIndex];
            inv[fromIndex] = inv[toIndex];
            inv[toIndex] = temp;
            
            // Update the character's inventory
            scene.char.inventory = inv;
            
            // Refresh the display
            refreshInventoryModal(scene);
        });
        
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
                    if (def && def.usable && !isNaN(idx)) {
                        const used = useItemFromSlot(scene, idx);
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
                        if (!isNaN(idx)) {
                            try { 
                                const ok = useItemFromSlot(scene, idx); 
                                try { console.debug && console.debug('[inventory] slot key use returned', ok); } catch(e) {} 
                                if (ok) {
                                    try { refreshInventoryModal(scene); } catch (e) {}
                                    try { refreshEquipmentModal(scene); } catch (e) {}
                                }
                            } catch(e) {}
                        }
                    }
                });
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
    // Apply Login scene styling
    modal.style.background = 'linear-gradient(180deg, rgba(12,12,14,0.98) 0%, rgba(18,18,20,0.96) 100%)';
    modal.style.border = '4px solid #111';
    modal.style.borderLeft = '10px solid rgba(80,10,10,0.95)';
    modal.style.borderRight = '2px solid #222';
    modal.style.boxShadow = '0 30px 80px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.02)';
    modal.style.borderRadius = '6px';
    modal.style.overflow = 'hidden';
    modal.style.padding = '12px';
    modal.style.color = '#f0c9b0';
    modal.style.fontFamily = "'Share Tech Mono', monospace";
    modal.style.minWidth = '360px';
    // Equipment grid (no details pane) — preserve layout/structure, update header/button styling
    modal.innerHTML = `
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'>
            <strong style="font-weight:800; letter-spacing:0.02em;">Equipment</strong>
            <button id='equip-close' class='btn' style='padding:6px 10px; font-size:12px;'>Close</button>
        </div>
        <div id='equip-body' class='modal-body'><div class='equip-grid'><div class='equip-slots' id='equip-slots'></div></div></div>`;
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

// Quest Log modal (MMO-style with tabs)
export function openQuestLogModal(scene) {
    if (!scene) return;
    const char = scene.char = scene.char || {};
    if (!char.activeQuests) char.activeQuests = [];
    if (!char.completedQuests) char.completedQuests = [];
    if (scene._questLogModal) return;
    
    // On open, refresh quests from server so progress reflects DB truth (not just local memory)
    try {
        const charId = (scene && scene.char && scene.char.id) || (scene && scene._character && scene._character.id) || null;
        if (charId && typeof window !== 'undefined' && window.__cif_persist && typeof window.__cif_persist.loadCharacterFull === 'function') {
            window.__cif_persist.loadCharacterFull(String(charId)).then((loaded) => {
                try {
                    if (!loaded) return;
                    // Merge quests from DB
                    if (Array.isArray(loaded.activeQuests)) {
                        scene.char.activeQuests = loaded.activeQuests.map(q => ({ id: q.id, progress: q.progress || [] }));
                    }
                    if (Array.isArray(loaded.completedQuests)) {
                        scene.char.completedQuests = loaded.completedQuests.slice();
                    }
                    // After loading, if modal gets created, it will render with server state
                } catch (e) { /* ignore */ }
            }).catch(() => { /* ignore */ });
        }
    } catch (e) { /* ignore */ }
    
    const modal = document.createElement('div');
    modal.id = 'quest-log-modal';
    modal.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 240;
        background: linear-gradient(135deg, #1a1a20, #0f0f14);
        color: #e8d8c8;
        padding: 0;
        border-radius: 12px;
        min-width: 500px;
        max-width: 700px;
        max-height: 85vh;
        box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 0 2px rgba(255,210,120,0.3);
        overflow: hidden;
        font-family: 'Share Tech Mono', monospace;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(90deg, rgba(40,30,20,0.9), rgba(30,20,10,0.8));
            padding: 16px 20px;
            border-bottom: 2px solid rgba(255,210,120,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8em;">📜</span>
                <strong style="
                    font-family: 'Metal Mania', cursive;
                    font-size: 1.4em;
                    color: #ffd27a;
                    text-shadow: 0 2px 6px rgba(0,0,0,0.8);
                ">Quest Log</strong>
            </div>
            <button id='quest-log-close' style="
                background: rgba(60,30,30,0.6);
                color: #fff;
                border: 1px solid rgba(255,100,100,0.4);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1.2em;
                font-weight: bold;
                transition: all 0.2s;
                font-family: inherit;
            " onmouseover="this.style.background='rgba(80,40,40,0.8)'; this.style.borderColor='rgba(255,100,100,0.6)';" onmouseout="this.style.background='rgba(60,30,30,0.6)'; this.style.borderColor='rgba(255,100,100,0.4)';">×</button>
        </div>
        <div style="
            display: flex;
            gap: 0;
            background: rgba(20,20,24,0.5);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding: 0 20px;
        ">
            <button id="quest-tab-active" class="quest-tab" style="
                flex: 1;
                padding: 12px 16px;
                background: rgba(40,35,30,0.7);
                border: none;
                border-bottom: 3px solid #fbbf24;
                color: #ffd27a;
                cursor: pointer;
                font-family: inherit;
                font-size: 0.95em;
                font-weight: 600;
                transition: all 0.2s;
            ">
                <span style="margin-right: 6px;">📋</span>
                Active Quests
            </button>
            <button id="quest-tab-completed" class="quest-tab" style="
                flex: 1;
                padding: 12px 16px;
                background: transparent;
                border: none;
                border-bottom: 3px solid transparent;
                color: #888;
                cursor: pointer;
                font-family: inherit;
                font-size: 0.95em;
                font-weight: 600;
                transition: all 0.2s;
            " onmouseover="if(this.style.borderBottomColor === 'transparent') this.style.color='#aaa';" onmouseout="if(this.style.borderBottomColor === 'transparent') this.style.color='#888';">
                <span style="margin-right: 6px;">✓</span>
                Completed
            </button>
        </div>
        <div id='quest-log-body' style="
            padding: 20px;
            max-height: calc(85vh - 140px);
            overflow-y: auto;
            overflow-x: hidden;
        "></div>
    `;
    
    document.body.appendChild(modal);
    scene._questLogModal = modal;
    scene._questLogCurrentTab = 'active';
    
    // Close button
    modal.querySelector('#quest-log-close').onclick = () => closeQuestLogModal(scene);
    
    // Tab switching
    const activeTab = modal.querySelector('#quest-tab-active');
    const completedTab = modal.querySelector('#quest-tab-completed');
    
    const switchTab = (tabName) => {
        scene._questLogCurrentTab = tabName;
        if (tabName === 'active') {
            activeTab.style.background = 'rgba(40,35,30,0.7)';
            activeTab.style.borderBottomColor = '#fbbf24';
            activeTab.style.color = '#ffd27a';
            completedTab.style.background = 'transparent';
            completedTab.style.borderBottomColor = 'transparent';
            completedTab.style.color = '#888';
        } else {
            completedTab.style.background = 'rgba(40,35,30,0.7)';
            completedTab.style.borderBottomColor = '#4ade80';
            completedTab.style.color = '#4ade80';
            activeTab.style.background = 'transparent';
            activeTab.style.borderBottomColor = 'transparent';
            activeTab.style.color = '#888';
        }
        refreshQuestLogModal(scene);
    };
    
    activeTab.onclick = () => switchTab('active');
    completedTab.onclick = () => switchTab('completed');
    
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
    // If no scene provided, try to find the active scene with a quest log
    if (!scene) {
        try {
            if (typeof window !== 'undefined' && window.__phaserGame) {
                const game = window.__phaserGame;
                if (game && game.scene && game.scene.scenes) {
                    // Find first active scene with a quest log modal
                    for (const s of game.scene.scenes) {
                        if (s && s.scene && s.scene.isActive() && s._questLogModal) {
                            scene = s;
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[Quest Log] Could not find active scene:', e);
        }
    }
    
    if (!scene || !scene._questLogModal) return;
    const body = scene._questLogModal.querySelector('#quest-log-body');
    body.innerHTML = '';
    const char = scene.char || {};
    const active = char.activeQuests || [];
    const completed = char.completedQuests || [];
    const questModule = window.__questModule;
    const quests = (window && window.QUEST_DEFS) ? window.QUEST_DEFS : {};
    const objectiveStateFn = (questModule && typeof questModule.getQuestObjectiveState === 'function') ? questModule.getQuestObjectiveState : null;
    const currentTab = scene._questLogCurrentTab || 'active';

    if (currentTab === 'active') {
        if (active.length > 0) {
            for (const q of active) {
                const questId = (q && q.id) ? q.id : q;
                const def = quests[questId];
                if (!def) continue;
                
                const progressStates = objectiveStateFn ? objectiveStateFn(scene.char, questId) : null;
                const allComplete = progressStates && progressStates.length > 0 && progressStates.every(s => (s.current || 0) >= (s.required || 1));
                const questLevel = def.level || '?';
                const questType = def.type || 'Main';
                const typeIcon = questType === 'Main' ? '⭐' : questType === 'Side' ? '📌' : '💼';
                
                const div = document.createElement('div');
                div.style.cssText = `
                    margin-bottom: 16px;
                    padding: 14px;
                    background: linear-gradient(135deg, rgba(30,25,20,0.7), rgba(20,15,10,0.5));
                    border-left: 5px solid ${allComplete ? '#4ade80' : '#fbbf24'};
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    transition: all 0.2s;
                `;
                div.onmouseover = function() { this.style.background = 'linear-gradient(135deg, rgba(40,35,30,0.8), rgba(30,25,20,0.6))'; this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.7)'; };
                div.onmouseout = function() { this.style.background = 'linear-gradient(135deg, rgba(30,25,20,0.7), rgba(20,15,10,0.5))'; this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'; };
                
                let inner = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="font-size: 1.3em;">${typeIcon}</span>
                                <strong style="font-size: 1.1em; color: ${allComplete ? '#4ade80' : '#ffd27a'}; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${def.name || questId}</strong>
                                ${allComplete ? '<span style="color: #4ade80; font-size: 1.2em; margin-left: 8px;">✓</span>' : ''}
                            </div>
                            <div style="font-size: 0.8em; color: #888; font-weight: 600; letter-spacing: 0.5px; margin-left: 32px;">[Level ${questLevel}] ${questType} Quest</div>
                        </div>
                    </div>
                `;
                
                const description = def && def.description ? def.description : '';
                if (description) inner += `<div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-left: 3px solid rgba(255,210,120,0.2); border-radius: 4px; font-size: 0.9em; color: #d4c5b9; line-height: 1.5;">${description}</div>`;
                
                // Objectives section
                const rawProgress = Array.isArray(q && q.progress) ? q.progress : [];
                const objectives = Array.isArray(def && def.objectives) ? def.objectives : [];
                
                if (objectives.length > 0) {
                    inner += '<div style="margin-top: 12px;"><div style="font-size: 0.85em; color: #fbbf24; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px;">OBJECTIVES:</div>';
                    
                    for (const obj of objectives) {
                        const targetId = obj.target || obj.id || obj.type;
                        let current = 0;
                        let required = obj.required || 1;
                        
                        if (Array.isArray(progressStates)) {
                            const state = progressStates.find(s => s && s.type === obj.type && (targetId ? s.target === targetId : true));
                            if (state) {
                                required = state.required || required;
                                current = Math.min(state.current || 0, required);
                            }
                        } else {
                            const progressEntry = rawProgress.find(p => p && p.type === obj.type && (!targetId || p.target === targetId));
                            current = progressEntry && typeof progressEntry.current === 'number' ? progressEntry.current : 0;
                            required = progressEntry && typeof progressEntry.required === 'number' ? progressEntry.required : required;
                        }
                        
                        const isComplete = current >= required;
                        const percent = Math.min(100, Math.floor((current / required) * 100));
                        
                        inner += `
                            <div style="margin-bottom: 8px; padding-left: 8px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                    <span style="color: ${isComplete ? '#4ade80' : '#fbbf24'}; font-weight: bold;">${isComplete ? '✓' : '○'}</span>
                                    <span style="font-size: 0.9em; color: ${isComplete ? '#4ade80' : '#d4c5b9'};">${obj.description || obj.type}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding-left: 24px;">
                                    <div style="
                                        flex: 1;
                                        height: 16px;
                                        background: rgba(0,0,0,0.5);
                                        border: 1px solid rgba(255,255,255,0.1);
                                        border-radius: 4px;
                                        overflow: hidden;
                                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
                                    ">
                                        <div style="
                                            height: 100%;
                                            width: ${percent}%;
                                            background: ${isComplete ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #fbbf24, #f59e0b)'};
                                            box-shadow: 0 0 8px ${isComplete ? 'rgba(74,222,128,0.5)' : 'rgba(251,191,36,0.5)'};
                                            transition: width 0.3s ease;
                                        "></div>
                                    </div>
                                    <span style="
                                        font-size: 0.85em;
                                        font-weight: 700;
                                        color: ${isComplete ? '#4ade80' : '#fff'};
                                        min-width: 60px;
                                        text-align: right;
                                    ">${current} / ${required}</span>
                                </div>
                            </div>
                        `;
                    }
                    inner += '</div>';
                }
                
                // Rewards section
                if (def.rewards) {
                    inner += '<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);"><div style="font-size: 0.85em; color: #fbbf24; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px;">REWARDS:</div><div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.85em;">';
                    
                    if (def.rewards.exp) inner += `<span style="padding: 4px 10px; background: rgba(238,238,68,0.15); border: 1px solid rgba(238,238,68,0.3); border-radius: 4px; color: #eee;">💫 ${def.rewards.exp} EXP</span>`;
                    if (def.rewards.gold) inner += `<span style="padding: 4px 10px; background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3); border-radius: 4px; color: #ffd700;">💰 ${def.rewards.gold} Gold</span>`;
                    if (def.rewards.items && def.rewards.items.length > 0) {
                        for (const item of def.rewards.items) {
                            const itemName = typeof item === 'string' ? item : item.id || 'Item';
                            inner += `<span style="padding: 4px 10px; background: rgba(147,51,234,0.15); border: 1px solid rgba(147,51,234,0.3); border-radius: 4px; color: #c084fc;">🎁 ${itemName}</span>`;
                        }
                    }
                    
                    inner += '</div></div>';
                }
                
                // Turn-in info
                if (allComplete && def.handInNpc) {
                    inner += `
                        <div style="
                            margin-top: 12px;
                            padding: 10px;
                            background: linear-gradient(90deg, rgba(74,222,128,0.2), rgba(34,197,94,0.15));
                            border: 1px solid rgba(74,222,128,0.4);
                            border-radius: 6px;
                            text-align: center;
                            color: #4ade80;
                            font-weight: 600;
                            font-size: 0.9em;
                        ">
                            <span style="font-size: 1.2em; margin-right: 6px;">✨</span>
                            Quest Complete! Return to ${def.handInNpc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                    `;
                }
                
                div.innerHTML = inner;
                body.appendChild(div);
            }
        } else {
            body.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #888;"><div style="font-size: 3em; margin-bottom: 12px; opacity: 0.3;">📋</div><div style="font-size: 1.1em;">No active quests</div><div style="font-size: 0.9em; margin-top: 8px; font-style: italic;">Visit NPCs with <span style="color: #fbbf24;">❓</span> above their heads to begin your adventures!</div></div>';
        }
    } else {
        // Completed tab
        if (completed.length > 0) {
            for (const entry of completed) {
                const questId = (entry && entry.id) ? entry.id : entry;
                const def = quests[questId];
                const div = document.createElement('div');
                div.style.cssText = `
                    margin-bottom: 12px;
                    padding: 12px;
                    background: linear-gradient(135deg, rgba(20,30,20,0.5), rgba(10,20,10,0.3));
                    border-left: 4px solid #4ade80;
                    border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    transition: all 0.2s;
                `;
                div.onmouseover = function() { this.style.background = 'linear-gradient(135deg, rgba(30,40,30,0.6), rgba(20,30,20,0.4))'; };
                div.onmouseout = function() { this.style.background = 'linear-gradient(135deg, rgba(20,30,20,0.5), rgba(10,20,10,0.3))'; };
                
                const questLevel = def && def.level ? def.level : '?';
                const questType = def && def.type ? def.type : 'Main';
                const typeIcon = questType === 'Main' ? '⭐' : questType === 'Side' ? '📌' : '💼';
                
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5em; color: #4ade80;">✓</span>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 1.1em;">${typeIcon}</span>
                                <strong style="color: #4ade80; font-size: 1.05em;">${def ? def.name || questId : questId}</strong>
                            </div>
                            <div style="font-size: 0.75em; color: #666; margin-top: 2px; margin-left: 28px;">[Level ${questLevel}] ${questType} Quest</div>
                        </div>
                    </div>
                `;
                body.appendChild(div);
            }
        } else {
            body.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #888;"><div style="font-size: 3em; margin-bottom: 12px; opacity: 0.3;">📜</div><div style="font-size: 1.1em;">No completed quests yet</div><div style="font-size: 0.9em; margin-top: 8px; font-style: italic;">Complete quests to fill your legacy!</div></div>';
        }
    }
}

// Active Quest Tracker - shows on-screen quest progress (MMO-style)
export function createQuestTracker(scene) {
    if (!scene) return;
    if (scene._questTracker) return scene._questTracker;

    const tracker = document.createElement('div');
    tracker.id = 'quest-tracker';
    tracker.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        max-height: 500px;
        overflow-y: auto;
        overflow-x: hidden;
        z-index: 90;
        background: linear-gradient(135deg, rgba(20,20,24,0.97), rgba(10,10,14,0.95));
        border: 2px solid rgba(255,210,120,0.3);
        border-radius: 8px;
        padding: 0;
        color: #e8d8c8;
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.9em;
        box-shadow: 0 12px 36px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05);
        pointer-events: auto;
        backdrop-filter: blur(8px);
        transition: all 0.3s ease;
    `;

    tracker.innerHTML = `
        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 14px;
            background: linear-gradient(90deg, rgba(40,25,10,0.6), rgba(20,15,5,0.4));
            border-bottom: 2px solid rgba(255,210,120,0.2);
            border-radius: 6px 6px 0 0;
        ">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.3em;">📜</span>
                <span style="
                    font-family: 'Metal Mania', cursive;
                    font-size: 1.15em;
                    color: #ffd27a;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.7);
                    letter-spacing: 0.5px;
                ">Quest Log</span>
            </div>
            <button id="quest-tracker-toggle" style="
                background: rgba(40,40,50,0.6);
                color: #ffd27a;
                border: 1px solid rgba(255,210,120,0.3);
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.95em;
                font-weight: bold;
                transition: all 0.2s;
                font-family: inherit;
            " title="Collapse/Expand" onmouseover="this.style.background='rgba(60,60,70,0.8)'; this.style.borderColor='rgba(255,210,120,0.5)';" onmouseout="this.style.background='rgba(40,40,50,0.6)'; this.style.borderColor='rgba(255,210,120,0.3)';">−</button>
        </div>
        <div id="quest-tracker-content" style="padding: 10px;"></div>
    `;

    document.body.appendChild(tracker);
    scene._questTracker = tracker;
    scene._questTrackerCollapsed = false;

    // Toggle collapse/expand
    const toggleBtn = tracker.querySelector('#quest-tracker-toggle');
    const content = tracker.querySelector('#quest-tracker-content');
    toggleBtn.onclick = () => {
        scene._questTrackerCollapsed = !scene._questTrackerCollapsed;
        if (scene._questTrackerCollapsed) {
            content.style.display = 'none';
            toggleBtn.textContent = '+';
            tracker.style.maxHeight = 'auto';
        } else {
            content.style.display = 'block';
            toggleBtn.textContent = '−';
            tracker.style.maxHeight = '500px';
        }
    };

    // Auto-cleanup on scene shutdown
    try {
        scene.events?.once?.('shutdown', () => {
            try { 
                if (scene._questTrackerTimer) {
                    clearInterval(scene._questTrackerTimer);
                    scene._questTrackerTimer = null;
                }
                destroyQuestTracker(scene); 
            } catch (e) {}
        });
    } catch (e) {}

    // Start 3-second fallback polling
    if (!scene._questTrackerTimer) {
        scene._questTrackerTimer = setInterval(() => {
            try {
                updateQuestTracker(scene);
            } catch (e) {
                console.warn('[Quest Tracker] Timer update failed:', e);
            }
        }, 3000);
    }

    updateQuestTracker(scene);
    return tracker;
}

export function updateQuestTracker(scene) {
    // If no scene provided, try to find the active scene with a tracker
    if (!scene) {
        try {
            if (typeof window !== 'undefined' && window.__phaserGame) {
                const game = window.__phaserGame;
                if (game && game.scene && game.scene.scenes) {
                    // Find first active scene with a quest tracker
                    for (const s of game.scene.scenes) {
                        if (s && s.scene && s.scene.isActive() && s._questTracker) {
                            scene = s;
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[Quest Tracker] Could not find active scene:', e);
        }
    }
    
    if (!scene || !scene._questTracker) return;
    const content = scene._questTracker.querySelector('#quest-tracker-content');
    if (!content) return;

    const char = scene.char || {};
    const activeQuests = char.activeQuests || [];
    
    if (activeQuests.length === 0) {
        content.innerHTML = `
            <div style="
                color: #888;
                font-size: 0.9em;
                text-align: center;
                padding: 20px 10px;
                font-style: italic;
            ">
                <div style="font-size: 2em; margin-bottom: 8px; opacity: 0.3;">📋</div>
                No active quests
            </div>
        `;
        return;
    }

    const questModule = window.__questModule;
    const getObjectiveState = (questModule && typeof questModule.getQuestObjectiveState === 'function') 
        ? questModule.getQuestObjectiveState 
        : null;
    const getQuestDef = (questModule && typeof questModule.getQuestById === 'function') 
        ? questModule.getQuestById 
        : ((id) => (window.QUEST_DEFS && window.QUEST_DEFS[id]) ? window.QUEST_DEFS[id] : null);

    let html = '';
    for (const quest of activeQuests) {
        if (!quest || !quest.id) continue;
        
        const def = getQuestDef ? getQuestDef(quest.id) : null;
        if (!def) continue;

        const states = getObjectiveState ? getObjectiveState(char, quest.id) : [];
        const allComplete = states.length > 0 && states.every(s => (s.current || 0) >= (s.required || 1));
        const questLevel = def.level || '?';
        const questType = def.type || 'Main';

        // Quest type icon
        const typeIcon = questType === 'Main' ? '⭐' : questType === 'Side' ? '📌' : '💼';
        const borderColor = allComplete ? '#4ade80' : questType === 'Main' ? '#fbbf24' : '#60a5fa';

        html += `
            <div style="
                margin-bottom: 12px;
                background: linear-gradient(135deg, rgba(30,25,20,0.5), rgba(20,15,10,0.3));
                border-left: 4px solid ${borderColor};
                border-radius: 6px;
                padding: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                transition: all 0.2s;
            " onmouseover="this.style.background='linear-gradient(135deg, rgba(40,35,30,0.6), rgba(30,25,20,0.4))'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.6)';" onmouseout="this.style.background='linear-gradient(135deg, rgba(30,25,20,0.5), rgba(20,15,10,0.3))'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.4)';">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 6px;
                ">
                    <div style="flex: 1;">
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-bottom: 2px;
                        ">
                            <span style="font-size: 1.1em;">${typeIcon}</span>
                            <span style="
                                font-weight: 700;
                                color: ${allComplete ? '#4ade80' : '#ffd27a'};
                                font-size: 0.95em;
                                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                            ">${def.name || quest.id}</span>
                        </div>
                        <div style="
                            font-size: 0.75em;
                            color: #888;
                            font-weight: 600;
                            letter-spacing: 0.5px;
                        ">[Lv ${questLevel}] ${questType} Quest</div>
                    </div>
                    ${allComplete ? '<div style="font-size: 1.5em; color: #4ade80; text-shadow: 0 0 8px rgba(74,222,128,0.6);">✓</div>' : ''}
                </div>
        `;

        if (states.length > 0) {
            for (const obj of states) {
                const current = obj.current || 0;
                const required = obj.required || 1;
                const percent = Math.min(100, Math.floor((current / required) * 100));
                const isComplete = current >= required;
                
                html += `
                    <div style="margin-bottom: 6px; padding-left: 4px;">
                        <div style="
                            color: ${isComplete ? '#4ade80' : '#d4c5b9'};
                            margin-bottom: 3px;
                            font-size: 0.85em;
                            display: flex;
                            align-items: center;
                            gap: 4px;
                        ">
                            <span style="color: ${isComplete ? '#4ade80' : '#ffd27a'};">${isComplete ? '✓' : '○'}</span>
                            <span>${obj.description || obj.type}</span>
                        </div>
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            padding-left: 18px;
                        ">
                            <div style="
                                flex: 1;
                                height: 14px;
                                background: rgba(0,0,0,0.5);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 4px;
                                overflow: hidden;
                                position: relative;
                                box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
                            ">
                                <div style="
                                    height: 100%;
                                    width: ${percent}%;
                                    background: ${isComplete ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #fbbf24, #f59e0b)'};
                                    border-radius: 3px;
                                    box-shadow: 0 0 8px ${isComplete ? 'rgba(74,222,128,0.4)' : 'rgba(251,191,36,0.4)'};
                                    transition: width 0.3s ease;
                                "></div>
                            </div>
                            <span style="
                                color: ${isComplete ? '#4ade80' : '#fff'};
                                font-size: 0.85em;
                                font-weight: 600;
                                min-width: 50px;
                                text-align: right;
                                text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                            ">${current}/${required}</span>
                        </div>
                    </div>
                `;
            }
        }

        if (allComplete && def.handInNpc) {
            html += `
                <div style="
                    margin-top: 8px;
                    padding: 6px 8px;
                    background: linear-gradient(90deg, rgba(74,222,128,0.15), rgba(34,197,94,0.1));
                    border: 1px solid rgba(74,222,128,0.3);
                    border-radius: 4px;
                    font-size: 0.8em;
                    color: #4ade80;
                    font-weight: 600;
                    text-align: center;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                    animation: pulse 2s ease-in-out infinite;
                ">
                    <span style="margin-right: 4px;">✨</span>
                    Return to ${def.handInNpc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
            `;
        }

        html += '</div>';
    }

    content.innerHTML = html;

    // Add pulse animation if not already present
    if (!document.getElementById('quest-tracker-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'quest-tracker-animation-styles';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    }
}

export function destroyQuestTracker(scene) {
    if (!scene) return;
    if (scene._questTracker && scene._questTracker.parentNode) {
        scene._questTracker.parentNode.removeChild(scene._questTracker);
    }
    scene._questTracker = null;
    scene._questTrackerCollapsed = false;
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

        // Detect equipped weapon and choose scaling stat (staff: INT; dagger/bow: AGI; sword/polearm: STR)
        let isStaffEquipped = false;
        let scalingKeyForUI = 'str';
        let weaponDefForUI = null;
        try {
            const itemDefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
            const we = (char && char.equipment && char.equipment.weapon) ? char.equipment.weapon : null;
            if (we && we.id && itemDefs[we.id]) weaponDefForUI = itemDefs[we.id];
            const wid = String((weaponDefForUI && weaponDefForUI.id) || '').toLowerCase();
            const wname = String((weaponDefForUI && weaponDefForUI.name) || '').toLowerCase();
            isStaffEquipped = !!(weaponDefForUI && (/staff/.test(wid) || /staff/.test(wname)));
            if (isStaffEquipped) scalingKeyForUI = 'int';
            else if (/dagger/.test(wid) || /dagger/.test(wname)) scalingKeyForUI = 'agi';
            else if (/bow/.test(wid) || /bow/.test(wname) || /crossbow/.test(wid) || /crossbow/.test(wname)) scalingKeyForUI = 'agi';
            else if (/sword/.test(wid) || /sword/.test(wname)) scalingKeyForUI = 'str';
            else if (/polearm/.test(wid) || /polearm/.test(wname)) scalingKeyForUI = 'str';
            else {
                // fallback to class primary stat mapping
                const cls = (char && char.class) ? String(char.class).toLowerCase() : 'beginner';
                scalingKeyForUI = (cls === 'occultist' || cls === 'hexweaver' || cls === 'astral_scribe') ? 'int'
                    : (cls === 'stalker' || cls === 'nightblade' || cls === 'shade_dancer') ? 'agi'
                    : (cls === 'beginner') ? 'luk' : 'str';
            }
        } catch (e) { isStaffEquipped = false; scalingKeyForUI = 'str'; }

        // Compute an Auto Attack estimate that mirrors combat: use staff INT scaling or weapon-type scaling key,
        // otherwise use STR baseline. Apply weaponDamage and goldWeaponDamage talent modifiers
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
                // Non-staff: use weapon-type scaling key for estimate
                const statVal = (eff && typeof eff[scalingKeyForUI] === 'number') ? eff[scalingKeyForUI] : 0;
                let base = Math.round(Phaser && Phaser.Math && Phaser.Math.Between ? (8 + statVal * 2) : (8 + statVal * 2));
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
                                // If staff equipped, show INT scaling; otherwise show weapon-type scaling info
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
                                        const label = (scalingKeyForUI === 'agi') ? 'AGI' : (scalingKeyForUI === 'int' ? 'INT' : (scalingKeyForUI === 'luk' ? 'LUK' : 'STR'));
                                        const sval = (eff && typeof eff[scalingKeyForUI] === 'number') ? eff[scalingKeyForUI] : 0;
                                        lines.push(`${label} scaling: +${sval ? (sval*2) : 0} approx`);
                                        const baseEst = Math.round(8 + sval * 2);
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
                                } catch (e) {
                                    const sval = (eff && typeof eff[scalingKeyForUI] === 'number') ? eff[scalingKeyForUI] : ((eff && eff.str) || 0);
                                    lines.push(`Estimate: ${isStaffEquipped ? spellDmgEst : Math.round(8 + sval * 2)}`);
                                }
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

    // Inject one-off stylesheet for revamped talent UI if not already present
    if (!document.getElementById('talent-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'talent-modal-styles';
        style.textContent = `
            #talent-modal { position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:250; }
            #talent-modal .talent-shell { background:linear-gradient(135deg,#1b1b21,#101014); border:3px solid #111; border-left:8px solid rgba(120,20,20,0.9); border-radius:14px; width:clamp(1080px, 50vw, 1360px); max-height:82vh; display:flex; flex-direction:column; box-shadow:0 30px 80px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.04); font-family:'Share Tech Mono', monospace; color:#f0c9b0; overflow:hidden; }
            #talent-modal .talent-head { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; padding:16px 20px 14px; background:linear-gradient(90deg,rgba(50,40,34,0.8),rgba(32,24,20,0.7)); border-bottom:2px solid rgba(255,210,122,0.25); }
            #talent-modal .talent-head h1 { font-family:'Metal Mania',cursive; font-size:1.85rem; margin:0; letter-spacing:1px; color:#ffd8a0; text-shadow:0 3px 10px rgba(0,0,0,0.8); }
            #talent-modal .talent-head .meta { display:flex; flex-wrap:wrap; gap:12px; font-size:0.75rem; letter-spacing:0.08em; color:#caa78e; }
            #talent-modal .talent-body { flex:1 1 auto; display:flex; min-height:0; }
            #talent-tabs { background:linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.55)); border-right:1px solid rgba(255,255,255,0.05); padding:14px 12px; display:flex; flex-direction:column; gap:8px; overflow:auto; }
            #talent-tabs button { text-align:left; font-weight:700; font-size:0.8rem; background:rgba(255,255,255,0.04); color:#f8e1cc; border:1px solid rgba(255,255,255,0.07); padding:10px 12px; border-radius:8px; cursor:pointer; position:relative; transition:background .18s,border-color .18s, transform .18s; }
            #talent-tabs button.active { background:linear-gradient(90deg,rgba(255,210,122,0.2),rgba(255,210,122,0.05)); border:1px solid rgba(255,210,122,0.6); color:#ffd8a0; box-shadow:0 0 0 1px rgba(255,210,122,0.25),0 6px 18px -6px rgba(0,0,0,0.6); }
            #talent-tabs button:not(.active):hover { background:rgba(255,255,255,0.08); }
            #talent-grid-panel { flex:1 1 auto; display:flex; flex-direction:column; padding:14px 16px; gap:10px; overflow:auto; }
            #talent-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:14px; align-content:start; }
            .talent-node { background:linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.08); border-left:4px solid rgba(90,90,90,0.4); padding:10px 10px 12px; border-radius:12px; display:flex; flex-direction:column; gap:6px; position:relative; min-height:142px; transition:box-shadow .2s,border-color .2s, transform .15s, filter .2s, background .25s; overflow:hidden; }
            .talent-node.locked { filter:grayscale(80%) brightness(0.6); opacity:0.55; }
            .talent-node.available:not(.maxed) { border-left-color:#ffd27a; box-shadow:0 0 0 1px rgba(255,210,122,0.25),0 0 14px -4px rgba(255,210,122,0.4); }
            .talent-node.available:not(.maxed):hover { background:linear-gradient(145deg,rgba(255,210,122,0.15),rgba(255,210,122,0.05)); }
            .talent-node.maxed { border-left-color:#4ade80; box-shadow:0 0 0 1px rgba(74,222,128,0.3),0 0 18px -4px rgba(74,222,128,0.45); }
            .talent-node header { display:flex; justify-content:space-between; align-items:flex-start; gap:6px; }
            .talent-node header h2 { font-size:0.9rem; line-height:1.1; margin:0; color:#fce7d6; flex:1; font-weight:800; letter-spacing:0.5px; }
            .talent-node .badge { font-size:10px; padding:3px 6px; border-radius:6px; font-weight:700; letter-spacing:.08em; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); color:#c9b8ff; }
            .talent-node.passive .badge { color:#ffd27a; }
            .talent-node .desc { font-size:11px; line-height:1.35; color:#d6c2b2; flex:1; overflow-wrap:break-word; word-break:break-word; hyphens:auto; }
            .talent-node footer { display:flex; align-items:center; justify-content:space-between; gap:6px; }
            .talent-node footer .rank { font-size:11px; font-weight:700; letter-spacing:.06em; color:#fff; }
            .talent-node footer .controls { display:none; }
            .talent-node .next-rank { font-size:10px; color:#a7f3d0; font-weight:600; letter-spacing:.05em; margin-top:2px; }
            #talent-info { width:290px; flex:0 0 290px; border-left:1px solid rgba(255,255,255,0.05); background:linear-gradient(180deg,rgba(0,0,0,0.4),rgba(0,0,0,0.65)); padding:14px 16px; display:flex; flex-direction:column; gap:12px; overflow:auto; }
            #talent-info .panel { background:linear-gradient(140deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:10px 12px; font-size:12px; line-height:1.4; }
            #talent-info .panel h3 { margin:0 0 4px; font-size:0.85rem; font-weight:800; letter-spacing:.06em; color:#ffd8a0; }
            #talent-info .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:8px; }
            #talent-info .summary .stat { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:6px 8px; font-size:11px; display:flex; flex-direction:column; gap:2px; }
            #talent-info .summary .stat span.value { font-size:13px; font-weight:800; color:#ffd27a; }
            #talent-modal .close-btn { background:rgba(80,40,40,0.55); border:1px solid rgba(255,110,110,0.4); color:#fff; font-weight:700; padding:8px 14px; font-size:0.85rem; border-radius:8px; cursor:pointer; letter-spacing:.08em; }
            #talent-modal .close-btn:hover { background:rgba(110,50,50,0.7); }
            #talent-modal .respec-btn { background:rgba(40,60,90,0.4); border:1px solid rgba(120,170,255,0.4); color:#cfe4ff; font-weight:700; padding:8px 14px; font-size:0.72rem; border-radius:8px; cursor:pointer; letter-spacing:.1em; }
            #talent-modal .respec-btn:hover { background:rgba(60,90,130,0.55); }
            #talent-modal .points-pill { background:linear-gradient(90deg,rgba(255,210,122,0.15),rgba(255,210,122,0.04)); border:1px solid rgba(255,210,122,0.35); padding:6px 10px; border-radius:999px; font-size:0.7rem; font-weight:700; letter-spacing:.08em; color:#ffd8a0; display:inline-flex; gap:6px; align-items:center; }
            #talent-modal .points-pill.star { background:linear-gradient(90deg,rgba(180,120,255,0.18),rgba(180,120,255,0.04)); border-color:rgba(180,120,255,0.45); color:#d8b3ff; }
            @keyframes pulse-glow { 0%,100% { box-shadow:0 0 0 0 rgba(255,210,122,0.45);} 50% { box-shadow:0 0 0 4px rgba(255,210,122,0);} }
            .talent-node.available:not(.maxed) { animation:pulse-glow 3.2s ease-in-out infinite; }
            /* Scrollbar styling to match inventory */
            #talent-tabs::-webkit-scrollbar, #talent-grid-panel::-webkit-scrollbar, #talent-info::-webkit-scrollbar { width: 10px; height:10px; }
            #talent-tabs::-webkit-scrollbar-track, #talent-grid-panel::-webkit-scrollbar-track, #talent-info::-webkit-scrollbar-track { background: rgba(0,0,0,0.25); border-radius: 8px; }
            #talent-tabs::-webkit-scrollbar-thumb, #talent-grid-panel::-webkit-scrollbar-thumb, #talent-info::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(255,210,122,0.3), rgba(255,210,122,0.08)); border: 1px solid rgba(255,210,122,0.35); border-radius: 8px; }
            #talent-tabs { scrollbar-color: rgba(255,210,122,0.35) rgba(0,0,0,0.25); }
            #talent-grid-panel { scrollbar-color: rgba(255,210,122,0.35) rgba(0,0,0,0.25); }
            #talent-info { scrollbar-color: rgba(255,210,122,0.35) rgba(0,0,0,0.25); }
        `;
        document.head.appendChild(style);
    }

    const wrap = document.createElement('div');
    wrap.id = 'talent-modal';
    wrap.innerHTML = `
        <div class="talent-shell">
            <div class="talent-head">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <h1>Talent Tree</h1>
                    <div class="meta"><span>Allocate points to enhance your character. Shift+Click = Max / Ctrl+Click = -1.</span></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                    <div style="display:flex; gap:10px; flex-wrap:wrap;" id="talent-points-summary"></div>
                    <div style="display:flex; gap:10px;">
                        <button class="respec-btn" id="talent-respec-tab" title="Refund all points in current tab">RESPEC TAB</button>
                        <button class="close-btn" id="talent-close">CLOSE</button>
                    </div>
                </div>
            </div>
            <div class="talent-body">
                <div id="talent-tabs" style="width:190px; flex:0 0 190px; overflow:auto;"></div>
                <div id="talent-grid-panel">
                    <div id="talent-grid"></div>
                </div>
                <div id="talent-info"></div>
            </div>
        </div>`;
    document.body.appendChild(wrap);
    scene._talentModal = wrap;
    const closeBtn = wrap.querySelector('#talent-close'); if (closeBtn) closeBtn.onclick = () => closeTalentModal(scene);
    // attach data/state
    scene._talentState = scene._talentState || { activeTab: null };
    const availableTabs = getTabsForClass(char.class);
    scene._talentState.availableTabs = availableTabs;
    scene._talentState.activeTab = scene._talentState.activeTab || (availableTabs && availableTabs[0]) || 'tab_beginner';
    // Respec button wired later inside refresh to ensure activeTab context
    try { scene.events?.once?.('shutdown', () => { try { closeTalentModal(scene); } catch(e){} }); } catch(e){}
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
    const pointsSummary = scene._talentModal.querySelector('#talent-points-summary');
    if (!tabsEl || !gridEl || !infoEl) return;

    // Rebuild tabs
    tabsEl.innerHTML = '';
    const tabs = state.availableTabs || getTabsForClass(char.class);
    for (const tid of tabs) {
        const tDef = getTalentTab(tid) || {};
        const b = document.createElement('button');
        b.textContent = (tDef.label || tid.replace(/^tab_/,'').replace(/_/g,' ')).toUpperCase();
        if (state.activeTab === tid) b.classList.add('active');
        b.onclick = () => { state.activeTab = tid; refreshTalentModal(scene); };
        // small type badge
        const type = document.createElement('span'); type.style.position='absolute'; type.style.top='4px'; type.style.right='8px'; type.style.fontSize='9px'; type.style.opacity='0.65'; type.style.letterSpacing='.12em'; type.textContent = (tDef.type === 'star')? '★':'TAB'; b.appendChild(type);
        tabsEl.appendChild(b);
    }

    // Active tab definition
    const activeTabId = state.activeTab || tabs[0];
    const activeTabDef = getTalentTab(activeTabId) || {};

    // Points summary chips (global top-right)
    if (pointsSummary) {
        pointsSummary.innerHTML = '';
        try {
            const totalStar = char.talents?.starPoints || 0;
            const star = document.createElement('div'); star.className = 'points-pill star'; star.innerHTML = `★ STAR: <strong style="font-size:0.9rem;">${totalStar}</strong>`; pointsSummary.appendChild(star);
            for (const tid of tabs) {
                const td = getTalentTab(tid) || {}; if (td.type === 'star') continue;
                const un = (char.talents?.unspentByTab && (char.talents.unspentByTab[tid]||0)) || 0;
                const pill = document.createElement('div'); pill.className='points-pill'; pill.textContent = `${(td.label||tid.replace(/^tab_/,'')).toUpperCase()}: ${un}`; pointsSummary.appendChild(pill);
            }
        } catch(e){}
    }

    // Info side panel content
    infoEl.innerHTML = '';
    const infoHeader = document.createElement('div'); infoHeader.className = 'panel';
    infoHeader.innerHTML = `<h3>${(activeTabDef.label||activeTabId).toUpperCase()}</h3><div style="font-size:11px; color:#c7b9ab;">${activeTabDef.description||''}</div>`;
    infoEl.appendChild(infoHeader);

    // Current tab unspent points panel
    const unspent = (activeTabDef.type === 'star') ? (char.talents?.starPoints || 0) : (char.talents?.unspentByTab && (char.talents.unspentByTab[activeTabId]||0)) || 0;
    const ptsPanel = document.createElement('div'); ptsPanel.className='panel'; ptsPanel.innerHTML = `<h3>POINTS</h3><div style="font-size:12px;">Unspent: <span style="color:#ffd27a;font-weight:800;">${unspent}</span> ${(activeTabDef.type==='star')? '(STAR)':''}</div>`;
    infoEl.appendChild(ptsPanel);

    // Wire up respec button (in header)
    const respecBtn = scene._talentModal.querySelector('#talent-respec-tab');
    if (respecBtn) {
        respecBtn.onclick = () => {
            try {
                const allocs = (char.talents && char.talents.allocations && char.talents.allocations[activeTabId]) || {};
                let refunded = 0; for (const k of Object.keys(allocs)) refunded += (allocs[k]||0);
                if (activeTabDef.type === 'star') char.talents.starPoints = (char.talents.starPoints||0) + refunded; else { char.talents.unspentByTab = char.talents.unspentByTab||{}; char.talents.unspentByTab[activeTabId] = (char.talents.unspentByTab[activeTabId]||0) + refunded; }
                // process de-allocation
                try { for (const k of Object.keys(allocs)) { const prev = allocs[k]||0; if (prev>0) processTalentAllocation(scene,char,activeTabId,k,prev,0); } } catch(e){}
                if (char.talents && char.talents.allocations) char.talents.allocations[activeTabId] = {};
                if (scene._persistCharacter) scene._persistCharacter((scene.sys?.settings?.data && scene.sys.settings.data.username)||null);
                refreshTalentModal(scene);
            } catch(e){ console.warn('respec error',e); }
        };
    }

    // Build grid of talents
    gridEl.innerHTML = '';
    const talents = Array.isArray(activeTabDef.talents) ? activeTabDef.talents : [];
    const allocations = (char.talents?.allocations && char.talents.allocations[activeTabId]) || {};

    const formatDisplay = (v) => {
        const n = parseFloat(v||0); if (isNaN(n)) return String(v); if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n)); return String(parseFloat(n.toFixed(2))); };

    for (const t of talents) {
        const tid = t.id; const alloc = allocations[tid] || 0; const maxRank = t.maxRank || 1;
        const node = document.createElement('div'); node.className = 'talent-node'; node.tabIndex = 0; if (t.kind !== 'active') node.classList.add('passive');
        if (alloc >= maxRank) node.classList.add('maxed');
        // Determine availability: simple check = if unspent > 0 and not maxed
        const available = (unspent > 0 || activeTabDef.type === 'star') && alloc < maxRank; if (available) node.classList.add('available'); else if (alloc === 0) node.classList.add('locked');

        // Header
        const h = document.createElement('header');
        const h2 = document.createElement('h2'); h2.textContent = t.name || tid; h.appendChild(h2);
        const badge = document.createElement('div'); badge.className='badge'; badge.textContent = t.kind === 'active' ? 'ACTIVE' : 'PASSIVE'; h.appendChild(badge);
        // optional icon
        try { const iconPath = resolveTalentIcon(scene,t); if (iconPath) { const img = document.createElement('img'); img.src=iconPath; img.alt=t.name||tid; img.width=20; img.height=20; img.style.width='20px'; img.style.height='20px'; img.style.objectFit='cover'; img.style.borderRadius='6px'; img.style.marginLeft='4px'; h.appendChild(img);} } catch(e){}
        node.appendChild(h);

        // Description with current interpolation
        const desc = document.createElement('div'); desc.className='desc';
        try {
            const s = t.scaling; const s2 = t.secondScaling; let txt = t.description || '';
            if (s) {
                // current effective value at this rank (if 0, show base)
                const curVal = s.base + s.perRank * Math.max(0, alloc - 1);
                const showCur = (alloc > 0) ? formatDisplay(curVal) : formatDisplay(s.base);
                txt = txt.replace(/\{value\}/g, showCur);
            }
            if (s2){
                const cur2 = s2.base + s2.perRank * Math.max(0, alloc - 1);
                const showCur2 = (alloc > 0) ? formatDisplay(cur2) : formatDisplay(s2.base);
                txt = txt.replace(/\{secondValue\}/g, showCur2);
            }
            desc.textContent = txt;
        } catch(e){ desc.textContent = t.description || ''; }
        node.appendChild(desc);

        // Next rank preview
        if (alloc < maxRank) {
            try {
                const preview = document.createElement('div'); preview.className='next-rank';
                let parts = [];
                if (t.scaling) {
                    // current value at this rank (if alloc>0 use alloc-1 progression, else base)
                    const curVal = t.scaling.base + t.scaling.perRank * Math.max(0, alloc - 1);
                    const nextVal = t.scaling.base + t.scaling.perRank * Math.max(0, alloc);
                    parts.push(`Current: ${formatDisplay(curVal)}  →  Next: ${formatDisplay(nextVal)}`);
                }
                if (t.secondScaling) {
                    const cur2 = t.secondScaling.base + t.secondScaling.perRank * Math.max(0, alloc - 1);
                    const next2 = t.secondScaling.base + t.secondScaling.perRank * Math.max(0, alloc);
                    parts.push(`${t.secondScaling.label||'Extra'}: ${formatDisplay(cur2)} → ${formatDisplay(next2)}`);
                }
                preview.textContent = parts.join('  |  ');
                node.appendChild(preview);
            } catch(e){}
        }

        // Footer controls
    const footer = document.createElement('footer');
    const rank = document.createElement('div'); rank.className='rank'; rank.textContent = `RANK ${alloc} / ${maxRank}`; footer.appendChild(rank);
    // remove explicit +/- controls; interactions are click / shift-click / ctrl-click directly on the card
    node.appendChild(footer);

        // Shift-click to max / Ctrl-click to minus one direct
        node.addEventListener('click', (ev)=>{ try { if (ev.shiftKey) { let cur=alloc; while (cur < maxRank) { if (!adjustTalent(scene,activeTabDef,activeTabId,tid,cur,cur+1,true)) break; cur++; } refreshTalentModal(scene); } else if (ev.ctrlKey) { if (alloc>0) adjustTalent(scene,activeTabDef,activeTabId,tid,alloc,alloc-1); } else if (available) { adjustTalent(scene,activeTabDef,activeTabId,tid,alloc,alloc+1); } } catch(e){} });

        // Assign active ability button if learned
        if (t.kind === 'active' && alloc > 0) {
            const assignWrap = document.createElement('div'); assignWrap.style.marginTop='4px';
            const assignBtn = document.createElement('button'); assignBtn.textContent='Assign to Bar'; assignBtn.style.fontSize='10px'; assignBtn.style.padding='4px 8px'; assignBtn.onclick=(ev)=>{ ev.stopPropagation(); try { assignActiveToNextSlot(scene,tid); if (scene._persistCharacter) scene._persistCharacter((scene.sys?.settings?.data && scene.sys.settings.data.username)||null); refreshTalentModal(scene); refreshSkillBarHUD(scene); } catch(e){} };
            assignWrap.appendChild(assignBtn); node.appendChild(assignWrap);
        }

        // Visual states
        if (alloc === 0 && !available) node.classList.add('locked'); else if (alloc >= maxRank) node.classList.add('maxed');

        gridEl.appendChild(node);
    }

    // Helper inside refresh to allocate / refund
    function adjustTalent(sceneRef, tabDef, tabId, talentId, prevAlloc, newAlloc, silent) {
        try {
            if (!sceneRef || !sceneRef.char) return false; const c = sceneRef.char;
            c.talents.allocations[tabId] = c.talents.allocations[tabId] || {};
            const isStar = tabDef.type === 'star';
            if (newAlloc > prevAlloc) { // allocate
                const pool = isStar ? (c.talents.starPoints||0) : (c.talents.unspentByTab?.[tabId]||0);
                if (pool <= 0) return false;
                c.talents.allocations[tabId][talentId] = newAlloc;
                if (isStar) c.talents.starPoints = Math.max(0,(c.talents.starPoints||0)-1); else { c.talents.unspentByTab = c.talents.unspentByTab||{}; c.talents.unspentByTab[tabId] = Math.max(0,(c.talents.unspentByTab[tabId]||0)-1); }
            } else if (newAlloc < prevAlloc) { // refund
                c.talents.allocations[tabId][talentId] = newAlloc;
                if (isStar) c.talents.starPoints = (c.talents.starPoints||0)+1; else { c.talents.unspentByTab = c.talents.unspentByTab||{}; c.talents.unspentByTab[tabId] = (c.talents.unspentByTab[tabId]||0)+1; }
            }
            try { processTalentAllocation(sceneRef,c,tabId,talentId,prevAlloc,newAlloc); } catch(e){}
            if (sceneRef._persistCharacter) sceneRef._persistCharacter((sceneRef.sys?.settings?.data && sceneRef.sys.settings.data.username)||null);
            try { refreshSkillBarHUD(sceneRef); } catch(e){}
            try { if (sceneRef._updateHUD) sceneRef._updateHUD(); else { if (sceneRef._destroyHUD) sceneRef._destroyHUD(); if (sceneRef._createHUD) sceneRef._createHUD(); } } catch(e){}
            try { if (window && window.__shared_ui?.refreshStatsModal && sceneRef._statsModal) window.__shared_ui.refreshStatsModal(sceneRef); } catch(e){}
            if (!silent) refreshTalentModal(sceneRef);
            return true;
        } catch(e){ return false; }
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
            return;
        }
        if (!char.talents) char.talents = { skillBar: new Array(9).fill(null) };
        for (let i = 0; i < 9; i++) {
            if (!char.talents.skillBar[i]) {
                char.talents.skillBar[i] = talentId;
                if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
                try { refreshSkillBarHUD(scene); } catch (e) {}
                return;
            }
        }
    } catch (e) {}
}

export function unassignSkillBarSlot(scene, slotIndex) {
    if (!scene || !scene.char) return;
    try {
        ensureCharTalents && ensureCharTalents(scene.char);
        const char = scene.char;
        if (!char.talents || !Array.isArray(char.talents.skillBar)) return;
        if (slotIndex < 0 || slotIndex >= char.talents.skillBar.length) return;
        char.talents.skillBar[slotIndex] = null;
        if (scene._persistCharacter) scene._persistCharacter((scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null);
        try { refreshSkillBarHUD(scene); } catch (e) {}
    } catch (e) {}
}

export function refreshSkillBarHUD(scene) {
    if (typeof document === 'undefined') return;
    if (!scene || !scene.char) return;
    try {
        // Ensure we don't render stale buffs from a previous scene: drop any expired entries first
        try { pruneExpiredBuffs(scene); } catch (e) {}
        ensureCharTalents && ensureCharTalents(scene.char);
        const containerId = 'global-skill-bar';
        let el = document.getElementById(containerId);
        if (!el) {
            el = document.createElement('div'); el.id = containerId;
            el.style.position = 'fixed';
            el.style.left = '50%';
            el.style.bottom = '12px';
            el.style.transform = 'translateX(-50%)';
            el.style.zIndex = '9999';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            el.style.gap = '6px';
            el.style.padding = '6px 8px';
            el.style.background = 'rgba(0,0,0,0.35)';
            el.style.border = '1px solid rgba(255,255,255,0.06)';
            el.style.borderRadius = '10px';
            el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
            document.body.appendChild(el);
        }
        el.innerHTML = ''; // rebuild
        const char = scene.char;
        const defs = (char.learnedActives || []).reduce((m, a) => { if (a && a.id) m[a.id] = a; return m; }, {});
        const now = Date.now();
        // Buffs row ABOVE the skill bar (compact 32x32 icons)
        const buffs = collectActiveBuffs(scene);
        // Ensure a single tooltip element for buffs exists
        let tip = document.getElementById('skill-buffs-tooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'skill-buffs-tooltip';
            tip.style.position = 'fixed';
            tip.style.left = '0';
            tip.style.top = '0';
            tip.style.transform = 'translate(-9999px, -9999px)';
            tip.style.zIndex = '10000';
            tip.style.pointerEvents = 'none';
            tip.style.background = 'rgba(10,10,12,0.92)';
            tip.style.border = '1px solid rgba(255,255,255,0.12)';
            tip.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)';
            tip.style.borderRadius = '8px';
            tip.style.padding = '6px 8px';
            tip.style.color = '#f3f4f6';
            tip.style.fontSize = '12px';
            tip.style.fontWeight = '700';
            tip.style.fontFamily = "'Share Tech Mono', monospace";
            document.body.appendChild(tip);
        }
        const hideTip = () => { try { tip.style.transform = 'translate(-9999px, -9999px)'; tip.innerHTML = ''; } catch (e) {} };
        const moveTip = (ev) => {
            try {
                const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : 0;
                const y = (ev && typeof ev.clientY === 'number') ? ev.clientY : 0;
                tip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
            } catch (e) {}
        };
        const showTip = (html, ev) => {
            try { tip.innerHTML = html || ''; moveTip(ev); } catch (e) {}
        };
        const buffsRow = document.createElement('div');
        buffsRow.id = 'skill-buffs';
        buffsRow.style.display = (buffs.length > 0) ? 'flex' : 'none';
        buffsRow.style.alignItems = 'center';
        buffsRow.style.justifyContent = 'center';
        buffsRow.style.gap = '6px';
        buffsRow.style.width = '100%';
        // Render buff icons (32x32) with small ETA overlay
        for (const b of buffs) {
            try {
                const icon = document.createElement('div');
                icon.className = 'buff-icon ' + (b.temporary ? 'temporary' : 'permanent');
                icon.style.position = 'relative';
                icon.style.width = '32px';
                icon.style.height = '32px';
                icon.style.borderRadius = '6px';
                icon.style.border = '1px solid rgba(255,255,255,0.08)';
                icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
                icon.style.display = 'flex';
                icon.style.alignItems = 'center';
                icon.style.justifyContent = 'center';
                icon.style.overflow = 'hidden';
                // try to use a proper icon image
                const src = resolveBuffIcon(scene, b);
                if (src) {
                    const img = document.createElement('img');
                    img.src = src; img.alt = b.label || b.key || 'buff';
                    img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
                    img.referrerPolicy = 'no-referrer';
                    img.onerror = () => { try { icon.textContent = (b.label || 'B').slice(0,1).toUpperCase(); icon.style.background = b.temporary ? 'rgba(255,210,120,0.10)' : 'rgba(140,200,255,0.10)'; } catch(e){} };
                    icon.appendChild(img);
                } else {
                    // fallback glyph with subtle background
                    icon.style.background = b.temporary ? 'rgba(255,210,120,0.10)' : 'rgba(140,200,255,0.10)';
                    const glyph = document.createElement('div');
                    glyph.textContent = (b.label || 'B').slice(0,1).toUpperCase();
                    glyph.style.fontSize = '14px';
                    glyph.style.fontWeight = '800';
                    glyph.style.color = '#eee';
                    glyph.style.textShadow = '0 1px 0 rgba(0,0,0,0.6)';
                    icon.appendChild(glyph);
                }
                // ETA overlay (bottom-right)
                if (b.eta != null) {
                    const eta = document.createElement('div');
                    eta.textContent = `${b.eta}`;
                    eta.style.position = 'absolute';
                    eta.style.right = '2px';
                    eta.style.bottom = '1px';
                    eta.style.fontSize = '10px';
                    eta.style.fontWeight = '800';
                    eta.style.padding = '0 2px';
                    eta.style.borderRadius = '3px';
                    eta.style.color = '#fff';
                    eta.style.background = 'rgba(0,0,0,0.35)';
                    eta.style.pointerEvents = 'none';
                    icon.appendChild(eta);
                }
                // Basic native tooltip fallback
                icon.title = b.label + (b.eta != null ? ` (${b.eta}s)` : '');
                // Rich tooltip (hover) — compute a small description block
                const mkTipHtml = () => {
                    try {
                        const parts = [];
                        const header = `<div style="font-weight:800;color:#ffd27a;margin-bottom:2px;">${(b.label || 'Buff')}</div>`;
                        parts.push(header);
                        if (b.eta != null) parts.push(`<div style="opacity:0.9;">Remaining: ${Math.max(0, b.eta)}s</div>`);
                        // Add a contextual line for known keys
                        const c = scene.char || {};
                        if (b.key === 'mana_shield' && c._manaShield) {
                            const cur = Math.floor(c._manaShield.current || 0); const mx = Math.floor(c._manaShield.max || 0);
                            parts.push(`<div style="opacity:0.9;">Absorb: ${cur}/${mx}</div>`);
                        } else if (b.key === 'dark_shield' && c._darkShield) {
                            const rem = Math.floor(c._darkShield.remaining || 0);
                            parts.push(`<div style="opacity:0.9;">Absorb: ${rem}</div>`);
                        } else if (b.key === 'marksman_focus' && c._marksmanFocusBonuses) {
                            const cc = Math.round(c._marksmanFocusBonuses.critChance || 0);
                            const cd = Math.round(c._marksmanFocusBonuses.critDmg || 0);
                            parts.push(`<div style="opacity:0.9;">Crit: +${cc}% | Crit Dmg: +${cd}%</div>`);
                        } else if (b.key === 'stealth_active') {
                            parts.push(`<div style="opacity:0.9;">You are hidden from enemies.</div>`);
                        } else if (b.key === 'unholy_frenzy') {
                            parts.push(`<div style="opacity:0.9;">Increased attack speed.</div>`);
                        } else if (b.key === 'standing_dr' && typeof c._standingDRPercent === 'number') {
                            parts.push(`<div style="opacity:0.9;">Damage Reduction: +${Math.round(c._standingDRPercent)}%</div>`);
                        } else if (b.key === 'blood_ritual') {
                            parts.push(`<div style="opacity:0.9;">Channeling: converts mana to health over time.</div>`);
                        }
                        return parts.join('');
                    } catch (e) { return (b && b.label) ? b.label : 'Buff'; }
                };
                icon.addEventListener('mouseenter', (ev) => { try { showTip(mkTipHtml(), ev); } catch (e) {} });
                icon.addEventListener('mousemove', (ev) => { try { moveTip(ev); } catch (e) {} });
                icon.addEventListener('mouseleave', () => { try { hideTip(); } catch (e) {} });
                buffsRow.appendChild(icon);
            } catch (e) {}
        }
        el.appendChild(buffsRow);

        // Slots wrapper (nine slots) BELOW the buffs row
        const slotsWrap = document.createElement('div');
        slotsWrap.style.display = 'flex';
        slotsWrap.style.gap = '8px';
        el.appendChild(slotsWrap);
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
            // Prefer actual icon image from TalentIcons; fallback to emoji
            try {
                const src = (assignedDef ? resolveTalentIcon(scene, { id: assigned, name: assignedDef.name }) : null);
                if (src) {
                    const img = document.createElement('img');
                    img.src = src; 
                    img.alt = assignedDef ? (assignedDef.name || assigned) : assigned || '';
                    img.referrerPolicy = 'no-referrer';
                    img.onerror = () => { 
                        try { 
                            iconDiv.innerHTML = ''; 
                            iconDiv.textContent = assigned ? '•' : ''; 
                        } catch(e){} 
                    };
                    iconDiv.appendChild(img);
                } else {
                    // fallback glyph
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
            slotsWrap.appendChild(slot);
        }

        // no right-side buffs host anymore (buffs are rendered above)
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
        // expose buff maintenance so scenes or other modules can force a cleanup on transitions
        window.__shared_ui.pruneExpiredBuffs = pruneExpiredBuffs;
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
    const def = defs[itemId]; if (!def) { return; }
    // Determine equipment slot. Prefer explicit `def.slot` when provided.
    let slot = null;
    if (def.slot) {
        slot = def.slot;
    } else if (def.tool) {
        // For tools without explicit slot, try to infer from ID
        const id = (def.id || '').toLowerCase();
        if (id.includes('pickaxe')) slot = 'mining';
        else if (id.includes('hatchet') || id.includes('axe')) slot = 'woodcutting';
        else if (id.includes('rod') || id.includes('pole')) slot = 'fishing';
        else slot = 'weapon'; // fallback
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
    } else { return; }
    // ensure slot array and remove one item
    scene.char.inventory = initSlots(scene.char.inventory);
    const removed = removeItemFromSlots(scene.char.inventory, itemId, 1);
    if (!removed) { return; }
    if (!scene.char.equipment) scene.char.equipment = { head:null, armor:null, legs:null, boots:null, ring1:null, ring2:null, amulet:null, weapon:null, fishing:null, mining:null, woodcutting:null };
    // handle ring auto-slotting: if item slot is 'ring', prefer ring1 then ring2
    if (slot === 'ring') {
        if (!scene.char.equipment.ring1) slot = 'ring1'; else if (!scene.char.equipment.ring2) slot = 'ring2'; else slot = 'ring1';
    }
    const prev = scene.char.equipment[slot]; if (prev) { addItemToSlots(scene.char.inventory, prev.id, 1); removeEquipmentBonuses(scene, prev); }
    scene.char.equipment[slot] = { id: itemId, name: def.name || itemId };
    applyEquipmentBonuses(scene, scene.char.equipment[slot]);
    
    // Update quest progress for equip objectives
    try {
        const questModule = window.__questModule || null;
        if (questModule && questModule.updateQuestProgress) {
            questModule.updateQuestProgress(scene.char, 'equip', itemId, 1);
            _bumpQuestDirty(); // ensure QuestPanel refreshes immediately after equipping
            try { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('questProgressChangedDetailed', { detail: { type: 'equip', itemId, amount: 1 } })); } catch (e) {}
        }
    } catch (e) { /* ignore quest progress errors */ }
    
    const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username);
    // Explicitly sync inventory delta to server (ItemStack table) after equip
    try { syncInventoryToServer(scene); } catch (e) {}
    // Persist equipment change to server immediately
    try {
        const charId = (scene && scene.char && scene.char.id) || (scene && scene._character && scene._character.id) || null;
        if (charId && window && window.__cif_persist && typeof window.__cif_persist.saveEquipment === 'function') {
            window.__cif_persist.saveEquipment(charId, scene.char.equipment || {});
        }
    } catch (e) {}
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

export function unequipItem(scene, slot) {
    if (!scene || !scene.char || !scene.char.equipment) return; const eq = scene.char.equipment[slot]; if (!eq) return; removeEquipmentBonuses(scene, eq); scene.char.inventory = initSlots(scene.char.inventory); addItemToSlots(scene.char.inventory, eq.id, 1); scene.char.equipment[slot] = null; const username = (scene.sys && scene.sys.settings && scene.sys.settings.data && scene.sys.settings.data.username) || null; if (scene._persistCharacter) scene._persistCharacter(username);
    // Explicitly sync inventory delta to server (ItemStack table) after unequip
    try { syncInventoryToServer(scene); } catch (e) {}
    // Persist equipment change to server immediately
    try {
        const charId = (scene && scene.char && scene.char.id) || (scene && scene._character && scene._character.id) || null;
        if (charId && window && window.__cif_persist && typeof window.__cif_persist.saveEquipment === 'function') {
            window.__cif_persist.saveEquipment(charId, scene.char.equipment || {});
        }
    } catch (e) {}
    try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch(e) {}
}

// Expose helpers to operate on slot-based inventory from other scenes
export function addItemToInventory(scene, itemId, qty=1) {
    if (!scene || !scene.char) return false;
    scene.char.inventory = initSlots(scene.char.inventory);
    const ok = addItemToSlots(scene.char.inventory, itemId, qty);
    if (ok) { try { if (typeof window !== 'undefined' && window.__cif_persist) { if (scene.char.id) { const map = {}; for (const s of scene.char.inventory) { if (s && s.id) map[s.id] = (map[s.id]||0) + (s.qty||1); } window.__cif_persist.saveInventory(scene.char.id, map); } } } catch (e) {} }
    return ok;
}
export function removeItemFromInventory(scene, itemId, qty=1) {
    if (!scene || !scene.char) return false;
    scene.char.inventory = initSlots(scene.char.inventory);
    const ok = removeItemFromSlots(scene.char.inventory, itemId, qty);
    if (ok) { try { if (typeof window !== 'undefined' && window.__cif_persist) { if (scene.char.id) { const map = {}; for (const s of scene.char.inventory) { if (s && s.id) map[s.id] = (map[s.id]||0) + (s.qty||1); } window.__cif_persist.saveInventory(scene.char.id, map); } } } catch (e) {} }
    return ok;
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

// ============================================
// Centralized Quest Dialogue System (MMO-style)
// ============================================

/**
 * Create or retrieve dialogue overlay with MMO-style backdrop and card
 * @param {object} scene - The Phaser scene
 * @param {string} themeColor - Optional theme color (hex) for borders/accents
 * @returns {HTMLElement} The dialogue card element
 */
export function ensureDialogueOverlay(scene, themeColor = '#ffd27a') {
    if (typeof document === 'undefined') return null;
    
    let backdrop = document.getElementById('quest-dialogue-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'quest-dialogue-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000;
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;
        
        const card = document.createElement('div');
        card.id = 'quest-dialogue-card';
        card.style.cssText = `
            background: linear-gradient(135deg, rgba(25,20,15,0.98), rgba(15,12,8,0.98));
            border: 2px solid ${themeColor};
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 24px;
            font-family: 'Share Tech Mono', monospace;
            color: #e8d8c8;
            animation: slideUp 0.3s ease-out;
        `;
        
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);
        
        // Click backdrop to close
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeDialogue();
        });
    } else {
        // Update theme color if provided
        const card = backdrop.querySelector('#quest-dialogue-card');
        if (card && themeColor) {
            card.style.borderColor = themeColor;
        }
    }
    
    return backdrop.querySelector('#quest-dialogue-card');
}

/**
 * Close and remove dialogue overlay
 */
export function closeDialogue() {
    if (typeof document === 'undefined') return;
    const backdrop = document.getElementById('quest-dialogue-backdrop');
    if (backdrop) backdrop.remove();
}

/**
 * Render MMO-style dialogue with NPC portrait and professional styling
 * @param {string} npcName - Name of the NPC
 * @param {string} npcPortrait - Emoji or icon for NPC portrait
 * @param {Array<HTMLElement>} bodyNodes - Array of DOM elements for dialogue body
 * @param {Array<object>} optionConfigs - Button configurations [{label, onClick, variant}]
 * @param {string} themeColor - Theme color for borders/buttons
 */
export function renderDialogue(npcName, npcPortrait, bodyNodes, optionConfigs = [], themeColor = '#ffd27a') {
    const card = ensureDialogueOverlay(null, themeColor);
    if (!card) return;
    
    card.innerHTML = '';
    
    // NPC Header with portrait
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid ${themeColor}40;
    `;
    
    const portrait = document.createElement('div');
    portrait.style.cssText = `
        font-size: 3em;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
        border: 2px solid ${themeColor}60;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    `;
    portrait.textContent = npcPortrait;
    
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        flex: 1;
        font-family: 'Metal Mania', cursive;
        font-size: 1.6em;
        color: ${themeColor};
        text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        letter-spacing: 0.5px;
    `;
    nameLabel.textContent = npcName;
    
    header.appendChild(portrait);
    header.appendChild(nameLabel);
    card.appendChild(header);
    
    // Dialogue body
    const body = document.createElement('div');
    body.style.cssText = 'margin-bottom: 20px; line-height: 1.6;';
    
    for (const node of bodyNodes) {
        if (node) body.appendChild(node);
    }
    
    card.appendChild(body);
    
    // Action buttons
    if (optionConfigs && optionConfigs.length > 0) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 20px;';
        
        for (const opt of optionConfigs) {
            const btn = document.createElement('button');
            const variant = opt.variant || 'primary';
            
            let bgGradient, borderColor, textColor;
            if (variant === 'success') {
                bgGradient = 'linear-gradient(90deg, rgba(74,222,128,0.2), rgba(34,197,94,0.15))';
                borderColor = '#4ade80';
                textColor = '#4ade80';
            } else if (variant === 'danger') {
                bgGradient = 'linear-gradient(90deg, rgba(239,68,68,0.2), rgba(185,28,28,0.15))';
                borderColor = '#ef4444';
                textColor = '#ef4444';
            } else {
                bgGradient = `linear-gradient(90deg, ${themeColor}30, ${themeColor}20)`;
                borderColor = themeColor;
                textColor = themeColor;
            }
            
            btn.style.cssText = `
                padding: 12px 20px;
                background: ${bgGradient};
                border: 2px solid ${borderColor}60;
                border-radius: 6px;
                color: ${textColor};
                font-family: 'Share Tech Mono', monospace;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            btn.innerHTML = `
                <span>${opt.label}</span>
                <span style="font-size: 1.2em;">→</span>
            `;
            
            btn.onmouseover = function() {
                this.style.background = borderColor + '40';
                this.style.borderColor = borderColor;
                this.style.transform = 'translateX(4px)';
            };
            btn.onmouseout = function() {
                this.style.background = bgGradient;
                this.style.borderColor = borderColor + '60';
                this.style.transform = 'translateX(0)';
            };
            
            if (opt.onClick) {
                btn.onclick = () => {
                    try { opt.onClick(); } catch (e) {}
                    // Only close if explicitly requested. Default behavior keeps the dialogue open
                    // so options like "Back" or in-dialog navigation don't immediately dismiss it.
                    if (opt.closeOnClick === true) closeDialogue();
                };
            }
            
            buttonContainer.appendChild(btn);
        }
        
        card.appendChild(buttonContainer);
    }
}

/**
 * Create styled paragraph for dialogue
 * @param {string} text - The text content
 * @returns {HTMLElement} Styled paragraph element
 */
export function createDialogueParagraph(text) {
    if (typeof document === 'undefined') return null;
    
    const p = document.createElement('div');
    p.style.cssText = `
        margin: 12px 0;
        padding: 12px;
        background: rgba(0,0,0,0.3);
        border-left: 3px solid rgba(255,210,120,0.3);
        border-radius: 4px;
        line-height: 1.7;
    `;
    p.textContent = text;
    return p;
}

/**
 * Render multi-page dialogue with Next/Back navigation
 * @param {string} npcName - NPC display name
 * @param {string} npcPortrait - Emoji/icon for NPC
 * @param {Array<{bodyNodes: Array, optionConfigs?: Array}>} pages - Array of page objects
 * @param {string} themeColor - Theme color for styling
 * @param {Function} onComplete - Callback when all pages are viewed (optional)
 */
export function renderDialoguePages(npcName, npcPortrait, pages, themeColor = '#ffd27a', onComplete = null) {
    if (!pages || pages.length === 0) return;
    
    let currentPageIndex = 0;
    
    const renderCurrentPage = () => {
        const page = pages[currentPageIndex];
        const isLastPage = currentPageIndex === pages.length - 1;
        const isFirstPage = currentPageIndex === 0;
        
        // Build navigation options
        const navOptions = [];
        
        // Back button (if not first page)
        if (!isFirstPage) {
            navOptions.push({
                label: '← Back',
                onClick: () => {
                    currentPageIndex--;
                    renderCurrentPage();
                },
                variant: 'primary'
            });
        }
        
        // Next button (if not last page) OR final page options
        if (isLastPage) {
            // Last page: show its custom options or a default close button
            if (page.optionConfigs && page.optionConfigs.length > 0) {
                navOptions.push(...page.optionConfigs.map(opt => ({
                    ...opt,
                    onClick: () => {
                        if (opt.onClick) opt.onClick();
                        closeDialogue();
                        if (onComplete) onComplete();
                    }
                })));
            } else {
                navOptions.push({
                    label: 'Understood',
                    onClick: () => {
                        closeDialogue();
                        if (onComplete) onComplete();
                    },
                    variant: 'success'
                });
            }
        } else {
            // Not last page: show Next button
            navOptions.push({
                label: 'Next →',
                onClick: () => {
                    currentPageIndex++;
                    renderCurrentPage();
                },
                variant: 'success'
            });
        }
        
        renderDialogue(npcName, npcPortrait, page.bodyNodes, navOptions, themeColor);
        
        // Add page indicator if multiple pages
        if (pages.length > 1) {
            const card = ensureDialogueOverlay(null, themeColor);
            if (card) {
                const pageIndicator = document.createElement('div');
                pageIndicator.style.cssText = `
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    font-family: 'Share Tech Mono', monospace;
                    font-size: 0.85em;
                    color: ${themeColor}80;
                    padding: 6px 12px;
                    background: rgba(0,0,0,0.4);
                    border-radius: 12px;
                    border: 1px solid ${themeColor}30;
                `;
                pageIndicator.textContent = `${currentPageIndex + 1} / ${pages.length}`;
                card.appendChild(pageIndicator);
            }
        }
    };
    
    renderCurrentPage();
}

/**
 * Build MMO-style objective list with progress bars
 * @param {object} questDef - Quest definition with objectives array
 * @param {Array} progressStates - Current progress for each objective
 * @param {string} themeColor - Theme color for progress bars
 * @returns {HTMLElement} Objectives container
 */
export function buildObjectiveList(questDef, progressStates, themeColor = '#ffd27a') {
    if (typeof document === 'undefined') return null;
    if (!questDef || !Array.isArray(questDef.objectives) || questDef.objectives.length === 0) return null;
    
    const container = document.createElement('div');
    container.style.cssText = `
        margin: 16px 0;
        padding: 12px;
        background: rgba(0,0,0,0.3);
        border-radius: 6px;
        border: 1px solid ${themeColor}30;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 0.85em;
        color: ${themeColor};
        font-weight: 700;
        margin-bottom: 10px;
        letter-spacing: 0.5px;
    `;
    title.textContent = 'OBJECTIVES:';
    container.appendChild(title);
    
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    
    for (const obj of questDef.objectives) {
        const required = obj.required || 1;
        const label = obj.description || obj.type;
        let current = 0;
        
        if (progressStates) {
            const targetId = obj.target || null;
            const state = progressStates.find(s => s && s.type === obj.type && (targetId ? s.target === targetId : true));
            current = state ? Math.min(state.current || 0, required) : 0;
        }
        
        const isComplete = current >= required;
        const percent = progressStates ? Math.min(100, Math.floor((current / required) * 100)) : 0;
        
        const objectiveItem = document.createElement('div');
        objectiveItem.style.cssText = 'padding-left: 4px;';
        
        objectiveItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: ${isComplete ? '#4ade80' : themeColor}; font-weight: bold; font-size: 0.9em;">${isComplete ? '✓' : '○'}</span>
                <span style="font-size: 0.9em; color: ${isComplete ? '#4ade80' : '#d4c5b9'};">${label}</span>
            </div>
            ${progressStates ? `
            <div style="display: flex; align-items: center; gap: 8px; padding-left: 22px;">
                <div style="
                    flex: 1;
                    height: 14px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
                ">
                    <div style="
                        height: 100%;
                        width: ${percent}%;
                        background: ${isComplete ? 'linear-gradient(90deg, #4ade80, #22c55e)' : `linear-gradient(90deg, ${themeColor}, ${themeColor}cc)`};
                        box-shadow: 0 0 8px ${isComplete ? 'rgba(74,222,128,0.4)' : themeColor + '66'};
                    "></div>
                </div>
                <span style="
                    font-size: 0.85em;
                    font-weight: 700;
                    color: ${isComplete ? '#4ade80' : '#fff'};
                    min-width: 55px;
                    text-align: right;
                ">${current} / ${required}</span>
            </div>
            ` : `
            <div style="padding-left: 22px; font-size: 0.85em; color: #888;">Required: ${required}</div>
            `}
        `;
        
        list.appendChild(objectiveItem);
    }
    
    container.appendChild(list);
    return container;
}

/**
 * Creates a beautiful full-screen modal for class selection.
 * Shows 3 class cards (Horror, Occultist, Stalker) with stats and descriptions.
 * @param {Phaser.Scene} scene - The calling scene
 * @param {Function} onClassSelected - Callback(classId) when user picks a class
 */
export function createClassSelectionModal(scene, onClassSelected) {
    // Character is helpful for context but not required to render the modal
    const CHARACTER = window.__characterModule?.character;
    if (!CHARACTER) {
        try { console.warn('[createClassSelectionModal] Proceeding without character context'); } catch (e) {}
    }

    // Get class definitions from global registry (Next exposes window.CLASS_DEFS)
    const CLASS_DEFS = (typeof window !== 'undefined' && window.CLASS_DEFS) ? window.CLASS_DEFS : (window.__classData?.CLASS_DEFINITIONS || {});
    const TIER_1_CLASSES = ['horror', 'occultist', 'stalker'];

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'class-selection-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.92);
        z-index: 100000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'Choose Your Path';
    title.style.cssText = `
        font-family: 'Cinzel Decorative', serif;
        font-size: 2.5em;
        color: #FFD700;
        text-shadow: 0 0 12px rgba(255, 215, 0, 0.7);
        margin-bottom: 30px;
        text-align: center;
    `;
    overlay.appendChild(title);

    // Container for class cards
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
        display: flex;
        gap: 30px;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 1400px;
        width: 100%;
    `;

    // Build cards for each Tier 1 class
    for (const classId of TIER_1_CLASSES) {
        const classDef = CLASS_DEFS[classId];
        if (!classDef) continue;

        const card = document.createElement('div');
        card.style.cssText = `
            flex: 1 1 350px;
            max-width: 420px;
            min-height: 500px;
            background: linear-gradient(145deg, #1a1a2e, #0f0f1e);
            border: 2px solid #444;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        card.onmouseenter = () => {
            card.style.borderColor = '#FFD700';
            card.style.boxShadow = '0 12px 32px rgba(255, 215, 0, 0.4)';
        };
        card.onmouseleave = () => {
            card.style.borderColor = '#444';
            card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
        };

        // Class name
        const className = document.createElement('div');
        className.textContent = classDef.name || classId.charAt(0).toUpperCase() + classId.slice(1);
        className.style.cssText = `
            font-family: 'Cinzel', serif;
            font-size: 1.8em;
            color: #FFD700;
            text-align: center;
            margin-bottom: 8px;
        `;
        card.appendChild(className);

        // Class description
        const desc = document.createElement('div');
        desc.textContent = classDef.description || '';
        desc.style.cssText = `
            font-size: 0.95em;
            color: #aaa;
            line-height: 1.5;
            text-align: center;
            margin-bottom: 12px;
        `;
        card.appendChild(desc);

        // Base stats section
        const baseStatsTitle = document.createElement('div');
        baseStatsTitle.textContent = 'Base Stats';
        baseStatsTitle.style.cssText = `
            font-size: 1em;
            color: #FFD700;
            font-weight: bold;
            border-bottom: 1px solid #444;
            padding-bottom: 4px;
            margin-bottom: 8px;
        `;
        card.appendChild(baseStatsTitle);

    const baseStats = classDef.base || {};
        const baseStatsList = document.createElement('div');
        baseStatsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.9em;
            color: #ccc;
        `;
        for (const [stat, value] of Object.entries(baseStats)) {
            if (value === 0) continue;
            const line = document.createElement('div');
            const sign = value > 0 ? '+' : '';
            line.innerHTML = `<span style="color:#888;">${stat.toUpperCase()}:</span> ${sign}${value}`;
            baseStatsList.appendChild(line);
        }
        card.appendChild(baseStatsList);

        // Per-level stats section
        const levelStatsTitle = document.createElement('div');
        levelStatsTitle.textContent = 'Per Level';
        levelStatsTitle.style.cssText = `
            font-size: 1em;
            color: #4FC3F7;
            font-weight: bold;
            border-bottom: 1px solid #444;
            padding-bottom: 4px;
            margin-top: 12px;
            margin-bottom: 8px;
        `;
        card.appendChild(levelStatsTitle);

        const levelStats = classDef.perLevel || {};
        const levelStatsList = document.createElement('div');
        levelStatsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.9em;
            color: #ccc;
        `;
        for (const [stat, value] of Object.entries(levelStats)) {
            if (value === 0) continue;
            const line = document.createElement('div');
            const sign = value > 0 ? '+' : '';
            line.innerHTML = `<span style="color:#888;">${stat.toUpperCase()}:</span> ${sign}${value}`;
            levelStatsList.appendChild(line);
        }
        card.appendChild(levelStatsList);

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.flexGrow = '1';
        card.appendChild(spacer);

        // Choose button
        const chooseBtn = document.createElement('button');
        chooseBtn.textContent = 'Choose This Path';
        chooseBtn.style.cssText = `
            padding: 12px 20px;
            background: linear-gradient(145deg, #FFD700, #FFA500);
            color: #000;
            font-family: 'Cinzel', serif;
            font-size: 1em;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
            transition: all 0.2s ease;
        `;
        chooseBtn.onmouseenter = () => {
            chooseBtn.style.transform = 'scale(1.05)';
            chooseBtn.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.7)';
        };
        chooseBtn.onmouseleave = () => {
            chooseBtn.style.transform = 'scale(1)';
            chooseBtn.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.5)';
        };
        chooseBtn.onclick = () => {
            overlay.remove();
            onClassSelected(classId);
        };
        card.appendChild(chooseBtn);

        cardsContainer.appendChild(card);
    }

    overlay.appendChild(cardsContainer);

    // Close button (top-right X)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px; right: 20px;
        width: 40px; height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #666;
        border-radius: 50%;
        color: #fff;
        font-size: 1.5em;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    closeBtn.onmouseenter = () => {
        closeBtn.style.background = 'rgba(255, 0, 0, 0.3)';
    };
    closeBtn.onmouseleave = () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    };
    closeBtn.onclick = () => overlay.remove();
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
}

// Expose dialogue system to window.__shared_ui
try {
    if (typeof window !== 'undefined') {
        window.__shared_ui = window.__shared_ui || {};
        window.__shared_ui.ensureDialogueOverlay = ensureDialogueOverlay;
        window.__shared_ui.closeDialogue = closeDialogue;
        window.__shared_ui.renderDialogue = renderDialogue;
        window.__shared_ui.renderDialoguePages = renderDialoguePages;
        window.__shared_ui.createDialogueParagraph = createDialogueParagraph;
        window.__shared_ui.buildObjectiveList = buildObjectiveList;
        window.__shared_ui.createClassSelectionModal = createClassSelectionModal;
    }
} catch (e) {}

// expose stats helpers to the shared UI export so callers can compute effective stats
export const stats = { effectiveStats, makeStatPill, formatSkillLine, checkClassLevelUps };



