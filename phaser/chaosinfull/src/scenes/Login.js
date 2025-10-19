// Phaser is loaded globally from CDN

import { createAtmosphericOverlays } from './shared/overlays.js';
import { loadUser, saveUser, iterUsers } from './shared/storage.js';

const BACKGROUND_URL = "https://getwallpapers.com/wallpaper/full/4/2/d/39736.jpg";

export class Login extends Phaser.Scene {
    constructor() {
        super('Login');
    }

    create() {
        this._atmosphere = createAtmosphericOverlays(this, { idPrefix: 'login', zIndexBase: 50 });

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            this._previousGameDisplay = gameContainer.style.display;
            gameContainer.style.display = 'none';
        }

        this._previousBodyStyle = {
            background: document.body.style.background,
            backgroundSize: document.body.style.backgroundSize,
            backgroundAttachment: document.body.style.backgroundAttachment,
            overflow: document.body.style.overflow,
        };
        document.body.style.background = `#1a1026 url('${BACKGROUND_URL}') no-repeat center center fixed`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.overflow = 'hidden';

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
                @import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&family=Share+Tech+Mono&display=swap');
                @keyframes boxShadowPulse {
                    0% { box-shadow: 0 0 32px 8px #111; background: rgba(20, 20, 30, 0.92); }
                    50% { box-shadow: 0 0 48px 16px #6c3483; background: rgba(30, 20, 40, 0.96); }
                    100% { box-shadow: 0 0 32px 8px #111; background: rgba(20, 20, 30, 0.92); }
                }
                @keyframes fadeInBox {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
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
                    animation: fadeInBox 0.8s cubic-bezier(.77,0,.175,1) forwards, boxShadowPulse 6s ease-in-out infinite;
                    position: relative;
                    overflow: hidden;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                #login-box::before {
                    content: '';
                    position: absolute;
                    top: -160px;
                    left: -160px;
                    width: 320px;
                    height: 320px;
                    background: radial-gradient(circle, rgba(255,60,0,0.35) 0%, rgba(20,20,30,0) 60%);
                    transform: rotate(45deg);
                }
                #login-box::after {
                    content: '';
                    position: absolute;
                    bottom: -200px;
                    right: -200px;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(110,40,150,0.35) 0%, rgba(20,20,30,0) 65%);
                }
                #login-box h1 {
                    font-family: 'UnifrakturCook', cursive;
                    font-size: 3rem;
                    color: #ff4300;
                    text-shadow: 0 0 18px rgba(255, 80, 0, 0.75), 0 0 6px rgba(255,255,255,0.6);
                    letter-spacing: 3px;
                    margin-bottom: 12px;
                }
                #login-box label {
                    font-size: 0.95rem;
                    color: #ddd;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    align-items: flex-start;
                }
                #login-box input {
                    width: 240px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid #444;
                    background: rgba(10,10,16,0.85);
                    color: #fff;
                    font-family: inherit;
                    box-shadow: inset 0 0 12px rgba(255, 80, 0, 0.15);
                }
                #login-box button {
                    padding: 10px 24px;
                    border-radius: 10px;
                    border: none;
                    font-family: inherit;
                    font-size: 0.95rem;
                    cursor: pointer;
                    background: linear-gradient(90deg, #ff3300 0%, #6c3483 100%);
                    color: #fff;
                    box-shadow: 0 0 12px rgba(255,80,0,0.6);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                #login-box button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 16px rgba(255, 80, 0, 0.85);
                }
                #login-error {
                    color: #ff3300;
                    font-weight: bold;
                    text-shadow: 0 0 2px #fff;
                    min-height: 24px;
                }
            </style>
            <div id="login-box">
                <h1>Chaos In Full</h1>
                <label>Username:<br><input id="login-username" type="text"></label>
                <label>Password:<br><input id="login-password" type="password"></label>
                <div style="display:flex; gap:28px; justify-content:center; align-items:center; margin-top:12px;">
                    <button id="login-btn">Log In</button>
                    <button id="signup-btn">Sign Up</button>
                </div>
                <div id="login-error"></div>
            </div>
        `;

        document.body.appendChild(container);
        this._container = container;
        this._gameContainer = gameContainer;

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
            document.body.style.background = this._previousBodyStyle.background;
            document.body.style.backgroundSize = this._previousBodyStyle.backgroundSize;
            document.body.style.backgroundAttachment = this._previousBodyStyle.backgroundAttachment;
            document.body.style.overflow = this._previousBodyStyle.overflow;
            this._previousBodyStyle = null;
        }
    }
}
