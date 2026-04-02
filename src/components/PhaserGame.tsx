"use client";

import { useEffect } from "react";
import type * as Phaser from "phaser";
import { initializeStore } from "@/game/store";

export default function PhaserGame() {
  useEffect(() => {
    let destroyed = false;
    let gameRef: Phaser.Game | null = null;

    initializeStore();

    import("@/phaser/config").then(({ createPhaserGame }) => {
      if (destroyed) return;
      gameRef = createPhaserGame("phaser-root");
    });

    return () => {
      destroyed = true;
      if (gameRef) {
        gameRef.destroy(true);
      }
    };
  }, []);

  return <div id="phaser-root" className="game-canvas" />;
}
