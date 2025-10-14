"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

class TownScene extends Phaser.Scene {
  constructor() { super("TownScene"); }
  preload() {}
  create() {
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    const text = this.add.text(center.x, 40, "Town (Placeholder)", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5, 0.5);
    const ground = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x3b0764).setOrigin(0.5, 0.5);
    ground.setStrokeStyle(1, 0xffffff, 0.2);
    // Ambient particles: generate a tiny dot texture
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture("dot", 4, 4);
    g.destroy();
  const particles = (this.add.particles as any)("dot");
  const emitter = (particles.createEmitter as any)({
      x: { min: 0, max: this.scale.width },
      y: { min: 0, max: this.scale.height },
      alpha: { start: 0.15, end: 0 },
      scale: { start: 0.6, end: 0 },
      speedY: { min: -10, max: 10 },
      speedX: { min: -6, max: 6 },
      lifespan: 4000,
      quantity: 1,
      frequency: 120,
      tint: 0xbe18ff,
      blendMode: "ADD",
    });
    this.time.addEvent({ delay: 10000, loop: true, callback: () => {
      (emitter as any)?.setTint(Math.random() > 0.5 ? 0xbe18ff : 0xef4444);
    } });
  }
}

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: ref.current.clientWidth,
      height: Math.max(360, Math.floor(ref.current.clientWidth * 9/16)),
      backgroundColor: "#0b0b0b",
      parent: ref.current,
      physics: { default: "arcade", arcade: { debug: false } },
      scene: [TownScene],
    };
    gameRef.current = new Phaser.Game(config);

    const onResize = () => {
      if (!gameRef.current) return;
      const w = ref.current!.clientWidth;
      const h = Math.max(360, Math.floor(w * 9/16));
      gameRef.current.scale.resize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={ref} className="rounded-xl border border-white/10 overflow-hidden" />;
}
