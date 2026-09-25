import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Sample, SampleMetric } from "../../api/models";
import { formatNumber, formatShortDateTime, parseApiTime } from "../../lib/format";
import { METRICS, byMetric } from "./metrics";

const W = 1000;
const ROW_H = 92;
const PAD_L = 56;
const PAD_R = 12;

interface TelemetryChartProps {
  samples: Sample[];
  visible: Set<SampleMetric>;
  since: Date;
  until: Date;
}

/**
 * Small multiples: one row per sensor, each on its own y-scale (different units never share an axis),
 * sharing one time axis and one crosshair. Arrow keys move the crosshair when the chart has focus.
 */
export function TelemetryChart({ samples, visible, since, until }: TelemetryChartProps) {
  const groups = useMemo(() => byMetric(samples), [samples]);
  const rows = METRICS.filter((m) => visible.has(m.id));
  const t0 = since.getTime();
  const span = Math.max(until.getTime() - t0, 1);
  const x = (t: number) => PAD_L + ((t - t0) / span) * (W - PAD_L - PAD_R);
  const [hover, setHover] = useState<number | null>(null); // timestamp under the crosshair

  const times = useMemo(
    () => [...new Set(samples.map((s) => parseApiTime(s.observed_at)!.getTime()))].sort((a, b) => a - b),
    [samples]
  );

  const nearest = (series: Sample[], t: number) => {
    let best: Sample | null = null;
    let bestD = Infinity;
    for (const s of series) {
      const d = Math.abs(parseApiTime(s.observed_at)!.getTime() - t);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = t0 + ((px - PAD_L) / (W - PAD_L - PAD_R)) * span;
    setHover(Math.min(Math.max(t, t0), t0 + span));
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!times.length || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const idx = hover == null ? times.length - 1 : times.findIndex((t) => t >= hover);
    const next = Math.min(Math.max((idx < 0 ? times.length - 1 : idx) + (e.key === "ArrowRight" ? 1 : -1), 0), times.length - 1);
    setHover(times[next]!);
  };

  const height = rows.length * ROW_H + 28;
  const ticks = Array.from({ length: 5 }, (_, i) => t0 + (span * i) / 4);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full h-auto touch-none focus-visible:outline-2 focus-visible:outline-accent"
        role="img"
        aria-label={`Sensor readings from ${formatShortDateTime(since.toISOString())} to ${formatShortDateTime(until.toISOString())}. Use the left and right arrow keys to read values.`}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
      >
        {rows.map((m, row) => {
          const series = groups[m.id];
          const top = row * ROW_H + 18;
          const h = ROW_H - 30;
          const values = series.map((s) => s.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const pad = (max - min) * 0.1 || 1;
          const lo = min - pad;
          const hi = max + pad;
          const y = (v: number) => top + h - ((v - lo) / (hi - lo)) * h;
          const at = hover != null ? nearest(series, hover) : null;
          const points = series.map((s) => `${x(parseApiTime(s.observed_at)!.getTime()).toFixed(1)},${y(s.value).toFixed(1)}`).join(" ");
          return (
            <g key={m.id}>
              <text x={PAD_L} y={top - 6} className="fill-ink text-[13px] font-semibold">
                {m.label} ({m.unit})
                {at && (
                  <tspan className="fill-body font-normal" fontFamily="var(--font-mono)">
                    {"  "}
                    {formatNumber(at.value, m.digits)} at {formatShortDateTime(at.observed_at)}
                  </tspan>
                )}
              </text>
              <line x1={PAD_L} x2={W - PAD_R} y1={top + h} y2={top + h} stroke="var(--color-line)" />
              <line x1={PAD_L} x2={W - PAD_R} y1={top} y2={top} stroke="var(--color-line)" strokeDasharray="2 4" />
              {series.length > 0 && (
                <>
                  <text x={PAD_L - 8} y={top + 4} textAnchor="end" className="fill-body text-[11px]" fontFamily="var(--font-mono)">
                    {formatNumber(hi, m.digits)}
                  </text>
                  <text x={PAD_L - 8} y={top + h} textAnchor="end" className="fill-body text-[11px]" fontFamily="var(--font-mono)">
                    {formatNumber(lo, m.digits)}
                  </text>
                  <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {at && <circle cx={x(parseApiTime(at.observed_at)!.getTime())} cy={y(at.value)} r={4} fill="var(--color-accent)" stroke="var(--color-panel)" strokeWidth={2} />}
                </>
              )}
              {series.length === 0 && (
                <text x={(W + PAD_L) / 2} y={top + h / 2} textAnchor="middle" className="fill-body text-[12px]">
                  No readings in this window
                </text>
              )}
            </g>
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={10} y2={rows.length * ROW_H} stroke="var(--color-faint)" strokeWidth={1} />}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={height - 6} textAnchor="middle" className="fill-body text-[11px]" fontFamily="var(--font-mono)">
            {formatShortDateTime(new Date(t).toISOString())}
          </text>
        ))}
      </svg>
    </div>
  );
}
