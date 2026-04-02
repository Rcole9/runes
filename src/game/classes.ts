import { PlayerClassId, Stats } from "./types";

export const BASE_CLASS_STATS: Record<PlayerClassId, Stats> = {
  tank: {
    maxHp: 180,
    attack: 18,
    defense: 14,
    healingPower: 4,
  },
  healer: {
    maxHp: 125,
    attack: 13,
    defense: 8,
    healingPower: 16,
  },
  dps: {
    maxHp: 140,
    attack: 24,
    defense: 9,
    healingPower: 6,
  },
};

export function getClassLabel(classId: PlayerClassId): string {
  if (classId === "tank") return "Tank";
  if (classId === "healer") return "Healer";
  return "DPS";
}
