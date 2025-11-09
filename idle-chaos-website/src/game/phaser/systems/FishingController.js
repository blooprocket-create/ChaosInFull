// Phase 1/3 Active Fishing Prototype (Hybrid Revamp + Mastery integration)
// Lightweight tension mini-game controller.
// States: idle -> casting -> waiting -> bite -> tension -> resolve -> idle
// Integrates with existing scene inventory/xp helpers (_grantFishingXp, _addItemToInventory).
// Non-modal: small HUD overlay anchored bottom-center.
// Mastery bonuses applied (stability/control/sensitivity/precision/baitEfficiency/rarityBoost).

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
export class FishingController {
    constructor(scene) {
        this.scene = scene;
        this.state = 'idle';
        this.activeFish = null;
        this.baitId = null;
        this._activeTimeOfDay = null; // 'day' | 'night' | null
        this.abortDistance = 100; // px threshold to auto-hide HUD & abort when moving away
        this.castCooldownMs = 1200;
        this.lastCastAt = 0;
        this.waitTimer = 0;
        this.waitDuration = 0;
        this.progress = 0; // capture progress 0..1
        this.tension = 0.5; // current tension pointer 0..1
        this.targetMin = 0.4; // moving safe zone
        this.targetMax = 0.6;
        this.targetVel = 0.0;
        this.elapsed = 0;
        this.overlay = null;
        this.lastInputTime = 0;
        this.failCount = 0;
        this.maxFails = 6;
    // Continuous line tension model (0..1). Increases outside zone, decays inside.
    this.lineTension = 0;
    this.maxLineTension = 1;
        // Segment performance tracking for XP formula
        this.totalSegments = 0; // number of reel attempts (successful or failed)
        this.perfectSegments = 0; // subset counted as "perfect" (pointer centered)
        // Rarity multipliers (tunable): Common 1, Uncommon 1.25, Rare 1.7, Epic 3.4, Legendary 6.5
        this._rarityXpMult = { common: 1, uncommon: 1.25, rare: 1.7, epic: 3.4, legendary: 6.5 };
        // Center tolerance ratio for a perfect segment (portion of zone width allowed from center)
        this._perfectToleranceRatio = 0.30;
        // Focus pulse (anti-bot micro-check)
        this.focusIntervalMs = 3500;
        this._nextFocusAt = 0;
        this._focusActiveUntil = 0;
        this._focusSatisfied = true;
        this._lastTickTelemetryAt = 0;
        // HUD is created lazily when a cast starts
    }

    /**
     * Gameplay Primer (Phase 1)
     * ------------------------------------------------------------
     * 1. Interact [E] at a fishing spot: controller picks a fish candidate and enters 'waiting'.
    * 2. After a variable wait a 'bite' triggers and the controller auto-enters tension.
    * 3. In 'tension' HOLD click/Space to push the pointer (white bar) RIGHT; release to drift LEFT.
    *    - While INSIDE the blue zone you gain progress; closer to center = more progress.
    *    - A mint band marks the perfect center; time spent here improves XP performance.
    *    - While OUTSIDE the zone, line tension (red bar) increases; when it fills, the line snaps.
     * 4. On reaching 100% progress you resolve the catch; XP is awarded using difficulty + rarity + performance formula.
     * 5. Bait is only consumed on successful catch (mastery may preserve it).
     *
     * Visual Elements
     *  - Safe Zone (blue/purple gradient band) slides horizontally & occasionally reverses (targetMin/targetMax).
     *  - Pointer (white slim bar) represents current tension alignment; it has slight procedural drift.
    *  - A thin mint band marks the "perfect" center region inside the zone; taps while the white bar is within this band count toward better XP.
     *  - Progress (green overlay) fills from the left showing capture progress.
     *
     * Tuning Overview
     *  - Rod control widens zone; stability reduces drift & raises fail tolerance; precision increases progress gain; sensitivity reduces wait.
     *  - Mastery adds additive multipliers (control/sensitivity/precision/stability) and rarity + bait efficiency.
     *  - Focus pulses occasionally require a Space press inside a short window to avoid extra penalties.
     *
     * Simplification Notes
     *  - Drift has been dampened to reduce jitter complaints. Adjust DRIFT_BASE / driftScale if you want more motion.
     *  - Zone velocity changes are throttled to avoid chaotic motion; see _updateTension for probabilities.
     */

