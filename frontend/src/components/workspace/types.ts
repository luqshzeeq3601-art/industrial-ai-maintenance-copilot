import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import type { PendingActionPayload } from "../ActionApprovalCard";

export type { EquipmentData };

/** One agent step behind a copilot answer. */
export interface WorkflowStep {
  agent: string;
  action: string;
  summary: string;
}

export interface Citation {
  source?: string;
  document?: string;
  page?: number | string;
  snippet?: string;
}

export interface Message {
  /** "context" renders as an asset-switch divider and is never sent to the API. */
  role: "user" | "assistant" | "context";
  content: string;
  timestamp: string;
  workflow_trace?: WorkflowStep[];
  citations?: Citation[];
  abstain?: boolean;
  /** Client-side delivery failure (API unreachable); not a backend answer. */
  error?: boolean;
  pending_action?: PendingActionPayload | null;
  action_result?: Record<string, unknown> | null;
}

export interface WorkOrderLog {
  id: number;
  machine_id: string;
  fault_code: string;
  fault_description: string;
  action_taken: string;
  technician: string;
  started_at: string;
  completed_at: string;
  duration_mins: number;
  parts_replaced: string;
  severity: string;
}

export const OVERHAUL_THRESHOLD = 10000;

export function statusMeta(status: string): { label: string; dot: string } {
  switch (status.toLowerCase()) {
    case "operational":
      return { label: "Running", dot: "bg-status-ok" };
    case "fault":
      return { label: "Fault", dot: "bg-status-fault" };
    case "maintenance":
      return { label: "Maintenance", dot: "bg-status-maint" };
    default:
      return { label: status, dot: "bg-faint" };
  }
}

/** "Cell A-1" or "Plant A Cell 1" → ["Plant A", "Cell 1"]. */
export function splitLocation(loc: string): [string, string] {
  const m = loc.match(/Cell\s+([A-Za-z]+)[-\s]?(\d+)/i);
  if (m) return [`Plant ${m[1].toUpperCase()}`, `Cell ${m[2]}`];
  const p = loc.match(/^(Plant\s+\S+)\s+(.+)$/i);
  if (p) return [p[1], p[2]];
  return [loc, ""];
}

/** Latest reading per metric from GET /api/v1/telemetry/events. */
export interface TelemetryReading {
  metric: string;
  value: number;
  unit: string;
  severity?: string | null;
  timestamp?: string | null;
}

export type AssetTab = "overview" | "diagnostics" | "sops" | "logs";

/** Severity → fill fraction + token classes for telemetry bars. */
export function severityMeta(severity?: string | null): { level: number; bar: string; text: string; label: string } {
  switch ((severity || "normal").toLowerCase()) {
    case "critical":
      return { level: 1, bar: "bg-status-fault", text: "text-danger", label: "Critical" };
    case "high":
      return { level: 0.8, bar: "bg-status-fault", text: "text-danger", label: "High" };
    case "medium":
      return { level: 0.6, bar: "bg-status-maint", text: "text-warn", label: "Medium" };
    case "low":
      return { level: 0.4, bar: "bg-accent", text: "text-accent", label: "Low" };
    default:
      return { level: 0.25, bar: "bg-status-ok", text: "text-success", label: "Normal" };
  }
}

/** "vibration_rms" → "Vibration (RMS)". */
export function metricLabel(metric: string): string {
  const known: Record<string, string> = {
    spindle_load: "Spindle load",
    tool_temp: "Tool temp",
    vibration_rms: "Vibration (RMS)",
    power_draw: "Power draw"
  };
  if (known[metric]) return known[metric];
  const words = metric.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Open = explicit OPEN severity or an active E- alarm code. */
export function isOpenWorkOrder(log: WorkOrderLog): boolean {
  return log.severity?.toUpperCase() === "OPEN" || log.fault_code.startsWith("E-");
}
