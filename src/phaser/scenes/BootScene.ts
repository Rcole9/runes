import * as Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);

    g.clear();
    g.fillStyle(0x4e8b5c, 1);
    g.fillRect(0, 0, 64, 32);
    g.fillStyle(0x6fb275, 1);
    g.fillRect(0, 0, 24, 12);
    g.fillStyle(0x9ad48a, 1);
    g.fillRect(8, 12, 18, 8);
    g.fillStyle(0x3c6a4a, 1);
    g.fillRect(34, 16, 22, 10);
    g.fillStyle(0x2f4c3b, 1);
    g.fillRect(50, 4, 10, 7);
    g.generateTexture("tile", 64, 32);

    g.clear();
    g.fillStyle(0xa7b7c9, 1);
    g.fillCircle(12, 12, 10);
    g.lineStyle(2, 0x2d3340, 1);
    g.strokeCircle(12, 12, 10);
    g.generateTexture("player", 24, 24);

    g.clear();
    g.fillStyle(0xe9c77b, 1);
    g.fillCircle(10, 10, 9);
    g.lineStyle(2, 0x2d3340, 1);
    g.strokeCircle(10, 10, 9);
    g.generateTexture("enemy", 20, 20);

    g.clear();
    g.fillStyle(0xf6e2a8, 1);
    g.fillCircle(20, 20, 18);
    g.lineStyle(3, 0x2d3340, 1);
    g.strokeCircle(20, 20, 18);
    g.generateTexture("boss", 40, 40);

    g.clear();
    g.fillStyle(0xd7263d, 0.35);
    g.fillCircle(48, 48, 46);
    g.generateTexture("telegraph", 96, 96);

    g.clear();
    g.fillStyle(0x2d3340, 1);
    g.fillRect(0, 0, 36, 52);
    g.lineStyle(3, 0xa7b7c9, 1);
    g.strokeRect(2, 2, 32, 48);
    g.generateTexture("portal", 36, 52);

    g.clear();
    g.fillStyle(0xe9c77b, 1);
    g.fillRect(0, 0, 20, 28);
    g.lineStyle(2, 0x2d3340, 1);
    g.strokeRect(0, 0, 20, 28);
    g.generateTexture("npc", 20, 28);

    g.clear();
    g.fillStyle(0xb7d77a, 1);
    g.fillCircle(8, 8, 7);
    g.lineStyle(2, 0x2d3340, 1);
    g.strokeCircle(8, 8, 7);
    g.generateTexture("add", 16, 16);

    g.clear();
    g.fillStyle(0xf6e2a8, 0.95);
    g.fillTriangle(6, 32, 58, 14, 58, 50);
    g.lineStyle(3, 0xe9c77b, 1);
    g.strokeTriangle(6, 32, 58, 14, 58, 50);
    g.generateTexture("slash", 64, 64);

    g.destroy();

    this.scene.start("OverworldScene");
  }
}