    destroy() { this._removeHud(); }

    tryInteract(node, options = {}) {
        if (this.state !== 'idle') return;
        const now = performance.now ? performance.now() : Date.now();
        if (now - this.lastCastAt < this.castCooldownMs) {
            this._toast('Catching your breath...');
            return;
        }
        // Simple default bait selection: pick first *_bait in inventory with qty > 0.
        const bait = this._pickDefaultBait();
        if (!bait) {
            this._toast('Need bait to fish');
            return;
        }
        this.startCast(bait.id, options);
    }

    startCast(baitId, options = {}) {
        // Ensure HUD exists and is visible when starting a cast
        if (!this.overlay) this._createHud();
        if (this.overlay) this.overlay.style.display = '';
        this._activeTimeOfDay = options.timeOfDay || null;
        const mastery = this._getMastery();
        const fishOptions = this._eligibleFishForBait(baitId, options);
        if (!fishOptions.length) { this._toast('Nothing bites this bait yet (rod tier?)'); return; }
        this.baitId = baitId;
        // Pick fish candidate upfront (will be fought in tension phase)
        this.activeFish = this._weightedPick(fishOptions);
        // Bite wait: based on difficulty + small randomness (lower diff = faster)
        const diff = this.activeFish.difficulty || 10;
        let baseMs = 1800 + Math.min(2400, diff * 40);
        // Rod sensitivity and hotspot reduce wait
        const rod = this._getRodStats();
        const hotspotWaitMult = options.hotspot ? 0.7 : 1.0;
        const sensitivityMult = rod.sensitivityWaitMult || 1.0;
        // Mastery sensitivity rank reduces wait by 4% per rank (stacking multiplicatively here as a single multiplier)
        const masteryWaitMult = Math.max(0.5, 1 - 0.04 * (mastery.sensitivity || 0));
        this.waitDuration = Math.round(baseMs * (0.75 + Math.random() * 0.5) * hotspotWaitMult * sensitivityMult * masteryWaitMult);
        this.waitTimer = 0;
        this.progress = 0;
        this.tension = 0.5;
        this.state = 'waiting';
        this.failCount = 0;
        this.totalSegments = 0;
        this.perfectSegments = 0;
        this._scheduleNextFocus();
        const masterySummary = mastery;
        const rodSnapshot = {
            name: rod.name,
            controlZoneMult: rod.controlZoneMult,
            sensitivityWaitMult: rod.sensitivityWaitMult,
            precisionGainMult: rod.precisionGainMult,
            zoneShrinkMult: rod.zoneShrinkMult,
            maxFails: (typeof rod.maxFails==='number'?rod.maxFails:6)
        };
        this._emitTelemetry('cast', { baitId, fishId: this.activeFish.id, rod: rod.name, hotspot: !!options.hotspot, mastery: masterySummary, rodStats: rodSnapshot });
        this._emitTelemetry('fishing_cast', { baitId, fishId: this.activeFish.id, rod: rod.name, hotspot: !!options.hotspot, timeOfDay: this._activeTimeOfDay, mastery: masterySummary, rodStats: rodSnapshot });
        this.lastCastAt = performance.now ? performance.now() : Date.now();
        this._showMessage(`Casting... (${this.activeFish.name})`);
    }

