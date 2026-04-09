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
        <div className="item">
          <button onClick={() => gameStore.setClass("tank")}>Tank</button>
          <button onClick={() => gameStore.setClass("healer")}>Healer</button>
          <button onClick={() => gameStore.setClass("dps")}>DPS</button>
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
      </section>

      <section className="overlay-panel">
        <h3>Inventory</h3>
        {state.inventory.length === 0 && <p>No loot yet. Clear a dungeon.</p>}
        {state.inventory.map((item) => (
          <div className="item" key={item.id}>
            <span style={{ color: rarityColor[item.rarity] }}>{item.name}</span>
            <button onClick={() => gameStore.equip(item.id)}>Equip</button>
          </div>
        ))}
      </section>
    </div>
  );
}
