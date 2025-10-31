// Shared custom pipelines (WebGL) for post-processing effects
// Provides: InvertCircle postFX for inverting colors inside a circular region

// Registers the pipeline with the renderer if WebGL is available and not already registered.
function ensureInvertCircleRegistered(scene) {
    try {
        if (!scene || !scene.game || !scene.game.renderer) {
            return false;
        }
        const r = scene.game.renderer;
        // Only proceed for WebGL renderers
        if (r.type !== Phaser.WEBGL) {
            return false;
        }
        // Avoid double-registration
        if (r.pipelines && r.pipelines.has && r.pipelines.has('InvertCircle')) {
            return true;
        }

        // Define a minimal PostFX pipeline that inverts colors within a circle
        const PostFXPipeline = Phaser?.Renderer?.WebGL?.Pipelines?.PostFXPipeline;
        if (!PostFXPipeline) {
            return false;
        }

        class InvertCirclePipeline extends PostFXPipeline {
            constructor(game) {
                super({
                    game,
                    name: 'InvertCircle',
                    fragShader: `
#define SHADER_NAME INVERT_CIRCLE_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uSoftness;
uniform float uStrength;
uniform float uHoleRadius;
uniform float uAspect;
varying vec2 outTexCoord;
void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);
    
    // Adjust coordinates for aspect ratio to make circle truly circular
    vec2 aspectCoord = vec2(outTexCoord.x * uAspect, outTexCoord.y);
    vec2 aspectCenter = vec2(uCenter.x * uAspect, uCenter.y);
    float d = distance(aspectCoord, aspectCenter);
    
    // Smooth edge from outside to inside
    float edge = smoothstep(uRadius + uSoftness * 0.5, uRadius - uSoftness * 0.5, d);
    float inside = edge;
    
    // Hole mask: exclude a small circle around the player
    float holeEdge = smoothstep(uHoleRadius + uSoftness * 0.25, uHoleRadius - uSoftness * 0.25, d);
    float hole = 1.0 - holeEdge;
    
    // Final inversion amount: inside the circle but outside the hole
    float amt = inside * hole * uStrength;
    
    // Invert colors
    color.rgb = mix(color.rgb, 1.0 - color.rgb, amt);
    
    gl_FragColor = color;
}
`
                });
            }
            onPreRender() {
                // Uniforms are set from outside via setters before this runs
                this.set2f('uCenter', this._cx || 0.5, this._cy || 0.5);
                this.set1f('uRadius', this._radius || 0.2);
                this.set1f('uSoftness', this._softness || 0.04);
                this.set1f('uStrength', this._strength || 1.0);
                this.set1f('uHoleRadius', this._holeRadius || 0.06);
                this.set1f('uAspect', this._aspect || 1.0);
            }
        }
        // Phaser 3.60+ uses renderer.pipelines.addPostPipeline
        try {
            if (r.pipelines && typeof r.pipelines.addPostPipeline === 'function') {
                r.pipelines.addPostPipeline('InvertCircle', InvertCirclePipeline);
            } else if (typeof r.addPipeline === 'function') {
                r.addPipeline('InvertCircle', new InvertCirclePipeline(scene.game));
            } else {
                return false;
            }
        } catch (e) { 
            return false; 
        }
        return true;
    } catch (e) { 
        return false; 
    }
}

// Enable the invert circle postFX on the main camera.
// radiusPx: circle radius in world pixels (we convert to screen normalized)
// softnessPx: feather width in pixels relative to screen min-dimension
// strength: 0..1 inversion amount
export function enableInvertCircle(scene, radiusPx = 96, softnessPx = 16, strength = 1, holeRadiusPx = 20) {
    try {
        if (!ensureInvertCircleRegistered(scene)) {
            console.warn('[InvertCircle] Registration failed, cannot enable');
            return false;
        }
        const cam = scene && scene.cameras ? scene.cameras.main : null;
        if (!cam) {
            console.warn('[InvertCircle] No main camera found');
            return false;
        }
        if (!cam.setPostPipeline) {
            console.warn('[InvertCircle] Camera does not support setPostPipeline');
            return false;
        }
        // Attach the pipeline if not present
        try {
            const existing = cam.getPostPipeline ? cam.getPostPipeline('InvertCircle') : null;
            const hasAlready = !!(existing && ((Array.isArray(existing) && existing.length > 0) || (!Array.isArray(existing))));
            if (!hasAlready) {
                cam.setPostPipeline('InvertCircle');
            }
        } catch (e) { 
            console.warn('[InvertCircle] Error checking/attaching pipeline:', e);
            cam.setPostPipeline && cam.setPostPipeline('InvertCircle'); 
        }

        // Initialize uniforms immediately
        updateInvertCircle(scene, radiusPx, softnessPx, strength, holeRadiusPx);
        scene._invertCircleEnabled = true;
        return true;
    } catch (e) { 
        console.error('[InvertCircle] enableInvertCircle error:', e);
        return false; 
    }
}

