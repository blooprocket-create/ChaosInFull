// Shared fallback enemy texture generator for Phaser scenes.
// Produces themed, layered shapes per enemy id when no spritesheet exists.

function pickCategory(id) {
  const s = (id || '').toLowerCase();
  if (/goblin/.test(s)) return 'goblin';
  if (/skeleton|bone/.test(s)) return 'skeleton';
  if (/zombie|undead/.test(s)) return 'zombie';
  // Only match plain slimes here; flame/lava variants are handled via theme
  if (/slime/.test(s)) return 'slime';
  if (/devil|demon|imp|hell/.test(s)) return 'devil';
  if (/lurker|void|abyss|shadow/.test(s)) return 'lurker';
  if (/ghost/.test(s)) return 'ghost';
  if (/rat/.test(s)) return 'rat';
  return 'generic';
}

function drawGoblin(g, w, h) {
  // Mask-like oval with ears and a gold nose ring
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0x4f8a3c, 1); // skin
  g.fillEllipse(cx, cy, Math.round(w * 0.78), Math.round(h * 0.72));
  g.fillStyle(0x2a5c24, 1);
  g.lineStyle(4, 0x183d16, 0.9);
  // ears
  const earW = Math.round(w * 0.22), earH = Math.round(h * 0.22);
  g.fillTriangle(cx - Math.round(w * 0.44), cy, cx - Math.round(w * 0.2), cy - earH, cx - Math.round(w * 0.2), cy + earH);
  g.fillTriangle(cx + Math.round(w * 0.44), cy, cx + Math.round(w * 0.2), cy - earH, cx + Math.round(w * 0.2), cy + earH);
  // eyes
  g.fillStyle(0xf5e6a0, 1);
  g.fillCircle(cx - Math.round(w * 0.16), cy - Math.round(h * 0.06), Math.round(w * 0.06));
  g.fillCircle(cx + Math.round(w * 0.16), cy - Math.round(h * 0.06), Math.round(w * 0.06));
  g.fillStyle(0x332a1a, 1);
  g.fillCircle(cx - Math.round(w * 0.16), cy - Math.round(h * 0.06), Math.round(w * 0.03));
  g.fillCircle(cx + Math.round(w * 0.16), cy - Math.round(h * 0.06), Math.round(w * 0.03));
  // nose ring
  g.lineStyle(3, 0xffd27a, 1);
  g.strokeCircle(cx, cy + Math.round(h * 0.04), Math.round(w * 0.06));
}

function drawSkeleton(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0xece2cf, 1);
  g.fillRoundedRect(Math.round(w * 0.18), Math.round(h * 0.2), Math.round(w * 0.64), Math.round(h * 0.58), 10);
  // eyes
  g.fillStyle(0x222222, 1);
  g.fillCircle(cx - Math.round(w * 0.12), cy - Math.round(h * 0.06), Math.round(w * 0.06));
  g.fillCircle(cx + Math.round(w * 0.12), cy - Math.round(h * 0.06), Math.round(w * 0.06));
  // teeth lines
  g.lineStyle(2, 0x9c8f7a, 0.8);
  const mouthY = cy + Math.round(h * 0.12);
  g.strokeLineShape(new Phaser.Geom.Line(Math.round(w * 0.28), mouthY, Math.round(w * 0.72), mouthY));
  for (let i = 0; i < 4; i++) {
    const x = Math.round(w * (0.34 + i * 0.08));
    g.strokeLineShape(new Phaser.Geom.Line(x, mouthY - 6, x, mouthY + 6));
  }
}

