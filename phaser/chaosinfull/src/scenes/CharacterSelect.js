// Phaser is loaded globally from CDN

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

        // --- Overlay creation order: fog, embers, shadow, vignette ---
        // 1. Fog overlay
        const fogCanvas = document.createElement('canvas');
        fogCanvas.id = 'fog-canvas';
        fogCanvas.width = window.innerWidth;
        fogCanvas.height = window.innerHeight;
        fogCanvas.style.position = 'fixed';
        fogCanvas.style.left = '0';
        fogCanvas.style.top = '0';
        fogCanvas.style.width = '100vw';
        fogCanvas.style.height = '100vh';
        fogCanvas.style.pointerEvents = 'none';
        fogCanvas.style.zIndex = '50';
        document.body.appendChild(fogCanvas);
        const fogCtx = fogCanvas.getContext('2d');
        const fogParticles = [];
        const fogColors = ['rgba(255,255,255,0.18)', 'rgba(200,200,255,0.15)', 'rgba(180,180,200,0.13)'];
        for (let i = 0; i < 220; i++) {
            fogParticles.push({
                x: Math.random() * fogCanvas.width,
                y: Math.random() * fogCanvas.height,
                r: 40 + Math.random() * 60,
                vx: 0.14 + Math.random() * 0.22,
                vy: -0.06 + Math.random() * 0.14,
                alpha: 0.13 + Math.random() * 0.12,
                color: fogColors[Math.floor(Math.random() * fogColors.length)]
            });
        }

        // 2. Ember overlay
        const emberCanvas = document.createElement('canvas');
        emberCanvas.id = 'ember-canvas';
        emberCanvas.width = window.innerWidth;
        emberCanvas.height = window.innerHeight;
        emberCanvas.style.position = 'fixed';
        emberCanvas.style.left = '0';
        emberCanvas.style.top = '0';
        emberCanvas.style.width = '100vw';
        emberCanvas.style.height = '100vh';
        emberCanvas.style.pointerEvents = 'none';
        emberCanvas.style.zIndex = '60';
        document.body.appendChild(emberCanvas);
        const emberCtx = emberCanvas.getContext('2d');
        const embers = [];
        for (let i = 0; i < 600; i++) {
            embers.push({
                x: Math.random() * emberCanvas.width,
                y: Math.random() * emberCanvas.height,
                r: 0.5 + Math.random() * 1,
                alpha: 0.5 + Math.random() * 0.3,
                dx: (Math.random() - 0.5) * 1.2,
                dy: -0.6 - Math.random() * 1.2,
                color: 'rgba(255,80,0,0.8)'
            });
        }

        // 3. Shadow overlay
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.id = 'shadow-canvas';
        shadowCanvas.width = window.innerWidth;
        shadowCanvas.height = window.innerHeight;
        shadowCanvas.style.position = 'fixed';
        shadowCanvas.style.left = '0';
        shadowCanvas.style.top = '0';
        shadowCanvas.style.width = '100vw';
        shadowCanvas.style.height = '100vh';
        shadowCanvas.style.pointerEvents = 'none';
        shadowCanvas.style.zIndex = '70';
        document.body.appendChild(shadowCanvas);
        const sctx = shadowCanvas.getContext('2d');
        let shadowX = -300;
        let shadowY = shadowCanvas.height * 0.7;

        // 4. Vignette overlay
        const vignetteCanvas = document.createElement('canvas');
        vignetteCanvas.id = 'vignette-canvas';
        vignetteCanvas.width = window.innerWidth;
        vignetteCanvas.height = window.innerHeight;
        vignetteCanvas.style.position = 'fixed';
        vignetteCanvas.style.left = '0';
        vignetteCanvas.style.top = '0';
        vignetteCanvas.style.width = '100vw';
        vignetteCanvas.style.height = '100vh';
        vignetteCanvas.style.pointerEvents = 'none';
        vignetteCanvas.style.zIndex = '80';
        document.body.appendChild(vignetteCanvas);
        const vctx = vignetteCanvas.getContext('2d');
        let vignetteTime = 0;
        let breathPeriod = 6 + Math.random() * 2;
        let breathIntensity = 0.45 + Math.random() * 0.25;

        // Animation loop for all overlays
        function animateOverlays() {
            // Fog
            fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
            for (const p of fogParticles) {
                fogCtx.beginPath();
                fogCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                fogCtx.fillStyle = p.color;
                fogCtx.globalAlpha = p.alpha;
                fogCtx.fill();
                fogCtx.globalAlpha = 1;
                p.x += p.vx;
                p.y += p.vy;
                if (p.x - p.r > fogCanvas.width) p.x = -p.r;
                if (p.y + p.r < 0) p.y = fogCanvas.height + p.r;
            }

            // Embers
            emberCtx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);
            embers.forEach(e => {
                let fadeLimit = 0.65 + Math.random() * 0.15;
                let fade = Math.max(0, Math.min(1, (e.y / (emberCanvas.height * fadeLimit))));
                emberCtx.beginPath();
                emberCtx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                emberCtx.fillStyle = e.color;
                emberCtx.globalAlpha = e.alpha * fade;
                emberCtx.shadowColor = 'orange';
                emberCtx.shadowBlur = 8;
                emberCtx.fill();
                emberCtx.globalAlpha = 1;
                e.x += e.dx;
                e.y += e.dy;
                if (e.y < -10 || e.x < -10 || e.x > emberCanvas.width + 10) {
                    e.x = Math.random() * emberCanvas.width;
                    e.y = emberCanvas.height + 10;
                }
            });

            // Shadow
            sctx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
            sctx.save();
            sctx.globalAlpha = 0.22 + 0.13 * Math.abs(Math.sin(Date.now()/4000));
            sctx.filter = 'blur(12px)';
            sctx.beginPath();
            sctx.ellipse(shadowX, shadowY, 120, 260, 0, 0, Math.PI * 2);
            sctx.fillStyle = '#0a0106';
            sctx.fill();
            sctx.restore();
            shadowX += 0.10;
            if (shadowX > shadowCanvas.width + 300) shadowX = -300;

            // Vignette
            vignetteTime += 1/60;
            if (Math.random() < 0.002) {
                breathPeriod = 6 + Math.random() * 2;
                breathIntensity = 0.45 + Math.random() * 0.25;
            }
            const phase = Math.sin((vignetteTime / breathPeriod) * Math.PI * 2);
            const alpha = breathIntensity + 0.45 * Math.abs(phase);
            vctx.clearRect(0, 0, vignetteCanvas.width, vignetteCanvas.height);
            const grad = vctx.createRadialGradient(
                vignetteCanvas.width / 2,
                vignetteCanvas.height / 2,
                Math.min(vignetteCanvas.width, vignetteCanvas.height) / 2.2,
                vignetteCanvas.width / 2,
                vignetteCanvas.height / 2,
                Math.max(vignetteCanvas.width, vignetteCanvas.height) / 1.1
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.7, `rgba(30,0,20,${alpha})`);
            grad.addColorStop(1, `rgba(0,0,0,${alpha + 0.38})`);
            vctx.fillStyle = grad;
            vctx.fillRect(0, 0, vignetteCanvas.width, vignetteCanvas.height);

            requestAnimationFrame(animateOverlays);
        }
        animateOverlays();

        // Resize all overlays on window resize
        window.addEventListener('resize', () => {
            fogCanvas.width = window.innerWidth;
            fogCanvas.height = window.innerHeight;
            emberCanvas.width = window.innerWidth;
            emberCanvas.height = window.innerHeight;
            shadowCanvas.width = window.innerWidth;
            shadowCanvas.height = window.innerHeight;
            vignetteCanvas.width = window.innerWidth;
            vignetteCanvas.height = window.innerHeight;
            shadowY = shadowCanvas.height * 0.7;
        });

        // Hide Phaser canvas while character select is active
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) gameContainer.style.display = 'none';

        // Load account details
        let username = '';
        let userObj = null;
        // Try to get last logged in user (from login scene)
        for (let key in localStorage) {
            if (key.startsWith('cif_user_')) {
                const obj = JSON.parse(localStorage.getItem(key));
                if (obj && obj.loggedIn) {
                    username = obj.username;
                    userObj = obj;
                    break;
                }
            }
        }
        // If not found, fallback to last used (or prompt)
        if (!userObj) {
            // Could use a global or pass from login...
            // For now, try to get the first user
            for (let key in localStorage) {
                if (key.startsWith('cif_user_')) {
                    userObj = JSON.parse(localStorage.getItem(key));
                    username = userObj.username;
                    break;
                }
            }
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
                if (changed) localStorage.setItem('cif_user_' + (userObj.username || username), JSON.stringify(userObj));
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

        // Character cards
        let characterCards = '';
        let characters = (userObj && userObj.characters) ? userObj.characters : [];
        for (let i = 0; i < 7; i++) {
            if (characters[i]) {
                characterCards += `<div class="char-card">${characters[i].name}</div>`;
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
                    <div id="carousel-scroll-thumb" style="height:100%;width:40px;background:linear-gradient(90deg,rgba(228,68,68,0.7),rgba(160,0,0,0.7));border-radius:2px;transition:width 0.3s cubic-bezier(.77,0,.175,1), transform 0.3s cubic-bezier(.77,0,.175,1);"></div>
                </div>
            </div>
            <button id="logout-btn" style="margin-top:32px;padding:12px 32px;font-size:1.1em;border-radius:10px;background:linear-gradient(90deg,#222 40%,#444 100%);color:#fff;border:none;box-shadow:0 0 4px #ff3300,0 0 2px #fff inset;cursor:pointer;">Log Out</button>
            <div id="char-modal-bg" style="display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(10,10,20,0.7);z-index:200;justify-content:center;align-items:center;"></div>
        `;
        document.body.appendChild(container);
        // Subtle scroll indicator logic
        setTimeout(() => {
            const row = document.getElementById('character-cards-row');
            const thumb = document.getElementById('carousel-scroll-thumb');
            function updateScrollThumb() {
                if (!row || !thumb) return;
                const visible = row.offsetWidth;
                const total = row.scrollWidth;
                const scrollLeft = row.scrollLeft;
                const percent = visible / total;
                const thumbWidth = Math.max(visible * percent, 60);
                const maxScroll = total - visible;
                const left = maxScroll > 0 ? (scrollLeft / maxScroll) * (visible - thumbWidth) : 0;
                thumb.style.width = thumbWidth + 'px';
                thumb.style.transform = `translateX(${left}px)`;
            }
            row.addEventListener('scroll', updateScrollThumb);
            window.addEventListener('resize', updateScrollThumb);
            updateScrollThumb();
        }, 100);
        // Enable mouse wheel horizontal scrolling for carousel
        setTimeout(() => {
            const row = document.getElementById('character-cards-row');
            if (row) {
                row.addEventListener('wheel', function(e) {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        row.scrollLeft += e.deltaY;
                    }
                }, { passive: false });
            }
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
                    // Calculate base stats (example values)
                    const baseStats = {
                        maxhp: 100 + ((char.level || 1) * 10) + (((char.stats && char.stats.str) || 0) * 10),
                        maxmana: 50 + ((char.level || 1) * 5) + (((char.stats && char.stats.int) || 0) * 10),
                        attackspeed: 1.0 + (((char.stats && char.stats.agi) || 0) * 0.02),
                        def: 5 + ((char.level || 1)) + (((char.stats && char.stats.luk) || 0) * 2),
                        str: (char.stats && char.stats.str) || 0,
                        agi: (char.stats && char.stats.agi) || 0,
                        int: (char.stats && char.stats.int) || 0,
                        luk: (char.stats && char.stats.luk) || 0
                    };
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
                                localStorage.setItem('cif_user_' + username, JSON.stringify(userObj));
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
                                localStorage.setItem('cif_user_' + username, JSON.stringify(userObj));
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
                            <option value='Human'>Human</option>
                            <option value='Elf'>Elf</option>
                            <option value='Demonoid'>Demonoid</option>
                            <option value='Angel'>Angel</option>
                        </select>
                        <select id='new-char-weapon' style='margin-bottom:12px;padding:8px 12px;border-radius:8px;border:1px solid #444;background:#222;color:#fff;width:180px;'>
                            <option value='' disabled selected>Starting Weapon</option>
                            <option value='Sword'>Sword (+3 STR)</option>
                            <option value='Staff'>Staff (+3 INT)</option>
                            <option value='Dagger'>Dagger (+3 AGI)</option>
                            <option value='Dice'>Dice in a Bag (+3 LUK)</option>
                        </select>
                        <button id='create-char-btn' style='padding:10px 28px;font-size:1.1em;border-radius:10px;background:linear-gradient(90deg,#222 40%,#444 100%);color:#fff;border:none;box-shadow:0 0 4px #ff3300,0 0 2px #fff inset;cursor:pointer;'>Create</button>
                        <div id='char-create-error' style='color:#ff3300;margin-top:8px;min-height:24px;'></div>
                    `);
                    setTimeout(() => {
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
                            for (let key in localStorage) {
                                if (!key.startsWith('cif_user_')) continue;
                                try {
                                    const obj = JSON.parse(localStorage.getItem(key));
                                    if (obj && obj.characters) {
                                        for (const c of obj.characters) {
                                            if (c && c.name && c.name.toLowerCase() === lcName) {
                                                errorDiv.textContent = 'That name is already taken.';
                                                return;
                                            }
                                        }
                                    }
                                } catch (e) { /* ignore parse errors */ }
                            }
                            if (!race) {
                                errorDiv.textContent = 'Select a race.';
                                return;
                            }
                            if (!weapon) {
                                errorDiv.textContent = 'Select a starting weapon.';
                                return;
                            }
                            // Set base stats by race and weapon
                            let stats = { str: 0, int: 0, agi: 0, luk: 0 };
                            // Race bonuses
                            if (race === 'Human') { stats.str = 2; stats.int = 2; stats.agi = 2; stats.luk = 2; }
                            if (race === 'Elf')   { stats.str = 1; stats.int = 3; stats.agi = 3; stats.luk = 1; }
                            if (race === 'Demonoid') { stats.str = 3; stats.int = 2; stats.agi = 1; stats.luk = 2; }
                            if (race === 'Angel') { stats.str = 1; stats.int = 3; stats.agi = 2; stats.luk = 3; }
                            // Weapon bonuses are now applied only when the item is equipped.
                            // Do not modify base stats here. Starter items will be added to
                            // the newChar.startingEquipment and Town will auto-equip on first login.
                            // Save character to userObj (assign unique id)
                            if (!userObj.characters) userObj.characters = [];
                            // Map selected starting weapon to an item id defined in ITEM_DEFS
                            let starterItemId = null;
                            if (weapon === 'Sword') starterItemId = 'starter_sword';
                            if (weapon === 'Staff') starterItemId = 'starter_staff';
                            if (weapon === 'Dagger') starterItemId = 'starter_dagger';
                            if (weapon === 'Dice in a Bag' || weapon === 'Dice') starterItemId = 'starter_dice';
                            const newChar = { id: uuidv4(), name, race, weapon, stats, level: 1 };
                            // attach starting equipment entry so the play scene can add the item to inventory/equip
                            if (starterItemId) newChar.startingEquipment = [ { id: starterItemId, qty: 1 } ];
                            userObj.characters[idx] = newChar;
                            localStorage.setItem('cif_user_' + username, JSON.stringify(userObj));
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
            // Optionally clear loggedIn flag
            for (let key in localStorage) {
                if (key.startsWith('cif_user_')) {
                    let obj = JSON.parse(localStorage.getItem(key));
                    if (obj && obj.loggedIn) {
                        obj.loggedIn = false;
                        localStorage.setItem(key, JSON.stringify(obj));
                    }
                }
            }
            this.scene.start('Login');
            if (container.parentNode) container.remove();
        };

        // Remove overlays and container on scene shutdown
        this.events.once('shutdown', () => {
            if (emberCanvas.parentNode) emberCanvas.remove();
            if (shadowCanvas.parentNode) shadowCanvas.remove();
            if (vignetteCanvas.parentNode) vignetteCanvas.remove();
            if (fogCanvas.parentNode) fogCanvas.remove();
            if (container.parentNode) container.remove();
            if (gameContainer) gameContainer.style.display = '';
        });
    }
}
