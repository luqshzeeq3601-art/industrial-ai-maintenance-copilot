interface StatusFilterBarProps {
  total: number;
  running: number;
  faults: number;
  maintenance: number;
  active: string | null;
  onToggle: (status: string) => void;
}

/** Plant status counts in the header; each count filters the fleet register. */
export function StatusFilterBar({ total, running, faults, maintenance, active, onToggle }: StatusFilterBarProps) {
  const items = [
    { id: "operational", label: "Running", value: `${running}/${total}`, dot: "bg-status-ok", activeBg: "bg-emerald-50 text-emerald-700 border-emerald-300" },
    { id: "fault", label: "Faults", value: faults, dot: "bg-status-fault", activeBg: "bg-red-50 text-red-700 border-red-300", tone: faults ? "text-danger font-bold" : "text-ink" },
    { id: "maintenance", label: "Maintenance", value: maintenance, dot: "bg-status-maint", activeBg: "bg-amber-50 text-amber-700 border-amber-300" }
  ];

  return (
    <div
      className="hidden sm:flex items-center gap-2 text-small"
      role="group"
      aria-label="Filter the fleet register by status"
    >
      {items.map(({ id, label, value, dot, activeBg, tone }) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            aria-pressed={on}
            className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-small font-medium cursor-pointer transition-all ${
              on
                ? `${activeBg} shadow-xs font-semibold ring-1 ring-accent/20`
                : "bg-panel border-line text-muted hover:text-ink hover:bg-sunken hover:border-line-strong"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${dot} ${id === "fault" && faults > 0 ? "animate-pulse" : ""}`} aria-hidden="true" />
            <span className="sr-only md:not-sr-only">{label}</span>
            <span className={`tabular-nums ${tone ?? "text-ink font-semibold"}`}>{value}</span>
          </button>
        );
      })}
    </div>
  );
}

