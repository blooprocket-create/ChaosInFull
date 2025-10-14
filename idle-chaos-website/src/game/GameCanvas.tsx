"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

class TownScene extends Phaser.Scene {
  constructor() { super("TownScene"); }
  preload() {}
  create() {
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Town (Placeholder)", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5, 0.5);
    const ground = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x3b0764).setOrigin(0.5, 0.5);
    ground.setStrokeStyle(1, 0xffffff, 0.2);
    // Ambient particles: generate a tiny dot texture
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture("dot", 4, 4);
    g.destroy();
    // Replace removed particles API with lightweight ambient dots via tweens
    const NUM_DOTS = 40;
    const spawnArea = () => ({
      x: Phaser.Math.Between(0, this.scale.width),
      y: Phaser.Math.Between(0, this.scale.height),
    });
    const animate = (img: Phaser.GameObjects.Image) => {
      const drift = 18;
      const toX = Phaser.Math.Clamp(img.x + Phaser.Math.Between(-drift, drift), 0, this.scale.width);
      const toY = Phaser.Math.Clamp(img.y + Phaser.Math.Between(-drift, drift), 0, this.scale.height);
      const duration = Phaser.Math.Between(2200, 4800);
      const startAlpha = 0.12 + Math.random() * 0.08;
      this.tweens.add({
        targets: img,
        x: toX,
        y: toY,
        alpha: { from: startAlpha, to: 0 },
        scale: { from: img.scale, to: 0 },
        duration,
        ease: "Sine.easeOut",
        onComplete: () => {
          const p = spawnArea();
          img.setPosition(p.x, p.y);
          img.setScale(Phaser.Math.FloatBetween(0.35, 0.8));
          img.setAlpha(0);
          img.setTint(Math.random() > 0.5 ? 0xbe18ff : 0xef4444);
          // small delay before next cycle for variety
          this.time.delayedCall(Phaser.Math.Between(100, 900), () => animate(img));
        },
      });
    };
    for (let i = 0; i < NUM_DOTS; i++) {
      const p = spawnArea();
      const img = this.add.image(p.x, p.y, "dot");
      img.setBlendMode(Phaser.BlendModes.ADD);
      img.setAlpha(0);
      img.setScale(Phaser.Math.FloatBetween(0.35, 0.8));
      img.setTint(Math.random() > 0.5 ? 0xbe18ff : 0xef4444);
      this.time.delayedCall(Phaser.Math.Between(0, 2000), () => animate(img));
    }
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
