"use client";

import { useSyncExternalStore } from "react";
import { gameStore } from "@/game/store";
import type { Rarity } from "@/game/types";

const rarityColor: Record<Rarity, string> = {
  Common: "var(--common)",
  Uncommon: "var(--uncommon)",
  Rare: "var(--rare)",
  Epic: "var(--epic)",
  Legendary: "var(--legendary)",
};

export default function GameOverlay() {
  const state = useSyncExternalStore(gameStore.subscribe, gameStore.getState, gameStore.getState);
  const hpPercent = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));

  return (
    <div className="overlay">
      <section className="overlay-panel">
        <h3>Adventurer</h3>
        <div className="overlay-row">
          <span>Class</span>
          <strong>{state.classLabel}</strong>
        </div>
        <div className="item class-buttons">
          <button
            className={state.classId === "tank" ? "active" : undefined}
            aria-pressed={state.classId === "tank"}
            onClick={() => gameStore.setClass("tank")}
          >
            Tank
          </button>
          <button
            className={state.classId === "healer" ? "active" : undefined}
            aria-pressed={state.classId === "healer"}
            onClick={() => gameStore.setClass("healer")}
          >
            Healer
          </button>
          <button
            className={state.classId === "dps" ? "active" : undefined}
            aria-pressed={state.classId === "dps"}
            onClick={() => gameStore.setClass("dps")}
          >
            DPS
          </button>
        </div>
        <p className="toast">Choosing a class equips starter weapon and armor.</p>
        <div className="overlay-row">
          <span>Level</span>
          <strong>{state.level}</strong>
        </div>
        <div className="overlay-row">
          <span>Tier</span>
          <strong>{state.dungeonTier}</strong>
        </div>
        <div className="overlay-row">
          <span>Power</span>
          <strong>{state.powerLevel}</strong>
        </div>
        <div className="overlay-row">
          <span>HP</span>
          <strong>
            {state.hp}/{state.maxHp}
          </strong>
        </div>
        <div className="overlay-row">
          <span>Health Potions</span>
          <strong>{state.potions}</strong>
        </div>
        <div className="item">
          <button
            onClick={() => gameStore.usePotion()}
            disabled={state.potions <= 0 || state.hp >= state.maxHp}
          >
            Use Potion
          </button>
        </div>
        <div className="hp-wrap">
          <div className="hp-bar" style={{ width: `${hpPercent}%` }} />
        </div>

        <h3>Equipment</h3>
        <div className="item">
          <span>
            Weapon: {state.equipment.weapon ? state.equipment.weapon.name : "None"}
          </span>
          <button onClick={() => gameStore.unequip("weapon")}>Unequip</button>
        </div>
        <div className="item">
          <span>Armor: {state.equipment.armor ? state.equipment.armor.name : "None"}</span>
          <button onClick={() => gameStore.unequip("armor")}>Unequip</button>
        </div>

        {state.latestLoot && (
          <div className="toast" style={{ color: rarityColor[state.latestLoot.rarity] }}>
            Latest loot: {state.latestLoot.name}
          </div>
        )}

        <h3>Inventory</h3>
        <div className="inventory-list">
          {state.inventory.length === 0 && <p>No loot yet. Clear a dungeon.</p>}
          {state.inventory.map((item) => (
            <div className="item" key={item.id}>
              <span style={{ color: rarityColor[item.rarity] }}>{item.name}</span>
              <button onClick={() => gameStore.equip(item.id)}>Equip</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
