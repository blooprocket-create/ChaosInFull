// Shared helpers for applying and restoring global UI theming such as body background.

export const DEFAULT_BACKGROUND_STYLE = "#1a1026 url('https://getwallpapers.com/wallpaper/full/4/2/d/39736.jpg') no-repeat center center fixed";

export function captureBodyStyle() {
    if (typeof document === 'undefined') return null;
    const { style } = document.body;
    return {
        background: style.background,
        backgroundSize: style.backgroundSize,
        backgroundAttachment: style.backgroundAttachment,
        overflow: style.overflow,
    };
}

export function applyDefaultBackground() {
    if (typeof document === 'undefined') return;
    const { style } = document.body;
    style.background = DEFAULT_BACKGROUND_STYLE;
    style.backgroundSize = 'cover';
    style.backgroundAttachment = 'fixed';
    style.overflow = 'hidden';
}

export function restoreBodyStyle(previous) {
    if (typeof document === 'undefined' || !previous) return;
    const { style } = document.body;
    style.background = previous.background || '';
    style.backgroundSize = previous.backgroundSize || '';
    style.backgroundAttachment = previous.backgroundAttachment || '';
    style.overflow = previous.overflow || '';
}

/**
 * Ensures the Phaser game container and canvas are visible.
 * Call this at the start of any gameplay scene to undo visibility hiding from Login/CharacterSelect.
 * @param {Phaser.Scene} scene - The scene instance (used to access game.scale for refresh)
 */
export function ensureGameCanvasVisible(scene) {
    try {
        const gc = document.getElementById('game-container');
        if (gc) {
            // Clear any hiding styles
            gc.style.display = gc.style.display === 'none' ? '' : gc.style.display;
            gc.style.visibility = gc.style.visibility === 'hidden' ? '' : gc.style.visibility;
            gc.style.opacity = gc.style.opacity === '0' ? '' : gc.style.opacity;
            gc.removeAttribute('data-phaser-hidden');
            gc.classList.remove('hidden', 'invisible', 'opacity-0');
        }
        // Also ensure canvas itself is visible
        if (scene && scene.game && scene.game.canvas) {
            const canvas = scene.game.canvas;
            canvas.style.display = canvas.style.display === 'none' ? '' : canvas.style.display;
            canvas.style.visibility = canvas.style.visibility === 'hidden' ? '' : canvas.style.visibility;
            canvas.style.opacity = canvas.style.opacity === '0' ? '' : canvas.style.opacity;
            canvas.classList.remove('hidden', 'invisible', 'opacity-0');
        }
        // Force scale refresh after visibility change
        if (scene && scene.scale) {
            setTimeout(() => { try { scene.scale.refresh(); } catch (e) {} }, 50);
        }
    } catch (e) {
        console.warn('[ensureGameCanvasVisible] Failed to unhide canvas', e);
    }
}

export default {
    DEFAULT_BACKGROUND_STYLE,
    captureBodyStyle,
    applyDefaultBackground,
    restoreBodyStyle,
    ensureGameCanvasVisible,
};
