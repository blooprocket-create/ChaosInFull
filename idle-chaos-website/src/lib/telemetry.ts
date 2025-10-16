"use client";
let Sentry: typeof import("@sentry/nextjs") | null = null;
let posthog: typeof import("posthog-js").default | null = null;

const VERSION = "v0.0.11";

let inited = false;
export async function initTelemetry() {
  if (inited) return;
  inited = true;
  try {
    const s = (await import("@sentry/nextjs")) as typeof import("@sentry/nextjs");
    Sentry = s;
    s.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
      tracesSampleRate: 0.1,
      release: VERSION,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  } catch {}
  try {
    const ph = (await import("posthog-js")) as typeof import("posthog-js");
    posthog = ph.default || (ph as unknown as typeof import("posthog-js").default);
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (client: { group?: (groupType: string, groupKey: string) => void }) => { try { client.group?.("build", VERSION); } catch {} }
    });
  } catch {}
}

export function capture(name: string, props?: Record<string, unknown>) {
  try { posthog?.capture(name, { ...props, build: VERSION }); } catch {}
  try { Sentry?.addBreadcrumb({ category: "event", message: name, level: "info", data: props }); } catch {}
}

// Wire global event bridge
if (typeof window !== "undefined") {
  void initTelemetry();
  window.addEventListener("telemetry:event", (e: Event) => {
    const detail = (e as CustomEvent).detail as { name: string; props?: Record<string, unknown> } | undefined;
    if (detail?.name) capture(detail.name, detail.props);
  });
}
