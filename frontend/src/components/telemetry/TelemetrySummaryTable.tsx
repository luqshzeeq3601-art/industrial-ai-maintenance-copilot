import type { Sample, SampleMetric } from "../../api/models";
import { formatNumber } from "../../lib/format";
import { METRICS, byMetric } from "./metrics";

/** Table view of the chart (accessibility and exact values): latest, min, average, and max per sensor. */
export function TelemetrySummaryTable({ samples, visible }: { samples: Sample[]; visible: Set<SampleMetric> }) {
  const groups = byMetric(samples);
  return (
    <table className="w-full text-meta">
      <caption className="sr-only">Sensor reading summary for the selected window</caption>
      <thead className="bg-sunken">
        <tr>
          {["Sensor", "Latest", "Min", "Average", "Max", "Readings"].map((h, i) => (
            <th key={h} scope="col" className={`h-10 px-3 font-semibold text-body ${i ? "text-right" : "text-left"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {METRICS.filter((m) => visible.has(m.id)).map((m) => {
          const v = groups[m.id].map((s) => s.value);
          const fmt = (n: number | undefined) => (n == null || Number.isNaN(n) ? "—" : `${formatNumber(n, m.digits)} ${m.unit}`);
          return (
            <tr key={m.id} className="border-t border-line">
              <th scope="row" className="h-11 px-3 text-left font-medium text-ink">
                {m.label}
              </th>
              <td className="px-3 text-right font-data">{fmt(v[v.length - 1])}</td>
              <td className="px-3 text-right font-data">{fmt(v.length ? Math.min(...v) : undefined)}</td>
              <td className="px-3 text-right font-data">{fmt(v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined)}</td>
              <td className="px-3 text-right font-data">{fmt(v.length ? Math.max(...v) : undefined)}</td>
              <td className="px-3 text-right font-data">{v.length}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