function drawZombie(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0x355a35, 1);
  g.fillEllipse(cx, cy, Math.round(w * 0.82), Math.round(h * 0.78));
  g.fillStyle(0x507850, 0.9);
  g.fillEllipse(cx, cy - Math.round(h * 0.08), Math.round(w * 0.56), Math.round(h * 0.26));
  // eye & scar
  g.fillStyle(0xf2f2f2, 1);
  g.fillCircle(cx - Math.round(w * 0.14), cy - Math.round(h * 0.04), Math.round(w * 0.06));
  g.fillStyle(0x0d0d0d, 1);
  g.fillCircle(cx - Math.round(w * 0.14), cy - Math.round(h * 0.04), Math.round(w * 0.025));
  g.lineStyle(3, 0x9b2c2c, 1);
  g.strokeLineShape(new Phaser.Geom.Line(cx + Math.round(w * 0.06), cy - Math.round(h * 0.12), cx + Math.round(w * 0.22), cy + Math.round(h * 0.02)));
}

function drawSlime(g, w, h, theme = 'green') {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  if (theme === 'flame') {
    // Flame/lava palette
    g.fillStyle(0x5b1414, 1);
    g.fillEllipse(cx, cy, Math.round(w * 0.86), Math.round(h * 0.66));
    g.fillStyle(0xd44d2a, 0.95);
    g.fillEllipse(cx, cy, Math.round(w * 0.7), Math.round(h * 0.5));
    g.fillStyle(0xffb36b, 0.9);
    g.fillEllipse(cx - Math.round(w * 0.08), cy - Math.round(h * 0.1), Math.round(w * 0.34), Math.round(h * 0.2));
  } else {
    // Default green slime
    g.fillStyle(0x1d4f20, 1);
    g.fillEllipse(cx, cy, Math.round(w * 0.86), Math.round(h * 0.66));
    g.fillStyle(0x2f8a37, 0.95);
    g.fillEllipse(cx, cy, Math.round(w * 0.72), Math.round(h * 0.52));
    g.fillStyle(0x9bff9b, 0.85);
    g.fillEllipse(cx - Math.round(w * 0.08), cy - Math.round(h * 0.1), Math.round(w * 0.34), Math.round(h * 0.2));
  }
}

function drawDevil(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0x2b0b0b, 1);
  g.fillEllipse(cx, cy, Math.round(w * 0.8), Math.round(h * 0.7));
  // horns
  g.fillStyle(0xaa2222, 1);
  g.fillTriangle(cx - Math.round(w * 0.22), cy - Math.round(h * 0.12), cx - Math.round(w * 0.06), cy - Math.round(h * 0.38), cx - Math.round(w * 0.02), cy - Math.round(h * 0.16));
  g.fillTriangle(cx + Math.round(w * 0.22), cy - Math.round(h * 0.12), cx + Math.round(w * 0.06), cy - Math.round(h * 0.38), cx + Math.round(w * 0.02), cy - Math.round(h * 0.16));
  // eye
  g.fillStyle(0xff5555, 1);
  g.fillCircle(cx, cy - Math.round(h * 0.02), Math.round(w * 0.06));
}

function drawLurker(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0x3b2a5e, 1);
  g.fillEllipse(cx, cy, Math.round(w * 0.84), Math.round(h * 0.64));
  // central eye
  g.fillStyle(0x88e0ff, 1);
  g.fillCircle(cx, cy, Math.round(w * 0.08));
  g.fillStyle(0x103040, 1);
  g.fillCircle(cx, cy, Math.round(w * 0.04));
  // tendrils
  g.lineStyle(3, 0x5a3c8a, 1);
  for (let i = 0; i < 4; i++) {
    const a = (-Math.PI / 2) + (i * Math.PI / 6);
    g.strokeLineShape(new Phaser.Geom.Line(cx, cy + Math.round(h * 0.06), cx + Math.round(w * 0.36 * Math.cos(a)), cy + Math.round(h * 0.28 * Math.sin(a))));
  }
}

function drawGeneric(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0x3a3f4b, 1);
  g.fillRoundedRect(Math.round(w * 0.18), Math.round(h * 0.22), Math.round(w * 0.64), Math.round(h * 0.56), 10);
  g.lineStyle(3, 0xaab4c8, 0.9);
  g.strokeRoundedRect(Math.round(w * 0.18), Math.round(h * 0.22), Math.round(w * 0.64), Math.round(h * 0.56), 10);
  // crest
  g.fillStyle(0xcfe0ff, 1);
  g.fillTriangle(cx, Math.round(h * 0.28), cx - Math.round(w * 0.08), Math.round(h * 0.44), cx + Math.round(w * 0.08), Math.round(h * 0.44));
}

