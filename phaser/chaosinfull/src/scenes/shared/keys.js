// Centralized common key setup and handlers (Inventory/Equipment/Stats)
export function attachCommonKeys(scene) {
    if (!scene || !scene.input || !scene.input.keyboard) return null;
    // Create keys mapping (movement keys still provided)
    const keys = scene.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E, inventory: Phaser.Input.Keyboard.KeyCodes.I, equip: Phaser.Input.Keyboard.KeyCodes.U, stats: Phaser.Input.Keyboard.KeyCodes.X });
    scene.keys = keys;

    // Attach immediate handlers for I/U/X so all scenes behave consistently
    return keys;
}

export default { attachCommonKeys };
