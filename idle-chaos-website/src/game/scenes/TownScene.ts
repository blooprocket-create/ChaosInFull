import * as Phaser from "phaser";
import { ensureGroundTexture, ensurePortalTexture, ensureCircleTexture, setupOverheadSpawner, updateNameTag, isTyping, parseOverheadEffects, spawnOverhead } from "./common";
import api from "../services/api";

export class TownScene extends Phaser.Scene {
  constructor() { super("TownScene"); }
  private onResizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private eKey!: Phaser.Input.Keyboard.Key;
  private platformCollider?: Phaser.Physics.Arcade.Collider;
  private groundRect!: Phaser.GameObjects.Rectangle;
  private upperPlatformRect!: Phaser.GameObjects.Rectangle;
  private upperPlatformBody!: Phaser.Physics.Arcade.Image;
  private cavePortal!: Phaser.Physics.Arcade.Image;
  private slimePortal!: Phaser.Physics.Arcade.Image;
  private cavePrompt!: Phaser.GameObjects.Text;
  private slimePrompt!: Phaser.GameObjects.Text;
  private furnace!: Phaser.Physics.Arcade.Image;
  private furnacePrompt!: Phaser.GameObjects.Text;
  private workbench!: Phaser.Physics.Arcade.Image;
  private workbenchPrompt!: Phaser.GameObjects.Text;
  private sawmill!: Phaser.Physics.Arcade.Image;
  private sawmillPrompt!: Phaser.GameObjects.Text;
  private shopStall!: Phaser.Physics.Arcade.Image;
  private shopPrompt!: Phaser.GameObjects.Text;
  private storageBox!: Phaser.Physics.Arcade.Image;
  private storagePrompt!: Phaser.GameObjects.Text;
  private tutorialNpc!: Phaser.GameObjects.Image;
  private tutorIcon!: Phaser.GameObjects.Text;
  private nameTag!: Phaser.GameObjects.Text;
  private others = new Map<string, { sprite: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text }>();
  private presenceTimer?: Phaser.Time.TimerEvent;

