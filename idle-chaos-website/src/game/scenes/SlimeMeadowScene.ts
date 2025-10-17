import * as Phaser from "phaser";
import { ensureGroundTexture, ensureCircleTexture, ensurePortalTexture, setupOverheadSpawner, updateNameTag, isTyping, setupEPortal, EPortalHandle, parseOverheadEffects, spawnOverhead } from "./common";
import api from "../services/api";
import { itemByKey } from "@/src/data/items";

type Mob = { id: string; templateId?: string; hp: number; maxHp: number; level: number; pos: { x: number; y: number } };

// A distinct meadow look: brighter palette, rolling mid platforms, different labels
export class SlimeMeadowScene extends Phaser.Scene {
  constructor() { super("SlimeMeadowScene"); }
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
  private backPortal!: Phaser.Physics.Arcade.Image;
  private backHandle?: EPortalHandle;
  private others = new Map<string, { sprite: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text }>();
  private presenceHeartbeatTimer?: Phaser.Time.TimerEvent;
  private presencePollTimer?: Phaser.Time.TimerEvent;

  create() {
    this.game.registry.set("currentScene", "Slime Meadow");
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.add.text(center.x, 40, "Slime Meadow", { color: "#bbf7d0", fontSize: "20px" }).setOrigin(0.5);
    this.cameras.main.setBackgroundColor("#07200f");
    this.groundRect = this.add.rectangle(center.x, this.scale.height - 36, this.scale.width * 0.92, 12, 0x052e1a).setOrigin(0.5);
    this.groundRect.setStrokeStyle(1, 0x10b981, 0.25);
    const groundKey = ensureGroundTexture(this, "groundTexMeadow", 6);
    const ground = this.physics.add.staticImage(this.groundRect.x, this.groundRect.y, groundKey);
    ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();

    const makePlatform = (x: number, y: number, w: number) => {
      const rect = this.add.rectangle(x, y, w, 10, 0x083e26).setOrigin(0.5);
      rect.setStrokeStyle(1, 0x34d399, 0.2);
      const body = this.physics.add.staticImage(x, y, groundKey);
      body.displayWidth = w; body.displayHeight = 10; body.refreshBody();
      this.midPlatforms.push({ rect, body });
      return body;
    };
    // Rolling terraces: staggered
    makePlatform(center.x - 160, this.scale.height - 130, this.scale.width * 0.28);
    makePlatform(center.x + 40, this.scale.height - 170, this.scale.width * 0.22);
    makePlatform(center.x + 200, this.scale.height - 110, this.scale.width * 0.26);

    ensureCircleTexture(this, "playerTexMeadow", 8, 0xffffff);
    const spawn = (this.game.registry.get("spawn") as { from: string; portal: string | null }) || { from: "slime", portal: "slime_meadow" };
    const x = spawn.from === "slime" ? (this.scale.width - 100) : 100;
    this.player = this.physics.add.image(x, this.groundRect.y - 60, "playerTexMeadow").setTint(0x86efac);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(900); this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    this.midPlatforms.forEach(p => this.physics.add.collider(this.player, p.body));

    const cname = String(this.game.registry.get("characterName") || "You");
    this.nameTag = this.add.text(this.player.x, this.player.y - 24, cname, { color: "#e5e7eb", fontSize: "11px" }).setOrigin(0.5).setDepth(10);

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, true, true);
    this.rKey = this.input.keyboard!.addKey("R", true, true);
    this.add.text(this.scale.width - 12, 14, "Space: Attack   R: Auto", { color: "#9ca3af", fontSize: "10px" }).setOrigin(1, 0);

    ensureCircleTexture(this, "mDot", 2, 0xffffff);

    const characterId = String(this.game.registry.get("characterId") || "");
    (async () => {
      try {
        if (!characterId) return;
        const res = await api.combatJoin("Slime Meadow", characterId);
        if (res.ok) {
          this.joinedCombat = true;
          this.currentPollDelay = this.basePollDelay;
          this.scheduleNextPoll(characterId, this.currentPollDelay);
        }
      } catch {}
    })();

