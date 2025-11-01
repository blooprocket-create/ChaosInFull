// Global Window augmentation for game helpers to avoid any-casts
export {}; // ensure this file is treated as a module

declare global {
  interface Window {
    __spawnOverhead?: (text: string, opts?: { wave?: boolean; shake?: boolean; ripple?: boolean; rainbow?: boolean; color?: string }) => void;
    __spawnOverheadFor?: (characterId: string, text: string) => void;
    __isTyping?: boolean;
    __setTyping?: (v: boolean) => void;
    __focusGame?: () => void;

  __applyExpUpdate?: (payload: { type: "mining" | "character" | "crafting"; exp: number; level: number }) => void;
     __saveSceneNow?: (scene?: "Town" | "Cave" | "Slime" | "Slime Meadow") => void;

    __openFurnace?: () => void;
    __openWorkbench?: () => void;
    __openSawmill?: () => void;
    __openShop?: () => void;
    __openStorage?: () => void;
    __closeFurnace?: () => void;
    __closeWorkbench?: () => void;
    __closeSawmill?: () => void;
    __closeShop?: () => void;
    __closeStorage?: () => void;

    __phaserRegistry?: import("phaser").Data.DataManager | { get?: (key: string) => unknown };
    
    // Phaser game instance and HUD shared API
    GAME?: unknown;
    __hud_shared?: unknown;
  }
}
