import { cn } from "../../lib/cn";
import { PRIORITY, TONE_FILL, TONE_SURFACE, TONE_TEXT, type StatusMeta } from "../../lib/status";
import type { Severity } from "../../api/models";

interface StatusLabelProps {
  meta: StatusMeta;
  /** Force a tinted surface; by default only Fault/Maintenance-type states are tinted. */
  tinted?: boolean;
  className?: string;
}

/** Status as icon + short label, readable without color. Tinted only where the state needs attention. */
export function StatusLabel({ meta, tinted = meta.tinted, className }: StatusLabelProps) {
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-meta font-semibold whitespace-nowrap",
        tinted ? cn("h-7 px-2 rounded-md", TONE_SURFACE[meta.tone]) : "text-ink",
        className
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", TONE_TEXT[meta.tone])} strokeWidth={2} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Restrained priority tag: text label with a small tone bar, never a loud pill. */
export function PriorityTag({ priority }: { priority: Severity | string }) {
  const meta = PRIORITY[priority as Severity] ?? { label: priority, tone: "neutral" as const };
  const bars = { critical: 3, high: 3, medium: 2, low: 1 }[priority as Severity] ?? 1;
  return (
    <span className="inline-flex items-center gap-2 text-meta font-medium text-ink whitespace-nowrap">
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-[1px]", i <= bars ? TONE_FILL[meta.tone] : "bg-line")}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </span>
      {meta.label}
    </span>
  );
}
