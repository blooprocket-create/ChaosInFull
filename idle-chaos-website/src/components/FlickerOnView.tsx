"use client";
import { useEffect, useRef } from "react";

export default function FlickerOnView({ selector = ".flicker-target" }: { selector?: string }) {
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return; // only set up once
    ranRef.current = true;
    const els = Array.from(document.querySelectorAll(selector));
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("flicker-once");
        }
      }
    }, { threshold: 0.6 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [selector]);
  return null;
}
