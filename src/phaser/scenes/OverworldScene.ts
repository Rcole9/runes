import * as Phaser from "phaser";
import { PALETTE } from "@/game/palette";
import { gameStore } from "@/game/store";
import {
  difficultyOffsetForLevel,
  dungeonLevelLabel,
  dungeonSeedForLevel,
} from "@/game/progression";
import { worldToScreen } from "../iso";

export class OverworldScene extends Phaser.Scene {
  private playerWorld = { x: 6, y: 6 };
  private moveTarget: { x: number; y: number } | null = null;
  private pendingInteraction: "portal" | "npc" | null = null;
  private player!: Phaser.GameObjects.Image;
  private npc!: Phaser.GameObjects.Image;
  private portal!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private portalWorld = { x: 11, y: 8 };
  private hudText!: Phaser.GameObjects.Text;
  private mapOrigin = { x: 0, y: 120 };

  constructor() {
    super("OverworldScene");
  }

  private firstAvailable(candidates: string[], fallback: string): string {
    for (const key of candidates) {
      if (this.textures.exists(key)) return key;
    }
    return fallback;
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const localX = screenX - this.mapOrigin.x;
    const localY = screenY - this.mapOrigin.y;
    const halfTileW = 32;
    const halfTileH = 16;

    return {
      x: (localX / halfTileW + localY / halfTileH) / 2,
      y: (localY / halfTileH - localX / halfTileW) / 2,
    };
  }

  private setMoveTarget(world: { x: number; y: number }, interaction: "portal" | "npc" | null = null): void {
    this.moveTarget = {
      x: Phaser.Math.Clamp(world.x, 0, 13),
      y: Phaser.Math.Clamp(world.y, 0, 13),
    };
    this.pendingInteraction = interaction;
  }

  private moveTowardTarget(speed: number): void {
    if (!this.moveTarget) return;

    const dx = this.moveTarget.x - this.playerWorld.x;
    const dy = this.moveTarget.y - this.playerWorld.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= speed || distance < 0.08) {
      this.playerWorld.x = this.moveTarget.x;
      this.playerWorld.y = this.moveTarget.y;
      this.moveTarget = null;
      return;
    }

