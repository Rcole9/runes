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
    this.load.image("sky", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-altar-holy-light-divine-healing-golden_20260217_223403.png");
    this.load.image("ground", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-stone-floor-tile-bloody-stained-dark_20260217_213627.png");
    this.load.image("star", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-key-golden-boss-door-master-ornate_20260217_220007.png");
    this.load.image("bomb", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-bat-flying-swarm-dark-wings-small_20260217_222556.png");
    this.load.image("player", "/assets/sprites/rpg-characters/freepixel-rpg-characters-companions/warrior-knight-with-sword-021.png");
    this.load.image("slash", "/assets/kenney/slash.png");
  }

  create() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);

    const worldWidth = 1600;
    const worldHeight = 1200;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    cam.setBounds(0, 0, worldWidth, worldHeight);

    this.add.image(400, 300, "sky").setScrollFactor(0).setDepth(-20);

    const platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, "ground").setScale(2).refreshBody();
    platforms.create(600, 400, "ground");
    platforms.create(50, 250, "ground");
    platforms.create(750, 220, "ground");
    platforms.create(1100, 520, "ground");
    platforms.create(1400, 380, "ground");

    const stars = this.physics.add.group({
      key: "star",
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 120 },
    });

    const bombs = this.physics.add.group();

    stars.children.iterate((child) => {
      const star = child as Phaser.Physics.Arcade.Image;
      star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      star.setDisplaySize(28, 28);
      return true;
    });

    const player = this.physics.add.sprite(100, 450, "player");
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.setDisplaySize(40, 40);
    player.setDepth(100);
    (player.body as Phaser.Physics.Arcade.Body).setGravityY(300);

    const collectStar: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
      _playerObj,
      starObj,
    ) => {
      if (!(starObj instanceof Phaser.Physics.Arcade.Image)) return;
      const star = starObj;
      star.disableBody(true, true);

      if (stars.countActive(true) === 0) {
        stars.children.iterate((child) => {
          const resetStar = child as Phaser.Physics.Arcade.Image;
          resetStar.enableBody(true, resetStar.x, 0, true, true);
          return true;
        });

        const bombX = player.x < 800 ? Phaser.Math.Between(800, 1560) : Phaser.Math.Between(20, 760);
        const bomb = bombs.create(bombX, 16, "bomb") as Phaser.Physics.Arcade.Image;
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.setDisplaySize(34, 34);
        const bombBody = bomb.body as Phaser.Physics.Arcade.Body;
        bombBody.setAllowGravity(false);
      }
    };

    const hitBomb: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
      playerObj,
      bombObj,
    ) => {
      this.physics.pause();

      if (!(playerObj instanceof Phaser.Physics.Arcade.Sprite)) return;
      const hitPlayer = playerObj;
      hitPlayer.setTint(0xff0000);
      hitPlayer.setVelocity(0, 0);

      if (bombObj instanceof Phaser.Physics.Arcade.Image) {
        bombObj.setTint(0xaa1111);
      }
    };

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);
    this.physics.add.overlap(player, stars, collectStar, undefined, this);
    this.physics.add.collider(player, bombs, hitBomb, undefined, this);

    cam.startFollow(player, true, 0.12, 0.12);

    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd = this.input.keyboard!.addKeys("A,D,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    const pointer = this.input.activePointer;
    let wasRightDown = false;
    let lastAttackAt = 0;
    const attackCooldownMs = 250;

    const jump = () => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.touching.down || body.blocked.down) {
        player.setVelocityY(-330);
      }
    };

    const attack = () => {
      const now = this.time.now;
      if (now - lastAttackAt < attackCooldownMs) return;
      lastAttackAt = now;

      const facingDirection = player.flipX ? -1 : 1;
      const slash = this.add.image(
        player.x + facingDirection * 32,
        player.y - 6,
        "slash",
      );
      slash.setDepth(140);
      slash.setScale(0.9);
      slash.setAlpha(0.95);
      slash.setFlipX(facingDirection < 0);

      this.tweens.add({
        targets: slash,
        alpha: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        y: slash.y - 4,
        duration: 110,
        ease: "Quad.Out",
        onComplete: () => slash.destroy(),
      });

      player.setTint(0xffd166);
      this.time.delayedCall(90, () => {
        if (player.active) player.clearTint();
      });

      bombs.children.iterate((child) => {
        const bomb = child as Phaser.Physics.Arcade.Image;
        if (!bomb.active) return true;

        const distance = Phaser.Math.Distance.Between(player.x, player.y, bomb.x, bomb.y);
        if (distance <= 120) {
          const direction = bomb.x >= player.x ? 1 : -1;
          bomb.setVelocity(280 * direction, -140);
        }

        return true;
      });
    };

    this.events.on("update", () => {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);

      const movingLeft = cursors.left.isDown || wasd.A.isDown;
      const movingRight = cursors.right.isDown || wasd.D.isDown;
      const jumpRequested = Phaser.Input.Keyboard.JustDown(wasd.SPACE);
      const rightDown = pointer.rightButtonDown();
      const attackRequested = rightDown && !wasRightDown;
      wasRightDown = rightDown;

      if (movingLeft) {
        player.setVelocityX(-160);
        player.setFlipX(true);
      } else if (movingRight) {
        player.setVelocityX(160);
        player.setFlipX(false);
      } else {
        player.setVelocityX(0);
      }

      if (jumpRequested) jump();
      if (attackRequested) attack();
    });
  }
}

export default function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    initializeStore();
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    hostRef.current.addEventListener("contextmenu", preventContextMenu);

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

    return () => {
      hostRef.current?.removeEventListener("contextmenu", preventContextMenu);
      game.destroy(true);
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100vw", height: "100vh" }} />;
}
