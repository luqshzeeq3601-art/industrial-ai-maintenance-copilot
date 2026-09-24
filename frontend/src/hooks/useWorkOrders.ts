import { useEffect, useState } from "react";
import { API_BASE, DEMO_DATA, type DataSource, type LoadState } from "../config";
import { demoWorkOrders } from "../defaults";
import type { WorkOrderLog } from "../components/workspace/types";

interface WorkOrdersState {
  machineId: string | null;
  logs: WorkOrderLog[];
  state: LoadState;
  source: DataSource;
}

/** Work order history for one asset; switching assets reads as loading until its own history arrives. */
export function useWorkOrders(machineId: string | null): Omit<WorkOrdersState, "machineId"> {
  const [result, setResult] = useState<WorkOrdersState>({ machineId: null, logs: [], state: "loading", source: "live" });

  useEffect(() => {
    if (!machineId) return;
    const controller = new AbortController();

    fetch(`${API_BASE}/api/equipment/${encodeURIComponent(machineId)}/history`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ logs?: WorkOrderLog[] }>;
      })
      .then((data) =>
        setResult({ machineId, logs: Array.isArray(data.logs) ? data.logs : [], state: "ready", source: "live" })
      )
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult(
          DEMO_DATA
            ? { machineId, logs: demoWorkOrders(machineId), state: "ready", source: "demo" }
            : { machineId, logs: [], state: "error", source: "live" }
        );
      });

    return () => controller.abort();
  }, [machineId]);

  if (result.machineId !== machineId) return { logs: [], state: "loading", source: "live" };
  return { logs: result.logs, state: result.state, source: result.source };
}
