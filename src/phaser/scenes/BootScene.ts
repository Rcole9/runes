import * as Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);

    g.clear();
    g.fillStyle(0x8fd3a7, 1);
    g.fillRect(0, 0, 64, 32);
    g.generateTexture("tile", 64, 32);

    g.clear();
    g.fillStyle(0x5fb0ff, 1);
    g.fillCircle(12, 12, 10);
    g.generateTexture("player", 24, 24);

    g.clear();
    g.fillStyle(0xe66a6a, 1);
    g.fillCircle(10, 10, 9);
    g.generateTexture("enemy", 20, 20);

    g.clear();
    g.fillStyle(0xffb703, 1);
    g.fillCircle(20, 20, 18);
    g.generateTexture("boss", 40, 40);

    g.clear();
    g.fillStyle(0xd7263d, 0.35);
    g.fillCircle(48, 48, 46);
    g.generateTexture("telegraph", 96, 96);

    g.clear();
    g.fillStyle(0x8a2be2, 1);
    g.fillRect(0, 0, 36, 52);
    g.generateTexture("portal", 36, 52);

    g.clear();
    g.fillStyle(0xffdd57, 1);
    g.fillRect(0, 0, 20, 28);
    g.generateTexture("npc", 20, 28);

    g.clear();
    g.fillStyle(0xf07167, 1);
    g.fillCircle(8, 8, 7);
    g.generateTexture("add", 16, 16);

    g.clear();
    g.fillStyle(0xfff0a8, 0.95);
    g.fillTriangle(6, 32, 58, 14, 58, 50);
    g.lineStyle(3, 0xff8c42, 1);
    g.strokeTriangle(6, 32, 58, 14, 58, 50);
    g.generateTexture("slash", 64, 64);

    g.destroy();

    this.scene.start("OverworldScene");
  }
}
