import type { KeyboardEvent } from "react";
import { ChevronRight } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { OVERHAUL_THRESHOLD, splitLocation, statusMeta, type AssetTab } from "./types";

interface AssetHeaderProps {
  machine: EquipmentData;
  onInspectOverdue: () => void;
}

interface AssetTabBarProps {
  machine: EquipmentData;
  activeTab: AssetTab;
  onTabChange: (tab: AssetTab) => void;
  /** Header scrolled out of view: show the asset identity inline so context is never lost. */
  compact: boolean;
}

const ASSET_TABS: { id: AssetTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "sops", label: "SOPs" },
  { id: "logs", label: "Work orders" }
];

const STATUS_BADGE: Record<string, string> = {
  operational: "bg-success-bg text-success-ink",
  maintenance: "bg-warn-bg text-warn-ink",
  fault: "bg-danger-bg text-danger-ink"
};

/**
 * Asset identity, status, and service position. The meter is scaled to whichever is larger,
 * run hours or the service interval, so an overdue asset visibly runs past the service mark.
 */
export function AssetHeader({ machine, onInspectOverdue }: AssetHeaderProps) {
  const status = statusMeta(machine.status);
  const [plant, cell] = splitLocation(machine.location);
  const hours = machine.operating_hours;
  const remaining = OVERHAUL_THRESHOLD - hours;
  const isOverdue = remaining < 0;
  const inWindow = !isOverdue && hours >= OVERHAUL_THRESHOLD * 0.8;

  const scale = Math.max(hours, OVERHAUL_THRESHOLD);
  const markPct = (OVERHAUL_THRESHOLD / scale) * 100;
  const usedPct = (Math.min(hours, OVERHAUL_THRESHOLD) / scale) * 100;
  const overPct = isOverdue ? 100 - markPct : 0;

  const nextService = isOverdue
    ? { text: `${(-remaining).toLocaleString()} h overdue`, tone: "text-danger" }
    : { text: `in ${remaining.toLocaleString()} h`, tone: inWindow ? "text-warn" : "text-ink" };
  const meta = [machine.type, [plant, cell].filter(Boolean).join(", "), `${machine.criticality.charAt(0).toUpperCase()}${machine.criticality.slice(1).toLowerCase()} criticality`];

  return (
    <div className="px-4 @min-[560px]:px-6 pt-5 pb-5 bg-panel">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
            <span className="font-mono font-medium text-body px-1.5 rounded bg-wash">{machine.machine_id}</span>
            {meta.map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-faint" aria-hidden="true" />
                {item}
              </span>
            ))}
          </p>
          <h1 className="mt-1 text-[24px] @min-[560px]:text-[28px] font-semibold text-ink tracking-tight leading-tight break-words">
            {machine.name}
          </h1>
        </div>
        <span
          className={`mt-0.5 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[13px] font-medium shrink-0 ${
            STATUS_BADGE[machine.status.toLowerCase()] ?? "bg-wash text-body"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <dl className="flex gap-x-8">
          <div>
            <dt className="text-[12px] text-muted">Run hours</dt>
            <dd className="mt-0.5 text-[17px] font-semibold text-ink tabular-nums">
              {hours.toLocaleString()}
              <span className="text-[13px] font-normal text-muted"> / {OVERHAUL_THRESHOLD.toLocaleString()} h</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Next service</dt>
            <dd className={`mt-0.5 text-[17px] font-semibold tabular-nums ${nextService.tone}`}>{nextService.text}</dd>
          </div>
        </dl>
        {(isOverdue || inWindow) && (
          <button
            type="button"
            onClick={onInspectOverdue}
            className="inline-flex items-center gap-1 min-h-[36px] -mr-2 px-2 rounded-md text-[13px] font-medium text-accent hover:bg-accent-bg transition-colors cursor-pointer"
          >
            Service checklist
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className="relative mt-3 h-1.5 w-full rounded-full bg-wash"
        role="progressbar"
        aria-valuenow={hours}
        aria-valuemin={0}
        aria-valuemax={OVERHAUL_THRESHOLD}
        aria-label={`${hours.toLocaleString()} of ${OVERHAUL_THRESHOLD.toLocaleString()} service hours used`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-l-full ${inWindow ? "bg-status-maint" : "bg-subtle"} ${isOverdue ? "" : "rounded-r-full"}`}
          style={{ width: `${usedPct}%` }}
        />
        {isOverdue && (
          <div className="absolute inset-y-0 right-0 rounded-r-full bg-status-fault" style={{ width: `${overPct}%` }} />
        )}
        <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ left: `calc(${markPct}% - 1px)` }} aria-hidden="true" />
      </div>
    </div>
  );
}

export function AssetTabBar({ machine, activeTab, onTabChange, compact }: AssetTabBarProps) {
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (idx + (e.key === "ArrowRight" ? 1 : ASSET_TABS.length - 1)) % ASSET_TABS.length;
    onTabChange(ASSET_TABS[next].id);
    document.getElementById(`asset-tab-${ASSET_TABS[next].id}`)?.focus();
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-2 @min-[560px]:px-3 bg-panel border-b border-line">
      {compact && (
        <p className="flex items-center gap-2 pl-2 min-w-0 shrink animate-fade-in" aria-hidden="true">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusMeta(machine.status).dot}`} />
          <span className="hidden @min-[600px]:block text-[13px] font-semibold text-ink truncate">{machine.name}</span>
        </p>
      )}
      <div role="tablist" aria-label="Asset views" className="flex gap-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
        {ASSET_TABS.map(({ id, label }, idx) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`asset-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="asset-tabpanel"
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(id)}
              onKeyDown={(e) => onTabKey(e, idx)}
              className={`relative min-h-[44px] px-2 @min-[400px]:px-3 @min-[560px]:px-4 text-[13px] @min-[400px]:text-[14px] whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-offset-[-2px] ${
                active ? "font-medium text-ink" : "font-medium text-muted hover:text-ink"
              }`}
            >
              {label}
              {active && <span className="absolute left-2 right-2 @min-[400px]:left-3 @min-[400px]:right-3 @min-[560px]:left-4 @min-[560px]:right-4 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