// Update the pipeline uniforms based on the player position and camera.
export function updateInvertCircle(scene, radiusPx = 96, softnessPx = 16, strength = 1, holeRadiusPx = 20) {
    try {
        if (!scene || !scene.cameras || !scene.player) return false;
        const cam = scene.cameras.main;
        if (!cam) return false;
        let pipe = null;
        try {
            const p = cam.getPostPipeline ? cam.getPostPipeline('InvertCircle') : null;
            if (!p) {
                // console.warn('[InvertCircle] No pipeline found on camera (update)');
                return false;
            }
            pipe = Array.isArray(p) ? (p[0] || null) : p;
        } catch (e) {
            console.warn('[InvertCircle] Error getting pipeline:', e);
            return false;
        }
        if (!pipe) {
            // console.warn('[InvertCircle] Pipeline is null after extraction');
            return false;
        }

        // Convert player world position to screen position
        // Use camera's midPoint to get the actual center of the camera viewport in world space
        const camCenterX = cam.midPoint.x;
        const camCenterY = cam.midPoint.y;
        
        // Calculate screen position relative to camera center, then offset to 0-1 space
        const screenX = (scene.player.x - camCenterX) + (cam.width / 2);
        const screenY = (scene.player.y - camCenterY) + (cam.height / 2);
        
        // Normalize to 0-1 texture space
        // NOTE: Invert Y because shader texture coords have origin at bottom-left, not top-left
        const cx = screenX / cam.width;
        const cy = 1.0 - (screenY / cam.height);
        
        // Normalize radius based on height to maintain circular appearance
        // The shader will apply this in normalized space
        const rNorm = Math.max(0.0, (radiusPx || 0) / cam.height);
        const sNorm = Math.max(0.0, (softnessPx || 0) / cam.height);
        const hNorm = Math.max(0.0, (holeRadiusPx || 0) / cam.height);
        
        // Calculate aspect ratio to fix oval distortion
        const aspect = cam.width / cam.height;

        // Set uniforms via internal properties that onPreRender reads
        pipe._cx = cx;
        pipe._cy = cy;
        pipe._radius = rNorm;
        pipe._softness = sNorm;
        pipe._strength = Math.max(0, Math.min(1, strength == null ? 1 : strength));
        pipe._holeRadius = hNorm;
        pipe._aspect = aspect;
        return true;
    } catch (e) { 
        console.error('[InvertCircle] updateInvertCircle error:', e);
        return false; 
    }
}

// Disable and remove the invert circle pipeline from the main camera.
export function disableInvertCircle(scene) {
    try {
        if (!scene || !scene.cameras) return false;
        const cam = scene.cameras.main;
        if (!cam) return false;
        // Prefer removePostPipeline when available
        if (cam.removePostPipeline) {
            try { cam.removePostPipeline('InvertCircle'); } catch (e) {}
        } else if (cam.resetPostPipeline) {
            // This removes all; use only if remove is not available
            try { cam.resetPostPipeline(); } catch (e) {}
        } else {
            // As a soft fallback, set strength to 0 so the effect is a no-op
            try {
                const p = cam.getPostPipeline ? cam.getPostPipeline('InvertCircle') : null;
                const pipe = Array.isArray(p) ? (p[0] || null) : p;
                if (pipe) pipe.strength = 0;
            } catch (e) {}
        }
        scene._invertCircleEnabled = false;
        return true;
    } catch (e) { return false; }
}

// ============================================================================
// HELLSCAPE SHADER
// ============================================================================

