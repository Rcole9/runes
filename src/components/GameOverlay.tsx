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
    <div className="overlay overlay-hud">
      <section className="overlay-panel hud-panel hud-top-left hud-minimal">
        <div className="hud-mini-head">
          <span className="row-label-with-icon">
            <span className="ui-icon icon-crown" aria-hidden="true" />
            {state.classLabel}
          </span>
          <span className="hud-mini-level">Lv {state.level}</span>
        </div>

        <div className="overlay-row hud-health-row">
          <span className="overlay-row-label row-label-with-icon">
            <span className="ui-icon icon-heart" aria-hidden="true" />
            HP
          </span>
          <strong className="overlay-row-value">{state.hp}/{state.maxHp}</strong>
        </div>
        <div className="hp-wrap hp-wrap-skin hud-mini-hp">
          <div className={`hp-bar hp-${hpTier}`} style={{ width: `${hpPercent}%` }} />
        </div>

        <div className="item compact-actions class-buttons hud-class-buttons">
          <button
            className={`overlay-btn ${state.classId === "tank" ? "active" : ""}`}
            onClick={() => gameStore.setClass("tank")}
            aria-pressed={state.classId === "tank"}
          >
            Tank
          </button>
          <button
            className={`overlay-btn ${state.classId === "healer" ? "active" : ""}`}
            onClick={() => gameStore.setClass("healer")}
            aria-pressed={state.classId === "healer"}
          >
            Healer
          </button>
          <button
            className={`overlay-btn ${state.classId === "dps" ? "active" : ""}`}
            onClick={() => gameStore.setClass("dps")}
            aria-pressed={state.classId === "dps"}
          >
            DPS
          </button>
        </div>
      </section>

      <button
        className="hud-fab hud-potion"
        onClick={() => gameStore.usePotion()}
        disabled={state.potions <= 0 || state.hp >= state.maxHp}
        aria-label="Use potion"
      >
        <span className="ui-icon icon-heart" aria-hidden="true" />
        <span className="fab-label">Potion</span>
        <span className="fab-count">{state.potions}</span>
      </button>

      <button
        className="hud-fab hud-bag"
        onClick={() => setInventoryOpen((open) => !open)}
        aria-expanded={inventoryOpen}
        aria-label="Toggle inventory"
      >
        <span className="ui-icon icon-bag" aria-hidden="true" />
        <span className="fab-label">Bag</span>
        <span className="fab-count">{state.inventory.length}</span>
      </button>

      {inventoryOpen && (
        <section className="overlay-panel hud-panel hud-inventory clean-panel">
          <div className="overlay-head">
            <h3 className="overlay-title title-with-icon">
              <span className="ui-icon icon-coin" aria-hidden="true" />
              Inventory
            </h3>
            <button className="overlay-btn" onClick={() => setInventoryOpen(false)}>Close</button>
          </div>

          <div className="overlay-row">
            <span className="overlay-row-label row-label-with-icon">
              <span className="ui-icon icon-map" aria-hidden="true" />
              Dungeon
            </span>
            <strong className="overlay-row-value">{state.dungeonLevel}</strong>
          </div>
          <div className="item compact-actions class-buttons">
            <button className={`overlay-btn ${state.dungeonLevel === "easy" ? "active" : ""}`} onClick={() => gameStore.setDungeonLevel("easy")} aria-pressed={state.dungeonLevel === "easy"}>Easy</button>
            <button className={`overlay-btn ${state.dungeonLevel === "medium" ? "active" : ""}`} onClick={() => gameStore.setDungeonLevel("medium")} aria-pressed={state.dungeonLevel === "medium"}>Medium</button>
            <button className={`overlay-btn ${state.dungeonLevel === "hard" ? "active" : ""}`} onClick={() => gameStore.setDungeonLevel("hard")} aria-pressed={state.dungeonLevel === "hard"}>Hard</button>
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

          <div className="inventory-drawer">
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
        </section>
      )}
    </div>
  );
}
