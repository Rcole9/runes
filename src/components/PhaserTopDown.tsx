"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

const TILE_SIZE = 16;
const MAP_W = 22;
const MAP_H = 16;

function makeDungeon(): number[][] {
  // 0 = floor, 1 = wall
  const map = [];
  for (let y = 0; y < MAP_H; ++y) {
    const row = [];
    for (let x = 0; x < MAP_W; ++x) {
      // Border walls
      if (x === 0 || y === 0 || x === MAP_W-1 || y === MAP_H-1) row.push(1);
      // Make a center box room
      else if (x > 4 && x < MAP_W-5 && y > 3 && y < MAP_H-4) row.push(0);
      // Outer wall
      else row.push(1);
    }
    map.push(row);
  }
  // Carve entry/exit
  map[Math.floor(MAP_H/2)][1] = 0;
  map[Math.floor(MAP_H/2)][MAP_W-2] = 0;
  return map;
}

class TopDownScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  collectible!: Phaser.GameObjects.Sprite;

  preload() {
    // Simple pixel blocks for prototyping
    this.textures.generate("floor", { data: [".", ".", ".", ".", ".", ".", ".", "."],
                                      pixelWidth: TILE_SIZE, palette: { ".": "#828691" } });
    this.textures.generate("wall", { data: ["#", "#", "#", "#", "#", "#", "#", "#"],
                                     pixelWidth: TILE_SIZE, palette: { "#": "#1a1e23" } });
    this.textures.generate("player", { data: [" 1 ", "111", " 1 "],
                                       pixelWidth: TILE_SIZE, palette: { "1": "#c8ff56", " ": "rgba(0,0,0,0)" } });
    this.textures.generate("item", { data: ["*", "*", ".", "*"],
                                     pixelWidth: TILE_SIZE, palette: { "*": "#abc4fa", ".": "#376ee6" } });
  }

  create() {
    // Pixel art crispness
    this.cameras.main.setRoundPixels(true);

    // ----- Dungeon Generation -----
    const map = makeDungeon();

    // Floor & Walls
    for (let y = 0; y < MAP_H; ++y) {
      for (let x = 0; x < MAP_W; ++x) {
        if (map[y][x] === 1) {
          this.add.image(x * TILE_SIZE, y * TILE_SIZE, "wall").setOrigin(0);
        } else {
          this.add.image(x * TILE_SIZE, y * TILE_SIZE, "floor").setOrigin(0);
        }
      }
    }

    // ----- Physics Walls (Arcade) -----
    const walls = this.physics.add.staticGroup();
    for (let y = 0; y < MAP_H; ++y)
      for (let x = 0; x < MAP_W; ++x)
        if (map[y][x] === 1)
          walls.create(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, "wall")
            .setDisplaySize(TILE_SIZE, TILE_SIZE).refreshBody().setVisible(false);

    // ----- Player -----
    this.player = this.physics.add.sprite(TILE_SIZE*2 + TILE_SIZE/2, TILE_SIZE*Math.floor(MAP_H/2) + TILE_SIZE/2, "player")
      .setDepth(3).setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, walls);

    // ----- Collectible -----
    this.collectible = this.add.sprite(
      TILE_SIZE*(MAP_W-3) + TILE_SIZE/2,
      TILE_SIZE*Math.floor(MAP_H/2) + TILE_SIZE/2,
      "item"
    ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(2);

    this.physics.add.existing(this.collectible, true);

    this.physics.add.overlap(this.player, this.collectible, () => {
      this.collectible.setVisible(false);
      this.add.text(this.player.x-20, this.player.y-24, "Got it!", { color: "#fff", fontSize: "12px" }).setDepth(10);
    });

    // ----- Camera -----
    this.cameras.main.setZoom(3);
    this.cameras.main.startFollow(this.player, true, 0.13, 0.13);

    // ----- Movement -----
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKeys("W,A,S,D");
  }

  update() {
    const cursors = this.cursors;
    if (!cursors) return;

    let vx = 0, vy = 0;
    const speed = 100;
    if (cursors.left.isDown || this.input.keyboard!.addKey('A').isDown) vx -= speed;
    if (cursors.right.isDown || this.input.keyboard!.addKey('D').isDown) vx += speed;
    if (cursors.up.isDown || this.input.keyboard!.addKey('W').isDown) vy -= speed;
    if (cursors.down.isDown || this.input.keyboard!.addKey('S').isDown) vy += speed;
    this.player.setVelocity(vx, vy);

    // Crisp pixels
    this.player.x = Math.round(this.player.x);
    this.player.y = Math.round(this.player.y);
  }
}

export default function PhaserTopDown() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    if (hostRef.current) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: TILE_SIZE * MAP_W,
        height: TILE_SIZE * MAP_H,
        backgroundColor: "#262b31",
        pixelArt: true,
        render: { antialias: false, roundPixels: true },
        scene: [TopDownScene],
        physics: {
          default: "arcade",
          arcade: { gravity: { y: 0 }, debug: false }
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
      });
    }
    return () => game?.destroy(true);
  }, []);

  return <div ref={hostRef} style={{ width: "100vw", height: "100vh" }} />;
}
