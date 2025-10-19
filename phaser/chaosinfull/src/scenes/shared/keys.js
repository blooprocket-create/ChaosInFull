// Centralized common key setup and handlers (Inventory/Equipment/Stats)
export function attachCommonKeys(scene) {
    if (!scene || !scene.input || !scene.input.keyboard) return null;
    // Create keys mapping (movement keys still provided)
    const keys = scene.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E, inventory: Phaser.Input.Keyboard.KeyCodes.I, equip: Phaser.Input.Keyboard.KeyCodes.U, stats: Phaser.Input.Keyboard.KeyCodes.X });
    scene.keys = keys;

    // Attach immediate handlers for I/U/X so all scenes behave consistently
    try {
        const toggleWithFallback = (isOpen, sharedOpen, sharedClose, fallbackOpen, fallbackClose, label) => {
            try {
                if (isOpen()) {
                    if (sharedClose) sharedClose(scene); else if (fallbackClose) fallbackClose();
                } else {
                    if (sharedOpen) sharedOpen(scene);
                    if (!isOpen() && fallbackOpen) fallbackOpen();
                }
            } catch (err) {
                if (console && console.warn) console.warn(`${label || 'Modal'} toggle failed`, err);
                if (isOpen()) {
                    if (fallbackClose) fallbackClose();
                } else if (fallbackOpen) {
                    fallbackOpen();
                }
            }
        };

        scene.input.keyboard.on('keydown-I', () => {
            if (!scene) return;
            const shared = (window && window.__shared_ui) ? window.__shared_ui : null;
            toggleWithFallback(
                () => !!scene._inventoryModal,
                shared && shared.openInventoryModal ? shared.openInventoryModal.bind(shared) : null,
                shared && shared.closeInventoryModal ? shared.closeInventoryModal.bind(shared) : null,
                () => scene._openInventoryModal && scene._openInventoryModal(),
                () => scene._closeInventoryModal && scene._closeInventoryModal(),
                'Inventory modal'
            );
        });

        scene.input.keyboard.on('keydown-U', () => {
            if (!scene) return;
            const shared = (window && window.__shared_ui) ? window.__shared_ui : null;
            toggleWithFallback(
                () => !!scene._equipmentModal,
                shared && shared.openEquipmentModal ? shared.openEquipmentModal.bind(shared) : null,
                shared && shared.closeEquipmentModal ? shared.closeEquipmentModal.bind(shared) : null,
                () => scene._openEquipmentModal && scene._openEquipmentModal(),
                () => scene._closeEquipmentModal && scene._closeEquipmentModal(),
                'Equipment modal'
            );
        });

        scene.input.keyboard.on('keydown-X', () => {
            if (!scene) return;
            const shared = (window && window.__shared_ui) ? window.__shared_ui : null;
            toggleWithFallback(
                () => !!scene._statsModal,
                shared && shared.openStatsModal ? shared.openStatsModal.bind(shared) : null,
                shared && shared.closeStatsModal ? shared.closeStatsModal.bind(shared) : null,
                () => scene._openStatsModal && scene._openStatsModal(),
                () => scene._closeStatsModal && scene._closeStatsModal(),
                'Stats modal'
            );
        });
    } catch (e) { /* ignore if keyboard events not available */ }

    return keys;
}

export default { attachCommonKeys };
