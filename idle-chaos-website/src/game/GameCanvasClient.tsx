"use client";
import dynamic from "next/dynamic";

type CharacterHUD = {
  id: string;
  name: string;
  class: string;
  level: number;
};

// Use the new Phaser-based canvas implementation
const DynamicCanvas = dynamic(() => import("./PhaserGameCanvas"), { ssr: false });

type LegacyProps = {
  character?: CharacterHUD;
  initialSeenWelcome?: boolean;
  initialScene?: string;
  offlineSince?: string;
  initialExp?: number;
  initialMiningExp?: number;
  initialMiningLevel?: number;
};

export default function GameCanvasClient(props: LegacyProps) {
  // Adapt legacy props to the new PhaserGameCanvas signature
  return <DynamicCanvas character={props.character} initialScene={props.initialScene} />;
}