function drawGhost(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  g.fillStyle(0xced7ff, 0.95);
  g.fillEllipse(cx, cy, Math.round(w * 0.8), Math.round(h * 0.66));
  // tail wisps
  g.fillStyle(0xaec2ff, 0.9);
  g.fillTriangle(cx - Math.round(w * 0.2), cy + Math.round(h * 0.04), cx - Math.round(w * 0.08), cy + Math.round(h * 0.28), cx + Math.round(w * 0.02), cy + Math.round(h * 0.08));
  g.fillTriangle(cx + Math.round(w * 0.2), cy + Math.round(h * 0.04), cx + Math.round(w * 0.08), cy + Math.round(h * 0.28), cx - Math.round(w * 0.02), cy + Math.round(h * 0.08));
  // eyes
  g.fillStyle(0x2a3048, 1);
  g.fillCircle(cx - Math.round(w * 0.12), cy - Math.round(h * 0.04), Math.round(w * 0.05));
  g.fillCircle(cx + Math.round(w * 0.12), cy - Math.round(h * 0.04), Math.round(w * 0.05));
}

function drawRat(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  // body
  g.fillStyle(0x7b5f47, 1);
  g.fillEllipse(cx, cy, Math.round(w * 0.86), Math.round(h * 0.6));
  // ears
  g.fillStyle(0x9b7f67, 1);
  g.fillCircle(cx - Math.round(w * 0.24), cy - Math.round(h * 0.16), Math.round(w * 0.08));
  g.fillCircle(cx + Math.round(w * 0.24), cy - Math.round(h * 0.16), Math.round(w * 0.08));
  // eye
  g.fillStyle(0x222222, 1);
  g.fillCircle(cx + Math.round(w * 0.12), cy - Math.round(h * 0.04), Math.round(w * 0.04));
  // tail
  g.lineStyle(4, 0xc57a7a, 1);
  g.strokeLineShape(new Phaser.Geom.Line(cx + Math.round(w * 0.28), cy + Math.round(h * 0.06), cx + Math.round(w * 0.46), cy + Math.round(h * 0.22)));
}

