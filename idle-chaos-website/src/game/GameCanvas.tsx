"use client";
import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";

class TownScene extends Phaser.Scene {
  constructor() { super("TownScene"); }
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private eKey!: Phaser.Input.Keyboard.Key;
  private groundRect!: Phaser.GameObjects.Rectangle;
  private cavePortal!: Phaser.Physics.Arcade.Image;
  private slimePortal!: Phaser.Physics.Arcade.Image;
  private cavePrompt!: Phaser.GameObjects.Text;
  private slimePrompt!: Phaser.GameObjects.Text;
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
  // Portal textures
  const p = this.add.graphics();
  p.fillStyle(0x1d4ed8, 0.8); // blue for cave
  p.fillRoundedRect(0, 0, 28, 48, 10);
  p.generateTexture("portalBlue", 28, 48);
  p.clear();
  p.fillStyle(0x16a34a, 0.8); // green for slime
  p.fillRoundedRect(0, 0, 28, 48, 10);
  p.generateTexture("portalGreen", 28, 48);
  p.destroy();
  // Cave portal (left)
  this.cavePortal = this.physics.add.staticImage(80, this.groundRect.y - 24, "portalBlue");
  // Slime Field portal (right)
  this.slimePortal = this.physics.add.staticImage(this.scale.width - 80, this.groundRect.y - 24, "portalGreen");
  // Labels
  this.add.text(this.cavePortal.x, this.cavePortal.y - 40, "Cave", { color: "#93c5fd", fontSize: "12px" }).setOrigin(0.5);
  this.add.text(this.slimePortal.x, this.slimePortal.y - 40, "Slime Field", { color: "#86efac", fontSize: "12px" }).setOrigin(0.5);
  // Prompts
  this.cavePrompt = this.add.text(this.cavePortal.x, this.cavePortal.y - 60, "Press E to Enter", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
  this.slimePrompt = this.add.text(this.slimePortal.x, this.slimePortal.y - 60, "Press E to Enter", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
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
  (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900);
    // Collider
    this.physics.add.collider(this.player, ground);
    // Input (WASD)
    this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
    this.eKey = this.input.keyboard!.addKey("E", true, true);
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
      // move portals to edges
      this.cavePortal.setPosition(80, this.groundRect.y - 24);
      this.slimePortal.setPosition(w - 80, this.groundRect.y - 24);
      this.cavePrompt.setPosition(this.cavePortal.x, this.cavePortal.y - 60);
      this.slimePrompt.setPosition(this.slimePortal.x, this.slimePortal.y - 60);
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
    // Portal checks
    const dist = (a: Phaser.GameObjects.Image, b: Phaser.GameObjects.Image | Phaser.Physics.Arcade.Image) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    const nearCave = dist(this.player, this.cavePortal) < 60;
    const nearSlime = dist(this.player, this.slimePortal) < 60;
    this.cavePrompt.setVisible(nearCave);
    // Slime portal gated by tutorialStarted flag in registry
    const tutorialStarted = !!this.game.registry.get("tutorialStarted");
    this.slimePrompt.setText(tutorialStarted ? "Press E to Enter" : "Portal sealed—begin Tutorial");
    this.slimePrompt.setVisible(nearSlime);
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (nearCave) {
        this.scene.start("CaveScene");
      } else if (nearSlime && tutorialStarted) {
        this.scene.start("SlimeFieldScene");
      }
    }
  }
}

