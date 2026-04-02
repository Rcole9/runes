import { Equipment, Item } from "./types";

export function equipItem(equipment: Equipment, item: Item): Equipment {
  if (item.slot === "weapon") {
    return { ...equipment, weapon: item };
  }
  return { ...equipment, armor: item };
}

export function unequipSlot(equipment: Equipment, slot: "weapon" | "armor"): Equipment {
  if (slot === "weapon") return { ...equipment, weapon: null };
  return { ...equipment, armor: null };
}

export function addToInventory(inventory: Item[], item: Item): Item[] {
  return [item, ...inventory].slice(0, 24);
}
