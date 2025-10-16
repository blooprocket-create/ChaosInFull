import * as Phaser from "phaser";

export type OverheadOptions = { wave?: boolean; shake?: boolean; ripple?: boolean; rainbow?: boolean; color?: string };

/** Create a tiny rectangle texture for ground-like bodies */
export function ensureGroundTexture(scene: Phaser.Scene, key = "groundTex", size = 4) {
  if (scene.textures.exists(key)) return key;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, size, size);
  g.generateTexture(key, size, size);
  g.destroy();
  return key;
}

/** Create a simple circular texture (used for player, particles, etc) */
export function ensureCircleTexture(scene: Phaser.Scene, key: string, radius = 8, color = 0xffffff) {
  if (scene.textures.exists(key)) return key;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillCircle(radius, radius, radius);
  g.generateTexture(key, radius * 2, radius * 2);
  g.destroy();
  return key;
}

/** Create a rounded-rect portal texture */
export function ensurePortalTexture(scene: Phaser.Scene, key: string, color: number, w = 28, h = 48, radius = 10) {
  if (scene.textures.exists(key)) return key;
  const g = scene.add.graphics();
  g.fillStyle(color, 0.8);
  g.fillRoundedRect(0, 0, w, h, radius);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/** Attach a window.__spawnOverhead that renders text above the provided anchor (e.g., player). */
export function setupOverheadSpawner(scene: Phaser.Scene, getAnchor: () => { x: number; y: number }, defaultColor = "#e5e7eb") {
  window.__spawnOverhead = (text: string, opts?: OverheadOptions) => {
    const tokens = String(text ?? "").split(/(\s+)/);
    let currentColor = opts?.color || defaultColor;
    const segs: Array<{ text: string; color: string }> = [];
    const applyColor = (tag: string) => {
      switch (tag.toLowerCase()) {
        case ":red:": currentColor = "#ef4444"; break;
        case ":green:": currentColor = "#22c55e"; break;
        case ":blue:": currentColor = "#60a5fa"; break;
        case ":yellow:": currentColor = "#f59e0b"; break;
        case ":purple:": currentColor = "#a78bfa"; break;
      }
    };
    for (const tok of tokens) {
      if (/^:.+:$/.test(tok)) { applyColor(tok); continue; }
      if (tok) segs.push({ text: tok, color: currentColor });
    }
    const container = scene.add.container(0, 0).setDepth(15);
    const charTexts: Phaser.GameObjects.Text[] = [];
    let xOff = 0;
    for (const seg of segs) {
      for (const ch of seg.text.split("")) {
        const t = scene.add.text(xOff, 0, ch, { color: seg.color, fontSize: "12px" }).setOrigin(0, 0.5);
        container.add(t);
        charTexts.push(t);
        xOff += t.width;
      }
    }
    const totalWidth = xOff;
    const anchor = getAnchor();
    container.setSize(totalWidth, 16).setPosition(anchor.x - totalWidth / 2, anchor.y - 36);
    const follow = scene.time.addEvent({ delay: 50, loop: true, callback: () => {
      const a = getAnchor();
      container.setPosition(a.x - totalWidth / 2, a.y - 36);
    }});
    const tweens: Phaser.Tweens.Tween[] = [];
    if (opts?.wave) charTexts.forEach((t, i) => tweens.push(scene.tweens.add({ targets: t, y: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: i * 60 })));
    if (opts?.ripple) charTexts.forEach((t, i) => tweens.push(scene.tweens.add({ targets: t, scale: { from: 1, to: 1.12 }, duration: 560, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: i * 60 })));
    if (opts?.shake) tweens.push(scene.tweens.add({ targets: container, x: container.x + 3, duration: 60, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
    let colorTimer: Phaser.Time.TimerEvent | null = null;
    if (opts?.rainbow) {
      let hue = 0;
      colorTimer = scene.time.addEvent({ delay: 80, loop: true, callback: () => {
        hue = (hue + 12) % 360;
        const hex = Phaser.Display.Color.HSLToColor(hue / 360, 0.9, 0.6).color.toString(16).padStart(6, "0");
        const col = `#${hex}`;
        charTexts.forEach(t => t.setColor(col));
      }});
    }
    scene.time.delayedCall(2800, () => {
      tweens.forEach(tr => tr.stop());
      if (colorTimer) colorTimer.remove(false);
      follow.remove();
      scene.tweens.add({ targets: container, alpha: 0, duration: 350, onComplete: () => container.destroy(true) });
    });
  };
}

/** Simple utility to update name tag position above an image */
export function updateNameTag(nameTag: Phaser.GameObjects.Text | undefined, player: Phaser.GameObjects.Image | undefined) {
  if (!nameTag || !player) return;
  nameTag.setPosition(player.x, player.y - 24);
}

/** Gate inputs when typing in chat/inputs */
export function isTyping(): boolean { return !!window.__isTyping; }
