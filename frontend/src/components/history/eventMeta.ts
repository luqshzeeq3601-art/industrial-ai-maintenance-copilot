import { Activity, BookOpen, ClipboardList, Settings, ShieldCheck, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import type { HistoryType } from "../../api/models";

/** One distinct icon and label per event type (spec: icons, not repeated colored pills). */
export const EVENT_META: Record<HistoryType, { label: string; icon: LucideIcon; iconClass: string }> = {
  alarm: { label: "Alarm", icon: TriangleAlert, iconClass: "text-danger" },
  diagnostic: { label: "Diagnostic", icon: Activity, iconClass: "text-accent" },
  work_order: { label: "Work order", icon: ClipboardList, iconClass: "text-body" },
  maintenance: { label: "Maintenance", icon: Wrench, iconClass: "text-body" },
  approval: { label: "Approval", icon: ShieldCheck, iconClass: "text-body" },
  sop: { label: "SOP", icon: BookOpen, iconClass: "text-body" },
  settings: { label: "Settings", icon: Settings, iconClass: "text-body" }
};

/** Where an event's "View" action goes. */
export function eventLink(e: { type: HistoryType; machine_id: string | null; ref: string | null }): string | null {
  if (e.type === "work_order" && e.ref) return `/work-orders/${encodeURIComponent(e.ref)}`;
  if (e.type === "sop" && e.ref) return `/sops?open=${encodeURIComponent(e.ref)}`;
  if (e.type === "settings") return "/settings/profile";
  if ((e.type === "alarm" || e.type === "diagnostic") && e.machine_id) return `/diagnostics/${encodeURIComponent(e.machine_id)}/faults`;
  if (e.machine_id) return `/assets/${encodeURIComponent(e.machine_id)}`;
  return null;
}
