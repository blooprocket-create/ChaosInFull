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
        // With FIT mode, Phaser handles canvas sizing automatically - just force a refresh
        try {
          const gScale = (game as unknown as { scale?: PhaserTypes.Scale.ScaleManager }).scale;
          if (gScale) {
            // Delay refresh to ensure container is laid out
            setTimeout(() => { try { gScale.refresh(); } catch {} }, 100);
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

    // Handle window resize - with FIT mode, just call refresh()
    const onResize = () => {
      try {
        if (!gameRef.current || !ref.current) return;
        // Skip if game hasn't fully booted yet
        const g = gameRef.current as PhaserTypes.Game & { isBooted?: boolean };
        if (g.isBooted === false) return;
        // In FIT mode, Phaser's scale manager handles everything - just refresh
        try { g.scale.refresh(); } catch {}
      } catch (e) {
        console.warn('[PhaserGameCanvas] Resize refresh failed', e);
        try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_resize_error' } })); } catch {}
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
        if (hiddenByDisplay) { canvas.style.display = ''; changed = true; try { console.log('[PhaserCanvas] cleared display style'); } catch {} }
        if (hiddenByVisibility) { canvas.style.visibility = ''; changed = true; try { console.log('[PhaserCanvas] cleared visibility style'); } catch {} }
        if (hiddenByOpacity) { canvas.style.opacity = ''; changed = true; try { console.log('[PhaserCanvas] cleared opacity style'); } catch {} }
        if (canvas.classList.contains('hidden')) { canvas.classList.remove('hidden'); changed = true; try { console.log('[PhaserCanvas] removed class "hidden"'); } catch {} }
        // Remove any tailwind-style utility that might keep it invisible
        if (canvas.classList.contains('invisible')) { canvas.classList.remove('invisible'); changed = true; try { console.log('[PhaserCanvas] removed class "invisible"'); } catch {} }
        // If not attached, attach
        if (container && canvas.parentElement !== container) { try { container.appendChild(canvas); changed = true; console.log('[PhaserCanvas] re-attached canvas to container'); } catch {} }
        if (changed) {
          try { window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: 'phaser_canvas_force_shown' } })); } catch {}
          // Force scale refresh after unhiding
          try { if (game && game.scale) game.scale.refresh(); } catch {}
        }
        // Also ensure container itself is visible (and clear scene's hidden flag)
        if (container) {
          const cs = getComputedStyle(container);
          if (cs.display === 'none') { container.style.display = ''; changed = true; try { console.log('[PhaserCanvas] cleared container display'); } catch {} }
          if (cs.visibility === 'hidden') { container.style.visibility = ''; changed = true; try { console.log('[PhaserCanvas] cleared container visibility'); } catch {} }
          if (container.style.opacity === '0') { container.style.opacity = ''; changed = true; try { console.log('[PhaserCanvas] cleared container opacity'); } catch {} }
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

  // Deep diagnostics + ensure canvas is visible after character selection
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
    // Clear any forced inline styles that might hide the canvas; let Phaser's FIT mode handle positioning
    try {
      // Clear container inline overrides
      if (container.style.visibility === 'hidden') container.style.visibility = '';
      if (container.style.opacity === '0') container.style.opacity = '';
      if (container.style.display === 'none') container.style.display = '';
      // Clear canvas inline overrides
      if (canvas.style.visibility === 'hidden') canvas.style.visibility = '';
      if (canvas.style.opacity === '0') canvas.style.opacity = '';
      if (canvas.style.display === 'none') canvas.style.display = '';
      console.log('[PhaserCanvasDiag] Cleared hiding inline styles');
      // Force scale refresh
      try { if (game && game.scale) game.scale.refresh(); } catch {}
    } catch (e) {
      console.warn('[PhaserCanvasDiag] Failed to clear styles', e);
    }
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
