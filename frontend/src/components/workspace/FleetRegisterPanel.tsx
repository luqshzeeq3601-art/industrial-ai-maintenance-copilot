import { useEffect, useRef, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { OVERHAUL_THRESHOLD, statusMeta } from "./types";

interface FleetRegisterPanelProps {
  equipment: EquipmentData[];
  selectedId: string;
  onSelect: (machineId: string) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
}

// Exceptions sort above the healthy fleet so a fault is never scrolled out of sight
const STATUS_ORDER: Record<string, number> = { fault: 0, maintenance: 1 };

export function FleetRegisterPanel({
  equipment,
  selectedId,
  onSelect,
  searchFilter,
  onSearchChange
}: FleetRegisterPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the selected asset visible when it is chosen elsewhere (dashboard, Andon board)
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-asset="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  // Arrow keys move focus between rows; Enter/Space selects
  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-asset]") ?? [])];
    if (!rows.length) return;
    e.preventDefault();
    const i = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)));
    rows[next].focus();
  };

  const q = searchFilter.trim().toLowerCase();
  const filtered = equipment.filter(
    (eq) =>
      eq.machine_id.toLowerCase().includes(q) ||
      eq.name.toLowerCase().includes(q) ||
      eq.location.toLowerCase().includes(q)
  );
  const rank = (eq: EquipmentData) => STATUS_ORDER[eq.status.toLowerCase()] ?? 2;
  const groups = [
    { id: "attention", title: "Needs attention", items: filtered.filter((eq) => rank(eq) < 2).sort((a, b) => rank(a) - rank(b)) },
    { id: "running", title: "Running", items: filtered.filter((eq) => rank(eq) === 2) }
  ].filter((g) => g.items.length > 0);

  return (
    <aside
      aria-label="Fleet register"
      className="w-full h-full flex flex-col bg-panel rounded-xl border border-line shadow-[var(--shadow-tinted-xs)] overflow-hidden"
    >
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="text-[15px] font-semibold text-ink">Fleet</h2>
          <span className="text-[13px] text-muted tabular-nums" aria-live="polite">
            {q ? `${filtered.length} of ${equipment.length}` : `${equipment.length} assets`}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" aria-hidden="true" />
          <label htmlFor="fleet-filter" className="sr-only">
            Search fleet by ID, model, or location
          </label>
          <input
            id="fleet-filter"
            type="search"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ID, model, location"
            autoComplete="off"
            className="w-full min-h-[40px] bg-sunken border border-line rounded-lg pl-9 pr-10 text-[13px] text-ink placeholder:text-subtle hover:border-line-strong focus:outline-none focus:bg-panel focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-0 top-0 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-subtle hover:text-ink cursor-pointer"
              aria-label="Clear fleet search"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <ul ref={listRef} onKeyDown={onListKey} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 pb-3">
        {groups.map((group) => (
          <li key={group.id} className="mt-3 first:mt-0">
            <h3 className="flex items-baseline justify-between px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">
              {group.title}
              <span className="tabular-nums">{group.items.length}</span>
            </h3>
            <ul>
              {group.items.map((item) => {
                const isSelected = item.machine_id === selectedId;
                const status = statusMeta(item.status);
                const isFault = item.status.toLowerCase() === "fault";
                const isException = rank(item) < 2;
                const isOverdue = item.operating_hours > OVERHAUL_THRESHOLD;

                return (
                  <li key={item.machine_id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.machine_id)}
                      data-asset={item.machine_id}
                      aria-pressed={isSelected}
                      aria-label={`${item.name}, ${item.machine_id}, ${item.location}, ${status.label}, ${item.operating_hours.toLocaleString()} run hours${isOverdue ? ", service overdue" : ""}`}
                      className={`w-full grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center min-h-[52px] px-2 py-2 text-left rounded-md cursor-pointer transition-colors focus-visible:outline-offset-[-2px] ${
                        isSelected ? "bg-accent-bg shadow-[inset_3px_0_0_var(--color-accent)]" : "hover:bg-sunken"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-[14px] font-medium truncate ${isSelected ? "text-accent-ink" : "text-ink"}`}>
                          {item.name}
                        </span>
                        <span className="block font-mono text-[12px] text-muted">{item.machine_id}</span>
                      </span>
                      <span className="flex flex-col items-end">
                        {isException && (
                          <span className={`flex items-center gap-1.5 text-[12px] font-medium ${isFault ? "text-danger" : "text-warn"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                            {status.label}
                          </span>
                        )}
                        <span
                          className={`text-[12px] tabular-nums ${isOverdue ? "text-warn" : "text-muted"}`}
                          title={isOverdue ? `Past the ${OVERHAUL_THRESHOLD.toLocaleString()} h service interval` : "Run hours"}
                        >
                          {item.operating_hours.toLocaleString()} h
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="px-6 py-10 text-center" role="status">
            <p className="text-[13px] font-medium text-ink">No assets match "{searchFilter.trim()}".</p>
            <p className="text-[12px] text-muted mt-1">Search by asset ID, model name, or location.</p>
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="mt-3 min-h-[40px] px-4 rounded-lg border border-line-strong text-[13px] font-medium text-ink hover:bg-sunken cursor-pointer"
            >
              Clear search
            </button>
          </li>
        )}
      </ul>
    </aside>
  );
}
