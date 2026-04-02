import { BASE_CLASS_STATS } from "./classes";
import { Equipment, PlayerClassId, Stats } from "./types";

function addStats(base: Stats, mods: Partial<Stats>): Stats {
  return {
    maxHp: base.maxHp + (mods.maxHp ?? 0),
    attack: base.attack + (mods.attack ?? 0),
    defense: base.defense + (mods.defense ?? 0),
    healingPower: base.healingPower + (mods.healingPower ?? 0),
  };
}

export function derivePlayerStats(
  classId: PlayerClassId,
  level: number,
  equipment: Equipment,
): Stats {
  const classStats = BASE_CLASS_STATS[classId];
  const levelScale = 1 + (level - 1) * 0.08;

  let out: Stats = {
    maxHp: Math.floor(classStats.maxHp * levelScale),
    attack: Math.floor(classStats.attack * levelScale),
    defense: Math.floor(classStats.defense * levelScale),
    healingPower: Math.floor(classStats.healingPower * levelScale),
  };

  if (equipment.weapon) out = addStats(out, equipment.weapon.statMods);
  if (equipment.armor) out = addStats(out, equipment.armor.statMods);
  return out;
}

export function computePowerLevel(stats: Stats, level: number): number {
  const weighted =
    stats.maxHp * 0.24 +
    stats.attack * 2.7 +
    stats.defense * 2.1 +
    stats.healingPower * 1.8;
  return Math.round(weighted + level * 9);
}

export function enemyScaleFromDifficulty(difficulty: number, powerLevel: number) {
  const scalar = 1 + difficulty * 0.15 + powerLevel / 1400;
  return {
    hp: Math.round(40 * scalar),
    attack: Math.round(8 * scalar),
    defense: Math.round(3 * scalar),
  };
}
