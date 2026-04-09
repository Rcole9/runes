import { Item, PlayerClassId, Stats } from "./types";

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

const STARTER_WEAPONS: Record<PlayerClassId, Item> = {
  tank: {
    id: "starter-weapon-tank",
    name: "Common Bulwark Mace",
    slot: "weapon",
    rarity: "Common",
    statMods: {
      attack: 4,
      defense: 3,
    },
    powerScore: 36,
  },
  healer: {
    id: "starter-weapon-healer",
    name: "Common Lifewood Wand",
    slot: "weapon",
    rarity: "Common",
    statMods: {
      attack: 2,
      healingPower: 6,
    },
    powerScore: 34,
  },
  dps: {
    id: "starter-weapon-dps",
    name: "Common Runeshard Blade",
    slot: "weapon",
    rarity: "Common",
    statMods: {
      attack: 7,
      defense: 1,
    },
    powerScore: 38,
  },
};

const STARTER_ARMOR: Record<PlayerClassId, Item> = {
  tank: {
    id: "starter-armor-tank",
    name: "Common Sentinel Plate",
    slot: "armor",
    rarity: "Common",
    statMods: {
      maxHp: 28,
      defense: 4,
    },
    powerScore: 34,
  },
  healer: {
    id: "starter-armor-healer",
    name: "Common Soothing Robe",
    slot: "armor",
    rarity: "Common",
    statMods: {
      maxHp: 20,
      healingPower: 3,
    },
    powerScore: 30,
  },
  dps: {
    id: "starter-armor-dps",
    name: "Common Skirmisher Vest",
    slot: "armor",
    rarity: "Common",
    statMods: {
      maxHp: 16,
      attack: 2,
      defense: 1,
    },
    powerScore: 31,
  },
};

export function getStarterWeapon(classId: PlayerClassId): Item {
  return STARTER_WEAPONS[classId];
}

export function getStarterArmor(classId: PlayerClassId): Item {
  return STARTER_ARMOR[classId];
}

export function getClassLabel(classId: PlayerClassId): string {
  if (classId === "tank") return "Tank";
  if (classId === "healer") return "Healer";
  return "DPS";
}
