import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Play,
  Search,
  Thermometer,
  Zap
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { statusMeta } from "../workspace/types";

interface DiagnosticsViewProps {
  equipment: EquipmentData[];
  selectedId: string | null;
  onSelectAsset: (machineId: string) => void;
  onRunDiagnostic: (machineId: string) => void;
  onInvestigateFault: (code: string, machineId: string) => void;
}

export function DiagnosticsView({
  equipment,
  selectedId,
  onSelectAsset,
  onRunDiagnostic,
  onInvestigateFault
}: DiagnosticsViewProps) {
  const [activeTab, setActiveTab] = useState<"live" | "faults" | "history">("live");
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("1h");
  const [search, setSearch] = useState("");
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    spindle: true,
    temp: true,
    vibration: true,
    voltage: true
  });

  const selectedMachine = equipment.find((e) => e.machine_id === selectedId) ?? equipment[0] ?? null;

  const filteredEquipment = useMemo(() => {
    return equipment.filter(
      (e) =>
        !search.trim() ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.machine_id.toLowerCase().includes(search.toLowerCase())
    );
  }, [equipment, search]);

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isFault = selectedMachine?.status.toLowerCase() === "fault";
  const isMaint = selectedMachine?.status.toLowerCase() === "maintenance";

  return (
    <div className="h-full w-full flex flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] gap-3.5 sm:gap-4 overflow-hidden animate-fade-in">
      {/* Left Rail: Asset Selection */}
      <div className="flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden">
        <div className="p-3.5 border-b border-line bg-sunken/40">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-small font-bold text-ink">Select Asset</h2>
            <span className="text-label font-mono text-muted tabular-nums">{equipment.length} Units</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter machine…"
              className="w-full pl-8 pr-2.5 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-line custom-scrollbar">
          {filteredEquipment.map((item) => {
            const meta = statusMeta(item.status);
            const isSelected = item.machine_id === selectedMachine?.machine_id;
            const itemFault = item.status.toLowerCase() === "fault";

            return (
              <button
                key={item.machine_id}
                type="button"
                onClick={() => onSelectAsset(item.machine_id)}
                className={`w-full text-left p-3 flex items-center justify-between transition-colors duration-100 cursor-pointer ${
                  isSelected
                    ? "bg-accent-bg text-accent-ink font-semibold"
                    : itemFault
                    ? "bg-danger-bg/40 hover:bg-danger-bg/70"
                    : "hover:bg-sunken"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-small font-semibold text-ink truncate">{item.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-label text-muted tabular-nums">{item.machine_id}</span>
                    <span className="text-label text-subtle truncate">{item.location}</span>
                  </div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} title={meta.label} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel: Diagnostics Station */}
      <div className="flex-1 min-w-0 flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden">
        {/* Streamlined Header */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-panel">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight">
              {selectedMachine ? selectedMachine.name : "Select Asset"}
            </h1>
            {selectedMachine && (
              <span className="font-mono text-small font-semibold px-2 py-0.5 bg-wash rounded border border-line text-body tabular-nums">
                {selectedMachine.machine_id}
              </span>
            )}
            {selectedMachine && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label font-semibold ${
                  isFault
                    ? "bg-danger-bg text-danger-ink border border-danger-line"
                    : isMaint
                    ? "bg-warn-bg text-warn-ink border border-warn-line"
                    : "bg-success-bg text-success-ink border border-success-line"
                }`}
              >
                {statusMeta(selectedMachine.status).label}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => selectedMachine && onRunDiagnostic(selectedMachine.machine_id)}
            className="px-3.5 py-2 bg-accent text-white font-semibold rounded-lg text-small hover:bg-accent-hover transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Play className="w-4 h-4" />
            <span>Run Diagnostics</span>
          </button>
        </div>

        {/* Diagnostic Tabs */}
        <div className="flex items-center justify-between px-4 border-b border-line bg-sunken/40">
          <div className="flex items-center gap-1">
            {[
              { id: "live", label: "Live Telemetry", icon: Activity },
              { id: "faults", label: "Fault Codes", icon: AlertTriangle },
              { id: "history", label: "History", icon: Clock }
            ].map((tab) => {
              const on = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 py-2.5 px-3.5 border-b-2 font-medium text-small transition-all duration-150 cursor-pointer ${
                    on ? "border-accent text-accent font-semibold" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === "live" && (
            <div className="flex items-center gap-1 py-1.5">
              {(["1h", "6h", "24h", "7d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded text-label font-mono font-medium transition-colors cursor-pointer ${
                    timeRange === r ? "bg-accent text-white font-semibold" : "bg-panel text-muted hover:text-ink border border-line"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          {activeTab === "live" && (
            <div className="space-y-5">
              {/* 4 Compact Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Spindle Speed */}
                <div className="p-3.5 rounded-xl border border-line bg-sunken/30">
                  <div className="flex items-center justify-between text-muted text-meta">
                    <span className="font-medium">Spindle Speed</span>
                    <Gauge className="w-4 h-4 text-accent" />
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-bold font-mono text-ink mt-1 tabular-nums">
                    {isFault ? "0 RPM" : "8,450 RPM"}
                  </div>
                  <div className="flex justify-between text-label text-muted mt-1 pt-1 border-t border-line/60">
                    <span>Target: 8,500</span>
                    <span className="text-success font-medium">Normal</span>
                  </div>
                </div>

                {/* 2. Spindle Temperature */}
                <div className={`p-3.5 rounded-xl border ${isFault ? "bg-warn-bg/40 border-warn-line" : "bg-sunken/30 border-line"}`}>
                  <div className="flex items-center justify-between text-muted text-meta">
                    <span className="font-medium">Spindle Temp</span>
                    <Thermometer className="w-4 h-4 text-warn" />
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-bold font-mono text-ink mt-1 tabular-nums">
                    {isFault ? "58.4 °C" : "46.2 °C"}
                  </div>
                  <div className="flex justify-between text-label text-muted mt-1 pt-1 border-t border-line/60">
                    <span>Limit: 65.0 °C</span>
                    <span className={isFault ? "text-warn font-semibold" : "text-success font-medium"}>
                      {isFault ? "Elevated" : "Nominal"}
                    </span>
                  </div>
                </div>

                {/* 3. Vibration RMS */}
                <div className="p-3.5 rounded-xl border border-line bg-sunken/30">
                  <div className="flex items-center justify-between text-muted text-meta">
                    <span className="font-medium">Vibration RMS</span>
                    <Activity className="w-4 h-4 text-accent" />
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-bold font-mono text-ink mt-1 tabular-nums">
                    {isFault ? "1.85 mm/s" : "0.72 mm/s"}
                  </div>
                  <div className="flex justify-between text-label text-muted mt-1 pt-1 border-t border-line/60">
                    <span>ISO Limit: 2.80</span>
                    <span className="text-success font-medium">Zone A</span>
                  </div>
                </div>

                {/* 4. DC Bus Voltage */}
                <div className={`p-3.5 rounded-xl border ${isFault ? "bg-danger-bg/50 border-danger-line" : "bg-sunken/30 border-line"}`}>
                  <div className="flex items-center justify-between text-muted text-meta">
                    <span className="font-medium">DC Bus Voltage</span>
                    <Zap className="w-4 h-4 text-danger" />
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-bold font-mono text-ink mt-1 tabular-nums">
                    <span className={isFault ? "text-danger" : "text-ink"}>
                      {isFault ? "485 V" : "560 V"}
                    </span>
                  </div>
                  <div className="flex justify-between text-label text-muted mt-1 pt-1 border-t border-line/60">
                    <span>Trip Limit: 520 V</span>
                    <span className={isFault ? "text-danger font-bold" : "text-success font-medium"}>
                      {isFault ? "Undervoltage Trip" : "Nominal"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Series Waveform Telemetry Chart */}
              <div className="p-4 rounded-xl border border-line bg-sunken/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-small font-bold text-ink">Multi-Series Telemetry Waveform</h2>
                    <p className="text-meta text-muted">Synchronized 1kHz acquisition trace</p>
                  </div>

                  {/* Series Toggles */}
                  <div className="flex flex-wrap items-center gap-1.5 text-label">
                    <button
                      type="button"
                      onClick={() => toggleSeries("spindle")}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeSeries.spindle ? "bg-accent-bg border-accent-line text-accent-ink font-semibold" : "bg-panel border-line text-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      <span>Spindle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSeries("temp")}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeSeries.temp ? "bg-warn-bg border-warn-line text-warn-ink font-semibold" : "bg-panel border-line text-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-warn" />
                      <span>Temp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSeries("vibration")}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeSeries.vibration ? "bg-success-bg border-success-line text-success-ink font-semibold" : "bg-panel border-line text-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span>Vibration</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSeries("voltage")}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeSeries.voltage ? "bg-danger-bg border-danger-line text-danger-ink font-semibold" : "bg-panel border-line text-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-danger" />
                      <span>DC Bus</span>
                    </button>
                  </div>
                </div>

                {/* Visual SVG Multi-Series Waveform */}
                <div className="h-56 w-full bg-panel rounded-lg border border-line p-3 flex flex-col justify-between shadow-2xs">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 180" preserveAspectRatio="none">
                    <line x1="0" y1="35" x2="800" y2="35" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="0" y1="80" x2="800" y2="80" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="0" y1="125" x2="800" y2="125" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />

                    {activeSeries.spindle && (
                      <path d="M 0 100 Q 100 70, 200 85 T 400 60 T 600 75 T 800 50" fill="none" stroke="#2563EB" strokeWidth="2.5" />
                    )}
                    {activeSeries.temp && (
                      <path d="M 0 115 Q 150 105, 300 95 T 500 75 T 700 65 T 800 60" fill="none" stroke="#D97706" strokeWidth="2.5" />
                    )}
                    {activeSeries.vibration && (
                      <path d="M 0 135 Q 80 145, 160 130 T 320 140 T 480 125 T 640 135 T 800 120" fill="none" stroke="#16A34A" strokeWidth="2" />
                    )}
                    {activeSeries.voltage && (
                      <path d="M 0 50 Q 200 52, 400 55 T 600 65 T 750 145 T 800 155" fill="none" stroke="#DC2626" strokeWidth="2.5" />
                    )}
                  </svg>

                  <div className="flex justify-between text-[11px] font-mono text-muted pt-2 border-t border-line tabular-nums">
                    <span>-60 min</span>
                    <span>-45 min</span>
                    <span>-30 min</span>
                    <span>-15 min</span>
                    <span className="font-semibold text-accent">Now (Live)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "faults" && (
            <div className="space-y-3">
              <table className="w-full text-left border-collapse">
                <thead className="bg-sunken border-b border-line text-label font-semibold text-muted uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Detected</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-small">
                  {[
                    { code: "E-308", status: "Active Trip", desc: "Inverter Bus Undervoltage Alarm", detected: "12m ago", severity: "critical" },
                    { code: "M-301", status: "Warning", desc: "Slideway auto-lube low pressure trip", detected: "2h ago", severity: "medium" },
                    { code: "H-415", status: "Resolved", desc: "Directional valve coil response delay", detected: "3d ago", severity: "low" }
                  ].map((fault, i) => (
                    <tr key={i} className="hover:bg-sunken transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-meta font-bold text-ink px-2 py-0.5 bg-wash rounded border border-line tabular-nums">
                          {fault.code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-label font-semibold ${
                            fault.severity === "critical"
                              ? "bg-danger-bg text-danger-ink border border-danger-line"
                              : fault.severity === "medium"
                              ? "bg-warn-bg text-warn-ink border border-warn-line"
                              : "bg-wash text-muted border border-line"
                          }`}
                        >
                          {fault.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-ink">{fault.desc}</td>
                      <td className="py-3 px-3 font-mono text-meta text-muted tabular-nums">{fault.detected}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => selectedMachine && onInvestigateFault(fault.code, selectedMachine.machine_id)}
                          className="px-3 py-1 bg-accent text-white font-semibold rounded-md text-meta hover:bg-accent-hover transition-colors cursor-pointer shadow-2xs"
                        >
                          Diagnose
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-2.5">
              {[
                { title: "Vibration FFT Spectrum Check", result: "Pass — Harmonics within ISO limits", time: "Today 08:30", status: "pass" },
                { title: "DC Bus Impedance Test", result: "Fail — Low insulation on phase V", time: "Yesterday", status: "fail" },
                { title: "Proportional Valve Response", result: "Pass — 42ms response", time: "Sep 22", status: "pass" }
              ].map((run, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-line bg-sunken/30 flex items-center justify-between hover:bg-sunken transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      run.status === "pass" ? "bg-success-bg border-success-line text-success" : "bg-danger-bg border-danger-line text-danger"
                    }`}>
                      {run.status === "pass" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-small">{run.title}</div>
                      <div className="text-meta text-muted">{run.result}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-label text-muted tabular-nums">{run.time}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("live")}
                      className="px-2.5 py-1 bg-panel border border-line text-accent font-semibold rounded-md text-meta hover:bg-accent hover:text-white transition-colors cursor-pointer"
                    >
                      View Waveform
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
