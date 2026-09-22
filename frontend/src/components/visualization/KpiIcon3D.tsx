import { useId } from "react";

interface KpiIcon3DProps {
  kind: "availability" | "hours" | "downtime";
  className?: string;
}

export function KpiIcon3D({ kind, className = "" }: KpiIcon3DProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const face = `url(#${id}-face)`;
  const edge = `url(#${id}-edge)`;

  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--color-panel)" />
          <stop offset="1" stopColor="var(--color-line-strong)" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={kind === "availability" ? "var(--color-success-line)" : kind === "hours" ? "var(--color-accent-line)" : "var(--color-warn-line)"} />
          <stop offset="1" stopColor={kind === "availability" ? "var(--color-success)" : kind === "hours" ? "var(--color-accent)" : "var(--color-warn)"} />
        </linearGradient>
      </defs>
      <ellipse cx="36" cy="65" rx="24" ry="4" fill="var(--color-line-strong)" opacity="0.45" />
      {kind === "availability" && (
        <>
          <circle cx="36" cy="37" r="27" fill="var(--color-success-ink)" opacity="0.22" />
          <circle cx="36" cy="32" r="27" fill={edge} />
          <circle cx="36" cy="32" r="21" fill={face} />
          <path d="M16 33h11l5-10 6 20 5-10h13" fill="none" stroke="var(--color-success)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 17c6-6 17-9 27-4" fill="none" stroke="var(--color-panel)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </>
      )}
      {kind === "hours" && (
        <>
          <circle cx="36" cy="37" r="27" fill="var(--color-accent-ink)" opacity="0.25" />
          <circle cx="36" cy="32" r="27" fill={edge} />
          <circle cx="36" cy="32" r="21" fill={face} />
          <path d="M36 18v15l10 6" fill="none" stroke="var(--color-accent-ink)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="36" cy="32" r="2.4" fill="var(--color-accent)" />
          <path d="M20 17c7-6 18-8 27-4" fill="none" stroke="var(--color-panel)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </>
      )}
      {kind === "downtime" && (
        <>
          <ellipse cx="36" cy="59" rx="17" ry="5" fill="var(--color-warn)" opacity="0.18" />
          <path d="M24 13h24v5c0 8-6 11-10 15 4 4 10 7 10 15v5H24v-5c0-8 6-11 10-15-4-4-10-7-10-15z" fill={face} stroke="var(--color-warn)" strokeWidth="2.5" />
          <path d="M26 18h20c0 7-6 10-10 14-4-4-10-7-10-14z" fill="var(--color-warn-line)" opacity="0.85" />
          <path d="M36 35v7m-9 9c0-5 5-8 9-11 4 3 9 6 9 11z" fill="var(--color-warn-line)" stroke="var(--color-warn)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M20 13h32M20 54h32" fill="none" stroke="var(--color-warn)" strokeWidth="4" strokeLinecap="round" />
          <path d="M22 11h28M22 56h28" fill="none" stroke="var(--color-panel)" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
        </>
      )}
    </svg>
  );
}
