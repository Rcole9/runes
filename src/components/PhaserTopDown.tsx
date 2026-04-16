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

    // Display all loaded images in a grid for reference
    const keys = [
      // PixelFantasy
      'background1','background2','background3','background4a','background4b','mainlev_build','props1','props2',
      // DampDungeons Characters
      'Dungeon_HeroMan1','Dungeon_HeroMan1Attack','Dungeon_Minecart','Dungeon_Monsters1','Dungeon_Monsters2','Dungeon_MushroomMan','Dungeon_ObjectBigdoor','Dungeon_ObjectsBig','Dungeon_ObjectsDoorUp','Dungeon_ObjectsDungeon','Dungeon_Slimes1',
      // DampDungeons Tilesets
      'Dungeon_DecorationsC','Dungeon_FloorsA2','Dungeon_FloorsWallsA5','Dungeon_FloorsWallsSandA5','Dungeon_FurnitureB','Dungeon_SandDecorationsC','Dungeon_WaterA1',
    ];
    const cols = 4;
    let x = 0, y = 0;
    keys.forEach((key, i) => {
      const img = this.add.image(60 + x * 140, 60 + y * 140, key).setOrigin(0).setScale(0.3);
      this.add.text(60 + x * 140, 60 + y * 140 + img.displayHeight * 0.3 + 4, key, { fontSize: '12px', color: '#fff' });
      x++;
      if (x >= cols) { x = 0; y++; }
    });
  }

  // No update needed for grid display
  update() {}
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