function drawVariantOverlay(g, w, h, id) {
  const s = (id || '').toLowerCase();
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  // crowns for rarity
  if (/boss/.test(s)) {
    g.fillStyle(0xff5544, 0.95);
    g.fillTriangle(cx, cy - Math.round(h * 0.38), cx - Math.round(w * 0.12), cy - Math.round(h * 0.18), cx + Math.round(w * 0.12), cy - Math.round(h * 0.18));
  } else if (/epic/.test(s)) {
    g.fillStyle(0xffd27a, 0.95);
    g.fillTriangle(cx, cy - Math.round(h * 0.36), cx - Math.round(w * 0.1), cy - Math.round(h * 0.2), cx + Math.round(w * 0.1), cy - Math.round(h * 0.2));
  } else if (/legendary/.test(s)) {
    // Legendary: radiant halo + starbursts
    // outer soft halo
    g.fillStyle(0xfff2a8, 0.18);
    g.fillCircle(cx, cy, Math.round(Math.min(w, h) * 0.52));
    // bright ring
    g.lineStyle(4, 0xffea75, 1);
    g.strokeCircle(cx, cy, Math.round(Math.min(w, h) * 0.46));
    // starbursts (small diamonds at cardinal points)
    g.fillStyle(0xfff6c0, 0.95);
    const r = Math.round(Math.min(w, h) * 0.46);
    const d = Math.max(3, Math.round(Math.min(w, h) * 0.06));
    // top
    g.fillTriangle(cx, cy - r, cx - d, cy - r + d, cx + d, cy - r + d);
    // right
    g.fillTriangle(cx + r, cy, cx + r - d, cy - d, cx + r - d, cy + d);
    // bottom
    g.fillTriangle(cx, cy + r, cx - d, cy + r - d, cx + d, cy + r - d);
    // left
    g.fillTriangle(cx - r, cy, cx - r + d, cy - d, cx - r + d, cy + d);
  }
  // role markers
  if (/slicer|blade/.test(s)) {
    g.lineStyle(3, 0xe8e8e8, 1);
    g.strokeLineShape(new Phaser.Geom.Line(cx - 10, cy + 8, cx + 10, cy - 8));
    g.strokeLineShape(new Phaser.Geom.Line(cx - 10, cy - 8, cx + 10, cy + 8));
  }
  if (/flame|flaming|binder/.test(s)) {
    g.fillStyle(0xff8844, 0.9);
    // flame tear
    g.fillEllipse(cx + 12, cy - 6, 10, 14);
    g.fillStyle(0xffcc66, 0.9);
    g.fillEllipse(cx + 12, cy - 8, 6, 8);
  }
  if (/iron|vanguard|guard/.test(s)) {
    g.lineStyle(3, 0xcfd8ff, 0.9);
    g.strokeCircle(cx, cy + 10, 12);
  }
  if (/girl/.test(s)) {
    // small ribbon
    g.fillStyle(0xcc66cc, 0.95);
    g.fillRect(cx - 6, cy - 2, 12, 4);
    g.fillTriangle(cx + 6, cy, cx + 12, cy + 3, cx + 6, cy + 6);
  }
  if (/zombie/.test(s)) {
    g.lineStyle(2, 0x9b2c2c, 1);
    g.strokeLineShape(new Phaser.Geom.Line(cx - 6, cy + 6, cx + 6, cy + 16));
  }
  if (/ghost/.test(s)) {
    g.lineStyle(2, 0xaec2ff, 0.9);
    g.strokeCircle(cx, cy, Math.round(w * 0.38));
  }
}

export function ensureEnemyTexture(scene, enemyId) {
  if (!scene || !enemyId) return null;
  // If a real texture exists, use it as-is
  try { if (scene.textures && scene.textures.exists(enemyId)) return enemyId; } catch (e) {}

  const key = `fb_enemy_${enemyId}`;
  try { if (scene.textures && scene.textures.exists(key)) return key; } catch (e) {}

  const size = 52; // consistent visual size
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  try {
    const kind = pickCategory(enemyId);
    // Theme: treat flame/lava/ember/flaming/fire variants as flame theme for slimes
    const s = (enemyId || '').toLowerCase();
    const slimeTheme = (/flame|lava|ember|flaming|fire/.test(s)) ? 'flame' : 'green';
    // subtle shadow backdrop
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(Math.round(size / 2), Math.round(size / 2) + 8, Math.round(size * 0.6), Math.round(size * 0.22));
    switch (kind) {
      case 'goblin': drawGoblin(g, size, size); break;
      case 'skeleton': drawSkeleton(g, size, size); break;
      case 'zombie': drawZombie(g, size, size); break;
      case 'slime': drawSlime(g, size, size, slimeTheme); break;
      case 'devil': drawDevil(g, size, size); break;
      case 'lurker': drawLurker(g, size, size); break;
      case 'ghost': drawGhost(g, size, size); break;
      case 'rat': drawRat(g, size, size); break;
      default: drawGeneric(g, size, size); break;
    }
    // variant overlays for roles/rarity/subtype cues
    drawVariantOverlay(g, size, size, enemyId);
    g.generateTexture(key, size, size);
  } catch (e) {
    // emergency: simple circle fallback
    try {
      g.clear();
      g.fillStyle(0x666666, 1);
      g.fillCircle(18, 18, 16);
      g.generateTexture(key, 36, 36);
    } catch (err) {}
  }
  try { g.destroy(); } catch (e) {}
  return key;
}

export default ensureEnemyTexture;
