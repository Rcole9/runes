"use client";
import GamePlayClient from "@/components/GamePlayClient";

import dynamic from "next/dynamic";
const PhaserTopDown = dynamic(() => import("@/components/PhaserTopDown"), { ssr: false });

export default function TopDownPage() {
  return <PhaserTopDown />;
}
