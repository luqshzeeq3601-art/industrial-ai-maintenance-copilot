import { useEffect, useRef, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { EquipmentSchematicIcon } from "./EquipmentSchematicIcon";
import { OVERHAUL_THRESHOLD, formatLocation, statusMeta } from "./types";

interface FleetRegisterPanelProps {
  equipment: EquipmentData[];
  selectedId: string;
  onSelect: (machineId: string) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string | null;
  onStatusFilterChange?: (status: string | null) => void;
}

// Exceptions sort above the healthy fleet so a fault is never scrolled out of sight
const STATUS_ORDER: Record<string, number> = { fault: 0, maintenance: 1 };

export function FleetRegisterPanel({
  equipment,
  selectedId,
  onSelect,
  searchFilter,
  onSearchChange,
  statusFilter = null,
  onStatusFilterChange
}: FleetRegisterPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the selected asset visible when it is chosen elsewhere (dashboard, Andon board)
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-asset="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  // Global shortcut '/' to focus search input from anywhere
  useEffect(() => {
    const onGlobalKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        const searchInput = document.getElementById("fleet-filter") as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

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
  const filtered = equipment.filter((eq) => {
    const matchesSearch =
      eq.machine_id.toLowerCase().includes(q) ||
      eq.name.toLowerCase().includes(q) ||
      eq.location.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || eq.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const rank = (eq: EquipmentData) => STATUS_ORDER[eq.status.toLowerCase()] ?? 2;
  const groups = [
    { id: "attention", title: "Needs attention", items: filtered.filter((eq) => rank(eq) < 2).sort((a, b) => rank(a) - rank(b)) },
    { id: "running", title: "Running", items: filtered.filter((eq) => rank(eq) === 2) }
  ].filter((g) => g.items.length > 0);

  return (
    <aside
      aria-label="Fleet register"
      className="@container w-full h-full flex flex-col bg-panel rounded-lg border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden"
    >
      <div className="px-3.5 pt-4 pb-3 border-b border-line">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-copy font-bold text-ink">Fleet register</h2>
            {statusFilter && (
              <span className="inline-flex items-center gap-0.5 h-6 pl-2 rounded-md text-meta font-medium bg-accent-bg text-accent-ink border border-accent-line">
                {statusMeta(statusFilter).label}
                {onStatusFilterChange ? (
                  <button
                    type="button"
                    onClick={() => onStatusFilterChange(null)}
                    className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 -my-1 flex items-center justify-center rounded-md hover:text-ink cursor-pointer"
                    aria-label={`Clear ${statusMeta(statusFilter).label} filter`}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="pr-2" />
                )}
              </span>
            )}
          </div>
          <span className="text-meta font-mono text-muted tabular-nums" aria-live="polite">
            {q || statusFilter ? `${filtered.length} of ${equipment.length}` : `${equipment.length} units`}
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
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (searchFilter) onSearchChange("");
                else (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search ID, model, location..."
            autoComplete="off"
            className="w-full min-h-[38px] bg-sunken border border-line rounded-lg pl-9 pr-9 text-title sm:text-small text-ink placeholder:text-subtle hover:border-line-strong focus:outline-none focus:bg-panel focus:border-accent focus:ring-1 focus:ring-accent transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchFilter ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-0 top-0 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-md text-subtle hover:text-ink cursor-pointer"
              aria-label="Clear fleet search"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center justify-center h-5 px-1.5 rounded bg-wash border border-line text-label font-mono text-muted select-none pointer-events-none">
              /
            </kbd>
          )}
        </div>
      </div>

      <ul ref={listRef} onKeyDown={onListKey} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 py-2.5">
        {groups.map((group) => (
          <li key={group.id} className="mt-2.5 first:mt-0">
            <h3 className="flex items-baseline justify-between px-2 pt-1 pb-1 text-label font-semibold text-muted">
              {group.title}
              <span className="tabular-nums text-label font-mono bg-wash px-1.5 py-0.5 rounded text-muted">{group.items.length}</span>
            </h3>
            <ul className="mt-1 space-y-1.5">
              {group.items.map((item) => {
                const isSelected = item.machine_id === selectedId;
                const status = statusMeta(item.status);
                const isFault = item.status.toLowerCase() === "fault";
                const isMaint = item.status.toLowerCase() === "maintenance";
                const isOverdue = item.operating_hours > OVERHAUL_THRESHOLD;
                const hourPct = Math.min(100, Math.round((item.operating_hours / OVERHAUL_THRESHOLD) * 100));

                return (
                  <li key={item.machine_id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.machine_id)}
                      data-asset={item.machine_id}
                      aria-current={isSelected ? "true" : undefined}
                      aria-label={`${item.name}, ${item.machine_id}, ${item.location}, ${status.label}, ${item.operating_hours.toLocaleString()} run hours${isOverdue ? ", service overdue" : ""}`}
                      className={`w-full flex items-center gap-2.5 p-2 text-left rounded-xl cursor-pointer transition-all focus-visible:outline-offset-[-2px] border ${
                        isSelected
                          ? "bg-blue-50/90 border-2 border-blue-600 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Bespoke CAD vector equipment schematic */}
                      <EquipmentSchematicIcon
                        machineId={item.machine_id}
                        name={item.name}
                        type={item.type}
                        status={item.status}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`block text-small font-semibold truncate leading-tight ${isSelected ? "text-blue-900 font-bold" : "text-slate-900"}`}>
                            {item.name}
                          </span>
                          {isFault ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                              <span className="text-[10px]">◆</span> Fault
                            </span>
                          ) : isMaint ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              <span className="text-[10px]">◆</span> Maint
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-ok" /> Running
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-meta text-muted min-w-0">
                          <span className="font-mono text-label font-semibold text-slate-600 whitespace-nowrap shrink-0">{item.machine_id}</span>
                          <span className="text-faint shrink-0" aria-hidden="true">·</span>
                          <span className="truncate text-meta" title={formatLocation(item.location)}>{formatLocation(item.location)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className={`text-label font-mono tabular-nums ${isOverdue ? "font-bold text-danger" : "text-muted"}`}>
                            {item.operating_hours.toLocaleString()} h
                          </span>
                          <div className="w-14 h-1 rounded-full bg-wash overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full ${isOverdue ? "bg-status-fault" : hourPct >= 80 ? "bg-status-maint" : "bg-accent"}`}
                              style={{ width: `${hourPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="px-6 py-10 text-center" role="status">
            <p className="text-small font-medium text-ink">
              {q && statusFilter
                ? `No ${statusMeta(statusFilter).label.toLowerCase()} assets match "${searchFilter.trim()}".`
                : q
                  ? `No assets match "${searchFilter.trim()}".`
                  : `No assets are in ${statusMeta(statusFilter ?? "").label.toLowerCase()} right now.`}
            </p>
            <p className="text-meta text-muted mt-1">{q ? "Search by asset ID, model name, or location." : "Clear the filter to see the whole fleet."}</p>
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                onStatusFilterChange?.(null);
              }}
              className="mt-3 min-h-[40px] px-4 rounded-md border border-line-strong text-small font-medium text-ink hover:bg-sunken cursor-pointer"
            >
              {q && statusFilter ? "Clear search and filter" : q ? "Clear search" : "Clear filter"}
            </button>
          </li>
        )}
      </ul>
    </aside>
  );
}
