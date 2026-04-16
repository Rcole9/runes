"use client";
import GamePlayClient from "@/components/GamePlayClient";

import dynamic from "next/dynamic";
const PhaserGame = dynamic(() => import("@/components/PhaserGame"), { ssr: false });

export default function Page() {
  return <PhaserGame />;
}
