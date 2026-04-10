import * as Phaser from "phaser";
import { hexToNumber, PALETTE } from "@/game/palette";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // No external assets to preload
  }

  create(): void {
    this.finishBoot();
  }

  private finishBoot(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);

    const generateIfMissing = (key: string, draw: () => void): void => {
      if (this.textures.exists(key)) return;
      g.clear();
      draw();
    };

    generateIfMissing("tile", () => {
      // diamond: top(32,0), right(64,16), bottom(32,32), left(0,16)
      g.fillStyle(hexToNumber(PALETTE.grass.mid), 1);
      g.fillTriangle(32, 0, 64, 16, 0, 16);
      g.fillTriangle(0, 16, 64, 16, 32, 32);
      g.fillStyle(hexToNumber(PALETTE.grass.light), 1);
      g.fillRect(16, 12, 16, 6);
      g.fillStyle(hexToNumber(PALETTE.grass.highlight), 1);
      g.fillRect(20, 16, 10, 5);
      g.fillStyle(hexToNumber(PALETTE.grass.dark), 1);
      g.fillRect(36, 16, 12, 6);
      g.fillStyle(hexToNumber(PALETTE.grass.shadow), 1);
      g.fillRect(38, 12, 8, 5);
      g.generateTexture("tile", 64, 32);
    });

    generateIfMissing("tile-dirt", () => {
      g.fillStyle(hexToNumber(PALETTE.dirt.mid), 1);
      g.fillTriangle(32, 0, 64, 16, 0, 16);
      g.fillTriangle(0, 16, 64, 16, 32, 32);
      g.fillStyle(hexToNumber(PALETTE.dirt.light), 1);
      g.fillRect(16, 12, 14, 6);
      g.fillStyle(hexToNumber(PALETTE.dirt.dark), 1);
      g.fillRect(34, 16, 14, 7);
      g.fillStyle(hexToNumber(PALETTE.dirt.shadow), 1);
      g.fillRect(38, 12, 8, 4);
      g.generateTexture("tile-dirt", 64, 32);
    });

    generateIfMissing("tile-path", () => {
      g.fillStyle(hexToNumber(PALETTE.path.mid), 1);
      g.fillTriangle(32, 0, 64, 16, 0, 16);
      g.fillTriangle(0, 16, 64, 16, 32, 32);
      g.fillStyle(hexToNumber(PALETTE.path.light), 1);
      g.fillRect(18, 12, 12, 5);
      g.fillStyle(hexToNumber(PALETTE.path.dark), 1);
      g.fillRect(34, 16, 12, 6);
      g.fillStyle(hexToNumber(PALETTE.path.pebbleLight), 1);
      g.fillRect(28, 14, 3, 3);
      g.fillRect(36, 19, 3, 3);
      g.generateTexture("tile-path", 64, 32);
    });

    generateIfMissing("tile-water", () => {
      g.fillStyle(hexToNumber(PALETTE.water.dark), 1);
      g.fillTriangle(32, 0, 64, 16, 0, 16);
      g.fillTriangle(0, 16, 64, 16, 32, 32);
      g.fillStyle(hexToNumber(PALETTE.water.mid), 1);
      g.fillRect(14, 12, 18, 7);
      g.fillStyle(hexToNumber(PALETTE.water.light), 1);
      g.fillRect(22, 15, 12, 5);
      g.fillStyle(hexToNumber(PALETTE.water.foam), 1);
      g.fillRect(32, 12, 6, 2);
      g.generateTexture("tile-water", 64, 32);
    });

    generateIfMissing("player", () => {
      g.fillStyle(hexToNumber(PALETTE.sunlight.ambientCool), 1);
      g.fillCircle(12, 12, 10);
      g.lineStyle(2, hexToNumber(PALETTE.neutrals.inkMid), 1);
      g.strokeCircle(12, 12, 10);
      g.generateTexture("player", 24, 24);
    });

    generateIfMissing("enemy", () => {
      g.fillStyle(hexToNumber(PALETTE.sunlight.warm), 1);
      g.fillCircle(10, 10, 9);
      g.lineStyle(2, hexToNumber(PALETTE.neutrals.inkMid), 1);
      g.strokeCircle(10, 10, 9);
      g.generateTexture("enemy", 20, 20);
    });

    generateIfMissing("boss", () => {
      g.fillStyle(hexToNumber(PALETTE.sunlight.highlight), 1);
      g.fillCircle(20, 20, 18);
      g.lineStyle(3, hexToNumber(PALETTE.neutrals.inkMid), 1);
      g.strokeCircle(20, 20, 18);
      g.generateTexture("boss", 40, 40);
    });

    generateIfMissing("telegraph", () => {
      g.fillStyle(0xd7263d, 0.35);
      g.fillCircle(48, 48, 46);
      g.generateTexture("telegraph", 96, 96);
    });

    generateIfMissing("portal", () => {
      g.fillStyle(hexToNumber(PALETTE.neutrals.inkMid), 1);
      g.fillRect(0, 0, 36, 52);
      g.lineStyle(3, hexToNumber(PALETTE.sunlight.ambientCool), 1);
      g.strokeRect(2, 2, 32, 48);
      g.generateTexture("portal", 36, 52);
    });

    generateIfMissing("npc", () => {
      g.fillStyle(hexToNumber(PALETTE.sunlight.warm), 1);
      g.fillRect(0, 0, 20, 28);
      g.lineStyle(2, hexToNumber(PALETTE.neutrals.inkMid), 1);
      g.strokeRect(0, 0, 20, 28);
      g.generateTexture("npc", 20, 28);
    });

    generateIfMissing("add", () => {
      g.fillStyle(hexToNumber(PALETTE.grass.accent), 1);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, hexToNumber(PALETTE.neutrals.inkMid), 1);
      g.strokeCircle(8, 8, 7);
      g.generateTexture("add", 16, 16);
    });

    generateIfMissing("slash", () => {
      g.fillStyle(hexToNumber(PALETTE.sunlight.highlight), 0.95);
      g.fillTriangle(6, 32, 58, 14, 58, 50);
      g.lineStyle(3, hexToNumber(PALETTE.sunlight.warm), 1);
      g.strokeTriangle(6, 32, 58, 14, 58, 50);
      g.generateTexture("slash", 64, 64);
    });

    g.destroy();

    this.scene.start("OverworldScene");
  }
}
