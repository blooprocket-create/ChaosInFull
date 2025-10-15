"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window { __spawnOverhead?: (text: string, opts?: { wave?: boolean; shake?: boolean; ripple?: boolean; rainbow?: boolean; color?: string }) => void; __setTyping?: (v: boolean) => void; __focusGame?: () => void; }
}

export default function ChatClient({ characterId, scene }: { characterId: string; scene: string }) {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; createdAt: string; characterId?: string | null }>>([]);
  const [input, setInput] = useState("");
  // focus state not kept beyond gating
  const lastTsRef = useRef<string>(new Date(Date.now() - 60_000).toISOString());
  const boxRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const pollInFlight = useRef(false);
  const sendingRef = useRef(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const cooldownTimer = useRef<number | null>(null);

  // Parse tags like :wave:, :blue:, :red:, :green:, :shake:, :rainbow:, :ripple:
  const parseTags = useCallback((raw: string) => {
    const parts = raw.trim().split(/\s+/);
    let wave = false, shake = false, ripple = false;
    let color: string | undefined; let rainbow = false;
    while (parts.length && /^:.+:$/.test(parts[0])) {
      const tag = parts.shift()!.toLowerCase();
      if (tag === ":wave:") wave = true;
      if (tag === ":shake:") shake = true;
      if (tag === ":rainbow:") rainbow = true;
      if (tag === ":ripple:") ripple = true;
      if (tag === ":blue:") color = "#60a5fa";
      if (tag === ":red:") color = "#ef4444";
      if (tag === ":green:") color = "#22c55e";
      if (tag === ":yellow:") color = "#f59e0b";
      if (tag === ":purple:") color = "#a78bfa";
    }
    return { text: parts.join(" "), wave, shake, ripple, color, rainbow };
  }, []);

  const poll = useCallback(async () => {
    if (pollInFlight.current) return;
    pollInFlight.current = true;
    try {
      const res = await fetch(`/api/chat?since=${encodeURIComponent(lastTsRef.current)}&scene=${encodeURIComponent(scene)}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data?.messages as Array<{ id: string; text: string; createdAt: string; characterId?: string | null }>) || [];
      if (msgs.length > 0) {
        // dedupe by id and append
        const newOnes: typeof msgs = [];
        for (const m of msgs) {
          if (!seenIds.current.has(m.id)) {
            seenIds.current.add(m.id);
            newOnes.push(m);
          }
        }
        if (newOnes.length) setMessages((curr) => [...curr, ...newOnes]);
        lastTsRef.current = msgs[msgs.length - 1].createdAt;
      }
    } catch {}
    finally { pollInFlight.current = false; }
  }, [scene]);

  useEffect(() => {
    const id = setInterval(() => void poll(), 1200);
    return () => clearInterval(id);
  }, [poll]);

  // Auto-scroll to bottom if user is already near the bottom; otherwise preserve scroll position
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Focus shortcuts: '/' focuses, Escape blurs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        (document.getElementById("chat-input") as HTMLInputElement | null)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(async () => {
  if (sendingRef.current || cooldown > 0) return;
    const raw = input.trim(); if (!raw) return;
    sendingRef.current = true;
    const parsed = parseTags(raw);
    if (!parsed.text) { setInput(""); return; }
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, text: raw, scene }) });
  if (res.ok) {
        // show overhead locally
        const color = parsed.rainbow ? undefined : parsed.color;
        window.__spawnOverhead?.(parsed.text, { wave: parsed.wave, shake: parsed.shake, ripple: parsed.ripple, rainbow: parsed.rainbow, color });
        setInput("");
        void poll();
        // Immediately put focus back to the game; user presses '/' to chat again
        window.__setTyping?.(false);
        window.__focusGame?.();
      } else if (res.status === 429) {
        const data = await res.json().catch(() => null) as { retryAfter?: number } | null;
        const secs = Math.max(1, Number(data?.retryAfter ?? 3));
        setCooldown(secs);
        if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
        cooldownTimer.current = window.setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) {
              if (cooldownTimer.current) { window.clearInterval(cooldownTimer.current); cooldownTimer.current = null; }
              return 0;
            }
            return c - 1;
          });
          return 0;
        }, 1000);
      }
    } catch {}
    finally {
      // brief unlock so rapid-enter doesn't double-send
      setTimeout(() => { sendingRef.current = false; }, 100);
    }
  }, [characterId, input, parseTags, poll, scene]);

  return (
    <div className="rounded-md border border-white/10 bg-black/40 backdrop-blur">
      <div ref={boxRef} className="max-h-48 overflow-y-auto p-2 text-xs text-gray-200 space-y-1">
        {messages.map(m => <div key={m.id} className="leading-tight">{m.text}</div>)}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-2">
        <input
          id="chat-input"
          className="flex-1 rounded bg-black/50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-white/20"
          placeholder=":wave: :red: :shake: Hello there"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => { window.__setTyping?.(true); }}
          onBlur={() => { window.__setTyping?.(false); }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && !e.repeat) { e.preventDefault(); send(); } }}
          onKeyUp={(e) => { e.stopPropagation(); }}
          disabled={cooldown > 0}
        />
        <button className="btn px-2 py-1 text-xs disabled:opacity-50" onClick={() => send()} disabled={cooldown > 0}>{cooldown > 0 ? `Wait ${cooldown}s` : "Say"}</button>
      </div>
      <div className="px-2 pb-2 text-[10px] text-gray-400">Tags: :wave: :shake: :ripple: :red: :green: :blue: :yellow: :purple: :rainbow:</div>
    </div>
  );
}
