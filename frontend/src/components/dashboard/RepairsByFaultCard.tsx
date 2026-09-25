import type { FaultCategories } from "../../api/models";
import { formatHours, humanize } from "../../lib/format";
import { Card, CardHeader } from "../ui/Card";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";

interface RepairsByFaultCardProps {
  data: FaultCategories | undefined;
  periodLabel: string;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/** Repairs logged per fault category in the selected period: one hue, sorted by count, values labelled. */
export function RepairsByFaultCard({ data, periodLabel, isLoading, error, onRetry }: RepairsByFaultCardProps) {
  const rows = [...(data?.incident_breakdown ?? [])].sort((a, b) => b.occurrences - a.occurrences);
  const max = Math.max(1, ...rows.map((r) => r.occurrences));

  return (
    <Card aria-labelledby="repairs-heading" className="flex flex-col">
      <CardHeader id="repairs-heading" title="Repairs by fault type" subtitle={`Logged repairs, ${periodLabel}`} />
      <div className="flex-1 px-5 pb-5">
        {error && !data ? (
          <ErrorState compact title="Repairs didn't load" message={error.message} onRetry={onRetry} />
        ) : isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : rows.length === 0 ? (
          <EmptyState title="No repairs in this period" message="Choose a longer time range to compare fault types." />
        ) : (
          <table className="w-full text-small">
            <caption className="sr-only">Repairs and downtime by fault category, {periodLabel}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Fault category</th>
                <th scope="col">Share of repairs</th>
                <th scope="col">Repairs</th>
                <th scope="col">Downtime</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category} title={`${formatHours((row.total_downtime_mins ?? 0) / 60, 1)} downtime`}>
                  <th scope="row" className="py-1.5 pr-3 w-[34%] text-left font-normal text-ink whitespace-nowrap">
                    {humanize(row.category)}
                  </th>
                  <td className="py-1.5">
                    <div className="h-3 rounded-r-[4px] bg-accent" style={{ width: `${(row.occurrences / max) * 100}%` }} aria-hidden="true" />
                  </td>
                  <td className="py-1.5 pl-3 w-10 text-right font-data font-semibold text-ink">{row.occurrences}</td>
                  <td className="sr-only">{formatHours((row.total_downtime_mins ?? 0) / 60, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
