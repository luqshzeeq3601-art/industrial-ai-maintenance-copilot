import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO_DATA, type DataSource } from "../config";
import { DEMO_EQUIPMENT } from "../defaults";
import { api } from "./client";
import type { PendingActionPayload } from "../components/ActionApprovalCard";
import type {
  Alarm,
  AlarmStatus,
  Equipment,
  FaultCategories,
  FleetHealth,
  HistoryPage,
  HistoryType,
  MaintenanceLog,
  Profile,
  SamplesResponse,
  SearchResults,
  Sop,
  SopCategory,
  SopStatus,
  WorkOrder,
  WorkOrderPage,
  WorkOrderStatus
} from "./models";

const LIVE_POLL_MS = 30_000;

/** Registered equipment. An unreachable API falls back to labelled demo data only when DEMO_DATA is on. */
export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: async ({ signal }): Promise<{ equipment: Equipment[]; source: DataSource }> => {
      try {
        const data = await api<{ equipment: Equipment[] }>("/api/v1/equipment", { signal });
        return { equipment: data.equipment, source: "live" };
      } catch (err) {
        if (DEMO_DATA && !signal.aborted) return { equipment: DEMO_EQUIPMENT, source: "demo" };
        throw err;
      }
    }
  });
}

export function useAsset(machineId: string | undefined) {
  return useQuery({
    queryKey: ["equipment", machineId],
    queryFn: ({ signal }) => api<Equipment>(`/api/v1/equipment/${encodeURIComponent(machineId!)}`, { signal }),
    enabled: !!machineId
  });
}

export function useAlarms(filters: { machine_id?: string; status?: AlarmStatus }) {
  return useQuery({
    queryKey: ["alarms", filters],
    queryFn: ({ signal }) => api<{ alarms: Alarm[] }>("/api/v1/alarms", { query: filters, signal }).then((d) => d.alarms),
    refetchInterval: LIVE_POLL_MS
  });
}

export function useMaintenanceHistory(machineId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["maintenance-history", machineId, limit],
    queryFn: ({ signal }) =>
      api<{ logs: MaintenanceLog[] }>(`/api/v1/equipment/${encodeURIComponent(machineId!)}/maintenance-history`, {
        query: { limit },
        signal
      }).then((d) => d.logs),
    enabled: !!machineId
  });
}

export interface WorkOrderFilters {
  statuses?: WorkOrderStatus[];
  machine_id?: string;
  priority?: string;
  q?: string;
  sort?: "created_at" | "due_date" | "priority" | "work_order_id";
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export function useWorkOrders({ statuses, ...rest }: WorkOrderFilters) {
  const query = { ...rest, status: statuses?.join(",") };
  return useQuery({
    queryKey: ["work-orders", query],
    queryFn: ({ signal }) => api<WorkOrderPage>("/api/v1/work-orders", { query, signal }),
    placeholderData: keepPreviousData
  });
}

export function useWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["work-orders", "detail", id],
    queryFn: ({ signal }) => api<WorkOrder>(`/api/v1/work-orders/${encodeURIComponent(id!)}`, { signal }),
    enabled: !!id
  });
}

export interface QueuedAction extends PendingActionPayload {
  requested_at?: string;
}

/** Copilot-requested actions waiting for a supervisor (approvers only). */
export function usePendingActions(enabled: boolean) {
  return useQuery({
    queryKey: ["pending-actions"],
    queryFn: ({ signal }) =>
      api<{ pending_actions: QueuedAction[] }>("/api/v1/actions/pending", { signal }).then((d) =>
        [...d.pending_actions].sort((a, b) => (a.requested_at ?? "").localeCompare(b.requested_at ?? ""))
      ),
    enabled
  });
}

export function useSops(filters: { q?: string; category?: SopCategory; asset?: string; status?: SopStatus }) {
  return useQuery<Sop[]>({
    queryKey: ["sops", filters],
    queryFn: ({ signal }) => api<{ sops: Sop[] }>("/api/v1/sops", { query: filters, signal }).then((d) => d.sops),
    placeholderData: keepPreviousData
  });
}

export interface HistoryFilters {
  from?: string;
  to?: string;
  type?: HistoryType;
  machine_id?: string;
  user?: string;
  page?: number;
  page_size?: number;
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ["history", filters],
    queryFn: ({ signal }) => api<HistoryPage>("/api/v1/history", { query: { ...filters }, signal }),
    placeholderData: keepPreviousData
  });
}

export function useSamples(machineId: string | undefined, from: string) {
  return useQuery({
    queryKey: ["samples", machineId, from],
    queryFn: ({ signal }) =>
      api<SamplesResponse>("/api/v1/telemetry/samples", { query: { machine_id: machineId, from, limit: 5000 }, signal }),
    enabled: !!machineId,
    refetchInterval: LIVE_POLL_MS,
    placeholderData: keepPreviousData
  });
}

export function useFleetHealth(days: number | null) {
  return useQuery({
    queryKey: ["fleet-health", days],
    queryFn: ({ signal }) => api<FleetHealth>("/api/analytics/fleet-health", { query: { days }, signal })
  });
}

export function useFaultCategories(days: number | null) {
  return useQuery({
    queryKey: ["fault-categories", days],
    queryFn: ({ signal }) => api<FaultCategories>("/api/analytics/fault-categories", { query: { days }, signal })
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api<Profile>("/api/v1/users/me", { signal })
  });
}

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ["search", term],
    queryFn: ({ signal }) => api<SearchResults>("/api/v1/search", { query: { q: term }, signal }),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData
  });
}

// --- Mutations ---

export interface WorkOrderDraft {
  machine_id: string;
  title: string;
  description?: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
}

export function useCreateWorkOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: WorkOrderDraft) => api<WorkOrder>("/api/v1/work-orders", { method: "POST", body: draft }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["work-orders"] });
      void client.invalidateQueries({ queryKey: ["history"] });
      void client.invalidateQueries({ queryKey: ["fleet-health"] });
    }
  });
}

export interface WorkOrderChange {
  status?: WorkOrderStatus;
  assigned_to?: string | null;
  due_date?: string | null;
  rejection_reason?: string;
}

export function useUpdateWorkOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: WorkOrderChange }) =>
      api<WorkOrder>(`/api/v1/work-orders/${encodeURIComponent(id)}`, { method: "PATCH", body: change }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["work-orders"] });
      void client.invalidateQueries({ queryKey: ["history"] });
      void client.invalidateQueries({ queryKey: ["fleet-health"] });
    }
  });
}

export function useAcknowledgeAlarm() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (alarmId: string) =>
      api<{ alarm_id: string; status: AlarmStatus }>(`/api/v1/alarms/${encodeURIComponent(alarmId)}/acknowledge`, {
        method: "POST"
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["alarms"] });
      void client.invalidateQueries({ queryKey: ["history"] });
    }
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (change: Partial<Omit<Profile, "user_id" | "username">>) =>
      api<Profile>("/api/v1/users/me", { method: "PATCH", body: change }),
    onSuccess: (profile) => {
      client.setQueryData(["profile"], profile);
      void client.invalidateQueries({ queryKey: ["history"] });
    }
  });
}

export interface SopDraft {
  id: string;
  title: string;
  category: SopCategory;
  assets: string[];
  body: string;
}

export function useCreateSop() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: SopDraft) => api<Sop>("/api/v1/sops", { method: "POST", body: draft }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["sops"] })
  });
}
