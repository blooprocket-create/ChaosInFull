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
    };
  }, [character, initialScene]);

  return (
    <div 
      ref={ref} 
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
