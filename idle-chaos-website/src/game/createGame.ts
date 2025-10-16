import * as Phaser from "phaser";
import TownScene from "./scenes/TownScene";
import CaveScene from "./scenes/CaveScene";
import SlimeFieldScene from "./scenes/SlimeFieldScene";

export type CharacterHUD = { id: string; name: string; class: string; level: number };

export function createGame(opts: { parent: HTMLElement; character?: CharacterHUD; initialScene?: "Town" | "Cave" | "Slime"; initialMiningLevel?: number }) {
  const { parent, character, initialScene, initialMiningLevel } = opts;
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: parent.clientWidth,
    height: Math.max(360, Math.floor(parent.clientWidth * 9/16)),
    backgroundColor: "#0b0b0b",
    parent,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [TownScene, CaveScene, SlimeFieldScene],
  };
  const game = new Phaser.Game(config);
  (window as any).__phaserRegistry = game.registry as unknown as { get?: (key: string) => unknown };
  game.registry.set("tutorialStarted", false);
  game.registry.set("spawn", { from: "initial", portal: null });
  if (character) {
    game.registry.set("characterId", character.id);
    game.registry.set("characterName", character.name);
    game.registry.set("miningLevel", initialMiningLevel ?? 1);
    game.registry.set("craftingLevel", 1);
  }
  const startScene = (initialScene || "Town") as "Town" | "Cave" | "Slime";
  if (startScene !== "Town") {
    setTimeout(() => {
      if (game.scene.isActive("TownScene")) game.scene.stop("TownScene");
      game.scene.start(`${startScene}Scene`);
    }, 0);
  }
  return game;
}

export default createGame;
