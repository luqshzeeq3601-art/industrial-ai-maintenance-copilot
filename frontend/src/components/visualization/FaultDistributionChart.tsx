import { Code2, Cog, Droplets, Wind, Wrench, Zap, type LucideIcon } from "lucide-react";

interface FaultDistributionChartProps {
  categories: Array<{ category: string; count: number }>;
  incidents: Array<{ category: string; occurrences: number; total_downtime_mins: number }>;
  severities: Array<{ severity: string; count: number }>;
  /** Reporting period the repair counts cover, e.g. "30 days". */
  periodLabel?: string;
  periodDelta?: React.ReactNode;
}

const CATEGORY: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  electrical: { label: "Electrical", icon: Zap, color: "var(--color-category-electrical)" },
  hydraulic: { label: "Hydraulic", icon: Droplets, color: "var(--color-category-hydraulic)" },
  mechanical: { label: "Mechanical", icon: Cog, color: "var(--color-category-mechanical)" },
  pneumatic: { label: "Pneumatic", icon: Wind, color: "var(--color-category-pneumatic)" },
  software: { label: "Software / PLC", icon: Code2, color: "var(--color-category-software)" }
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];
const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-danger-bg text-danger-ink",
  high: "bg-warn-bg text-warn-ink",
  medium: "bg-accent-bg text-accent-ink",
  low: "bg-wash text-body"
};

/** Repairs logged per fault category, plus the severity mix of known fault codes. */
export function FaultDistributionChart({ categories, incidents, severities, periodLabel, periodDelta }: FaultDistributionChartProps) {
  const totalCodes = categories.reduce((sum, c) => sum + c.count, 0);
  const rows = [...incidents].sort((a, b) => b.occurrences - a.occurrences);
  const max = Math.max(1, ...rows.map((r) => r.occurrences));
  const sev = SEVERITY_ORDER.map((s) => ({ s, n: severities.find((x) => x.severity === s)?.count ?? 0 }));

  return (
    <section aria-labelledby="fault-ledger-heading" className="h-full flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="fault-ledger-heading" className="text-section font-semibold text-ink">Repairs by fault type</h2>
        <div className="flex items-center gap-2">
          {periodDelta ? (
            <span className="text-small text-muted">{periodDelta}</span>
          ) : periodLabel ? (
            <span className="text-small text-muted">{periodLabel}</span>
          ) : null}
          <span className="text-small text-muted tabular-nums">{totalCodes} fault codes</span>
        </div>
      </div>
      <p className="mt-1 text-small text-muted">{totalCodes} known fault codes; bars count repairs logged against them.</p>

      {rows.length === 0 ? (
        <p className="flex-1 mt-4 text-small text-muted">No repairs were logged against known fault codes in this period.</p>
      ) : (
        <ul className="flex-1 mt-4 space-y-3.5">
          {rows.map((row) => {
            const meta = CATEGORY[row.category] ?? { label: row.category, icon: Wrench, color: "var(--color-muted)" };
            const Icon = meta.icon;
            const hours = Math.round(row.total_downtime_mins / 60);
            return (
              <li
                key={row.category}
                className="grid grid-cols-[132px_minmax(0,1fr)_40px] items-center gap-3 text-copy"
                title={`${row.occurrences} repairs, ${hours.toLocaleString()} h downtime`}
              >
                <span className="flex items-center gap-2 min-w-0 text-body">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} aria-hidden="true" />
                  <span className="truncate capitalize">{meta.label}</span>
                </span>
                <span className="h-2 rounded-full bg-wash overflow-hidden" aria-hidden="true">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(row.occurrences / max) * 100}%`, background: meta.color }}
                  />
                </span>
                <span className="text-right font-mono font-semibold text-ink tabular-nums text-meta">
                  {row.occurrences}
                  <span className="sr-only"> repairs, {hours} hours downtime</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 pt-3 border-t border-line">
        <p className="text-small text-muted">Fault codes by severity</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {sev.map(({ s, n }) => (
            <li key={s} className={`inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-small font-medium capitalize ${SEVERITY_STYLE[s]}`}>
              {s}
              <span className="font-semibold tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