    update(time, delta) {
        if (!this.overlay) return; // if HUD removed skip
        this.elapsed += delta;
        switch (this.state) {
            case 'waiting':
                this.waitTimer += delta;
                if (this.waitTimer >= this.waitDuration) {
                    this.state = 'bite';
                    this._showMessage('Bite! Hold click/Space to reel →');
                    this._emitTelemetry('bite', { fishId: this.activeFish && this.activeFish.id });
                    this._emitTelemetry('fishing_bite', { fishId: this.activeFish && this.activeFish.id, timeOfDay: this._activeTimeOfDay });
                    // Immediately enter tension for hold-to-reel controls
                    this.state = 'tension';
                    this._showMessage('Reel! Hold pushes right, release drifts left');
                    this._initTensionZone();
                }
                break;
            case 'bite':
                // Unused, we auto-enter tension above
                break;
            case 'tension':
                this._updateTension(delta);
                break;
            case 'resolve':
                // Brief display then reset
                break;
        }
        this._updateHud();
        // Abort if player moved too far
        if (this.state !== 'idle' && this._playerMoved()) {
            this._abortForDistance();
        }
    }

    _updateTension(delta) {
        const dt = Math.max(0.5, Math.min(2.0, delta / 16));
        // Move safe zone
        this.targetMin += this.targetVel * (delta / 1000);
        this.targetMax += this.targetVel * (delta / 1000);
        // Bounce zone at edges
        if (this.targetMin < 0) { const shift = -this.targetMin; this.targetMin += shift; this.targetMax += shift; this.targetVel *= -1; }
        if (this.targetMax > 1) { const shift = this.targetMax - 1; this.targetMin -= shift; this.targetMax -= shift; this.targetVel *= -1; }
        // Random slight velocity change
        if (Math.random() < 0.01) this.targetVel = (Math.random() * 0.6 - 0.3);
        // Pointer passive drift making player adjust
        const masteryDrift = this._getMastery();
        const driftScale = Math.max(0.25, 1 - 0.08 * (masteryDrift.stability || 0));
        // NERF: gentler pointer movement & input force
        if (this._ptrVel == null) this._ptrVel = 0;
        const DRIFT_ACCEL = 0.010; // was 0.018
        const DAMPING_PER_TICK = 0.92; // slightly less damping to keep feel responsive
        const INTENT_FORCE = this._isHoldActive() ? 0.028 : -0.020; // was 0.055 / -0.040
        this._ptrVel += INTENT_FORCE * dt;
        this._ptrVel += (Math.random() - 0.5) * DRIFT_ACCEL * dt * driftScale;
        this._ptrVel *= Math.pow(DAMPING_PER_TICK, dt);
        const MAX_VEL = 0.020; // was 0.035
    if (this._ptrVel > MAX_VEL) this._ptrVel = MAX_VEL;
    else if (this._ptrVel < -MAX_VEL) this._ptrVel = -MAX_VEL;
    this.tension += this._ptrVel * dt;
        this.tension = Math.max(0, Math.min(1, this.tension));
        // Focus pulse check: occasionally require a quick press
        const now = this.elapsed;
        if (now >= this._nextFocusAt && now <= this._focusActiveUntil && !this._focusSatisfied) {
            // Awaiting a press
            if (this._spaceJustDown()) {
                this._focusSatisfied = true; // passed
            }
        } else if (now > this._focusActiveUntil && !this._focusSatisfied) {
            // Missed the focus window -> heavy penalty
            this.failCount += 2;
            this._showMessage(`Lost focus! (${this.failCount}/${this.maxFails})`);
            this._scheduleNextFocus();
        }

        // Legacy tap mechanic removed; replaced by continuous scoring below
        const width = Math.max(0.02, this.targetMax - this.targetMin);
        const zoneCenter = (this.targetMin + this.targetMax) / 2;
        const inZone = (this.tension >= this.targetMin && this.tension <= this.targetMax);
        if (inZone) {
            const diff = (this.activeFish.difficulty || 10);
            const rod = this._getRodStats();
            const masteryPrecision = this._getMastery();
            const basePerTick = (0.0028 + diff * 0.00002) * dt;
            const centerDist = Math.abs(this.tension - zoneCenter);
            const centerFactor = Math.max(0.45, 1 - (centerDist / (width / 2)));
            const gain = basePerTick * (rod.precisionGainMult || 1.0) * (1 + 0.05 * (masteryPrecision.precision || 0)) * centerFactor;
            this.progress = Math.min(1, this.progress + gain);
            // NERF: faster recovery inside zone
            this.lineTension = Math.max(0, this.lineTension - 0.0060 * dt);
            this.totalSegments++;
            const tolerance = width * this._perfectToleranceRatio;
            if (Math.abs(this.tension - zoneCenter) <= tolerance * 0.5) this.perfectSegments++;
            this._showMessage(`Reeling ${Math.round(this.progress * 100)}%`);
            // NERF: gentler, conditional shrink only after 55% progress and much slower
            if (this.progress > 0.55) {
                const shrink = 0.0003 * (rod.zoneShrinkMult || 1.0) * dt; // was 0.0012
                this.targetMin += shrink;
                this.targetMax -= shrink;
            }
            // Maintain a wider minimum floor
            if (this.targetMax - this.targetMin < 0.11) { this.targetMin -= 0.02; this.targetMax += 0.02; }
            if (this.progress >= 1) this._completeCatch();
        } else {
            this.totalSegments++;
            const dist = Math.max(0, Math.abs(this.tension - zoneCenter) - width / 2);
            const distFactor = Math.min(1.0, dist * 3.2); // nerfed slope & cap (was 1.2 & *4)
            // NERF: slower tension build outside zone
            this.lineTension = Math.min(this.maxLineTension, this.lineTension + (0.0030 * dt * distFactor)); // was 0.006
            if (this.lineTension >= this.maxLineTension) {
                this._fail('Line snapped');
                return;
            }
        }
        // Telemetry: tension tick (throttled)
        const nowMs = performance.now ? performance.now() : Date.now();
        if (!this._lastTickTelemetryAt || nowMs - this._lastTickTelemetryAt > 250) {
            this._emitTelemetry('tension_tick', {
                pos: this.tension,
                zoneMin: this.targetMin,
                zoneMax: this.targetMax,
                progress: this.progress,
                lineTension: this.lineTension,
                totalSegments: this.totalSegments,
                perfectSegments: this.perfectSegments,
            });
            this._emitTelemetry('fishing_tension_tick', {
                pos: this.tension,
                zoneMin: this.targetMin,
                zoneMax: this.targetMax,
                progress: this.progress,
                lineTension: this.lineTension,
                fishId: this.activeFish && this.activeFish.id,
                timeOfDay: this._activeTimeOfDay,
                totalSegments: this.totalSegments,
                perfectSegments: this.perfectSegments,
            });
            this._lastTickTelemetryAt = nowMs;
        }
    }

