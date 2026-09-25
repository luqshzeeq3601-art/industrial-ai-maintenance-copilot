import { Link } from "react-router";
import type { AssetStatus, FleetHealth } from "../../api/models";
import { ASSET_STATUS } from "../../lib/status";
import { Card, CardHeader } from "../ui/Card";
import { ErrorState, Skeleton } from "../ui/States";

const SEGMENTS: { key: AssetStatus; color: string }[] = [
  { key: "operational", color: "var(--color-status-ok)" },
  { key: "maintenance", color: "var(--color-status-maint)" },
  { key: "fault", color: "var(--color-status-fault)" },
  { key: "offline", color: "var(--color-status-off)" }
];

interface FleetHealthCardProps {
  data: FleetHealth | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/** Share of the fleet in each state. Each legend row links to the filtered asset list. */
export function FleetHealthCard({ data, isLoading, error, onRetry }: FleetHealthCardProps) {
  const total = data?.total_units ?? 0;
  const size = 144;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Each segment starts where the previous one ended
  const arcs = SEGMENTS.reduce<{ key: AssetStatus; color: string; len: number; start: number }[]>((acc, seg) => {
    const n = data?.status_distribution[seg.key] ?? 0;
    const start = acc.length ? acc[acc.length - 1]!.start + acc[acc.length - 1]!.len : 0;
    return [...acc, { ...seg, len: total ? (n / total) * c : 0, start }];
  }, []);

  return (
    <Card aria-labelledby="fleet-health-heading" className="flex flex-col">
      <CardHeader id="fleet-health-heading" title="Fleet health" subtitle="Current asset state" />
      <div className="flex-1 px-5 pb-5">
        {error && !data ? (
          <ErrorState compact title="Fleet health didn't load" message={error.message} onRetry={onRetry} />
        ) : isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${total} assets by state`}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-wash)" strokeWidth={stroke} />
                {arcs.map((seg) => {
                  if (!seg.len) return null;
                  // 2px surface gap between segments
                  const dash = Math.max(seg.len - (seg.len < c - 0.01 ? 2 : 0), 0);
                  return (
                    <circle
                      key={seg.key}
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${dash} ${c - dash}`}
                      strokeDashoffset={-seg.start}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-data text-kpi font-semibold text-ink">{total}</span>
                <span className="text-meta text-body">assets</span>
              </div>
            </div>
            <ul className="w-full min-w-0">
              {SEGMENTS.map((seg) => {
                const n = data.status_distribution[seg.key] ?? 0;
                const pct = total ? Math.round((n / total) * 100) : 0;
                const meta = ASSET_STATUS[seg.key];
                return (
                  <li key={seg.key}>
                    <Link
                      to={`/assets?status=${seg.key}`}
                      className="flex items-center gap-3 h-10 px-2 -mx-2 rounded-md text-small hover:bg-sunken"
                    >
                      <meta.icon className="w-4 h-4 shrink-0" style={{ color: seg.color }} aria-hidden="true" />
                      <span className="flex-1 min-w-0 truncate text-ink">{meta.label}</span>
                      <span className="font-data font-semibold text-ink">{n}</span>
                      <span className="w-11 text-right font-data text-body">{pct}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
