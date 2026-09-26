import { Activity, CircleAlert, CircleCheck, Clock3, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import type { LoadState } from "../../config";

export const PAGE = "mx-auto w-full max-w-[1680px] space-y-5 pb-6";
export const PANEL = "rounded-xl border border-line bg-panel shadow-[var(--shadow-cockpit)]";
export const CONTROL = "min-h-11 rounded-lg border border-line-strong bg-panel px-3 text-small text-ink focus-visible:outline-2 focus-visible:outline-accent";
export const PRIMARY = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-small font-semibold text-white hover:bg-accent-hover disabled:opacity-50";
export const SECONDARY = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-panel px-4 text-small font-semibold text-ink hover:bg-sunken disabled:opacity-50";

export function StatusText({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const fault = ["fault", "active", "critical", "rejected"].includes(normalized);
  const caution = ["maintenance", "pending", "in_progress", "high"].includes(normalized);
  const Icon = fault ? CircleAlert : caution ? Wrench : ["operational", "completed", "approved", "cleared"].includes(normalized) ? CircleCheck : Clock3;
  const label = normalized === "operational" ? "Running" : normalized.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
  return <span className={`inline-flex items-center gap-1.5 font-medium ${fault ? "text-danger" : caution ? "text-warn" : "text-body"}`}>
    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
  </span>;
}

export function DataMessage({ state, empty, onRetry }: { state: LoadState; empty: string; onRetry?: () => void }) {
  return <div className="px-5 py-12 text-center text-small text-muted" role={state === "error" ? "alert" : "status"}>
    {state === "loading" ? "Loading data…" : state === "error" ? "Data could not be loaded. Check the maintenance service and try again." : empty}
    {state === "error" && onRetry && <div className="mt-3"><button className={SECONDARY} onClick={onRetry} type="button">Try again</button></div>}
  </div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="text-page-title font-bold leading-9 text-ink">{title}</h1>{subtitle && <p className="mt-1 text-small text-muted">{subtitle}</p>}</div>
    {action}
  </header>;
}

export function Sparkline({ values, label, color = "#2563eb" }: { values: number[]; label: string; color?: string }) {
  if (values.length < 2) return <span className="text-meta text-muted">More readings needed for a trend</span>;
  const low = Math.min(...values);
  const span = Math.max(1, Math.max(...values) - low);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 240},${76 - ((value - low) / span) * 64}`).join(" ");
  return <svg viewBox="0 0 240 88" preserveAspectRatio="none" role="img" aria-label={label} className="h-24 w-full">
    <line x1="0" y1="76" x2="240" y2="76" stroke="#e2e8f0" />
    <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function MetricCard({ label, value, detail, children }: { label: string; value: ReactNode; detail?: string; children?: ReactNode }) {
  return <section className={`${PANEL} min-w-0 p-4`}>
    <div className="flex items-center gap-2 text-small font-medium text-muted"><Activity className="h-4 w-4 text-accent" aria-hidden="true" />{label}</div>
    <div className="mt-2 font-data text-[28px] font-semibold leading-8 tabular-nums text-ink">{value}</div>
    {detail && <p className="mt-2 text-meta text-muted">{detail}</p>}
    {children}
  </section>;
}
