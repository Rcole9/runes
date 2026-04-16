"use client";
import GamePlayClient from "@/components/GamePlayClient";

import dynamic from "next/dynamic";
const PhaserTopDownMulti = dynamic(() => import("@/components/PhaserTopDownMulti"), { ssr: false });

export default function TopDownPage() {
  return <PhaserTopDownMulti />;
}
