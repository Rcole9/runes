export type PlayerClassId = "tank" | "healer" | "dps";
export type DungeonLevel = "easy" | "medium" | "hard";

export interface Stats {
  maxHp: number;
  attack: number;
  defense: number;
  healingPower: number;
}

export type Slot = "weapon" | "armor";

export type Rarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary";

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  statMods: Partial<Stats>;
  powerScore: number;
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
}

export interface PlayerProgress {
  classId: PlayerClassId;
  level: number;
  dungeonTier: number;
  powerLevel: number;
  potions: number;
  dungeonLevel: DungeonLevel;
}

export interface SaveData {
  progress: PlayerProgress;
  inventory: Item[];
  equipment: Equipment;
}
