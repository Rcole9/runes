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

export function generateLoot(rng: SeededRng, difficulty: number): Item {
  const rarity = chooseRarity(rng, difficulty > 4 ? 2 : 0);
  const slot = randomSlot(rng);
  const tier = rarityPower(rarity);
  const base = 7 + difficulty * 2;

  const statMods =
    slot === "weapon"
      ? {
          attack: Math.round(base * tier),
          healingPower: Math.round(base * 0.3 * tier),
        }
      : {
          maxHp: Math.round(base * 7 * tier),
          defense: Math.round(base * 0.65 * tier),
        };

  return {
    id: `${slot}-${rarity}-${Math.floor(rng() * 100000)}`,
    name: `${rarity} ${slot === "weapon" ? "Voidblade" : "Aegis Vest"}`,
    slot,
    rarity,
    statMods,
    powerScore: Math.round(base * 10 * tier),
  };
}
