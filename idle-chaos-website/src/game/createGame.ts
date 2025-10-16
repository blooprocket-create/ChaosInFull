import * as Phaser from "phaser";
import TownScene from "./scenes/TownScene";
import CaveScene from "./scenes/CaveScene";
import SlimeFieldScene from "./scenes/SlimeFieldScene";
import SlimeMeadowScene from "./scenes/SlimeMeadowScene";

export type CharacterHUD = { id: string; name: string; class: string; level: number };

export function createGame(opts: { parent: HTMLElement; character?: CharacterHUD; initialScene?: "Town" | "Cave" | "Slime" | "Slime Meadow"; initialMiningLevel?: number }) {
  const { parent, character, initialScene, initialMiningLevel } = opts;
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: parent.clientWidth,
    height: Math.max(360, Math.floor(parent.clientWidth * 9 / 16)),
    backgroundColor: "#0b0b0b",
    parent,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [],
  };
  const game = new Phaser.Game(config);
  window.__phaserRegistry = game.registry;
  game.registry.set("tutorialStarted", false);
  game.registry.set("spawn", { from: "initial", portal: null });
  if (character) {
    game.registry.set("characterId", character.id);
    game.registry.set("characterName", character.name);
    game.registry.set("miningLevel", initialMiningLevel ?? 1);
    game.registry.set("craftingLevel", 1);
  }

  const sceneDefs: Array<[key: string, SceneClass: typeof Phaser.Scene]> = [
    ["TownScene", TownScene],
    ["CaveScene", CaveScene],
    ["SlimeFieldScene", SlimeFieldScene],
    ["SlimeMeadowScene", SlimeMeadowScene],
  ];
  sceneDefs.forEach(([key, SceneClass]) => {
    if (!game.scene.keys[key]) game.scene.add(key, SceneClass, false);
  });

  const startScene = (initialScene || "Town") as "Town" | "Cave" | "Slime" | "Slime Meadow";
  const startKey =
    startScene === "Cave"
      ? "CaveScene"
      : startScene === "Slime"
      ? "SlimeFieldScene"
      : startScene === "Slime Meadow"
      ? "SlimeMeadowScene"
      : "TownScene";
  game.scene.start(startKey);

  return game;
}

export default createGame;