function ensureHellscapeRegistered(scene) {
    try {
        if (!scene || !scene.game || !scene.game.renderer) {
            return false;
        }
        const r = scene.game.renderer;
        if (r.type !== Phaser.WEBGL) {
            return false;
        }
        if (r.pipelines && r.pipelines.has && r.pipelines.has('Hellscape')) {
            return true;
        }

        const PostFXPipeline = Phaser?.Renderer?.WebGL?.Pipelines?.PostFXPipeline;
        if (!PostFXPipeline) {
            return false;
        }

        class HellscapePipeline extends PostFXPipeline {
            constructor(game) {
                super({
                    game,
                    name: 'Hellscape',
                    fragShader: `
#define SHADER_NAME HELLSCAPE_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;
uniform float uDistortAmount;
uniform float uChromatic;       // 0..1 strength of chromatic aberration
uniform float uGrainAmount;     // 0..1 strength of film grain
uniform float uFlickerAmount;   // 0..1 amplitude of flicker
uniform float uVignetteBoost;   // 0..1 extra edge burn
uniform float uRedBoost;        // 0..1 extra red channel boost overall
uniform float uEdgeRedness;     // 0..1 extra redness on edges
uniform float uPulseStrength;   // 0..1 overall pulse amplitude
uniform float uPulseSpeed;      // Hz (cycles per second)
// Sin City mode controls
uniform float uSinCity;         // 0 or 1 to enable Sin City grade
uniform float uGrayAmount;      // 0..1 how much to push to grayscale
uniform float uRedIsolation;    // 0..1 how much to isolate and preserve reds
uniform float uContrast;        // 0..1 additional contrast
varying vec2 outTexCoord;

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = outTexCoord;
    
    // Heat distortion effect using time-based waves
    float distort = uDistortAmount * 0.01;
    uv.x += sin(uv.y * 10.0 + uTime * 2.0) * distort;
    uv.y += cos(uv.x * 10.0 + uTime * 1.5) * distort;

    // Vignette / distance from center used for multiple effects
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(outTexCoord, center);

    // Subtle chromatic aberration stronger at edges
    float edge = smoothstep(0.2, 0.9, dist);
    float aberration = edge * 0.004 * uChromatic; // up to ~0.4% shift
    vec2 dir = normalize(outTexCoord - center);
    vec2 off = dir * aberration;
    vec3 srcRGB;
    if (uChromatic > 0.001) {
        float r = texture2D(uMainSampler, uv + off).r;
        float g = texture2D(uMainSampler, uv).g;
        float b = texture2D(uMainSampler, uv - off).b;
        srcRGB = vec3(r, g, b);
    } else {
        srcRGB = texture2D(uMainSampler, uv).rgb;
    }
    vec4 color = vec4(srcRGB, 1.0);
    
    // Desaturate the base color
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(color.rgb, vec3(gray), 0.65 * uIntensity);
    
    // Shift colors toward red/orange
    float red = desaturated.r * (1.35 + 0.5 * uRedBoost);
    float green = desaturated.g * (0.55 - 0.25 * uRedBoost);
    float blue = desaturated.b * (0.18 - 0.10 * uRedBoost);
    
    vec3 hellColor = vec3(red, green, blue);
    
    // Add fiery glow to brighter areas
    float brightness = max(color.r, max(color.g, color.b));
    hellColor += vec3(0.4, 0.15, 0.0) * brightness * uIntensity;
    
    // Burning edges vignette effect
    float vignette = smoothstep(0.8, 0.3, dist);
    // Boost edge burn for more hellish look
    vignette = clamp(vignette - (uVignetteBoost * 0.25), 0.0, 1.0);
    
    // Add fire colors at the edges
    vec3 fireEdge = vec3(1.0, 0.12, 0.06) * (1.0 - vignette) * (uIntensity * (0.85 + 0.45 * uEdgeRedness));
    hellColor += fireEdge * 0.7;
    
    // Darken edges
    hellColor *= mix(0.3, 1.0, vignette);

    // Film grain/noise
    if (uGrainAmount > 0.001) {
        float g = noise(outTexCoord * vec2(1024.0, 768.0) + uTime * 24.0);
        g = (g - 0.5) * 0.12 * uGrainAmount; // +/-6% at full strength
        hellColor += g;
    }

    // Subtle global flicker (fast, low amplitude)
    float flicker = 1.0 + sin(uTime * 13.0 + outTexCoord.y * 4.0) * 0.06 * uFlickerAmount;
    // 1Hz atmosphere pulse to help track time in stealth
    float twoPI = 6.2831853;
    float pulse = 0.5 + 0.5 * sin(uTime * twoPI * max(0.1, uPulseSpeed));
    float effIntensity = clamp(uIntensity * flicker * (1.0 + (pulse * 0.3 * uPulseStrength)), 0.0, 1.6);
    
    // Optional Sin City grade: high contrast grayscale with preserved reds
    if (uSinCity > 0.5) {
        vec3 src = color.rgb;
        float gray2 = dot(src, vec3(0.299, 0.587, 0.114));
        vec3 grayBase = mix(src, vec3(gray2), clamp(uGrayAmount, 0.0, 1.0));
        float redness = max(src.r - max(src.g, src.b), 0.0);
        float redMask = smoothstep(0.05, 0.25, redness) * clamp(uRedIsolation, 0.0, 1.0);
        vec3 redTint = vec3(1.0, 0.08, 0.08);
        vec3 sinCityColor = mix(grayBase, mix(grayBase, redTint, redMask), redMask);
        // Extra contrast
        float cc = clamp(uContrast, 0.0, 1.0);
        sinCityColor = clamp((sinCityColor - 0.5) * (1.0 + cc * 1.8) + 0.5, 0.0, 1.0);
        hellColor = sinCityColor;
    }

    // Mix original with effect based on intensity
    vec3 finalColor = mix(color.rgb, hellColor, effIntensity);
    
    gl_FragColor = vec4(finalColor, color.a);
}
`
                });
            }
            onPreRender() {
                this.set1f('uTime', this._time || 0.0);
                this.set1f('uIntensity', this._intensity || 1.0);
                this.set1f('uDistortAmount', this._distortAmount || 1.0);
                this.set1f('uChromatic', this._chromatic || 0.0);
                this.set1f('uGrainAmount', this._grainAmount || 0.0);
                this.set1f('uFlickerAmount', this._flickerAmount || 0.0);
                this.set1f('uVignetteBoost', this._vignetteBoost || 0.0);
                this.set1f('uRedBoost', this._redBoost || 0.0);
                this.set1f('uEdgeRedness', this._edgeRedness || 0.0);
                this.set1f('uPulseStrength', this._pulseStrength || 0.0);
                this.set1f('uPulseSpeed', this._pulseSpeed || 1.0);
                this.set1f('uSinCity', this._sinCity ? 1.0 : 0.0);
                this.set1f('uGrayAmount', this._grayAmount || 0.0);
                this.set1f('uRedIsolation', this._redIsolation || 0.0);
                this.set1f('uContrast', this._contrast || 0.0);
            }
        }
        
        try {
            if (r.pipelines && typeof r.pipelines.addPostPipeline === 'function') {
                r.pipelines.addPostPipeline('Hellscape', HellscapePipeline);
            } else if (typeof r.addPipeline === 'function') {
                r.addPipeline('Hellscape', new HellscapePipeline(scene.game));
            } else {
                return false;
            }
        } catch (e) { 
            return false; 
        }
        return true;
    } catch (e) { 
        return false; 
    }
}

