import { useCallback, useEffect, useState } from "react";
import { API_BASE, type LoadState } from "../../config";

export interface WorkOrder {
  work_order_id: string;
  machine_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface Alarm {
  alarm_id: string;
  machine_id: string;
  code: string;
  fault_description: string | null;
  severity: string;
  status: string;
  triggered_at: string;
  notes: string | null;
}

export interface TelemetryEvent {
  event_id: string;
  machine_id: string;
  metric: string;
  severity: string;
  timestamp: string;
  fault_code: string | null;
  value: number;
  unit: string;
  message: string | null;
  created_alarm_id: string | null;
}

export function useCollection<T>(path: string, field: string) {
  const [result, setResult] = useState<{ path: string; revision: number; state: LoadState; items: T[] }>({
    path: "", revision: -1, state: "loading", items: []
  });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}${path}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Record<string, unknown>>;
      })
      .then((payload) => {
        setResult({ path, revision, items: Array.isArray(payload[field]) ? payload[field] as T[] : [], state: "ready" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ path, revision, items: [], state: "error" });
      });
    return () => controller.abort();
  }, [path, field, revision]);

  return result.path === path && result.revision === revision
    ? { items: result.items, state: result.state, reload }
    : { items: [] as T[], state: "loading" as LoadState, reload };
}
