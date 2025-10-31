// Lightweight dev diagnostics helpers (scene cycle, etc.)
// Exposed via window.__diag in main.js

function ensureWindow() { return (typeof window !== 'undefined') ? window : null; }

function getActiveScene(game) {
  if (!game || !game.scene) return null;
  try { const scenes = game.scene.getScenes(true) || []; return scenes[0] || null; } catch (e) { return null; }
}

function defaultSequence() {
  return ['Start', 'Town', 'OuterField', 'Cave', 'BrokenDock', 'GloamwayBastion', 'GoblinCamp'];
}

export function installDiagnostics(game) {
  const w = ensureWindow();
  if (!w) return;
  const api = w.__diag || {};

  let cycle = { running: false, timerId: null, index: 0, list: [] };

  function stopSceneCycle() {
    try { if (cycle.timerId) { clearTimeout(cycle.timerId); cycle.timerId = null; } } catch (e) {}
    cycle.running = false; cycle.index = 0; cycle.list = [];
  }

  function step(delayMs) {
    const g = w.GAME || game;
    const s = getActiveScene(g);
    if (!g) return stopSceneCycle();
    if (!cycle.running || !cycle.list || cycle.list.length === 0) return stopSceneCycle();
    const nextKey = cycle.list[cycle.index % cycle.list.length];
    cycle.index++;
    if (!nextKey) return stopSceneCycle();
    try {
      // Pass through character and username if available from the current active scene
      const data = s ? { character: s.char || null, username: s.username || null } : {};
      if (s && s.scene && typeof s.scene.start === 'function') s.scene.start(nextKey, data);
      else if (g && g.scene && typeof g.scene.start === 'function') g.scene.start(nextKey, data);
    } catch (e) { /* noop */ }
    cycle.timerId = setTimeout(() => step(delayMs), delayMs);
  }

  function startSceneCycle({ sequence, delayMs = 2000 } = {}) {
    stopSceneCycle();
    const list = Array.isArray(sequence) && sequence.length ? sequence.slice() : defaultSequence();
    cycle.list = list;
    cycle.index = 0;
    cycle.running = true;
    step(delayMs);
  }

  api.startSceneCycle = startSceneCycle;
  api.stopSceneCycle = stopSceneCycle;
  api.defaultSequence = defaultSequence;
  w.__diag = api;
}

export default { installDiagnostics };
