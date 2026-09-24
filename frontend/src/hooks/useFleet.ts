import { useCallback, useEffect, useState } from "react";
import { API_BASE, DEMO_DATA, type DataSource, type LoadState } from "../config";
import { DEMO_EQUIPMENT } from "../defaults";
import type { EquipmentData } from "../components/visualization/OperatingHoursBarChart";

interface FleetState {
  equipment: EquipmentData[];
  state: LoadState;
  source: DataSource;
}

/** Registered equipment. An unreachable API is an error unless demo data is enabled. */
export function useFleet() {
  const [fleet, setFleet] = useState<FleetState>({ equipment: [], state: "loading", source: "live" });

  const load = useCallback((signal?: AbortSignal) => {
    fetch(`${API_BASE}/api/equipment`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8_000)]) : AbortSignal.timeout(8_000)
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ equipment?: EquipmentData[] }>;
      })
      .then((data) => setFleet({ equipment: data.equipment ?? [], state: "ready", source: "live" }))
      .catch(() => {
        if (signal?.aborted) return;
        setFleet(
          DEMO_DATA
            ? { equipment: DEMO_EQUIPMENT, state: "ready", source: "demo" }
            : { equipment: [], state: "error", source: "live" }
        );
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => {
    setFleet((f) => ({ ...f, state: "loading" }));
    load();
  }, [load]);

  return { ...fleet, reload };
}

/** URL asset if it exists, else the first faulted asset, else the first asset. */
export function pickDefaultAsset(equipment: EquipmentData[], preferred: string | null): string | null {
  if (preferred && equipment.some((e) => e.machine_id === preferred)) return preferred;
  return (equipment.find((e) => e.status.toLowerCase() === "fault") ?? equipment[0])?.machine_id ?? null;
}
