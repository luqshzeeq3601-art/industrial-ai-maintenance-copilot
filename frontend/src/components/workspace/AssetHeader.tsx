import type { KeyboardEvent } from "react";
import { ChevronRight, Clock, Wrench } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { OVERHAUL_THRESHOLD, formatLocation, statusMeta, type AssetTab } from "./types";
import { EquipmentSchematicIcon } from "./EquipmentSchematicIcon";

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
  workOrderCount?: number;
  hasOpenWorkOrder?: boolean;
  sopCount?: number;
}

const ASSET_TABS: { id: AssetTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "sops", label: "SOPs" },
  { id: "logs", label: "Work orders" }
];

/**
 * Asset identity, status, and service position matching Image 2.
 */
export function AssetHeader({ machine, onInspectOverdue }: AssetHeaderProps) {
  const status = statusMeta(machine.status);
  const statusKey = machine.status.toLowerCase();
  const hours = machine.operating_hours;
  const remaining = OVERHAUL_THRESHOLD - hours;
  const isOverdue = remaining < 0;
  const inWindow = !isOverdue && hours >= OVERHAUL_THRESHOLD * 0.8;

  const scale = Math.max(hours, OVERHAUL_THRESHOLD);
  const pct = (value: number) => (value / scale) * 100;
  const markPct = pct(OVERHAUL_THRESHOLD);
  const usedPct = pct(Math.min(hours, OVERHAUL_THRESHOLD));
  const ticks = [0, 0.25, 0.5, 0.75].map((f) => f * OVERHAUL_THRESHOLD);
  const limitLabel = `${OVERHAUL_THRESHOLD.toLocaleString()} h`;

  const nextService = isOverdue
    ? { text: `${(-remaining).toLocaleString()} h overdue`, tone: "text-danger" }
    : { text: `in ${remaining.toLocaleString()} h`, tone: inWindow ? "text-warn" : "text-ink" };

  return (
    <div className="px-4 @min-[560px]:px-6 py-4 @min-[560px]:py-5 bg-panel border-b border-line">
      {/* Top Asset Title Row */}
      <div className="flex items-start gap-4">
        {/* Large CAD vector schematic icon */}
        <EquipmentSchematicIcon
          machineId={machine.machine_id}
          name={machine.name}
          type={machine.type}
          status={machine.status}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-label font-bold text-muted tracking-tight">
                {machine.machine_id}
              </p>
              <h1 className="text-heading @min-[560px]:text-display font-bold text-ink tracking-tight leading-tight break-words mt-0.5">
                {machine.name}
              </h1>
              <p className="text-meta text-muted mt-1">
                {formatLocation(machine.location)}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-1.5 self-start">
              <span
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-small font-semibold border ${
                  statusKey === "fault"
                    ? "bg-danger-bg text-danger border-danger-line"
                    : statusKey === "maintenance"
                      ? "bg-warn-bg text-warn border-warn-line"
                      : "bg-success-bg text-success border-success-line"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status.dot} ${statusKey === "fault" ? "animate-pulse-alarm" : ""}`} aria-hidden="true" />
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Hours & Overhaul Status Card */}
      <div className="mt-4 @min-[560px]:mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-meta font-medium text-slate-500">Total operating hours</p>
              <p className="text-title font-bold text-slate-900 font-mono tabular-nums leading-tight mt-0.5">
                {hours.toLocaleString()}
                <span className="text-meta font-normal text-slate-500 font-sans"> / {limitLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                <Wrench className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-meta font-medium text-slate-500">Overhaul status</p>
                <p className={`text-title font-bold font-mono tabular-nums leading-tight mt-0.5 ${nextService.tone}`}>
                  {nextService.text}
                </p>
              </div>
            </div>

            {(isOverdue || inWindow) && (
              <button
                type="button"
                onClick={onInspectOverdue}
                className="inline-flex items-center gap-1 min-h-[32px] pointer-coarse:min-h-[44px] px-3 rounded-lg text-meta font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:border-blue-400 transition-all cursor-pointer shadow-2xs"
              >
                Service checklist
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Dual-color Progress Bar with Graduated Scale */}
        <div className="relative mt-4">
          <div
            className="relative h-2.5 w-full rounded-full bg-slate-200 overflow-hidden"
            role="meter"
            aria-label="Run hours against the overhaul interval"
            aria-valuemin={0}
            aria-valuemax={scale}
            aria-valuenow={hours}
            aria-valuetext={
              isOverdue
                ? `${hours.toLocaleString()} hours, ${(-remaining).toLocaleString()} past the ${limitLabel} overhaul interval`
                : `${hours.toLocaleString()} of ${limitLabel} before overhaul`
            }
          >
            {/* Blue base progress up to 10k limit */}
            <div className="absolute inset-y-0 left-0 bg-blue-600 rounded-l-full" style={{ width: `${usedPct}%` }} />
            {/* Red overdue progress past 10k limit */}
            {isOverdue && (
              <div
                className="absolute inset-y-0 bg-red-600 rounded-r-full"
                style={{ left: `${markPct}%`, width: `${100 - markPct}%` }}
              />
            )}
          </div>

          {/* Overhaul limit marker */}
          <div className="absolute -top-1 h-4.5 w-0.5 bg-ink" style={{ left: `calc(${markPct}% - 1px)` }} aria-hidden="true">
            <span className="hidden @min-[560px]:block absolute -top-4 -translate-x-1/2 text-label font-mono font-bold text-muted whitespace-nowrap">
              {OVERHAUL_THRESHOLD / 1000}k limit
            </span>
          </div>

          {/* Scale ticks */}
          <div className="hidden @min-[560px]:block relative mt-1.5 h-4 text-label font-mono text-subtle" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className={`absolute ${t === 0 ? "" : "-translate-x-1/2"}`} style={{ left: `${pct(t)}%` }}>
                {t === 0 ? "0 h" : `${t.toLocaleString()} h`}
              </span>
            ))}
            <span className="absolute -translate-x-1/2" style={{ left: `${markPct}%` }}>
              {limitLabel}
            </span>
            {isOverdue && <span className="absolute right-0 font-bold text-danger">{hours.toLocaleString()} h</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssetTabBar({ machine, activeTab, onTabChange, compact, workOrderCount = 0, hasOpenWorkOrder = false, sopCount = 0 }: AssetTabBarProps) {
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const last = ASSET_TABS.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: idx === last ? 0 : idx + 1,
      ArrowLeft: idx === 0 ? last : idx - 1,
      Home: 0,
      End: last
    };
    const next = keys[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onTabChange(ASSET_TABS[next].id);
    document.getElementById(`asset-tab-${ASSET_TABS[next].id}`)?.focus();
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-2 @min-[560px]:px-3 bg-panel border-b border-line">
      {compact && (
        <p className="flex items-center gap-2 pl-2 min-w-0 shrink animate-fade-in" aria-hidden="true">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusMeta(machine.status).dot}`} />
          <span className="hidden @min-[600px]:block text-small font-semibold text-ink truncate">{machine.name}</span>
        </p>
      )}
      <div role="tablist" aria-label="Asset views" className="flex gap-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
        {ASSET_TABS.map(({ id, label }, idx) => {
          const active = activeTab === id;
          const showWoBadge = id === "logs" && workOrderCount > 0;
          const showSopBadge = id === "sops" && sopCount > 0;

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
              className={`relative inline-flex items-center gap-1.5 min-h-[44px] px-2 @min-[400px]:px-3 @min-[560px]:px-4 text-small @min-[400px]:text-copy whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-offset-[-2px] ${
                active ? "font-semibold text-ink" : "font-medium text-muted hover:text-ink"
              }`}
            >
              <span>{label}</span>

              {showWoBadge && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-label font-mono tabular-nums border ${
                    hasOpenWorkOrder ? "bg-danger-bg text-danger border-danger-line font-bold" : "bg-wash text-muted border-line"
                  }`}
                >
                  {workOrderCount}
                  <span className="sr-only">{hasOpenWorkOrder ? " records, alarm open" : " records"}</span>
                </span>
              )}

              {showSopBadge && (
                <span className="inline-flex items-center px-1.5 py-px rounded-full text-label font-mono tabular-nums bg-accent-bg text-accent-ink border border-accent-line">
                  {sopCount}
                  <span className="sr-only"> cited</span>
                </span>
              )}

              {active && (
                <span
                  className="absolute left-2 right-2 @min-[400px]:left-3 @min-[400px]:right-3 @min-[560px]:left-4 @min-[560px]:right-4 -bottom-px h-0.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
