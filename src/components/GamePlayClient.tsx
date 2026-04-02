"use client";

import dynamic from "next/dynamic";

const GameShell = dynamic(() => import("./GameShell"), {
  ssr: false,
  loading: () => <div className="loading">Summoning the void...</div>,
});

export default function GamePlayClient() {
  return <GameShell />;
}
