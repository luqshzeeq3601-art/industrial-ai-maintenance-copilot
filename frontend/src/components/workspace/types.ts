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
  doc_type?: string;
}

/** Cited file name ("sop_x.md") → readable title ("SOP x"); other sources pass through. */
export function citationTitle(c: Citation): string {
  const raw = c.document || c.source || "OEM manual";
  if (!/\.md$/i.test(raw)) return raw;
  const words = raw.replace(/\.md$/i, "").replace(/^sop_/i, "SOP ").replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Only plain markdown file names can be opened from /api/documents. */
export function citationFile(c: Citation): string | null {
  const raw = c.document || c.source || "";
  return /^[A-Za-z0-9_-]+\.md$/.test(raw) ? raw : null;
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

/** "Cell A-1", "Plant A Cell 1" or "Plant A, Cell 1" → ["Plant A", "Cell 1"]. */
export function splitLocation(loc: string): [string, string] {
  const m = loc.match(/^Cell\s+([A-Za-z]+)[-\s]?(\d+)$/i);
  if (m) return [`Plant ${m[1].toUpperCase()}`, `Cell ${m[2]}`];
  const p = loc.match(/^(Plant\s+[^,\s]+),?\s+(.+)$/i);
  if (p) return [p[1], p[2].trim()];
  return [loc.trim(), ""];
}

/** "Plant A, Cell 1" with no doubled separators. */
export function formatLocation(loc: string): string {
  return splitLocation(loc).filter(Boolean).join(", ");
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** The API stores naive UTC ("2026-09-23 06:58:16"); zone-less values are read as UTC. */
export function parseTimestamp(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const iso = value.trim().replace(" ", "T");
  const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(value?: string | Date | null): string {
  const d = parseTimestamp(value);
  return d ? dateTimeFormat.format(d) : "Unknown time";
}

/** "3 hours ago", "yesterday", "in 2 days". */
export function formatRelative(value?: string | Date | null, now = Date.now()): string {
  const d = parseTimestamp(value);
  if (!d) return "";
  const seconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relativeFormat.format(seconds, "second");
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 30) return relativeFormat.format(Math.round(seconds / 86_400), "day");
  if (abs < 86_400 * 365) return relativeFormat.format(Math.round(seconds / (86_400 * 30)), "month");
  return relativeFormat.format(Math.round(seconds / (86_400 * 365)), "year");
}

/** Latest reading per metric from GET /api/v1/telemetry/events. */
export interface TelemetryReading {
  metric: string;
  value: number;
  unit: string;
  severity?: string | null;
  timestamp?: string | null;
  /** Earlier values for this metric, oldest first, ending with `value`. */
  history?: number[];
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

/** Open = not completed yet (no completion time), or explicitly marked OPEN. */
export function isOpenWorkOrder(log: WorkOrderLog): boolean {
  return log.severity?.toUpperCase() === "OPEN" || !log.completed_at?.trim();
}
