import type { WorkflowStep } from "../visualization/AgentWorkflowDag";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import type { PendingActionPayload } from "../ActionApprovalCard";

export type { EquipmentData, WorkflowStep };

export interface Citation {
  source?: string;
  document?: string;
  page?: number | string;
  snippet?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  workflow_trace?: WorkflowStep[];
  citations?: Citation[];
  abstain?: boolean;
  pending_action?: PendingActionPayload | null;
  action_result?: Record<string, unknown> | null;
}

export interface Stats {
  equipment_count: number;
  maintenance_logs_count: number;
  indexed_chunks: number;
  llm_model: string;
  embedding_model: string;
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
      return { label: "Operational", dot: "bg-[#1A9E57]" };
    case "fault":
      return { label: "Fault", dot: "bg-[#D92D20]" };
    case "maintenance":
      return { label: "Maintenance", dot: "bg-[#E8930C]" };
    default:
      return { label: status, dot: "bg-[#94A3B8]" };
  }
}

/** "Cell A-1" → ["Plant A", "Cell 1"] for the register's two-line location. */
export function splitLocation(loc: string): [string, string] {
  const m = loc.match(/Cell\s+([A-Za-z]+)[-\s]?(\d+)/i);
  if (m) return [`Plant ${m[1].toUpperCase()}`, `Cell ${m[2]}`];
  return [loc, ""];
}
