import { getClassLabel, getStarterArmor, getStarterWeapon } from "./classes";
import { addToInventory, equipItem, unequipSlot } from "./inventory";
import { generateLoot } from "./loot";
import { loadGame, saveGame } from "./persistence";
import { nextDungeonTier, nextLevel } from "./progression";
import { hashSeed, mulberry32 } from "./rng";
import { computePowerLevel, derivePlayerStats } from "./stats";
import { DungeonLevel, Equipment, Item, PlayerClassId, SaveData } from "./types";

export interface RuntimeState {
  classId: PlayerClassId;
  classLabel: string;
  level: number;
  dungeonTier: number;
  dungeonLevel: DungeonLevel;
  hp: number;
  maxHp: number;
  powerLevel: number;
  potions: number;
  equipment: Equipment;
  inventory: Item[];
  latestLoot: Item | null;
}

const listeners = new Set<() => void>();
const DEFAULT_STARTER_POTIONS = 3;

let state: RuntimeState = {
  classId: "dps",
  classLabel: "DPS",
  level: 1,
  dungeonTier: 1,
  dungeonLevel: "medium",
  hp: 140,
  maxHp: 140,
  powerLevel: 0,
  potions: DEFAULT_STARTER_POTIONS,
  equipment: {
    weapon: null,
    armor: null,
  },
  inventory: [],
  latestLoot: null,
};

function ensureInventoryHasItem(inventory: Item[], item: Item): Item[] {
  if (inventory.some((existing) => existing.id === item.id)) return inventory;
  return addToInventory(inventory, item);
}

function recalcState(): void {
  const stats = derivePlayerStats(state.classId, state.level, state.equipment);
  state.maxHp = stats.maxHp;
  state.hp = Math.min(state.hp, stats.maxHp);
  state.powerLevel = computePowerLevel(stats, state.level);
  state.classLabel = getClassLabel(state.classId);
}

function persist(): void {
  const save: SaveData = {
    progress: {
      classId: state.classId,
      level: state.level,
      dungeonTier: state.dungeonTier,
      dungeonLevel: state.dungeonLevel,
      powerLevel: state.powerLevel,
      potions: state.potions,
    },
    inventory: state.inventory,
    equipment: state.equipment,
  };
  saveGame(save);
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function commit(mutator: () => void): void {
  mutator();
  recalcState();
  state = {
    ...state,
    equipment: { ...state.equipment },
    inventory: [...state.inventory],
  };
  persist();
  emit();
}

export function initializeStore(): void {
  const loaded = loadGame();
  if (loaded) {
    state = {
      ...state,
      classId: loaded.progress.classId,
      level: loaded.progress.level,
      dungeonTier: loaded.progress.dungeonTier,
      dungeonLevel: loaded.progress.dungeonLevel ?? "medium",
      potions: loaded.progress.potions ?? DEFAULT_STARTER_POTIONS,
      equipment: loaded.equipment,
      inventory: loaded.inventory,
      hp: 9999,
      latestLoot: null,
      classLabel: "DPS",
      powerLevel: loaded.progress.powerLevel,
      maxHp: 140,
    };
  }

  const starterWeapon = getStarterWeapon(state.classId);
  const starterArmor = getStarterArmor(state.classId);
  state.inventory = ensureInventoryHasItem(state.inventory, starterWeapon);
  state.inventory = ensureInventoryHasItem(state.inventory, starterArmor);
  if (!state.equipment.weapon) {
    state.equipment = {
      ...state.equipment,
      weapon: starterWeapon,
    };
  }
  if (!state.equipment.armor) {
    state.equipment = {
      ...state.equipment,
      armor: starterArmor,
    };
  }

  recalcState();
  state.hp = state.maxHp;
  state = {
    ...state,
    equipment: { ...state.equipment },
    inventory: [...state.inventory],
  };
  persist();
  emit();
}

export const gameStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): RuntimeState {
    return state;
  },
  setClass(classId: PlayerClassId): void {
    commit(() => {
      state.classId = classId;
      const starterWeapon = getStarterWeapon(classId);
      const starterArmor = getStarterArmor(classId);
      state.inventory = ensureInventoryHasItem(state.inventory, starterWeapon);
      state.inventory = ensureInventoryHasItem(state.inventory, starterArmor);
      state.equipment = {
        ...state.equipment,
        weapon: starterWeapon,
        armor: starterArmor,
      };
      state.hp = state.maxHp;
    });
  },
  setDungeonLevel(level: DungeonLevel): void {
    commit(() => {
      state.dungeonLevel = level;
    });
  },
  takeDamage(amount: number): void {
    commit(() => {
      state.hp = Math.max(0, state.hp - amount);
    });
  },
  heal(amount: number): void {
    commit(() => {
      state.hp = Math.min(state.maxHp, state.hp + amount);
    });
  },
  completeDungeonAndGrantLoot(seed: string): Item {
    let dropped: Item;
    commit(() => {
      const rng = mulberry32(hashSeed(seed));
      dropped = generateLoot(rng, state.dungeonTier);
      state.inventory = addToInventory(state.inventory, dropped);
      state.latestLoot = dropped;
      state.dungeonTier = nextDungeonTier(state.dungeonTier);
      state.level = nextLevel(state.level, state.dungeonTier);
    });
    return dropped!;
  },
  usePotion(): void {
    commit(() => {
      if (state.potions <= 0) return;
      if (state.hp >= state.maxHp) return;
      state.potions -= 1;
      state.hp = Math.min(state.maxHp, state.hp + Math.round(state.maxHp * 0.35));
    });
  },
  addPotions(amount: number): void {
    commit(() => {
      state.potions = Math.max(0, state.potions + amount);
    });
  },
  refillPotions(): void {
    commit(() => {
      state.potions = DEFAULT_STARTER_POTIONS;
    });
  },
  grantLoot(item: Item): void {
    commit(() => {
      state.inventory = addToInventory(state.inventory, item);
      state.latestLoot = item;
    });
  },
  equip(itemId: string): void {
    commit(() => {
      const item = state.inventory.find((i) => i.id === itemId);
      if (!item) return;
      state.equipment = equipItem(state.equipment, item);
    });
  },
  unequip(slot: "weapon" | "armor"): void {
    commit(() => {
      state.equipment = unequipSlot(state.equipment, slot);
    });
  },
  resetHp(): void {
    commit(() => {
      state.hp = state.maxHp;
    });
  },
};
