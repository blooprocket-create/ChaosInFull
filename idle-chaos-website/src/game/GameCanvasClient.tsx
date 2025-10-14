"use client";
import dynamic from "next/dynamic";

type CharacterHUD = {
  id: string;
  name: string;
  class: string;
  level: number;
};

const DynamicCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

export default function GameCanvasClient(props: { character?: CharacterHUD; initialSeenWelcome?: boolean; initialScene?: string; offlineSince?: string; initialExp?: number; initialMiningExp?: number }) {
  return <DynamicCanvas {...props} />;
}
