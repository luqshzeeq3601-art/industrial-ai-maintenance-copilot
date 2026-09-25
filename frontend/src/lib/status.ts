import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  CirclePause,
  CircleX,
  Clock,
  Loader,
  Octagon,
  PowerOff,
  ShieldCheck,
  Wrench,
  type LucideIcon
} from "lucide-react";
import type { AlarmStatus, AssetStatus, Severity, SopCategory, SopStatus, WorkOrderStatus } from "../api/models";

/** How a state is shown: icon + label; `tone` picks the color, `tinted` adds a surface (Fault/Maintenance only). */
export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  tone: "ok" | "warn" | "danger" | "neutral" | "info";
  tinted?: boolean;
}

export const ASSET_STATUS: Record<AssetStatus, StatusMeta> = {
  operational: { label: "Running", icon: CircleCheck, tone: "ok" },
  fault: { label: "Fault", icon: Octagon, tone: "danger", tinted: true },
  maintenance: { label: "Maintenance", icon: Wrench, tone: "warn", tinted: true },
  offline: { label: "Offline", icon: PowerOff, tone: "neutral" }
};

export const assetStatus = (status: string): StatusMeta =>
  ASSET_STATUS[status.toLowerCase() as AssetStatus] ?? { label: status, icon: CircleDot, tone: "neutral" };

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, StatusMeta> = {
  pending: { label: "Pending approval", icon: Clock, tone: "warn" },
  approved: { label: "Open", icon: CircleDot, tone: "info" },
  in_progress: { label: "In progress", icon: Loader, tone: "info" },
  completed: { label: "Closed", icon: CircleCheck, tone: "ok" },
  rejected: { label: "Rejected", icon: CircleX, tone: "neutral" }
};

/** Work Orders page tabs → API statuses (plan: Open = pending + approved, Closed = completed + rejected). */
export const WORK_ORDER_TABS = {
  all: { label: "All", statuses: undefined },
  open: { label: "Open", statuses: ["pending", "approved"] },
  in_progress: { label: "In progress", statuses: ["in_progress"] },
  closed: { label: "Closed", statuses: ["completed", "rejected"] },
  approval: { label: "Pending approval", statuses: ["pending"] }
} as const satisfies Record<string, { label: string; statuses: readonly WorkOrderStatus[] | undefined }>;

export type WorkOrderTab = keyof typeof WORK_ORDER_TABS;

export const ALARM_STATUS: Record<AlarmStatus, StatusMeta> = {
  active: { label: "Active", icon: CircleAlert, tone: "danger", tinted: true },
  acknowledged: { label: "Acknowledged", icon: CirclePause, tone: "warn" },
  cleared: { label: "Cleared", icon: CircleCheck, tone: "neutral" }
};

export const SOP_STATUS: Record<SopStatus, StatusMeta> = {
  active: { label: "Active", icon: CircleCheck, tone: "ok" },
  review: { label: "In review", icon: Clock, tone: "warn" },
  draft: { label: "Draft", icon: ShieldCheck, tone: "neutral" }
};

export const PRIORITY: Record<Severity, { label: string; tone: StatusMeta["tone"] }> = {
  critical: { label: "Critical", tone: "danger" },
  high: { label: "High", tone: "danger" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "neutral" }
};

export const TONE_TEXT: Record<StatusMeta["tone"], string> = {
  ok: "text-success",
  warn: "text-warn",
  danger: "text-danger",
  neutral: "text-muted",
  info: "text-accent"
};

/** Solid fills for small marks (priority bars, dots). Literal classes so Tailwind generates them. */
export const TONE_FILL: Record<StatusMeta["tone"], string> = {
  ok: "bg-status-ok",
  warn: "bg-status-maint",
  danger: "bg-status-fault",
  neutral: "bg-faint",
  info: "bg-accent"
};

export const TONE_SURFACE: Record<StatusMeta["tone"], string> = {
  ok: "bg-success-bg text-success-ink",
  warn: "bg-warn-bg text-warn-ink",
  danger: "bg-danger-bg text-danger-ink",
  neutral: "bg-wash text-body",
  info: "bg-accent-bg text-accent-ink"
};

/** Fault first, then maintenance, then criticality: the order assets need attention in. */
export function attentionRank(asset: { status: string; criticality?: string }): number {
  const status = { fault: 0, maintenance: 1, offline: 2 }[asset.status.toLowerCase()] ?? 3;
  const crit = { critical: 0, high: 1, medium: 2, low: 3 }[asset.criticality?.toLowerCase() ?? ""] ?? 4;
  return status * 10 + crit;
}

export const ROLE_LABEL: Record<string, string> = { supervisor: "Supervisor", admin: "Admin", technician: "Technician" };

export const SOP_CATEGORIES: { value: SopCategory; label: string }[] = [
  { value: "safety", label: "Safety" },
  { value: "maintenance", label: "Maintenance" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "operation", label: "Operation" }
];
