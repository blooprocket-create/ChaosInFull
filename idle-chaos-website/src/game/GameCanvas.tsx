"use client";
import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";

class TownScene extends Phaser.Scene {
  constructor() { super("TownScene"); }
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private groundRect!: Phaser.GameObjects.Rectangle;
  preload() {}
  create() {
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Town", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5, 0.5);
    // Visible ground
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x3b0764).setOrigin(0.5, 0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    // Physics ground body (invisible, attached to a static sprite)
    const gtex = this.add.graphics();
    gtex.fillStyle(0xffffff, 1);
    gtex.fillRect(0, 0, 4, 4);
    gtex.generateTexture("groundTex", 4, 4);
    gtex.destroy();
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, "groundTex");
    ground.displayWidth = this.groundRect.width;
    ground.displayHeight = this.groundRect.height;
    ground.refreshBody();
    // Player texture and body
    const ptex = this.add.graphics();
    ptex.fillStyle(0xffffff, 1);
    ptex.fillCircle(8, 8, 8);
    ptex.generateTexture("playerTex", 16, 16);
    ptex.destroy();
    this.player = this.physics.add.image(center.x, center.y, "playerTex");
    this.player.setTint(0x9b87f5);
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    // Gravity for the player
    this.player.body.setGravityY(900);
    // Collider
    this.physics.add.collider(this.player, ground);
    // Input (WASD)
    this.cursors = this.input.keyboard.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as any;
    // World bounds
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      // reposition ground and refresh body on resize
      const w = gameSize.width;
      const h = gameSize.height;
      this.groundRect.setPosition(w / 2, h - 40).setSize(w * 0.9, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y);
      ground.displayWidth = this.groundRect.width;
      ground.displayHeight = this.groundRect.height;
      ground.refreshBody();
      this.physics.world.setBounds(0, 0, w, h);
    });
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
  update() {
    if (!this.player || !this.cursors) return;
    const speed = 220;
    let vx = 0;
    if (this.cursors.A.isDown) vx -= speed;
    if (this.cursors.D.isDown) vx += speed;
    this.player.setVelocityX(vx);
    // Jump with W when on floor
    const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
    if (this.cursors.W.isDown && onFloor) {
      this.player.setVelocityY(-420);
    }
  }
}

type CharacterHUD = {
  id: string;
  name: string;
  class: string;
  level: number;
};

export default function GameCanvas({ character, initialSeenWelcome }: { character?: CharacterHUD; initialSeenWelcome?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean>(!!initialSeenWelcome);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);

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

  // UI overlays: Welcome modal + HUD buttons
  const markWelcomeSeen = async () => {
    if (!character) return;
    setWelcomeError(null);
    try {
      const res = await fetch("/api/account/characters/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id }),
      });
      if (!res.ok) throw new Error("Request failed");
      setWelcomeSeen(true);
    } catch (e) {
      setWelcomeError("Could not save your acknowledgement. Please try again.");
    }
  };

  return (
    <div ref={ref} className="relative rounded-xl border border-white/10 overflow-hidden">
      {character ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/40 px-3 py-2 text-xs text-gray-200 shadow-lg ring-1 ring-white/10">
          <div className="font-semibold text-white/90">{character.name}</div>
          <div className="opacity-80">{character.class} • Lv {character.level}</div>
        </div>
      ) : null}
      {/* HUD Buttons */}
      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex gap-2">
        {[
          ["Items", "Open your inventory"],
          ["Talents", "View your talent tree"],
          ["Codex", "Quests, Tips, AFK Info"],
        ].map(([label, title]) => (
          <button key={label} title={String(title)} className="btn px-3 py-1 text-sm">
            {label}
          </button>
        ))}
      </div>
      {/* Welcome Modal (first time) */}
      {!welcomeSeen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="w-[min(560px,92vw)] rounded-lg border border-white/10 bg-black/80 p-5 text-gray-200 shadow-xl">
            <h3 className="text-xl font-semibold text-white">Welcome to Chaos In Full</h3>
            <p className="mt-2 text-sm text-gray-300">This is a 2D Platformer IDLE RPG.</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Movement: WASD</p>
              <p>Basic Attack: Space</p>
              <p>Active Skills: 1-0</p>
              <p className="text-gray-400">AFK systems will earn EXP/Gold when on maps with mobs.</p>
            </div>
            {welcomeError ? <p className="mt-3 text-sm text-red-300">{welcomeError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn px-4 py-2"
                onClick={markWelcomeSeen}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
