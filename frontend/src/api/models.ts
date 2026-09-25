// Response shapes of the FastAPI routes the UI reads. Source of truth: docs/api/openapi.json.

export type AssetStatus = "operational" | "maintenance" | "fault" | "offline";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Equipment {
  machine_id: string;
  name: string;
  type: string;
  location: string;
  install_date?: string;
  last_service?: string;
  status: AssetStatus | string;
  operating_hours: number;
  criticality: Severity | string;
  service_interval_hours?: number | null;
  hours_at_last_service?: number | null;
  /** Hours left until the next service is due; negative when overdue. */
  next_service_in_hours?: number | null;
}

export type WorkOrderStatus = "pending" | "approved" | "in_progress" | "completed" | "rejected";

export interface WorkOrder {
  work_order_id: string;
  machine_id: string;
  machine_name?: string | null;
  title: string;
  description: string;
  priority: Severity;
  status: WorkOrderStatus;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  completed_at: string | null;
  due_date: string | null;
}

export interface WorkOrderPage {
  count: number;
  total: number;
  page: number;
  page_size: number | null;
  status_counts: Partial<Record<WorkOrderStatus, number>>;
  work_orders: WorkOrder[];
}

export type AlarmStatus = "active" | "acknowledged" | "cleared";

export interface Alarm {
  alarm_id: string;
  machine_id: string;
  code: string;
  fault_description: string | null;
  severity: Severity;
  status: AlarmStatus;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  cleared_at: string | null;
  notes: string | null;
}

export interface MaintenanceLog {
  id: number;
  machine_id: string;
  fault_code: string | null;
  fault_description: string;
  action_taken: string;
  technician: string;
  started_at: string;
  completed_at: string;
  duration_mins: number;
  parts_replaced: string | null;
  severity: Severity;
}

export type SopCategory = "safety" | "maintenance" | "troubleshooting" | "operation";
export type SopStatus = "active" | "review" | "draft";

export interface Sop {
  file: string;
  id: string;
  title: string;
  category: SopCategory;
  assets: string[];
  status: SopStatus;
  updated: string;
}

export type HistoryType = "alarm" | "diagnostic" | "work_order" | "maintenance" | "approval" | "sop" | "settings";

export interface HistoryEvent {
  time: string;
  type: HistoryType;
  machine_id: string | null;
  description: string;
  user: string | null;
  ref: string | null;
}

export interface HistoryPage {
  total: number;
  page: number;
  page_size: number;
  users: string[];
  events: HistoryEvent[];
}

export type SampleMetric = "spindle_speed" | "temperature" | "vibration_rms" | "motor_current";

export interface Sample {
  metric: SampleMetric;
  value: number;
  unit: string;
  observed_at: string;
}

export interface SamplesResponse {
  machine_id: string;
  count: number;
  units: Record<SampleMetric, string>;
  samples: Sample[];
}

export interface FleetHealth {
  total_units: number;
  uptime_percentage: number;
  total_operating_hours: number;
  total_downtime_hours: number;
  repairs_logged: number;
  period_days: number | null;
  previous_downtime_hours: number | null;
  previous_repairs_logged: number | null;
  active_work_orders: number;
  daily_downtime_hours: { day: string; hours: number }[];
  status_distribution: Partial<Record<AssetStatus, number>>;
}

export interface FaultCategories {
  incident_breakdown: { category: string; occurrences: number; total_downtime_mins: number | null }[];
}

export interface Profile {
  user_id: string;
  username: string;
  full_name: string;
  role: string;
  email: string | null;
  department: string | null;
  plant: string | null;
}

export interface SearchResults {
  assets: Pick<Equipment, "machine_id" | "name" | "type" | "location" | "status">[];
  work_orders: Pick<WorkOrder, "work_order_id" | "title" | "machine_id" | "status">[];
  sops: Pick<Sop, "id" | "title" | "file" | "status">[];
}
