// Phaser is loaded globally from CDN

import { createAtmosphericOverlays } from './shared/overlays.js';
import { loadUser, saveUser, iterUsers } from './shared/storage.js';
import { applyDefaultBackground, captureBodyStyle, restoreBodyStyle } from './shared/theme.js';
import { applyCombatMixin } from './shared/combat.js';

export class Login extends Phaser.Scene {
    constructor() {
        super('Login');
    }

    create() {
    // On the Login screen the Phaser canvas is hidden; force DOM-based overlays for fog.
    this._atmosphere = createAtmosphericOverlays(this, { idPrefix: 'login', zIndexBase: 50, useParticleFog: false });

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            this._previousGameDisplay = gameContainer.style.display;
            gameContainer.style.display = 'none';
        }

        this._previousBodyStyle = captureBodyStyle();
        applyDefaultBackground();

        const container = document.createElement('div');
        container.id = 'login-container';
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

        container.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Metal+Mania&family=Share+Tech+Mono&display=swap');
                /* Previously used a harsh flicker; tone it down to a barely-noticeable pulse
                   so the UI entrance remains lively but not irritating. */
                @keyframes brutalFlicker {
                    0% { opacity: 1; }
                    50% { opacity: 0.995; }
                    100% { opacity: 1; }
                }
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(48px) skewY(-1deg); }
                    to { opacity: 1; transform: translateY(0) skewY(0); }
                }
                /* Container box: harsh, blocky, textured */
                #login-box {
                    width: 420px;
                    max-width: calc(100% - 48px);
                    background: linear-gradient(180deg, rgba(12,12,14,0.98) 0%, rgba(18,18,20,0.96) 100%);
                    border: 4px solid #111;
                    border-left: 10px solid rgba(80,10,10,0.95);
                    border-right: 2px solid #222;
                    padding: 36px 28px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    font-family: 'Share Tech Mono', monospace;
                          /* Keep the slide-in entrance but remove the aggressive stepped flicker.
                              If a subtle pulse is desired, the toned-down brutalFlicker keyframes
                              above can be applied here with a long duration. For now, leave only
                              the entrance animation to avoid user irritation. */
                          animation: slideInUp 0.7s cubic-bezier(.2,.9,.2,1) forwards;
                    position: relative;
                    align-items: stretch;
                    text-align: left;
                    box-shadow: 0 30px 80px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.02);
                    border-radius: 6px;
                    overflow: hidden;
                }
                /* Grime / scratch overlay */
                #login-box::before {
                    content: '';
                    pointer-events: none;
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(transparent 0%, rgba(0,0,0,0.35) 100%),
                        repeating-linear-gradient(transparent, transparent 6px, rgba(255,255,255,0.02) 7px),
                        radial-gradient(circle at 10% 10%, rgba(120,0,0,0.06), transparent 12%),
                        radial-gradient(circle at 90% 90%, rgba(0,80,120,0.02), transparent 18%);
                    mix-blend-mode: multiply;
                    opacity: 0.85;
                }
                /* Subtle noisy vignette */
                #login-box::after {
                    content: '';
                    pointer-events: none;
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at center, rgba(255,255,255,0) 30%, rgba(0,0,0,0.55) 100%);
                    mix-blend-mode: multiply;
                    opacity: 0.6;
                }
                /* Heading - creepy, stylized */
                #login-box h1 {
                    font-family: 'Metal Mania', cursive;
                    font-size: 2.6rem;
                    color: #e6b7a1;
                    margin: 0 0 6px 0;
                    letter-spacing: 1px;
                    text-shadow: 0 2px 0 rgba(0,0,0,0.85), 0 0 8px rgba(160,40,40,0.07);
                    align-self: center;
                    transform: translateY(-4px);
                }
                #login-box .subtitle {
                    font-size: 0.75rem;
                    color: #9a9a9a;
                    margin-bottom: 6px;
                    align-self: center;
                }
                label.field {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    color: #dcdcdc;
                    font-size: 0.9rem;
                }
                input[type="text"], input[type="password"] {
                    width: 100%;
                    padding: 12px 10px;
                    background: linear-gradient(180deg, rgba(8,8,10,0.9), rgba(16,16,18,0.9));
                    color: #efecea;
                    border: 2px solid #222;
                    outline: none;
                    box-shadow: inset 0 4px 12px rgba(0,0,0,0.7);
                    font-family: inherit;
                    border-radius: 2px;
                }
                input[type="text"]:focus, input[type="password"]:focus {
                    border-color: rgba(130,20,20,0.95);
                    box-shadow: 0 0 10px rgba(150,30,30,0.12), inset 0 3px 8px rgba(0,0,0,0.6);
                }
                .actions {
                    display:flex;
                    gap:12px;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 6px;
                }
                button.cta {
                    background: #0b0b0b;
                    color: #f7eae6;
                    border: 3px solid rgba(90,10,10,0.95);
                    padding: 10px 16px;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    cursor: pointer;
                    box-shadow: 0 12px 26px rgba(0,0,0,0.7);
                    transition: transform 0.08s ease, box-shadow 0.08s ease;
                    border-radius: 2px;
                    font-family: inherit;
                }
                button.cta:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(0,0,0,0.85); }
                button.ghost {
                    background: transparent;
                    color: #bdbdbd;
                    border: 2px dashed #333;
                    padding: 8px 12px;
                    border-radius: 2px;
                }
                #login-error {
                    color: #ff6b6b;
                    font-weight: 700;
                    min-height: 22px;
                    text-align: left;
                }
                /* Small footer hint */
                .small-note { font-size: 0.7rem; color: #8f8f8f; text-align: center; margin-top: 4px; }
            </style>
            <div id="login-box">
                <h1>Veil Keeper</h1>
                <div class="subtitle">Enter the void</div>
                <label class="field">Username
                    <input id="login-username" type="text" autocomplete="username">
                </label>
                <label class="field">Password
                    <input id="login-password" type="password" autocomplete="current-password">
                </label>
                <div class="actions">
                    <div style="flex:1; display:flex; gap:8px;">
                        <button id="login-btn" class="cta">Log In</button>
                        <button id="signup-btn" class="ghost">Sign Up</button>
                    </div>
                </div>
                <div id="login-error"></div>
                <div class="small-note">This interface is hostile. Proceed with intent.</div>
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

        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const errorDiv = document.getElementById('login-error');

        const lastSession = this._findLastLoggedInUser();
        if (lastSession && usernameInput) usernameInput.value = lastSession.username;

        const attemptLogin = () => {
            const username = (usernameInput?.value || '').trim();
            const password = passwordInput?.value || '';
            if (!username || !password) {
                errorDiv.textContent = 'Please enter both username and password.';
                return;
            }
            const userObj = loadUser(username, null);
            if (!userObj) {
                errorDiv.textContent = 'User does not exist.';
                return;
            }
            if (userObj.password !== password) {
                errorDiv.textContent = 'Incorrect password.';
                return;
            }
            userObj.loggedIn = true;
            if (!userObj.username) userObj.username = username;
            saveUser(username, userObj);
            errorDiv.textContent = '';
            this.scene.start('CharacterSelect');
            this._cleanupDom();
        };

        const attemptSignup = () => {
            const username = (usernameInput?.value || '').trim();
            const password = passwordInput?.value || '';
            if (!username || !password) {
                errorDiv.textContent = 'Please enter both username and password.';
                return;
            }
            if (loadUser(username, null)) {
                errorDiv.textContent = 'User already exists.';
                return;
            }
            const newUser = { username, password, loggedIn: true, characters: [] };
            saveUser(username, newUser);
            errorDiv.textContent = '';
            this.scene.start('CharacterSelect');
            this._cleanupDom();
        };

        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        if (loginBtn) loginBtn.onclick = attemptLogin;
        if (signupBtn) signupBtn.onclick = attemptSignup;
        if (passwordInput) {
            passwordInput.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') attemptLogin();
            });
        }

        this.events.once('shutdown', () => {
            // Do not stop shared background music here (shared manager controls lifecycle).
            this._cleanupDom();
        });
    }

    _findLastLoggedInUser() {
        let found = null;
        iterUsers((key, user) => {
            if (found || !user) return;
            if (user.loggedIn) {
                found = user;
            }
        });
        if (found) return found;
        iterUsers((key, user) => {
            if (!found && user) found = user;
        });
        return found;
    }

    _cleanupDom() {
        if (this._atmosphere && this._atmosphere.destroy) {
            this._atmosphere.destroy();
            this._atmosphere = null;
        }
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
            this._container = null;
        }
        if (this._gameContainer) {
            this._gameContainer.style.display = this._previousGameDisplay || '';
            this._gameContainer = null;
        }
        if (this._previousBodyStyle) {
            restoreBodyStyle(this._previousBodyStyle);
            this._previousBodyStyle = null;
        }
    }
}

applyCombatMixin(Login.prototype);
