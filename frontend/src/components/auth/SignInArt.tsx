/** Product mark: a vibrant rounded hexagon enclosing a high-precision isometric technical cube. */
export function ProductMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="mark-hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="mark-cube-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="mark-cube-left" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e0edff" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id="mark-cube-right" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      {/* Outer rounded hexagon */}
      <polygon
        points="24,4 41.5,14 41.5,34 24,44 6.5,34 6.5,14"
        fill="url(#mark-hex-gradient)"
        stroke="url(#mark-hex-gradient)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Isometric Cube - Top Face */}
      <polygon points="24,14.5 32.5,19.4 24,24.3 15.5,19.4" fill="url(#mark-cube-top)" />
      {/* Isometric Cube - Left Face */}
      <polygon points="15.5,19.4 24,24.3 24,34 15.5,29.1" fill="url(#mark-cube-left)" />
      {/* Isometric Cube - Right Face */}
      <polygon points="24,24.3 32.5,19.4 32.5,29.1 24,34" fill="url(#mark-cube-right)" />
      {/* Inner facet seam lines for crisp optical precision */}
      <line x1="24" y1="24.3" x2="24" y2="34" stroke="#1d4ed8" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="15.5" y1="19.4" x2="24" y2="24.3" stroke="#1d4ed8" strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="32.5" y1="19.4" x2="24" y2="24.3" stroke="#1d4ed8" strokeWidth="0.8" strokeOpacity="0.3" />
    </svg>
  );
}
