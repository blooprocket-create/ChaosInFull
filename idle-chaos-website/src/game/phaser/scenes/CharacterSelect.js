// Phaser is loaded globally from CDN

import { createAtmosphericOverlays } from './shared/overlays.js';
import { saveUser, iterUsers, saveJson } from './shared/storage.js';
import { applyDefaultBackground, captureBodyStyle, restoreBodyStyle } from './shared/theme.js';
import { ensureCharTalents } from '../data/talents.js';
import { applyCombatMixin } from './shared/combat.js';

export class CharacterSelect extends Phaser.Scene {
    constructor() {
        super('CharacterSelect');
    }

    create() {
        // Cleanup any HUD/modal elements left by scenes so CharacterSelect is clean
        try {
            const huds = ['town-hud','cave-hud','global-skill-bar'];
            for (const id of huds) { const h = document.getElementById(id); if (h && h.parentNode) h.parentNode.removeChild(h); }
            const modals = ['furnace-modal','cave-furnace-modal'];
            for (const id of modals) { const m = document.getElementById(id); if (m && m.parentNode) m.parentNode.removeChild(m); }
            const toast = document.getElementById('toast-container'); if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            const fog = document.getElementById('town-fog-canvas'); if (fog && fog.parentNode) fog.parentNode.removeChild(fog);
            // Also remove cave fog/canvas ids if present
            const cfog = document.getElementById('cave-hud'); if (cfog && cfog.parentNode) cfog.parentNode.removeChild(cfog);
            // Also ensure any shared UI listeners are unbound to avoid leftover handlers
            try {
                if (window && window.__shared_ui) {
                    try { if (typeof window.__shared_ui.unbindSkillBarKeys === 'function') window.__shared_ui.unbindSkillBarKeys(this); } catch (e) {}
                    try { if (typeof window.__shared_ui.unbindTalentKey === 'function') window.__shared_ui.unbindTalentKey(this); } catch (e) {}
                }
            } catch (e) {}
        } catch (e) { /* ignore cleanup errors */ }

    // Lower overlay z-index to stay beneath the site header (z-20)
    this._atmosphere = createAtmosphericOverlays(this, { idPrefix: 'charselect', zIndexBase: 5 });
        this._cleanupCallbacks = [];
        this._previousBodyStyle = captureBodyStyle();
        applyDefaultBackground();

        // Hide Phaser canvas while character select is active
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            this._previousGameDisplay = gameContainer.style.display;
            gameContainer.style.display = 'none';
        }


                // Load account details
        const deriveUsername = (key, obj) => {
            if (obj && obj.username) return obj.username;
            if (key && key.startsWith('cif_user_')) return key.slice('cif_user_'.length);
            return (obj && obj.name) || key || '';
        };

        let username = '';
        let userObj = null;

        iterUsers((key, obj) => {
            if (userObj || !obj) return;
            if (obj.loggedIn) {
                username = deriveUsername(key, obj);
                userObj = obj;
            }
        });

        if (!userObj) {
            iterUsers((key, obj) => {
                if (!userObj && obj) {
                    username = deriveUsername(key, obj);
                    userObj = obj;
                }
            });
        }

        if (userObj && !userObj.username && username) {
            userObj.username = username;
            try { saveUser(username, userObj); } catch (e) { /* ignore username backfill errors */ }
        }

// UUID helper (v4) for character ids
        function uuidv4() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Migrate existing characters: ensure each has an id
        try {
            if (userObj && userObj.characters && Array.isArray(userObj.characters)) {
                let changed = false;
                for (let i = 0; i < userObj.characters.length; i++) {
                    const c = userObj.characters[i];
                    if (c && !c.id) {
                        c.id = uuidv4();
                        changed = true;
                    }
                }
                if (changed) saveUser(userObj.username || username, userObj);
            }
        } catch (e) { /* ignore migration errors */ }

        // Create a new, themed character select panel that matches the Login scene styling
        const container = document.createElement('div');
        container.id = 'character-select-root';
        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
    // Ensure the panel is below the navbar so top links remain clickable
    container.style.zIndex = '10';

        let characters = (userObj && userObj.characters) ? userObj.characters : [];

