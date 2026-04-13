import Phaser from "phaser";

type OneWaySpec = {
  x: number;       // center
  y: number;       // top surface y
  w: number;       // width in px
  thickness?: number; // collision thickness in px (default 12)
};

/**
 * Arcade one-way platforms:
 * - You can jump up through them
 * - You land when falling onto the top
 *
 * Implementation: static bodies + collider callback that only enables collision
 * when the player is falling and is above the platform.
 */
export function createOneWayGroup(scene: Phaser.Scene) {
  return scene.physics.add.staticGroup();
}

export function addOneWayPlatform(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  spec: OneWaySpec,
  texture = "ground"
) {
  const t = spec.thickness ?? 12;

  // static physics body (we hide sprite; visuals can be separate if you want)
  const p = group.create(spec.x, spec.y + t / 2, texture) as Phaser.Physics.Arcade.Image;
  p.setDisplaySize(spec.w, t).refreshBody();
  p.setAlpha(0);

  // store top surface y (for collision checks)
  p.setData("topY", spec.y);

  return p;
}

export function addOneWayCollider(
  scene: Phaser.Scene,
  player: Phaser.Physics.Arcade.Sprite,
  group: Phaser.Physics.Arcade.StaticGroup
) {
  scene.physics.add.collider(player, group, undefined, (_player, platform) => {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const p = platform as Phaser.Physics.Arcade.Image;
    const topY = Number(p.getData("topY"));

    // Only collide when falling
    if (body.velocity.y < 0) return false;

    // Only collide if player was above the platform top (with a small tolerance)
    // This prevents "side snagging"
    const playerBottom = body.y + body.height;
    return playerBottom <= topY + 6;
  });
}
