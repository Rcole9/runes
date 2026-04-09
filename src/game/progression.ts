import { DungeonLevel } from "./types";

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

export function difficultyOffsetForLevel(level: DungeonLevel): number {
  if (level === "easy") return -1;
  if (level === "hard") return 2;
  return 0;
}

export function dungeonSeedForLevel(tier: number, level: DungeonLevel): string {
  return `dungeon-tier-${tier}-${level}`;
}

export function dungeonLevelLabel(level: DungeonLevel): string {
  if (level === "easy") return "Easy";
  if (level === "hard") return "Hard";
  return "Medium";
}
