import * as Phaser from "phaser";
import { gameStore } from "@/game/store";
import { hashSeed, mulberry32 } from "@/game/rng";
import { derivePlayerStats, enemyScaleFromDifficulty } from "@/game/stats";
import { worldToScreen } from "../iso";

type Enemy = {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  damage: number;
  speed: number;
  cooldown: number;
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

  init(data: { seed: string; difficulty: number }): void {
    this.seed = data.seed;
    this.difficulty = data.difficulty;
    this.rng = mulberry32(hashSeed(data.seed));
    this.wave = 0;
    this.phase = 1;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1e1118");
    this.mapOrigin = {
      x: this.cameras.main.centerX,
      y: 140,
    };

    for (let gx = 0; gx < 16; gx += 1) {
      for (let gy = 0; gy < 16; gy += 1) {
        const p = worldToScreen({ x: gx, y: gy });
        const tile = this.add
          .image(this.mapOrigin.x + p.x, this.mapOrigin.y + p.y, "tile")
          .setTint(0x705870);
        tile.setDepth(p.y);
      }
    }

    const start = worldToScreen(this.playerWorld);
    this.player = this.add.image(
      this.mapOrigin.x + start.x,
      this.mapOrigin.y + start.y - 14,
      "player",
    );
    this.player.setDepth(this.mapOrigin.y + start.y + 90);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,J") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.J,
    ]);

    this.input.on("pointerdown", () => {
      this.attackQueued = true;
    });

    this.statusText = this.add
      .text(16, 16, "Clear waves to summon the boss | Space/J/click attack", {
        color: "#ffe6ef",
        fontSize: "14px",
      })
      .setScrollFactor(0)
      .setDepth(5000);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.spawnWave();
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
      sprite.setDepth(this.mapOrigin.y + p.y + 80);
      this.enemies.push({
        sprite,
        hp: scaled.hp,
        damage: scaled.attack,
        speed: 0.003 + this.rng() * 0.001,
        cooldown: 0,
      });
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
    sprite.setDepth(this.mapOrigin.y + p.y + 100);
    this.boss = {
      sprite,
      hp: scaled.hp * 8,
      damage: scaled.attack + 7,
      speed: 0.0015,
      cooldown: 0,
    };
    this.statusText.setText("Boss phase 1: watch telegraphs");
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
      target.hp -= stats.attack;
      if (target.hp <= 0) {
        target.sprite.destroy();
        if (target === this.boss) {
          this.boss = null;
          const loot = gameStore.completeDungeonAndGrantLoot(this.seed);
          this.statusText.setText(`Boss defeated: ${loot.name}`);
          this.time.delayedCall(1400, () => this.scene.start("OverworldScene"));
          return;
        }
        this.enemies = this.enemies.filter((e) => e !== target);
      }
    }
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

    enemy.cooldown -= dt;
    const dist = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, playerX, playerY);
    if (dist < 20 && enemy.cooldown <= 0) {
      enemy.cooldown = 1000;
      gameStore.takeDamage(Math.max(1, enemy.damage - 2));
      if (gameStore.getState().hp <= 0) {
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
        sprite.setDepth(this.mapOrigin.y + p.y + 80);
        this.enemies.push({
          sprite,
          hp: 25 + this.difficulty * 6,
          damage: 8 + this.difficulty,
          speed: 0.0045,
          cooldown: 0,
        });
      }
    }
  }
}
