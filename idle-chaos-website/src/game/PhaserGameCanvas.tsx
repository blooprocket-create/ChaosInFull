"use client";
import { useEffect, useRef } from "react";
import { createPhaserGame, releasePhaserGame, type CharacterHUD } from "./createPhaserGame";
import type * as PhaserTypes from "phaser";

// Augmented window type (declared globally in createPhaserGame, duplicated locally for type narrowing convenience)
// (Removed unused GameWindow interface; we rely on global augmentation.)

export default function PhaserGameCanvas({ 
  character, 
  initialScene 
}: { 
  character?: CharacterHUD; 
  initialScene?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserTypes.Game | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Initialize the Phaser game (singleton-safe)
    const initGame = async () => {
      try {
        // Creation is idempotent and will reuse the singleton or await in-flight creation
        // Defensive cleanup: only remove HUD/tooltips (NOT login/character select roots on mount to avoid blank screen)
        try {
          if (typeof document !== 'undefined') {
            const transientIds = [
              'global-skill-bar',
              'shared-item-tooltip',
              'shared-skill-tooltip',
              'shared-stat-tooltip',
              'inventory-modal',
              'equipment-modal',
              'stats-modal',
              'workbench-modal',
              'furnace-modal',
              'storage-modal',
              'settings-modal',
            ];
            for (const id of transientIds) {
              const el = document.getElementById(id);
              if (el && el.parentNode) el.parentNode.removeChild(el);
            }
            document.querySelectorAll('[id$="-hud"]').forEach((node) => {
              try { if (node.parentNode) node.parentNode.removeChild(node); } catch {}
            });
            document.querySelectorAll('.modal-overlay').forEach((n) => {
              try { if (n.parentNode) n.parentNode.removeChild(n); } catch {}
            });
          }
        } catch {}

        const game = await createPhaserGame({
          parent: ref.current!,
          character,
          initialScene,
        });
        gameRef.current = game;
        // Fallback: if the internal game size is 0x0 (parent not yet laid out under RESIZE), force a sane initial size.
        try {
          const gScale = (game as unknown as { scale?: PhaserTypes.Scale.ScaleManager }).scale;
          const gw = (gScale && (gScale.gameSize?.width || gScale.width)) || (game as any).config?.width || 0;
          const gh = (gScale && (gScale.gameSize?.height || gScale.height)) || (game as any).config?.height || 0;
          if ((!gw || !gh) && gScale) {
            // Derive width from container or window; height via 16:9 ratio with min floor.
            const containerWidth = ref.current?.getBoundingClientRect().width || window.innerWidth || 1280;
            const targetW = Math.max(640, Math.round(containerWidth));
            const targetH = Math.max(360, Math.round(targetW * 9 / 16));
            try { gScale.resize(targetW, targetH); } catch {}
            try { window.dispatchEvent(new CustomEvent('telemetry:event',{ detail:{ name:'phaser_zero_size_fix', props:{ w:targetW, h:targetH }}})); } catch {}
            // Ensure canvas CSS matches
            try {
              const c = (game as unknown as { canvas?: HTMLCanvasElement }).canvas;
              if (c) {
                c.style.width = '100%';
                c.style.height = '100%';
              }
            } catch {}
          }
        } catch {}
        // Emit telemetry event if available
        try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_game_created' } })); } catch {}
        // Safety: ensure canvas is attached; if missing after creation, surface diagnostic
        setTimeout(() => {
          try {
            if (ref.current && !ref.current.querySelector('canvas')) {
              console.warn('[PhaserGameCanvas] Canvas not found after initialization; re-attaching.');
              if (gameRef.current?.canvas && gameRef.current.canvas.parentElement !== ref.current) {
                ref.current.appendChild(gameRef.current.canvas);
              }
              // Telemetry
              try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_canvas_missing_repair' } })); } catch {}
            }
          } catch {}
        }, 500);
      } catch (error) {
        console.error("Failed to initialize Phaser game:", error);
        try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_game_init_error', props: { message: (error as Error)?.message } } })); } catch {}
      }
    };

    initGame();

    // Dev-only debug overlay to inspect canvas visibility & attachment
  const addDebugOverlay = () => {
      if (process.env.NODE_ENV !== 'development') return;
      if (!ref.current) return;
      if (document.getElementById('phaser-debug-overlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'phaser-debug-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '4px';
      overlay.style.right = '4px';
      overlay.style.zIndex = '9999';
      overlay.style.fontSize = '10px';
      overlay.style.padding = '4px 6px';
      overlay.style.background = 'rgba(0,0,0,0.55)';
      overlay.style.color = '#fff';
      overlay.style.border = '1px solid rgba(255,255,255,0.15)';
      overlay.style.borderRadius = '4px';
      let prevLine = '';
      const update = () => {
  const g = (window as unknown as { GAME?: PhaserTypes.Game }).GAME;
  const canvas = g && (g as unknown as { canvas?: HTMLCanvasElement }).canvas;
        const attached = !!(canvas && canvas.parentElement === ref.current);
        const styleInfo = canvas ? {
          display: canvas.style.display || 'auto',
          visibility: canvas.style.visibility || 'auto',
          opacity: canvas.style.opacity || 'auto'
        } : null;
        const line = `GAME:${!!g} Canvas:${!!canvas} Attached:${attached} ${styleInfo ? `disp:${styleInfo.display} vis:${styleInfo.visibility} op:${styleInfo.opacity}` : 'no-canvas'} size:${canvas ? canvas.width + 'x' + canvas.height : 'n/a'}`;
        overlay.textContent = ` ${line} `;
        if (line !== prevLine) {
          prevLine = line;
          try { console.log('[PhaserDebug]', line); } catch {}
        }
      };
      update();
      ref.current.appendChild(overlay);
      const interval = setInterval(update, 500);
      return () => { clearInterval(interval); try { overlay.remove(); } catch {} };
    };
    const removeOverlay = addDebugOverlay();

    // Handle window resize
    let resizeWarned = false;
    // Find a non-zero width by walking up ancestors; fallback to window width
    const getUsableWidth = (el: HTMLElement | null): number => {
      try {
        let node: HTMLElement | null = el;
        while (node) {
          const w = node.clientWidth || Math.floor(node.getBoundingClientRect?.().width || 0);
          if (w && w > 0) return w;
          node = node.parentElement;
        }
      } catch {}
      if (typeof window !== 'undefined') return Math.floor(window.innerWidth || 0);
      return 0;
    };
    const onResize = () => {
      try {
        if (!gameRef.current || !ref.current) return;
        // Skip if game hasn't fully booted yet
        const g = gameRef.current as PhaserTypes.Game & { isBooted?: boolean };
        if (g.isBooted === false) return;
        // Compute target size; guard against zero/NaN
        // Prefer container width; if zero, walk up the tree or fallback to window width
        const cw = getUsableWidth(ref.current);
        if (!cw || cw <= 0 || Number.isNaN(cw)) {
          if (!resizeWarned) {
            console.warn('[PhaserGameCanvas] Resize skipped due to zero container width');
            resizeWarned = true;
          }
          // Try again on next frame after layout settles
          requestAnimationFrame(onResize);
          return;
        }
        const w = Math.max(2, Math.floor(cw));
        const h = Math.max(360, Math.floor(w * 9 / 16));
        // In RESIZE mode, let Phaser determine final size from parent; just refresh
        try { g.scale.refresh(); } catch {}
        // Ensure the canvas fills the container without double-scaling (CSS side)
        try {
          const c = (g as unknown as { canvas?: HTMLCanvasElement }).canvas;
          if (c) {
            c.style.position = c.style.position || 'absolute';
            c.style.top = '0';
            c.style.left = '0';
            c.style.width = '100%';
            c.style.height = '100%';
          }
        } catch {}
      } catch (e) {
        console.warn('[PhaserGameCanvas] Safe resize failed (likely during WebGL init). Will retry.', e);
        try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_resize_error' } })); } catch {}
        // Retry after a short delay to allow GL to settle
        setTimeout(() => { try { requestAnimationFrame(onResize); } catch {} }, 100);
      }
    };

    window.addEventListener("resize", onResize);
  // Kick a resize after creation to match container size
  requestAnimationFrame(onResize);
  // Also when tab becomes visible (layout may have changed)
  const onVisibility = () => { if (document.visibilityState === 'visible') requestAnimationFrame(onResize); };
  document.addEventListener('visibilitychange', onVisibility);
    // Observe container size changes to react to layout shifts quickly
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => { requestAnimationFrame(onResize); });
      ro.observe(ref.current!);
    } catch {}

    // Prevent default Space bar scrolling
    const el = ref.current;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    };
    el.addEventListener("keydown", onKeydown);
    el.tabIndex = 0;
    el.focus({ preventScroll: true });

    return () => {
  window.removeEventListener("resize", onResize);
  document.removeEventListener('visibilitychange', onVisibility);
  try { ro?.disconnect(); } catch {}
      if (el) {
        el.removeEventListener("keydown", onKeydown);
      }
      // Release a reference to the singleton; destroy when no more holders remain
      try { releasePhaserGame(); } catch {}
      gameRef.current = null;
  if (removeOverlay) removeOverlay();
      // Aggressively clean up any DOM UI created outside the canvas (HUD, modals, tooltips, skill bar)
      try {
        if (typeof document !== 'undefined') {
          const ids = [
            'global-skill-bar',
            'shared-item-tooltip',
            'shared-skill-tooltip',
            'shared-stat-tooltip',
            'inventory-modal',
            'equipment-modal',
            'stats-modal',
            'workbench-modal',
            'furnace-modal',
            'storage-modal',
            'settings-modal',
            // (Keep login/character-select roots for potential remount)
          ];
          for (const id of ids) {
            const node = document.getElementById(id);
            if (node && node.parentNode) node.parentNode.removeChild(node);
          }
          // Remove HUD elements (they have dynamic IDs like 'town-hud', 'cave-hud', etc.)
          document.querySelectorAll('[id$="-hud"]').forEach((node) => {
            try {
              if (node.parentNode) {
                node.parentNode.removeChild(node);
              }
            } catch {}
          });
          document.querySelectorAll('.modal-overlay').forEach((n) => {
            try {
              if (n.parentNode) {
                n.parentNode.removeChild(n);
              }
            } catch {}
          });
        }
      } catch {}
    };
  }, [character, initialScene]);

  // When a character is selected (transitioning out of login / character select), force-unhide the canvas.
  useEffect(() => {
    if (!character) return; // Only act once a character is actually chosen
    let attempts = 0;
    const maxAttempts = 12; // ~1.2s total with 100ms cadence
    const ensureVisible = () => {
      attempts += 1;
      const container = ref.current;
      // Prefer the singleton's canvas to avoid stale DOM lookups
  const game = (window as unknown as { GAME?: PhaserTypes.Game }).GAME;
  const canvas = game ? (game as unknown as { canvas?: HTMLCanvasElement }).canvas : container?.querySelector('canvas');
      if (canvas) {
        let changed = false;
        const hiddenByDisplay = canvas.style.display === 'none';
        const hiddenByVisibility = canvas.style.visibility === 'hidden';
        const hiddenByOpacity = canvas.style.opacity === '0';
        if (hiddenByDisplay) { canvas.style.display = 'block'; changed = true; try { console.log('[PhaserCanvas] display set to block'); } catch {} }
        if (hiddenByVisibility) { canvas.style.visibility = 'visible'; changed = true; try { console.log('[PhaserCanvas] visibility set to visible'); } catch {} }
        if (hiddenByOpacity) { canvas.style.opacity = '1'; changed = true; try { console.log('[PhaserCanvas] opacity set to 1'); } catch {} }
        if (canvas.classList.contains('hidden')) { canvas.classList.remove('hidden'); changed = true; try { console.log('[PhaserCanvas] removed class "hidden"'); } catch {} }
        // Remove any tailwind-style utility that might keep it invisible
        if (canvas.classList.contains('invisible')) { canvas.classList.remove('invisible'); changed = true; try { console.log('[PhaserCanvas] removed class "invisible"'); } catch {} }
        // If not attached, attach
        if (container && canvas.parentElement !== container) { try { container.appendChild(canvas); changed = true; console.log('[PhaserCanvas] re-attached canvas to container'); } catch {} }
        if (changed) {
          try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_canvas_force_shown' } })); } catch {}
        }
        // Also ensure container itself is visible (and clear scene's hidden flag)
        if (container) {
          const cs = getComputedStyle(container);
          if (cs.display === 'none') { container.style.display = 'block'; changed = true; try { console.log('[PhaserCanvas] container display set to block'); } catch {} }
          if (cs.visibility === 'hidden') { container.style.visibility = 'visible'; changed = true; try { console.log('[PhaserCanvas] container visibility set to visible'); } catch {} }
          if (container.style.opacity === '0') { container.style.opacity = '1'; changed = true; try { console.log('[PhaserCanvas] container opacity set to 1'); } catch {} }
          if (container.getAttribute('data-phaser-hidden') === 'true') { container.removeAttribute('data-phaser-hidden'); changed = true; try { console.log('[PhaserCanvas] removed data-phaser-hidden'); } catch {} }
          // Remove any lingering full-screen overlays from login/char-select
          try {
            const csRoot = document.getElementById('character-select-root');
            if (csRoot && csRoot.parentNode) { csRoot.parentNode.removeChild(csRoot); console.log('[PhaserCanvas] removed character-select-root'); }
          } catch {}
        }
        if (!hiddenByDisplay && !hiddenByVisibility && !hiddenByOpacity) {
          // Done; stop early
          clearInterval(intervalId);
        }
      }
      if (attempts >= maxAttempts) clearInterval(intervalId);
    };
    const intervalId = setInterval(ensureVisible, 100);
    // Run once immediately for responsiveness
    ensureVisible();
    return () => clearInterval(intervalId);
  }, [character]);

  // Deep diagnostics + hard style enforcement after character selection to surface a hidden canvas
  useEffect(() => {
    if (!character) return;
    const container = ref.current;
  const game = (window as unknown as { GAME?: PhaserTypes.Game }).GAME;
  const canvas = game ? (game as unknown as { canvas?: HTMLCanvasElement }).canvas : null;
    if (!container || !canvas) return;
    try {
      const csContainer = getComputedStyle(container);
      const csCanvas = getComputedStyle(canvas);
      console.log('[PhaserCanvasDiag] container display:', csContainer.display, 'visibility:', csContainer.visibility, 'opacity:', csContainer.opacity, 'zIndex:', csContainer.zIndex, 'size:', container.clientWidth + 'x' + container.clientHeight);
      console.log('[PhaserCanvasDiag] canvas display:', csCanvas.display, 'visibility:', csCanvas.visibility, 'opacity:', csCanvas.opacity, 'zIndex:', csCanvas.zIndex, 'pos:', csCanvas.position, 'size(px):', canvas.width + 'x' + canvas.height);
    } catch {}
    // Force sane styles and high z-index so canvas can't be buried
    try {
      container.style.position = container.style.position || 'relative';
      container.style.zIndex = '20';
      container.style.visibility = 'visible';
      container.style.opacity = '1';
      if (getComputedStyle(container).display === 'none') container.style.display = 'block';
  canvas.style.position = canvas.style.position || 'absolute';
      canvas.style.zIndex = '21';
      canvas.style.visibility = 'visible';
      canvas.style.opacity = '1';
      if (getComputedStyle(canvas).display === 'none') canvas.style.display = 'block';
      // Add temporary outline and background to visually confirm
      canvas.style.outline = '2px solid #ff00ff';
      canvas.style.backgroundColor = canvas.style.backgroundColor || '#000';
      console.log('[PhaserCanvasDiag] Hard styles enforced');
    } catch (e) {
      console.warn('[PhaserCanvasDiag] Failed to enforce styles', e);
    }
    // Remove outline after short delay (visual cue only)
    const to = setTimeout(() => { try { if (canvas.style.outline) canvas.style.outline = 'none'; } catch {} }, 2500);
    return () => clearTimeout(to);
  }, [character]);

  return (
    <div 
      ref={ref}
      id="game-container"
      className="relative rounded-xl border border-white/10 overflow-hidden bg-black"
      style={{ 
        width: "100%", 
        maxWidth: "1280px", 
        aspectRatio: "16/9",
        margin: "0 auto",
        minHeight: "360px",
        display: "block",
        flex: "1 1 auto",
        position: 'relative',
        zIndex: 20,
      }}
    />
  );
}
