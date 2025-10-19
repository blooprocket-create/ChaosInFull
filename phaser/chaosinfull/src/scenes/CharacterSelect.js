// Phaser is loaded globally from CDN

import { createAtmosphericOverlays } from './shared/overlays.js';
import { saveUser, iterUsers, saveJson } from './shared/storage.js';
import { applyDefaultBackground, captureBodyStyle, restoreBodyStyle } from './shared/theme.js';

export class CharacterSelect extends Phaser.Scene {
    constructor() {
        super('CharacterSelect');
    }

    create() {
        // Cleanup any HUD/modal elements left by scenes so CharacterSelect is clean
        try {
            const huds = ['town-hud','cave-hud'];
            for (const id of huds) { const h = document.getElementById(id); if (h && h.parentNode) h.parentNode.removeChild(h); }
            const modals = ['furnace-modal','cave-furnace-modal'];
            for (const id of modals) { const m = document.getElementById(id); if (m && m.parentNode) m.parentNode.removeChild(m); }
            const toast = document.getElementById('toast-container'); if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            const fog = document.getElementById('town-fog-canvas'); if (fog && fog.parentNode) fog.parentNode.removeChild(fog);
            // Also remove cave fog/canvas ids if present
            const cfog = document.getElementById('cave-hud'); if (cfog && cfog.parentNode) cfog.parentNode.removeChild(cfog);
        } catch (e) { /* ignore cleanup errors */ }

        this._atmosphere = createAtmosphericOverlays(this, { idPrefix: 'charselect', zIndexBase: 50 });
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
        let username = '';
        let userObj = null;

        iterUsers((key, obj) => {
            if (userObj || !obj) return;
            if (obj.loggedIn) {
                username = obj.username;
                userObj = obj;
            }
        });

        if (!userObj) {
            iterUsers((key, obj) => {
                if (!userObj && obj) {
                    username = obj.username;
                    userObj = obj;
                }
            });
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

        // Create HTML for character select
        const container = document.createElement('div');
        container.id = 'character-select-container';
        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.background = 'transparent';
        container.style.backdropFilter = 'none';
        container.style.zIndex = '100';

        // Character cards (include small stat summary if present)
        let characterCards = '';
        let characters = (userObj && userObj.characters) ? userObj.characters : [];
        for (let i = 0; i < 7; i++) {
            if (characters[i]) {
                const c = characters[i];
                // Compute effective stats (race + class + equipment) without mutating stored character
                let eff = { str:0,int:0,agi:0,luk:0 };
                try {
                    const tempChar = { stats: Object.assign({}, (c.stats || { str:0,int:0,agi:0,luk:0 })), equipment: (c.equipment || {}), class: (c.class || 'beginner') };
                    if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses({ char: tempChar });
                    if (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) eff = window.__shared_ui.stats.effectiveStats(tempChar);
                } catch (e) { /* fallback to base stats */ try { const s = c.stats || {}; eff = { str:s.str||0,int:s.int||0,agi:s.agi||0,luk:s.luk||0 }; } catch(e){} }
                const statSummary = `<div class='stat-pill small' title='STR'>STR:<span class='pill-value'>${eff.str}</span></div> <div class='stat-pill small' title='INT'>INT:<span class='pill-value'>${eff.int}</span></div> <div class='stat-pill small' title='AGI'>AGI:<span class='pill-value'>${eff.agi}</span></div> <div class='stat-pill small' title='LUK'>LUK:<span class='pill-value'>${eff.luk}</span></div>`;
                characterCards += `<div class="char-card"><div class='char-card-inner'><div class='char-name'>${c.name}</div><div class='stat-summary'>${statSummary}</div></div></div>`;
            } else {
                characterCards += `<div class="char-card empty">+</div>`;
            }
        }

        container.innerHTML = `
            <style>
                .char-card {
                    width: 120px;
                    height: 180px;
                    background: rgba(30,30,40,0.85);
                    border-radius: 18px;
                    box-shadow: none;
                    border: 2px solid #444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2em;
                    color: #fff;
                    margin: 12px;
                    cursor: pointer;
                    flex: 0 0 auto;
                    transition: background 0.7s cubic-bezier(.77,0,.175,1), border-color 0.7s cubic-bezier(.77,0,.175,1), transform 0.7s cubic-bezier(.77,0,.175,1);
                }
                .char-card-inner {
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    padding:6px;
                    width:100%;
                    box-sizing:border-box;
                }
                .char-card .char-name { font-size:1.1em; line-height:1.05em; }
                .char-card .stat-summary { font-size:0.65em; color:#ddd; margin-top:6px; word-break:break-word; white-space:normal; }
                .char-card .stat-pill.small { display:inline-flex; align-items:center; gap:6px; padding:3px 5px; border-radius:10px; background:rgba(255,255,255,0.03); color:#fff; margin:2px; }
                .char-card .stat-pill.small .pill-value { color:#ffd27a; margin-left:5px; font-weight:700; font-size:0.9em; }
                .char-card:hover {
                    box-shadow: none;
                    background: rgba(60,10,30,0.85);
                    border-color: #6b0f1a;
                    transform: scale(1.05);
                }
                .char-card.empty {
                    color: #ff3300;
                    font-size: 2.8em;
                }
                #character-select-title {
                    color: #fff;
                    font-size: 2.2em;
                    margin-bottom: 24px;
                    text-shadow: 0 0 12px #fff, 0 0 4px #ff3300;
                    font-family: 'UnifrakturCook', cursive;
                }
                #character-cards-row {
                    display: flex;
                    flex-direction: row;
                    justify-content: flex-start;
                    align-items: center;
                    overflow-x: auto;
                    white-space: nowrap;
                    max-width: 800px;
                    width: 800px;
                    margin: 0 auto 0 auto;
                    padding-bottom: 8px;
                    /* Hide scrollbar for all browsers */
                    scrollbar-width: none;
                }
                #character-cards-row::-webkit-scrollbar {
                    display: none;
                }
                }
                #character-cards-row::-webkit-scrollbar {
                    height: 10px;
                }
                #character-cards-row::-webkit-scrollbar-thumb {
                    background: #ff3300;
                    border-radius: 6px;
                }
                #character-cards-row::-webkit-scrollbar-track {
                    background: #222;
                    border-radius: 6px;
                }
            </style>
            <div id="character-select-title">Select Your Character</div>
            <div style="position:relative;width:800px;margin:0 auto;">
                <div id="character-cards-row">
                    ${characterCards}
                </div>
                <div id="carousel-scroll-indicator" style="position:absolute;left:0;bottom:0;width:100%;height:6px;background:rgba(40,20,40,0.5);border-radius:3px;overflow:hidden;">
                    <div id="carousel-scroll-thumb" style="height:100%;width:80px;background:linear-gradient(90deg,#e44,#a00);border-radius:3px;transition:width 0.2s;"></div>
                    <div class="carousel-scroll-glow" style="height:100%;width:40px;background:linear-gradient(90deg,rgba(228,68,68,0.7),rgba(160,0,0,0.7));border-radius:2px;transition:width 0.3s cubic-bezier(.77,0,.175,1), transform 0.3s cubic-bezier(.77,0,.175,1);"></div>
                </div>
            </div>
            <button id="logout-btn" style="margin-top:32px;padding:12px 32px;font-size:1.1em;border-radius:10px;background:linear-gradient(90deg,#222 40%,#444 100%);color:#fff;border:none;box-shadow:0 0 4px #ff3300,0 0 2px #fff inset;cursor:pointer;">Log Out</button>
            <div id="char-modal-bg" style="display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(10,10,20,0.7);z-index:200;justify-content:center;align-items:center;"></div>
        `;
        document.body.appendChild(container);
        this._container = container;
        this._gameContainer = gameContainer;
        // Subtle scroll indicator logic
        setTimeout(() => {
            const row = document.getElementById('character-cards-row');
            const thumb = document.getElementById('carousel-scroll-thumb');
            if (!row || !thumb) return;
            const updateScrollThumb = () => {
                const visible = row.offsetWidth;
                const total = row.scrollWidth;
                const scrollLeft = row.scrollLeft;
                const percent = total > 0 ? visible / total : 1;
                const thumbWidth = Math.max(visible * percent, 60);
                const maxScroll = total - visible;
                const left = maxScroll > 0 ? (scrollLeft / maxScroll) * (visible - thumbWidth) : 0;
                thumb.style.width = thumbWidth + 'px';
                thumb.style.transform = `translateX(${left}px)`;
            };
            row.addEventListener('scroll', updateScrollThumb);
            window.addEventListener('resize', updateScrollThumb);
            this._cleanupCallbacks.push(() => row.removeEventListener('scroll', updateScrollThumb));
            this._cleanupCallbacks.push(() => window.removeEventListener('resize', updateScrollThumb));
            updateScrollThumb();
        }, 100);
        // Enable mouse wheel horizontal scrolling for carousel
        setTimeout(() => {
            const row = document.getElementById('character-cards-row');
            if (!row) return;
            const wheelHandler = (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    row.scrollLeft += e.deltaY;
                }
            };
            row.addEventListener('wheel', wheelHandler, { passive: false });
            this._cleanupCallbacks.push(() => row.removeEventListener('wheel', wheelHandler));
        }, 100);
        // Modal logic
        function showModal(contentHtml) {
            const modalBg = document.getElementById('char-modal-bg');
            modalBg.innerHTML = `
                <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.85); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes modalFadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(0.85); }
                }
                #char-modal {
                    background: linear-gradient(135deg, #2a223a 0%, #1a1026 100%);
                    border-radius: 22px;
                    box-shadow: 0 0 48px 0 #111;
                    padding: 44px 38px 32px 38px;
                    min-width: 340px;
                    min-height: 200px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 201;
                    animation: modalFadeIn 0.5s cubic-bezier(.77,0,.175,1) forwards;
                    position: relative;
                    border: 2px solid #444;
                }
                #char-modal h2 {
                    font-family: 'UnifrakturCook', cursive;
                    letter-spacing: 2px;
                    text-shadow: 0 0 12px #fff, 0 0 4px #ff3300;
                }
                .stat-pill {
                    transition: transform 0.2s;
                    box-shadow: none;
                }
                .stat-pill:hover {
                    box-shadow: none;
                    transform: scale(1.08);
                }
                #char-modal button {
                    transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
                }
                #char-modal button:hover {
                    background: linear-gradient(90deg, #ff3300 60%, #6c3483 100%);
                    box-shadow: 0 0 12px #ff3300, 0 0 4px #fff inset;
                    transform: scale(1.05);
                }
                </style>
                <div id='char-modal'>${contentHtml}</div>
            `;
            modalBg.style.display = 'flex';
            modalBg.style.alignItems = 'center';
            modalBg.style.justifyContent = 'center';
            modalBg.style.backdropFilter = 'blur(2px)';
            modalBg.onclick = function(e) {
                if (e.target === modalBg) {
                    const modal = document.getElementById('char-modal');
                    if (modal) {
                        modal.style.animation = 'modalFadeOut 0.3s cubic-bezier(.77,0,.175,1) forwards';
                        setTimeout(() => { modalBg.style.display = 'none'; }, 280);
                    } else {
                        modalBg.style.display = 'none';
                    }
                }
            };
        }

        // Card click logic
        Array.from(document.querySelectorAll('.char-card')).forEach((card, idx) => {
            card.onclick = () => {
                if (characters[idx]) {
                    // Show expanded character info and play button
                    const char = characters[idx];
                    // Compute effective stats/vitals (include equipment, class/race bonuses).
                    // Deep-clone the character so we don't accidentally mutate the stored object when reconciling equipment.
                    let baseStats;
                    try {
                        const displayChar = JSON.parse(JSON.stringify(char || {}));
                        displayChar.stats = displayChar.stats || { str: 0, int: 0, agi: 0, luk: 0 };
                        displayChar.equipment = displayChar.equipment || {};
                        // Some shared helpers expect an object like { char: ... }
                        if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) {
                            try { window.__shared_ui.reconcileEquipmentBonuses({ char: displayChar }); } catch (e) { /* continue to effective calc */ }
                        }
                        const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats)
                            ? window.__shared_ui.stats.effectiveStats(displayChar)
                            : displayChar.stats;

                        baseStats = {
                            maxhp: (eff && eff.maxhp) || (100 + ((displayChar.level || 1) * 10) + (((eff && eff.str) || 0) * 10)),
                            maxmana: (eff && eff.maxmana) || (50 + ((displayChar.level || 1) * 5) + (((eff && eff.int) || 0) * 10)),
                            attackspeed: (eff && eff.attackspeed) || (1.0 + (((eff && eff.agi) || 0) * 0.02)),
                            def: (eff && eff.def) || (5 + ((displayChar.level || 1)) + (((eff && eff.luk) || 0) * 2)),
                            str: (eff && eff.str) || 0,
                            agi: (eff && eff.agi) || 0,
                            int: (eff && eff.int) || 0,
                            luk: (eff && eff.luk) || 0
                        };
                    } catch (err) {
                        // Fallback to original base stat calculation if anything goes wrong
                        baseStats = {
                            maxhp: 100 + ((char.level || 1) * 10) + (((char.stats && char.stats.str) || 0) * 10),
                            maxmana: 50 + ((char.level || 1) * 5) + (((char.stats && char.stats.int) || 0) * 10),
                            attackspeed: 1.0 + (((char.stats && char.stats.agi) || 0) * 0.02),
                            def: 5 + ((char.level || 1)) + (((char.stats && char.stats.luk) || 0) * 2),
                            str: (char.stats && char.stats.str) || 0,
                            agi: (char.stats && char.stats.agi) || 0,
                            int: (char.stats && char.stats.int) || 0,
                            luk: (char.stats && char.stats.luk) || 0
                        };
                    }
                    // Show lastLocation info if present
                    const last = (char && char.lastLocation) ? char.lastLocation : null;
                    const lastStr = last && last.scene ? `${last.scene} (${Math.round(last.x||0)}, ${Math.round(last.y||0)})` : 'None';
                    const lastPlayedStr = (char && char.lastPlayed) ? new Date(char.lastPlayed).toLocaleString() : 'Never';
                    showModal(`
                        <h2 style='color:#fff;font-size:1.5em;margin-bottom:12px;'>${char.name}</h2>
                        <div style='color:#ccc;margin-bottom:8px;'>Level: ${char.level || 1}</div>
                        <div style='color:#ccc;margin-bottom:8px;'>Race: ${char.race || 'Unknown'}</div>
                        <div style='color:#ccc;margin-bottom:8px;'>Last: ${lastStr}</div>
                        <div style='color:#eee;margin-bottom:12px;display:flex;flex-direction:row;gap:24px;justify-content:center;'>
                            <div style='display:flex;flex-direction:column;gap:8px;'>
                                <span style='font-weight:bold;width:100%;text-align:center;margin-bottom:4px;'>Vitals</span>
                                <span class='stat-pill' style='background:#222;color:#ff6666;padding:6px 16px;border-radius:16px;font-size:1em;'>Max HP: ${baseStats.maxhp}</span>
                                <span class='stat-pill' style='background:#222;color:#66aaff;padding:6px 16px;border-radius:16px;font-size:1em;'>Max Mana: ${baseStats.maxmana}</span>
                                <span class='stat-pill' style='background:#222;color:#66ff99;padding:6px 16px;border-radius:16px;font-size:1em;'>Attack Speed: ${baseStats.attackspeed.toFixed(2)}</span>
                                <span class='stat-pill' style='background:#222;color:#cccc66;padding:6px 16px;border-radius:16px;font-size:1em;'>DEF: ${baseStats.def}</span>
                            </div>
                            <div style='display:flex;flex-direction:column;gap:8px;'>
                                <span style='font-weight:bold;width:100%;text-align:center;margin-bottom:4px;'>Base Stats</span>
                                <span class='stat-pill' style='background:#222;color:#ff3300;padding:6px 16px;border-radius:16px;font-size:1em;'>STR: ${baseStats.str}</span>
                                <span class='stat-pill' style='background:#222;color:#66ccff;padding:6px 16px;border-radius:16px;font-size:1em;'>INT: ${baseStats.int}</span>
                                <span class='stat-pill' style='background:#222;color:#ffcc00;padding:6px 16px;border-radius:16px;font-size:1em;'>AGI: ${baseStats.agi}</span>
                                <span class='stat-pill' style='background:#222;color:#cc66ff;padding:6px 16px;border-radius:16px;font-size:1em;'>LUK: ${baseStats.luk}</span>
                            </div>
                        </div>
                        <div style='color:#bbb;margin-top:6px;margin-bottom:10px;font-size:0.9em;'>Last played: ${lastPlayedStr}</div>
                        <button id='play-char-btn' style='padding:10px 28px;font-size:1.1em;border-radius:10px;background:linear-gradient(90deg,#222 40%,#444 100%);color:#fff;border:none;box-shadow:0 0 4px #ff3300,0 0 2px #fff inset;cursor:pointer;margin-bottom:12px;'>Play</button>
                        <button id='delete-char-btn' style='padding:8px 24px;font-size:1em;border-radius:10px;background:linear-gradient(90deg,#444 40%,#222 100%);color:#fff;border:none;box-shadow:0 0 4px #ff3300,0 0 2px #fff inset;cursor:pointer;'>Delete</button>
                    `);
                    setTimeout(() => {
                        document.getElementById('play-char-btn').onclick = () => {
                            // Start last saved scene for this character if present
                            document.getElementById('char-modal-bg').style.display = 'none';
                            // Ensure mining skill exists on the character and persist
                            if (!char.mining) char.mining = { level: 1, exp: 0, expToLevel: 100 };
                            // update lastPlayed timestamp
                            char.lastPlayed = Date.now();
                            // find by id and replace (migrate older name-based entries if necessary)
                            if (userObj && userObj.characters) {
                                let replaced = false;
                                for (let j = 0; j < userObj.characters.length; j++) {
                                    const uc = userObj.characters[j];
                                    if (!uc) continue;
                                    if ((uc.id && char.id && uc.id === char.id) || (!uc.id && uc.name === char.name)) {
                                        userObj.characters[j] = char;
                                        replaced = true;
                                        break;
                                    }
                                }
                                if (!replaced) {
                                    // fallback: push into first empty slot
                                    for (let j = 0; j < 7; j++) {
                                        if (!userObj.characters[j]) { userObj.characters[j] = char; replaced = true; break; }
                                    }
                                    if (!replaced) userObj.characters.push(char);
                                }
                                saveUser(username, userObj);
                            }
                            // If the character has a saved lastLocation, jump there
                            const last = (char && char.lastLocation) ? char.lastLocation : null;
                            if (last && last.scene) {
                                // Pass along stored position as well
                                this.scene.start(last.scene, { character: char, username, spawnX: last.x, spawnY: last.y });
                            } else {
                                this.scene.start('Town', { character: char, username });
                            }
                        };
                        document.getElementById('delete-char-btn').onclick = () => {
                                userObj.characters[idx] = undefined;
                                saveUser(username, userObj);
                                document.getElementById('char-modal-bg').style.display = 'none';
                                setTimeout(() => {
                                    this.scene.restart();
                                }, 200);
                        };
                    }, 100);
                } else {
                    // Show expanded new character form
                    showModal(`
                        <h2 style='color:#fff;font-size:1.3em;margin-bottom:12px;'>Create New Character</h2>
                        <input id='new-char-name' type='text' placeholder='Name' style='margin-bottom:12px;padding:8px 12px;border-radius:8px;border:1px solid #444;background:#222;color:#fff;width:180px;text-align:center;'>
                        <select id='new-char-race' style='margin-bottom:12px;padding:8px 12px;border-radius:8px;border:1px solid #444;background:#222;color:#fff;width:180px;'>
                            <option value='' disabled selected>Race</option>
                        </select>
                        <select id='new-char-weapon' style='margin-bottom:12px;padding:8px 12px;border-radius:8px;border:1px solid #444;background:#222;color:#fff;width:180px;'>
                            <option value='' disabled selected>Starting Weapon</option>
                        </select>
                        <div id='new-char-stats-preview' style='margin-top:8px;color:#ddd;font-size:0.95em;min-height:26px;'></div>
                        <button id='create-char-btn' style='padding:10px 28px;font-size:1.1em;border-radius:10px;background:linear-gradient(90deg,#222 40%,#444 100%);color:#fff;border:none;box-shadow:0 0 4px #ff3300,0 0 2px #fff inset;cursor:pointer;'>Create</button>
                        <div id='char-create-error' style='color:#ff3300;margin-top:8px;min-height:24px;'></div>
                    `);
                    setTimeout(() => {
                        // Populate race options and live preview
                        try {
                            const raceSelect = document.getElementById('new-char-race');
                            const defs = (window && window.RACE_DEFS) ? window.RACE_DEFS : {};
                            for (const k in defs) {
                                const opt = document.createElement('option'); opt.value = k; opt.textContent = (defs[k] && defs[k].name) || k; raceSelect.appendChild(opt);
                            }
                            const previewEl = document.getElementById('new-char-stats-preview');
                            // Populate starter weapon options from ITEM_DEFS (starter_* keys)
                            try {
                                const weaponSelect = document.getElementById('new-char-weapon');
                                const idefs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
                                for (const idk of Object.keys(idefs)) {
                                    if (idk.startsWith('starter_')) {
                                        const d = idefs[idk];
                                        const opt = document.createElement('option'); opt.value = idk; opt.textContent = (d && d.name) ? `${d.name} ${d.statBonus ? '(' + Object.keys(d.statBonus).map(k=>'+'+d.statBonus[k]+' '+k.toUpperCase()).join(',') + ')' : ''}` : idk; weaponSelect.appendChild(opt);
                                    }
                                }
                            } catch (e) { /* ignore */ }
                            function updatePreview() {
                                const selRace = document.getElementById('new-char-race').value;
                                const selWeapon = document.getElementById('new-char-weapon').value;
                                // build a temp char object to compute effective stats (base race + class + starter weapon if selected)
                                let tempChar = { stats: { str:0,int:0,agi:0,luk:0 }, equipment: {}, class: 'beginner' };
                                try { const defs2 = (window && window.RACE_DEFS) ? window.RACE_DEFS : {}; if (defs2 && defs2[selRace] && defs2[selRace].base) tempChar.stats = Object.assign({}, defs2[selRace].base); } catch(e) {}
                                // treat selected weapon as equipped if chosen
                                if (selWeapon) tempChar.equipment = { weapon: { id: selWeapon, name: (window && window.ITEM_DEFS && window.ITEM_DEFS[selWeapon] && window.ITEM_DEFS[selWeapon].name) || selWeapon } };
                                try {
                                    if (window && window.__shared_ui && window.__shared_ui.reconcileEquipmentBonuses) window.__shared_ui.reconcileEquipmentBonuses({ char: tempChar });
                                    const eff = (window && window.__shared_ui && window.__shared_ui.stats && window.__shared_ui.stats.effectiveStats) ? window.__shared_ui.stats.effectiveStats(tempChar) : tempChar.stats;
                                    previewEl.textContent = `STR:${eff.str}  INT:${eff.int}  AGI:${eff.agi}  LUK:${eff.luk}`;
                                } catch (e) {
                                    // fallback to base display
                                    previewEl.textContent = `STR:${tempChar.stats.str}  INT:${tempChar.stats.int}  AGI:${tempChar.stats.agi}  LUK:${tempChar.stats.luk}`;
                                }
                            }
                            document.getElementById('new-char-race').onchange = updatePreview;
                            document.getElementById('new-char-weapon').onchange = updatePreview;
                        } catch (e) { /* ignore */ }

                        document.getElementById('create-char-btn').onclick = () => {
                            const name = document.getElementById('new-char-name').value.trim();
                            const race = document.getElementById('new-char-race').value;
                            const weapon = document.getElementById('new-char-weapon').value;
                            const errorDiv = document.getElementById('char-create-error');
                            if (!name) {
                                errorDiv.textContent = 'Enter a name.';
                                return;
                            }
                            // Check for duplicate names across all users (case-insensitive)
                            const lcName = name.toLowerCase();
                            let nameTaken = false;
                            iterUsers((key, obj) => {
                                if (nameTaken || !obj || !Array.isArray(obj.characters)) return;
                                for (const c of obj.characters) {
                                    if (c && c.name && c.name.toLowerCase() === lcName) {
                                        nameTaken = true;
                                        break;
                                    }
                                }
                            });
                            if (nameTaken) {
                                errorDiv.textContent = 'That name is already taken.';
                                return;
                            }
                            if (!race) {
                                errorDiv.textContent = 'Select a race.';
                                return;
                            }
                            if (!weapon) {
                                errorDiv.textContent = 'Select a starting weapon.';
                                return;
                            }
                            // Set base stats by race from data-driven defs
                            let stats = { str: 0, int: 0, agi: 0, luk: 0 };
                            try {
                                const defs = (window && window.RACE_DEFS) ? window.RACE_DEFS : {};
                                if (defs && defs[race] && defs[race].base) stats = Object.assign({}, defs[race].base);
                            } catch (e) { /* ignore */ }
                            // Weapon bonuses are now applied only when the item is equipped.
                            // Do not modify base stats here. Starter items will be added to
                            // the newChar.startingEquipment and Town will auto-equip on first login.
                            // Save character to userObj (assign unique id)
                            if (!userObj.characters) userObj.characters = [];
                            // The select now returns an item id for starter weapon (e.g., 'starter_sword')
                            const starterItemId = weapon;
                            const newChar = { id: uuidv4(), name, race, weapon: starterItemId, stats, level: 1, class: 'beginner' };
                            // attach starting equipment entry so the play scene can add the item to inventory/equip
                            if (starterItemId) newChar.startingEquipment = [ { id: starterItemId, qty: 1 } ];
                            userObj.characters[idx] = newChar;
                            saveUser(username, userObj);
                            errorDiv.textContent = '';
                            document.getElementById('char-modal-bg').style.display = 'none';
                            // Refresh character cards without leaving scene
                            setTimeout(() => {
                                this.scene.restart();
                            }, 200);
                        };
                    }, 100);
                }
            };
        });
        // Logout button event
        document.getElementById('logout-btn').onclick = () => {
            iterUsers((key, obj) => {
                if (obj && obj.loggedIn) {
                    obj.loggedIn = false;
                    saveJson(key, obj);
                }
            });
            this._cleanupDom();
            this.scene.start('Login');
        };

        // Remove overlays and container on scene shutdown
        this.events.once('shutdown', () => {
            this._cleanupDom();
        });
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