    _completeCatch() {
        this.state = 'resolve';
        const fish = this.activeFish;
        // --- XP Formula ---
        // baseXP = difficulty * rarityMultiplier
        // performanceMultiplier = 0.6 + (perfectSegments/totalSegments) * 0.8 (bounded 0.6..1.4)
        // totalXP = baseXP * performanceMultiplier * (1 + masteryPrecisionBonus + gearSkillBonus)
        const difficulty = (fish.difficulty || 10);
        const rarityMult = this._rarityXpMult[fish.rarity] || 1;
        const baseXP = difficulty * rarityMult;
        const segs = Math.max(1, this.totalSegments); // avoid div by zero
        const perfRatio = this.perfectSegments / segs;
        const performanceMultiplier = Math.min(1.4, 0.6 + perfRatio * 0.8);
        const mastery = this._getMastery();
        const masteryPrecisionBonus = 0.02 * (mastery.precision || 0); // tunable
        const rod = this._getRodStats();
        const gearSkillBonus = 0.01 * (rod.skillBonus || 0); // each skill point +1%
        const xpRaw = baseXP * performanceMultiplier * (1 + masteryPrecisionBonus + gearSkillBonus);
        const xp = Math.max(4, Math.round(xpRaw));
        // Consume one bait on successful catch
        if (this.baitId) {
            const m = this._getMastery();
            const keepChance = Math.min(0.6, 0.06 * (m.baitEfficiency || 0));
            if (!(Math.random() < keepChance)) this._consumeItem(this.baitId, 1); // consume unless preserved
        }
        if (this.scene && typeof this.scene._grantFishingXp === 'function') this.scene._grantFishingXp(xp);
        if (this.scene && typeof this.scene._addItemToInventory === 'function') this.scene._addItemToInventory(fish.id, 1);
        // Include rod snapshot on catch as well for balance analysis (mastery & rod already fetched above)
        const rodSnapshot = { name: rod.name, controlZoneMult: rod.controlZoneMult, sensitivityWaitMult: rod.sensitivityWaitMult, precisionGainMult: rod.precisionGainMult, zoneShrinkMult: rod.zoneShrinkMult, maxFails: (typeof rod.maxFails==='number'?rod.maxFails:6) };
        this._emitTelemetry('catch', { fishId: fish.id, rarity: fish.rarity, xp, mastery, rodStats: rodSnapshot, totalSegments: this.totalSegments, perfectSegments: this.perfectSegments, performanceMultiplier });
        this._emitTelemetry('fishing_catch', { fishId: fish.id, rarity: fish.rarity, xp, timeOfDay: this._activeTimeOfDay, mastery, rodStats: rodSnapshot, totalSegments: this.totalSegments, perfectSegments: this.perfectSegments, performanceMultiplier });
        this._toast(`Caught ${fish.name}! +${xp}xp`);
        this._showMessage('Catch successful!');
        setTimeout(() => this._reset(), 1200);
    }

