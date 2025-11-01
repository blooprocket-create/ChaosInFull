"use client";
import { useEffect, useRef, useState } from "react";

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
    let scene: any = null;
    let hudEl: HTMLElement | null = null;

    const attachHud = () => {
      if (!mountRef.current) return false;
      // Try to get an active scene. Prefer the scene that already created HUD.
      try {
        const game: any = (typeof window !== 'undefined' && (window as any).GAME) || null;
        if (game && game.scene && typeof game.scene.getScenes === 'function') {
          const running = game.scene.getScenes(true) as any[];
          // Find a scene that has a HUD or has helper methods
          scene = running.find(s => s && (s.hud || s._createHUD || (s.sys && s.sys.settings))) || running[0] || null;
        }
      } catch {}

      // If no scene yet, retry shortly
      if (!scene) return false;

      try {
        const hudApi = (typeof window !== 'undefined' && (window as any).__hud_shared) || null;
        if (!scene.hud && hudApi && typeof hudApi.createHUD === 'function') {
          try { hudApi.createHUD(scene); } catch {}
        }
      } catch {}

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
        // Slightly tighten padding for panel fit
        hudEl.style.padding = '10px';
        // Append into our container
        if (mountRef.current && hudEl.parentElement !== mountRef.current) {
          mountRef.current.appendChild(hudEl);
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
        if (hudEl && mountRef.current && mountRef.current.contains(hudEl)) {
          hudEl.remove();
        }
      } catch {}
    };
  }, []);

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">HUD</h2>
        {!attached && (
          <span className="text-xs text-gray-400">Preparing…</span>
        )}
      </div>
      <div ref={mountRef} />
    </div>
  );
}
