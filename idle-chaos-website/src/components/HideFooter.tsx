"use client";
import { useEffect } from "react";

export default function HideFooter() {
  useEffect(() => {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const prevDisplay = el.style.display;
    el.style.display = "none";
    return () => {
      el.style.display = prevDisplay;
    };
  }, []);
  return null;
}
