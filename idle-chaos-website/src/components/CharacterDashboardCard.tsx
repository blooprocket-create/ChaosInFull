"use client";
import React, { useEffect, useState } from "react";
import { pick, afkPhrases } from "@/src/data/flavor";
import { formatDuration } from "@/src/lib/time";
import DeleteCharacterButton from "@/src/components/DeleteCharacterButton";

export type CharacterSummary = {
  id: string;
  name: string;
  class: string;
  level: number;
  miningLevel: number;
  woodcuttingLevel: number;
  craftingLevel: number;
  fishingLevel: number;
  lastScene: string;
  afkMs: number;
};

export default function CharacterDashboardCard({ c }: { c: CharacterSummary }) {
  const [afkDisplay, setAfkDisplay] = useState(formatDuration(c.afkMs));
  // Avoid SSR/client mismatch by selecting flavor on client after mount
  const [afkFlavor, setAfkFlavor] = useState<string>("");
  useEffect(() => {
    // live ticking AFK timer
    const start = Date.now() - c.afkMs;
    const t = setInterval(() => {
      const diff = Date.now() - start;
      setAfkDisplay(formatDuration(diff));
    }, 1000);
    return () => clearInterval(t);
  }, [c.afkMs]);
  useEffect(() => {
    setAfkFlavor(pick(afkPhrases));
  }, []);
  return (
    <div className="rounded border border-white/10 bg-black/40 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white/90">{c.name}</div>
          <div className="text-sm text-gray-400">{c.class} • Lv {c.level}</div>
        </div>
        <div className="flex gap-2">
          <a href={`/play?ch=${c.id}`} className="btn inline-flex items-center px-3 py-1">Play</a>
          <DeleteCharacterButton id={c.id} name={c.name} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-black/30 p-2 flex flex-col gap-1">
          <div className="font-semibold text-white/80">Skills</div>
          <div className="text-gray-300">Mining Lv {c.miningLevel}</div>
          <div className="text-gray-300">Woodcutting Lv {c.woodcuttingLevel}</div>
          <div className="text-gray-300">Crafting Lv {c.craftingLevel}</div>
          <div className="text-gray-300">Fishing Lv {c.fishingLevel}</div>
        </div>
        <div className="rounded bg-black/30 p-2 flex flex-col gap-1">
          <div className="font-semibold text-white/80">Activity</div>
          <div className="text-gray-300">Last Zone: {c.lastScene}</div>
          <div className="text-gray-300">AFK: {afkDisplay}</div>
          <div className="text-[10px] text-gray-500 italic">{afkFlavor}</div>
        </div>
      </div>
    </div>
  );
}