  create() {
    this.game.registry.set("currentScene", "Town");
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Town", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5);
    // Visible ground and static body
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x3b0764).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    const groundKey = ensureGroundTexture(this, "groundTex", 4);
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, groundKey);
    ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();

    // Upper platform one-way
    this.upperPlatformRect = this.add.rectangle(center.x + 60, this.scale.height - 110, this.scale.width * 0.5, 10, 0x4c1d95).setOrigin(0.5);
    this.upperPlatformRect.setStrokeStyle(1, 0xffffff, 0.15);
    this.upperPlatformBody = this.physics.add.staticImage(this.upperPlatformRect.x, this.upperPlatformRect.y, groundKey);
    this.upperPlatformBody.displayWidth = this.upperPlatformRect.width; this.upperPlatformBody.displayHeight = this.upperPlatformRect.height; this.upperPlatformBody.refreshBody();

    // Portals
    ensurePortalTexture(this, "portalBlue", 0x1d4ed8);
    ensurePortalTexture(this, "portalGreen", 0x16a34a);
    this.cavePortal = this.physics.add.staticImage(80, this.groundRect.y - 24, "portalBlue");
    this.slimePortal = this.physics.add.staticImage(this.scale.width - 80, this.groundRect.y - 24, "portalGreen");

    // Workstations and props
    const f = this.add.graphics(); f.fillStyle(0x9a3412, 1); f.fillRoundedRect(0, 0, 36, 28, 6); f.fillStyle(0xf97316, 1); f.fillCircle(28, 20, 6); f.generateTexture("furnaceTex", 36, 28); f.destroy();
    this.furnace = this.physics.add.staticImage(center.x + 120, this.groundRect.y - 14, "furnaceTex");

    const wbx = this.add.graphics(); wbx.fillStyle(0x374151, 1); wbx.fillRoundedRect(0, 0, 46, 16, 4); wbx.fillStyle(0x9ca3af, 1); wbx.fillRect(6, 2, 34, 4); wbx.generateTexture("workbenchTex", 46, 16); wbx.destroy();
    this.workbench = this.physics.add.staticImage(center.x - 120, this.groundRect.y - 8, "workbenchTex");

    const smg = this.add.graphics(); smg.fillStyle(0x8b5e34, 1); smg.fillRect(0, 0, 42, 14); smg.fillStyle(0x5c3d1e, 1); smg.fillRect(2, 2, 38, 10); smg.generateTexture("sawmillTex", 42, 14); smg.destroy();
    this.sawmill = this.physics.add.staticImage(center.x - 200, this.groundRect.y - 9, "sawmillTex");

    const sboxg = this.add.graphics(); sboxg.fillStyle(0x8b5e34, 1); sboxg.fillRoundedRect(0, 0, 20, 16, 3); sboxg.lineStyle(2, 0x5c3d1e, 1); sboxg.strokeRoundedRect(0, 0, 20, 16, 3); sboxg.generateTexture("storageBoxTex", 20, 16); sboxg.destroy();
    this.storageBox = this.physics.add.staticImage(this.upperPlatformRect.x + this.upperPlatformRect.width / 2 - 30, this.upperPlatformRect.y - 12, "storageBoxTex");
    this.storagePrompt = this.add.text(this.storageBox.x, this.storageBox.y - 28, "Press E: Storage", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);

    const shopg = this.add.graphics(); shopg.fillStyle(0x7c3aed, 1); shopg.fillRoundedRect(0, 0, 26, 18, 3); shopg.lineStyle(2, 0xf5d0fe, 1); shopg.strokeRoundedRect(0, 0, 26, 18, 3); shopg.generateTexture("shopStallTex", 26, 18); shopg.destroy();
    this.shopStall = this.physics.add.staticImage(this.upperPlatformRect.x, this.upperPlatformRect.y - 14, "shopStallTex");

    const npcG = this.add.graphics(); npcG.fillStyle(0x60a5fa, 1); npcG.fillCircle(8, 8, 8); npcG.generateTexture("tutorialNpcTex", 16, 16); npcG.destroy();
    this.tutorialNpc = this.add.image(this.upperPlatformRect.x - this.upperPlatformRect.width / 2 + 30, this.upperPlatformRect.y - 15, "tutorialNpcTex");
    this.add.text(this.tutorialNpc.x, this.tutorialNpc.y - 20, "Grimsley", { color: "#c7d2fe", fontSize: "10px" }).setOrigin(0.5);
    this.tutorIcon = this.add.text(this.tutorialNpc.x, this.tutorialNpc.y - 34, "", { color: "#fef08a", fontSize: "14px" }).setOrigin(0.5).setVisible(false);
    this.add.text(this.tutorialNpc.x, this.tutorialNpc.y - 32, "Press E to Talk", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);

    // Labels
    this.add.text(this.cavePortal.x, this.cavePortal.y - 40, "Cave", { color: "#93c5fd", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.slimePortal.x, this.slimePortal.y - 40, "Slime Field", { color: "#86efac", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.furnace.x, this.furnace.y - 36, "Furnace", { color: "#fca5a5", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.workbench.x, this.workbench.y - 28, "Workbench", { color: "#c7d2fe", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.sawmill.x, this.sawmill.y - 26, "Sawmill", { color: "#fde68a", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.storageBox.x, this.storageBox.y - 40, "Storage", { color: "#fde68a", fontSize: "12px" }).setOrigin(0.5);
    this.add.text(this.shopStall.x, this.shopStall.y - 34, "Shop", { color: "#d8b4fe", fontSize: "12px" }).setOrigin(0.5);
    // Prompts
    this.cavePrompt = this.add.text(this.cavePortal.x, this.cavePortal.y - 60, "Press E to Enter", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
    this.slimePrompt = this.add.text(this.slimePortal.x, this.slimePortal.y - 60, "Press E to Enter", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
    this.furnacePrompt = this.add.text(this.furnace.x, this.furnace.y - 48, "Press E to Use", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
    this.workbenchPrompt = this.add.text(this.workbench.x, this.workbench.y - 32, "Press E to Craft", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
    this.sawmillPrompt = this.add.text(this.sawmill.x, this.sawmill.y - 30, "Press E to Cut", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);
    this.shopPrompt = this.add.text(this.shopStall.x, this.shopStall.y - 32, "Press E: Shop", { color: "#e5e7eb", fontSize: "12px" }).setOrigin(0.5).setVisible(false);

    // Player
    ensureCircleTexture(this, "playerTex", 8, 0xffffff);
    const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "initial", portal: null };
    const townSpawnX = spawn.from === "cave" ? this.cavePortal.x + 50 : spawn.from === "slime" ? this.slimePortal.x - 50 : center.x;
    this.player = this.physics.add.image(townSpawnX, this.groundRect.y - 60, "playerTex");
    this.player.setTint(0x9b87f5).setBounce(0.1).setCollideWorldBounds(true).setDepth(5);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900);

    // One-way platform filter
    this.platformCollider = this.physics.add.collider(this.player, this.upperPlatformBody, undefined, () => {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const falling = body.velocity.y >= 0;
      const feetY = this.player.y + (this.player.displayHeight / 2);
      const platTop = this.upperPlatformRect.y - (this.upperPlatformRect.height / 2);
      return falling && feetY <= platTop + 6;
    });
    this.input.keyboard!.on("keydown-S", () => {
      if (isTyping()) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body; if (!body) return;
      const feetY = this.player.y + (this.player.displayHeight / 2);
      const platTop = this.upperPlatformRect.y - (this.upperPlatformRect.height / 2);
      const onPlatform = Math.abs(feetY - platTop) <= 10 && body.velocity.y === 0;
      if (!onPlatform) return;
      const groundTop = this.groundRect.y - (this.groundRect.height / 2);
      if (groundTop - platTop < 40) return;
      const platformCollider = this.platformCollider; if (!platformCollider) return;
      platformCollider.active = false; body.setVelocityY(220);
      this.time.delayedCall(350, () => { platformCollider.active = true; });
    });
    // Collide ground
    this.physics.add.collider(this.player, ground);

    // Name tag
    const cname = String(this.game.registry.get("characterName") || "You");
    this.nameTag = this.add.text(this.player.x, this.player.y - 24, cname, { color: "#e5e7eb", fontSize: "11px" }).setOrigin(0.5).setDepth(10);

    // Input
  this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    this.eKey = this.input.keyboard!.addKey("E", true, true);
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    // Resize
    this.onResizeHandler = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width; const h = gameSize.height;
      if (!this.groundRect || !ground) return;
      this.groundRect.setPosition(w / 2, h - 40).setSize(w * 0.9, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y);
      ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
      this.cavePortal.setPosition(80, this.groundRect.y - 24);
      this.slimePortal.setPosition(w - 80, this.groundRect.y - 24);
      this.furnace.setPosition(w / 2 + 120, this.groundRect.y - 14);
      this.workbench.setPosition(w / 2 - 120, this.groundRect.y - 8);
      this.sawmill.setPosition(w / 2 - 200, this.groundRect.y - 9);
      this.upperPlatformRect.setPosition(w / 2 + 60, h - 110).setSize(w * 0.5, 10);
      this.upperPlatformBody.setPosition(this.upperPlatformRect.x, this.upperPlatformRect.y);
      this.upperPlatformBody.displayWidth = this.upperPlatformRect.width; this.upperPlatformBody.displayHeight = this.upperPlatformRect.height; this.upperPlatformBody.refreshBody();
      this.storageBox.setPosition(this.upperPlatformRect.x + this.upperPlatformRect.width / 2 - 30, this.upperPlatformRect.y - 12);
      this.storagePrompt.setPosition(this.storageBox.x, this.storageBox.y - 28);
      this.shopStall.setPosition(this.upperPlatformRect.x, this.upperPlatformRect.y - 14);
      this.shopPrompt.setPosition(this.shopStall.x, this.shopStall.y - 32);
      this.tutorialNpc.setPosition(this.upperPlatformRect.x - this.upperPlatformRect.width / 2 + 30, this.upperPlatformRect.y - 15);
      this.tutorIcon.setPosition(this.tutorialNpc.x, this.tutorialNpc.y - 34);
      this.cavePrompt.setPosition(this.cavePortal.x, this.cavePortal.y - 60);
      this.slimePrompt.setPosition(this.slimePortal.x, this.slimePortal.y - 60);
      this.furnacePrompt.setPosition(this.furnace.x, this.furnace.y - 48);
      this.workbenchPrompt.setPosition(this.workbench.x, this.workbench.y - 32);
      this.sawmillPrompt.setPosition(this.sawmill.x, this.sawmill.y - 30);
      this.storagePrompt.setPosition(this.storageBox.x, this.storageBox.y - 28);
      this.physics.world.setBounds(0, 0, w, h);
    };
    this.scale.on("resize", this.onResizeHandler);

    // Hydrate tutorial quest icon state
    (async () => {
      try {
        const cid = String(this.game.registry.get("characterId") || "");
        if (!cid) return;
        const data = await api.fetchQuests(cid).catch(() => null);
        if (!data) return;
  const cqs = (data.characterQuests as Array<{ questId: string; status: "AVAILABLE"|"ACTIVE"|"COMPLETED" }> | undefined) || [];
  const tut = cqs.find(q => q.questId === "tutorial_kill_slimes_5");
  if (tut?.status === "ACTIVE" || tut?.status === "COMPLETED") this.game.registry.set("tutorialStarted", true);
  // Icon behavior: '!' when not accepted (missing or AVAILABLE), '?' gray when ACTIVE, '?' green when COMPLETED
  if (!tut || tut.status === "AVAILABLE") { this.tutorIcon.setVisible(true).setColor("#fef08a").setText("!"); }
  else if (tut.status === "COMPLETED") { this.tutorIcon.setVisible(true).setColor("#86efac").setText("?"); }
  else { this.tutorIcon.setVisible(true).setColor("#cbd5e1").setText("?"); }
      } catch {}
    })();

    // Ambient dots
    ensureCircleTexture(this, "dot", 7, 0xffffff);
    const NUM_DOTS = 40;
    const spawnArea = () => ({ x: Phaser.Math.Between(0, this.scale.width), y: Phaser.Math.Between(0, this.scale.height) });
    const animate = (img: Phaser.GameObjects.Image) => {
      const drift = 18;
      const toX = Phaser.Math.Clamp(img.x + Phaser.Math.Between(-drift, drift), 0, this.scale.width);
      const toY = Phaser.Math.Clamp(img.y + Phaser.Math.Between(-drift, drift), 0, this.scale.height);
      const duration = Phaser.Math.Between(2200, 4800);
      const startAlpha = 0.12 + Math.random() * 0.08;
      this.tweens.add({ targets: img, x: toX, y: toY, alpha: { from: startAlpha, to: 0 }, scale: { from: img.scale, to: 0 }, duration, ease: "Sine.easeOut", onComplete: () => {
        const p = spawnArea(); img.setPosition(p.x, p.y); img.setScale(Phaser.Math.FloatBetween(0.35, 0.8)); img.setAlpha(0); img.setTint(Math.random() > 0.5 ? 0xbe18ff : 0xef4444);
        this.time.delayedCall(Phaser.Math.Between(100, 900), () => animate(img));
      }});
    };
    for (let i = 0; i < NUM_DOTS; i++) {
      const p = spawnArea(); const img = this.add.image(p.x, p.y, "dot");
      img.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(Phaser.Math.FloatBetween(0.35, 0.8)).setTint(Math.random() > 0.5 ? 0xbe18ff : 0xef4444);
      this.time.delayedCall(Phaser.Math.Between(0, 2000), () => animate(img));
    }

    // Overhead
    setupOverheadSpawner(this, () => ({ x: this.player.x, y: this.player.y }));
    // Allow chat client to render overhead for a specific characterId (self or others)
    const selfCid = String(this.game.registry.get("characterId") || "");
    window.__spawnOverheadFor = (charId: string, text: string) => {
      try {
        const { text: cleaned, opts } = parseOverheadEffects(text);
        if (charId && charId === selfCid) {
          spawnOverhead(this, () => ({ x: this.player.x, y: this.player.y }), cleaned, opts);
          return;
        }
        const other = charId ? this.others.get(charId) : undefined;
        if (other) {
          spawnOverhead(this, () => ({ x: other.sprite.x, y: other.sprite.y }), cleaned, opts);
        }
      } catch {}
    };

    // Presence heartbeat + polling
  const cid = String(this.game.registry.get("characterId") || "");
  const cname2 = String(this.game.registry.get("characterName") || "You");
    if (cid) {
      const sendHeartbeat = async () => {
        try {
          await fetch("/api/world/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone: "Town", characterId: cid, name: cname2, x: this.player.x, y: this.player.y }) });
        } catch {}
      };
      const pollOthers = async () => {
        try {
          const res = await fetch(`/api/world/presence?zone=Town&characterId=${encodeURIComponent(cid)}`);
          const data = await res.json().catch(() => ({ players: [] as Array<{ id: string; name: string; x: number; y: number }> }));
          const players: Array<{ id: string; name: string; x: number; y: number }> = Array.isArray(data.players) ? data.players : [];
          const seen = new Set(players.map(p => p.id));
          // Remove missing
          for (const [id, obj] of this.others) { if (!seen.has(id)) { obj.sprite.destroy(); obj.tag.destroy(); this.others.delete(id); } }
          // Upsert others
          for (const p of players) {
            let obj = this.others.get(p.id);
            if (!obj) {
              const dot = this.add.image(p.x, p.y, "dot").setTint(0xffffff).setScale(0.6).setAlpha(0.9).setDepth(4);
              const tag = this.add.text(p.x, p.y - 18, p.name || "Player", { color: "#9ca3af", fontSize: "10px" }).setOrigin(0.5).setDepth(5);
              obj = { sprite: dot, tag }; this.others.set(p.id, obj);
            }
            obj.sprite.setPosition(p.x, p.y);
            obj.tag.setPosition(p.x, p.y - 18).setText(p.name || "Player");
          }
        } catch {}
      };
      // Staggered: heartbeat every 2.5s, poll others every 2.5s offset by 1.25s
      this.time.addEvent({ delay: 2500, loop: true, callback: sendHeartbeat });
      this.presenceTimer = this.time.addEvent({ delay: 2500, loop: true, callback: pollOthers, startAt: 1250 });
      // Fire initial immediately
      void sendHeartbeat(); void pollOthers();
    }

    // Cleanup
    this.events.on("shutdown", () => {
      if (this.onResizeHandler) this.scale.off("resize", this.onResizeHandler);
      if (this.presenceTimer) { this.presenceTimer.remove(false); this.presenceTimer = undefined; }
      for (const obj of this.others.values()) { obj.sprite.destroy(); obj.tag.destroy(); }
      this.others.clear();
      // Unhook overhead-for when scene closes
      if (window.__spawnOverheadFor) window.__spawnOverheadFor = undefined;
    });
  }

  update() {
    if (!this.player || !this.cursors) return;
    const typing = isTyping();
    const speed = 220; let vx = 0;
    if (!typing) {
      if (this.cursors.A.isDown) vx -= speed; if (this.cursors.D.isDown) vx += speed; this.player.setVelocityX(vx);
      const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
      if (this.cursors.W.isDown && onFloor) this.player.setVelocityY(-420);
    } else { this.player.setVelocityX(0); }

    // Prompts & ranges
    const dist = (a: Phaser.GameObjects.Image, b: Phaser.GameObjects.Image | Phaser.Physics.Arcade.Image) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    const nearCave = dist(this.player, this.cavePortal) < 60;
    const nearSlime = dist(this.player, this.slimePortal) < 60;
    const nearFurnace = dist(this.player, this.furnace) < 60;
    const nearWorkbench = dist(this.player, this.workbench) < 60;
    const nearSawmill = dist(this.player, this.sawmill) < 60;
    const nearStorage = dist(this.player, this.storageBox) < 60;
    const nearShop = dist(this.player, this.shopStall) < 60;
    const nearTutor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.tutorialNpc.x, this.tutorialNpc.y) < 60;

    this.cavePrompt.setVisible(nearCave);
    const tutorialStarted = !!this.game.registry.get("tutorialStarted");
    this.slimePrompt.setText(tutorialStarted ? "Press E to Enter" : "Portal sealed—begin Tutorial").setVisible(nearSlime);
    this.furnacePrompt.setVisible(nearFurnace);
    this.workbenchPrompt.setVisible(nearWorkbench);
    this.sawmillPrompt.setVisible(nearSawmill);
    this.shopPrompt.setVisible(nearShop);
    this.storagePrompt.setVisible(nearStorage);
    const tPrompt = this.children.getAll().find((obj): obj is Phaser.GameObjects.Text => {
      const t = obj as Phaser.GameObjects.Text;
      return typeof (t as unknown as { text?: string }).text === "string" && t.text === "Press E to Talk";
    });
    if (tPrompt) tPrompt.setVisible(nearTutor);
    updateNameTag(this.nameTag, this.player);

    // Auto-close modals when leaving range
  if (!nearFurnace) window.__closeFurnace?.();
  if (!nearWorkbench) window.__closeWorkbench?.();
  if (!nearSawmill) window.__closeSawmill?.();
  if (!nearStorage) window.__closeStorage?.();
  if (!nearShop) window.__closeShop?.();

    if (!typing && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (nearCave) {
        this.game.registry.set("spawn", { from: "cave", portal: "town" });
  window.__saveSceneNow?.("Cave");
        this.scene.start("CaveScene");
      } else if (nearSlime && tutorialStarted) {
        this.game.registry.set("spawn", { from: "slime", portal: "town" });
  window.__saveSceneNow?.("Slime");
        this.scene.start("SlimeFieldScene");
      } else if (nearTutor) {
        const started = !!this.game.registry.get("tutorialStarted");
        const cid = String(this.game.registry.get("characterId") || "");
        if (!started) {
          window.__spawnOverhead?.(":purple: Grimsley: The portal laughs at cowards. Pop 5 slimes.", { wave: true });
          if (cid) {
            api.questAccept(cid).then(async res => {
              if (res.ok) {
                this.game.registry.set("tutorialStarted", true);
                // Bump quest dirty count so QuestPanel refreshes
                const qd = this.game.registry.get("questDirtyCount") as number | undefined;
                this.game.registry.set("questDirtyCount", (qd ?? 0) + 1);
                // Refresh icon to '?' (active)
                try {
                  type CQ = { questId: string; status: "AVAILABLE"|"ACTIVE"|"COMPLETED" };
                  const data = (await api.fetchQuests(cid).catch(() => ({ characterQuests: [] as CQ[] }))) as { characterQuests: CQ[] };
                  const tut = data.characterQuests.find(q=>q.questId === "tutorial_kill_slimes_5");
                  if (tut?.status === "ACTIVE") this.tutorIcon.setVisible(true).setColor("#cbd5e1").setText("?");
                } catch {}
              } else {
                // Show lock reasons if any
                try { const payload = await res.json(); if (payload?.locked && Array.isArray(payload.reasons) && payload.reasons.length) { window.__spawnOverhead?.(`:red: ${payload.reasons.join(", ")}`); } } catch {}
              }
            }).catch(()=>{});
          }
        } else {
          (async () => {
            try {
              type CQ = { questId: string; status: string };
              const data = (await api.fetchQuests(cid).catch(() => ({ characterQuests: [] as CQ[] }))) as { characterQuests: CQ[] };
              const list: CQ[] = Array.isArray(data.characterQuests) ? data.characterQuests : [];
              const tut = list.find(q=>q.questId === "tutorial_kill_slimes_5");
              if (tut?.status === "COMPLETED") {
                const hand = await api.questComplete(cid, "tutorial_kill_slimes_5");
                const payload = await hand.json().catch(()=>({}));
                if (payload?.rewards?.gold) window.__spawnOverhead?.(":yellow: +500 gold", { ripple: true });
                if (typeof payload?.exp === 'number' && typeof payload?.level === 'number') {
                  window.__applyExpUpdate?.({ type: 'character', exp: payload.exp, level: payload.level });
                }
                const data2 = (await api.fetchQuests(cid).catch(() => ({ characterQuests: [] as CQ[] }))) as { characterQuests: CQ[] };
                const list2: CQ[] = Array.isArray(data2.characterQuests) ? data2.characterQuests : [];
                const tut2 = list2.find(q=>q.questId === "tutorial_kill_slimes_5");
                if (tut2?.status === "COMPLETED") this.tutorIcon.setVisible(true).setColor("#86efac").setText("?");
                // Bump questDirtyCount so QuestPanel auto-refresh can hide handed-in quest
                const qd = this.game.registry.get("questDirtyCount") as number | undefined;
                this.game.registry.set("questDirtyCount", (qd ?? 0) + 1);
                window.__spawnOverhead?.(":blue: Grimsley: The portal should stop laughing now.");
              } else {
                window.__spawnOverhead?.(":blue: Grimsley: Goo awaits.");
              }
            } catch { window.__spawnOverhead?.(":blue: Grimsley: Goo awaits."); }
          })();
        }
      } else if (nearFurnace) {
  window.__openFurnace?.();
      } else if (nearWorkbench) {
  window.__openWorkbench?.();
      } else if (nearSawmill) {
  window.__openSawmill?.();
      } else if (nearShop) {
  window.__openShop?.();
      } else if (nearStorage) {
  window.__openStorage?.();
      }
    }
  }
}

export default TownScene;
