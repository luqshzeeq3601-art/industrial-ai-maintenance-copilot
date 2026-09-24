import { useState, type KeyboardEvent } from "react";
import { ChevronRight, MapPin, Search, X } from "lucide-react";
import type { EquipmentData } from "./OperatingHoursBarChart";
import { formatLocation } from "../workspace/types";
import { EquipmentSchematicIcon } from "../workspace/EquipmentSchematicIcon";

export type AndonFilter = "all" | "fault" | "maintenance" | "operational";

interface AndonStripProps {
  equipment: EquipmentData[];
  selectedId?: string;
  onSelect: (machineId: string) => void;
  filter: AndonFilter;
  onFilterChange: (filter: AndonFilter) => void;
}

const FILTERS: { id: AndonFilter; label: string; dot?: string; activeClass: string }[] = [
  { id: "all", label: "All", activeClass: "bg-blue-600 text-white border-blue-600 shadow-xs" },
  { id: "fault", label: "Fault", dot: "bg-status-fault", activeClass: "bg-red-600 text-white border-red-600 shadow-xs" },
  { id: "maintenance", label: "Maintenance", dot: "bg-status-maint", activeClass: "bg-amber-600 text-white border-amber-600 shadow-xs" },
  { id: "operational", label: "Running", dot: "bg-status-ok", activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs" }
];

const CARD_STATUS_STYLE: Record<
  string,
  {
    border: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
    dot: string;
    label: string;
  }
> = {
  fault: {
    border: "border-red-300 ring-1 ring-red-200/60 bg-red-50/20 hover:bg-red-50/40",
    pillBg: "bg-red-50",
    pillText: "text-red-700",
    pillBorder: "border-red-200",
    dot: "bg-status-fault",
    label: "Fault"
  },
  maintenance: {
    border: "border-amber-300 ring-1 ring-amber-200/60 bg-amber-50/20 hover:bg-amber-50/40",
    pillBg: "bg-amber-50",
    pillText: "text-amber-800",
    pillBorder: "border-amber-200",
    dot: "bg-status-maint",
    label: "Maintenance"
  },
  operational: {
    border: "border-slate-200 hover:border-slate-300 hover:shadow-xs bg-white",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    pillBorder: "border-emerald-200",
    dot: "bg-status-ok",
    label: "Running"
  }
};

/** Shop-floor Andon board: equipment grid with authentic CAD schematic thumbnails and status telemetry. */
export function AndonStrip({ equipment, selectedId, onSelect, filter, onFilterChange }: AndonStripProps) {
  const [query, setQuery] = useState("");
  const count = (id: AndonFilter) =>
    id === "all" ? equipment.length : equipment.filter((e) => e.status.toLowerCase() === id).length;

  const onFilterKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = FILTERS[(idx + step + FILTERS.length) % FILTERS.length];
    onFilterChange(next.id);
    (e.currentTarget.parentElement?.querySelector(`[data-filter="${next.id}"]`) as HTMLElement | null)?.focus();
  };

  const q = query.trim().toLowerCase();
  const visible = equipment.filter(
    (e) =>
      (filter === "all" || e.status.toLowerCase() === filter) &&
      (!q || `${e.machine_id} ${e.name} ${e.location} ${e.type}`.toLowerCase().includes(q))
  );

  return (
    <section aria-labelledby="andon-heading" className="bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="mr-auto flex items-baseline gap-2.5">
          <h2 id="andon-heading" className="text-heading font-bold text-ink tracking-tight">Andon board</h2>
          <span className="text-small text-muted tabular-nums font-normal">{equipment.length} assets</span>
        </div>

        <div role="radiogroup" aria-label="Show assets by status" className="flex flex-wrap gap-1.5 sm:gap-2">
          {FILTERS.map(({ id, label, dot, activeClass }, idx) => {
            const on = filter === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                data-filter={id}
                onClick={() => onFilterChange(id)}
                onKeyDown={(e) => onFilterKey(e, idx)}
                className={`inline-flex items-center gap-1.5 min-h-[34px] pointer-coarse:min-h-[44px] px-3 rounded-lg border text-small font-medium transition-all cursor-pointer ${
                  on ? activeClass : "bg-panel text-body border-line hover:bg-sunken hover:border-line-strong"
                }`}
              >
                {dot && <span className={`w-2 h-2 rounded-full ${dot} ${id === "fault" && count("fault") > 0 && !on ? "animate-pulse" : ""}`} aria-hidden="true" />}
                {label}
                <span className={`tabular-nums text-meta font-semibold ${on ? "opacity-90" : "text-muted"}`}>{count(id)}</span>
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
            placeholder="Search equipment..."
            autoComplete="off"
            className="w-full min-h-[34px] pointer-coarse:min-h-[44px] pl-9 pr-9 rounded-lg bg-sunken border border-line text-title sm:text-small text-ink placeholder:text-subtle focus:bg-panel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-subtle hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5 py-10 text-center" role="status">
          <p className="text-copy font-medium text-ink">No assets match this view.</p>
          <p className="text-small text-muted mt-1">Try another status or clear the search to see the whole fleet.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onFilterChange("all");
            }}
            className="mt-3 min-h-[36px] px-4 rounded-md border border-line-strong text-small font-medium text-ink hover:bg-sunken cursor-pointer"
          >
            Show all assets
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
          {visible.map((eq) => {
            const statusKey = eq.status.toLowerCase();
            const badge = CARD_STATUS_STYLE[statusKey] ?? CARD_STATUS_STYLE.operational;
            const selected = eq.machine_id === selectedId;

            return (
              <li key={eq.machine_id}>
                <button
                  type="button"
                  onClick={() => onSelect(eq.machine_id)}
                  aria-label={`${eq.machine_id} ${eq.name}, ${badge.label}, ${eq.location}, ${eq.operating_hours.toLocaleString()} hours. Open asset.`}
                  className={`group w-full h-full p-3 sm:p-3.5 rounded-xl border ${badge.border} text-left transition-all cursor-pointer ${
                    selected ? "border-accent ring-2 ring-accent/30 shadow-xs" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Bespoke CAD vector schematic machine thumbnail */}
                    <EquipmentSchematicIcon
                      machineId={eq.machine_id}
                      name={eq.name}
                      type={eq.type}
                      status={eq.status}
                      size="sm"
                      className="mt-0.5"
                    />

                    <div className="min-w-0 flex-1">
                      {/* Machine ID and Status pill */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-label font-bold text-muted tracking-tight">
                          {eq.machine_id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-semibold border ${badge.pillBg} ${badge.pillText} ${badge.pillBorder} shrink-0`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} ${statusKey === "fault" ? "animate-pulse" : ""}`} />
                          <span>{badge.label}</span>
                          <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                        </span>
                      </div>

                      {/* Equipment Name */}
                      <p className="mt-1 text-small font-bold text-ink truncate group-hover:text-accent transition-colors leading-snug">
                        {eq.name}
                      </p>

                      {/* Location with MapPin icon */}
                      <p className="mt-0.5 flex items-center gap-1 text-meta text-muted truncate">
                        <MapPin className="w-3 h-3 text-subtle shrink-0" aria-hidden="true" />
                        <span className="truncate">{formatLocation(eq.location)}</span>
                      </p>

                      {/* Run hours */}
                      <p className="mt-1 text-meta font-mono font-medium text-body tabular-nums">
                        {eq.operating_hours.toLocaleString()} h
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

