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

export default {
    DEFAULT_BACKGROUND_STYLE,
    captureBodyStyle,
    applyDefaultBackground,
    restoreBodyStyle,
};
