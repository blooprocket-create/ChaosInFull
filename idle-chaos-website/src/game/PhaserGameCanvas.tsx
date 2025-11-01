"use client";
import { useEffect, useRef } from "react";
import createPhaserGame, { CharacterHUD } from "./createPhaserGame";
import * as Phaser from "phaser";

export default function PhaserGameCanvas({ 
  character, 
  initialScene 
}: { 
  character?: CharacterHUD; 
  initialScene?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Initialize the Phaser game
    const initGame = async () => {
      try {
        // Defensive: clean up any lingering global UI from a previous session before starting
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
              // Login/Character Select scene roots
              'login-container',
              'character-select-root',
            ];
            for (const id of ids) {
              const el = document.getElementById(id);
              if (el && el.parentNode) el.parentNode.removeChild(el);
            }
            // Remove any HUD elements from previous sessions
            document.querySelectorAll('[id$="-hud"]').forEach((node) => {
              try {
                if (node.parentNode) {
                  node.parentNode.removeChild(node);
                }
              } catch {}
            });
            // Remove any generic modal overlays left behind
            document.querySelectorAll('.modal-overlay').forEach((n) => {
              try {
                if (n.parentNode) {
                  n.parentNode.removeChild(n);
                }
              } catch {}
            });
            // Remove atmospheric canvases created by Login/CharacterSelect (idPrefix: login/charselect)
            document.querySelectorAll('[id^="login-"], [id^="charselect-"]').forEach((n) => {
              try {
                if (n.parentNode) n.parentNode.removeChild(n);
              } catch {}
            });
          }
        } catch {}

        const game = await createPhaserGame({
          parent: ref.current!,
          character,
          initialScene,
        });
        gameRef.current = game;
      } catch (error) {
        console.error("Failed to initialize Phaser game:", error);
      }
    };

    initGame();

    // Handle window resize
    const onResize = () => {
      if (!gameRef.current || !ref.current) return;
      const w = ref.current.clientWidth;
      const h = Math.max(360, Math.floor(w * 9 / 16));
      gameRef.current.scale.resize(w, h);
    };

    window.addEventListener("resize", onResize);

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
      if (el) {
        el.removeEventListener("keydown", onKeydown);
      }
      gameRef.current?.destroy(true);
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
            // Login/Character Select scene roots
            'login-container',
            'character-select-root',
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
          // Remove atmospheric canvases created by Login/CharacterSelect (idPrefix: login/charselect)
          document.querySelectorAll('[id^="login-"], [id^="charselect-"]').forEach((n) => {
            try {
              if (n.parentNode) n.parentNode.removeChild(n);
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
      }}
    />
  );
}
