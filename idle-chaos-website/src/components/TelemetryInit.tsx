"use client";
import { useEffect } from "react";
import { initTelemetry } from "@/src/lib/telemetry";
// Side-effect import to install client-side persistence bridge
import "@/src/lib/clientPersistence";

export default function TelemetryInit() {
  useEffect(() => { void initTelemetry(); }, []);
  return null;
}
