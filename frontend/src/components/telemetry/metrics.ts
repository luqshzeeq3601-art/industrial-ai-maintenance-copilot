import { Gauge, Thermometer, Waves, Zap, type LucideIcon } from "lucide-react";
import type { Sample, SampleMetric } from "../../api/models";

export const METRICS: { id: SampleMetric; label: string; unit: string; digits: number; icon: LucideIcon }[] = [
  { id: "spindle_speed", label: "Spindle speed", unit: "rpm", digits: 0, icon: Gauge },
  { id: "temperature", label: "Temperature", unit: "°C", digits: 1, icon: Thermometer },
  { id: "vibration_rms", label: "Vibration (RMS)", unit: "mm/s", digits: 2, icon: Waves },
  { id: "motor_current", label: "Motor current", unit: "A", digits: 1, icon: Zap }
];

/** Samples grouped per metric, oldest first. */
export function byMetric(samples: Sample[] | undefined): Record<SampleMetric, Sample[]> {
  const groups: Record<SampleMetric, Sample[]> = { spindle_speed: [], temperature: [], vibration_rms: [], motor_current: [] };
  for (const s of samples ?? []) groups[s.metric]?.push(s);
  return groups;
}

export const TIME_WINDOWS = [
  { id: "1h", label: "Last hour", hours: 1 },
  { id: "6h", label: "Last 6 hours", hours: 6 },
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d", label: "Last 7 days", hours: 168 }
] as const;

export type TimeWindowId = (typeof TIME_WINDOWS)[number]["id"];

/** ISO start of a window, rounded to the minute so the query key is stable between renders. */
export function windowStart(hours: number): string {
  const d = new Date(Date.now() - hours * 3_600_000);
  d.setSeconds(0, 0);
  return d.toISOString();
}