        // Keep visuals consistent with Login: same fonts, blocky panel, red accent
        container.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Metal+Mania&family=Share+Tech+Mono&display=swap');
                #charselect-box {
                    width: 920px;
                    max-width: calc(100% - 48px);
                    display: flex;
                    gap: 18px;
                    padding: 24px;
                    background: linear-gradient(180deg, rgba(12,12,14,0.98), rgba(18,18,20,0.96));
                    border-left: 10px solid rgba(80,10,10,0.95);
                    border: 4px solid #111;
                    border-radius: 6px;
                    box-shadow: 0 30px 80px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.02);
                    font-family: 'Share Tech Mono', monospace;
                    align-items: flex-start;
                }
                #charselect-box::before { content:''; pointer-events:none; position:absolute; inset:0; mix-blend-mode:multiply; opacity:0.7; }
                /* Left column: character list */
                #char-list { width: 220px; max-height: 58vh; overflow-y: auto; display:flex; flex-direction:column; gap:10px; }
                /* Themed scrollbar to match login panel */
                #char-list::-webkit-scrollbar { width: 10px; }
                #char-list::-webkit-scrollbar-track { background: linear-gradient(180deg, rgba(10,10,12,0.6), rgba(18,18,20,0.6)); border-radius:6px; }
                #char-list::-webkit-scrollbar-thumb { background: rgba(120,20,20,0.9); border-radius:6px; border: 2px solid rgba(0,0,0,0.35); }
                #char-list { scrollbar-color: rgba(120,20,20,0.9) rgba(18,18,20,0.6); scrollbar-width: thin; }
                .char-tile { background: linear-gradient(180deg, rgba(22,22,24,0.95), rgba(12,12,14,0.95)); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px; cursor:pointer; border:2px solid rgba(30,30,30,0.8); }
                .char-tile:hover { transform: translateY(-3px); border-color: rgba(140,30,30,0.95); }
                .char-tile.empty { display:flex; align-items:center; justify-content:center; font-size:1.6rem; color:#ff6b6b; }
                .char-name { font-weight:700; color:#e6d7cf; }
                .char-meta { color:#bfbfbf; font-size:0.85rem; }
                .char-stats { display:flex; gap:6px; flex-wrap:wrap; }
                .stat-pill { background:#111; color:#ffd27a; padding:6px 8px; border-radius:6px; font-weight:700; font-size:0.85rem; }

                /* Center: preview */
                #char-preview { flex:1; min-width:360px; max-width:520px; display:flex; flex-direction:column; align-items:center; }
                .preview-card { width:100%; background: linear-gradient(180deg, rgba(10,10,12,0.96), rgba(18,18,20,0.96)); border-radius:8px; padding:18px; box-shadow: 0 24px 60px rgba(0,0,0,0.85); color:#e6d7cf; }
                .preview-portrait { height:180px; width:100%; border-radius:6px; background: linear-gradient(180deg, rgba(30,30,32,0.9), rgba(8,8,10,0.9)); display:flex; align-items:center; justify-content:center; color:#bdbdbd; font-size:1rem; margin-bottom:10px; }
                .preview-name { font-family:'Metal Mania', cursive; font-size:1.8rem; color:#f0c9b0; }
                .preview-meta { color:#bfbfbf; margin-top:6px; }

                /* Right: actions */
                #char-actions { width: 240px; display:flex; flex-direction:column; gap:12px; }
                button.cta { background: #0b0b0b; color: #f7eae6; border: 3px solid rgba(90,10,10,0.95); padding: 10px 12px; font-weight:700; cursor:pointer; transition: transform 0.08s ease, box-shadow 0.08s ease; }
                button.cta:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(0,0,0,0.85); }
                button.ghost { background: transparent; color: #bdbdbd; border: 2px dashed #333; padding:8px 10px; transition: background 0.1s ease, border-color 0.12s ease, color 0.12s ease; }
                button.ghost:hover { background: rgba(255,255,255,0.02); border-color: rgba(140,30,30,0.95); color: #efecea; }
                #logout-btn { margin-top:6px; }
                .small-note { font-size:0.75rem; color:#8f8f8f; text-align:center; }
            </style>

            <div id="charselect-box" role="dialog" aria-label="Character Select">
                <div id="char-list" aria-live="polite"></div>
                <div id="char-preview">
                    <div class="preview-card">
                        <div class="preview-portrait">No character selected</div>
                        <div class="preview-name">Create Your Champion</div>
                        <div class="preview-meta">Select a character from the left to see details</div>
                        <div style="height:10px"></div>
                        <div class="preview-stats" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
                    </div>
                </div>
                <div id="char-actions">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <button id="create-new-btn" class="cta">Create New Character</button>
                        <button id="play-btn" class="cta" disabled>Play</button>
                        <button id="delete-btn" class="ghost" disabled>Delete</button>
                    </div>
                    <div style="flex:1"></div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <button id="logout-btn" class="ghost">Log Out</button>
                        <div class="small-note">Interface aligned with login.</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this._container = container;
        this._gameContainer = gameContainer;

        // Attempt to play login/character-select music if preloaded (use shared background music so it persists across scenes)
        try {
            try {
                if (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.playBackgroundMusic === 'function') {
                    const vol = (window && window.__game_settings && typeof window.__game_settings.musicVolume === 'number') ? window.__game_settings.musicVolume : 1;
                    window.__shared_ui.playBackgroundMusic(this, 'login_music', { loop: true, volume: vol });
                }
            } catch (e) { /* ignore if unavailable */ }
        } catch (e) {}

        // Render characters list (reusable)
        function renderCharacterList() {
            try {
                characters = (userObj && userObj.characters) ? userObj.characters : [];
                const list = document.getElementById('char-list');
                if (!list) return;
                list.innerHTML = '';
                for (let i = 0; i < 7; i++) {
                    const slot = characters[i];
                    const tile = document.createElement('div');
                    tile.className = 'char-tile';
                    tile.dataset.idx = String(i);
                    if (!slot) {
                        tile.classList.add('empty');
                        tile.textContent = '+';
                        tile.onclick = () => openCreateModal(i);
                        list.appendChild(tile);
                        continue;
                    }
                    const name = document.createElement('div'); name.className = 'char-name'; name.textContent = slot.name || 'Unnamed';
                    const meta = document.createElement('div'); meta.className = 'char-meta'; meta.textContent = slot.race ? `${slot.race} · Lvl ${slot.level||1}` : `Lvl ${slot.level||1}`;
                    const statsRow = document.createElement('div'); statsRow.className = 'char-stats';
                    // Compute effective stats using the same approach as the preview (deep clone + reconcile)
                    let eff = { str:0,int:0,agi:0,luk:0 };
                    try {
                        const tmp = JSON.parse(JSON.stringify(slot || {}));
                        tmp.equipment = tmp.equipment || {};
                        tmp.stats = tmp.stats || {};
                        if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) {
                            try { window.__shared_ui.reconcileEquipmentBonuses({ char: tmp }); } catch (e) { /* ignore */ }
                        }
                        if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) {
                            eff = window.__shared_ui.stats.effectiveStats(tmp) || eff;
                        }
                    } catch (e) { eff = slot.stats || eff; }
                    ['str','int','agi','luk'].forEach(k => { const p = document.createElement('div'); p.className='stat-pill'; p.textContent = `${k.toUpperCase()}: ${eff[k]||0}`; statsRow.appendChild(p); });
                    tile.appendChild(name); tile.appendChild(meta); tile.appendChild(statsRow);
                    // Use index-based selection so preview and list reference the same authoritative object
                    tile.onclick = () => updatePreview(null, i);
                    list.appendChild(tile);
                }
            } catch (e) { /* ignore render errors */ }
        }

        // initial render
        renderCharacterList();

        // Initialize central preview with first available character or placeholder
        try {
            setTimeout(() => {
                let firstIdx = -1;
                for (let i = 0; i < characters.length; i++) { if (characters[i]) { firstIdx = i; break; } }
                if (firstIdx === -1) updatePreview(null, null);
                else updatePreview(characters[firstIdx], firstIdx);
            }, 80);
        } catch (e) { }

        // Wire interactions for the new UI
        let selectedIdx = null;
        let selectedChar = null;

        function updatePreview(char, idx) {
            // Prefer the authoritative character stored in the characters array when an index is provided
            if (typeof idx === 'number' && characters && characters[idx]) {
                char = characters[idx];
            }
            const preview = document.querySelector('#char-preview .preview-card');
            if (!preview) return;
            const portrait = preview.querySelector('.preview-portrait');
            const nameEl = preview.querySelector('.preview-name');
            const metaEl = preview.querySelector('.preview-meta');
            const statsWrap = preview.querySelector('.preview-stats');
            if (!char) {
                portrait.textContent = 'No character selected';
                nameEl.textContent = 'Create Your Champion';
                metaEl.textContent = 'Select a character from the left to see details';
                statsWrap.innerHTML = '';
                const playBtnLocal = document.getElementById('play-btn');
                const delBtnLocal = document.getElementById('delete-btn');
                if (playBtnLocal) playBtnLocal.disabled = true;
                if (delBtnLocal) delBtnLocal.disabled = true;
                selectedIdx = null; selectedChar = null;
                // remove tile highlights
                Array.from(document.querySelectorAll('.char-tile')).forEach(t=>t.classList.remove('selected'));
                return;
            }
            portrait.textContent = `${char.name} — Lv ${char.level||1}`;
            nameEl.textContent = char.name || 'Unnamed';
            metaEl.textContent = `Level ${char.level||1} — ${char.race||'Unknown'}`;
            statsWrap.innerHTML = '';
            let eff = { str:0,int:0,agi:0,luk:0 };
            try { const tmp = JSON.parse(JSON.stringify(char)); tmp.equipment = tmp.equipment||{}; tmp.stats = tmp.stats||{}; if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses({ char: tmp }); if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(tmp); } catch(e){ eff = char.stats||eff; }
            ['STR','INT','AGI','LUK'].forEach(k=>{ const p = document.createElement('div'); p.className='stat-pill'; p.textContent = `${k}: ${eff[k.toLowerCase()]||0}`; statsWrap.appendChild(p); });
            const playBtnLocal = document.getElementById('play-btn');
            const delBtnLocal = document.getElementById('delete-btn');
            if (playBtnLocal) playBtnLocal.disabled = false;
            if (delBtnLocal) delBtnLocal.disabled = false;
            selectedIdx = idx; selectedChar = char;
            // highlight selected tile
            Array.from(document.querySelectorAll('.char-tile')).forEach(t=>{ t.classList.toggle('selected', parseInt(t.dataset.idx,10)===idx); });
        }

        // Attach click handlers to tiles
        Array.from(document.querySelectorAll('.char-tile')).forEach(tile => {
            const idx = parseInt(tile.dataset.idx,10);
            tile.onclick = () => {
                if (!characters[idx]) {
                    // open create modal (simple inline modal)
                    openCreateModal(idx);
                    return;
                }
                updatePreview(characters[idx], idx);
            };
        });

        // Create / Play / Delete buttons
        const playBtn = document.getElementById('play-btn');
        const delBtn = document.getElementById('delete-btn');
        const createBtn = document.getElementById('create-new-btn');

        if (createBtn) createBtn.onclick = () => openCreateModal(null);

        if (playBtn) playBtn.onclick = () => {
            if (!selectedChar) return;
            const char = selectedChar;
            closeCreateModal();
            if (!char.mining) char.mining = { level: 1, exp: 0, expToLevel: 100 };
            try { ensureCharTalents && ensureCharTalents(char); } catch (e) { }
            char.lastPlayed = Date.now();
            if (userObj && userObj.characters) {
                let replaced = false;
                for (let j = 0; j < userObj.characters.length; j++) {
                    const uc = userObj.characters[j];
                    if (!uc) continue;
                    if ((uc.id && char.id && uc.id === char.id) || (!uc.id && uc.name === char.name)) { userObj.characters[j] = char; replaced = true; break; }
                }
                if (!replaced) {
                    for (let j=0;j<7;j++){ if (!userObj.characters[j]){ userObj.characters[j]=char; replaced=true; break; } }
                    if (!replaced) userObj.characters.push(char);
                }
                saveUser(username, userObj);
            }
            const last = (char && char.lastLocation) ? char.lastLocation : null;
            const payload = { character: char, username };
            if (last && last.scene) payload.lastLocation = last;
            if (char && char.tutorialCompleted) {
                if (last && last.scene) { this.scene.start(last.scene, { character: char, username }); }
                else { this.scene.start('Town', { character: char, username }); }
            } else { this.scene.start('Tutorial', payload); }
        };

        if (delBtn) delBtn.onclick = () => {
            if (selectedIdx === null) return;
            if (userObj && Array.isArray(userObj.characters)) {
                userObj.characters[selectedIdx] = undefined;
                saveUser(username, userObj);
            }
            // refresh UI in-place
            try { renderCharacterList(); updatePreview(null, null); } catch(e) {}
        };

        // Create modal helper
        let _createModal = null;
        function openCreateModal(targetIdx) {
            closeCreateModal();
            const m = document.createElement('div'); m.id = 'char-create-modal'; m.style.position='fixed'; m.style.left='50%'; m.style.top='50%'; m.style.transform='translate(-50%,-50%)'; m.style.zIndex='110'; m.style.width='420px'; m.style.maxWidth='calc(100% - 32px)'; m.style.background='linear-gradient(180deg, rgba(12,12,14,0.98), rgba(18,18,20,0.96))'; m.style.border='4px solid #111'; m.style.borderLeft='10px solid rgba(80,10,10,0.95)'; m.style.padding='18px'; m.style.borderRadius='6px'; m.style.boxShadow='0 30px 80px rgba(0,0,0,0.9)';
            m.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:12px;font-family:'Share Tech Mono',monospace;color:#efecea;">
                    <div style="font-family:'Metal Mania',cursive;font-size:1.6rem;color:#e6b7a1;">Create New Character</div>
                    <input id="new-char-name" placeholder="Name" style="padding:10px;border-radius:4px;background:#111;border:2px solid #222;color:#fff;">
                    <select id="new-char-race" style="padding:8px;border-radius:4px;background:#111;border:2px solid #222;color:#fff;"></select>
                    <select id="new-char-weapon" style="padding:8px;border-radius:4px;background:#111;border:2px solid #222;color:#fff;"></select>
                    <div id="new-char-stats-preview" style="color:#ddd;font-size:0.95em;min-height:26px;"></div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;"><button id="cancel-create" class="ghost">Cancel</button><button id="confirm-create" class="cta">Create</button></div>
                    <div id="char-create-error" style="color:#ff6b6b;"></div>
                </div>
            `;
            document.body.appendChild(m); _createModal = m;
            // populate selects
            try {
                const raceSelect = document.getElementById('new-char-race');
                raceSelect.innerHTML = '<option value="" disabled selected>Race</option>';
                const defs = (window && window.RACE_DEFS) ? window.RACE_DEFS : {};
                for (const k in defs) { const opt = document.createElement('option'); opt.value=k; opt.textContent=(defs[k]&&defs[k].name)||k; raceSelect.appendChild(opt); }
                const weaponSelect = document.getElementById('new-char-weapon');
                weaponSelect.innerHTML = '<option value="" disabled selected>Starting Weapon</option>';
                const idefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                for (const idk of Object.keys(idefs)) { if (idk.startsWith('starter_')) { const d=idefs[idk]; const opt=document.createElement('option'); opt.value=idk; opt.textContent=(d&&d.name)?d.name:idk; weaponSelect.appendChild(opt); } }
            } catch(e){}
            function updatePreview() {
                const selRace = document.getElementById('new-char-race').value;
                const selWeapon = document.getElementById('new-char-weapon').value;
                let tempChar = { stats:{str:0,int:0,agi:0,luk:0}, equipment:{}, class:'beginner' };
                try { const defs2=(window&&window.RACE_DEFS)?window.RACE_DEFS:{}; if (defs2 && defs2[selRace] && defs2[selRace].base) tempChar.stats=Object.assign({}, defs2[selRace].base); } catch(e){}
                if (selWeapon) tempChar.equipment = { weapon: { id: selWeapon } };
                try { if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses({ char: tempChar }); const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(tempChar) : tempChar.stats; document.getElementById('new-char-stats-preview').textContent = `STR:${eff.str} INT:${eff.int} AGI:${eff.agi} LUK:${eff.luk}`; } catch(e){ document.getElementById('new-char-stats-preview').textContent = `STR:${tempChar.stats.str} INT:${tempChar.stats.int} AGI:${tempChar.stats.agi} LUK:${tempChar.stats.luk}`; }
            }
            setTimeout(()=>{
                const race = document.getElementById('new-char-race'); const weapon = document.getElementById('new-char-weapon');
                if (race) race.onchange = updatePreview; if (weapon) weapon.onchange = updatePreview;
                const cancel = document.getElementById('cancel-create'); if (cancel) cancel.onclick = () => closeCreateModal();
                const confirm = document.getElementById('confirm-create'); if (confirm) confirm.onclick = () => {
                    const name = (document.getElementById('new-char-name').value||'').trim(); const raceVal = document.getElementById('new-char-race').value; const weaponVal = document.getElementById('new-char-weapon').value; const err = document.getElementById('char-create-error');
                    if (!name) { if (err) err.textContent='Enter a name.'; return; }
                    const lc = name.toLowerCase(); let nameTaken = false; iterUsers((key,obj)=>{ if (nameTaken||!obj||!Array.isArray(obj.characters)) return; for (const c of obj.characters){ if (c&&c.name&&c.name.toLowerCase()===lc){ nameTaken=true; break; } } });
                    if (nameTaken) { if (err) err.textContent='That name is already taken.'; return; }
                    if (!raceVal) { if (err) err.textContent='Select a race.'; return; }
                    if (!weaponVal) { if (err) err.textContent='Select a starting weapon.'; return; }
                    let stats = { str:0,int:0,agi:0,luk:0 };
                    try { const defs=(window&&window.RACE_DEFS)?window.RACE_DEFS:{}; if (defs && defs[raceVal] && defs[raceVal].base) stats = Object.assign({}, defs[raceVal].base); } catch(e){}
                    if (!userObj.characters) userObj.characters = [];
                    const newChar = { id: uuidv4(), name, race: raceVal, weapon: weaponVal, stats, level:1, class:'beginner' };
                    try { ensureCharTalents && ensureCharTalents(newChar); } catch(e){}
                    if (weaponVal) newChar.startingEquipment = [{ id: weaponVal, qty: 1 }];
                    // place into target slot or first empty
                    let placedIndex = -1;
                    if (typeof targetIdx === 'number') { userObj.characters[targetIdx] = newChar; placedIndex = targetIdx; }
                    else { for (let j=0;j<7;j++){ if (!userObj.characters[j]){ userObj.characters[j]=newChar; placedIndex=j; break; } } if (placedIndex === -1) { userObj.characters.push(newChar); placedIndex = userObj.characters.length-1; } }
                    saveUser(username, userObj);
                    closeCreateModal();
                    // update DOM immediately so user sees the new character in the slot
                    try { renderCharacterList(); if (placedIndex >= 0) { updatePreview(newChar, placedIndex); const tile = document.querySelector(`.char-tile[data-idx='${placedIndex}']`); if (tile) tile.scrollIntoView({ behavior:'smooth', block:'center' }); } } catch(e) {}
                };
            },40);
        }

        function closeCreateModal() { if (_createModal && _createModal.parentNode) { _createModal.parentNode.removeChild(_createModal); _createModal = null; } }

        // Logout button event
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.onclick = () => {
            iterUsers((key, obj) => { if (obj && obj.loggedIn) { obj.loggedIn = false; saveJson(key, obj); } });
            this._cleanupDom();
            this.scene.start('Login');
        };

        // Remove overlays and container on scene shutdown
        this.events.once('shutdown', () => {
            // Do not stop shared background music here (shared manager controls lifecycle).
            this._cleanupDom();
        });
        // Also handle direct scene destruction (e.g., when destroying the game)
        try {
            this.events.once('destroy', () => {
                this._cleanupDom();
            });
        } catch (e) { /* ignore */ }
    }

    _cleanupDom() {
        if (this._cleanupCallbacks && this._cleanupCallbacks.length) {
            for (const fn of this._cleanupCallbacks) {
                try { fn(); } catch (e) { /* ignore */ }
            }
            this._cleanupCallbacks = [];
        }
        if (this._atmosphere && this._atmosphere.destroy) {
            this._atmosphere.destroy();
            this._atmosphere = null;
        }
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
        if (this._gameContainer) {
            this._gameContainer.style.display = this._previousGameDisplay || '';
            this._gameContainer = null;
        }
        this._previousGameDisplay = undefined;
        if (this._previousBodyStyle) {
            restoreBodyStyle(this._previousBodyStyle);
            this._previousBodyStyle = null;
        }
    }
}
applyCombatMixin(CharacterSelect.prototype);

