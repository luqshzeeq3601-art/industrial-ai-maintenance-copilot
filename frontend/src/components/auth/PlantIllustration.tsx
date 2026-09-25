/**
 * Line drawing of a process plant: two distillation columns with platforms and ladders, a storage tank,
 * and a pipe rack. Quiet by design: thin strokes in the neutral and accent palette, no fills beyond a wash.
 */
export function PlantIllustration({ className }: { className?: string }) {
  const stroke = "var(--color-line-strong)";
  const accent = "var(--color-accent)";
  return (
    <svg viewBox="0 0 560 320" className={className} fill="none" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      {/* Ground */}
      <path d="M8 300 H552" stroke={stroke} strokeWidth="1.5" />

      {/* Tall column */}
      <rect x="92" y="40" width="44" height="260" rx="22" fill="var(--color-panel)" stroke={stroke} strokeWidth="1.5" />
      {[90, 140, 190, 240].map((y) => (
        <g key={`t${y}`}>
          <path d={`M78 ${y} H150`} stroke={stroke} strokeWidth="1.5" />
          <path d={`M78 ${y} v-12 M150 ${y} v-12 M78 ${y - 12} H150`} stroke={stroke} strokeWidth="1" />
        </g>
      ))}
      <path d="M146 60 V300 M156 60 V300" stroke={stroke} strokeWidth="1" />
      {Array.from({ length: 24 }, (_, i) => (
        <path key={`l${i}`} d={`M146 ${66 + i * 10} H156`} stroke={stroke} strokeWidth="0.75" />
      ))}
      <path d="M114 40 V18 H176" stroke={stroke} strokeWidth="1.5" />

      {/* Short column */}
      <rect x="196" y="110" width="36" height="190" rx="18" fill="var(--color-panel)" stroke={stroke} strokeWidth="1.5" />
      {[150, 200, 250].map((y) => (
        <path key={`s${y}`} d={`M184 ${y} H244 M184 ${y} v-10 M244 ${y} v-10 M184 ${y - 10} H244`} stroke={stroke} strokeWidth="1" />
      ))}

      {/* Storage tank */}
      <path d="M300 300 V210 Q300 196 314 196 H402 Q416 196 416 210 V300" fill="var(--color-panel)" stroke={stroke} strokeWidth="1.5" />
      <path d="M300 232 H416 M300 266 H416" stroke={stroke} strokeWidth="1" />
      <path d="M404 196 V300" stroke={stroke} strokeWidth="0.75" />

      {/* Pipe rack */}
      <path d="M440 300 V170 M500 300 V170 M440 200 H540 M440 236 H540" stroke={stroke} strokeWidth="1.5" />
      <path d="M136 120 H176 Q190 120 190 134 V300" stroke={stroke} strokeWidth="1.5" />

      {/* Process line in accent: column overhead to tank to rack */}
      <path d="M176 18 Q196 18 196 38 V60 H270 Q286 60 286 76 V182 Q286 190 300 190 H358 V196" stroke={accent} strokeWidth="2" />
      <path d="M416 224 H470 Q480 224 480 214 V200" stroke={accent} strokeWidth="2" />
      <circle cx="358" cy="190" r="3.5" fill="var(--color-panel)" stroke={accent} strokeWidth="2" />
      <circle cx="270" cy="60" r="3.5" fill="var(--color-panel)" stroke={accent} strokeWidth="2" />
    </svg>
  );
}
