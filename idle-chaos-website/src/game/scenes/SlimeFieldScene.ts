import * as Phaser from "phaser";
import { ensureGroundTexture, ensureCircleTexture, ensurePortalTexture, setupOverheadSpawner, updateNameTag, isTyping, setupEPortal, EPortalHandle, parseOverheadEffects, spawnOverhead } from "./common";
import api from "../services/api";
import { itemByKey } from "@/src/data/items";

type Mob = { id: string; hp: number; maxHp: number; level: number; pos: { x: number; y: number } };

export class SlimeFieldScene extends Phaser.Scene {
  constructor() { super("SlimeFieldScene"); }
  private onResizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private player!: Phaser.Physics.Arcade.Image;
  private groundRect!: Phaser.GameObjects.Rectangle;
  private midPlatforms: Array<{ rect: Phaser.GameObjects.Rectangle; body: Phaser.Physics.Arcade.Image }> = [];
  private cursors!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private eKey!: Phaser.Input.Keyboard.Key;
  private nameTag!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private pollEvent?: Phaser.Time.TimerEvent;
  private readonly basePollDelay = 400;
  private readonly maxPollDelay = 4000;
  private currentPollDelay = this.basePollDelay;
  private joinedCombat = false;
  private auto = false;
  private mobContainers = new Map<string, Phaser.GameObjects.Container>();
  private lastAutoAttackAt = 0;
  private townPortalHandle?: EPortalHandle;
  private meadowPortalHandle?: EPortalHandle;
  private others = new Map<string, { sprite: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text }>();
  private presenceHeartbeatTimer?: Phaser.Time.TimerEvent;
  private presencePollTimer?: Phaser.Time.TimerEvent;

