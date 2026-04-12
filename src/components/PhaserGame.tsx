"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { initializeStore } from "@/game/store";

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  preload() {
    this.load.tilemapTiledJSON("level1", "/maps/level1.json");
    this.load.image("tiles", "/tiles/tiles.png");
  }

  create() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);

    const map = this.make.tilemap({ key: "level1" });
    const tileset = map.addTilesetImage("tiles", "tiles");
    if (!tileset) {
      throw new Error("Tileset not found: check Tileset name in Tiled (Map > Tilesets).");
    }

    const bg = map.createLayer("Background", tileset, 0, 0);
    const floor = map.createLayer("Floor", tileset, 0, 0);
    const solids = map.createLayer("Solids", tileset, 0, 0);
    const deco = map.createLayer("Deco", tileset, 0, 0);

    bg?.setDepth(0);
    floor?.setDepth(10);
    solids?.setDepth(20);
    deco?.setDepth(30);

    if (solids) {
      solids.setCollisionByExclusion([-1]);
    }

    if (solids) {
      const shadow = this.add.graphics().setDepth(19);
      shadow.fillStyle(0x000000, 0.28);

      solids.forEachTile((t) => {
        if (!t || t.index === -1) return;
        const below = solids.getTileAt(t.x, t.y + 1);
        if (!below || below.index === -1) {
          shadow.fillRect(t.getLeft(), t.getBottom() - 1, map.tileWidth, 2);
        }
      });
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const g = this.add.graphics();
    g.fillStyle(0xffcc66, 1);
    g.fillRect(0, 0, 12, 16);
    g.generateTexture("player", 12, 16);
    g.destroy();

    const player = this.physics.add.sprite(32, 32, "player");
    player.setCollideWorldBounds(true);

    if (solids) this.physics.add.collider(player, solids);

    cam.startFollow(player, true, 0.12, 0.12);

    const cursors = this.input.keyboard!.createCursorKeys();
    const SPEED = 140;
    const JUMP = 300;

    this.events.on("update", () => {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);

      if (cursors.left.isDown) player.setVelocityX(-SPEED);
      else if (cursors.right.isDown) player.setVelocityX(SPEED);
      else player.setVelocityX(0);

      const body = player.body as Phaser.Physics.Arcade.Body;
      if (cursors.up.isDown && body.blocked.down) player.setVelocityY(-JUMP);
    });
  }
}

export default function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    initializeStore();

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 480,
      height: 270,
      backgroundColor: "#0b1220",
      pixelArt: true,
      render: { antialias: false, roundPixels: true },
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 700 }, debug: false },
      },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [MainScene],
    });

    return () => game.destroy(true);
  }, []);

  return <div ref={hostRef} style={{ width: "100vw", height: "100vh" }} />;
}
