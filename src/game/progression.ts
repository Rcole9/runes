export function nextDungeonTier(currentTier: number): number {
  return Math.min(currentTier + 1, 50);
}

export function nextLevel(currentLevel: number, dungeonTier: number): number {
  if (dungeonTier % 2 === 0) return currentLevel + 1;
  return currentLevel;
}

export function dungeonSeedForTier(tier: number): string {
  return `dungeon-tier-${tier}`;
}