    this.playerWorld.x += (dx / distance) * speed;
    this.playerWorld.y += (dy / distance) * speed;
  }

  private enterPortal(): void {
    const current = gameStore.getState();
    gameStore.resetHp();
    const tier = current.dungeonTier;
    const scaledDifficulty = Math.max(
      1,
      tier + difficultyOffsetForLevel(current.dungeonLevel),
    );
    this.scene.start("DungeonScene", {
      seed: dungeonSeedForLevel(tier, current.dungeonLevel),
      difficulty: scaledDifficulty,
    });
  }

  private talkToNpc(): void {
    this.hudText.setText("NPC: The boss reads your moves. Watch telegraphs.");
  }

  private createBackdrop(): void {
    // Solid background only (decorative graphics removed)
  }

  create(): void {
    const current = gameStore.getState();
    const classPlayerTexture =
      current.classId === "tank"
        ? this.firstAvailable(["player-tank", "player"], "player")
        : current.classId === "healer"
          ? this.firstAvailable(["player-healer", "player"], "player")
          : this.firstAvailable(["player-dps", "player"], "player");

    this.cameras.main.setBackgroundColor(0x182734);
    this.mapOrigin = {
      x: this.cameras.main.centerX,
      y: 120,
    };
    this.createBackdrop();

    for (let gx = 0; gx < 14; gx += 1) {
      for (let gy = 0; gy < 14; gy += 1) {
        const p = worldToScreen({ x: gx, y: gy });
        const texture = (gx + gy) % 5 === 0 ? "tile-path" : (gx * 3 + gy) % 7 === 0 ? "tile-dirt" : "tile";
        const tile = this.add.image(
          this.mapOrigin.x + p.x,
          this.mapOrigin.y + p.y,
          texture,
        );
        tile.setDisplaySize(64, 32);
        tile.setDepth(p.y);
      }
    }

    const npcPos = worldToScreen({ x: 4, y: 9 });
    this.npc = this.add.image(
      this.mapOrigin.x + npcPos.x,
      this.mapOrigin.y + npcPos.y - 20,
      this.firstAvailable(["npc-merchant", "npc-guard", "npc"], "npc"),
    );
    this.npc.setDisplaySize(20, 28);
    this.npc.setDepth(this.mapOrigin.y + npcPos.y + 100);
    this.npc.setInteractive({ cursor: "pointer" });
    this.npc.on("pointerdown", () => {
      this.setMoveTarget({ x: 4, y: 9 }, "npc");
    });

    const portalPos = worldToScreen(this.portalWorld);
    this.portal = this.add.image(
      this.mapOrigin.x + portalPos.x,
      this.mapOrigin.y + portalPos.y - 24,
      "portal",
    );
    this.portal.setDisplaySize(36, 52);
    this.portal.setDepth(this.mapOrigin.y + portalPos.y + 120);
    this.portal.setInteractive({ cursor: "pointer" });
    this.portal.on("pointerdown", () => {
      this.setMoveTarget(this.portalWorld, "portal");
    });

    const start = worldToScreen(this.playerWorld);
    this.player = this.add.image(
      this.mapOrigin.x + start.x,
      this.mapOrigin.y + start.y - 14,
      classPlayerTexture,
    );
    this.player.setDisplaySize(24, 24);
    this.player.setDepth(this.mapOrigin.y + start.y + 90);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(180, 120);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,F") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (currentlyOver.length > 0) return;
        this.setMoveTarget(this.screenToWorld(pointer.worldX, pointer.worldY));
      },
    );

    this.hudText = this.add
      .text(16, 16, "WASD or click move | Click portal or NPC to interact", {
        color: PALETTE.neutrals.paperLight,
        fontSize: "14px",
      })
      .setBackgroundColor(PALETTE.neutrals.inkMid)
      .setPadding(8, 4, 8, 4)
      .setScrollFactor(0)
      .setDepth(3000);
  }

  update(_time: number, dt: number): void {
    const speed = dt * 0.0042;
    const keyboardMoving =
      this.keys.W.isDown || this.keys.S.isDown || this.keys.A.isDown || this.keys.D.isDown;

    if (keyboardMoving) {
      this.moveTarget = null;
      this.pendingInteraction = null;
    }

    if (this.keys.W.isDown) this.playerWorld.y -= speed;
    if (this.keys.S.isDown) this.playerWorld.y += speed;
    if (this.keys.A.isDown) this.playerWorld.x -= speed;
    if (this.keys.D.isDown) this.playerWorld.x += speed;
    if (!keyboardMoving) this.moveTowardTarget(speed);

    this.playerWorld.x = Phaser.Math.Clamp(this.playerWorld.x, 0, 13);
    this.playerWorld.y = Phaser.Math.Clamp(this.playerWorld.y, 0, 13);

    const pos = worldToScreen(this.playerWorld);
    this.player.setPosition(
      this.mapOrigin.x + pos.x,
      this.mapOrigin.y + pos.y - 14,
    );
    this.player.setDepth(this.mapOrigin.y + pos.y + 90);

    const portalDist = Phaser.Math.Distance.Between(
      this.playerWorld.x,
      this.playerWorld.y,
      this.portalWorld.x,
      this.portalWorld.y,
    );

    if (portalDist < 1.5) {
      const current = gameStore.getState();
      const selectedLevelLabel = dungeonLevelLabel(current.dungeonLevel);
      this.hudText.setText(`Press F or click portal to enter ${selectedLevelLabel} dungeon`);
      if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
        this.enterPortal();
        return;
      }

      if (this.pendingInteraction === "portal") {
        this.pendingInteraction = null;
        this.enterPortal();
        return;
      }
    } else {
      this.hudText.setText("WASD or click move | Click portal or NPC to interact");
    }

    const npcDist = Phaser.Math.Distance.Between(
      this.playerWorld.x,
      this.playerWorld.y,
      4,
      9,
    );
    if (npcDist < 1.4) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.pendingInteraction = null;
        this.talkToNpc();
      }

      if (this.pendingInteraction === "npc") {
        this.pendingInteraction = null;
        this.talkToNpc();
      }
    }
  }
}
