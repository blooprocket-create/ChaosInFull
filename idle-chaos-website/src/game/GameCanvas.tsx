"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as Phaser from "phaser";

declare global {
  interface Window {
    __saveSceneNow?: () => void;
    __applyExpUpdate?: (payload: { type: "character" | "mining"; exp: number; level: number }) => void;
  }
}

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
    // Persist that we're in Town on scene load
    window.__saveSceneNow?.();
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
  // Determine spawn
  const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "initial", portal: null };
  const townSpawnX = spawn.from === "cave" ? this.cavePortal.x + 50 : spawn.from === "slime" ? this.slimePortal.x - 50 : center.x;
  this.player = this.physics.add.image(townSpawnX, this.groundRect.y - 60, "playerTex");
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
        this.game.registry.set("spawn", { from: "cave", portal: "town" });
        // hint react layer to save scene now
  window.__saveSceneNow?.();
        this.scene.start("CaveScene");
      } else if (nearSlime && tutorialStarted) {
        this.game.registry.set("spawn", { from: "slime", portal: "town" });
  window.__saveSceneNow?.();
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
  private copperNode!: Phaser.GameObjects.Image;
  private tinNode!: Phaser.GameObjects.Image;
  private miningCooldown = 0;
  create() {
    // Persist that we're in Cave on scene load
    window.__saveSceneNow?.();
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
  const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "town", portal: "cave" };
  const x = spawn.from === "town" ? 100 : 100;
  this.player = this.physics.add.image(x, this.groundRect.y - 60, "playerTex2").setTint(0xf59e0b);
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
  this.copperNode = this.add.image(center.x - 120, this.groundRect.y - 20, "copperNode");
  this.tinNode = this.add.image(center.x + 120, this.groundRect.y - 20, "tinNode");
  this.add.text(this.copperNode.x, this.copperNode.y - 24, "Copper", { color: "#fbbf24", fontSize: "12px" }).setOrigin(0.5);
  this.add.text(this.tinNode.x, this.tinNode.y - 24, "Tin", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5);
  // AFK mining timers (proximity-gated)
  this.time.addEvent({ delay: 2500, loop: true, callback: () => {
    const miningLevel = (this.game.registry.get("miningLevel") as number) ?? 1;
    if (miningLevel >= 1 && this.isNearNode(this.copperNode)) {
      this.copperCount += 1; this.miningFx(this.copperNode); this.updateHUD();
      // Award +3 mining EXP per ore
      fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (this.game.registry.get("characterId") as string), miningExp: 3 }) })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data) return;
          if (typeof data.miningExp === "number" && typeof data.miningLevel === "number") {
            window.__applyExpUpdate?.({ type: "mining", exp: data.miningExp, level: data.miningLevel });
          }
        })
        .catch(() => {});
    }
  } });
  this.time.addEvent({ delay: 3500, loop: true, callback: () => {
    const miningLevel = (this.game.registry.get("miningLevel") as number) ?? 1;
    if (miningLevel >= 1 && this.isNearNode(this.tinNode)) {
      this.tinCount += 1; this.miningFx(this.tinNode); this.updateHUD();
      fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (this.game.registry.get("characterId") as string), miningExp: 3 }) })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data) return;
          if (typeof data.miningExp === "number" && typeof data.miningLevel === "number") {
            window.__applyExpUpdate?.({ type: "mining", exp: data.miningExp, level: data.miningLevel });
          }
        })
        .catch(() => {});
    }
  } });
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
  private isNearNode(node: Phaser.GameObjects.Image) {
    if (!this.player) return false;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
    return d < 60; // must be next to/on the node
  }
  private miningFx(node: Phaser.GameObjects.Image) {
    // Player squash tween as feedback
    this.tweens.add({ targets: this.player, scaleX: 0.9, scaleY: 1.1, yoyo: true, duration: 120, ease: "Sine.easeInOut" });
    // Spark particles using quick tweened dots around node
    const makeSpark = () => {
      const img = this.add.image(node.x + Phaser.Math.Between(-6, 6), node.y + Phaser.Math.Between(-8, 0), "dot");
      img.setTint(0xfbbf24).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.4, 0.7));
      this.tweens.add({ targets: img, y: img.y - 8, alpha: 0, duration: 220, ease: "Sine.easeOut", onComplete: () => img.destroy() });
    };
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 20, makeSpark);
    // Add to inventory
    const inv = (this.game.registry.get("inventory") as Record<string, number>) || {};
    const key = node === this.copperNode ? "copper" : "tin";
    inv[key] = (inv[key] ?? 0) + 1;
    this.game.registry.set("inventory", inv);
  }
  // Removed dev HUD text
  updateHUD() {}
  update() {
    if (!this.player || !this.cursors) return;
    const speed = 220; let vx = 0; if (this.cursors.A.isDown) vx -= speed; if (this.cursors.D.isDown) vx += speed; this.player.setVelocityX(vx);
    const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down; if (this.cursors.W.isDown && onFloor) this.player.setVelocityY(-420);
    // Exit to Town
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.player.x < 100) {
      this.game.registry.set("spawn", { from: "cave", portal: "town" });
  window.__saveSceneNow?.();
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
    // Persist that we're in Slime Field on scene load
    window.__saveSceneNow?.();
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Slime Field", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5);
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x0f172a).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    const gtex = this.add.graphics(); gtex.fillStyle(0xffffff, 1); gtex.fillRect(0, 0, 4, 4); gtex.generateTexture("groundTex3", 4, 4); gtex.destroy();
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, "groundTex3");
    ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
    // Player
    const ptex = this.add.graphics(); ptex.fillStyle(0xffffff, 1); ptex.fillCircle(8, 8, 8); ptex.generateTexture("playerTex3", 16, 16); ptex.destroy();
  const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "town", portal: "slime" };
  const x = spawn.from === "town" ? 100 : 100;
  this.player = this.physics.add.image(x, this.groundRect.y - 60, "playerTex3").setTint(0x22c55e);
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
      this.game.registry.set("spawn", { from: "slime", portal: "town" });
  window.__saveSceneNow?.();
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