// Enable hellscape effect on main camera
// intensity: 0..1 how strong the effect is (0 = normal, 1 = full hell)
// distortAmount: 0..1 how much heat distortion (default 1.0)
export function enableHellscape(scene, intensity = 1.0, distortAmount = 1.0, options = null) {
    try {
        if (!ensureHellscapeRegistered(scene)) {
            console.warn('[Hellscape] Registration failed, cannot enable');
            return false;
        }
        const cam = scene && scene.cameras ? scene.cameras.main : null;
        if (!cam) {
            console.warn('[Hellscape] No main camera found');
            return false;
        }
        
        try {
            const existing = cam.getPostPipeline ? cam.getPostPipeline('Hellscape') : null;
            const hasAlready = !!(existing && ((Array.isArray(existing) && existing.length > 0) || (!Array.isArray(existing))));
            if (!hasAlready) {
                cam.setPostPipeline('Hellscape');
            }
        } catch (e) { 
            cam.setPostPipeline && cam.setPostPipeline('Hellscape'); 
        }

        // Initialize uniforms
        updateHellscape(scene, intensity, distortAmount, options || undefined);
        
        // Set up update callback to animate time and optional dynamic pulse
        if (!scene._hellscapeUpdate) {
            scene._hellscapeUpdate = function() {
                try {
                    const pipe = cam.getPostPipeline ? cam.getPostPipeline('Hellscape') : null;
                    const p = Array.isArray(pipe) ? (pipe[0] || null) : pipe;
                    if (p) {
                        p._time = (p._time || 0) + 0.016; // Approximate frame time
                        // Dynamic heartbeat ramp if enabled and stealth context is present
                        if (p._pulseDynamic && scene && scene.char && scene.char._shadowstep) {
                            const ss = scene.char._shadowstep;
                            const now = Date.now();
                            const total = Math.max(100, Number(ss.durationMs || (ss.expiresAt ? (ss.expiresAt - (ss.startsAt || (now-100))) : 0)));
                            const remaining = Math.max(0, Number((ss.expiresAt || now) - now));
                            const progress = 1.0 - Math.min(1.0, Math.max(0.0, remaining / total));
                            // Base values to ramp from
                            const baseStr = (p._pulseStrengthBase != null) ? p._pulseStrengthBase : (p._pulseStrength || 0.8);
                            const baseSpd = (p._pulseSpeedBase != null) ? p._pulseSpeedBase : (p._pulseSpeed || 1.0);
                            // Ease-out ramp for speed, linear for strength
                            const eased = (1 - Math.pow(1 - progress, 2));
                            p._pulseStrength = Math.min(1.2, baseStr * (0.9 + 0.6 * progress));
                            p._pulseSpeed = Math.min(3.0, baseSpd * (1.0 + 1.6 * eased));
                        }
                    }
                } catch (e) {}
            };
            scene.events.on('update', scene._hellscapeUpdate);
        }
        
        scene._hellscapeEnabled = true;
        return true;
    } catch (e) { 
        console.error('[Hellscape] enableHellscape error:', e);
        return false; 
    }
}

