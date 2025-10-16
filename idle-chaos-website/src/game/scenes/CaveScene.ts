import * as Phaser from "phaser";
import { ensureGroundTexture, ensureCircleTexture, ensurePortalTexture, setupOverheadSpawner, updateNameTag, isTyping } from "./common";

export class CaveScene extends Phaser.Scene {
  constructor() { super("CaveScene"); }
  private onResizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private player!: Phaser.Physics.Arcade.Image;
  private groundRect!: Phaser.GameObjects.Rectangle;
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private eKey!: Phaser.Input.Keyboard.Key;
  private nameTag!: Phaser.GameObjects.Text;
  private copperCount = 0;
  private tinCount = 0;
  private copperNode!: Phaser.GameObjects.Image;
  private tinNode!: Phaser.GameObjects.Image;

  create() {
    this.game.registry.set("currentScene", "Cave");
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Cave", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5);

    // ground
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x111827).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    const groundKey = ensureGroundTexture(this, "groundTex2", 4);
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, groundKey);
    ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();

    // Player
    ensureCircleTexture(this, "playerTex2", 8, 0xffffff);
    const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "town", portal: "cave" };
    const x = spawn.from === "town" ? 100 : 100;
    this.player = this.physics.add.image(x, this.groundRect.y - 60, "playerTex2").setTint(0xf59e0b);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    const cname = String(this.game.registry.get("characterName") || "You");
    this.nameTag = this.add.text(this.player.x, this.player.y - 24, cname, { color: "#e5e7eb", fontSize: "11px" }).setOrigin(0.5).setDepth(10);

    // Nodes
    const drawNode = (key: string, color: number) => {
      if (this.textures.exists(key)) return;
      const gr = this.add.graphics(); gr.fillStyle(color, 1); gr.fillCircle(10, 10, 10); gr.generateTexture(key, 20, 20); gr.destroy();
    };
    drawNode("copperNode", 0xb45309);
    drawNode("tinNode", 0x9ca3af);
    this.copperNode = this.add.image(center.x - 120, this.groundRect.y - 20, "copperNode");
    this.tinNode = this.add.image(center.x + 120, this.groundRect.y - 20, "tinNode");
    this.add.text(this.copperNode.x, this.copperNode.y - 24, "Copper", { color: "#fbbf24", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.tinNode.x, this.tinNode.y - 24, "Tin", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5);

    // AFK mining timers
    ensureCircleTexture(this, "dot", 7, 0xffffff);
    this.time.addEvent({ delay: 2500, loop: true, callback: () => {
      const miningLevel = (this.game.registry.get("miningLevel") as number) ?? 1;
      if (miningLevel >= 1 && this.isNearNode(this.copperNode)) {
        this.copperCount += 1; this.miningFx(this.copperNode); this.updateHUD();
        fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (this.game.registry.get("characterId") as string), miningExp: 3 }) })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => { if (data && typeof data.miningExp === "number" && typeof data.miningLevel === "number") (window as any).__applyExpUpdate?.({ type: "mining", exp: data.miningExp, level: data.miningLevel }); })
          .catch(() => {});
      }
    }});
    this.time.addEvent({ delay: 3500, loop: true, callback: () => {
      const miningLevel = (this.game.registry.get("miningLevel") as number) ?? 1;
      if (miningLevel >= 1 && this.isNearNode(this.tinNode)) {
        this.tinCount += 1; this.miningFx(this.tinNode); this.updateHUD();
        fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: (this.game.registry.get("characterId") as string), miningExp: 3 }) })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => { if (data && typeof data.miningExp === "number" && typeof data.miningLevel === "number") (window as any).__applyExpUpdate?.({ type: "mining", exp: data.miningExp, level: data.miningLevel }); })
          .catch(() => {});
      }
    }});

    // Exit portal
    ensurePortalTexture(this, "portalExit", 0x1d4ed8, 24, 44, 10);
    const exitPortal = this.physics.add.staticImage(60, this.groundRect.y - 22, "portalExit");
    this.add.text(exitPortal.x, exitPortal.y - 38, "To Town", { color: "#93c5fd", fontSize: "12px" }).setOrigin(0.5);

    // Input
    this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as any;
    this.eKey = this.input.keyboard!.addKey("E", true, true);

    // Resize handling
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.onResizeHandler = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width; const h = gameSize.height;
      if (!this.groundRect || !ground) return;
      this.groundRect.setPosition(w / 2, h - 40).setSize(w * 0.9, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y);
      ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
      exitPortal.setPosition(60, this.groundRect.y - 22);
      this.physics.world.setBounds(0, 0, w, h);
    };
    this.scale.on("resize", this.onResizeHandler);

    // Overhead spawner
    setupOverheadSpawner(this, () => ({ x: this.player.x, y: this.player.y }));

    this.events.on("shutdown", () => { if (this.onResizeHandler) this.scale.off("resize", this.onResizeHandler); });
  }

  private isNearNode(node: Phaser.GameObjects.Image) {
    if (!this.player) return false;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
    return d < 60;
  }

  private miningFx(node: Phaser.GameObjects.Image) {
    this.tweens.add({ targets: this.player, scaleX: 0.9, scaleY: 1.1, yoyo: true, duration: 120, ease: "Sine.easeInOut" });
    const makeSpark = () => {
      const img = this.add.image(node.x + Phaser.Math.Between(-6, 6), node.y + Phaser.Math.Between(-8, 0), "dot");
      img.setTint(0xfbbf24).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.4, 0.7));
      this.tweens.add({ targets: img, y: img.y - 8, alpha: 0, duration: 220, ease: "Sine.easeOut", onComplete: () => img.destroy() });
    };
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 20, makeSpark);

    const inv = (this.game.registry.get("inventory") as Record<string, number>) || {};
    const key = node === this.copperNode ? "copper" : "tin";
    inv[key] = (inv[key] ?? 0) + 1;
    this.game.registry.set("inventory", inv);
    const cid = (this.game.registry.get("characterId") as string) || "";
    if (cid) { fetch("/api/account/characters/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: cid, items: inv }) }).catch(() => {}); }
  }

  // HUD placeholder
  private updateHUD() {}

  update() {
    if (!this.player || !this.cursors) return;
    const typing = isTyping();
    const speed = 220; let vx = 0;
    if (!typing) {
      if (this.cursors.A.isDown) vx -= speed; if (this.cursors.D.isDown) vx += speed; this.player.setVelocityX(vx);
      const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down; if (this.cursors.W.isDown && onFloor) this.player.setVelocityY(-420);
    } else { this.player.setVelocityX(0); }
    updateNameTag(this.nameTag, this.player);
    if (!typing && Phaser.Input.Keyboard.JustDown(this.eKey) && this.player.x < 100) {
      this.game.registry.set("spawn", { from: "cave", portal: "town" });
      (window as any).__saveSceneNow?.("Town");
      this.scene.start("TownScene");
    }
  }
}

export default CaveScene;