export default function GameCanvas({ character, initialSeenWelcome, initialScene, offlineSince, initialExp, initialMiningExp, initialMiningLevel }: { character?: CharacterHUD; initialSeenWelcome?: boolean; initialScene?: string; offlineSince?: string; initialExp?: number; initialMiningExp?: number; initialMiningLevel?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean>(!!initialSeenWelcome);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [openInventory, setOpenInventory] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [activeSceneKey, setActiveSceneKey] = useState<string>("TownScene");
  const [showStats, setShowStats] = useState(false);
  type SkillsView = { mining: { level: number; exp: number }; woodcutting: { level: number; exp: number }; fishing: { level: number; exp: number }; crafting: { level: number; exp: number } };
  type BaseView = { level: number; class: string; exp: number; gold: number; premiumGold?: number; hp: number; mp: number; strength: number; agility: number; intellect: number; luck: number };
  const [statsData, setStatsData] = useState<{ base: BaseView | null; skills: SkillsView } | null>(null);
  // EXP and level state (client HUD) with dynamic thresholds matching server
  const reqChar = useCallback((lvl: number) => Math.floor(100 * Math.pow(1.25, Math.max(0, lvl - 1))), []);
  const reqMine = useCallback((lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1))), []);
  const [charLevel, setCharLevel] = useState<number>(character?.level ?? 1);
  const [charExp, setCharExp] = useState<number>(initialExp ?? 0);
  const [charMax, setCharMax] = useState<number>(reqChar(character?.level ?? 1));
  const [miningExpState, setMiningExpState] = useState<number>(initialMiningExp ?? 0);
  const [miningMax, setMiningMax] = useState<number>(reqMine(initialMiningLevel ?? 1));
  const [expHud, setExpHud] = useState<{ label: string; value: number; max: number }>({ label: "Character EXP", value: initialExp ?? 0, max: reqChar(character?.level ?? 1) });

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
    gameRef.current.registry.set("spawn", { from: "initial", portal: null });
  gameRef.current.registry.set("inventory", {} as Record<string, number>);
    if (character) {
      gameRef.current.registry.set("characterId", character.id);
      gameRef.current.registry.set("miningLevel", initialMiningLevel ?? 1);
    }
    // Start initial scene
    const startScene = (initialScene || "Town") as string;
    if (startScene !== "Town") {
      // switch scenes after boot
      setTimeout(() => gameRef.current?.scene.start(`${startScene}Scene` as string), 0);
    }

    // Load initial inventory from server
    if (character) {
      fetch(`/api/account/characters/inventory?characterId=${character.id}`)
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          const items = (data?.items as Record<string, number>) || {};
          gameRef.current?.registry.set("inventory", items);
        })
        .catch(() => {});
    }

    // Prevent page scroll on Space when game is focused
    const el = ref.current;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    };
    const onWindowKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
      if (e.key === "i" || e.key === "I") {
        // don't toggle when typing in inputs
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          setOpenInventory((v) => !v);
        }
      }
    };
    el.addEventListener("keydown", onKeydown);
    window.addEventListener("keydown", onWindowKeydown, { passive: false });
    el.tabIndex = 0; // make container focusable
    el.focus({ preventScroll: true });

    const onResize = () => {
      if (!gameRef.current) return;
      const w = ref.current!.clientWidth;
      const h = Math.max(360, Math.floor(w * 9/16));
      gameRef.current.scale.resize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("keydown", onKeydown);
      window.removeEventListener("keydown", onWindowKeydown as EventListener);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [initialScene, character, initialMiningLevel]);

  // Save immediately on unmount as a fallback for client-side navigation
  useEffect(() => {
    return () => {
      const game = gameRef.current; if (!game || !character) return;
      const scenes = game.scene.getScenes(true);
      const active = scenes.length ? scenes[0].scene.key.replace("Scene", "") : "Town";
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      // Fire-and-forget; navigation is in progress
      fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) }).catch(() => {});
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    };
  }, [character]);

  // Expose helpers to scenes via window is set up after saveSceneNow definition below

  // Persist scene on page hide/unload
  useEffect(() => {
    const save = async () => {
      const game = gameRef.current; if (!game || !character) return;
      // Determine scene
      const scenes = game.scene.getScenes(true);
      const active = scenes.length ? scenes[0].scene.key.replace("Scene", "") : "Town";
      try {
        await fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) });
        const inv = (game.registry.get("inventory") as Record<string, number>) || {};
        await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) });
      } catch {}
    };
    const onHide = () => { save(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [character]);

  // Offline gains modal state
  const [offlineModal, setOfflineModal] = useState<{ open: boolean; copper: number; tin: number } | null>(null);
  useEffect(() => {
    if (!offlineSince) return;
    if ((initialScene || "Town").toLowerCase() !== "cave") return;
    const since = new Date(offlineSince).getTime();
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - since) / 1000));
    const copper = Math.floor(seconds / 2.5);
    const tin = Math.floor(seconds / 3.5);
    if (copper > 0 || tin > 0) {
      setOfflineModal({ open: true, copper, tin });
    }
  }, [offlineSince, initialScene]);

  // Poll inventory from Phaser registry into React UI
  useEffect(() => {
    const t = setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      setInventory({ ...inv });
      // Update HUD based on active scene
      const scenes = game.scene.getScenes(true);
      const active = scenes.length ? scenes[0].scene.key : "TownScene";
      setActiveSceneKey(active);
      if (active === "CaveScene") {
        setExpHud({ label: "Mining EXP", value: miningExpState, max: miningMax });
      } else {
        setExpHud({ label: "Character EXP", value: charExp, max: charMax });
      }
    }, 800);
    return () => clearInterval(t);
  }, [charExp, charMax, miningExpState, miningMax]);

  // Periodically persist inventory while playing
  useEffect(() => {
    if (!character) return;
    const t = setInterval(() => {
      const game = gameRef.current; if (!game) return;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    }, 7000);
    return () => clearInterval(t);
  }, [character]);

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

  // Helper: immediate save of current scene to server
  const saveSceneNow = useCallback(async () => {
    const game = gameRef.current; if (!game || !character) return;
    const scenes = game.scene.getScenes(true);
    const active = scenes.length ? scenes[0].scene.key.replace("Scene", "") : "Town";
    try {
      await fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) });
    } catch {}
  }, [character]);

  // Expose helpers to scenes via window
  useEffect(() => {
    window.__saveSceneNow = saveSceneNow;
    window.__applyExpUpdate = ({ type, exp, level }) => {
      if (type === "mining") {
        setMiningExpState(exp);
        setMiningMax(reqMine(level));
        const game = gameRef.current; if (game) game.registry.set("miningLevel", level);
      } else {
        setCharExp(exp);
        setCharLevel(level);
        setCharMax(reqChar(level));
      }
    };
    return () => {
      delete window.__saveSceneNow;
      delete window.__applyExpUpdate;
    };
  }, [saveSceneNow, reqChar, reqMine]);

  // Action: collect offline rewards
  const collectOffline = useCallback(async () => {
    if (!character || !offlineModal) return;
    const { copper, tin } = offlineModal;
    // Update registry inventory first for instant UI
    const game = gameRef.current;
    if (game) {
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (copper > 0) inv.copper = (inv.copper ?? 0) + copper;
      if (tin > 0) inv.tin = (inv.tin ?? 0) + tin;
      game.registry.set("inventory", inv);
    }
    try {
      // Persist inventory
      await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: (gameRef.current?.registry.get("inventory") as Record<string, number>) || {} }) });
      // Award mining EXP: 3 per ore
      const miningExpDelta = (copper + tin) * 3;
      if (miningExpDelta > 0) {
        const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, miningExp: miningExpDelta }) });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.miningExp === "number" && typeof data.miningLevel === "number") {
            window.__applyExpUpdate?.({ type: "mining", exp: data.miningExp, level: data.miningLevel });
          }
        }
      }
    } catch {}
    setOfflineModal(null);
  }, [character, offlineModal]);

  return (
    <div ref={ref} className="relative rounded-xl border border-white/10 overflow-hidden">
      {character ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/40 px-3 py-2 text-xs text-gray-200 shadow-lg ring-1 ring-white/10">
          <div className="font-semibold text-white/90">{character.name}</div>
          <div className="opacity-80">
            {character.class} • Lv {charLevel}
            {activeSceneKey === "CaveScene" ? (
              <> • Mining Lv {gameRef.current?.registry.get("miningLevel") ?? (initialMiningLevel ?? 1)}</>
            ) : null}
          </div>
          {/* Contextual EXP bar */}
          <div className="mt-2 w-56">
            <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
              <span>{expHud.label}</span>
              <span>{expHud.value} / {expHud.max}</span>
            </div>
            <div className="h-2 w-full rounded bg-white/10">
              <div className="h-2 rounded bg-violet-500" style={{ width: `${Math.min(100, (expHud.value / expHud.max) * 100)}%` }} />
            </div>
          </div>
        </div>
      ) : null}
      {/* HUD Buttons */}
      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex gap-2">
        <button className="btn px-3 py-1 text-sm" title="Open your inventory" onClick={() => setOpenInventory(true)}>Items</button>
        <button className="btn px-3 py-1 text-sm" title="View your talent tree">Talents</button>
        <button className="btn px-3 py-1 text-sm" title="Quests, Tips, AFK Info">Codex</button>
        <button className="btn px-3 py-1 text-sm" title="View your stats and skills" onClick={async () => {
          if (!character) return;
          try {
            const res = await fetch(`/api/account/stats?characterId=${character.id}`);
            if (res.ok) {
              const data = await res.json();
              setStatsData({ base: data.base, skills: data.skills });
              setShowStats(true);
            }
          } catch {}
        }}>Stats</button>
      </div>
      {/* Inventory Modal */}
      {openInventory && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="w-[min(680px,94vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Inventory</h3>
              <button className="btn px-3 py-1" onClick={() => setOpenInventory(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-3 sm:grid-cols-8">
              {Object.keys(inventory).length === 0 && (
                <div className="col-span-full text-sm text-gray-400">No items yet. Mine nodes or defeat monsters to collect items.</div>
              )}
              {Object.entries(inventory).map(([key, count]) => (
                <div key={key} className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900 to-black/60 p-2">
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="select-none text-xs font-semibold tracking-wide" title={key}>
                      {key === "copper" ? "Cu" : key === "tin" ? "Sn" : key.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white/90 ring-1 ring-white/10">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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

      {/* Offline Gains Modal */}
      {offlineModal?.open && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-white">While you were away…</h3>
            <p className="mt-1 text-sm text-gray-300">Your character remained in the Cave and gathered resources passively.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Copper Ore</div>
                <div className="mt-1 text-white text-xl font-semibold">+{offlineModal.copper}</div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-gray-300">Tin Ore</div>
                <div className="mt-1 text-white text-xl font-semibold">+{offlineModal.tin}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400">Mining EXP will be awarded (+3 EXP per ore). Level-ups apply automatically.</div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn px-3 py-1" onClick={() => setOfflineModal(null)}>Dismiss</button>
              <button className="btn px-3 py-1" onClick={collectOffline}>Collect</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(560px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Stats & Skills</h3>
              <button className="btn px-3 py-1" onClick={() => setShowStats(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Base</div>
                {statsData?.base ? (
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>Level: {statsData.base.level}</li>
                    <li>Class: {statsData.base.class}</li>
                    <li>HP: {statsData.base.hp} • MP: {statsData.base.mp}</li>
                    <li>STR: {statsData.base.strength} • INT: {statsData.base.intellect}</li>
                    <li>AGI: {statsData.base.agility} • LUK: {statsData.base.luck}</li>
                    <li>Gold: {statsData.base.gold} • Premium: {statsData.base.premiumGold}</li>
                  </ul>
                ) : <div className="mt-2 text-gray-400">No base stats</div>}
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Skills</div>
                {statsData?.skills ? (
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>Mining: Lv {statsData.skills.mining.level} ({statsData.skills.mining.exp} EXP)</li>
                    <li>Woodcutting: Lv {statsData.skills.woodcutting.level} ({statsData.skills.woodcutting.exp} EXP)</li>
                    <li>Fishing: Lv {statsData.skills.fishing.level} ({statsData.skills.fishing.exp} EXP)</li>
                    <li>Crafting: Lv {statsData.skills.crafting.level} ({statsData.skills.crafting.exp} EXP)</li>
                  </ul>
                ) : <div className="mt-2 text-gray-400">No skills yet</div>}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Damage scales with your main stat by class (Beginner = LUK, Horror = STR, Occult = INT, Shade = AGI) and weapon damage (1 if none equipped).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
