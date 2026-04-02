"use client";

import PhaserGame from "./PhaserGame";
import GameOverlay from "./GameOverlay";

export default function GameShell() {
  return (
    <main className="game-shell">
      <PhaserGame />
      <GameOverlay />
    </main>
  );
}
