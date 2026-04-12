import * as Phaser from "phaser";

export function addLedgeShadows(
  scene: Phaser.Scene,
  solids: Phaser.Tilemaps.TilemapLayer,
  map: Phaser.Tilemaps.Tilemap,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(solids.depth - 1);
  g.fillStyle(0x000000, 0.28);

  solids.forEachTile((t) => {
    if (!t || t.index === -1) return;

    const below = solids.getTileAt(t.x, t.y + 1);
    if (!below || below.index === -1) {
      g.fillRect(t.getLeft(), t.getBottom() - 1, map.tileWidth, 2);
    }
  });

  return g;
}