// Update hellscape effect parameters
export function updateHellscape(scene, intensity = 1.0, distortAmount = 1.0, options = undefined) {
    try {
        if (!scene || !scene.cameras) return false;
        const cam = scene.cameras.main;
        if (!cam) return false;
        
        let pipe = null;
        try {
            const p = cam.getPostPipeline ? cam.getPostPipeline('Hellscape') : null;
            if (!p) return false;
            pipe = Array.isArray(p) ? (p[0] || null) : p;
        } catch (e) {
            return false;
        }
        if (!pipe) return false;

    pipe._intensity = Math.max(0, Math.min(1.5, intensity));
    pipe._distortAmount = Math.max(0, Math.min(2, distortAmount));
        // Optional stylistic controls
        const opts = options || {};
    pipe._chromatic = Math.max(0, Math.min(1, opts.chromatic || pipe._chromatic || 0));
    pipe._grainAmount = Math.max(0, Math.min(1, opts.grain || opts.grainAmount || pipe._grainAmount || 0));
    pipe._flickerAmount = Math.max(0, Math.min(1, opts.flicker || pipe._flickerAmount || 0));
    pipe._vignetteBoost = Math.max(0, Math.min(1, opts.vignetteBoost || pipe._vignetteBoost || 0));
    pipe._redBoost = Math.max(0, Math.min(1, opts.redBoost || pipe._redBoost || 0));
    pipe._edgeRedness = Math.max(0, Math.min(1, opts.edgeRedness || pipe._edgeRedness || 0));
    pipe._pulseStrength = Math.max(0, Math.min(1.2, (opts.pulseStrength != null ? opts.pulseStrength : (pipe._pulseStrength != null ? pipe._pulseStrength : 0))));
    pipe._pulseSpeed = Math.max(0.1, Math.min(4, (opts.pulseSpeed != null ? opts.pulseSpeed : (pipe._pulseSpeed != null ? pipe._pulseSpeed : 1.0))));
    // Persist base values for dynamic ramping if enabled
    if (opts.pulseStrength != null) pipe._pulseStrengthBase = pipe._pulseStrength;
    if (opts.pulseSpeed != null) pipe._pulseSpeedBase = pipe._pulseSpeed;
    if (opts.dynamicPulse != null) pipe._pulseDynamic = !!opts.dynamicPulse;
    // Sin City controls
    if (opts.sinCity != null) pipe._sinCity = !!opts.sinCity;
    if (opts.grayAmount != null) pipe._grayAmount = Math.max(0, Math.min(1, opts.grayAmount));
    if (opts.redIsolation != null) pipe._redIsolation = Math.max(0, Math.min(1, opts.redIsolation));
    if (opts.contrast != null) pipe._contrast = Math.max(0, Math.min(1, opts.contrast));
        return true;
    } catch (e) { 
        return false; 
    }
}

// Disable hellscape effect
export function disableHellscape(scene) {
    try {
        if (!scene || !scene.cameras) return false;
        const cam = scene.cameras.main;
        if (!cam) return false;
        
        // Remove update callback
        if (scene._hellscapeUpdate) {
            scene.events.off('update', scene._hellscapeUpdate);
            scene._hellscapeUpdate = null;
        }
        
        if (cam.removePostPipeline) {
            try { cam.removePostPipeline('Hellscape'); } catch (e) {}
        } else if (cam.resetPostPipeline) {
            try { cam.resetPostPipeline(); } catch (e) {}
        }
        
        scene._hellscapeEnabled = false;
        return true;
    } catch (e) { return false; }
}

export default {
    enableInvertCircle,
    updateInvertCircle,
    disableInvertCircle,
    enableHellscape,
    updateHellscape,
    disableHellscape
};
