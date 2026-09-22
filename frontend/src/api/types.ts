// Auto-aligned contract types - mirrors backend/app/main.py ChatResponse + api/v1/actions.py
// Source of truth: backend OpenAPI. Regenerate via `curl localhost:8000/openapi.json`.

export type ActionStatus = "completed" | "approval_required" | "rejected" | "failed";
export type ActionType = "create_work_order" | "schedule_inspection" | "acknowledge_alarm" | string;

export interface PendingActionPayload {
  action_id: string;
  action_type: ActionType;
  summary?: string;
  arguments?: Record<string, unknown>;
  requester?: string;
  requester_role?: string;
  requested_at?: string;
  session_id?: string;
}

export interface Citation {
  source: string;
  content: string;
  score?: number;
  doc_type?: string;
  equipment_domain?: string;
}

export interface WorkflowStep {
  agent: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  answer: string;
  session_id: string;
  workflow_trace: WorkflowStep[];
  agent_path: string[];
  citations: Citation[];
  abstain: boolean;
  status: ActionStatus;
  request_id: string;
  pending_action?: PendingActionPayload | null;
  action_result?: Record<string, unknown> | null;
}

export interface PendingActionsResponse {
  count: number;
  pending_actions: PendingActionPayload[];
}

export interface ApproveActionResponse {
  status: "approved";
  action_id: string;
  approver: string;
  action_result?: Record<string, unknown> | null;
}