    _fail(reason) {
        this._toast(reason);
        this._emitTelemetry('fail', { reason, fishId: this.activeFish ? this.activeFish.id : null });
        this._emitTelemetry('fishing_abort', { reason, fishId: this.activeFish ? this.activeFish.id : null, timeOfDay: this._activeTimeOfDay });
        this._showMessage('Failed');
        this._reset();
    }

    _reset() {
        this.state = 'idle';
        this.activeFish = null;
        this.baitId = null;
        this.progress = 0;
        this.tension = 0.5;
        this.totalSegments = 0;
        this.perfectSegments = 0;
        this._showMessage('Idle');
        // Remove HUD entirely when done
        this._removeHud();
    }

    _initTensionZone() {
        // Initialize safe zone with width based on fish difficulty & rod control (narrower for higher diff)
        const diff = (this.activeFish && this.activeFish.difficulty) || 10;
        const rod = this._getRodStats();
    const mastery = this._getMastery();
        // NERF: wider starting zone & softer difficulty scaling
        const baseWidth = Math.max(0.18, (0.50 - diff * 0.0012) * (rod.controlZoneMult || 1.0) * (1 + 0.04 * (mastery.control || 0)));
        // Apply rod-derived fail tolerance at start of tension
        this.maxFails = (typeof rod.maxFails === 'number' ? rod.maxFails : 6);
        const start = Math.random() * (1 - baseWidth);
        this.targetMin = start;
        this.targetMax = start + baseWidth;
        this.targetVel = (Math.random() * 0.6 - 0.3);
    }

    _eligibleFishForBait(baitId, options = {}) {
        const defs = (window && window.FISHING_DEFS) ? window.FISHING_DEFS : {};
        const rod = (this.scene.char && this.scene.char.equipment && this.scene.char.equipment.fishing) || null;
        const rodRarity = rod && (rod.rarity || (rod.fishingBonus && rod.fishingBonus.rarity)) || 'common';
        const rarityRank = { common:0, uncommon:1, rare:2, epic:3, legendary:4 };
        const rodRank = rarityRank[rodRarity] ?? 0;
        const out = [];
        for (const f of Object.values(defs)) {
            if (!f || !Array.isArray(f.allowedBaits)) continue;
            if (!f.allowedBaits.includes(baitId)) continue;
            const needRank = rarityRank[f.minRodRarity || 'common'] ?? 0;
            if (rodRank < needRank) continue;
            out.push(f);
        }
        // Hotspot simple bias: if a hotspot exists with tag, we keep the same list for now (Phase 1)
        // Further weighting handled in _weightedPick using tag bias.
        this._activeHotspot = options.hotspot || null;
        return out;
    }

