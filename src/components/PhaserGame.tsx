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
const FLOORS_PER_LEVEL = 3;
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
    this.load.image("sky",         "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-altar-holy-light-divine-healing-golden_20260217_223403.png");
    this.load.image("ground",     "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-stone-floor-tile-bloody-stained-dark_20260217_213627.png");
    this.load.image("plat-stone",  "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-stone-wall-tile-gray-brick-pattern_20260217_213642.png");
    this.load.image("plat-cobble", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-cobblestone-floor-tile-uneven-rough_20260217_214245.png");
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
    const PLAT_H = 22;

    // Tiled platform helper — visual tileSprite + invisible physics body
    const makeP = (x: number, y: number, w: number, tex = "ground") => {
      this.add.tileSprite(x, y, w, PLAT_H, tex).setOrigin(0, 0).setDepth(10);
      const body = platforms.create(x + w / 2, y + PLAT_H / 2, tex) as Phaser.Physics.Arcade.Image;
      body.setDisplaySize(w, PLAT_H).setAlpha(0).refreshBody();
    };

    // Ground floor
    this.add.tileSprite(0, 576, worldWidth, worldHeight - 576, "ground")
      .setOrigin(0, 0).setDepth(5);
    const groundBody = platforms.create(1200, 592, "ground") as Phaser.Physics.Arcade.Image;
    groundBody.setDisplaySize(worldWidth, 32).setAlpha(0).refreshBody();

    // ── Metroid-style multi-tier layout ──────────────────────────────────────
    //  F3 y=308  ··[========]·········[========]···[=========]··[======]··[========]
    //  F2 y=404  ···[======]···[======]···[====]··[======]·····[=========]···[======]
    //  F1 y=500  [========]··[====]···[====]···[======]···[====]···[=======]
    //  GND y=576 ═══════════════════════════════════════════════════════════════════

    // F1 — low stone ledges
    makeP(60,   500, 220, "ground");
    makeP(540,  500, 140, "ground");
    makeP(900,  500, 120, "ground");
    makeP(1160, 500, 160, "ground");
    makeP(1560, 500, 120, "ground");
    makeP(1840, 500, 200, "ground");

    // F2 — mid stone platforms
    makeP(220,  404, 200, "plat-stone");
    makeP(640,  404, 200, "plat-stone");
    makeP(1020, 404, 160, "plat-stone");
    makeP(1420, 404, 180, "plat-stone");
    makeP(1700, 404, 260, "plat-stone");
    makeP(2020, 404, 200, "plat-stone");

    // F3 — high cobblestone shelves
    makeP(380,  308, 200, "plat-cobble");
    makeP(780,  308, 200, "plat-cobble");
    makeP(1160, 308, 240, "plat-cobble");
    makeP(1580, 308, 180, "plat-cobble");
    makeP(1900, 308, 220, "plat-cobble");

    // Decorative vertical stone columns (atmosphere, no physics)
    [480, 860, 1360, 1760, 2120].forEach(cx => {
      this.add.tileSprite(cx - 8, 180, 16, 396, "plat-stone")
        .setOrigin(0, 0).setDepth(3).setAlpha(0.45);
    });

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

    // ── progression state ─────────────────────────────────────────────────────
    let level = 1;
    let floor = 1;
    let keysCollected = 0;
    let keysRequired = KEYS_TO_UNLOCK;
    let inTransition = false;
    let bossDefeated = false;
    let chestOpened = false;
    let roundKeys: Phaser.Physics.Arcade.StaticGroup | null = null;
    let roundKeyOverlap: Phaser.Physics.Arcade.Collider | null = null;
    let chestZone: Phaser.Physics.Arcade.Image | null = null;
    let chestOverlap: Phaser.Physics.Arcade.Collider | null = null;
    let chestArt: Phaser.GameObjects.Image | null = null;

    // ── enemies ──────────────────────────────────────────────────────────────
    const enemies = this.physics.add.group();

    this.physics.add.collider(enemies, platforms);

    // ── player ───────────────────────────────────────────────────────────────
    gameStore.resetHp();
    let playerHP = gameStore.getState().hp;
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
    const roundText = this.add.text(12, 52, "Level 1 - Floor 1", hudStyle).setScrollFactor(0).setDepth(200);
    const objectiveText = this.add.text(12, 72, "Objective: Collect keys", hudStyle).setScrollFactor(0).setDepth(200);

    const isBossFloor = () => floor === FLOORS_PER_LEVEL;

    const updateHUD = () => {
      playerHP = gameStore.getState().hp;
      hpText.setText(`HP: ${playerHP} / 3`);
      roundText.setText(`Level ${level} - Floor ${floor}`);
      if (isBossFloor()) {
        keyText.setText("Keys: N/A (boss area)");
        objectiveText.setText(bossDefeated ? "Objective: Open chest for reward" : "Objective: Defeat the boss");
      } else {
        const locked = keysCollected < keysRequired ? " (unlock door)" : " ✓ DOOR OPEN";
        keyText.setText(`Keys: ${keysCollected} / ${keysRequired}${locked}`);
        objectiveText.setText("Objective: Collect keys and open the door");
      }
    };

    const setDoorLockedVisual = () => {
      door.clearTint();
      doorGlow.setFillStyle(0xff2222, 0.4);
      this.tweens.killTweensOf(doorGlow);
    };

    const setDoorOpenVisual = () => {
      door.setTint(0x88ffcc);
      doorGlow.setFillStyle(0x00ff99, 0.5);
      this.tweens.killTweensOf(doorGlow);
      this.tweens.add({
        targets: doorGlow,
        alpha: { from: 0.45, to: 1 },
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
    };

    const clearRoundKeys = () => {
      if (roundKeyOverlap) {
        roundKeyOverlap.destroy();
        roundKeyOverlap = null;
      }
      if (roundKeys) {
        roundKeys.clear(true, true);
        roundKeys = null;
      }
      keysCollected = 0;
    };

    const createRoundKeys = () => {
      clearRoundKeys();
      if (isBossFloor()) return;

      const offset = (floor - 1) * 16;
      // Keys hover 30px above their platform surface
      // F1 top=500 → y=468 | F2 top=404 → y=372 | F3 top=308 → y=276
      roundKeys = spawnCollectibles(this, [
        { kind: "loot", x: 160  + offset, y: 468, texture: "key", scale: 0.1 }, // F1 left
        { kind: "loot", x: 716  + offset, y: 372, texture: "key", scale: 0.1 }, // F2 mid-left
        { kind: "loot", x: 876  + offset, y: 276, texture: "key", scale: 0.1 }, // F3 climb zone
        { kind: "loot", x: 1240,          y: 276, texture: "key", scale: 0.1 }, // F3 mid
        { kind: "loot", x: 1494 - offset, y: 372, texture: "key", scale: 0.1 }, // F2 section 4
        { kind: "loot", x: 1930 - offset, y: 276, texture: "key", scale: 0.1 }, // F3 right
      ]);

      roundKeyOverlap = this.physics.add.overlap(player, roundKeys, (_p, obj) => {
        const item = obj as Phaser.Physics.Arcade.Image;
        if (!item?.active) return;
        item.disableBody(true, true);
        keysCollected++;
        if (keysCollected >= keysRequired) setDoorOpenVisual();
        updateHUD();
      });
    };

    const clearChest = () => {
      if (chestOverlap) {
        chestOverlap.destroy();
        chestOverlap = null;
      }
      if (chestZone) {
        chestZone.destroy();
        chestZone = null;
      }
      if (chestArt) {
        chestArt.destroy();
        chestArt = null;
      }
      chestOpened = false;
      bossDefeated = false;
    };

    // --- Collectibles (auto-pickup) --- positioned on new platform tiers
    const pickups = spawnCollectibles(this, [
      { kind: "potion", x: 380,  y: 372, texture: "key",   scale: 0.9, value: 1 }, // F2 left
      { kind: "potion", x: 1490, y: 372, texture: "key",   scale: 0.9, value: 1 }, // F2 sect-4
      { kind: "loot",   x: 1640, y: 276, texture: "slash", scale: 0.7, value: 1 }, // F3 right
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

    const spawnEnemy = (x: number, y: number, tex: "orc" | "slime", isBoss = false) => {
      const e = enemies.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
      const width = isBoss ? 76 : tex === "orc" ? 38 : 30;
      const height = isBoss ? 76 : tex === "orc" ? 38 : 28;
      e.setDisplaySize(width, height);
      (e.body as Phaser.Physics.Arcade.Body).setSize(isBoss ? 56 : tex === "orc" ? 26 : 22, isBoss ? 66 : tex === "orc" ? 32 : 24);
      e.setBounce(0.05).setCollideWorldBounds(true).setDepth(isBoss ? 96 : 90);
      e.setData("isBoss", isBoss);
      e.setData("state", {
        hp: isBoss ? 18 : tex === "orc" ? 3 : 2,
        patrolDir: Phaser.Math.Between(0, 1) ? 1 : -1,
        patrolTimer: Phaser.Math.Between(1000, 2500),
        hitTimer: 0,
      } satisfies EnemyState);
      return e;
    };

    const spawnChestReward = () => {
      clearChest();
      chestArt = this.add.image(2200, 548, "key").setDisplaySize(44, 44).setDepth(100).setTint(0xffd166);
      chestZone = this.physics.add.image(2200, 548, "key").setDisplaySize(56, 56).setAlpha(0).setImmovable(true);
      (chestZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

      chestOverlap = this.physics.add.overlap(player, chestZone, () => {
        if (!bossDefeated || chestOpened) return;
        chestOpened = true;
        chestArt?.setTint(0x99ffcc);
        const rng = mulberry32(hashSeed(`boss-${Date.now()}`));
        const reward = generateLoot(rng, gameStore.getState().dungeonTier + 2);
        gameStore.grantLoot(reward);
        const cx = this.cameras.main.midPoint.x;
        const cy = this.cameras.main.midPoint.y;
        const banner = this.add.text(cx, cy, `BOSS REWARD: ${reward.name}`, {
          fontSize: "26px",
          color: "#f6dc9a",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

        this.time.delayedCall(2600, () => {
          banner.destroy();
          level += 1;
          floor = 1;
          keysRequired = KEYS_TO_UNLOCK;
          gameStore.resetHp();
          player.setPosition(80, 540);
          clearChest();
          createRoundKeys();
          spawnRoundEnemies();
          updateHUD();

          const levelBanner = this.add.text(cx, cy, `LEVEL ${level} BEGINS`, {
            fontSize: "40px",
            color: "#9af6dc",
            stroke: "#000000",
            strokeThickness: 6,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(320);

          this.time.delayedCall(1400, () => {
            levelBanner.destroy();
          });
        });
      });
    };

    const spawnRoundEnemies = () => {
      enemies.clear(true, true);
      if (isBossFloor()) {
        spawnEnemy(2000, 534, "orc", true);
        setDoorLockedVisual();
      } else {
        spawnEnemy(380, 548, "slime");
        spawnEnemy(650, 548, "orc");
        spawnEnemy(950, 548, "slime");
        spawnEnemy(1250, 548, "orc");
        spawnEnemy(1550, 548, "slime");
        spawnEnemy(1850, 548, "orc");
        spawnEnemy(2150, 548, "slime");
        setDoorLockedVisual();
      }
    };

    createRoundKeys();
    spawnRoundEnemies();
    updateHUD();

    // ── door: advance area when unlocked ─────────────────────────────────────
    this.physics.add.overlap(player, doorZoneBody, () => {
      if (isBossFloor() || keysCollected < keysRequired || inTransition) return;
      inTransition = true;
      this.physics.pause();
      const cx = this.cameras.main.midPoint.x;
      const cy = this.cameras.main.midPoint.y;
      const banner = this.add.text(cx, cy, `FLOOR ${floor} CLEARED`, {
        fontSize: "34px", color: "#ffd166",
        stroke: "#000000", strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
      this.time.delayedCall(2600, () => {
        banner.destroy();
        floor += 1;
        keysRequired = KEYS_TO_UNLOCK;
        keysCollected = 0;
        clearChest();
        createRoundKeys();
        spawnRoundEnemies();
        gameStore.resetHp();
        player.clearTint();
        player.setPosition(80, 540);
        updateHUD();
        this.physics.resume();
        inTransition = false;
      });
    });

    // ── enemy touches player → take damage ──────────────────────────────────
    this.physics.add.overlap(player, enemies, () => {
      if (this.time.now < playerHitCooldown) return;
      playerHitCooldown = this.time.now + 900;
      gameStore.takeDamage(1);
      playerHP = gameStore.getState().hp;
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
          gameStore.resetHp();
          playerHP = gameStore.getState().hp;
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
    let lastGroundedAt = 0;
    let jumpQueuedUntil = 0;

    const COYOTE_TIME_MS = 50;
    const JUMP_BUFFER_MS = 70;

    cam.startFollow(player, true, 0.1, 0.1);

    const jump = () => {
      jumpQueuedUntil = this.time.now + JUMP_BUFFER_MS;
    };

    const tryConsumeJump = () => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (jumpQueuedUntil <= this.time.now) return;
      const canJump = (body.touching.down || body.blocked.down) || (this.time.now - lastGroundedAt <= COYOTE_TIME_MS);
      if (canJump) {
        player.setVelocityY(-380);
        jumpQueuedUntil = 0;
      }
    };

    this.input.keyboard?.on("keydown-SPACE", jump);

    const attack = () => {
      if (this.time.now - lastAttackAt < ATTACK_COOLDOWN) return;
      lastAttackAt = this.time.now;

      const dir = player.flipX ? 1 : -1;

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
        const isBoss = enemy.getData("isBoss") === true;
        enemy.destroy();
        if (isBoss) {
          bossDefeated = true;
          spawnChestReward();
          updateHUD();
        } else if (!isBossFloor()) {
          const dropped = spawnCollectibles(this, [
            { kind: "loot", x: ex, y: ey, texture: "key", scale: 0.1 },
          ]);
          wireAutoPickup(this, player, dropped, {
            onPotion: () => {},
            onLoot: () => {
              keysCollected++;
              if (keysCollected >= keysRequired) setDoorOpenVisual();
              updateHUD();
            },
          });
        }
      }
    };

    // ── update loop ──────────────────────────────────────────────────────────
    this.events.on("update", (_t: number, delta: number) => {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);

      // movement
      const goLeft  = cursors.left.isDown  || keys.A.isDown;
      const goRight = cursors.right.isDown || keys.D.isDown;
      if (goLeft)       { player.setVelocityX(-165); player.setFlipX(false); }
      else if (goRight) { player.setVelocityX(165);  player.setFlipX(true); }
      else              { player.setVelocityX(0); }

      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.touching.down || body.blocked.down) lastGroundedAt = this.time.now;
      if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) jump();
      tryConsumeJump();

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

        const isBoss = enemy.getData("isBoss") === true;
        const chaseThreshold = isBoss ? 9999 : ENEMY_CHASE_DIST;
        const speed = isBoss ? 125 : 90;
        const patrolSpeed = isBoss ? 80 : 40;

        if (dist < chaseThreshold) {
          const chaseDir = player.x < enemy.x ? -1 : 1;
          body.setVelocityX(speed * chaseDir);
          enemy.setFlipX(chaseDir < 0);
        } else {
          state.patrolTimer -= delta;
          if (state.patrolTimer <= 0) {
            state.patrolDir  *= -1;
            state.patrolTimer = Phaser.Math.Between(1200, 2800);
          }
          body.setVelocityX(patrolSpeed * state.patrolDir);
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
