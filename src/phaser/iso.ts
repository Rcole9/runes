export interface WorldPoint {
  x: number;
  y: number;
}

export function worldToScreen(world: WorldPoint, tileW = 64, tileH = 32): WorldPoint {
  return {
    x: (world.x - world.y) * (tileW / 2),
    y: (world.x + world.y) * (tileH / 2),
  };
}
