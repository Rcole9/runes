import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { DungeonScene } from "./scenes/DungeonScene";

export function createPhaserGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#101820",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [BootScene, OverworldScene, DungeonScene],
  });
}
