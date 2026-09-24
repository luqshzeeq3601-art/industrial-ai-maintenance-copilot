import { FlaskConical } from "lucide-react";

/** Shown whenever sample data stands in for the maintenance API, so it is never mistaken for the plant. */
export function DemoDataBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="status" className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-4 lg:px-5 py-2 bg-warn-bg border-b border-warn-line text-small text-warn-ink">
      <FlaskConical className="w-4 h-4 shrink-0 text-warn" aria-hidden="true" />
      <p className="flex-1 min-w-[200px]">
        <strong className="font-semibold">Demo data.</strong> The maintenance service isn't reachable, so sample assets and
        readings are shown. Nothing here reflects the plant.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[32px] pointer-coarse:min-h-[44px] px-3 rounded-md border border-warn-line bg-panel text-meta font-semibold text-warn-ink hover:bg-warn-bg cursor-pointer"
      >
        Retry connection
      </button>
    </div>
  );
}

/** Inline label for a panel whose content is sample data. */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-warn-line bg-warn-bg text-label font-semibold text-warn-ink">
      <FlaskConical className="w-3 h-3" aria-hidden="true" />
      Demo data
    </span>
  );
}
