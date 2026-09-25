import type { AndonFilter } from "./AndonStrip";

interface FleetHealthDonutProps {
  distribution: Record<string, number>;
  totalUnits: number;
  selected: AndonFilter;
  onSelect: (filter: AndonFilter) => void;
}

const SEGMENTS: { key: Exclude<AndonFilter, "all">; label: string; color: string }[] = [
  { key: "operational", label: "Running", color: "var(--color-status-ok)" },
  { key: "maintenance", label: "Maintenance", color: "var(--color-status-maint)" },
  { key: "fault", label: "Fault", color: "var(--color-status-fault)" }
];

/** Share of the fleet in each state; legend entries filter the Andon board. */
export function FleetHealthDonut({ distribution, totalUnits, selected, onSelect }: FleetHealthDonutProps) {
  const size = 148;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = totalUnits > 1 ? 3 : 0;
  let offset = 0;

  return (
    <section aria-labelledby="fleet-health-heading" className="h-full flex flex-col bg-panel rounded-lg border border-line-strong/70 shadow-[var(--shadow-cockpit)] p-5">
      <h2 id="fleet-health-heading" className="text-section font-semibold text-ink">Fleet health</h2>

      <div className="flex-1 mt-5 flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center justify-center gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-wash)" strokeWidth={stroke} />
            {totalUnits > 0 &&
              SEGMENTS.map((seg) => {
                const n = distribution[seg.key] || 0;
                if (!n) return null;
                const len = (n / totalUnits) * c;
                const dash = Math.max(len - gap, 0);
                const el = (
                  <circle
                    key={seg.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeDashoffset={-offset}
                    opacity={selected === "all" || selected === seg.key ? 1 : 0.3}
                  />
                );
                offset += len;
                return el;
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[26px] font-bold text-ink tabular-nums leading-none">{totalUnits}</span>
            <span className="text-small text-muted mt-1">units</span>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-1">
          {SEGMENTS.map((seg) => {
            const n = distribution[seg.key] || 0;
            const pct = totalUnits ? Math.round((n / totalUnits) * 100) : 0;
            const on = selected === seg.key;
            return (
              <li key={seg.key}>
                <button
                  type="button"
                  onClick={() => onSelect(on ? "all" : seg.key)}
                  aria-pressed={on}
                  title={on ? "Show all assets" : `Show ${seg.label.toLowerCase()} assets on the board`}
                  className={`w-full flex items-center gap-3 min-h-[40px] px-2.5 rounded-lg text-copy text-left transition-colors cursor-pointer ${
                    on ? "bg-sunken" : "hover:bg-sunken"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} aria-hidden="true" />
                  <span className="flex-1 min-w-0 truncate text-body">{seg.label}</span>
                  <span className="font-semibold text-ink tabular-nums">{n}</span>
                  <span className="w-10 shrink-0 text-right text-muted tabular-nums">{pct}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-small">
        <span className="text-muted">Units running</span>
        <span className="font-semibold text-ink tabular-nums">
          {totalUnits ? Math.round(((distribution.operational || 0) / totalUnits) * 100) : 0}%
        </span>
      </div>
    </section>
  );
}
