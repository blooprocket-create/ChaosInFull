"use client";
import { useEffect, useRef, useState } from "react";

interface PhaserScene {
  hud?: HTMLElement;
  _createHUD?: () => void;
  sys?: {
    settings?: unknown;
  };
}

interface PhaserGame {
  scene?: {
    getScenes?: (active: boolean) => PhaserScene[];
  };
}

/**
 * PhaserHUDPanel
 * 
 * Moves the in-game HUD (created by window.__hud_shared.createHUD(scene))
 * into this panel area so it displays beneath the canvas instead of fixed
 * to the viewport. Ensures the HUD updates continue to work (XP bar swaps
 * for mining/smithing/woodcutting/fishing/cooking).
 */
export default function PhaserHUDPanel() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let scene: PhaserScene | null = null;
    let hudEl: HTMLElement | null = null;
    const container = mountRef.current;

    const attachHud = () => {
      if (!container) return false;
      // Try to get an active scene. Prefer the scene that already created HUD.
      try {
        const game = (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).GAME) as PhaserGame | undefined;
        if (game?.scene && typeof game.scene.getScenes === 'function') {
          const running = game.scene.getScenes(true);
          // Find a scene that has a HUD or has helper methods
          scene = running.find(s => s && (s.hud || s._createHUD || s.sys?.settings)) || running[0] || null;
        }
      } catch {
        // ignore
      }

      // If no scene yet, retry shortly
      if (!scene) return false;

      try {
        const hudApi = (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__hud_shared) as { createHUD?: (scene: PhaserScene) => void } | undefined;
        if (!scene.hud && hudApi && typeof hudApi.createHUD === 'function') {
          try { hudApi.createHUD(scene); } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      hudEl = scene && scene.hud ? (scene.hud as HTMLElement) : null;
      if (!hudEl) return false;

      // Move the HUD element into our mount container and restyle for inline layout
      try {
        // Ensure it's not fixed; make it adapt to the panel width
        hudEl.style.position = 'static';
        hudEl.style.left = '';
        hudEl.style.top = '';
        hudEl.style.width = '100%';
        hudEl.style.maxWidth = '100%';
        hudEl.style.zIndex = '0';
        // Slightly tighten padding for panel fit and remove its own card chrome
        hudEl.style.padding = '10px';
        hudEl.style.background = 'transparent';
        hudEl.style.boxShadow = 'none';
        hudEl.style.border = 'none';
        hudEl.style.borderRadius = '0px';
        // Append into our container
        if (container && hudEl.parentElement !== container) {
          container.appendChild(hudEl);
        }
        if (!cancelled) setAttached(true);
        return true;
      } catch {
        return false;
      }
    };

    // Poll briefly until the game and scene are ready
    let tries = 0;
    const timer = setInterval(() => {
      if (cancelled) return;
      if (attachHud()) {
        clearInterval(timer);
      } else if (++tries > 60) { // ~6s max
        clearInterval(timer);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(timer);
      // On unmount, leave the HUD to Phaser cleanup. If it's still mounted here,
      // remove it to avoid stray nodes after navigation.
      try {
        if (hudEl && container && container.contains(hudEl)) {
          hudEl.remove();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div
      style={{
        marginTop: '1.5rem',
        borderLeft: '8px solid rgba(120,20,20,0.95)',
        border: '3px solid #111',
        background: 'linear-gradient(180deg, rgba(12,12,14,0.98), rgba(18,18,20,0.98))',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.9)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ fontFamily: 'Metal Mania, cursive', fontSize: '1.25rem', color: '#f0c9b0' }}>HUD</div>
        {!attached && (
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>Preparing…</span>
        )}
      </div>
      <div ref={mountRef} />
    </div>
  );
}
