// Centralized common key setup and handlers (Inventory/Equipment/Stats)
export function attachCommonKeys(scene) {
    if (!scene || !scene.input || !scene.input.keyboard) return null;
    // Create keys mapping (movement keys still provided)
    const keys = scene.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E, inventory: Phaser.Input.Keyboard.KeyCodes.I, equip: Phaser.Input.Keyboard.KeyCodes.U, stats: Phaser.Input.Keyboard.KeyCodes.X });
    scene.keys = keys;

    // Attach immediate handlers for I/U/X so all scenes behave consistently
    try {
        scene.input.keyboard.on('keydown-I', (e) => {
            if (!scene) return;
            if (window && window.__shared_ui) {
                if (scene._inventoryModal) window.__shared_ui.closeInventoryModal(scene); else window.__shared_ui.openInventoryModal(scene);
            }
        });
        scene.input.keyboard.on('keydown-U', (e) => {
            if (!scene) return;
            if (window && window.__shared_ui) {
                if (scene._equipmentModal) window.__shared_ui.closeEquipmentModal(scene); else window.__shared_ui.openEquipmentModal(scene);
            }
        });
        scene.input.keyboard.on('keydown-X', (e) => {
            if (!scene) return;
            if (window && window.__shared_ui) {
                if (scene._statsModal) window.__shared_ui.closeStatsModal(scene); else window.__shared_ui.openStatsModal(scene);
            }
        });
    } catch (e) { /* ignore if keyboard events not available */ }

    return keys;
}

export default { attachCommonKeys };
