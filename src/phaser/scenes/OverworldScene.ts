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

  private createBackdrop(): void {
    // Solid background only (decorative graphics removed)
  }

  create(): void {
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
      "npc",
    );
    this.npc.setDisplaySize(20, 28);
    this.npc.setDepth(this.mapOrigin.y + npcPos.y + 100);

    const portalPos = worldToScreen(this.portalWorld);
    this.portal = this.add.image(
      this.mapOrigin.x + portalPos.x,
      this.mapOrigin.y + portalPos.y - 24,
      "portal",
    );
    this.portal.setDisplaySize(36, 52);
    this.portal.setDepth(this.mapOrigin.y + portalPos.y + 120);

    const start = worldToScreen(this.playerWorld);
    this.player = this.add.image(
      this.mapOrigin.x + start.x,
      this.mapOrigin.y + start.y - 14,
      "player",
    );
    this.player.setDisplaySize(24, 24);
    this.player.setDepth(this.mapOrigin.y + start.y + 90);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(180, 120);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,F") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.hudText = this.add
      .text(16, 16, "WASD move | F enter portal | E near NPC", {
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
    if (this.keys.W.isDown) this.playerWorld.y -= speed;
    if (this.keys.S.isDown) this.playerWorld.y += speed;
    if (this.keys.A.isDown) this.playerWorld.x -= speed;
    if (this.keys.D.isDown) this.playerWorld.x += speed;

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
      this.hudText.setText(`Press F to enter ${selectedLevelLabel} dungeon`);
      if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
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
    } else {
      this.hudText.setText("WASD move | F enter portal | E near NPC");
    }

    const npcDist = Phaser.Math.Distance.Between(
      this.playerWorld.x,
      this.playerWorld.y,
      4,
      9,
    );
    if (npcDist < 1.4 && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.hudText.setText("NPC: The boss reads your moves. Watch telegraphs.");
    }
  }
}
