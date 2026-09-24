import { useEffect, useState } from "react";
import { API_BASE, DEMO_DATA, type DataSource } from "../config";
import { demoTelemetry } from "../defaults";
import type { TelemetryReading } from "../components/workspace/types";

export const TELEMETRY_POLL_MS = 15_000;
const HISTORY_POINTS = 12;

interface TelemetryState {
  machineId: string | null;
  readings: TelemetryReading[];
  /** At least one response (live or demo) has arrived for this asset. */
  loaded: boolean;
  /** The most recent poll failed; `readings` still hold the last good values. */
  failed: boolean;
  source: DataSource;
}

/** Latest value per metric plus its recent history, from events sorted newest first. */
export function toReadings(events: Array<Record<string, unknown>>): TelemetryReading[] {
  const byMetric = new Map<string, TelemetryReading>();
  for (const e of events) {
    const metric = String(e.metric ?? e.event_type ?? "");
    const value = typeof e.value === "number" ? e.value : Number(e.value);
    if (!metric || e.value == null || !Number.isFinite(value)) continue;
    const existing = byMetric.get(metric);
    if (existing) {
      if (existing.history!.length < HISTORY_POINTS) existing.history!.unshift(value);
      continue;
    }
    byMetric.set(metric, {
      metric,
      value,
      unit: typeof e.unit === "string" ? e.unit : "",
      severity: typeof e.severity === "string" ? e.severity : null,
      timestamp: typeof e.timestamp === "string" ? e.timestamp : null,
      history: [value]
    });
  }
  return [...byMetric.values()];
}

/** Polls the selected asset's telemetry so the panel reflects the plant, not the moment it was opened. */
export function useTelemetry(machineId: string | null) {
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    machineId: null,
    readings: [],
    loaded: false,
    failed: false,
    source: "live"
  });

  useEffect(() => {
    if (!machineId) return;
    let controller = new AbortController();

    const poll = () => {
      controller = new AbortController();
      const signal = controller.signal;
      fetch(`${API_BASE}/api/v1/telemetry/events?machine_id=${encodeURIComponent(machineId)}&limit=200`, { signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ events?: Array<Record<string, unknown>> }>;
        })
        .then((data) =>
          setTelemetry({ machineId, readings: toReadings(data.events ?? []), loaded: true, failed: false, source: "live" })
        )
        .catch(() => {
          if (signal.aborted) return;
          setTelemetry((prev) => {
            const same = prev.machineId === machineId && prev.loaded;
            if (same && prev.source === "live") return { ...prev, failed: true };
            if (DEMO_DATA) return { machineId, readings: demoTelemetry(machineId), loaded: true, failed: false, source: "demo" };
            return { machineId, readings: [], loaded: true, failed: true, source: "live" };
          });
        });
    };

    poll();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, TELEMETRY_POLL_MS);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [machineId]);

  const current = telemetry.machineId === machineId;
  return {
    readings: current ? telemetry.readings : [],
    loading: !current || !telemetry.loaded,
    failed: current && telemetry.failed,
    source: current ? telemetry.source : ("live" as DataSource)
  };
}
