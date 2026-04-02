import * as Phaser from "phaser";
import { gameStore } from "@/game/store";
import { dungeonSeedForTier } from "@/game/progression";
import { worldToScreen } from "../iso";

export class OverworldScene extends Phaser.Scene {
  private playerWorld = { x: 6, y: 6 };
  private player!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private portalWorld = { x: 11, y: 8 };
  private hudText!: Phaser.GameObjects.Text;

  constructor() {
    super("OverworldScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#132018");

    const map = this.add.container(this.scale.width * 0.5, 120);
    for (let gx = 0; gx < 14; gx += 1) {
      for (let gy = 0; gy < 14; gy += 1) {
        const p = worldToScreen({ x: gx, y: gy });
        const tile = this.add.image(p.x, p.y, "tile");
        tile.setDepth(p.y);
        map.add(tile);
      }
    }

    const npcPos = worldToScreen({ x: 4, y: 9 });
    const npc = this.add.image(npcPos.x, npcPos.y - 20, "npc");
    npc.setDepth(npcPos.y + 100);
    map.add(npc);

    const portalPos = worldToScreen(this.portalWorld);
    const portal = this.add.image(portalPos.x, portalPos.y - 24, "portal");
    portal.setDepth(portalPos.y + 120);
    map.add(portal);

    const start = worldToScreen(this.playerWorld);
    this.player = this.add.image(start.x, start.y - 14, "player");
    this.player.setDepth(start.y + 90);
    map.add(this.player);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(180, 120);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,F") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.hudText = this.add
      .text(16, 16, "WASD move | F enter portal | E near NPC", {
        color: "#e8ffea",
        fontSize: "14px",
      })
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
    this.player.setPosition(pos.x, pos.y - 14);
    this.player.setDepth(pos.y + 90);

    const portalDist = Phaser.Math.Distance.Between(
      this.playerWorld.x,
      this.playerWorld.y,
      this.portalWorld.x,
      this.portalWorld.y,
    );

    if (portalDist < 1.5) {
      this.hudText.setText("Press F to enter the dungeon instance");
      if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
        gameStore.resetHp();
        const tier = gameStore.getState().dungeonTier;
        this.scene.start("DungeonScene", {
          seed: dungeonSeedForTier(tier),
          difficulty: tier,
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
