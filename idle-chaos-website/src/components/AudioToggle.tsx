"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

function createToneCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const gain = ctx.createGain();
  gain.gain.value = 0.1; // slightly louder so it's audible
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1200; // soften highs
  lp.connect(gain);
  gain.connect(ctx.destination);
  // Base tone + slight detune for beating
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 138; // eerie base tone
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 136; // slight beat frequency
  // Slow LFO for subtle movement
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 20;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  lfoGain.connect(osc2.frequency);
  osc.connect(lp);
  osc2.connect(lp);
  osc.start();
  osc2.start();
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
      // Ensure audio context is running (required in some browsers)
      if (audioRef.current.ctx.state !== "running") {
        void audioRef.current.ctx.resume();
      }
      audioRef.current.gain.gain.setTargetAtTime(0.1, audioRef.current.ctx.currentTime, 0.25);
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
      aria-label={on ? "Turn ambience audio off" : "Turn ambience audio on"}
      title={on ? "Ambience on" : "Ambience off"}
    >
      {on ? "Ambience: On" : "Ambience: Off"}
    </button>
  );
}