    // Portal: Back to Slime Field (left)
    ensurePortalTexture(this, "portalBackSlime", 0x10b981, 24, 44, 10);
    this.backPortal = this.physics.add.staticImage(60, this.groundRect.y - 22, "portalBackSlime");
    this.backHandle = setupEPortal(
      this,
      this.backPortal,
      "To Slime Field",
      "#86efac",
      () => this.player,
      (this.eKey = this.input.keyboard!.addKey("E", true, true)),
      () => {
        try { const cid = String(this.game.registry.get("characterId") || ""); if (cid && this.joinedCombat) api.combatLeave("Slime Meadow", cid).catch(()=>{}); } catch {}
        this.game.registry.set("spawn", { from: "slime_meadow", portal: "slime" });
        window.__saveSceneNow?.("Slime");
        this.scene.start("SlimeFieldScene");
      },
      70
    );

    this.cursors = this.input.keyboard!.addKeys({ W: "W", A: "A", S: "S", D: "D" }) as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    this.eKey = this.input.keyboard!.addKey("E", true, true);

    this.input.on("pointerdown", () => {
      if (this.input.keyboard) this.input.keyboard.enabled = true;
      window.__setTyping?.(false);
      window.__focusGame?.();
    });

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.onResizeHandler = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize?.width ?? this.scale.width; const h = gameSize?.height ?? this.scale.height;
      if (!this.groundRect || !ground) return;
      this.groundRect.setPosition(w / 2, h - 36); this.groundRect.setSize(w * 0.92, 12);
      ground.setPosition(this.groundRect.x, this.groundRect.y); ground.displayWidth = this.groundRect.width; ground.displayHeight = this.groundRect.height; ground.refreshBody();
      // Reposition terraces
      const rp1 = this.midPlatforms[0]; const rp2 = this.midPlatforms[1]; const rp3 = this.midPlatforms[2];
      if (rp1) { rp1.rect.setPosition(w / 2 - 160, h - 130).setSize(w * 0.28, 10); rp1.body.setPosition(rp1.rect.x, rp1.rect.y); rp1.body.displayWidth = rp1.rect.width; rp1.body.displayHeight = rp1.rect.height; rp1.body.refreshBody(); }
      if (rp2) { rp2.rect.setPosition(w / 2 + 40, h - 170).setSize(w * 0.22, 10); rp2.body.setPosition(rp2.rect.x, rp2.rect.y); rp2.body.displayWidth = rp2.rect.width; rp2.body.displayHeight = rp2.rect.height; rp2.body.refreshBody(); }
      if (rp3) { rp3.rect.setPosition(w / 2 + 200, h - 110).setSize(w * 0.26, 10); rp3.body.setPosition(rp3.rect.x, rp3.rect.y); rp3.body.displayWidth = rp3.rect.width; rp3.body.displayHeight = rp3.rect.height; rp3.body.refreshBody(); }
  this.backPortal.setPosition(60, this.groundRect.y - 22);
      this.physics.world.setBounds(0, 0, w, h);
    };
    this.scale.on("resize", this.onResizeHandler);

    setupOverheadSpawner(this, () => ({ x: this.player.x, y: this.player.y }));
    // Hook for spawning overhead chat on specific character ids
    const selfCid = String(this.game.registry.get("characterId") || "");
    window.__spawnOverheadFor = (charId: string, text: string) => {
      try {
        const { text: cleaned, opts } = parseOverheadEffects(text);
        if (charId && charId === selfCid) { spawnOverhead(this, () => ({ x: this.player.x, y: this.player.y }), cleaned, opts); return; }
        const other = charId ? this.others.get(charId) : undefined;
        if (other) spawnOverhead(this, () => ({ x: other.sprite.x, y: other.sprite.y }), cleaned, opts);
      } catch {}
    };

    // Presence heartbeat + polling (Slime Meadow)
    ensureCircleTexture(this, "dot", 7, 0xffffff);
  const cid = String(this.game.registry.get("characterId") || "");
    if (cid) {
      const sendHeartbeat = async () => {
        try { await fetch("/api/world/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone: "Slime Meadow", characterId: cid, name: cname, x: this.player.x, y: this.player.y }) }); } catch {}
      };
      const pollOthers = async () => {
        try {
          const res = await fetch(`/api/world/presence?zone=Slime%20Meadow&characterId=${encodeURIComponent(cid)}`);
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
      try { if (this.joinedCombat) { const cid = String(this.game.registry.get("characterId") || ""); if (cid) api.combatLeave("Slime Meadow", cid).catch(()=>{}); } } catch {}
      if (this.backHandle) { this.backHandle.destroy(); this.backHandle = undefined; }
      if (this.presenceHeartbeatTimer) { this.presenceHeartbeatTimer.remove(false); this.presenceHeartbeatTimer = undefined; }
      if (this.presencePollTimer) { this.presencePollTimer.remove(false); this.presencePollTimer = undefined; }
      for (const obj of this.others.values()) { obj.sprite.destroy(); obj.tag.destroy(); }
      this.others.clear();
      if (window.__spawnOverheadFor) window.__spawnOverheadFor = undefined;
    });
  }

  private ensureMobContainer(id: string, level: number, templateId?: string) {
    let cont = this.mobContainers.get(id); if (cont) return cont;
    // Vary tint/scale based on template: epic -> purple, big -> larger
    const isEpic = !!templateId && templateId.toLowerCase().includes("epic");
    const isBig = !!templateId && templateId.toLowerCase().includes("big");
    const tint = isEpic ? 0x7c3aed /* purple-600 */ : isBig ? 0x22d3ee /* cyan-400 */ : 0x34d399 /* emerald-400 */;
    const g = this.add.graphics(); g.fillStyle(tint, 1); g.fillEllipse(8, 10, 16, 12); g.fillStyle(0xffffff, 0.2); g.fillEllipse(9, 8, 8, 6); g.generateTexture(`meadow_slime_${id}`, 16, 16); g.destroy();
    const sprite = this.add.image(0, 0, `meadow_slime_${id}`).setScale(isBig ? 1.4 : 1);
    this.tweens.add({ targets: sprite, y: "-=6", duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: Phaser.Math.Between(0, 300) });
    const barBg = this.add.rectangle(-22, -16, 44, 4, 0x0b1f16).setOrigin(0, 0.5).setAlpha(0.9);
    const bar = this.add.rectangle(-22, -16, 44, 4, 0xfca5a5).setOrigin(0, 0.5);
    const name = isEpic ? "Epic Slime" : isBig ? "Big Slime" : "Slime";
    const label = this.add.text(0, -28, `${name} Lv ${level}`, { color: "#a7f3d0", fontSize: "10px" }).setOrigin(0.5, 0.5);
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
      const cont = this.ensureMobContainer(m.id, m.level, m.templateId);
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
      const data = await api.combatSnapshot("Slime Meadow", characterId);
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
      const data = await api.basicAttack("Slime Meadow", characterId, this.player.x);
      if (data?.result?.hit) {
        const mobId = data?.result?.mobId as string | undefined;
        const cont = mobId ? this.mobContainers.get(mobId) : undefined;
        if (cont) {
          const bar: Phaser.GameObjects.Rectangle | undefined = (cont as (Phaser.GameObjects.Container & { __bar?: Phaser.GameObjects.Rectangle })).__bar;
          if (bar) { bar.setFillStyle(0xfca5a5); this.time.delayedCall(120, () => bar.setFillStyle(0xfca5a5)); }
          for (let i = 0; i < 10; i++) this.time.delayedCall(i * 10, () => {
            const img = this.add.image(cont.x, cont.y, "mDot").setTint(0x34d399).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.8, 1.2));
            const ang = Phaser.Math.FloatBetween(0, Math.PI * 2); const speed = Phaser.Math.Between(40, 100);
            const toX = cont.x + Math.cos(ang) * speed * 0.4; const toY = cont.y + Math.sin(ang) * speed * 0.4;
            this.tweens.add({ targets: img, x: toX, y: toY, alpha: 0, duration: 280, ease: "Sine.easeOut", onComplete: () => img.destroy() });
          });
        }
      }
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
      const v = !this.auto; this.auto = v; await api.toggleAuto("Slime Meadow", characterId, v);
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
    // No manual portal logic; handled by shared helper
  }
}

export default SlimeMeadowScene;
