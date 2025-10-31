// Centralized common key setup and handlers (Inventory/Equipment/Stats)
export function attachCommonKeys(scene, options = {}) {
    if (!scene || !scene.input || !scene.input.keyboard) return null;
    const hasExplicitOption = Object.prototype.hasOwnProperty.call(options, 'registerModalHandlers');
    const registerModalHandlers = hasExplicitOption ? options.registerModalHandlers : !scene._skipSharedModalKeyHandlers;
    // Create keys mapping (movement keys still provided). Include Shift for run.
    const keys = scene.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E, inventory: Phaser.Input.Keyboard.KeyCodes.I, equip: Phaser.Input.Keyboard.KeyCodes.U, stats: Phaser.Input.Keyboard.KeyCodes.X, quest: Phaser.Input.Keyboard.KeyCodes.Q, talent: Phaser.Input.Keyboard.KeyCodes.T, shift: Phaser.Input.Keyboard.KeyCodes.SHIFT });
    scene.keys = keys;

    if (!registerModalHandlers) {
        return keys;
    }

    // Store handlers for cleanup
    scene._keyHandlers = scene._keyHandlers || {};

    // Attach immediate handlers for I/U/X/Q to toggle modals consistently across scenes
    scene._keyHandlers.i = () => {
        if (window.__shared_ui) {
            if (scene._inventoryModal) {
                window.__shared_ui.closeInventoryModal(scene);
            } else {
                window.__shared_ui.openInventoryModal(scene);
            }
        }
    };
    scene.input.keyboard.on('keydown-I', scene._keyHandlers.i);

    scene._keyHandlers.u = () => {
        if (window.__shared_ui) {
            if (scene._equipmentModal) {
                window.__shared_ui.closeEquipmentModal(scene);
            } else {
                window.__shared_ui.openEquipmentModal(scene);
            }
        }
    };
    scene.input.keyboard.on('keydown-U', scene._keyHandlers.u);

    scene._keyHandlers.x = () => {
        if (window.__shared_ui) {
            if (scene._statsModal) {
                window.__shared_ui.closeStatsModal(scene);
            } else {
                window.__shared_ui.openStatsModal(scene);
            }
        }
    };
    scene.input.keyboard.on('keydown-X', scene._keyHandlers.x);

    scene._keyHandlers.q = () => {
        if (window.__shared_ui) {
            if (scene._questLogModal) {
                window.__shared_ui.closeQuestLogModal(scene);
            } else {
                window.__shared_ui.openQuestLogModal(scene);
            }
        }
    };
    scene.input.keyboard.on('keydown-Q', scene._keyHandlers.q);

    // Talent modal toggle (key: T)
    scene._keyHandlers.t = () => {
        try {
            const now = Date.now();
            if (scene._lastTalentToggle && (now - scene._lastTalentToggle) < 180) return;
            scene._lastTalentToggle = now;
        } catch (e) {}
        if (window.__shared_ui) {
            if (scene._talentModal) {
                try { window.__shared_ui.closeTalentModal(scene); } catch (e) {}
            } else {
                try { window.__shared_ui.openTalentModal(scene); } catch (e) {}
            }
        }
    };
    scene.input.keyboard.on('keydown-T', scene._keyHandlers.t);

    // Auto-close shared UI modals when the scene shuts down to prevent orphaned DOM
    try {
        if (scene && scene.events && typeof scene.events.once === 'function') {
            scene.events.once('shutdown', () => {
                try { if (window.__shared_ui && typeof window.__shared_ui.closeInventoryModal === 'function') window.__shared_ui.closeInventoryModal(scene); } catch (e) {}
                try { if (window.__shared_ui && typeof window.__shared_ui.closeEquipmentModal === 'function') window.__shared_ui.closeEquipmentModal(scene); } catch (e) {}
                try { if (window.__shared_ui && typeof window.__shared_ui.closeStatsModal === 'function') window.__shared_ui.closeStatsModal(scene); } catch (e) {}
                try { if (window.__shared_ui && typeof window.__shared_ui.closeQuestLogModal === 'function') window.__shared_ui.closeQuestLogModal(scene); } catch (e) {}
                try { if (window.__shared_ui && typeof window.__shared_ui.closeTalentModal === 'function') window.__shared_ui.closeTalentModal(scene); } catch (e) {}
                // Hide any floating tooltips
                try { if (window.__shared_ui && typeof window.__shared_ui.hideItemTooltip === 'function') window.__shared_ui.hideItemTooltip(); } catch (e) {}
                try { if (window.__shared_ui && window.__shared_ui.hideStatTooltip) window.__shared_ui.hideStatTooltip(); } catch (e) {}
                try { if (window.__shared_ui && window.__shared_ui.hideSkillTooltip) window.__shared_ui.hideSkillTooltip(); } catch (e) {}
            });
        }
    } catch (e) {}

    return keys;
}

export default { attachCommonKeys };
