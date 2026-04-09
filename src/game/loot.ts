import { Item, Rarity, Slot } from "./types";
import { SeededRng } from "./rng";

const RARITIES: Array<{ rarity: Rarity; weight: number; power: number }> = [
  { rarity: "Common", weight: 45, power: 1 },
  { rarity: "Uncommon", weight: 28, power: 1.2 },
  { rarity: "Rare", weight: 16, power: 1.45 },
  { rarity: "Epic", weight: 8, power: 1.75 },
  { rarity: "Legendary", weight: 3, power: 2.2 },
];

function chooseRarity(rng: SeededRng, luck: number): Rarity {
  const total = RARITIES.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng() * total;

  for (const entry of RARITIES) {
    const adjusted = entry.weight + luck;
    roll -= adjusted;
    if (roll <= 0) return entry.rarity;
  }
  return "Common";
}

function rarityPower(rarity: Rarity): number {
  return RARITIES.find((r) => r.rarity === rarity)?.power ?? 1;
}

function randomSlot(rng: SeededRng): Slot {
  return rng() > 0.5 ? "weapon" : "armor";
}

const WEAPON_BASES = [
  "Voidblade",
  "Runespear",
  "Warden Mace",
  "Sunshot Bow",
  "Storm Dagger",
  "Lifebloom Staff",
];

const ARMOR_BASES = [
  "Aegis Vest",
  "Warden Plate",
  "Mistweave Robe",
  "Shadow Jerkin",
  "Bastion Mail",
  "Runecloak",
];

const NAME_PREFIXES = [
  "Ancient",
  "Forged",
  "Astral",
  "Dire",
  "Blessed",
  "Umbral",
  "Searing",
];

function randomFrom<T>(rng: SeededRng, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function generateLoot(rng: SeededRng, difficulty: number): Item {
  const rarity = chooseRarity(rng, difficulty > 4 ? 2 : 0);
  const slot = randomSlot(rng);
  const tier = rarityPower(rarity);
  const base = 7 + difficulty * 2;

  const roll = rng();
  const statMods =
    slot === "weapon"
      ? roll < 0.34
        ? {
            attack: Math.round(base * 1.1 * tier),
            defense: Math.round(base * 0.22 * tier),
          }
        : roll < 0.67
          ? {
              attack: Math.round(base * 0.95 * tier),
              healingPower: Math.round(base * 0.45 * tier),
            }
          : {
              attack: Math.round(base * 1.25 * tier),
            }
      : roll < 0.34
        ? {
            maxHp: Math.round(base * 8.5 * tier),
            defense: Math.round(base * 0.55 * tier),
          }
        : roll < 0.67
          ? {
              maxHp: Math.round(base * 6.5 * tier),
              defense: Math.round(base * 0.9 * tier),
            }
          : {
              maxHp: Math.round(base * 5.5 * tier),
              healingPower: Math.round(base * 0.5 * tier),
            };

  const prefix = randomFrom(rng, NAME_PREFIXES);
  const baseName =
    slot === "weapon" ? randomFrom(rng, WEAPON_BASES) : randomFrom(rng, ARMOR_BASES);

  return {
    id: `${slot}-${rarity}-${Math.floor(rng() * 100000)}`,
    name: `${rarity} ${prefix} ${baseName}`,
    slot,
    rarity,
    statMods,
    powerScore: Math.round(base * 10 * tier),
  };
}
