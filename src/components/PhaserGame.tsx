"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { initializeStore } from "@/game/store";
import { gameStore } from "@/game/store";
import { generateLoot } from "@/game/loot";
import { hashSeed, mulberry32 } from "@/game/rng";
import { spawnCollectibles, wireAutoPickup } from "@/game/collectibles";
import { addPlatform, createPlatformKit } from "@/phaser/platforms";
import {
  addOneWayCollider,
  addOneWayPlatform,
  createOneWayGroup,
} from "@/phaser/oneWayPlatforms";

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
    this.load.image("sky",    "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-altar-holy-light-divine-healing-golden_20260217_223403.png");
    this.load.image("ground", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-stone-floor-tile-bloody-stained-dark_20260217_213627.png");
    this.load.image("cave-bg-1", "/assets/tiles/pixel-fantasy-caves/backgrounds/background1.png");
    this.load.image("cave-bg-2", "/assets/tiles/pixel-fantasy-caves/backgrounds/background2.png");
    this.load.image("cave-bg-3", "/assets/tiles/pixel-fantasy-caves/backgrounds/background3.png");
    this.load.image("cave-bg-4", "/assets/tiles/pixel-fantasy-caves/backgrounds/background4a.png");
    this.load.image("cave-bg-4b", "/assets/tiles/pixel-fantasy-caves/backgrounds/background4b.png");
    this.load.image("cave-main", "/assets/tiles/pixel-fantasy-caves/tilesets/mainlev_build.png");
    this.load.image("cave-props-1", "/assets/tiles/pixel-fantasy-caves/props/props1.png");
    this.load.image("cave-props-2", "/assets/tiles/pixel-fantasy-caves/props/props2.png");
    this.load.image("key",    "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-key-golden-boss-door-master-ornate_20260217_220007.png");
    this.load.image("key-brass", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-key-brass-small-standard-door-unlock_20260217_215915.png");
    this.load.image("potion-health", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-potion-health-red-glass-bottle-cork_20260217_221732.png");
    this.load.image("cave-orb", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-magic-orb-floating-light-source-hovering_20260217_220642.png");
    this.load.image("cave-crystal", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-crystal-floor-tile-glowing-purple-vein_20260217_215416.png");
    this.load.image("chest-small", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-chest-wooden-small-basic-loot-closed_20260217_220713.png");
    this.load.image("chest-boss", "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-chest-large-ornate-golden-locked-boss_20260217_220826.png");
    this.load.image("orc",    "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-orc-large-green-axe-warrior-brute_20260217_222727.png");
    this.load.image("slime",  "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-slime-green-blob-bouncing-acidic-basic_20260217_222643.png");
    this.load.image("door",   "/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-door-boss-ornate-large-menacing-skull_20260217_215806.png");
    this.load.image("player", "/assets/sprites/rpg-characters/freepixel-rpg-characters-companions/warrior-knight-with-sword-021.png");
    this.load.image("slash",  "/assets/kenney/slash.png");

    // Load representative weapon and armor sprites for loot drops
    this.load.image("loot-sword", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/steel-longsword-shiny-blade-012-v2.png");
    this.load.image("loot-staff", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/magical-staff-wand-crystal-025-v3.png");
    this.load.image("loot-bow", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/longbow-elven-elegant-curved-022-v3.png");
    this.load.image("loot-dagger", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/dagger-knife-weapon-short-026-v3.png");
    this.load.image("loot-mace", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/war-hammer-mace-heavy-015-v2.png");
    this.load.image("loot-spear", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/spear-polearm-weapon-long-007.png");
    this.load.image("loot-armor", "/assets/sprites/rpg-weapons/freepixel-rpg-weapons-armor/plate-armor-full-heavy-023-v3.png");
  }

  create() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.setZoom(1); // Traditional platformer zoom

    const worldWidth = 2400;
    const worldHeight = 620;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    cam.setBounds(0, 0, worldWidth, worldHeight);

    // ── background ───────────────────────────────────────────────────────────
    this.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 0x131417)
      .setDepth(-50);

    const stampLayer = (key: string, y: number, depth: number, alpha = 1) => {
      for (let x = 0; x < worldWidth; x += 960) {
        this.add.image(x, y, key)
          .setOrigin(0, 0)
          .setDepth(depth)
          .setAlpha(alpha);
      }
    };

    stampLayer("cave-bg-1", 0, -40, 1);
    stampLayer("cave-bg-2", 0, -36, 0.72);
    stampLayer("cave-bg-3", 0, -30, 0.95);
    stampLayer("cave-bg-4", 140, -20, 0.92);
    stampLayer("cave-bg-4b", 150, -16, 0.62);

    // ── platforms ────────────────────────────────────────────────────────────
    const kit = createPlatformKit(this);
    // Create a one-way platform group
    const oneWayGroup = createOneWayGroup(this);

    const placeSheetDeco = (
      key: string,
      cropX: number,
      cropY: number,
      cropW: number,
      cropH: number,
      x: number,
      y: number,
      depth: number,
      alpha: number,
      scale = 1,
    ) => {
      const deco = this.add.image(x, y, key)
        .setOrigin(0, 0)
        .setDepth(depth)
        .setAlpha(alpha);
      deco.setCrop(cropX, cropY, cropW, cropH);
      deco.setDisplaySize(cropW * scale, cropH * scale);
      return deco;
    };

    const platformArt = [
      { key: "cave-props-1", cropX: 176, cropY: 32, cropW: 160, cropH: 88, topInset: 9 },
      { key: "cave-props-1", cropX: 914, cropY: 34, cropW: 194, cropH: 90, topInset: 10 },
      { key: "cave-props-1", cropX: 796, cropY: 368, cropW: 188, cropH: 86, topInset: 9 },
      { key: "cave-props-1", cropX: 624, cropY: 366, cropW: 156, cropH: 84, topInset: 8 },
    ] as const;

    const drawFloatingPlatform = (x: number, y: number, w: number, h = 34, variant = 0) => {
      const art = platformArt[variant % platformArt.length];
      const scale = Math.max(1, w / art.cropW);
      const artWidth = art.cropW * scale;
      const left = x - artWidth / 2;

      const slab = this.add.graphics().setDepth(10);
      slab.fillStyle(0x2a1f20, 0.95);
      slab.fillRoundedRect(x - w / 2, y + 4, w, h - 7, 6);
      slab.fillStyle(0x5f4844, 0.75);
      slab.fillRoundedRect(x - w / 2 + 4, y + 6, w - 8, 6, 4);

      const shadow = this.add.ellipse(x, y + h + 11, Math.max(34, w * 0.64), 11, 0x090708, 0.34)
        .setDepth(8);

      const artDeco = placeSheetDeco(
        art.key,
        art.cropX,
        art.cropY,
        art.cropW,
        art.cropH,
        left,
        y - art.topInset * scale,
        11,
        0.98,
        scale,
      );

      const lip = this.add.graphics().setDepth(12);
      lip.fillStyle(0xc6a08d, 0.22);
      lip.fillRect(x - w / 2 + 10, y + 1, w - 20, 2);

      return [shadow, slab, artDeco, lip] as Phaser.GameObjects.GameObject[];
    };

    // Background set dressing from the full cave PNG sheets.
    placeSheetDeco("cave-main", 12, 20, 690, 520, 20, 80, -24, 0.2, 0.95);
    placeSheetDeco("cave-main", 14, 574, 464, 436, 500, 368, -22, 0.24, 0.92);
    placeSheetDeco("cave-main", 494, 658, 438, 218, 1780, 404, -22, 0.28, 0.92);
    placeSheetDeco("cave-props-1", 20, 178, 124, 320, 60, 10, -14, 0.4, 0.92);
    placeSheetDeco("cave-props-1", 1110, 304, 120, 292, 2200, 18, -14, 0.42, 0.92);
    placeSheetDeco("cave-props-1", 550, 600, 300, 108, 1030, 180, -12, 0.32, 0.9);
    placeSheetDeco("cave-props-2", 34, 500, 330, 242, 120, 382, 7, 0.72, 0.9);
    placeSheetDeco("cave-props-2", 604, 438, 308, 174, 1470, 432, 7, 0.72, 0.94);
    placeSheetDeco("cave-props-2", 0, 864, 370, 142, 1830, 470, 7, 0.82, 0.95);

    // Ground (one big floor) using log platform art
    this.add.image(0, 576, "cave-props-1")
      .setOrigin(0, 0)
      .setCrop(176, 32, worldWidth, 88)
      .setDisplaySize(worldWidth, 48)
      .setDepth(4)
      .setAlpha(1);
    addPlatform(this, kit, { x: 1200, y: 592, w: 2400, h: 48, faceH: 18 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });

    // Add classic jumpable platforms with cave-main tile
    addPlatform(this, kit, { x: 400, y: 480, w: 180, h: 40 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });
    addPlatform(this, kit, { x: 700, y: 400, w: 160, h: 40 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });
    addPlatform(this, kit, { x: 1000, y: 320, w: 140, h: 40 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });
    addPlatform(this, kit, { x: 1300, y: 400, w: 160, h: 40 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });
    addPlatform(this, kit, { x: 1600, y: 480, w: 180, h: 40 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });
    addPlatform(this, kit, { x: 1900, y: 380, w: 140, h: 40 }, { top: "cave-props-1", crop: { x: 176, y: 32, w: 160, h: 88 } });

    // Example one-way platforms (add more as needed) with cave-main tile
    // Add one-way platforms and draw log visuals manually
    addOneWayPlatform(this, oneWayGroup, { x: 600, y: 420, w: 220, thickness: 36 }, "cave-props-1");
    this.add.image(600 - 110, 420, "cave-props-1")
      .setOrigin(0, 0)
      .setCrop(176, 32, 160, 88)
      .setDisplaySize(220, 40)
      .setDepth(5)
      .setAlpha(1);

    addOneWayPlatform(this, oneWayGroup, { x: 1400, y: 340, w: 220, thickness: 36 }, "cave-props-1");
    this.add.image(1400 - 110, 340, "cave-props-1")
      .setOrigin(0, 0)
      .setCrop(176, 32, 160, 88)
      .setDisplaySize(220, 40)
      .setDepth(5)
      .setAlpha(1);

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
    this.physics.add.collider(enemies, kit.solids);

    // ── enemy health bars ──
    const enemyHpBars = new Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Graphics>();

    // ── player ───────────────────────────────────────────────────────────────
    gameStore.resetHp();
    let playerHP = gameStore.getState().hp;
    let playerHitCooldown = 0;
    const player = this.physics.add.sprite(80, 540, "player");
    player.setBounce(0.1).setCollideWorldBounds(true)
      .setDisplaySize(40, 40).setDepth(100);
    (player.body as Phaser.Physics.Arcade.Body).setSize(26, 36);

    // Enable one-way platform collision for player
    addOneWayCollider(this, player, oneWayGroup);
    // Enable landing on solid platforms
    this.physics.add.collider(player, kit.solids);


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

      const offset = (floor - 1) * 18;
      // Keys hover just above the current one-way jump route.
      roundKeys = spawnCollectibles(this, [
        { kind: "key", x: 240  + offset, y: 416, texture: "key-brass", scale: 0.34 },
        { kind: "key", x: 620  + offset, y: 296, texture: "key-brass", scale: 0.34 },
        { kind: "key", x: 1020 + offset, y: 331, texture: "key-brass", scale: 0.34 },
        { kind: "key", x: 1210,          y: 266, texture: "key-brass", scale: 0.34 },
        { kind: "key", x: 1600 - offset, y: 316, texture: "key-brass", scale: 0.34 },
        { kind: "key", x: 2170 - offset, y: 311, texture: "key-brass", scale: 0.34 },
      ]);

      // Use wireAutoPickup for collecting keys and unlocking the door
      wireAutoPickup(this, player, roundKeys, {
        onPotion: () => {},
        onLoot: () => {},
        onKey: (_amount?: number) => {
          // Always count 1 per key, ignore value
          keysCollected += 1;
          console.log("Collected, keys:", keysCollected);
          updateHUD();
          if (keysCollected >= keysRequired) {
            doorGlow.setFillStyle(0x00ff99, 0.5);
            door.setTint(0x88ffcc);
            setDoorOpenVisual();
          }
        },
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
    // Smaller, more scattered loot
    const pickups = spawnCollectibles(this, [
      { kind: "potion", x: 430,  y: 356, texture: "potion-health", scale: 0.34, value: 1 },
      { kind: "potion", x: 1420, y: 376, texture: "potion-health", scale: 0.34, value: 1 },
      { kind: "loot", x: 320, y: 420, texture: "cave-crystal", scale: 0.34 },
      { kind: "loot", x: 700, y: 310, texture: "cave-crystal", scale: 0.34 },
      { kind: "loot", x: 1100, y: 340, texture: "cave-crystal", scale: 0.34 },
      { kind: "loot", x: 1350, y: 270, texture: "cave-crystal", scale: 0.34 },
      { kind: "loot", x: 1700, y: 320, texture: "cave-crystal", scale: 0.34 },
      { kind: "loot", x: 2000, y: 400, texture: "cave-crystal", scale: 0.34 },
    ]);

    wireAutoPickup(this, player, pickups, {
      onPotion: (amount) => {
        gameStore.addPotions(amount);
      },
      onLoot: () => {}, // keys are handled elsewhere
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
      // Add health bar
      const hpBar = this.add.graphics();
      enemyHpBars.set(e, hpBar);
      updateEnemyHpBar(e);
      return e;
    };

    // Draw/update enemy health bar
    const updateEnemyHpBar = (enemy: Phaser.Physics.Arcade.Sprite) => {
      const state = enemy.getData("state") as EnemyState;
      const isBoss = enemy.getData("isBoss") === true;
      const hpBar = enemyHpBars.get(enemy);
      if (!hpBar) return;
      const width = isBoss ? 54 : 28;
      const height = isBoss ? 10 : 5;
      const x = enemy.x - width / 2;
      const y = enemy.y - (isBoss ? 54 : 24);
      const pct = Phaser.Math.Clamp(state.hp / (isBoss ? 18 : enemy.texture.key === "orc" ? 3 : 2), 0, 1);
      hpBar.clear();
      hpBar.fillStyle(0x222222, 0.9);
      hpBar.fillRect(x - 1, y - 1, width + 2, height + 2);
      hpBar.fillStyle(isBoss ? 0xff6666 : 0x66ff66, 1);
      hpBar.fillRect(x, y, width * pct, height);
      hpBar.setDepth(enemy.depth + 10);
    };

    // Chest reward logic: Only allow looting after boss defeat, and only progress after chest is opened
    const spawnChestReward = () => {
      clearChest();
      chestArt = this.add.image(2200, 548, "chest-boss").setDisplaySize(58, 52).setDepth(100).setTint(0xffd166);
      chestZone = this.physics.add.image(2200, 548, "chest-boss").setDisplaySize(62, 58).setAlpha(0).setImmovable(true);
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

        // After looting, progress to next level
        this.input.once('pointerdown', () => {
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

          this.time.delayedCall(1200, () => {
            levelBanner.destroy();
          });
        });
      });
    };

    const spawnRoundEnemies = () => {
      enemies.clear(true, true);
      if (isBossFloor()) {
        spawnEnemy(1680, 372, "slime");
        spawnEnemy(1880, 312, "slime");
        spawnEnemy(2050, 262, "slime");
        spawnEnemy(2180, 320, "orc");
        spawnEnemy(2000, 262, "orc", true);
        setDoorLockedVisual();
      } else {
        spawnEnemy(240, 410, "slime");
        spawnEnemy(620, 288, "orc");
        spawnEnemy(820, 395, "slime");
        spawnEnemy(1210, 258, "orc");
        spawnEnemy(1420, 370, "slime");
        spawnEnemy(1790, 248, "orc");
        spawnEnemy(2150, 305, "slime");
        spawnEnemy(980, 548, "slime");
        spawnEnemy(1640, 548, "orc");
        setDoorLockedVisual();
      }
    };

    createRoundKeys();
    spawnRoundEnemies();
    updateHUD();

    // ── door: advance area when unlocked ─────────────────────────────────────
    this.physics.add.overlap(player, doorZoneBody, () => {
      console.log("Overlap with door! keys:", keysCollected);
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
    const keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    const pointer = this.input.activePointer;
    let wasRightDown = false;
    let lastAttackAt = 0;

    // Traditional platformer camera: follow player horizontally, restrict vertical movement
    cam.startFollow(player, true, 0.12, 0.0, 0, 0);
    cam.setLerp(0.12, 0); // Only follow X axis
    cam.setFollowOffset(0, 0);

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

        updateEnemyHpBar(enemy);
        if (state.hp <= 0) toKill.push(enemy);
        return true;
      });

      for (const enemy of toKill) {
        const ex = enemy.x;
        const ey = enemy.y - 8;
        const isBoss = enemy.getData("isBoss") === true;
        // Remove health bar
        const hpBar = enemyHpBars.get(enemy);
        if (hpBar) { hpBar.destroy(); enemyHpBars.delete(enemy); }
        enemy.destroy();
        if (isBoss) {
          console.log("Boss killed, spawn key at", ex, ey);
          bossDefeated = true;
          spawnChestReward();
          updateHUD();
        } else if (!isBossFloor()) {
          // Generate random loot (weapon or armor)
          const rng = mulberry32(hashSeed(`${Date.now()}-${Math.random()}`));
          const loot = generateLoot(rng, level);
          // Choose a texture based on loot type
          // Choose a real weapon/armor sprite for loot drop
          let lootTexture = "loot-sword";
          if (loot.slot === "weapon") {
            if (loot.name.toLowerCase().includes("staff")) lootTexture = "loot-staff";
            else if (loot.name.toLowerCase().includes("bow")) lootTexture = "loot-bow";
            else if (loot.name.toLowerCase().includes("dagger")) lootTexture = "loot-dagger";
            else if (loot.name.toLowerCase().includes("mace")) lootTexture = "loot-mace";
            else if (loot.name.toLowerCase().includes("spear")) lootTexture = "loot-spear";
            else lootTexture = "loot-sword";
          } else if (loot.slot === "armor") {
            lootTexture = "loot-armor";
          }
          const dropped = spawnCollectibles(this, [
            { kind: "loot", x: ex, y: ey, texture: lootTexture, scale: 0.48 },
          ]);
          const handlers = {
            onPotion: (amount: number) => {
              gameStore.addPotions(amount);
            },
            onLoot: () => {
              // Grant the generated loot to the player
              if (loot) gameStore.grantLoot(loot);
            },
          };
          wireAutoPickup(this, player, dropped, handlers);
        }
      }
    };
    // End of attack handler

    // --- Main update loop ---
    this.events.on('update', (time: number, delta: number) => {
      // Platformer movement: left/right and jump
      let vx = 0;
      if (cursors.left.isDown || keys.left.isDown) vx -= 1;
      if (cursors.right.isDown || keys.right.isDown) vx += 1;
      player.setVelocityX(vx * 180);
      if (vx < 0) player.setFlipX(true);
      else if (vx > 0) player.setFlipX(false);
      // Jumping
      if ((cursors.up.isDown || keys.up.isDown || cursors.space.isDown) && player.body.blocked.down) {
        player.setVelocityY(-320);
      }

      // Enable attack on pointer down (left click/tap)
      const leftNow = pointer.leftButtonDown();
      if (leftNow && !wasRightDown) attack();
      wasRightDown = leftNow;

      // enemy AI (patrol / chase) and update health bars
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

        // Update health bar position and value
        updateEnemyHpBar(enemy);
        return true;
      });
    });
    // --- End main update loop ---
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
