import { SaveData } from "./types";

const STORAGE_KEY = "runes-of-the-void-save";

export function saveGame(data: SaveData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadGame(): SaveData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}
