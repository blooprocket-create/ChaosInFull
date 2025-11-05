// Shared fallback enemy texture generator for Phaser scenes.
// Produces themed, layered shapes per enemy id when no spritesheet exists.

function pickCategory(id) {
  const s = (id || '').toLowerCase();
  if (/goblin/.test(s)) return 'goblin';
  if (/skeleton|bone/.test(s)) return 'skeleton';
  if (/zombie|undead/.test(s)) return 'zombie';
  if (/slime|flame|lava|ember|flaming/.test(s)) return 'slime';
  if (/devil|demon|imp|hell/.test(s)) return 'devil';
  if (/lurker|void|abyss|shadow/.test(s)) return 'lurker';
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

function drawSlime(g, w, h) {
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  // outer dark blob
  g.fillStyle(0x5b1414, 1);
  g.fillEllipse(cx, cy, Math.round(w * 0.86), Math.round(h * 0.66));
  // mid glow
  g.fillStyle(0xd44d2a, 0.95);
  g.fillEllipse(cx, cy, Math.round(w * 0.7), Math.round(h * 0.5));
  // inner highlight
  g.fillStyle(0xffb36b, 0.9);
  g.fillEllipse(cx - Math.round(w * 0.08), cy - Math.round(h * 0.1), Math.round(w * 0.34), Math.round(h * 0.2));
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
    // subtle shadow backdrop
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(Math.round(size / 2), Math.round(size / 2) + 8, Math.round(size * 0.6), Math.round(size * 0.22));
    switch (kind) {
      case 'goblin': drawGoblin(g, size, size); break;
      case 'skeleton': drawSkeleton(g, size, size); break;
      case 'zombie': drawZombie(g, size, size); break;
      case 'slime': drawSlime(g, size, size); break;
      case 'devil': drawDevil(g, size, size); break;
      case 'lurker': drawLurker(g, size, size); break;
      default: drawGeneric(g, size, size); break;
    }
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
