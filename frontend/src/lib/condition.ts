import type { Alarm, Equipment } from "../api/models";

export type Condition = "critical" | "warning" | "good";

/**
 * Asset condition, derived (not measured):
 * - critical: an active critical alarm
 * - warning: an active high alarm, or service overdue or due within 10% of the interval
 * - good: otherwise
 */
export function assetCondition(asset: Equipment, activeAlarms: Alarm[]): { condition: Condition; reason: string } {
  const critical = activeAlarms.filter((a) => a.severity === "critical");
  if (critical.length) return { condition: "critical", reason: `${critical.length} critical alarm${critical.length > 1 ? "s" : ""} active` };
  const high = activeAlarms.filter((a) => a.severity === "high");
  if (high.length) return { condition: "warning", reason: `${high.length} high-severity alarm${high.length > 1 ? "s" : ""} active` };
  const left = asset.next_service_in_hours;
  const interval = asset.service_interval_hours;
  if (left != null && left < 0) return { condition: "warning", reason: "Service overdue" };
  if (left != null && interval && left <= interval * 0.1) return { condition: "warning", reason: "Service due soon" };
  if (activeAlarms.length) return { condition: "good", reason: `${activeAlarms.length} low-severity alarm${activeAlarms.length > 1 ? "s" : ""} active` };
  return { condition: "good", reason: "No active alarms" };
}

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/** Most severe, then most recent, active alarm. */
export function topAlarm(alarms: Alarm[]): Alarm | null {
  return (
    [...alarms].sort(
      (a, b) => (SEVERITY_RANK[a.severity] ?? 4) - (SEVERITY_RANK[b.severity] ?? 4) || b.triggered_at.localeCompare(a.triggered_at)
    )[0] ?? null
  );
}
