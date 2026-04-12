"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { initializeStore } from "@/game/store";

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  preload() {
    this.load.pack("public-pack", "/phaser-pack.json");
    this.load.tilemapTiledJSON("level1", "/maps/level1.json");
    this.load.image("tiles", "/tiles/tiles.png");
    this.load.image("sky", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-altar-holy-light-divine-healing-golden_20260217_223403.png");
    this.load.image("ground", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-stone-floor-tile-bloody-stained-dark_20260217_213627.png");
    this.load.image("star", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-key-golden-boss-door-master-ornate_20260217_220007.png");
    this.load.image("bomb", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-bat-flying-swarm-dark-wings-small_20260217_222556.png");
    this.load.spritesheet(
      "dude",
      "/assets/sprites/rpg-characters/freepixel-rpg-characters-companions/warrior-knight-with-sword-021.png",
      { frameWidth: 32, frameHeight: 48 },
    );
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

    this.add.image(400, 300, "sky");
    this.add.image(400, 300, "star");

    const platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, "ground").setScale(2).refreshBody();
    platforms.create(600, 400, "ground");
    platforms.create(50, 250, "ground");
    platforms.create(750, 220, "ground");

    const stars = this.physics.add.group({
      key: "star",
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 },
    });

    const bombs = this.physics.add.group();

    stars.children.iterate((child) => {
      const star = child as Phaser.Physics.Arcade.Image;
      star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      return true;
    });

    const player = this.physics.add.sprite(100, 450, "dude", 0);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.setDisplaySize(24, 36);
    (player.body as Phaser.Physics.Arcade.Body).setGravityY(300);

    if (!this.anims.exists("left")) {
      this.anims.create({
        key: "left",
        frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists("turn")) {
      this.anims.create({
        key: "turn",
        frames: [{ key: "dude", frame: 4 }],
        frameRate: 20,
      });
    }

    if (!this.anims.exists("right")) {
      this.anims.create({
        key: "right",
        frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    const hitBomb = (
      playerObj: any,
      bombObj: any,
    ) => {
      this.physics.pause();

      const hitPlayer = playerObj as Phaser.Physics.Arcade.Sprite;
      const hitBombSprite = bombObj as Phaser.Physics.Arcade.Image;
      hitPlayer.setTint(0xff0000);
      hitPlayer.anims.play("turn");
      hitBombSprite.setTint(0xaa1111);
    };

    const collectStar = (
      _playerObj: any,
      starObj: any,
    ) => {
      const star = starObj as Phaser.Physics.Arcade.Image;
      star.disableBody(true, true);

      if (stars.countActive(true) === 0) {
        stars.children.iterate((child) => {
          const resetStar = child as Phaser.Physics.Arcade.Image;
          resetStar.enableBody(true, resetStar.x, 0, true, true);
          return true;
        });

        const bombX = player.x < 400 ? Phaser.Math.Between(400, 780) : Phaser.Math.Between(20, 400);
        const bomb = bombs.create(bombX, 16, "bomb") as Phaser.Physics.Arcade.Image;
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        const bombBody = bomb.body as Phaser.Physics.Arcade.Body;
        bombBody.setAllowGravity(false);
      }
    };

    if (solids) this.physics.add.collider(player, solids);
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);
    if (solids) this.physics.add.collider(bombs, solids);
    this.physics.add.overlap(player, stars, collectStar, undefined, this);
    this.physics.add.collider(player, bombs, hitBomb, undefined, this);

    cam.startFollow(player, true, 0.12, 0.12);

    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd = this.input.keyboard!.addKeys("W,A,S,D,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.events.on("update", () => {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);

      const movingLeft = cursors.left.isDown || wasd.A.isDown;
      const movingRight = cursors.right.isDown || wasd.D.isDown;
      const jumping = cursors.up.isDown || wasd.W.isDown || wasd.SPACE.isDown;

      if (movingLeft) {
        player.setVelocityX(-160);
        player.anims.play("left", true);
      } else if (movingRight) {
        player.setVelocityX(160);
        player.anims.play("right", true);
      } else {
        player.setVelocityX(0);
        player.anims.play("turn");
      }

      const body = player.body as Phaser.Physics.Arcade.Body;
      if (jumping && body.touching.down) {
        player.setVelocityY(-330);
      }
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
      width: 800,
      height: 600,
      backgroundColor: "#0b1220",
      pixelArt: true,
      render: { antialias: false, roundPixels: true },
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 300 }, debug: false },
      },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [MainScene],
    });

    return () => game.destroy(true);
  }, []);

  return <div ref={hostRef} style={{ width: "100vw", height: "100vh" }} />;
}
