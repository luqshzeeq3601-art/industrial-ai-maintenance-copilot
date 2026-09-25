import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { HistoryPage } from "../../api/models";
import { formatShortDateTime } from "../../lib/format";
import { Card, CardHeader } from "../ui/Card";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";
import { EVENT_META } from "../history/eventMeta";

interface RecentActivityCardProps {
  data: HistoryPage | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  /** Heading level inside the page (h2 on the dashboard, h3 inside a tab). */
  title?: string;
  viewAllHref?: string;
}

export function RecentActivityCard({ data, isLoading, error, onRetry, title = "Recent activity", viewAllHref = "/history" }: RecentActivityCardProps) {
  return (
    <Card aria-labelledby="recent-activity-heading" className="flex flex-col">
      <CardHeader
        id="recent-activity-heading"
        title={title}
        action={
          <Link to={viewAllHref} className="inline-flex items-center gap-1.5 h-10 px-2 text-small font-semibold text-accent hover:text-accent-hover">
            View all
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        }
      />
      <div className="flex-1 px-5 pb-4">
        {error && !data ? (
          <ErrorState compact title="Activity didn't load" message={error.message} onRetry={onRetry} />
        ) : isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : data.events.length === 0 ? (
          <EmptyState title="No activity yet" message="Alarms, work orders, and maintenance appear here as they happen." />
        ) : (
          <ul className="divide-y divide-line">
            {data.events.map((e, i) => {
              const meta = EVENT_META[e.type];
              return (
                <li key={`${e.time}-${e.ref}-${i}`} className="flex items-center gap-3 py-2.5">
                  <meta.icon className={`w-4 h-4 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
                  <span className="sr-only">{meta.label}:</span>
                  <time className="w-[92px] shrink-0 font-data text-label text-body">{formatShortDateTime(e.time)}</time>
                  <span className="flex-1 min-w-0 truncate text-meta text-ink" title={e.description}>
                    {e.description}
                  </span>
                  {e.machine_id && <span className="shrink-0 font-data text-label text-body">{e.machine_id}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
