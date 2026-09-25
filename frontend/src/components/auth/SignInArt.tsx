/** Product mark: a flat blue hexagon (a nut, the maintainer's fastener) around a gauge ring. */
export function ProductMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <polygon
        points="24,4 41.3,14 41.3,34 24,44 6.7,34 6.7,14"
        fill="var(--color-accent)"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="8.5" stroke="#fff" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="2.5" fill="#fff" />
    </svg>
  );
}
