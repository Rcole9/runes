"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

const TILE_SIZE = 32; // Chunkier pixels
const MAP_W = 18;
const MAP_H = 14;

// Procedural dungeon generator for 1-room or N rooms as an array.
function makeRooms(n = 4) {
  const rooms = [];
  for (let i = 0; i < n; ++i) {
    // 0 = floor, 1 = wall
    const map = [];
    for (let y = 0; y < MAP_H; ++y) {
      const row = [];
      for (let x = 0; x < MAP_W; ++x) {
        if (x === 0 || y === 0 || x === MAP_W-1 || y === MAP_H-1) row.push(1); // border walls
        else row.push(0); // floor
      }
      map.push(row);
    }
    // Exit: right wall (room N-1 has none)
    if (i < n-1) map[Math.floor(MAP_H/2)][MAP_W-1] = 0;
    // Entrance: left wall (room 0 has none)
    if (i > 0)   map[Math.floor(MAP_H/2)][0] = 0;
    rooms.push(map);
  }
  return rooms;
}

class MultiRoomScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  collectible?: Phaser.GameObjects.Sprite;
  roomIndex: number = 0;
  rooms = makeRooms(5); // 5-room dungeon
  walls?: Phaser.Physics.Arcade.StaticGroup;
  stairs?: Phaser.Physics.Arcade.Image;

  preload() {
    // Use extracted PNGs
    this.load.image('floor', 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Tilesets/Dungeon_FloorsA2.png');
    this.load.image('wall', 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Tilesets/Dungeon_FloorsWallsA5.png');
    this.load.image('player', 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Characters/Dungeon_HeroMan1.png');
    this.load.image('item', 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Characters/Dungeon_Slimes1.png');
    this.load.image('stairs', 'tiles/DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Characters/Dungeon_ObjectsDoorUp.png');
  }

  drawRoom() {
    // Remove old
    this.children.removeAll();
    if (this.walls) this.walls.clear(true, true);
    this.walls = this.physics.add.staticGroup();

    const map = this.rooms[this.roomIndex];

    for (let y = 0; y < MAP_H; ++y) {
      for (let x = 0; x < MAP_W; ++x) {
        const isWall = map[y][x] === 1;
        this.add.image(x*TILE_SIZE, y*TILE_SIZE, isWall ? "wall" : "floor").setOrigin(0).setScale(2);
        if (isWall) this.walls.create(x*TILE_SIZE+TILE_SIZE/2, y*TILE_SIZE+TILE_SIZE/2, "wall")
                        .setDisplaySize(TILE_SIZE*2, TILE_SIZE*2).refreshBody().setVisible(false);
      }
    }

    // Place stairs (door) on the right for all but last room
    if (this.roomIndex < this.rooms.length-1) {
      this.stairs = this.physics.add.staticImage(
        (MAP_W-1)*TILE_SIZE+TILE_SIZE/2,
        Math.floor(MAP_H/2)*TILE_SIZE+TILE_SIZE/2,
        "stairs"
      ).setDisplaySize(TILE_SIZE*2, TILE_SIZE*2).setDepth(2);
    }

    // Place stairs (door) on the left for all but first room
    if (this.roomIndex > 0) {
      this.stairs = this.physics.add.staticImage(
        (0)*TILE_SIZE+TILE_SIZE/2,
        Math.floor(MAP_H/2)*TILE_SIZE+TILE_SIZE/2,
        "stairs"
      ).setDisplaySize(TILE_SIZE*2, TILE_SIZE*2).setDepth(2);
    }

    // Place collectible only if last room
    if (this.roomIndex === this.rooms.length-1) {
      this.collectible = this.add.sprite(
        TILE_SIZE*(MAP_W-3)+TILE_SIZE/2,
        TILE_SIZE*Math.floor(MAP_H/2)+TILE_SIZE/2,
        "item"
      ).setDisplaySize(TILE_SIZE*2, TILE_SIZE*2).setDepth(2);
      this.physics.add.existing(this.collectible, true);
    } else {
      this.collectible = undefined;
    }
  }

  create() {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(2.2);

    // Draw first room
    this.drawRoom();

    // Player starting position (entry point)
    this.player = this.physics.add.sprite(
      TILE_SIZE*2+TILE_SIZE/2,
      TILE_SIZE*Math.floor(MAP_H/2)+TILE_SIZE/2,
      "player"
    ).setDepth(3).setDisplaySize(TILE_SIZE*2, TILE_SIZE*2);

    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    }
    this.physics.add.collider(this.player, this.walls!);

    // ---- Camera ----
    this.cameras.main.startFollow(this.player, true, 0.13, 0.13);

    // ---- Controls ----
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKeys("W,A,S,D");

    // ---- Room transition (stairs) ----
    this.physics.add.overlap(this.player, this.stairs!, () => {
      // Right stairs (door): go to next
      if (this.roomIndex < this.rooms.length-1 &&
          this.player.x > (MAP_W-2)*TILE_SIZE)
      {
        this.roomIndex++;
        this.drawRoom();
        // Move player to left entry
        this.player.setPosition(TILE_SIZE*2+TILE_SIZE/2, TILE_SIZE*Math.floor(MAP_H/2)+TILE_SIZE/2);
        this.physics.world.colliders.destroy();
        this.physics.add.collider(this.player, this.walls!);
      }
      // Left stairs (door): go back
      if (this.roomIndex > 0 &&
          this.player.x < TILE_SIZE*2)
      {
        this.roomIndex--;
        this.drawRoom();
        // Move player to right entry
        this.player.setPosition((MAP_W-3)*TILE_SIZE+TILE_SIZE/2, TILE_SIZE*Math.floor(MAP_H/2)+TILE_SIZE/2);
        this.physics.world.colliders.destroy();
        this.physics.add.collider(this.player, this.walls!);
      }
    });

    // ---- Final collectible ----
    this.physics.add.overlap(this.player, this.collectible!, () => {
      if (!this.collectible?.visible) return;
      this.collectible.setVisible(false);
      this.add.text(this.player.x-20, this.player.y-24, "You Win!", { color: "#fff", fontSize: "16px" }).setDepth(10);
    });
  }

  update() {
    if (!this.cursors) return;
    let vx = 0,
      vy = 0,
      speed = 100;
    if (this.cursors.left.isDown || this.input.keyboard!.addKey("A").isDown) vx -= speed;
    if (this.cursors.right.isDown || this.input.keyboard!.addKey("D").isDown) vx += speed;
    if (this.cursors.up.isDown || this.input.keyboard!.addKey("W").isDown) vy -= speed;
    if (this.cursors.down.isDown || this.input.keyboard!.addKey("S").isDown) vy += speed;

    this.player.setVelocity(vx, vy);

    this.player.x = Math.round(this.player.x);
    this.player.y = Math.round(this.player.y);
  }
}

export default function PhaserTopDownMulti() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    if (hostRef.current) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: TILE_SIZE * MAP_W,
        height: TILE_SIZE * MAP_H,
        backgroundColor: "#23282f",
        pixelArt: true,
        render: { antialias: false, roundPixels: true },
        scene: [MultiRoomScene],
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