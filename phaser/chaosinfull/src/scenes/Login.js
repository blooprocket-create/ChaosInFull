// Phaser is loaded globally from CDN

export class Login extends Phaser.Scene {
    constructor() {
        super('Login');
    }

    create() {
        // Overlay creation order: fog, embers, shadow, vignette
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
    const fogCtx = fogCanvas.getContext('2d', { willReadFrequently: true });
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
        const emberCtx = emberCanvas.getContext('2d', { willReadFrequently: true });
        const embers = [];
            for (let i = 0; i < 600; i++) {
            embers.push({
                x: Math.random() * emberCanvas.width,
                y: Math.random() * emberCanvas.height,
                    r: 0.5 + Math.random() * 1, // 4x smaller
                alpha: 0.5 + Math.random() * 0.3,
                dx: (Math.random() - 0.5) * 1.2, // faster horizontal
                dy: -0.6 - Math.random() * 1.2, // faster upward
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
    const sctx = shadowCanvas.getContext('2d', { willReadFrequently: true });
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
    const vctx = vignetteCanvas.getContext('2d', { willReadFrequently: true });
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
                emberCtx.beginPath();
                emberCtx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                emberCtx.fillStyle = e.color;
                emberCtx.globalAlpha = e.alpha;
                emberCtx.shadowColor = 'orange';
                emberCtx.shadowBlur = 20;
                emberCtx.fill();
                emberCtx.globalAlpha = 1;
                e.x += e.dx;
                e.y += e.dy;
                if (e.y < -20 || e.x < -20 || e.x > emberCanvas.width + 20) {
                    e.x = Math.random() * emberCanvas.width;
                    e.y = emberCanvas.height + 20;
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

        // Hide Phaser canvas while login is active
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) gameContainer.style.display = 'none';
        // Create HTML elements for login
        const container = document.createElement('div');
        container.id = 'login-container';

        // Add horror anime background
    // User-provided horror anime background
    document.body.style.background = "#1a1026 url('https://getwallpapers.com/wallpaper/full/4/2/d/39736.jpg') no-repeat center center fixed";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.overflow = "hidden";

        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
    container.style.background = "transparent";
    container.style.backdropFilter = "none";
        container.style.zIndex = '100';

        container.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&family=Share+Tech+Mono&display=swap');
                @keyframes boxShadowPulse {
                    0% { box-shadow: 0 0 32px 8px #111; background: rgba(20, 20, 30, 0.92); }
                    50% { box-shadow: 0 0 48px 16px #6c3483; background: rgba(30, 20, 40, 0.96); }
                    100% { box-shadow: 0 0 32px 8px #111; background: rgba(20, 20, 30, 0.92); }
                }
                #login-box {
                    background: rgba(20, 20, 30, 0.75);
                    border-radius: 28px;
                    box-shadow: 0 0 32px 8px #111;
                    border: 2px solid #444;
                    padding: 48px 36px 32px 36px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    font-family: 'Share Tech Mono', 'Consolas', monospace;
                    animation: fadeInBox 1s cubic-bezier(.77,0,.175,1) forwards, boxShadowPulse 6s ease-in-out infinite;
                    position: relative;
                    overflow: hidden;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
        // Add drifting embers/dust particles
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
    emberCanvas.style.zIndex = '70';
        document.body.appendChild(emberCanvas);
            // FOG OVERLAY SETUP
            const fogCtx = fogCanvas.getContext('2d');
            // ...existing code...
            // EMBER OVERLAY SETUP
            const emberCanvas = document.createElement('canvas');
            emberCanvas.width = window.innerWidth;
            emberCanvas.height = window.innerHeight;
            emberCanvas.style.position = 'fixed';
            emberCanvas.style.top = '0';
            emberCanvas.style.left = '0';
            emberCanvas.style.pointerEvents = 'none';
            emberCanvas.style.zIndex = '101'; // Above fog
            emberCanvas.style.opacity = '1'; // Fully visible for testing
            emberCanvas.style.background = 'magenta'; // Debug: solid color
            document.body.appendChild(emberCanvas);
            const emberCtx = emberCanvas.getContext('2d');
            // Debug: check if canvas is in DOM
            if (document.body.contains(emberCanvas)) {
                console.log('Ember canvas is in the DOM.');
            create() {
                // ...existing code...
                // Add fog canvas overlay
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
                // Particle fog logic
                const ctx = fogCanvas.getContext('2d');
                const fogParticles = [];
                const fogColors = ['rgba(255,255,255,0.18)', 'rgba(200,200,255,0.15)', 'rgba(180,180,200,0.13)'];
                // ...existing code...

                // EMBER OVERLAY SETUP (directly after fog)
                const emberCanvas = document.createElement('canvas');
                emberCanvas.width = window.innerWidth;
                emberCanvas.height = window.innerHeight;
                emberCanvas.style.position = 'fixed';
                emberCanvas.style.top = '0';
                emberCanvas.style.left = '0';
                emberCanvas.style.pointerEvents = 'none';
                emberCanvas.style.zIndex = '51'; // Above fog
                emberCanvas.style.opacity = '1'; // Fully visible for testing
                document.body.appendChild(emberCanvas);
                const emberCtx = emberCanvas.getContext('2d');
                // Draw a static bright circle in the center for debug
                emberCtx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);
                emberCtx.beginPath();
                emberCtx.arc(emberCanvas.width/2, emberCanvas.height/2, 60, 0, Math.PI*2);
                emberCtx.fillStyle = 'rgba(255,0,0,1)';
                emberCtx.shadowColor = 'yellow';
                emberCtx.shadowBlur = 40;
                emberCtx.fill();
                console.log('Static debug circle drawn on ember canvas in create().');
                    dx: (Math.random() - 0.5) * 0.5,
                    dy: -0.2 - Math.random() * 0.5,
                    color: 'rgba(255,80,0,1)'
                });
            }
            function drawEmbers() {
                emberCtx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);
                embers.forEach(e => {
                        // Fade out as they rise (completely faded by 65-80% to top)
                        let fadeLimit = 0.65 + Math.random() * 0.15; // 65-80%
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
                embers.forEach(e => {
                    e.x += e.dx;
                    e.y += e.dy;
                    if (e.y < -20 || e.x < -20 || e.x > emberCanvas.width + 20) {
                        e.x = Math.random() * emberCanvas.width;
                        e.y = emberCanvas.height + 20;
                    }
                });
                drawEmbers();
            }
            setInterval(updateEmbers, 40); // Fast for testing
        const ectx = emberCanvas.getContext('2d');
        const embers = [];
        for (let i = 0; i < 120; i++) {
            const r = 16 + Math.random() * 18;
            const vx = -0.02 + Math.random() * 0.04;
            const vy = -0.01 + Math.random() * 0.02;
            const alpha = 0.85 + Math.random() * 0.15;
            const color = 'rgba(255,80,0,1)';
            embers.push({
                x: Math.random() * emberCanvas.width,
                y: Math.random() * emberCanvas.height,
                r,
                vx,
                vy,
                alpha,
                color
            });
        }
        function drawEmbers() {
            ectx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);
            for (const e of embers) {
                ectx.save();
                ectx.beginPath();
                ectx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                ectx.fillStyle = e.color;
                ectx.globalAlpha = e.alpha;
                ectx.shadowColor = '#ff8000';
                ectx.shadowBlur = 64;
                ectx.fill();
                ectx.globalAlpha = 1;
                ectx.shadowBlur = 0;
                ectx.restore();
                e.x += e.vx;
                e.y += e.vy;
                if (e.x < -e.r) e.x = emberCanvas.width + e.r;
                if (e.y < -e.r) e.y = emberCanvas.height + e.r;
            }
            requestAnimationFrame(drawEmbers);
        }
        drawEmbers();
        window.addEventListener('resize', () => {
            emberCanvas.width = window.innerWidth;
            emberCanvas.height = window.innerHeight;
        });

        // Add faint moving shadow/silhouette
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
        shadowCanvas.style.zIndex = '52';
        document.body.appendChild(shadowCanvas);

        const sctx = shadowCanvas.getContext('2d');
        let shadowX = -300;
        let shadowY = shadowCanvas.height * 0.7;
        function drawShadow() {
            sctx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
            sctx.save();
            sctx.globalAlpha = 0.22 + 0.13 * Math.abs(Math.sin(Date.now()/4000));
            sctx.filter = 'blur(12px)';
            sctx.beginPath();
            // Silhouette shape (simple humanoid shadow)
            sctx.ellipse(shadowX, shadowY, 120, 260, 0, 0, Math.PI * 2);
            sctx.fillStyle = '#0a0106';
            sctx.fill();
            sctx.restore();
            shadowX += 0.10;
            if (shadowX > shadowCanvas.width + 300) shadowX = -300;
            requestAnimationFrame(drawShadow);
        }
        drawShadow();
        window.addEventListener('resize', () => {
            shadowCanvas.width = window.innerWidth;
            shadowCanvas.height = window.innerHeight;
            shadowY = shadowCanvas.height * 0.7;
        });
                @keyframes fadeInBox {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                #login-box h1 {
                    color: #fff;
                    font-size: 2.4em;
                    font-family: 'UnifrakturCook', cursive;
                    text-shadow: 0 0 12px #fff, 0 0 4px #ff3300;
                    margin-bottom: 12px;
                    letter-spacing: 2px;
                    animation: fadeInTitle 1.2s cubic-bezier(.77,0,.175,1) forwards;
                    text-align: center;
                }
                @keyframes fadeInTitle {
                    from { opacity: 0; transform: translateY(-40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #login-box label {
                    color: #eee;
                    font-size: 1.1em;
                    text-shadow: 0 0 2px #fff, 0 0 2px #ff3300;
                    font-family: 'Share Tech Mono', monospace;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 8px;
                }
                #login-box input {
                    background: rgba(40,40,50,0.85);
                    color: #fff;
                    border: 1.5px solid #444;
                    border-radius: 8px;
                    padding: 10px;
                    font-size: 1em;
                    box-shadow: 0 0 8px #222 inset;
                    transition: box-shadow 0.2s, border 0.2s;
                    outline: none;
                    margin: 0 auto 8px auto;
                    text-align: center;
                }
                #login-box input:focus {
                    box-shadow: 0 0 16px #ff3300 inset;
                    border: 2px solid #ff3300;
                }
                #login-box input:focus {
                    box-shadow: 0 0 16px #ff3300 inset;
                    border: 2px solid #fff;
                }
                #login-box button {
                    background: linear-gradient(90deg, #222 40%, #444 100%);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    padding: 12px 32px;
                    font-size: 1.1em;
                    font-family: inherit;
                    box-shadow: 0 0 4px #ff3300, 0 0 2px #fff inset;
                    cursor: pointer;
                    transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
                    animation: fadeInBtn 1.4s cubic-bezier(.77,0,.175,1) forwards;
                    position: relative;
                }
                #login-box button:hover {
                    background: linear-gradient(90deg, #ff3300 60%, #6c3483 100%);
                    box-shadow: 0 0 12px #ff3300, 0 0 4px #fff inset;
                    transform: scale(1.05);
                }
                @keyframes fadeInBtn {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #login-error {
                    color: #ff3300;
                    font-weight: bold;
                    text-shadow: 0 0 2px #fff;
                    margin-top: 8px;
                    text-align: center;
                    min-height: 24px;
                    animation: fadeInError 1.2s cubic-bezier(.77,0,.175,1) forwards;
                }
                @keyframes fadeInError {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            </style>
            <div id="login-box">
                <h1>Chaos In Full</h1>
                <label>Username:<br><input id="login-username" type="text" style="width:240px"></label>
                <label>Password:<br><input id="login-password" type="password" style="width:240px"></label>
                <div style="display:flex; gap:28px; justify-content:center; align-items:center; margin-top:12px;">
                    <button id="login-btn">Log In</button>
                    <button id="signup-btn">Sign Up</button>
                </div>
                <div id="login-error"></div>
            </div>
        `;
        document.body.appendChild(container);

        // Remove ember and shadow canvases on scene shutdown
        this.events.once('shutdown', () => {
            if (emberCanvas.parentNode) emberCanvas.remove();
            if (shadowCanvas.parentNode) shadowCanvas.remove();
        });

        // Remove vignette canvas on scene shutdown
        this.events.once('shutdown', () => {
            if (vignetteCanvas.parentNode) vignetteCanvas.remove();
        });

        // Remove fog canvas on scene shutdown
        this.events.once('shutdown', () => {
            if (fogCanvas.parentNode) fogCanvas.remove();
        });

        // Button event listeners (stub)
        document.getElementById('login-btn').onclick = () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            if (!username || !password) {
                errorDiv.textContent = 'Please enter both username and password.';
                return;
            }
            const userData = localStorage.getItem('cif_user_' + username);
            if (!userData) {
                errorDiv.textContent = 'User does not exist.';
                return;
            }
            try {
                const userObj = JSON.parse(userData);
                if (userObj.password === password) {
                    errorDiv.textContent = '';
                    // mark as logged in
                    userObj.loggedIn = true;
                    localStorage.setItem('cif_user_' + username, JSON.stringify(userObj));
                    this.scene.start('CharacterSelect');
                    container.remove();
                } else {
                    errorDiv.textContent = 'Incorrect password.';
                }
            } catch (e) {
                errorDiv.textContent = 'Corrupted user data.';
            }
        };
        document.getElementById('signup-btn').onclick = () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            if (!username || !password) {
                errorDiv.textContent = 'Please enter both username and password.';
                return;
            }
            if (localStorage.getItem('cif_user_' + username)) {
                errorDiv.textContent = 'User already exists.';
                return;
            }
            // Save user to localStorage and mark logged in
            const newUser = { username, password, loggedIn: true, characters: [] };
            localStorage.setItem('cif_user_' + username, JSON.stringify(newUser));
            errorDiv.textContent = '';
            this.scene.start('CharacterSelect');
            container.remove();
        };

        // Remove container on scene shutdown
        this.events.once('shutdown', () => {
            if (container.parentNode) container.remove();
            if (gameContainer) gameContainer.style.display = '';
        });
    }
}