class CaveScene extends Phaser.Scene {
  constructor() { super("CaveScene"); }
  private player!: Phaser.Physics.Arcade.Image;
  private groundRect!: Phaser.GameObjects.Rectangle;
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private eKey!: Phaser.Input.Keyboard.Key;
  private copperCount = 0;
  private tinCount = 0;
  private hudText!: Phaser.GameObjects.Text;
  create() {
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Cave", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5, 0.5);
    // ground
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x111827).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    const gtex = this.add.graphics();
    gtex.fillStyle(0xffffff, 1);
    gtex.fillRect(0, 0, 4, 4);
    gtex.generateTexture("groundTex2", 4, 4);
    gtex.destroy();
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, "groundTex2");
    ground.displayWidth = this.groundRect.width;
    ground.displayHeight = this.groundRect.height;
    ground.refreshBody();
    // Player
    const ptex = this.add.graphics();
    ptex.fillStyle(0xffffff, 1);
    ptex.fillCircle(8, 8, 8);
    ptex.generateTexture("playerTex2", 16, 16);
    ptex.destroy();
    this.player = this.physics.add.image(100, this.groundRect.y - 60, "playerTex2").setTint(0xf59e0b);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    // Nodes
    const drawNode = (key: string, color: number) => {
      const gr = this.add.graphics();
      gr.fillStyle(color, 1);
      gr.fillCircle(10, 10, 10);
      gr.generateTexture(key, 20, 20);
      gr.destroy();
    };
    drawNode("copperNode", 0xb45309);
    drawNode("tinNode", 0x9ca3af);
    const copper = this.add.image(center.x - 120, this.groundRect.y - 20, "copperNode");
    const tin = this.add.image(center.x + 120, this.groundRect.y - 20, "tinNode");
    this.add.text(copper.x, copper.y - 24, "Copper", { color: "#fbbf24", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(tin.x, tin.y - 24, "Tin", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5);
    // AFK mining timers
    this.time.addEvent({ delay: 2500, loop: true, callback: () => { this.copperCount += 1; this.updateHUD(); } });
    this.time.addEvent({ delay: 3500, loop: true, callback: () => { this.tinCount += 1; this.updateHUD(); } });
    // HUD
    this.hudText = this.add.text(12, 12, "", { color: "#e5e7eb", fontSize: "12px" }).setScrollFactor(0);
    this.updateHUD();
    // Exit portal (left edge)
    const exit = this.add.graphics();
    exit.fillStyle(0x1d4ed8, 0.8);
    exit.fillRoundedRect(0, 0, 24, 44, 10);
    exit.generateTexture("portalExit", 24, 44);
    exit.destroy();
    const exitPortal = this.physics.add.staticImage(60, this.groundRect.y - 22, "portalExit");
    this.add.text(exitPortal.x, exitPortal.y - 38, "To Town", { color: "#93c5fd", fontSize: "12px" }).setOrigin(0.5);
    // Input
    this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    this.eKey = this.input.keyboard!.addKey("E", true, true);
    // Resize handling
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width; const h = gameSize.height;
      this.groundRect.setPosition(w / 2, h - 40).setSize(w * 0.9, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y);
      ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
      exitPortal.setPosition(60, this.groundRect.y - 22);
      this.physics.world.setBounds(0, 0, w, h);
    });
    this.events.on("shutdown", () => { /* timers auto clean */ });
  }
  updateHUD() {
    if (!this.hudText) return;
    this.hudText.setText(`AFK Mining Active\nCopper: ${this.copperCount}  Tin: ${this.tinCount}\nE near portal to return`);
  }
  update() {
    if (!this.player || !this.cursors) return;
    const speed = 220; let vx = 0; if (this.cursors.A.isDown) vx -= speed; if (this.cursors.D.isDown) vx += speed; this.player.setVelocityX(vx);
    const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down; if (this.cursors.W.isDown && onFloor) this.player.setVelocityY(-420);
    // Exit to Town
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.player.x < 100) {
      this.scene.start("TownScene");
    }
  }
}

class SlimeFieldScene extends Phaser.Scene {
  constructor() { super("SlimeFieldScene"); }
  private player!: Phaser.Physics.Arcade.Image;
  private groundRect!: Phaser.GameObjects.Rectangle;
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private eKey!: Phaser.Input.Keyboard.Key;
  create() {
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Slime Field", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5);
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x0f172a).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    const gtex = this.add.graphics(); gtex.fillStyle(0xffffff, 1); gtex.fillRect(0, 0, 4, 4); gtex.generateTexture("groundTex3", 4, 4); gtex.destroy();
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, "groundTex3");
    ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
    // Player
    const ptex = this.add.graphics(); ptex.fillStyle(0xffffff, 1); ptex.fillCircle(8, 8, 8); ptex.generateTexture("playerTex3", 16, 16); ptex.destroy();
    this.player = this.physics.add.image(100, this.groundRect.y - 60, "playerTex3").setTint(0x22c55e);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900); this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    // Simple slimes (ambient placeholders)
    const slimeTex = this.add.graphics(); slimeTex.fillStyle(0x22c55e, 1); slimeTex.fillCircle(6, 6, 6); slimeTex.generateTexture("slimeTex", 12, 12); slimeTex.destroy();
    const spawnSlime = (x: number) => {
      const s = this.physics.add.image(x, this.groundRect.y - 30, "slimeTex");
      s.setBounce(1).setCollideWorldBounds(true).setVelocityX(Phaser.Math.Between(-80, 80));
      this.physics.add.collider(s, ground);
      return s;
    };
    for (let i = 0; i < 5; i++) spawnSlime(center.x + Phaser.Math.Between(-200, 200));
    // Exit portal
    const exitG = this.add.graphics(); exitG.fillStyle(0x1d4ed8, 0.8); exitG.fillRoundedRect(0, 0, 24, 44, 10); exitG.generateTexture("portalExit2", 24, 44); exitG.destroy();
    const exitPortal = this.physics.add.staticImage(60, this.groundRect.y - 22, "portalExit2");
    this.add.text(exitPortal.x, exitPortal.y - 38, "To Town", { color: "#93c5fd", fontSize: "12px" }).setOrigin(0.5);
    // Input
    this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    this.eKey = this.input.keyboard!.addKey("E", true, true);
    // Resize
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width; const h = gameSize.height;
      this.groundRect.setPosition(w / 2, h - 40).setSize(w * 0.9, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y);
      ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
      exitPortal.setPosition(60, this.groundRect.y - 22);
      this.physics.world.setBounds(0, 0, w, h);
    });
  }
  update() {
    if (!this.player || !this.cursors) return;
    const speed = 220; let vx = 0; if (this.cursors.A.isDown) vx -= speed; if (this.cursors.D.isDown) vx += speed; this.player.setVelocityX(vx);
    const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down; if (this.cursors.W.isDown && onFloor) this.player.setVelocityY(-420);
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.player.x < 100) {
      this.scene.start("TownScene");
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
      scene: [TownScene, CaveScene, SlimeFieldScene],
    };
    gameRef.current = new Phaser.Game(config);
    // Seed registry flags (e.g., tutorial gate) if needed; default false
    gameRef.current.registry.set("tutorialStarted", false);

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
    } catch {
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
