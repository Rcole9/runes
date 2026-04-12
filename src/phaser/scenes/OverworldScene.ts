import * as Phaser from "phaser";
import { PALETTE } from "@/game/palette";
import { gameStore } from "@/game/store";
import {
  difficultyOffsetForLevel,
  dungeonLevelLabel,
  dungeonSeedForLevel,
} from "@/game/progression";
import { addLedgeShadows } from "../ledgeShadows";
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
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor(0x182734);
    this.mapOrigin = {
      x: this.cameras.main.centerX,
      y: 120,
    };
    this.createBackdrop();

    const map = this.make.tilemap({
      width: 14,
      height: 14,
      tileWidth: 64,
      tileHeight: 32,
    });
    const tileset = map.addTilesetImage("tile", "tile", 64, 32, 0, 0);
    if (!tileset) {
      throw new Error("Missing tileset texture: tile");
    }

    const mapOffsetX = this.mapOrigin.x - (map.width * map.tileWidth) / 2;
    const mapOffsetY = this.mapOrigin.y - map.tileHeight;
    const bg = map.createBlankLayer("Background", tileset, mapOffsetX, mapOffsetY)?.setDepth(0);
    const floor = map.createBlankLayer("Floor", tileset, mapOffsetX, mapOffsetY)?.setDepth(10);
    const solids = map.createBlankLayer("Solids", tileset, mapOffsetX, mapOffsetY)?.setDepth(20);
    const deco = map.createBlankLayer("Deco", tileset, mapOffsetX, mapOffsetY)?.setDepth(30);

    if (!bg || !floor || !solids || !deco) {
      throw new Error("Failed to create overworld tilemap layers");
    }

    for (let gx = 0; gx < map.width; gx += 1) {
      for (let gy = 0; gy < map.height; gy += 1) {
        bg.putTileAt(0, gx, gy);
        floor.putTileAt(0, gx, gy);

        // Keep map mostly traversable; border acts as collision solids.
        if (gx === 0 || gy === 0 || gx === map.width - 1 || gy === map.height - 1) {
          solids.putTileAt(0, gx, gy);
        }
      }
    }

    if (solids) addLedgeShadows(this, solids, map);
    solids.setCollisionByExclusion([-1]);

    const npcPos = worldToScreen({ x: 4, y: 9 });
    this.npc = this.add.image(
      this.mapOrigin.x + npcPos.x,
      this.mapOrigin.y + npcPos.y - 20,
      this.firstAvailable(["npc-merchant", "npc-guard", "npc"], "npc"),
    );
    this.npc.setDisplaySize(20, 28);
    this.npc.setDepth(20);
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
    this.portal.setDepth(30);
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
    this.player.setDepth(20);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.physics.add.collider(
      this.player as Phaser.Types.Physics.Arcade.GameObjectWithBody,
      solids,
    );

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
    this.player.x = Math.round(this.player.x);
    this.player.y = Math.round(this.player.y);

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
