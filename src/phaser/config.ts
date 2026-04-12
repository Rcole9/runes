import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { DungeonScene } from "./scenes/DungeonScene";

export function createPhaserGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 270,
    parent,
    backgroundColor: "#0b1220",
    pixelArt: true,
    render: {
      antialias: false,
      roundPixels: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 700 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, OverworldScene, DungeonScene],
  });
}
