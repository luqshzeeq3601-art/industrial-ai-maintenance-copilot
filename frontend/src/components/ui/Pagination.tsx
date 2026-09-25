import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the summary: "Showing 1–10 of 48 work orders". */
  noun: string;
}

/** Page numbers with the first, last, and neighbours of the current page; ellipses between gaps. */
function pageList(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ["gap" as const, p] : [p]));
}

export function Pagination({ page, pageSize, total, onPageChange, noun }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const btn =
    "inline-flex items-center justify-center min-w-10 h-10 px-2 rounded-[var(--radius-control)] text-small font-medium tabular " +
    "border border-line bg-panel text-ink hover:bg-sunken cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <nav aria-label={`${noun} pages`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line">
      <p className="text-meta text-body tabular" aria-live="polite">
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)} {noun}
      </p>
      {pages > 1 && (
        <ul className="flex items-center gap-1.5">
          <li>
            <button type="button" className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
          </li>
          {pageList(page, pages).map((p, i) =>
            p === "gap" ? (
              <li key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  className={cn(btn, p === page && "bg-accent-solid border-accent-solid text-white hover:bg-accent-solid-hover")}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Page ${p}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              </li>
            )
          )}
          <li>
            <button type="button" className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}
