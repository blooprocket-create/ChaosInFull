"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

function createToneCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 138; // eerie base tone
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 18;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gain);
  osc.start();
  lfo.start();
  return { ctx, gain };
}

export default function AudioToggle() {
  const [on, setOn] = useState(false);
  const audioRef = useRef<ReturnType<typeof createToneCtx> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cif_audio_on");
    if (saved === "1") setOn(true);
  }, []);

  useEffect(() => {
    if (on) {
      if (!audioRef.current) audioRef.current = createToneCtx();
      audioRef.current.gain.gain.setTargetAtTime(0.06, audioRef.current.ctx.currentTime, 0.3);
      localStorage.setItem("cif_audio_on", "1");
    } else if (audioRef.current) {
      audioRef.current.gain.gain.setTargetAtTime(0.0, audioRef.current.ctx.currentTime, 0.2);
      localStorage.setItem("cif_audio_on", "0");
    }
  }, [on]);

  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`rounded px-3 py-1.5 text-xs font-semibold border ${on ? "border-purple-400 text-white" : "border-white/20 text-gray-300 hover:border-white/40"}`}
      aria-pressed={on}
    >
      {on ? "Ambience: On" : "Ambience: Off"}
    </button>
  );
}
