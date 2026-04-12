"use client";

import { useState, useSyncExternalStore } from "react";
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
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const state = useSyncExternalStore(gameStore.subscribe, gameStore.getState, gameStore.getState);
  const hpPercent = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
  const hpTier = hpPercent <= 30 ? "low" : hpPercent <= 65 ? "mid" : "high";

  return (
    <div className="overlay">
      <section className="overlay-panel clean-panel">
        <div className="overlay-head">
          <div>
            <h3 className="overlay-title title-with-icon">
              <span className="ui-icon icon-crown" aria-hidden="true" />
              Adventurer
            </h3>
            <p className="overlay-subline">
              {state.classLabel} • Lv {state.level} • Tier {state.dungeonTier}
            </p>
          </div>
          <button
            className="overlay-btn bag-toggle"
            onClick={() => setInventoryOpen((open) => !open)}
            aria-expanded={inventoryOpen}
          >
            <span className="ui-icon icon-bag" aria-hidden="true" />
            Bag ({state.inventory.length})
          </button>
        </div>

        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-heart" aria-hidden="true" />
            HP
          </span>
          <strong className="overlay-row-value">{state.hp}/{state.maxHp}</strong>
        </div>
        <div className="hp-wrap hp-wrap-skin">
          <div className={`hp-bar hp-${hpTier}`} style={{ width: `${hpPercent}%` }} />
        </div>

        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-gem" aria-hidden="true" />
            Potions
          </span>
          <strong className="overlay-row-value">{state.potions}</strong>
        </div>
        <div className="item compact-actions">
          <button
            className="overlay-btn"
            onClick={() => gameStore.usePotion()}
            disabled={state.potions <= 0 || state.hp >= state.maxHp}
          >
            Use Potion
          </button>
          <button className="overlay-btn" onClick={() => gameStore.setClass("tank")} aria-pressed={state.classId === "tank"}>Tank</button>
          <button className="overlay-btn" onClick={() => gameStore.setClass("healer")} aria-pressed={state.classId === "healer"}>Healer</button>
          <button className="overlay-btn" onClick={() => gameStore.setClass("dps")} aria-pressed={state.classId === "dps"}>DPS</button>
        </div>

        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-map" aria-hidden="true" />
            Dungeon
          </span>
          <strong className="overlay-row-value">{state.dungeonLevel}</strong>
        </div>
        <div className="item compact-actions">
          <button className="overlay-btn" onClick={() => gameStore.setDungeonLevel("easy")} aria-pressed={state.dungeonLevel === "easy"}>Easy</button>
          <button className="overlay-btn" onClick={() => gameStore.setDungeonLevel("medium")} aria-pressed={state.dungeonLevel === "medium"}>Medium</button>
          <button className="overlay-btn" onClick={() => gameStore.setDungeonLevel("hard")} aria-pressed={state.dungeonLevel === "hard"}>Hard</button>
        </div>

        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-sword" aria-hidden="true" />
            Power
          </span>
          <strong className="overlay-row-value">{state.powerLevel}</strong>
        </div>

        <div className="item slot-item">
          <span className="row-label-with-icon">
            <span className="ui-icon icon-sword" aria-hidden="true" />
            Weapon: {state.equipment.weapon ? state.equipment.weapon.name : "None"}
          </span>
          <button className="overlay-btn" onClick={() => gameStore.unequip("weapon")}>Unequip</button>
        </div>
        <div className="item slot-item">
          <span className="row-label-with-icon">
            <span className="ui-icon icon-shield" aria-hidden="true" />
            Armor: {state.equipment.armor ? state.equipment.armor.name : "None"}
          </span>
          <button className="overlay-btn" onClick={() => gameStore.unequip("armor")}>Unequip</button>
        </div>

        {state.latestLoot && (
          <div className="toast toast-banner" style={{ color: rarityColor[state.latestLoot.rarity] }}>
            Latest loot: {state.latestLoot.name}
          </div>
        )}

        {inventoryOpen && (
          <div className="inventory-drawer">
            <h3 className="overlay-title title-with-icon">
              <span className="ui-icon icon-coin" aria-hidden="true" />
              Inventory
            </h3>
            <div className="inventory-list">
              {state.inventory.length === 0 && <p>No loot yet. Clear an area.</p>}
              {state.inventory.map((item) => (
                <div className="item slot-item" key={item.id}>
                  <span className="row-label-with-icon" style={{ color: rarityColor[item.rarity] }}>
                    <span className="ui-icon icon-gem" aria-hidden="true" />
                    {item.name}
                  </span>
                  <button className="overlay-btn" onClick={() => gameStore.equip(item.id)}>Equip</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
