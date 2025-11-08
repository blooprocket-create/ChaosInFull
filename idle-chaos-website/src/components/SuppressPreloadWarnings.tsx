"use client";
import { useEffect } from "react";

/**
 * Dev-only helper to silence noisy browser warnings about preloaded CSS
 * not used within a few seconds and to remove the offending preload hints.
 * This does not affect production builds.
 */
export default function SuppressPreloadWarnings() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    // 1) Remove CSS preload link tags that trigger the spammy warning
    try {
      const links = document.querySelectorAll(
        'link[rel="preload"][href*="/_next/static/css/"]'
      );
      links.forEach((link) => {
        link.parentNode?.removeChild(link);
      });
    } catch {}

    // 2) Mute specific console.warn lines from the browser
    type WarnArgs = Parameters<typeof console.warn>;
    const originalWarn = console.warn.bind(console);
    console.warn = (...args: WarnArgs) => {
      try {
        const msg = String(args[0] ?? "");
        if (
          msg.includes(
            "was preloaded using link preload but not used within a few seconds"
          )
        ) {
          return; // swallow this one
        }
      } catch {}
      return originalWarn(...args);
    };

    return () => {
      // restore bound original
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
