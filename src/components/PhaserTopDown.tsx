"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

const TILE_SIZE = 32; // Chunkier pixels for Gungeon-like look
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
    // --- Load all extracted PNGs from public/tiles ---
    // PixelFantasy
    this.load.image('background1', 'tiles/PixelFantasy_Caves_1.0/background1.png');
    this.load.image('background2', 'tiles/PixelFantasy_Caves_1.0/background2.png');
    this.load.image('background3', 'tiles/PixelFantasy_Caves_1.0/background3.png');
    this.load.image('background4a', 'tiles/PixelFantasy_Caves_1.0/background4a.png');
    this.load.image('background4b', 'tiles/PixelFantasy_Caves_1.0/background4b.png');
    this.load.image('mainlev_build', 'tiles/PixelFantasy_Caves_1.0/mainlev_build.png');
    this.load.image('props1', 'tiles/PixelFantasy_Caves_1.0/props1.png');
    this.load.image('props2', 'tiles/PixelFantasy_Caves_1.0/props2.png');

    // DampDungeons Characters
    const ddChar = 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Characters/';
    this.load.image('Dungeon_HeroMan1', ddChar + 'Dungeon_HeroMan1.png');
    this.load.image('Dungeon_HeroMan1Attack', ddChar + 'Dungeon_HeroMan1Attack.png');
    this.load.image('Dungeon_Minecart', ddChar + 'Dungeon_Minecart.png');
    this.load.image('Dungeon_Monsters1', ddChar + 'Dungeon_Monsters1.png');
    this.load.image('Dungeon_Monsters2', ddChar + 'Dungeon_Monsters2.png');
    this.load.image('Dungeon_MushroomMan', ddChar + 'Dungeon_MushroomMan.png');
    this.load.image('Dungeon_ObjectBigdoor', ddChar + 'Dungeon_ObjectBigdoor.png');
    this.load.image('Dungeon_ObjectsBig', ddChar + 'Dungeon_ObjectsBig.png');
    this.load.image('Dungeon_ObjectsDoorUp', ddChar + 'Dungeon_ObjectsDoorUp.png');
    this.load.image('Dungeon_ObjectsDungeon', ddChar + 'Dungeon_ObjectsDungeon.png');
    this.load.image('Dungeon_Slimes1', ddChar + 'Dungeon_Slimes1.png');

    // DampDungeons Tilesets
    const ddTiles = 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Tilesets/';
    this.load.image('Dungeon_DecorationsC', ddTiles + 'Dungeon_DecorationsC.png');
    this.load.image('Dungeon_FloorsA2', ddTiles + 'Dungeon_FloorsA2.png');
    this.load.image('Dungeon_FloorsWallsA5', ddTiles + 'Dungeon_FloorsWallsA5.png');
    this.load.image('Dungeon_FloorsWallsSandA5', ddTiles + 'Dungeon_FloorsWallsSandA5.png');
    this.load.image('Dungeon_FurnitureB', ddTiles + 'Dungeon_FurnitureB.png');
    this.load.image('Dungeon_SandDecorationsC', ddTiles + 'Dungeon_SandDecorationsC.png');
    this.load.image('Dungeon_WaterA1', ddTiles + 'Dungeon_WaterA1.png');
  }

  create() {
    // Pixel art crispness
    this.cameras.main.setRoundPixels(true);

    // --- Background ---
    const bg = this.add.image(0, 0, 'background1').setOrigin(0).setDepth(-10);
    bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    // --- Vignette overlay for moody look ---
    const g = this.add.graphics({ x: 0, y: 0 });
    const w = this.cameras.main.width, h = this.cameras.main.height;
    g.fillStyle(0x000000, 0.6);
    g.fillCircle(w/2, h/2, Math.max(w, h)*0.6);
    g.setBlendMode(Phaser.BlendModes.MULTIPLY);
    g.setDepth(20);

    // ----- Dungeon Generation -----
    const map = makeDungeon();

    // Floor & Walls (scaled up for chunky pixels)
    for (let y = 0; y < MAP_H; ++y) {
      for (let x = 0; x < MAP_W; ++x) {
        if (map[y][x] === 1) {
          this.add.image(x * TILE_SIZE, y * TILE_SIZE, "Dungeon_FloorsWallsA5").setOrigin(0).setScale(2);
        } else {
          this.add.image(x * TILE_SIZE, y * TILE_SIZE, "Dungeon_FloorsA2").setOrigin(0).setScale(2);
        }
      }
    }

    // ----- Physics Walls (Arcade) -----
    const walls = this.physics.add.staticGroup();
    for (let y = 0; y < MAP_H; ++y)
      for (let x = 0; x < MAP_W; ++x)
        if (map[y][x] === 1)
          walls.create(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, "Dungeon_FloorsWallsA5")
            .setDisplaySize(TILE_SIZE*2, TILE_SIZE*2).refreshBody().setVisible(false);

    // ----- Player -----
    this.player = this.physics.add.sprite(TILE_SIZE*2 + TILE_SIZE/2, TILE_SIZE*Math.floor(MAP_H/2) + TILE_SIZE/2, "Dungeon_HeroMan1")
      .setDepth(3).setDisplaySize(TILE_SIZE*2, TILE_SIZE*2);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    }
    this.physics.add.collider(this.player, walls);

    // ----- Collectible -----
    this.collectible = this.add.sprite(
      TILE_SIZE*(MAP_W-3) + TILE_SIZE/2,
      TILE_SIZE*Math.floor(MAP_H/2) + TILE_SIZE/2,
      "Dungeon_Slimes1"
    ).setDisplaySize(TILE_SIZE*2, TILE_SIZE*2).setDepth(2);

    this.physics.add.existing(this.collectible, true);

    this.physics.add.overlap(this.player, this.collectible, () => {
      this.collectible.setVisible(false);
      this.add.text(this.player.x-20, this.player.y-24, "Got it!", { color: "#fff", fontSize: "16px" }).setDepth(10);
    });

    // ----- Camera -----
    this.cameras.main.setZoom(2.2); // More "roomy" feel
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
          arcade: { gravity: { x: 0, y: 0 }, debug: false }
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
