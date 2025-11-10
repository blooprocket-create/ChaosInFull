"use client";
import { useEffect, useRef } from "react";
import { createPhaserGame, releasePhaserGame, type CharacterHUD } from "./createPhaserGame";
import type * as PhaserTypes from "phaser";

// Augmented window type (declared globally in createPhaserGame, duplicated locally for type narrowing convenience)
interface GameWindow extends Window { GAME?: PhaserTypes.Game }

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

    // Handle window resize
    let resizeWarned = false;
    const onResize = () => {
      try {
        if (!gameRef.current || !ref.current) return;
        // Skip if game hasn't fully booted yet
        const g = gameRef.current as PhaserTypes.Game & { isBooted?: boolean };
        if (g.isBooted === false) return;
        // Compute target size; guard against zero/NaN
        const cw = ref.current.clientWidth || 0;
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
        // Only resize if size actually changes
        const currentW = (g.scale?.width as number) || 0;
        const currentH = (g.scale?.height as number) || 0;
        if (currentW === w && currentH === h) return;
        g.scale.resize(w, h);
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
      if (el) {
        el.removeEventListener("keydown", onKeydown);
      }
      // Release a reference to the singleton; destroy when no more holders remain
      try { releasePhaserGame(); } catch {}
      gameRef.current = null;
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

  return (
    <div 
      ref={ref}
      id="game-container"
      className="relative rounded-xl border border-white/10 overflow-hidden"
      style={{ 
        width: "100%", 
        maxWidth: "1280px", 
        aspectRatio: "16/9",
        margin: "0 auto",
        minHeight: "360px",
      }}
    />
  );
}
