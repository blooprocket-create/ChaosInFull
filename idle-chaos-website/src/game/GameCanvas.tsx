"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as Phaser from "phaser";

declare global {
  interface Window {
    __saveSceneNow?: (sceneOverride?: "Town" | "Cave" | "Slime") => void;
    __applyExpUpdate?: (payload: { type: "character" | "mining" | "crafting"; exp: number; level: number }) => void;
    __openFurnace?: () => void;
    __openWorkbench?: () => void;
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
  private furnace!: Phaser.Physics.Arcade.Image;
  private furnacePrompt!: Phaser.GameObjects.Text;
  private workbench!: Phaser.Physics.Arcade.Image;
  private workbenchPrompt!: Phaser.GameObjects.Text;
  preload() {}
  create() {
    // Track current scene for persistence
    this.game.registry.set("currentScene", "Town");
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
  // Furnace (center-right)
  const f = this.add.graphics();
  f.fillStyle(0x9a3412, 1);
  f.fillRoundedRect(0, 0, 36, 28, 6);
  f.fillStyle(0xf97316, 1);
  f.fillCircle(28, 20, 6);
  f.generateTexture("furnaceTex", 36, 28);
  f.destroy();
  this.furnace = this.physics.add.staticImage(center.x + 120, this.groundRect.y - 14, "furnaceTex");
  // Workbench (center-left)
  const wbx = this.add.graphics();
  wbx.fillStyle(0x374151, 1);
  wbx.fillRoundedRect(0, 0, 46, 16, 4);
  wbx.fillStyle(0x9ca3af, 1);
  wbx.fillRect(6, 2, 34, 4);
  wbx.generateTexture("workbenchTex", 46, 16);
  wbx.destroy();
  this.workbench = this.physics.add.staticImage(center.x - 120, this.groundRect.y - 8, "workbenchTex");
  // Labels
  this.add.text(this.cavePortal.x, this.cavePortal.y - 40, "Cave", { color: "#93c5fd", fontSize: "12px" }).setOrigin(0.5);
  this.add.text(this.slimePortal.x, this.slimePortal.y - 40, "Slime Field", { color: "#86efac", fontSize: "12px" }).setOrigin(0.5);
  this.add.text(this.furnace.x, this.furnace.y - 36, "Furnace", { color: "#fca5a5", fontSize: "12px" }).setOrigin(0.5);
  this.add.text(this.workbench.x, this.workbench.y - 28, "Workbench", { color: "#c7d2fe", fontSize: "12px" }).setOrigin(0.5);
  // Prompts
  this.cavePrompt = this.add.text(this.cavePortal.x, this.cavePortal.y - 60, "Press E to Enter", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
  this.slimePrompt = this.add.text(this.slimePortal.x, this.slimePortal.y - 60, "Press E to Enter", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
  this.furnacePrompt = this.add.text(this.furnace.x, this.furnace.y - 48, "Press E to Use", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
  this.workbenchPrompt = this.add.text(this.workbench.x, this.workbench.y - 32, "Press E to Craft", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
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
  this.furnace.setPosition(w / 2 + 120, this.groundRect.y - 14);
    this.workbench.setPosition(w / 2 - 120, this.groundRect.y - 8);
      this.cavePrompt.setPosition(this.cavePortal.x, this.cavePortal.y - 60);
      this.slimePrompt.setPosition(this.slimePortal.x, this.slimePortal.y - 60);
  this.furnacePrompt.setPosition(this.furnace.x, this.furnace.y - 48);
    this.workbenchPrompt.setPosition(this.workbench.x, this.workbench.y - 32);
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
  const nearFurnace = dist(this.player, this.furnace) < 60;
  const nearWorkbench = dist(this.player, this.workbench) < 60;
    this.cavePrompt.setVisible(nearCave);
    // Slime portal gated by tutorialStarted flag in registry
    const tutorialStarted = !!this.game.registry.get("tutorialStarted");
    this.slimePrompt.setText(tutorialStarted ? "Press E to Enter" : "Portal sealed—begin Tutorial");
    this.slimePrompt.setVisible(nearSlime);
    this.furnacePrompt.setVisible(nearFurnace);
      this.workbenchPrompt.setVisible(nearWorkbench);
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (nearCave) {
        this.game.registry.set("spawn", { from: "cave", portal: "town" });
        // Save destination scene immediately before transition
        window.__saveSceneNow?.("Cave");
        this.scene.start("CaveScene");
      } else if (nearSlime && tutorialStarted) {
        this.game.registry.set("spawn", { from: "slime", portal: "town" });
        window.__saveSceneNow?.("Slime");
        this.scene.start("SlimeFieldScene");
      } else if (nearFurnace) {
        // Open furnace modal via React
        window.__openFurnace?.();
      } else if (nearWorkbench) {
        window.__openWorkbench?.();
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
    this.game.registry.set("currentScene", "Cave");
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
    // Persist inventory immediately to avoid loss
    const cid = (this.game.registry.get("characterId") as string) || "";
    if (cid) {
      fetch("/api/account/characters/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: cid, items: inv })
      }).catch(() => {});
    }
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
      // Save destination (Town) before transitioning back
      window.__saveSceneNow?.("Town");
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
    this.game.registry.set("currentScene", "Slime");
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
      window.__saveSceneNow?.("Town");
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
  const [showFurnace, setShowFurnace] = useState(false);
  const [furnaceQueue, setFurnaceQueue] = useState<{ recipe: "copper" | "bronze"; eta: number; startedAt: number; remaining: number; per: number; total: number } | null>(null);
  const furnaceRef = useRef<typeof furnaceQueue>(null);
  const furnaceTimerRef = useRef<number | null>(null);
  useEffect(() => { furnaceRef.current = furnaceQueue; }, [furnaceQueue]);
  // Workbench state
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [workQueue, setWorkQueue] = useState<{ recipe: "armor" | "dagger"; eta: number; startedAt: number; remaining: number; per: number; total: number } | null>(null);
  const workRef = useRef<typeof workQueue>(null);
  const workTimerRef = useRef<number | null>(null);
  useEffect(() => { workRef.current = workQueue; }, [workQueue]);
  type SkillsView = { mining: { level: number; exp: number }; woodcutting: { level: number; exp: number }; fishing: { level: number; exp: number }; crafting: { level: number; exp: number } };
  type BaseView = { level: number; class: string; exp: number; gold: number; premiumGold?: number; hp: number; mp: number; strength: number; agility: number; intellect: number; luck: number };
  const [statsData, setStatsData] = useState<{ base: BaseView | null; skills: SkillsView } | null>(null);
  // EXP and level state (client HUD) with dynamic thresholds matching server
  const reqChar = useCallback((lvl: number) => Math.floor(100 * Math.pow(1.25, Math.max(0, lvl - 1))), []);
  const reqMine = useCallback((lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1))), []);
  const reqCraft = useCallback((lvl: number) => Math.floor(50 * Math.pow(1.2, Math.max(0, lvl - 1))), []);
  const [charLevel, setCharLevel] = useState<number>(character?.level ?? 1);
  const [charExp, setCharExp] = useState<number>(initialExp ?? 0);
  const [charMax, setCharMax] = useState<number>(reqChar(character?.level ?? 1));
  const [miningExpState, setMiningExpState] = useState<number>(initialMiningExp ?? 0);
  const [miningMax, setMiningMax] = useState<number>(reqMine(initialMiningLevel ?? 1));
  const [craftingExpState, setCraftingExpState] = useState<number>(0);
  const [craftingMax, setCraftingMax] = useState<number>(reqCraft(1));
  const [expHud, setExpHud] = useState<{ label: string; value: number; max: number }>({ label: "Character EXP", value: initialExp ?? 0, max: reqChar(character?.level ?? 1) });
  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

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
  // Do not pre-initialize inventory to {} to avoid overwriting server state; we'll hydrate from GET below
    if (character) {
      gameRef.current.registry.set("characterId", character.id);
      gameRef.current.registry.set("miningLevel", initialMiningLevel ?? 1);
      gameRef.current.registry.set("craftingLevel", 1);
    }
    // Start initial scene
    const startScene = (initialScene || "Town") as "Town" | "Cave" | "Slime";
    if (startScene !== "Town") {
      // Switch scenes after boot; ensure TownScene doesn't steal focus by stopping it first
      setTimeout(() => {
        const game = gameRef.current; if (!game) return;
        if (game.scene.isActive("TownScene")) {
          game.scene.stop("TownScene");
        }
        game.scene.start(`${startScene}Scene`);
      }, 0);
    }

    // Load initial inventory from server
    if (character) {
      fetch(`/api/account/characters/inventory?characterId=${character.id}`)
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          const items = (data?.items as Record<string, number>) || {};
          // Set from DB; treat DB as source of truth
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
    // Capture internal link clicks to persist scene and inventory before navigation
    const onDocClick = (e: MouseEvent) => {
      if (!character) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = (anchor as HTMLAnchorElement).getAttribute("href");
      if (!href || href.startsWith("#")) return;
      // Ignore new tab or modified clicks
      if ((anchor as HTMLAnchorElement).target || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      // Only handle same-origin internal routes
      if (!href.startsWith("/")) return;
      const game = gameRef.current; if (!game) return;
      const regScene = (game.registry.get("currentScene") as string) || "Town";
      const scenes = game.scene.getScenes(true);
      const active = scenes.length ? scenes[0].scene.key.replace("Scene", "") : regScene;
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if ("sendBeacon" in navigator) {
        navigator.sendBeacon("/api/account/characters/state", new Blob([JSON.stringify({ characterId: character.id, scene: active })], { type: "application/json" }));
        navigator.sendBeacon("/api/account/characters/inventory", new Blob([JSON.stringify({ characterId: character.id, items: inv })], { type: "application/json" }));
      } else {
        // Best-effort fallback without blocking navigation
        fetch("/api/account/characters/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, scene: active }) }).catch(() => {});
        fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
      }
    };
    document.addEventListener("click", onDocClick, true);
    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("keydown", onKeydown);
      window.removeEventListener("keydown", onWindowKeydown as EventListener);
      document.removeEventListener("click", onDocClick, true);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [initialScene, character, initialMiningLevel]);

  // Save immediately on unmount as a fallback for client-side navigation
  useEffect(() => {
    return () => {
      const game = gameRef.current; if (!game || !character) return;
  const regScene = (game.registry.get("currentScene") as string) || "Town";
  const scenes = game.scene.getScenes(true);
  const active = scenes.length ? scenes[0].scene.key.replace("Scene", "") : regScene;
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
  const regScene = (game.registry.get("currentScene") as string) || "Town";
  const scenes = game.scene.getScenes(true);
  const active = scenes.length ? scenes[0].scene.key.replace("Scene", "") : regScene;
      try {
        const statePayload = JSON.stringify({ characterId: character.id, scene: active });
        const inv = (game.registry.get("inventory") as Record<string, number>) || {};
        const invPayload = JSON.stringify({ characterId: character.id, items: inv });
        // Prefer sendBeacon for reliability on unload
        const sent1 = ("sendBeacon" in navigator) && navigator.sendBeacon("/api/account/characters/state", new Blob([statePayload], { type: "application/json" }));
        const sent2 = ("sendBeacon" in navigator) && navigator.sendBeacon("/api/account/characters/inventory", new Blob([invPayload], { type: "application/json" }));
        if (!sent1) {
          const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: statePayload };
          // keepalive is supported in browsers for unload; TS lib may not include it in RequestInit in some targets
          (init as unknown as { keepalive?: boolean }).keepalive = true;
          await fetch("/api/account/characters/state", init);
        }
        if (!sent2) {
          const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: invPayload };
          (init as unknown as { keepalive?: boolean }).keepalive = true;
          await fetch("/api/account/characters/inventory", init);
        }
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
      if (showFurnace || showWorkbench) {
        setExpHud({ label: "Crafting EXP", value: craftingExpState, max: craftingMax });
      } else if (active === "CaveScene") {
        setExpHud({ label: "Mining EXP", value: miningExpState, max: miningMax });
      } else {
        setExpHud({ label: "Character EXP", value: charExp, max: charMax });
      }
    }, 800);
    // Periodically reconcile with DB as source of truth when no queues running
    const r = setInterval(() => {
      if (!character) return;
      if (furnaceRef.current || workRef.current) return; // don't override while crafting
      fetch(`/api/account/characters/inventory?characterId=${character.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const items = (data.items as Record<string, number>) || {};
          const g = gameRef.current; if (!g) return;
          g.registry.set("inventory", items);
          setInventory({ ...items });
        })
        .catch(() => {});
    }, 15000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [charExp, charMax, miningExpState, miningMax, showFurnace, showWorkbench, craftingExpState, craftingMax, character]);

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
  const saveSceneNow = useCallback(async (sceneOverride?: "Town" | "Cave" | "Slime") => {
    const game = gameRef.current; if (!game || !character) return;
    const scenes = game.scene.getScenes(true);
    const active = (sceneOverride ?? (scenes.length ? (scenes[0].scene.key.replace("Scene", "") as "Town" | "Cave" | "Slime") : "Town"));
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
      } else if (type === "crafting") {
        const prevLevel = (gameRef.current?.registry.get("craftingLevel") as number) ?? 1;
        setCraftingExpState(exp);
        setCraftingMax(reqCraft(level));
        const game = gameRef.current; if (game) game.registry.set("craftingLevel", level);
        if (level > prevLevel) pushToast(`Crafting Level Up! Lv ${prevLevel} → ${level}`);
      } else {
        const prev = charLevel;
        setCharExp(exp);
        setCharLevel(level);
        setCharMax(reqChar(level));
        if (level > prev) pushToast(`Level Up! Lv ${prev} → ${level}`);
      }
    };
    window.__openFurnace = () => setShowFurnace(true);
    window.__openWorkbench = () => setShowWorkbench(true);
    return () => {
      delete window.__saveSceneNow;
      delete window.__applyExpUpdate;
      delete window.__openFurnace;
      delete window.__openWorkbench;
    };
  }, [saveSceneNow, reqChar, reqMine, reqCraft, pushToast, charLevel]);

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

  // Furnace helpers: schedule looped smelting and cancel
  const scheduleNext: () => Promise<void> = useCallback(async () => {
    if (!character) return;
    const q = furnaceRef.current;
    if (!q) return;
    // Clear any existing timer
    if (furnaceTimerRef.current) {
      window.clearTimeout(furnaceTimerRef.current);
      furnaceTimerRef.current = null;
    }
    // Reset progress start time and keep ref in sync
    setFurnaceQueue((curr) => {
      if (!curr) return curr;
      const next = { ...curr, startedAt: Date.now() };
      furnaceRef.current = next;
      return next;
    });
  const per = (furnaceRef.current?.per ?? 4000);
  furnaceTimerRef.current = window.setTimeout(async () => {
      const game = gameRef.current; if (!game) return;
      const currQ = furnaceRef.current; if (!currQ) return; // canceled
      const recipe = currQ.recipe;
      // Output item
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (recipe === "copper") inv.copper_bar = (inv.copper_bar ?? 0) + 1; else inv.bronze_bar = (inv.bronze_bar ?? 0) + 1;
      game.registry.set("inventory", inv);
      // Persist inventory and award EXP
      await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
      const expPer = recipe === "copper" ? 2 : 3;
      const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.craftingExp === "number" && typeof data.craftingLevel === "number") {
          window.__applyExpUpdate?.({ type: "crafting", exp: data.craftingExp, level: data.craftingLevel });
        }
      }
      // Update remaining and schedule next if needed
      setFurnaceQueue((prev) => {
        if (!prev) { furnaceRef.current = null; return null; }
        const left = Math.max(0, prev.remaining - 1);
        if (left === 0) {
          furnaceRef.current = null;
          // Clear persisted furnace queue
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: null }) }).catch(() => {});
          return null;
        } else {
          const next = { ...prev, remaining: left, startedAt: Date.now() };
          furnaceRef.current = next;
          // Persist updated furnace queue
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: next }) }).catch(() => {});
          // Schedule next tick after state update completes
          setTimeout(() => scheduleNext(), 0);
          return next;
        }
      });
  }, per);
  }, [character]);

  const startSmelt = useCallback((recipe: "copper" | "bronze", count: number) => {
    if (!character || !gameRef.current) return;
    if (furnaceQueue) return; // already running
    const game = gameRef.current;
    // Gate bronze behind Crafting Lv 2
    const cLevel = (game.registry.get("craftingLevel") as number) ?? 1;
    if (recipe === "bronze" && cLevel < 2) return;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const needCopper = recipe === "copper" ? count : count; // 1 per
    const needTin = recipe === "bronze" ? count : 0;
    if ((inv.copper ?? 0) < needCopper || (inv.tin ?? 0) < needTin) return;
    // Deduct inputs up front
    inv.copper = (inv.copper ?? 0) - needCopper;
    if (needTin > 0) inv.tin = (inv.tin ?? 0) - needTin;
    game.registry.set("inventory", inv);
    fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    const perMs = recipe === "copper" ? 4000 : 6000;
  const q = { recipe, eta: perMs, startedAt: Date.now(), remaining: count, per: perMs, total: count } as const;
  furnaceRef.current = q as unknown as typeof furnaceQueue;
  setFurnaceQueue(q as unknown as typeof furnaceQueue);
  // Persist furnace queue start
  fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: q }) }).catch(() => {});
  // Start the scheduled loop now that ref/state are in sync
  scheduleNext();
  }, [character, furnaceQueue, scheduleNext]);

  const cancelSmelt = useCallback(() => {
    // Refund remaining inputs proportionally (only for items not yet processed)
    const q = furnaceRef.current; if (!q || !gameRef.current) { setFurnaceQueue(null); return; }
    if (furnaceTimerRef.current) { window.clearTimeout(furnaceTimerRef.current); furnaceTimerRef.current = null; }
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const remaining = Math.max(0, q.remaining ?? 0);
    if (remaining > 0) {
      // Each unit requires 1 copper (+1 tin if bronze)
      inv.copper = (inv.copper ?? 0) + remaining;
      if (q.recipe === "bronze") inv.tin = (inv.tin ?? 0) + remaining;
      game.registry.set("inventory", inv);
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (game.registry.get("characterId") as string), items: inv }) }).catch(() => {});
    }
    setFurnaceQueue(null);
    // Clear persisted furnace queue
    const cid = (gameRef.current?.registry.get("characterId") as string) || character?.id;
    if (cid) fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: cid, furnace: null }) }).catch(() => {});
  }, [character?.id]);

  // On mount: fetch queues, fast-forward elapsed completions, and resume
  useEffect(() => {
    const run = async () => {
      if (!character) return;
      try {
        const res = await fetch(`/api/account/characters/queue?characterId=${character.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const game = gameRef.current; if (!game) return;
        const inv = (game.registry.get("inventory") as Record<string, number>) || {};
        // Helper to process completions for a queue
        type FurnaceQ = { recipe: "copper" | "bronze"; eta: number; startedAt: number; remaining: number; per: number; total: number };
        type WorkbenchQ = { recipe: "armor" | "dagger"; eta: number; startedAt: number; remaining: number; per: number; total: number };
        const processQueue = async (q: FurnaceQ | WorkbenchQ | null, kind: "furnace" | "workbench") => {
          if (!q) return;
          const { recipe, startedAt, per, remaining, total } = q;
          const elapsed = Date.now() - (startedAt || Date.now());
          const done = Math.min(total, Math.floor(elapsed / Math.max(1, per)));
          const newRemaining = Math.max(0, remaining - done);
          // Award outputs and crafting EXP for done
          for (let i = 0; i < done; i++) {
            if (kind === "furnace") {
              if (recipe === "copper") inv.copper_bar = (inv.copper_bar ?? 0) + 1; else inv.bronze_bar = (inv.bronze_bar ?? 0) + 1;
              const expPer = recipe === "copper" ? 2 : 3;
              await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) }).catch(() => {});
              pushToast(`Completed ${recipe === "copper" ? "Copper Bar" : "Bronze Bar"} while offline`);
            } else {
              if (recipe === "armor") inv.copper_armor = (inv.copper_armor ?? 0) + 1; else inv.copper_dagger = (inv.copper_dagger ?? 0) + 1;
              const expPer = recipe === "armor" ? 6 : 4;
              await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) }).catch(() => {});
              pushToast(`Completed ${recipe === "armor" ? "Copper Armor" : "Copper Dagger"} while offline`);
            }
          }
          // Persist inventory after fast-forward
          await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
          game.registry.set("inventory", inv);
          // Resume if there is time left
          if (newRemaining > 0) {
            const remainderMs = Math.max(0, per - (elapsed % per));
            if (kind === "furnace") {
              if (recipe !== "copper" && recipe !== "bronze") { await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: null }) }).catch(() => {}); return; }
              const newQ: FurnaceQ = { recipe, eta: per, startedAt: Date.now() - (per - remainderMs), remaining: newRemaining, per, total };
              furnaceRef.current = newQ; setFurnaceQueue(newQ);
              await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, furnace: newQ }) }).catch(() => {});
              if (furnaceTimerRef.current) { clearTimeout(furnaceTimerRef.current); furnaceTimerRef.current = null; }
              setFurnaceQueue((prev) => prev ? { ...prev, startedAt: Date.now() - (per - remainderMs) } : prev);
              scheduleNext();
            } else {
              if (recipe !== "armor" && recipe !== "dagger") { await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: null }) }).catch(() => {}); return; }
              const newQ: WorkbenchQ = { recipe, eta: per, startedAt: Date.now() - (per - remainderMs), remaining: newRemaining, per, total };
              workRef.current = newQ; setWorkQueue(newQ);
              await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: newQ }) }).catch(() => {});
              if (workTimerRef.current) { clearTimeout(workTimerRef.current); workTimerRef.current = null; }
              setWorkQueue((prev) => prev ? { ...prev, startedAt: Date.now() - (per - remainderMs) } : prev);
              scheduleWorkNext();
            }
          } else {
            // Clear persisted queue if finished
            await fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, [kind]: null }) }).catch(() => {});
          }
        };
        await processQueue(data.furnace, "furnace");
        await processQueue(data.workbench, "workbench");
      } catch {}
    };
    run();
  }, [character, pushToast, scheduleNext, scheduleWorkNext]);

  

  // Workbench helpers: schedule looped crafting and cancel
  const scheduleWorkNext = useCallback(async () => {
    if (!character) return;
    const q = workRef.current; if (!q) return;
    if (workTimerRef.current) { window.clearTimeout(workTimerRef.current); workTimerRef.current = null; }
    // Reset start time for progress and keep ref sync
    setWorkQueue((curr) => {
      if (!curr) return curr;
      const next = { ...curr, startedAt: Date.now() };
      workRef.current = next;
      return next;
    });
    const per = (workRef.current?.per ?? 10000);
    workTimerRef.current = window.setTimeout(async () => {
      const game = gameRef.current; if (!game) return;
      const currQ = workRef.current; if (!currQ) return;
      // Produce output
      const inv = (game.registry.get("inventory") as Record<string, number>) || {};
      if (currQ.recipe === "armor") inv.copper_armor = (inv.copper_armor ?? 0) + 1; else inv.copper_dagger = (inv.copper_dagger ?? 0) + 1;
      game.registry.set("inventory", inv);
      // Persist and award crafting EXP
      await fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
      const expPer = currQ.recipe === "armor" ? 6 : 4;
      const res = await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, craftingExp: expPer }) });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.craftingExp === "number" && typeof data.craftingLevel === "number") {
          window.__applyExpUpdate?.({ type: "crafting", exp: data.craftingExp, level: data.craftingLevel });
        }
      }
      // Decrement and continue or clear
      setWorkQueue((prev) => {
        if (!prev) { workRef.current = null; return null; }
        const left = Math.max(0, prev.remaining - 1);
        if (left === 0) {
          workRef.current = null;
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: null }) }).catch(() => {});
          return null;
        } else {
          const next = { ...prev, remaining: left, startedAt: Date.now() };
          workRef.current = next;
          fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: next }) }).catch(() => {});
          setTimeout(() => scheduleWorkNext(), 0);
          return next;
        }
      });
    }, per);
  }, [character]);

  const startWork = useCallback((recipe: "armor" | "dagger", count: number) => {
    if (!character || !gameRef.current) return;
    if (workQueue) return;
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    if (recipe === "armor") {
      if ((inv.copper_bar ?? 0) < 3 * count) return;
      inv.copper_bar = (inv.copper_bar ?? 0) - (3 * count);
    } else {
      if ((inv.copper_bar ?? 0) < 1 * count || (inv.plank ?? 0) < 1 * count) return;
      inv.copper_bar = (inv.copper_bar ?? 0) - (1 * count);
      inv.plank = (inv.plank ?? 0) - (1 * count);
    }
    game.registry.set("inventory", inv);
    fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, items: inv }) }).catch(() => {});
    const perMs = recipe === "armor" ? 10000 : 7000;
    const q = { recipe, eta: perMs, startedAt: Date.now(), remaining: count, per: perMs, total: count } as const;
    workRef.current = q as unknown as typeof workQueue;
    setWorkQueue(q as unknown as typeof workQueue);
    fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: character.id, workbench: q }) }).catch(() => {});
    scheduleWorkNext();
  }, [character, workQueue, scheduleWorkNext]);

  const cancelWork = useCallback(() => {
    const q = workRef.current; if (!q || !gameRef.current) { setWorkQueue(null); return; }
    if (workTimerRef.current) { window.clearTimeout(workTimerRef.current); workTimerRef.current = null; }
    const game = gameRef.current;
    const inv = (game.registry.get("inventory") as Record<string, number>) || {};
    const remaining = Math.max(0, q.remaining ?? 0);
    if (remaining > 0) {
      if (q.recipe === "armor") {
        inv.copper_bar = (inv.copper_bar ?? 0) + (3 * remaining);
      } else {
        inv.copper_bar = (inv.copper_bar ?? 0) + (1 * remaining);
        inv.plank = (inv.plank ?? 0) + (1 * remaining);
      }
      game.registry.set("inventory", inv);
      fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (game.registry.get("characterId") as string), items: inv }) }).catch(() => {});
    }
    setWorkQueue(null);
    const cid = (gameRef.current?.registry.get("characterId") as string) || character?.id;
    if (cid) fetch("/api/account/characters/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: cid, workbench: null }) }).catch(() => {});
  }, [character?.id]);

  return (
    <div ref={ref} className="relative rounded-xl border border-white/10 overflow-hidden">
      {/* Toasts */}
      <div className="pointer-events-none absolute right-3 bottom-3 z-50 flex w-[min(320px,80vw)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-slide-up pointer-events-auto rounded-md border border-white/10 bg-black/80 px-3 py-2 text-xs text-gray-100 shadow-lg backdrop-blur">
            {t.text}
          </div>
        ))}
      </div>
      {character ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/40 px-3 py-2 text-xs text-gray-200 shadow-lg ring-1 ring-white/10">
          <div className="font-semibold text-white/90">{character.name}</div>
          <div className="opacity-80">
            {character.class} • Lv {charLevel}
            {(showFurnace || showWorkbench) ? (
              <> • Crafting Lv {gameRef.current?.registry.get("craftingLevel") ?? 1}</>
            ) : activeSceneKey === "CaveScene" ? (
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
              {Object.entries(inventory).map(([key, count]) => {
                const icon = (k: string) => {
                  if (k === "copper") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #f59e0b, #b45309)" }} />;
                  if (k === "tin") return <div className="h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #e5e7eb, #6b7280)" }} />;
                  if (k === "copper_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }} />;
                  if (k === "bronze_bar") return <div className="h-4 w-8 rounded" style={{ background: "linear-gradient(135deg, #b8860b, #6b4f1d)" }} />;
                  if (k === "plank") return <div className="h-5 w-8 rounded" style={{ background: "linear-gradient(135deg, #8b5e34, #5c3d1e)" }} />;
                  if (k === "copper_armor") return <div className="h-6 w-6 rounded" style={{ background: "radial-gradient(circle at 30% 30%, #b45309, #78350f)" }} title="Copper Armor" />;
                  if (k === "copper_dagger") return <div className="h-0 w-0 border-l-4 border-r-4 border-b-8" style={{ borderColor: "transparent transparent #b45309 transparent" }} title="Copper Dagger" />;
                  return <span className="select-none text-xs font-semibold" title={k}>{k.substring(0,2).toUpperCase()}</span>;
                };
                return (
                  <div key={key} className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900 to-black/60 p-2">
                    <div className="flex h-full w-full items-center justify-center" title={key}>
                      {icon(key)}
                    </div>
                    <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white/90 ring-1 ring-white/10">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Workbench Modal */}
      {showWorkbench && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(560px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Workbench</h3>
              <button className="btn px-3 py-1" onClick={() => setShowWorkbench(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Copper Armor</div>
                <div className="mt-1 text-gray-300">Costs: 3x Copper Bar • Time: 10s • +6 Crafting EXP</div>
                <button
                  className="btn mt-2 px-3 py-1 disabled:opacity-50"
                  disabled={!!workQueue || (inventory.copper_bar ?? 0) < 3}
                  onClick={() => startWork("armor", 1)}
                >Craft 1</button>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Copper Dagger</div>
                <div className="mt-1 text-gray-300">Costs: 1x Copper Bar, 1x Plank • Time: 7s • +4 Crafting EXP</div>
                <button
                  className="btn mt-2 px-3 py-1 disabled:opacity-50"
                  disabled={!!workQueue || (inventory.copper_bar ?? 0) < 1 || (inventory.plank ?? 0) < 1}
                  onClick={() => startWork("dagger", 1)}
                >Craft 1</button>
              </div>
            </div>
            {workQueue ? (
              <div className="mt-4 rounded border border-white/10 bg-black/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>Crafting {workQueue.recipe === "armor" ? "Copper Armor" : "Copper Dagger"}…</div>
                  <button className="btn px-2 py-1" onClick={() => cancelWork()}>Cancel</button>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-white/10">
                  {(() => {
                    const finished = (workQueue.total - workQueue.remaining);
                    const elapsed = (finished * workQueue.per) + (Date.now() - workQueue.startedAt);
                    const totalMs = workQueue.total * workQueue.per;
                    const pct = Math.min(100, (elapsed / Math.max(1, totalMs)) * 100);
                    return <div className="h-2 rounded bg-blue-500" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Furnace Modal */}
      {showFurnace && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Furnace</h3>
              <button className="btn px-3 py-1" onClick={() => setShowFurnace(false)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Copper Bar</div>
                <div className="mt-1 text-gray-300">Costs: 1x Copper Ore • Time: 4s • +2 Crafting EXP</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || (inventory.copper ?? 0) < 1} onClick={() => startSmelt("copper", 1)}>Smelt 1</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || (inventory.copper ?? 0) < 5} onClick={() => startSmelt("copper", 5)}>x5</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || (inventory.copper ?? 0) < 10} onClick={() => startSmelt("copper", 10)}>x10</button>
                </div>
              </div>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <div className="font-semibold text-white/90">Bronze Bar</div>
                <div className="mt-1 text-gray-300">Costs: 1x Copper Ore, 1x Tin Ore • Time: 6s • +3 Crafting EXP</div>
                {((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 ? (
                  <div className="mt-1 text-xs text-yellow-400">Requires Crafting Lv 2</div>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || ((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 || (inventory.copper ?? 0) < 1 || (inventory.tin ?? 0) < 1} onClick={() => startSmelt("bronze", 1)}>Smelt 1</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || ((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 || (inventory.copper ?? 0) < 5 || (inventory.tin ?? 0) < 5} onClick={() => startSmelt("bronze", 5)}>x5</button>
                  <button className="btn px-3 py-1 disabled:opacity-50" disabled={!!furnaceQueue || ((gameRef.current?.registry.get("craftingLevel") as number) ?? 1) < 2 || (inventory.copper ?? 0) < 10 || (inventory.tin ?? 0) < 10} onClick={() => startSmelt("bronze", 10)}>x10</button>
                </div>
              </div>
            </div>
            {furnaceQueue ? (
              <div className="mt-4 rounded border border-white/10 bg-black/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>Smelting {furnaceQueue.recipe === "copper" ? "Copper Bar" : "Bronze Bar"}… {furnaceQueue.remaining > 1 ? `(x${furnaceQueue.remaining} left)` : null}</div>
                  <button className="btn px-2 py-1" onClick={cancelSmelt}>Cancel</button>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-white/10">
                  {(() => {
                    const finished = (furnaceQueue.total - furnaceQueue.remaining);
                    const elapsed = (finished * furnaceQueue.per) + (Date.now() - furnaceQueue.startedAt);
                    const totalMs = furnaceQueue.total * furnaceQueue.per;
                    const pct = Math.min(100, (elapsed / Math.max(1, totalMs)) * 100);
                    return <div className="h-2 rounded bg-orange-500" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
              </div>
            ) : null}
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
