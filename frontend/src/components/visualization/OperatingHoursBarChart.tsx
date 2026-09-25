import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { OVERHAUL_THRESHOLD } from "../workspace/types";

export interface EquipmentData {
  machine_id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  operating_hours: number;
  criticality: string;
}

interface OperatingHoursBarChartProps {
  equipment: EquipmentData[];
  onSelectEquipment?: (machineId: string) => void;
  selectedMachineId?: string;
}

const TOP_N = 5;
const CRITICALITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
type SortKey = "hours" | "criticality";

const CRITICALITY: Record<string, string> = {
  critical: "bg-danger-bg text-danger-ink",
  high: "bg-warn-bg text-warn-ink",
  medium: "bg-accent-bg text-accent-ink",
  low: "bg-wash text-body"
};

/** Hours inside the service interval: neutral, amber in the last 20%. Hours past it are drawn red separately. */
function wearBar(hours: number): string {
  return hours >= OVERHAUL_THRESHOLD * 0.8 && hours <= OVERHAUL_THRESHOLD ? "bg-status-maint" : "bg-subtle";
}

/** Assets ranked by operating hours, with criticality, so the next service candidates stand out. */
export function OperatingHoursBarChart({ equipment, onSelectEquipment, selectedMachineId }: OperatingHoursBarChartProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("hours");
  const byHours = (a: EquipmentData, b: EquipmentData) => b.operating_hours - a.operating_hours;
  const ranked = [...equipment].sort(
    sortKey === "hours"
      ? byHours
      : (a, b) => (CRITICALITY_RANK[a.criticality.toLowerCase()] ?? 4) - (CRITICALITY_RANK[b.criticality.toLowerCase()] ?? 4) || byHours(a, b)
  );
  const rows = showAll ? ranked : ranked.slice(0, TOP_N);
  const max = Math.max(OVERHAUL_THRESHOLD, ...ranked.map((e) => e.operating_hours));
  const limitPct = (OVERHAUL_THRESHOLD / max) * 100;
  const overdue = ranked.filter((e) => e.operating_hours > OVERHAUL_THRESHOLD).length;

  return (
    <section aria-labelledby="hours-wear-heading" className="h-full flex flex-col bg-panel rounded-lg border border-line-strong/70 shadow-[var(--shadow-cockpit)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="hours-wear-heading" className="text-section font-semibold text-ink whitespace-nowrap">Operating hours &amp; wear</h2>
        <label className="flex items-center gap-1.5 text-small text-muted">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="min-h-[32px] pointer-coarse:min-h-[44px] pl-2 pr-7 rounded-md border border-line-strong bg-panel text-small text-ink cursor-pointer"
          >
            <option value="hours">Most run hours</option>
            <option value="criticality">Criticality</option>
          </select>
        </label>
      </div>
      <p className={`inline-flex items-center gap-1.5 text-small mt-1 ${overdue ? "text-danger" : "text-muted"}`}>
        {overdue > 0 && <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />}
        {overdue > 0
          ? `${overdue} overdue · ${OVERHAUL_THRESHOLD.toLocaleString()} h limit`
          : `Within ${OVERHAUL_THRESHOLD.toLocaleString()} h limit`}
      </p>

      {rows.length === 0 ? (
        <p className="flex-1 mt-4 text-small text-muted">No assets to rank yet.</p>
      ) : (
        <ol className={`flex-1 mt-3 -mx-2 ${showAll ? "max-h-[360px] overflow-y-auto custom-scrollbar" : ""}`}>
          {rows.map((eq) => {
            const crit = eq.criticality.toLowerCase();
            const selected = eq.machine_id === selectedMachineId;
            return (
              <li key={eq.machine_id}>
                <button
                  type="button"
                  onClick={() => onSelectEquipment?.(eq.machine_id)}
                  disabled={!onSelectEquipment}
                  aria-label={`${eq.machine_id} ${eq.name}, ${eq.operating_hours.toLocaleString()} hours, ${crit} criticality. Open asset.`}
                  className={`w-full px-2 py-2 rounded-lg text-left transition-colors cursor-pointer disabled:cursor-default hover:bg-sunken ${
                    selected ? "bg-sunken" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 text-copy">
                    <span className="font-mono text-meta font-semibold text-ink shrink-0 tabular-nums">{eq.machine_id}</span>
                    <span className="text-small text-muted truncate">{eq.name}</span>
                    <span className={`ml-auto shrink-0 inline-flex h-6 items-center px-2 rounded-md text-meta font-medium capitalize ${CRITICALITY[crit] ?? CRITICALITY.low}`}>
                      {crit}
                    </span>
                    <span className="w-[76px] shrink-0 text-right font-mono font-semibold text-ink tabular-nums text-meta">
                      {eq.operating_hours.toLocaleString()} h
                    </span>
                  </span>
                  <span className="relative mt-1.5 block h-1.5 rounded-full bg-wash" aria-hidden="true">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-l-full ${wearBar(eq.operating_hours)} ${eq.operating_hours > OVERHAUL_THRESHOLD ? "" : "rounded-r-full"}`}
                      style={{ width: `${(Math.min(eq.operating_hours, OVERHAUL_THRESHOLD) / max) * 100}%` }}
                    />
                    {eq.operating_hours > OVERHAUL_THRESHOLD && (
                      <span
                        className="absolute inset-y-0 rounded-r-full bg-status-fault"
                        style={{ left: `${limitPct}%`, width: `${((eq.operating_hours - OVERHAUL_THRESHOLD) / max) * 100}%` }}
                      />
                    )}
                    <span className="absolute -inset-y-0.5 w-0.5 rounded-full bg-ink" style={{ left: `calc(${limitPct}% - 1px)` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {ranked.length > TOP_N && (
        <div className="mt-3 pt-3 border-t border-line flex justify-end text-small">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="min-h-[32px] font-medium text-accent hover:underline cursor-pointer"
          >
            {showAll ? "Show top 5" : `Show all ${ranked.length}`}
          </button>
        </div>
      )}
    </section>
  );
}
