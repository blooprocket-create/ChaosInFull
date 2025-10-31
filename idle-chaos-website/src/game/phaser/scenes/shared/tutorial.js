// Shared tutorial overlay helper
// Creates a simple DOM overlay with step content and Next/Back/Finish controls.

export function showTutorialOverlay(scene, steps, onFinish) {
    if (typeof document === 'undefined') return;
    hideTutorialOverlay();

    const container = document.createElement('div');
    container.id = 'tutorial-container';
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '60px';
    container.style.transform = 'translateX(-50%)';
    container.style.minWidth = '420px';
    container.style.maxWidth = '720px';
    container.style.padding = '12px 16px';
    container.style.background = 'rgba(0,0,0,0.8)';
    container.style.color = '#fff';
    container.style.border = '1px solid rgba(255,255,255,0.08)';
    container.style.borderRadius = '8px';
    container.style.zIndex = '10000';
    container.style.fontFamily = 'sans-serif';

    let index = 0;

    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = '700';
    titleEl.style.marginBottom = '6px';
    container.appendChild(titleEl);

    const textEl = document.createElement('div');
    textEl.style.marginBottom = '12px';
    container.appendChild(textEl);

    const hintEl = document.createElement('div');
    hintEl.style.fontSize = '12px';
    hintEl.style.opacity = '0.9';
    hintEl.style.marginBottom = '12px';
    container.appendChild(hintEl);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';

    const backBtn = document.createElement('button');
    backBtn.innerText = 'Back';
    backBtn.style.padding = '6px 10px';

    const nextBtn = document.createElement('button');
    nextBtn.innerText = 'Next';
    nextBtn.style.padding = '6px 12px';

    btnRow.appendChild(backBtn);
    btnRow.appendChild(nextBtn);
    container.appendChild(btnRow);

    function render() {
        const s = steps[index];
        titleEl.innerText = s ? s.title : '';
        textEl.innerText = s ? s.text : '';
        hintEl.innerText = s && s.hint ? `Hint: ${s.hint}` : '';
        backBtn.disabled = index <= 0;
        nextBtn.innerText = index >= steps.length - 1 ? 'Finish' : 'Next';
    }

    backBtn.addEventListener('click', () => {
        if (index > 0) { index--; render(); }
    });

    nextBtn.addEventListener('click', () => {
        if (index < steps.length - 1) { index++; render(); }
        else {
            hideTutorialOverlay();
            if (typeof onFinish === 'function') onFinish('finish');
        }
    });

    // allow keyboard navigation: Esc closes, ArrowLeft/ArrowRight navigate, Space also next
    function keyHandler(e) {
        if (e.key === 'Escape') { hideTutorialOverlay(); if (typeof onFinish === 'function') onFinish('finish'); }
        if (e.key === 'ArrowLeft') { if (index > 0) { index--; render(); } }
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Spacebar') { if (index < steps.length - 1) { index++; render(); } else { hideTutorialOverlay(); if (typeof onFinish === 'function') onFinish('finish'); } }
    }

    document.addEventListener('keydown', keyHandler);

    container.dataset._keyHandler = 'tutorial';
    container._keyHandler = keyHandler;

    document.body.appendChild(container);
    render();

    // expose a way to remove overlay
    return container;
}

export function hideTutorialOverlay() {
    if (typeof document === 'undefined') return;
    const c = document.getElementById('tutorial-container');
    if (c) {
        const handler = c._keyHandler;
        if (handler) document.removeEventListener('keydown', handler);
        try { c.remove(); } catch (e) { /* ignore */ }
    }
}

export default { showTutorialOverlay, hideTutorialOverlay };
