import * as Phaser from "phaser";
import { generateLoot } from "@/game/loot";
import { PALETTE, hexToNumber } from "@/game/palette";
import { gameStore } from "@/game/store";
import { hashSeed, mulberry32 } from "@/game/rng";
import { derivePlayerStats, enemyScaleFromDifficulty } from "@/game/stats";
import { worldToScreen } from "../iso";

type Enemy = {
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  maxHp: number;
  hp: number;
  damage: number;
  speed: number;
  cooldown: number;
  regenPerSecond: number;
  regenDelayMs: number;
  regenDelayRemaining: number;
};

export class DungeonScene extends Phaser.Scene {
  private playerWorld = { x: 8, y: 8 };
  private player!: Phaser.GameObjects.Image;
  private mapOrigin = { x: 0, y: 140 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private enemies: Enemy[] = [];
  private boss: Enemy | null = null;
  private wave = 0;
  private difficulty = 1;
  private seed = "tier-1";
  private rng = mulberry32(1);
  private attackCooldown = 0;
  private phase = 1;
  private telegraphCooldown = 1200;
  private addSummonCooldown = 2600;
  private statusText!: Phaser.GameObjects.Text;
  private attackQueued = false;

  constructor() {
    super("DungeonScene");
  }

  private createBackdrop(): void {
    const { width, height } = this.cameras.main;
    const sky = this.add.graphics({ x: 0, y: 0 });
    sky.fillGradientStyle(0x090c13, 0x090c13, 0x171b2a, 0x171b2a, 1);
    sky.fillRect(0, 0, width, height);
    sky.setScrollFactor(0);
    sky.setDepth(-2200);

    const riftGlow = this.add.graphics({ x: 0, y: 0 });
    riftGlow.fillStyle(0x4d2e7f, 0.2);
    riftGlow.fillEllipse(width * 0.52, height * 0.28, width * 0.62, height * 0.35);
    riftGlow.fillStyle(0x27807f, 0.16);
    riftGlow.fillEllipse(width * 0.38, height * 0.45, width * 0.5, height * 0.28);
    riftGlow.setScrollFactor(0);
    riftGlow.setDepth(-2100);

    const rimShadow = this.add.graphics({ x: 0, y: 0 });
    rimShadow.fillStyle(0x030508, 0.3);
    rimShadow.fillRect(0, 0, width, 36);
    rimShadow.fillRect(0, height - 54, width, 54);
    rimShadow.setScrollFactor(0);
    rimShadow.setDepth(-2050);
  }

  init(data: { seed: string; difficulty: number }): void {
    this.seed = data.seed;
    this.difficulty = data.difficulty;
    this.rng = mulberry32(hashSeed(data.seed));
    this.wave = 0;
    this.phase = 1;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x090c13);
    this.mapOrigin = {
      x: this.cameras.main.centerX,
      y: 140,
    };
    this.createBackdrop();

    for (let gx = 0; gx < 16; gx += 1) {
      for (let gy = 0; gy < 16; gy += 1) {
        const texture = (gx + gy) % 4 === 0 ? "tile-dirt" : (gx * 2 + gy) % 7 === 0 ? "tile-water" : "tile";
        const p = worldToScreen({ x: gx, y: gy });
        const tile = this.add
          .image(this.mapOrigin.x + p.x, this.mapOrigin.y + p.y, texture)
          .setTint(hexToNumber(PALETTE.void.tealDeep));
        tile.setDisplaySize(64, 32);
        tile.setDepth(p.y);
      }
    }

    const start = worldToScreen(this.playerWorld);
    this.player = this.add.image(
      this.mapOrigin.x + start.x,
      this.mapOrigin.y + start.y - 14,
      "player",
    );
    this.player.setDisplaySize(24, 24);
    this.player.setDepth(this.mapOrigin.y + start.y + 90);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,J,H") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.J,
      Phaser.Input.Keyboard.KeyCodes.H,
    ]);

    this.input.on("pointerdown", () => {
      this.attackQueued = true;
    });

    this.statusText = this.add
      .text(16, 16, "Clear waves to summon the boss | Space/J/click attack | H potion", {
        color: PALETTE.neutrals.paperLight,
        fontSize: "14px",
      })
      .setBackgroundColor(PALETTE.neutrals.inkMid)
      .setPadding(8, 4, 8, 4)
      .setScrollFactor(0)
      .setDepth(5000);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.spawnWave();
  }

  private updateEnemyHealthBar(enemy: Enemy): void {
    const width = 28;
    const height = 5;
    const x = enemy.sprite.x - width / 2;
    const y = enemy.sprite.y - 20;
    const pct = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);

    enemy.hpBar.clear();
    enemy.hpBar.fillStyle(hexToNumber(PALETTE.neutrals.inkDark), 0.9);
    enemy.hpBar.fillRect(x - 1, y - 1, width + 2, height + 2);
    enemy.hpBar.fillStyle(hexToNumber(PALETTE.foliage.leafBright), 1);
    enemy.hpBar.fillRect(x, y, width * pct, height);
    enemy.hpBar.setDepth(enemy.sprite.depth + 50);
  }

  private removeEnemy(enemy: Enemy): void {
    enemy.hpBar.destroy();
    enemy.sprite.destroy();
  }

  private maybeDropLoot(enemy: Enemy): void {
    const dropped = generateLoot(this.rng, this.difficulty + this.wave);
    gameStore.grantLoot(dropped);

    const lootText = this.add
      .text(enemy.sprite.x - 48, enemy.sprite.y - 38, `+ ${dropped.rarity} Loot`, {
        color: PALETTE.sunlight.warm,
        fontSize: "12px",
      })
      .setDepth(enemy.sprite.depth + 110);

    this.tweens.add({
      targets: lootText,
      y: lootText.y - 18,
      alpha: 0,
      duration: 700,
      ease: "Cubic.Out",
      onComplete: () => lootText.destroy(),
    });
  }

  private spawnWave(): void {
    this.wave += 1;
    const count = 2 + this.wave;
    const scaled = enemyScaleFromDifficulty(
      this.difficulty + this.wave,
      gameStore.getState().powerLevel,
    );

    for (let i = 0; i < count; i += 1) {
      const ex = 3 + this.rng() * 10;
      const ey = 3 + this.rng() * 10;
      const p = worldToScreen({ x: ex, y: ey });
      const sprite = this.add.image(
        this.mapOrigin.x + p.x,
        this.mapOrigin.y + p.y - 10,
        "enemy",
      );
      sprite.setDisplaySize(20, 20);
      sprite.setDepth(this.mapOrigin.y + p.y + 80);
      const hpBar = this.add.graphics();
      const maxHp = scaled.hp;
      this.enemies.push({
        sprite,
        hpBar,
        maxHp,
        hp: maxHp,
        damage: scaled.attack,
        speed: 0.003 + this.rng() * 0.001,
        cooldown: 0,
        regenPerSecond: 3 + this.difficulty * 0.3,
        regenDelayMs: 1400,
        regenDelayRemaining: 0,
      });

      this.updateEnemyHealthBar(this.enemies[this.enemies.length - 1]);
    }

    this.statusText.setText(`Dungeon wave ${this.wave}`);
  }

  private spawnBoss(): void {
    const p = worldToScreen({ x: 9, y: 5 });
    const scaled = enemyScaleFromDifficulty(this.difficulty + 5, gameStore.getState().powerLevel);
    const sprite = this.add.image(
      this.mapOrigin.x + p.x,
      this.mapOrigin.y + p.y - 18,
      "boss",
    );
    sprite.setDisplaySize(40, 40);
    sprite.setDepth(this.mapOrigin.y + p.y + 100);
    const hpBar = this.add.graphics();
    const maxHp = scaled.hp * 8;
    this.boss = {
      sprite,
      hpBar,
      maxHp,
      hp: maxHp,
      damage: scaled.attack + 7,
      speed: 0.0015,
      cooldown: 0,
      regenPerSecond: 4 + this.difficulty * 0.45,
      regenDelayMs: 1900,
      regenDelayRemaining: 0,
    };
    this.updateEnemyHealthBar(this.boss);
    this.statusText.setText("Boss phase 1: watch telegraphs");
  }

  private playAttackEffect(x: number, y: number, didHit: boolean): void {
    const slash = this.add.image(x, y - 8, "slash");
    slash.setDepth(y + 220);
    slash.setScale(didHit ? 0.55 : 0.42);
    slash.setAlpha(0.9);
    slash.setAngle(Phaser.Math.Between(-18, 18));
    slash.setTint(
      didHit
        ? hexToNumber(PALETTE.sunlight.highlight)
        : hexToNumber(PALETTE.sunlight.ambientCool),
    );

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: didHit ? 0.86 : 0.62,
      angle: slash.angle + 22,
      y: slash.y - 8,
      duration: didHit ? 130 : 110,
      ease: "Cubic.Out",
      onComplete: () => slash.destroy(),
    });
  }

  private playHitFlash(target: Phaser.GameObjects.Image): void {
    target.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      if (target.active) target.clearTint();
    });
  }

  private playerAttack(): void {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 380;

    const store = gameStore.getState();
    const stats = derivePlayerStats(store.classId, store.level, store.equipment);

    const candidates = [...this.enemies];
    if (this.boss) candidates.push(this.boss);

    let target: Enemy | null = null;
    let best = 999;
    const playerScreen = worldToScreen(this.playerWorld);
    const playerX = this.mapOrigin.x + playerScreen.x;
    const playerY = this.mapOrigin.y + playerScreen.y;

    for (const enemy of candidates) {
      const d = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        playerX,
        playerY,
      );
      if (d < best) {
        best = d;
        target = enemy;
      }
    }

    if (target && best < 86) {
      this.playAttackEffect(target.sprite.x, target.sprite.y, true);
      this.playHitFlash(target.sprite);
      target.hp -= stats.attack;
      target.regenDelayRemaining = target.regenDelayMs;
      this.updateEnemyHealthBar(target);
      if (target.hp <= 0) {
        if (target === this.boss) {
          this.removeEnemy(target);
          this.boss = null;
          const loot = gameStore.completeDungeonAndGrantLoot(this.seed);
          gameStore.refillPotions();
          this.statusText.setText(`Boss defeated: ${loot.name}`);
          this.time.delayedCall(1400, () => this.scene.start("OverworldScene"));
          return;
        }
        this.maybeDropLoot(target);
        this.removeEnemy(target);
        this.enemies = this.enemies.filter((e) => e !== target);
      }
      return;
    }

    const swingX = this.mapOrigin.x + playerScreen.x;
    const swingY = this.mapOrigin.y + playerScreen.y;
    this.playAttackEffect(swingX, swingY, false);
  }

  private updateEnemy(enemy: Enemy, dt: number): void {
    const screen = worldToScreen(this.playerWorld);
    const playerX = this.mapOrigin.x + screen.x;
    const playerY = this.mapOrigin.y + screen.y;
    const angle = Phaser.Math.Angle.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      playerX,
      playerY,
    );

    enemy.sprite.x += Math.cos(angle) * enemy.speed * dt * 60;
    enemy.sprite.y += Math.sin(angle) * enemy.speed * dt * 60;
    enemy.sprite.setDepth(enemy.sprite.y + 80);

    if (enemy.regenDelayRemaining > 0) {
      enemy.regenDelayRemaining -= dt;
    } else if (enemy.hp < enemy.maxHp) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regenPerSecond * (dt / 1000));
      this.updateEnemyHealthBar(enemy);
    }

    this.updateEnemyHealthBar(enemy);

    enemy.cooldown -= dt;
    const dist = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, playerX, playerY);
    if (dist < 28 && enemy.cooldown <= 0) {
      enemy.cooldown = 850;
      const damage = Math.max(1, enemy.damage - 2);
      gameStore.takeDamage(damage);

      const current = gameStore.getState();
      this.statusText.setText(`Hit for ${damage} | HP ${current.hp}/${current.maxHp}`);
      this.cameras.main.shake(75, 0.0015);

      if (current.hp <= 0) {
        gameStore.refillPotions();
        gameStore.resetHp();
        this.scene.start("OverworldScene");
      }
    }
  }

  private castTelegraph(radius: number, delay: number, damage: number): void {
    const marker = this.add.image(this.player.x, this.player.y + 10, "telegraph");
    marker.setScale(radius / 46);
    marker.setDepth(2000);
    this.time.delayedCall(delay, () => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y + 10, marker.x, marker.y);
      if (dist < radius) {
        gameStore.takeDamage(damage);
        if (gameStore.getState().hp <= 0) {
          gameStore.refillPotions();
          gameStore.resetHp();
          this.scene.start("OverworldScene");
        }
      }
      marker.destroy();
    });
  }

  update(_time: number, dt: number): void {
    const speed = dt * 0.0043;
    if (this.keys.W.isDown) this.playerWorld.y -= speed;
    if (this.keys.S.isDown) this.playerWorld.y += speed;
    if (this.keys.A.isDown) this.playerWorld.x -= speed;
    if (this.keys.D.isDown) this.playerWorld.x += speed;

    this.playerWorld.x = Phaser.Math.Clamp(this.playerWorld.x, 1, 14);
    this.playerWorld.y = Phaser.Math.Clamp(this.playerWorld.y, 1, 14);
    const pos = worldToScreen(this.playerWorld);
    this.player.setPosition(
      this.mapOrigin.x + pos.x,
      this.mapOrigin.y + pos.y - 14,
    );
    this.player.setDepth(this.mapOrigin.y + pos.y + 90);

    this.attackCooldown -= dt;
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
      gameStore.usePotion();
    }

    const attackPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.J) ||
      this.attackQueued;
    if (attackPressed) {
      this.playerAttack();
    }
    this.attackQueued = false;

    this.enemies.forEach((enemy) => this.updateEnemy(enemy, dt));

    if (!this.boss) {
      if (this.enemies.length === 0) {
        if (this.wave < 2) {
          this.spawnWave();
        } else {
          this.spawnBoss();
        }
      }
      return;
    }

    this.updateEnemy(this.boss, dt);

    if (this.phase === 1 && this.boss.hp < 0.5 * enemyScaleFromDifficulty(this.difficulty + 5, gameStore.getState().powerLevel).hp * 8) {
      this.phase = 2;
      this.statusText.setText("Boss phase 2: adds incoming");
    }

    this.telegraphCooldown -= dt;
    if (this.telegraphCooldown <= 0) {
      this.telegraphCooldown = this.phase === 1 ? 2200 : 1500;
      const radius = this.phase === 1 ? 44 : 60;
      const delay = this.phase === 1 ? 900 : 700;
      const damage = this.phase === 1 ? 12 : 18;
      this.castTelegraph(radius, delay, damage);
    }

    if (this.phase === 2) {
      this.addSummonCooldown -= dt;
      if (this.addSummonCooldown <= 0) {
        this.addSummonCooldown = 3600;
        const bossWorld = { x: 9 + this.rng() * 2 - 1, y: 5 + this.rng() * 2 - 1 };
        const p = worldToScreen(bossWorld);
        const sprite = this.add.image(
          this.mapOrigin.x + p.x,
          this.mapOrigin.y + p.y - 8,
          "add",
        );
        sprite.setDisplaySize(16, 16);
        sprite.setDepth(this.mapOrigin.y + p.y + 80);
        const hpBar = this.add.graphics();
        const maxHp = 25 + this.difficulty * 6;
        this.enemies.push({
          sprite,
          hpBar,
          maxHp,
          hp: maxHp,
          damage: 8 + this.difficulty,
          speed: 0.0045,
          cooldown: 0,
          regenPerSecond: 2 + this.difficulty * 0.2,
          regenDelayMs: 1200,
          regenDelayRemaining: 0,
        });
        this.updateEnemyHealthBar(this.enemies[this.enemies.length - 1]);
      }
    }
  }
}
