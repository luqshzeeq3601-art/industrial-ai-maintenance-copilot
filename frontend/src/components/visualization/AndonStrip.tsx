import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import type { EquipmentData } from "./OperatingHoursBarChart";
import { MachineThumbnail3D } from "./MachineThumbnail3D";

export type AndonFilter = "all" | "fault" | "maintenance" | "operational";

interface AndonStripProps {
  equipment: EquipmentData[];
  selectedId?: string;
  onSelect: (machineId: string) => void;
  filter: AndonFilter;
  onFilterChange: (filter: AndonFilter) => void;
}

const FILTERS: { id: AndonFilter; label: string; dot?: string }[] = [
  { id: "all", label: "All" },
  { id: "fault", label: "Fault", dot: "bg-status-fault" },
  { id: "maintenance", label: "Maintenance", dot: "bg-status-maint" },
  { id: "operational", label: "Running", dot: "bg-status-ok" }
];

const BADGE: Record<string, { label: string; text: string; dot: string; edge: string }> = {
  fault: { label: "Fault", text: "text-danger", dot: "bg-status-fault", edge: "border-l-status-fault" },
  maintenance: { label: "Maintenance", text: "text-warn", dot: "bg-status-maint", edge: "border-l-status-maint" },
  operational: { label: "Running", text: "text-muted", dot: "bg-status-ok", edge: "border-l-line" }
};

/** "Plant A Cell 1" → "Plant A, Cell 1"; other formats pass through. */
function formatLocation(loc: string): string {
  const m = loc.match(/^(Plant\s+\S+)\s+(.+)$/i);
  return m ? `${m[1]}, ${m[2]}` : loc;
}

/** Shop-floor Andon board: one tile per asset; faults and maintenance carry a coloured edge. */
export function AndonStrip({ equipment, selectedId, onSelect, filter, onFilterChange }: AndonStripProps) {
  const [query, setQuery] = useState("");
  const count = (id: AndonFilter) =>
    id === "all" ? equipment.length : equipment.filter((e) => e.status.toLowerCase() === id).length;

  const q = query.trim().toLowerCase();
  const visible = equipment.filter(
    (e) =>
      (filter === "all" || e.status.toLowerCase() === filter) &&
      (!q || `${e.machine_id} ${e.name} ${e.location} ${e.type}`.toLowerCase().includes(q))
  );

  return (
    <section aria-labelledby="andon-heading" className="bg-panel border border-line rounded-xl shadow-[var(--shadow-tinted-xs)] p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="mr-auto flex items-baseline gap-2.5">
          <h2 id="andon-heading" className="text-[16px] font-semibold text-ink">Andon board</h2>
          <span className="text-[13px] text-muted tabular-nums">{equipment.length} assets</span>
        </div>

        <div role="radiogroup" aria-label="Show assets by status" className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label, dot }) => {
            const on = filter === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onFilterChange(id)}
                className={`inline-flex items-center gap-2 min-h-[36px] pointer-coarse:min-h-[44px] px-3 rounded-md border text-[13px] font-medium transition-colors cursor-pointer ${
                  on ? "bg-accent-bg text-accent-ink border-accent-line" : "bg-panel text-body border-line hover:bg-sunken"
                }`}
              >
                {dot && <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />}
                {label}
                <span className={`tabular-nums ${on ? "" : "text-muted"}`}>{count(id)}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-[220px]">
          <label htmlFor="andon-search" className="sr-only">Search equipment</label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" aria-hidden="true" />
          <input
            id="andon-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search equipment"
            autoComplete="off"
            className="w-full min-h-[36px] pointer-coarse:min-h-[44px] pl-9 pr-9 rounded-md bg-sunken border border-line text-[13px] text-ink placeholder:text-subtle focus:bg-panel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-subtle hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5 py-10 text-center" role="status">
          <p className="text-[14px] font-medium text-ink">No assets match this view.</p>
          <p className="text-[13px] text-muted mt-1">Try another status or clear the search to see the whole fleet.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onFilterChange("all");
            }}
            className="mt-3 min-h-[36px] px-4 rounded-md border border-line-strong text-[13px] font-medium text-ink hover:bg-sunken cursor-pointer"
          >
            Show all assets
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,252px),1fr))] gap-2.5">
          {visible.map((eq) => {
            const badge = BADGE[eq.status.toLowerCase()] ?? { label: eq.status, text: "text-muted", dot: "bg-faint", edge: "border-l-line" };
            const selected = eq.machine_id === selectedId;
            return (
              <li key={eq.machine_id}>
                <button
                  type="button"
                  onClick={() => onSelect(eq.machine_id)}
                  aria-label={`${eq.machine_id} ${eq.name}, ${badge.label}, ${eq.location}, ${eq.operating_hours.toLocaleString()} hours. Open asset.`}
                  className={`group w-full h-full block p-3 rounded-md border border-l-[3px] ${badge.edge} bg-panel text-left transition-colors cursor-pointer hover:bg-sunken ${
                    selected ? "border-accent ring-2 ring-accent/20" : "border-line"
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    <span className="w-14 h-14 shrink-0 rounded-md border border-line bg-sunken flex items-center justify-center" aria-hidden="true">
                      <MachineThumbnail3D name={eq.name} type={eq.type} className="w-full h-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[13px] font-semibold text-ink whitespace-nowrap">{eq.machine_id}</span>
                        <span className={`inline-flex items-center gap-1 text-[12px] font-medium shrink-0 ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                          {badge.label}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[13px] font-medium text-ink">
                        <span className="min-w-0 flex-1 truncate">{eq.name}</span>
                        <ChevronRight className="w-4 h-4 shrink-0 text-subtle group-hover:text-accent" aria-hidden="true" />
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted truncate">{formatLocation(eq.location)}</span>
                      <span className="mt-0.5 block text-[12px] text-body tabular-nums">{eq.operating_hours.toLocaleString()} h</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
