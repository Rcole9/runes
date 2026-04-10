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
  const hpTier = hpPercent <= 30 ? "low" : hpPercent <= 65 ? "mid" : "high";

  return (
    <div className="overlay">
      <section className="overlay-panel">
        <h3 className="overlay-title title-with-icon">
          <span className="ui-icon icon-crown" aria-hidden="true" />
          Adventurer
        </h3>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-flag" aria-hidden="true" />
            Class
          </span>
          <strong className="overlay-row-value">{state.classLabel}</strong>
        </div>
        <div className="item class-buttons">
          <button
            className={`overlay-btn ${state.classId === "tank" ? "active" : ""}`}
            aria-pressed={state.classId === "tank"}
            onClick={() => gameStore.setClass("tank")}
          >
            Tank
          </button>
          <button
            className={`overlay-btn ${state.classId === "healer" ? "active" : ""}`}
            aria-pressed={state.classId === "healer"}
            onClick={() => gameStore.setClass("healer")}
          >
            Healer
          </button>
          <button
            className={`overlay-btn ${state.classId === "dps" ? "active" : ""}`}
            aria-pressed={state.classId === "dps"}
            onClick={() => gameStore.setClass("dps")}
          >
            DPS
          </button>
        </div>
        <p className="toast">Choosing a class equips starter weapon and armor.</p>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-trophy" aria-hidden="true" />
            Level
          </span>
          <strong className="overlay-row-value">{state.level}</strong>
        </div>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-star" aria-hidden="true" />
            Tier
          </span>
          <strong className="overlay-row-value">{state.dungeonTier}</strong>
        </div>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-map" aria-hidden="true" />
            Dungeon Level
          </span>
          <strong className="overlay-row-value">{state.dungeonLevel}</strong>
        </div>
        <div className="item class-buttons">
          <button
            className={`overlay-btn ${state.dungeonLevel === "easy" ? "active" : ""}`}
            aria-pressed={state.dungeonLevel === "easy"}
            onClick={() => gameStore.setDungeonLevel("easy")}
          >
            Easy
          </button>
          <button
            className={`overlay-btn ${state.dungeonLevel === "medium" ? "active" : ""}`}
            aria-pressed={state.dungeonLevel === "medium"}
            onClick={() => gameStore.setDungeonLevel("medium")}
          >
            Medium
          </button>
          <button
            className={`overlay-btn ${state.dungeonLevel === "hard" ? "active" : ""}`}
            aria-pressed={state.dungeonLevel === "hard"}
            onClick={() => gameStore.setDungeonLevel("hard")}
          >
            Hard
          </button>
        </div>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-sword" aria-hidden="true" />
            Power
          </span>
          <strong className="overlay-row-value">{state.powerLevel}</strong>
        </div>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-heart" aria-hidden="true" />
            HP
          </span>
          <strong className="overlay-row-value">
            {state.hp}/{state.maxHp}
          </strong>
        </div>
        <div className="overlay-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-gem" aria-hidden="true" />
            Health Potions
          </span>
          <strong className="overlay-row-value">{state.potions}</strong>
        </div>
        <div className="item">
          <button
            className="overlay-btn"
            onClick={() => gameStore.usePotion()}
            disabled={state.potions <= 0 || state.hp >= state.maxHp}
          >
            Use Potion
          </button>
        </div>
        <div className="hp-wrap hp-wrap-skin">
          <div className={`hp-bar hp-${hpTier}`} style={{ width: `${hpPercent}%` }} />
        </div>

        <h3 className="overlay-title title-with-icon">
          <span className="ui-icon icon-shield" aria-hidden="true" />
          Equipment
        </h3>
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

        <h3 className="overlay-title title-with-icon">
          <span className="ui-icon icon-coin" aria-hidden="true" />
          Inventory
        </h3>
        <div className="inventory-list">
          {state.inventory.length === 0 && <p>No loot yet. Clear a dungeon.</p>}
          {state.inventory.map((item) => (
            <div className="item slot-item" key={item.id}>
              <span className="row-label-with-icon" style={{ color: rarityColor[item.rarity] }}>
                <span className="ui-icon icon-gem" aria-hidden="true" />
                {item.name}
              </span>
              <button 
                className="overlay-btn" 
                onClick={() => {
                  console.log("Equip button clicked for item:", item.id, item.name, item.slot);
                  gameStore.equip(item.id);
                  console.log("After equip, equipment:", gameStore.getState().equipment);
                }}
              >
                Equip
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
