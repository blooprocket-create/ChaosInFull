// Shared helpers for enlarging the world and configuring the main camera
// Lightweight and defensive so it can be dropped into any scene safely.

/**
 * Configure a larger physics world and camera bounds. Optionally follow the player.
 * Returns { W, H } = the configured world width/height.
 */
export function setupWorldAndCamera(scene, opts = {}) {
  const {
    scale = 3,
    worldWidth,
    worldHeight,
    follow = true,
    followLerp = 0.12,
    deadzoneFactor = 0.35,
    roundPixels = true,
    zoom = null,
  } = opts;

  const baseW = (scene && scene.scale && scene.scale.width) || 800;
  const baseH = (scene && scene.scale && scene.scale.height) || 600;
  const W = Math.max(1, Math.round(worldWidth || baseW * scale));
  const H = Math.max(1, Math.round(worldHeight || baseH * scale));

  try { if (scene.physics && scene.physics.world && scene.physics.world.setBounds) scene.physics.world.setBounds(0, 0, W, H); } catch (e) {}
  try { if (scene.cameras && scene.cameras.main && scene.cameras.main.setBounds) scene.cameras.main.setBounds(0, 0, W, H); } catch (e) {}
  try { if (zoom != null && scene.cameras && scene.cameras.main && scene.cameras.main.setZoom) scene.cameras.main.setZoom(zoom); } catch (e) {}

  if (follow && scene && scene.player && scene.cameras && scene.cameras.main) {
    try { scene.cameras.main.startFollow(scene.player, true, followLerp, followLerp); } catch (e) {}
    try { if (scene.cameras.main.setDeadzone) scene.cameras.main.setDeadzone(Math.round(baseW * deadzoneFactor), Math.round(baseH * deadzoneFactor)); } catch (e) {}
    try { if (roundPixels && scene.cameras.main.setRoundPixels) scene.cameras.main.setRoundPixels(true); } catch (e) {}
  }

  return { W, H };
}

/**
 * Call after the player is created if you initialized the world before having a player.
 */
export function ensureCameraFollow(scene, opts = {}) {
  if (!scene || !scene.player || !scene.cameras || !scene.cameras.main) return false;
  const { followLerp = 0.12, deadzoneFactor = 0.35, roundPixels = true } = opts;
  const baseW = (scene && scene.scale && scene.scale.width) || 800;
  const baseH = (scene && scene.scale && scene.scale.height) || 600;
  try { scene.cameras.main.startFollow(scene.player, true, followLerp, followLerp); } catch (e) {}
  try { if (scene.cameras.main.setDeadzone) scene.cameras.main.setDeadzone(Math.round(baseW * deadzoneFactor), Math.round(baseH * deadzoneFactor)); } catch (e) {}
  try { if (roundPixels && scene.cameras.main.setRoundPixels) scene.cameras.main.setRoundPixels(true); } catch (e) {}
  return true;
}
