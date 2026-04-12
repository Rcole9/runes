"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { initializeStore } from "@/game/store";
import { gameStore } from "@/game/store";
import { generateLoot } from "@/game/loot";
import { hashSeed, mulberry32 } from "@/game/rng";
import { spawnCollectibles, wireAutoPickup } from "@/game/collectibles";

// ── game constants ────────────────────────────────────────────────────────────
const KEYS_TO_UNLOCK  = 5;
const ENEMY_CHASE_DIST = 220;
const ATTACK_RANGE    = 110;
const ATTACK_COOLDOWN = 300;

// per-enemy mutable state stored with getData/setData
interface EnemyState { hp: number; patrolDir: number; patrolTimer: number; hitTimer: number; }

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  preload() {
    this.load.pack("public-pack", "/phaser-pack.json");
    this.load.image("sky",    "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-altar-holy-light-divine-healing-golden_20260217_223403.png");
    this.load.image("ground", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-stone-floor-tile-bloody-stained-dark_20260217_213627.png");
    this.load.image("key",    "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-key-golden-boss-door-master-ornate_20260217_220007.png");
    this.load.image("orc",    "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-orc-large-green-axe-warrior-brute_20260217_222727.png");
    this.load.image("slime",  "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-slime-green-blob-bouncing-acidic-basic_20260217_222643.png");
    this.load.image("door",   "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-door-boss-ornate-large-menacing-skull_20260217_215806.png");
    this.load.image("player", "/assets/sprites/rpg-characters/freepixel-rpg-characters-companions/warrior-knight-with-sword-021.png");
    this.load.image("slash",  "/assets/kenney/slash.png");
  }

  create() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);

    const worldWidth = 2400;
    const worldHeight = 620;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    cam.setBounds(0, 0, worldWidth, worldHeight);

    // ── background ───────────────────────────────────────────────────────────
    this.add.tileSprite(0, 0, worldWidth, worldHeight, "sky")
      .setOrigin(0, 0).setDepth(-20).setAlpha(0.35);

    // ── platforms ────────────────────────────────────────────────────────────
    const platforms = this.physics.add.staticGroup();
    const makePlatform = (x: number, y: number, w: number, h = 32) => {
      const tile = platforms.create(x, y, "ground") as Phaser.Physics.Arcade.Image;
      tile.setDisplaySize(w, h).refreshBody();
    };
    makePlatform(1200, 592, 2400, 32); // ground
    makePlatform(260,  460, 180);
    makePlatform(560,  380, 180);
    makePlatform(860,  460, 180);
    makePlatform(1160, 300, 180);
    makePlatform(1460, 460, 180);
    makePlatform(1760, 380, 180);
    makePlatform(2060, 460, 180);

    // ── door (locked until KEYS_TO_UNLOCK keys are collected) ────────────────
    const door = this.add.image(2360, 548, "door").setDisplaySize(56, 76).setDepth(50);
    const doorGlow = this.add
      .rectangle(2360, 548, 62, 82, 0xff2222, 0.4)
      .setDepth(49);
    const doorZoneBody = this.physics.add
      .image(2360, 548, "door")
      .setDisplaySize(56, 76)
      .setAlpha(0) // invisible – only used for overlap
      .setDepth(0)
      .setImmovable(true);
    (doorZoneBody.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // ── keys scattered in the world (plus extras dropped by enemies) ─────────
    let keysCollected = 0;
    const keyGroup = spawnCollectibles(this, [
      { kind: "loot", x: 260,  y: 430, texture: "key", scale: 0.1 },
      { kind: "loot", x: 560,  y: 350, texture: "key", scale: 0.1 },
      { kind: "loot", x: 860,  y: 430, texture: "key", scale: 0.1 },
      { kind: "loot", x: 1160, y: 270, texture: "key", scale: 0.1 },
      { kind: "loot", x: 1460, y: 430, texture: "key", scale: 0.1 },
      { kind: "loot", x: 1760, y: 350, texture: "key", scale: 0.1 },
      { kind: "loot", x: 2060, y: 430, texture: "key", scale: 0.1 },
    ]);

    // ── enemies ──────────────────────────────────────────────────────────────
    const enemies = this.physics.add.group();

    const spawnEnemy = (x: number, y: number, tex: "orc" | "slime") => {
      const e = enemies.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
      e.setDisplaySize(tex === "orc" ? 38 : 30, tex === "orc" ? 38 : 28);
      (e.body as Phaser.Physics.Arcade.Body).setSize(
        tex === "orc" ? 26 : 22,
        tex === "orc" ? 32 : 24,
      );
      e.setBounce(0.05).setCollideWorldBounds(true).setDepth(90);
      e.setData("state", {
        hp: tex === "orc" ? 3 : 2,
        patrolDir: Phaser.Math.Between(0, 1) ? 1 : -1,
        patrolTimer: Phaser.Math.Between(1000, 2500),
        hitTimer: 0,
      } satisfies EnemyState);
      return e;
    };

    spawnEnemy(380,  548, "slime");
    spawnEnemy(650,  548, "orc");
    spawnEnemy(950,  548, "slime");
    spawnEnemy(1250, 548, "orc");
    spawnEnemy(1550, 548, "slime");
    spawnEnemy(1850, 548, "orc");
    spawnEnemy(2150, 548, "slime");

    this.physics.add.collider(enemies, platforms);

    // ── player ───────────────────────────────────────────────────────────────
    let playerHP = 3;
    let playerHitCooldown = 0;
    const player = this.physics.add.sprite(80, 540, "player");
    player.setBounce(0.1).setCollideWorldBounds(true)
      .setDisplaySize(40, 40).setDepth(100);
    (player.body as Phaser.Physics.Arcade.Body).setSize(26, 36);

    this.physics.add.collider(player, platforms);

    // ── HUD ──────────────────────────────────────────────────────────────────
    const hudStyle = {
      fontSize: "15px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 3,
    };
    const hpText  = this.add.text(12,  12, "HP: 3 / 3",            hudStyle).setScrollFactor(0).setDepth(200);
    const keyText = this.add.text(12, 32, `Keys: 0 / ${KEYS_TO_UNLOCK} (unlock door)`, hudStyle).setScrollFactor(0).setDepth(200);

    const updateHUD = () => {
      hpText.setText(`HP: ${playerHP} / 3`);
      const locked = keysCollected < KEYS_TO_UNLOCK ? " (unlock door)" : " ✓ DOOR OPEN";
      keyText.setText(`Keys: ${keysCollected} / ${KEYS_TO_UNLOCK}${locked}`);
    };

    // ── key collection ───────────────────────────────────────────────────────
    // ── key collection (via collectibles module) ─────────────────────────────
    wireAutoPickup(this, player, keyGroup, {
      onPotion: () => { /* no potions in this group */ },
      onLoot: () => {
        keysCollected++;
        updateHUD();
        if (keysCollected >= KEYS_TO_UNLOCK) {
          doorGlow.setFillStyle(0x00ff99, 0.5);
          door.setTint(0x88ffcc);
          this.tweens.add({
            targets: doorGlow, alpha: { from: 0.5, to: 1 },
            yoyo: true, repeat: -1, duration: 500,
          });
        }
      },
    });

    // --- Collectibles (auto-pickup) ---
    const pickups = spawnCollectibles(this, [
      { kind: "potion", x: 560,  y: 340, texture: "key", scale: 0.9, value: 1 },
      { kind: "potion", x: 1460, y: 420, texture: "key", scale: 0.9, value: 1 },
      { kind: "loot",   x: 1160, y: 260, texture: "slash", scale: 0.7, value: 1 },
    ]);

    wireAutoPickup(this, player, pickups, {
      onPotion: (amount) => {
        gameStore.addPotions(amount);
      },
      onLoot: () => {
        // deterministic-ish loot for MVP
        const rng = mulberry32(hashSeed(String(Date.now())));
        const item = generateLoot(rng, gameStore.getState().dungeonTier);
        gameStore.grantLoot(item);
      },
    });

    // ── door: advance area when unlocked ─────────────────────────────────────
    let areaCleared = false;
    this.physics.add.overlap(player, doorZoneBody, () => {
      if (keysCollected < KEYS_TO_UNLOCK || areaCleared) return;
      areaCleared = true;
      this.physics.pause();
      const cx = this.cameras.main.midPoint.x;
      const cy = this.cameras.main.midPoint.y;
      const banner = this.add.text(cx, cy, "✨  AREA CLEARED!  ✨", {
        fontSize: "34px", color: "#ffd166",
        stroke: "#000000", strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
      this.time.delayedCall(2600, () => {
        banner.destroy();
        areaCleared = false;
        keysCollected = 0;
        updateHUD();
        player.clearTint();
        player.setPosition(80, 540);
        door.clearTint();
        doorGlow.setFillStyle(0xff2222, 0.4);
        this.tweens.killTweensOf(doorGlow);
        this.physics.resume();
      });
    });

    // ── enemy touches player → take damage ──────────────────────────────────
    this.physics.add.overlap(player, enemies, () => {
      if (this.time.now < playerHitCooldown) return;
      playerHitCooldown = this.time.now + 900;
      playerHP = Math.max(0, playerHP - 1);
      updateHUD();
      player.setTint(0xff5555);
      this.time.delayedCall(300, () => { if (player.active) player.clearTint(); });
      if (playerHP <= 0) {
        this.physics.pause();
        player.setTint(0xff0000);
        const cx = this.cameras.main.midPoint.x;
        const cy = this.cameras.main.midPoint.y;
        const banner = this.add.text(cx, cy, "YOU DIED", {
          fontSize: "42px", color: "#ff4444",
          stroke: "#000000", strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
        this.time.delayedCall(2000, () => {
          banner.destroy();
          playerHP = 3;
          updateHUD();
          player.clearTint();
          player.setPosition(80, 540);
          this.physics.resume();
        });
      }
    });

    // ── input ────────────────────────────────────────────────────────────────
    const cursors = this.input.keyboard!.createCursorKeys();
    const keys    = this.input.keyboard!.addKeys("A,D,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    const pointer = this.input.activePointer;
    let wasRightDown = false;
    let lastAttackAt = 0;

    cam.startFollow(player, true, 0.1, 0.1);

    const jump = () => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.touching.down || body.blocked.down) {
        player.setVelocityY(-380);
      }
    };

    const attack = () => {
      if (this.time.now - lastAttackAt < ATTACK_COOLDOWN) return;
      lastAttackAt = this.time.now;

      const dir = player.flipX ? -1 : 1;

      // slash VFX
      const slash = this.add.image(player.x + dir * 32, player.y - 6, "slash");
      slash.setDepth(140).setScale(0.9).setAlpha(0.95).setFlipX(dir < 0);
      this.tweens.add({
        targets: slash, alpha: 0, scaleX: 1.25, scaleY: 1.25, y: slash.y - 4,
        duration: 110, ease: "Quad.Out", onComplete: () => slash.destroy(),
      });

      player.setTint(0xffd166);
      this.time.delayedCall(90, () => { if (player.active) player.clearTint(); });

      // damage enemies in range — collect kills OUTSIDE iterate to avoid
      // mutating the group while traversing it (causes freeze/crash in Phaser)
      const toKill: Phaser.Physics.Arcade.Sprite[] = [];

      enemies.children.iterate((child) => {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active) return true;

        const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (dist > ATTACK_RANGE) return true;

        const state = enemy.getData("state") as EnemyState;
        if (this.time.now - state.hitTimer < 280) return true;
        state.hitTimer = this.time.now;
        state.hp--;

        enemy.setTint(0xffffff);
        const kbDir = enemy.x >= player.x ? 1 : -1;
        enemy.setVelocity(220 * kbDir, -130);
        this.time.delayedCall(130, () => { if (enemy.active) enemy.clearTint(); });

        if (state.hp <= 0) toKill.push(enemy);
        return true;
      });

      for (const enemy of toKill) {
        const ex = enemy.x;
        const ey = enemy.y - 8;
        enemy.destroy();
        const dropped = spawnCollectibles(this, [
          { kind: "loot", x: ex, y: ey, texture: "key", scale: 0.1 },
        ]);
        wireAutoPickup(this, player, dropped, {
          onPotion: () => {},
          onLoot: () => {
            keysCollected++;
            updateHUD();
            if (keysCollected >= KEYS_TO_UNLOCK) {
              doorGlow.setFillStyle(0x00ff99, 0.5);
              door.setTint(0x88ffcc);
              this.tweens.add({
                targets: doorGlow, alpha: { from: 0.5, to: 1 },
                yoyo: true, repeat: -1, duration: 500,
              });
            }
          },
        });
      }
    };

    // ── update loop ──────────────────────────────────────────────────────────
    this.events.on("update", (_t: number, delta: number) => {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);

      // movement
      const goLeft  = cursors.left.isDown  || keys.A.isDown;
      const goRight = cursors.right.isDown || keys.D.isDown;
      if (goLeft)       { player.setVelocityX(-165); player.setFlipX(true); }
      else if (goRight) { player.setVelocityX(165);  player.setFlipX(false); }
      else              { player.setVelocityX(0); }

      if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) jump();

      const rightNow = pointer.rightButtonDown();
      if (rightNow && !wasRightDown) attack();
      wasRightDown = rightNow;

      // enemy AI (patrol / chase)
      enemies.children.iterate((child) => {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active) return true;

        const state = enemy.getData("state") as EnemyState;
        const dist  = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        const body  = enemy.body as Phaser.Physics.Arcade.Body;

        if (dist < ENEMY_CHASE_DIST) {
          const chaseDir = player.x < enemy.x ? -1 : 1;
          body.setVelocityX(90 * chaseDir);
          enemy.setFlipX(chaseDir < 0);
        } else {
          state.patrolTimer -= delta;
          if (state.patrolTimer <= 0) {
            state.patrolDir  *= -1;
            state.patrolTimer = Phaser.Math.Between(1200, 2800);
          }
          body.setVelocityX(40 * state.patrolDir);
          enemy.setFlipX(state.patrolDir < 0);
        }
        return true;
      });
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
