/* Brand mark and sign-in illustration. Plant tones come from the --color-plant-* tokens. */
import { useId } from "react";

export function ProductMark({ className = "w-12 h-12" }: { className?: string }) {
  // Unique gradient id: a duplicate id inside a hidden copy (e.g. the collapsed sidebar) blanks the fill
  const gradient = `pm-hex-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <polygon
        points="24,4 41.3,14 41.3,34 24,44 6.7,34 6.7,14"
        fill={`url(#${gradient})`}
        stroke={`url(#${gradient})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <polygon points="24,14 32.7,19 24,24 15.3,19" fill="#ffffff" />
      <polygon points="15.3,19 24,24 24,34 15.3,29" fill="#dbeafe" />
      <polygon points="24,24 32.7,19 32.7,29 24,34" fill="#93c5fd" />
    </svg>
  );
}

function Column({ x, w, top, base, cls }: { x: number; w: number; top: number; base: number; cls: string }) {
  const rings = [];
  for (let y = top + 22; y < base - 10; y += 26) rings.push(y);
  return (
    <g className={cls}>
      <rect x={x} y={top} width={w} height={base - top} rx={w / 2} />
      <rect x={x + w / 2 - 1} y={top - 16} width="2" height="18" />
      {rings.map((y) => (
        <rect key={y} x={x - 5} y={y} width={w + 10} height="2.5" rx="1" />
      ))}
    </g>
  );
}

/** Refinery skyline in three depth bands; fades into the sky at the top. */
export function PlantSkyline() {
  const base = 360;
  return (
    <svg
      viewBox="0 0 800 360"
      preserveAspectRatio="xMidYMax slice"
      className="block w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ps-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="ps-mask">
          <rect width="800" height="360" fill="url(#ps-fade)" />
        </mask>
      </defs>

      <g mask="url(#ps-mask)">
        <path className="fill-plant-haze" d="M0 250 L90 200 L170 232 L270 170 L360 222 L460 186 L560 228 L660 180 L800 236 V360 H0z" />

        {/* far band */}
        <g className="fill-plant-far">
          <rect x="30" y="228" width="120" height="132" />
          <rect x="190" y="210" width="16" height="150" />
          <rect x="222" y="190" width="12" height="170" />
          <rect x="520" y="222" width="150" height="138" />
          <rect x="700" y="200" width="14" height="160" />
          <rect x="730" y="236" width="70" height="124" />
        </g>
        <Column x={400} w={20} top={150} base={base} cls="fill-plant-far" />
        <Column x={612} w={18} top={176} base={base} cls="fill-plant-far" />

        {/* mid band */}
        <g className="fill-plant-mid">
          <circle cx="480" cy="262" r="34" />
          <rect x="474" y="292" width="4" height="40" />
          <rect x="482" y="292" width="4" height="40" />
          <rect x="250" y="276" width="330" height="4" />
          <rect x="250" y="292" width="330" height="4" />
          <rect x="560" y="258" width="92" height="102" rx="4" />
          <rect x="690" y="120" width="8" height="240" />
          <path d="M686 120h16l-4-10h-8z" />
        </g>
        <Column x={180} w={26} top={132} base={base} cls="fill-plant-mid" />
        <Column x={232} w={20} top={176} base={base} cls="fill-plant-mid" />
        <Column x={340} w={30} top={112} base={base} cls="fill-plant-mid" />
        <Column x={384} w={18} top={196} base={base} cls="fill-plant-mid" />

        {/* near band */}
        <Column x={268} w={34} top={168} base={base} cls="fill-plant-near" />
        <Column x={318} w={22} top={214} base={base} cls="fill-plant-near" />
        <g className="fill-plant-near">
          <path d="M0 268c0-10 36-16 75-16s75 6 75 16v92H0z" />
          <rect x="150" y="318" width="650" height="42" />
          <rect x="420" y="296" width="120" height="64" rx="4" />
          <rect x="600" y="292" width="80" height="68" rx="4" />
          <rect x="700" y="278" width="100" height="82" rx="4" />
          {[170, 230, 380, 560, 590].map((x) => (
            <rect key={x} x={x} y="282" width="4" height="36" />
          ))}
          <rect x="160" y="282" width="440" height="4" rx="2" />
        </g>
        <g className="fill-plant-deep">
          <rect x="0" y="292" width="150" height="2" />
          <rect x="0" y="318" width="150" height="2" />
          <rect x="120" y="262" width="3" height="98" />
          <rect x="150" y="306" width="650" height="5" rx="2" />
          <rect x="150" y="340" width="650" height="20" />
          <rect x="436" y="310" width="88" height="3" rx="1.5" />
          <rect x="716" y="296" width="68" height="3" rx="1.5" />
        </g>
        <g className="fill-accent" opacity="0.5">
          <rect x="22" y="302" width="32" height="3" rx="1.5" />
        </g>
      </g>
    </svg>
  );
}