    _weightedPick(list) {
        if (!list.length) return null;
        const tag = this._activeHotspot && this._activeHotspot.tag;
        const tod = this._activeTimeOfDay; // 'day' | 'night' | null
        let total = 0; const weights = [];
        for (const f of list) {
            const diff = f.difficulty || 10;
            let w = 1 / (diff + 12); // easier fish more weight
            // Tag bias: common_school favors common; deep_epic favors epic
            if (tag === 'common_school' && (f.rarity === 'common' || f.rarity === 'uncommon')) w *= 1.35;
            if (tag === 'deep_epic' && (f.rarity === 'epic' || f.rarity === 'rare')) w *= 1.45;
            // Time-of-day bias (simple): nights favor rarer species slightly; days favor common/uncommon
            if (tod === 'night') {
                if (f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary') w *= 1.12;
                if (f.rarity === 'common') w *= 0.92;
            } else if (tod === 'day') {
                if (f.rarity === 'common' || f.rarity === 'uncommon') w *= 1.08;
            }
            const mastery = this._getMastery();
            if ((mastery.rarityBoost || 0) > 0 && (f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary')) {
                w *= (1 + 0.04 * mastery.rarityBoost);
            }
            weights.push({ f, w }); total += w;
        }
        let r = Math.random() * total;
        for (const e of weights) { r -= e.w; if (r <= 0) return e.f; }
        return weights[weights.length - 1].f;
    }

    _getMastery() {
        try {
            // fishingMastery.ts attaches global compute maybe; check window modules
            const mod = (typeof window !== 'undefined' && (window.__modules && window.__modules['fishingMastery'])) || null;
            const fn = (mod && mod.computeFishingMasteryBonuses) || (window && window.computeFishingMasteryBonuses);
            if (typeof fn === 'function') return fn(this.scene?.char || {});
        } catch(e) {}
        return { stability:0, control:0, sensitivity:0, precision:0, baitEfficiency:0, rarityBoost:0, hotspotInsight:0 };
    }

    _spaceJustDown() {
        const kb = this.scene && this.scene.input && this.scene.input.keyboard;
        if (!kb) return false;
        const space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        return Phaser.Input.Keyboard.JustDown(space);
    }

    _playerMoved() {
        if (!this.scene || !this.scene.player || !this.scene._fishingStartPos) return false;
        const dx = Math.abs(this.scene.player.x - this.scene._fishingStartPos.x);
        const dy = Math.abs(this.scene.player.y - this.scene._fishingStartPos.y);
        return dx > this.abortDistance || dy > this.abortDistance;
    }

    _pickDefaultBait() {
        const inv = (this.scene.char && Array.isArray(this.scene.char.inventory)) ? this.scene.char.inventory : [];
        let first = null;
        for (const slot of inv) {
            if (!slot || !slot.id) continue;
            if (slot.id.endsWith('_bait') && (slot.qty || 1) > 0) { first = slot; break; }
        }
        return first;
    }

    _consumeItem(id, qty) { try { if (this.scene && typeof this.scene._consumeInventoryItem === 'function') this.scene._consumeInventoryItem(id, qty); } catch(e){} }

    _getRodStats() {
        const char = this.scene && this.scene.char || {};
        const defs = (window && window.ITEM_DEFS) ? window.ITEM_DEFS : {};
        const rod = char.equipment && char.equipment.fishing || null;
        const def = rod && defs[rod.id] || null;
        const bonus = (def && def.fishingBonus) || (rod && rod.fishingBonus) || {};
        const stats = (def && def.fishingStats) || (rod && rod.fishingStats) || null;

        // Derive multipliers from new schema if present
        let controlZoneMult = 1.0;
        let sensitivityWaitMult = 1.0;
        let precisionGainMult = 1.0;
        let zoneShrinkMult = 1.0;
        let maxFails = 6;

        if (stats) {
            const ctrl = Math.max(0, stats.control || 0);
            const sens = Math.max(0, stats.sensitivity || 0);
            const prec = Math.max(0, stats.precision || 0);
            const stab = Math.max(0, stats.stability || 0);
            // Control: widen safe zone roughly +4% per point
            controlZoneMult = 1 + 0.04 * ctrl;
            // Sensitivity: reduce wait time ~3% per point (cap at 0.6x)
            sensitivityWaitMult = Math.max(0.6, 1 - 0.03 * sens);
            // Precision: increase progress gain ~5% per point
            precisionGainMult = 1 + 0.05 * prec;
            // Stability: slow the zone shrink ~3% per point (cap at 0.7x)
            zoneShrinkMult = Math.max(0.7, 1 - 0.03 * stab);
            // Stability also slightly raises fail tolerance: +1 every 2 points
            maxFails = 6 + Math.floor(stab / 2);
        }

        // Allow explicit legacy overrides from fishingBonus if provided (highest precedence)
        if (typeof bonus.controlZoneMult === 'number') controlZoneMult = bonus.controlZoneMult;
        if (typeof bonus.sensitivityWaitMult === 'number') sensitivityWaitMult = bonus.sensitivityWaitMult;
        if (typeof bonus.precisionGainMult === 'number') precisionGainMult = bonus.precisionGainMult;
        if (typeof bonus.zoneShrinkMult === 'number') zoneShrinkMult = bonus.zoneShrinkMult;
        if (typeof bonus.maxFails === 'number') maxFails = bonus.maxFails;
    const skillBonus = (typeof bonus.skill === 'number') ? bonus.skill : 0;

        // Map to controller knobs with safe defaults
        return {
            name: (def && def.name) || (rod && rod.name) || 'None',
            controlZoneMult,
            sensitivityWaitMult,
            precisionGainMult,
            zoneShrinkMult,
            maxFails,
            skillBonus,
        };
    }

    _scheduleNextFocus() {
        const now = this.elapsed;
        this._nextFocusAt = now + (this.focusIntervalMs * (0.75 + Math.random() * 0.5)) / 1000; // convert to seconds (elapsed is ms-based accumulator)
        this._focusActiveUntil = this._nextFocusAt + 0.35; // 350ms window
        this._focusSatisfied = false;
    }

    _createHud() {
        if (typeof document === 'undefined') return;
        if (this.overlay) return;
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.left = '50%';
        this.overlay.style.top = '50%';
        this.overlay.style.transform = 'translate(-50%, -50%)';
        this.overlay.style.zIndex = '160';
        this.overlay.style.padding = '10px 14px';
        this.overlay.style.background = 'rgba(10,18,30,0.85)';
        this.overlay.style.border = '1px solid rgba(120,180,255,0.35)';
        this.overlay.style.borderRadius = '14px';
        this.overlay.style.fontFamily = 'Inter, sans-serif';
        this.overlay.style.minWidth = '340px';
        this.overlay.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;">
                <strong style="font-size:14px;letter-spacing:1px;">Fishing</strong>
                <span data-role="status" style="font-size:11px;opacity:.8;">Idle</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="position:relative;height:22px;background:rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
                    <div data-role="zone" style="position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#53a8ff,#9d7dff);opacity:.35;"></div>
                    <div data-role="perfect" style="position:absolute;top:3px;bottom:3px;background:#bfffe0;opacity:.28;border-radius:8px;display:none;"></div>
                    <div data-role="pointer" style="position:absolute;top:0;bottom:0;width:6px;background:#fff;border-radius:3px;box-shadow:0 0 6px rgba(255,255,255,0.6);"></div>
                    <div data-role="progress" style="position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,#6ff5c8,#b0ff9d);opacity:.25;width:0%;"></div>
                </div>
                <div style="position:relative;height:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,120,120,0.18);border-radius:10px;overflow:hidden;margin-top:6px;">
                    <div data-role="strain" style="position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,rgba(255,120,120,0.5),rgba(255,60,60,0.7));width:0%;"></div>
                </div>
                <small style="font-size:11px;color:rgba(255,255,255,0.75);" data-role="hint">Hold Click/Space pushes right · release drifts left · keep pointer centered</small>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    _removeHud() { if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay); this.overlay = null; }

    _updateHud() {
        if (!this.overlay) return;
        const statusEl = this.overlay.querySelector('[data-role="status"]');
        const zoneEl = this.overlay.querySelector('[data-role="zone"]');
        const perfectEl = this.overlay.querySelector('[data-role="perfect"]');
        const ptrEl = this.overlay.querySelector('[data-role="pointer"]');
        const progEl = this.overlay.querySelector('[data-role="progress"]');
        const strainEl = this.overlay.querySelector('[data-role="strain"]');
        const hintEl = this.overlay.querySelector('[data-role="hint"]');
        if (statusEl) statusEl.textContent = this.state.charAt(0).toUpperCase() + this.state.slice(1);
        if (this.state === 'tension') {
            if (zoneEl) {
                zoneEl.style.left = (this.targetMin * 100).toFixed(2) + '%';
                zoneEl.style.width = ((this.targetMax - this.targetMin) * 100).toFixed(2) + '%';
                // Flash zone when focus pulse is active
                const now = this.elapsed;
                const focusOn = now >= this._nextFocusAt && now <= this._focusActiveUntil && !this._focusSatisfied;
                zoneEl.style.opacity = focusOn ? '.6' : '.35';
            }
            if (perfectEl) {
                const width = this.targetMax - this.targetMin;
                const center = (this.targetMin + this.targetMax) / 2;
                const tolerance = width * (this._perfectToleranceRatio || 0.30); // match scoring tolerance
                const left = (center - tolerance / 2) * 100;
                const w = tolerance * 100;
                perfectEl.style.left = left.toFixed(2) + '%';
                perfectEl.style.width = Math.max(0, Math.min(100, w)).toFixed(2) + '%';
                perfectEl.style.display = 'block';
            }
            if (ptrEl) ptrEl.style.left = (this.tension * 100).toFixed(2) + '%';
            if (progEl) progEl.style.width = (this.progress * 100).toFixed(2) + '%';
            if (strainEl) strainEl.style.width = Math.max(0, Math.min(100, this.lineTension * 100)).toFixed(2) + '%';
            if (hintEl) hintEl.textContent = 'Hold pushes right · release drifts left';
        } else {
            if (zoneEl) zoneEl.style.width = '0';
            if (perfectEl) perfectEl.style.display = 'none';
            if (ptrEl) ptrEl.style.left = (this.tension * 100).toFixed(2) + '%';
            if (progEl) progEl.style.width = (this.progress * 100).toFixed(2) + '%';
            if (strainEl) strainEl.style.width = '0%';
            if (hintEl) hintEl.textContent = 'Press [E] at spot to cast';
        }
    }

    _isHoldActive() {
        const kb = this.scene && this.scene.input && this.scene.input.keyboard;
        let spaceDown = false;
        if (kb) {
            const space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            spaceDown = !!(space && space.isDown);
        }
        const p = this.scene && this.scene.input && this.scene.input.activePointer;
        const pointerDown = !!(p && p.isDown);
        return spaceDown || pointerDown;
    }

    _showMessage(msg) {
        if (!this.overlay) return;
        const statusEl = this.overlay.querySelector('[data-role="status"]');
        if (statusEl) statusEl.textContent = msg;
    }

    _toast(text) { try { if (this.scene && typeof this.scene._showToast === 'function') this.scene._showToast(text); } catch(e){} }

    _emitTelemetry(type, data) {
        try {
            const t = (window && window.__telemetry) ? window.__telemetry : null;
            if (t && typeof t.emit === 'function') t.emit('fishing', { type, ...data });
            else if (console && console.debug) console.debug('[telemetry:fishing]', type, data);
        } catch(e) {}
    }

    _abortForDistance() {
        // Silently abort when moving far from fishing spot; remove the HUD
        this._emitTelemetry('abort_distance', { fishId: this.activeFish ? this.activeFish.id : null, dx: Math.abs(this.scene.player.x - this.scene._fishingStartPos.x), dy: Math.abs(this.scene.player.y - this.scene._fishingStartPos.y) });
        this._removeHud();
        this._reset();
    }
}

export default FishingController;
