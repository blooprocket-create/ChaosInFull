"use client";
import { useEffect } from "react";
import { initTelemetry } from "@/src/lib/telemetry";

export default function TelemetryInit() {
  useEffect(() => { void initTelemetry(); }, []);
  return null;
}