  create() {
    this.game.registry.set("currentScene", "Slime");
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Slime Field", { color: "#e5e7eb", fontSize: "20px" }).setOrigin(0.5);
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 40, this.scale.width * 0.9, 12, 0x0f172a).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0xffffff, 0.2);
    const groundKey = ensureGroundTexture(this, "groundTex3", 4);
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, groundKey);
    ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();

    const makePlatform = (x: number, y: number, w: number) => {
      const rect = this.add.rectangle(x, y, w, 10, 0x18212f).setOrigin(0.5);
      rect.setStrokeStyle(1, 0xffffff, 0.15);
      const body = this.physics.add.staticImage(x, y, groundKey);
      body.displayWidth = w; body.displayHeight = 10; body.refreshBody();
      this.midPlatforms.push({ rect, body });
      return body;
    };
    makePlatform(center.x - 120, this.scale.height - 120, this.scale.width * 0.35);
    makePlatform(center.x + 140, this.scale.height - 180, this.scale.width * 0.3);

    ensureCircleTexture(this, "playerTex3", 8, 0xffffff);
    const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "town", portal: "slime" };
    const x = spawn.from === "town" ? 100 : 100;
    this.player = this.physics.add.image(x, this.groundRect.y - 60, "playerTex3").setTint(0x22c55e);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900); this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    this.midPlatforms.forEach(p => this.physics.add.collider(this.player, p.body));

    const cname = String(this.game.registry.get("characterName") || "You");
    this.nameTag = this.add.text(this.player.x, this.player.y - 24, cname, { color: "#e5e7eb", fontSize: "11px" }).setOrigin(0.5).setDepth(10);

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, true, true);
    this.rKey = this.input.keyboard!.addKey("R", true, true);
    this.add.text(this.scale.width - 12, 14, "Space: Attack   R: Auto", { color: "#9ca3af", fontSize: "10px" }).setOrigin(1, 0);

    ensureCircleTexture(this, "sDot", 2, 0xffffff);

    const characterId = String(this.game.registry.get("characterId") || "");
    (async () => {
      try {
        if (!characterId) return;
        const res = await api.combatJoin("Slime", characterId);
        if (res.ok) {
          this.joinedCombat = true;
          this.currentPollDelay = this.basePollDelay;
          this.scheduleNextPoll(characterId, this.currentPollDelay);
        }
      } catch {}
    })();

    ensurePortalTexture(this, "portalExit2", 0x1d4ed8, 24, 44, 10);
    const exitPortal = this.physics.add.staticImage(60, this.groundRect.y - 22, "portalExit2");
    this.townPortalHandle = setupEPortal(
      this,
      exitPortal,
      "To Town",
      "#93c5fd",
      () => this.player,
      (this.eKey = this.input.keyboard!.addKey("E", true, true)),
      () => {
        try { const cid = String(this.game.registry.get("characterId") || ""); if (cid && this.joinedCombat) api.combatLeave("Slime", cid).catch(()=>{}); } catch {}
        this.game.registry.set("spawn", { from: "slime", portal: "town" });
        window.__saveSceneNow?.("Town");
        this.scene.start("TownScene");
      },
      70
    );

    // Portal to Slime Meadow
    ensurePortalTexture(this, "portalSlimeMeadow", 0x34d399, 24, 44, 10);
    const meadowPortal = this.physics.add.staticImage(this.scale.width - 60, this.groundRect.y - 22, "portalSlimeMeadow");
    this.meadowPortalHandle = setupEPortal(
      this,
      meadowPortal,
      "To Slime Meadow",
      "#86efac",
      () => this.player,
      this.eKey,
      () => {
        try { const cid = String(this.game.registry.get("characterId") || ""); if (cid && this.joinedCombat) api.combatLeave("Slime", cid).catch(()=>{}); } catch {}
        this.game.registry.set("spawn", { from: "slime", portal: "slime_meadow" });
        window.__saveSceneNow?.("Slime Meadow");
        this.scene.start("SlimeMeadowScene");
      },
      70
    );

  this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  // E key already created above when wiring portals

    this.input.on("pointerdown", () => {
      if (this.input.keyboard) this.input.keyboard.enabled = true;
  window.__setTyping?.(false);
  window.__focusGame?.();
    });

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.onResizeHandler = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize?.width ?? this.scale.width; const h = gameSize?.height ?? this.scale.height;
      if (!this.groundRect || !ground) return;
      this.groundRect.setPosition(w / 2, h - 40); this.groundRect.setSize(w * 0.9, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y); ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
      const rp1 = this.midPlatforms[0]; const rp2 = this.midPlatforms[1];
      if (rp1) { rp1.rect.setPosition(w / 2 - 120, h - 120).setSize(w * 0.35, 10); rp1.body.setPosition(rp1.rect.x, rp1.rect.y); rp1.body.displayWidth = rp1.rect.width; rp1.body.displayHeight = rp1.rect.height; rp1.body.refreshBody(); }
      if (rp2) { rp2.rect.setPosition(w / 2 + 140, h - 180).setSize(w * 0.3, 10); rp2.body.setPosition(rp2.rect.x, rp2.rect.y); rp2.body.displayWidth = rp2.rect.width; rp2.body.displayHeight = rp2.rect.height; rp2.body.refreshBody(); }
  exitPortal.setPosition(60, this.groundRect.y - 22);
  meadowPortal.setPosition(w - 60, this.groundRect.y - 22);
      this.physics.world.setBounds(0, 0, w, h);
    };
    this.scale.on("resize", this.onResizeHandler);

    setupOverheadSpawner(this, () => ({ x: this.player.x, y: this.player.y }));
    // Hook global overhead-for to spawn bubbles on specific players
    const selfCid = String(this.game.registry.get("characterId") || "");
    window.__spawnOverheadFor = (charId: string, text: string) => {
      try {
        const { text: cleaned, opts } = parseOverheadEffects(text);
        if (charId && charId === selfCid) { spawnOverhead(this, () => ({ x: this.player.x, y: this.player.y }), cleaned, opts); return; }
        const other = charId ? this.others.get(charId) : undefined;
        if (other) spawnOverhead(this, () => ({ x: other.sprite.x, y: other.sprite.y }), cleaned, opts);
      } catch {}
    };

    // Presence heartbeat + polling (Slime)
    ensureCircleTexture(this, "dot", 7, 0xffffff);
  const cid = String(this.game.registry.get("characterId") || "");
    if (cid) {
      const sendHeartbeat = async () => {
        try { await fetch("/api/world/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone: "Slime", characterId: cid, name: cname, x: this.player.x, y: this.player.y }) }); } catch {}
      };
      const pollOthers = async () => {
        try {
          const res = await fetch(`/api/world/presence?zone=Slime&characterId=${encodeURIComponent(cid)}`);
          const data = await res.json().catch(() => ({ players: [] as Array<{ id: string; name: string; x: number; y: number }> }));
          const players: Array<{ id: string; name: string; x: number; y: number }> = Array.isArray(data.players) ? data.players : [];
          const seen = new Set(players.map(p => p.id));
          for (const [id, obj] of this.others) { if (!seen.has(id)) { obj.sprite.destroy(); obj.tag.destroy(); this.others.delete(id); } }
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
      this.presenceHeartbeatTimer = this.time.addEvent({ delay: 2500, loop: true, callback: sendHeartbeat });
      this.presencePollTimer = this.time.addEvent({ delay: 2500, loop: true, callback: pollOthers, startAt: 1250 });
      void sendHeartbeat(); void pollOthers();
    }

    this.events.on("shutdown", () => {
      if (this.onResizeHandler) this.scale.off("resize", this.onResizeHandler);
      if (this.pollEvent) { this.pollEvent.remove(false); this.pollEvent = undefined; }
      this.mobContainers.forEach(c => c.destroy(true)); this.mobContainers.clear();
  if (this.townPortalHandle) { this.townPortalHandle.destroy(); this.townPortalHandle = undefined; }
  if (this.meadowPortalHandle) { this.meadowPortalHandle.destroy(); this.meadowPortalHandle = undefined; }
      if (this.presenceHeartbeatTimer) { this.presenceHeartbeatTimer.remove(false); this.presenceHeartbeatTimer = undefined; }
      if (this.presencePollTimer) { this.presencePollTimer.remove(false); this.presencePollTimer = undefined; }
      for (const obj of this.others.values()) { obj.sprite.destroy(); obj.tag.destroy(); }
      this.others.clear();
  if (window.__spawnOverheadFor) window.__spawnOverheadFor = undefined;
      try {
        if (this.joinedCombat) {
          const cid = String(this.game.registry.get("characterId") || "");
          if (cid) api.combatLeave("Slime", cid).catch(()=>{});
        }
      } catch {}
    });
  }

  // Server provides authoritative mob positions in snapshot; no client-side slotting

  private ensureMobContainer(id: string, level: number) {
    let cont = this.mobContainers.get(id); if (cont) return cont;
    const g = this.add.graphics(); g.fillStyle(0x22c55e, 1); g.fillEllipse(8, 10, 16, 12); g.fillStyle(0x16a34a, 1); g.fillEllipse(9, 8, 8, 6); g.generateTexture(`slime_${id}`, 16, 16); g.destroy();
    const sprite = this.add.image(0, 0, `slime_${id}`);
    this.tweens.add({ targets: sprite, y: "-=4", duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: Phaser.Math.Between(0, 300) });
    const barBg = this.add.rectangle(-22, -16, 44, 4, 0x111827).setOrigin(0, 0.5).setAlpha(0.9);
    const bar = this.add.rectangle(-22, -16, 44, 4, 0xef4444).setOrigin(0, 0.5);
    const label = this.add.text(0, -28, `Slime Lv ${level}`, { color: "#9ca3af", fontSize: "10px" }).setOrigin(0.5, 0.5);
  type MobContainer = Phaser.GameObjects.Container & { __bar?: Phaser.GameObjects.Rectangle; __barFull?: number };
  cont = this.add.container(0, 0, [sprite, barBg, bar, label]).setDepth(5) as MobContainer;
  (cont as MobContainer).__bar = bar; (cont as MobContainer).__barFull = 44;
    this.mobContainers.set(id, cont);
    return cont;
  }

  private reconcileMobs(mobs: Mob[]) {
    const ids = new Set(mobs.map(m => m.id));
    for (const [id, cont] of this.mobContainers.entries()) { if (!ids.has(id)) { cont.destroy(true); this.mobContainers.delete(id); } }
    for (const m of mobs) {
      const cont = this.ensureMobContainer(m.id, m.level);
      // Place according to server pos; clamp to ground bounds and align to ground Y if server sends 0
      const y = m.pos?.y && m.pos.y > 0 ? m.pos.y : (this.groundRect.y - 28);
      const minX = (this.groundRect.x - this.groundRect.width/2) + 40;
      const maxX = (this.groundRect.x + this.groundRect.width/2) - 40;
      const x = Phaser.Math.Clamp(m.pos?.x ?? 100, minX, maxX);
      cont.setPosition(x, y);
      const ratio = Math.max(0, Math.min(1, m.hp / (m.maxHp || 1)));
  const mc = cont as Phaser.GameObjects.Container & { __bar?: Phaser.GameObjects.Rectangle; __barFull?: number };
  const bar: Phaser.GameObjects.Rectangle = mc.__bar!; const full: number = mc.__barFull!;
      bar.width = full * ratio;
    }
  }

  private scheduleNextPoll(characterId: string, delay: number) {
    if (!this.scene.isActive(this.scene.key)) return;
    if (this.pollEvent) { this.pollEvent.remove(false); this.pollEvent = undefined; }
    this.pollEvent = this.time.delayedCall(delay, () => this.pollSnapshot(characterId));
  }

  private async pollSnapshot(characterId: string) {
    if (!this.joinedCombat || !this.scene.isActive(this.scene.key)) return;
    try {
      const data = await api.combatSnapshot("Slime", characterId);
      const mobs = (data?.snapshot?.mobs as Mob[]) || [];
      this.reconcileMobs(mobs);
      this.currentPollDelay = this.basePollDelay;
    } catch {
      this.currentPollDelay = Math.min(this.currentPollDelay * 1.5, this.maxPollDelay);
    } finally {
      if (this.joinedCombat && this.scene.isActive(this.scene.key)) {
        this.scheduleNextPoll(characterId, this.currentPollDelay);
      }
    }
  }

  private formatItem(key: string) {
    const def = (itemByKey as Record<string, { name: string }>)[key];
    if (def?.name) return def.name;
    return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  private async basicAttack(characterId: string) {
    try {
      // Send player's current x as proximity hint
      const data = await api.basicAttack("Slime", characterId, this.player.x);
  if (data?.result?.hit) {
        const mobId = data?.result?.mobId as string | undefined;
        const cont = mobId ? this.mobContainers.get(mobId) : undefined;
        if (cont) {
          const bar: Phaser.GameObjects.Rectangle | undefined = (cont as (Phaser.GameObjects.Container & { __bar?: Phaser.GameObjects.Rectangle })).__bar;
          if (bar) { bar.setFillStyle(0xfca5a5); this.time.delayedCall(120, () => bar.setFillStyle(0xef4444)); }
          const spawnSpark = () => {
            const img = this.add.image(cont.x, cont.y, "sDot");
            img.setTint(0x22c55e).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.8, 1.2));
            const ang = Phaser.Math.FloatBetween(0, Math.PI * 2); const speed = Phaser.Math.Between(40, 100);
            const toX = cont.x + Math.cos(ang) * speed * 0.4; const toY = cont.y + Math.sin(ang) * speed * 0.4;
            this.tweens.add({ targets: img, x: toX, y: toY, alpha: 0, duration: 280, ease: "Sine.easeOut", onComplete: () => img.destroy() });
          };
          for (let i = 0; i < 12; i++) this.time.delayedCall(i * 8, () => spawnSpark());
        }
      }
      // Apply new EXP/Level to HUD if server returned them
      if (typeof data?.exp === "number" && typeof data?.level === "number") {
        window.__applyExpUpdate?.({ type: "character", exp: data.exp, level: data.level });
      }
  const loot: Array<{ itemId: string; qty: number }> = Array.isArray(data?.loot) ? (data.loot as Array<{ itemId: string; qty: number }>) : [];
      if (loot.length) {
        const inv = (this.game.registry.get("inventory") as Record<string, number>) || {};
  for (const drop of loot) { inv[drop.itemId] = (inv[drop.itemId] ?? 0) + Math.max(1, drop.qty); const name = this.formatItem(drop.itemId); window.__spawnOverhead?.(`:yellow: +${drop.qty} ${name}`, { ripple: true }); }
        this.game.registry.set("inventory", inv);
      }
      const q = this.game.registry.get("questDirtyCount") as number | undefined;
      this.game.registry.set("questDirtyCount", (q ?? 0) + 1);
    } catch {}
  }

  private async toggleAuto(characterId: string) {
    try {
      const v = !this.auto; this.auto = v; await api.toggleAuto("Slime", characterId, v);
  window.__spawnOverhead?.(v ? ":green: Auto ON" : ":red: Auto OFF", { ripple: true });
      this.game.registry.set("autoOn", v);
    } catch {}
  }

  update() {
    if (!this.player || !this.cursors) return;
    const typing = isTyping();
    const speed = 220; let vx = 0;
    if (!typing) { if (this.cursors.A.isDown) vx -= speed; if (this.cursors.D.isDown) vx += speed; this.player.setVelocityX(vx); const onFloor = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down; if (this.cursors.W.isDown && onFloor) this.player.setVelocityY(-420); }
    else { this.player.setVelocityX(0); }

    if (!typing && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const cid = String(this.game.registry.get("characterId") || ""); if (cid) { this.tweens.add({ targets: this.player, scaleY: 0.85, yoyo: true, duration: 90 }); this.basicAttack(cid); }
    }
    if (!typing && Phaser.Input.Keyboard.JustDown(this.rKey)) { const cid = String(this.game.registry.get("characterId") || ""); if (cid) this.toggleAuto(cid); }

    if (this.auto && this.joinedCombat && !typing) {
      let nearest: Phaser.GameObjects.Container | undefined; let nearestDist = Number.POSITIVE_INFINITY;
      for (const cont of this.mobContainers.values()) { const d = Math.abs(cont.x - this.player.x); if (d < nearestDist) { nearest = cont; nearestDist = d; } }
      const first = nearest; if (first) {
        const dx = first.x - this.player.x; const abs = Math.abs(dx); const dir = Math.sign(dx); const approachSpeed = 140;
        if (abs > 20) { this.player.setVelocityX(dir * approachSpeed); }
        else { this.player.setVelocityX(0); const now = this.time.now; if (now - this.lastAutoAttackAt > 350) { const cid = String(this.game.registry.get("characterId") || ""); if (cid) this.basicAttack(cid); this.lastAutoAttackAt = now; this.tweens.add({ targets: this.player, scaleY: 0.88, yoyo: true, duration: 90 }); } }
      }
    }

    updateNameTag(this.nameTag, this.player);
    // Portal interactions are handled by setupEPortal.
  }
}

export default SlimeFieldScene;
