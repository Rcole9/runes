import Phaser from "phaser";

export type CollectibleKind = "potion" | "loot" | "powerup";

export type CollectibleSpec = {
  kind: CollectibleKind;
  x: number;
  y: number;
  texture: string;   // must be loaded in preload()
  frame?: string | number;
  scale?: number;
  value?: number;    // e.g. potion count
};

export function spawnCollectibles(
  scene: Phaser.Scene,
  specs: CollectibleSpec[]
): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();

  for (const spec of specs) {
    const item = group.create(spec.x, spec.y, spec.texture, spec.frame) as Phaser.Physics.Arcade.Image;

    if (spec.scale) item.setScale(spec.scale);
    item.refreshBody();

    item.setData("kind", spec.kind);
    item.setData("value", spec.value ?? 1);

    // small bob so pickups read clearly
    scene.tweens.add({
      targets: item,
      y: spec.y - 4,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  return group;
}

export type AutoPickupHandlers = {
  onPotion: (amount: number) => void;
  onLoot: () => void;
  onPowerup?: () => void;
};

export function wireAutoPickup(
  scene: Phaser.Scene,
  player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  group: Phaser.Physics.Arcade.StaticGroup,
  handlers: AutoPickupHandlers
): void {
  scene.physics.add.overlap(player, group, (_p, obj) => {
    const item = obj as Phaser.Physics.Arcade.Image;
    if (!item?.active) return;

    const kind = item.getData("kind") as CollectibleKind;
    const value = Number(item.getData("value") ?? 1);

    // pickup VFX (tiny flash) then disable — disableBody is safe inside an
    // overlap callback; destroy() can corrupt the static group mid-frame.
    scene.tweens.add({
      targets: item,
      alpha: 0,
      scaleX: (item.scaleX || 1) * 1.2,
      scaleY: (item.scaleY || 1) * 1.2,
      duration: 120,
      onComplete: () => item.disableBody(true, true),
    });

    if (kind === "potion") handlers.onPotion(value);
    if (kind === "loot") handlers.onLoot();
    if (kind === "powerup" && handlers.onPowerup) handlers.onPowerup();
  });
}
