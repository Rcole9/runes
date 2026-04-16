import Phaser from "phaser";

export interface PlatformSpec {
  x: number;      // center x
  y: number;      // top surface y
  w: number;      // width in px
  h?: number;     // height in px (default 24)
  faceH?: number; // reserved for visual face stripe height (future use)
}

export interface PlatformOptions {
  /** Texture key for the surface tile. If omitted, draws with Graphics. */
  top?: string;
  crop?: { x: number; y: number; w: number; h: number };
  /**
   * When true the platform is added to kit.oneWay instead of kit.solids.
   * Players can jump up through it; they only land when falling from above.
   * Call wireOneWay(scene, player, kit) once after the player is created.
   */
  oneWay?: boolean;
}

export interface PlatformKit {
  solids: Phaser.Physics.Arcade.StaticGroup;
  oneWay: Phaser.Physics.Arcade.StaticGroup;
}

const FACE  = 0x586476;
const EDGE  = 0x3d4652;
const SHINE = 0x6e7e92;

export function createPlatformKit(scene: Phaser.Scene): PlatformKit {
  return {
    solids: scene.physics.add.staticGroup(),
    oneWay: scene.physics.add.staticGroup(),
  };
}

export function addPlatform(
  scene: Phaser.Scene,
  kit: PlatformKit,
  spec: PlatformSpec,
  options: PlatformOptions = {}
) {
  const h   = spec.h ?? 24;
  const lx  = spec.x - spec.w / 2;
  const group = options.oneWay ? kit.oneWay : kit.solids;

  // ── invisible physics body ────────────────────────────────────────────────
  const body = group.create(spec.x, spec.y + h / 2, "ground") as Phaser.Physics.Arcade.Image;
  body.setDisplaySize(spec.w, h).setAlpha(0).refreshBody();

  if (options.oneWay) {
    body.setData("topY", spec.y);
  }

  // ── visual ────────────────────────────────────────────────────────────────
  if (options.top) {
    // Use the log platform art from props1.png
    const crop = options.crop || { x: 176, y: 32, w: 160, h: 88 };
    scene.add
      .image(lx, spec.y, options.top)
      .setOrigin(0, 0)
      .setCrop(crop.x, crop.y, crop.w, crop.h)
      .setDisplaySize(spec.w, h)
      .setDepth(5)
      .setAlpha(1);
  } else {
    const g = scene.add.graphics().setDepth(10);
    g.fillStyle(SHINE, 0.55); g.fillRect(lx, spec.y, spec.w, 3);
    g.fillStyle(FACE,  1);    g.fillRect(lx, spec.y + 3, spec.w, h - 6);
    g.fillStyle(EDGE,  1);    g.fillRect(lx, spec.y + h - 3, spec.w, 3);
    g.fillStyle(EDGE,  0.7);
    g.fillRect(lx,              spec.y + 3, 2, h - 6);
    g.fillRect(lx + spec.w - 2, spec.y + 3, 2, h - 6);
    g.lineStyle(1, EDGE, 0.45);
    for (let bx = lx + 32; bx < lx + spec.w - 4; bx += 32) {
      g.lineBetween(bx, spec.y + 3, bx, spec.y + h - 4);
    }
  }

  return body;
}

/**
 * wireOneWay
 * Registers the one-way collider between the player and kit.oneWay.
 * Call this once after the player sprite is created.
 */
export function wireOneWay(
  scene: Phaser.Scene,
  player: Phaser.Physics.Arcade.Sprite,
  kit: PlatformKit
) {
  scene.physics.add.collider(player, kit.oneWay, undefined, (_player, platform) => {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const p = platform as Phaser.Physics.Arcade.Image;
    const topY = Number(p.getData("topY"));

    // Only collide when falling
    if (body.velocity.y < 0) return false;

    // Only collide if the player's feet are at or above the surface (±6 px tolerance)
    const playerBottom = body.y + body.height;
    return playerBottom <= topY + 6;
  });
}
