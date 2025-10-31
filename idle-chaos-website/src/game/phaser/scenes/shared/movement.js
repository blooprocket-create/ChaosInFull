// Shared helpers for smoothing top-down player movement and animations.
// These utilities assume scenes attach the common WASD key bindings via __shared_keys.
import { effectiveStats } from './stats.js';

function getInputVector(scene) {
    const keys = scene.keys || {};
    let vx = 0;
    let vy = 0;
    if (keys.left && keys.left.isDown) vx -= 1;
    if (keys.right && keys.right.isDown) vx += 1;
    if (keys.up && keys.up.isDown) vy -= 1;
    if (keys.down && keys.down.isDown) vy += 1;
    return { x: vx, y: vy };
}

export function updateSmoothPlayerMovement(scene, options = {}) {
    if (!scene || !scene.player || !scene.player.body) return null;

    const defaults = {
        baseSpeed: 180,
        runMultiplier: 1.6,
        smoothing: 0.18,
        minVelocity: 2,
        clampVelocity: 420
    };
    const cfg = Object.assign({}, defaults, options);
    const keys = scene.keys || {};
    const input = getInputVector(scene);
    // Respect a global "Always Run" setting stored on window.__game_settings (set by settings modal)
    const globalAlways = (typeof window !== 'undefined' && window.__game_settings && window.__game_settings.alwaysRun) ? true : false;
    const running = globalAlways || !!(keys.shift && keys.shift.isDown);
    const hasInput = (input.x !== 0 || input.y !== 0);
    // Prefer the character's computed movementSpeed when available so physics velocity
    // reflects the derived stat. Fallback to cfg.baseSpeed if effectiveStats is not available.
    let baseSpeed = cfg.baseSpeed;
    try {
        const eff = (scene && scene.char && typeof effectiveStats === 'function') ? effectiveStats(scene.char) : null;
        if (eff && typeof eff.movementSpeed === 'number') baseSpeed = Number(eff.movementSpeed || baseSpeed);
    } catch (e) { /* ignore and use cfg.baseSpeed */ }
    const targetSpeed = running ? baseSpeed * cfg.runMultiplier : baseSpeed;
    const state = scene._movementState || { vx: 0, vy: 0 };

    let targetVx = 0;
    let targetVy = 0;
    if (input.x !== 0 || input.y !== 0) {
        const len = Math.sqrt(input.x * input.x + input.y * input.y) || 1;
        targetVx = (input.x / len) * targetSpeed;
        targetVy = (input.y / len) * targetSpeed;
    }

    const smooth = Phaser.Math.Clamp(cfg.smoothing, 0.05, 0.5);
    state.vx = Phaser.Math.Linear(state.vx, targetVx, smooth);
    state.vy = Phaser.Math.Linear(state.vy, targetVy, smooth);

    if (Math.abs(state.vx) < cfg.minVelocity) state.vx = 0;
    if (Math.abs(state.vy) < cfg.minVelocity) state.vy = 0;

    const maxSpeed = cfg.clampVelocity;
    state.vx = Phaser.Math.Clamp(state.vx, -maxSpeed, maxSpeed);
    state.vy = Phaser.Math.Clamp(state.vy, -maxSpeed, maxSpeed);

    scene._movementState = state;

    // apply velocity
    scene.player.setVelocity(state.vx, state.vy);

    const moving = Math.abs(state.vx) > cfg.minVelocity || Math.abs(state.vy) > cfg.minVelocity;
    if (moving) {
        if (Math.abs(state.vx) > Math.abs(state.vy)) scene._facing = state.vx < 0 ? 'left' : 'right';
        else scene._facing = state.vy < 0 ? 'up' : 'down';
    } else if (!scene._facing) {
        scene._facing = 'down';
    }

    return {
        moving,
        running,
        facing: scene._facing || 'down',
        velocity: { x: state.vx, y: state.vy },
        hasInput,
        input: { x: input.x, y: input.y }
    };
}

export function playDirectionalAnimation(scene, movement, options = {}) {
    if (!scene || !scene.player || !scene.anims || !movement) return;
    if (scene._attacking) return;

    const cfg = Object.assign({
        walkKey: 'walk',
        runKey: 'run',
        idleKey: 'idle',
        useFlip: true
    }, options);

    const facing = movement.facing || 'down';
    const walkKey = cfg.walkKey;
    const runKey = cfg.runKey;
    const idleKey = cfg.idleKey;
    const baseKey = movement.running ? runKey : walkKey;
    const dirKey = baseKey + '_' + facing;

    if (movement.moving) {
        if (scene.anims.exists(dirKey)) {
            scene.player.anims.play(dirKey, true);
            if (cfg.useFlip) scene.player.setFlipX(false);
        } else if (scene.anims.exists(baseKey)) {
            scene.player.anims.play(baseKey, true);
            if (cfg.useFlip) scene.player.setFlipX(facing === 'left');
        }
    } else {
        const idleDirKey = idleKey + '_' + facing;
        if (scene.anims.exists(idleDirKey)) scene.player.anims.play(idleDirKey, true);
        else if (scene.anims.exists(idleKey)) scene.player.anims.play(idleKey, true);
        if (cfg.useFlip && !scene.anims.exists(idleDirKey)) scene.player.setFlipX(facing === 'left');
    }
}

export function updateDepthForTopDown(scene, options = {}) {
    if (!scene || !scene.player) return;
    const cfg = Object.assign({ min: 0.9, max: 2.4 }, options);
    const height = Math.max(1, scene.scale ? scene.scale.height : 720);
    const y = scene.player.y || 0;
    const depth = Phaser.Math.Clamp(cfg.min + (y / height) * (cfg.max - cfg.min), cfg.min, cfg.max);
    try { scene.player.setDepth(depth); } catch (e) { /* ignore depth set errors */ }
}

export default {
    updateSmoothPlayerMovement,
    playDirectionalAnimation,
    updateDepthForTopDown
};
