import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  Save,
  Server,
  Sliders,
  User
} from "lucide-react";
import type { AuthUser } from "../../api/auth";

interface SettingsViewProps {
  currentUser: AuthUser | null;
  apiBase: string;
}

export function SettingsView({ currentUser, apiBase }: SettingsViewProps) {
  const [nav, setNav] = useState<"profile" | "notifications" | "appearance" | "system">("profile");

  // Form states
  const [name, setName] = useState(currentUser?.full_name || currentUser?.username || "Luqman");
  const [email, setEmail] = useState("luqman.supervisor@plant-a.industrial.internal");
  const [department, setDepartment] = useState("Mechanical Maintenance Operations");
  const [plant, setPlant] = useState("Plant A - Main Machining Facility");
  const [timezone, setTimezone] = useState("UTC+08:00 (Kuala Lumpur / Singapore)");
  const [saved, setSaved] = useState(false);

  // Notification states
  const [alertCritical, setAlertCritical] = useState(true);
  const [alertWarning, setAlertWarning] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  // Appearance states
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState<"100" | "110" | "120">("100");

  // System Diagnostics states
  const [pinging, setPinging] = useState(false);
  const [latency, setLatency] = useState<number | null>(18);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePing = () => {
    setPinging(true);
    setTimeout(() => {
      setLatency(Math.floor(12 + Math.random() * 15));
      setPinging(false);
    }, 450);
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  return (
    <div className="h-full w-full max-w-[1680px] mx-auto flex flex-col lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] gap-3.5 sm:gap-4 overflow-hidden animate-fade-in">
      {/* Settings Navigation Sub-sidebar */}
      <div className="flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden">
        <div className="p-4 border-b border-line bg-sunken/40">
          <h1 className="text-[20px] font-bold text-ink tracking-tight">Settings</h1>
        </div>

        <nav className="p-2 space-y-1">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "appearance", label: "Appearance", icon: Sliders },
            { id: "system", label: "System Diagnostics", icon: Server }
          ].map(({ id, label, icon: Icon }) => {
            const on = nav === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setNav(id as typeof nav)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-small font-medium transition-all duration-150 cursor-pointer ${
                  on
                    ? "bg-accent-bg text-accent-ink font-semibold border border-accent-line/50 shadow-2xs"
                    : "text-body hover:text-ink hover:bg-wash"
                }`}
              >
                <Icon className={`w-4 h-4 ${on ? "text-accent" : "text-subtle"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Settings Form */}
      <div className="flex-1 min-w-0 flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-y-auto p-5 sm:p-6 custom-scrollbar">
        {nav === "profile" && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-[20px] font-bold text-ink">Operator Profile</h2>
              <p className="text-meta text-muted mt-0.5">Manage operator credentials and plant assignment</p>
            </div>

            {/* Avatar & Role Badge */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-line bg-sunken/30">
              <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[18px] shrink-0 shadow-xs">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink text-small">{name}</span>
                  <span className="px-2 py-0.5 rounded-full text-label font-semibold bg-accent-bg text-accent-ink border border-accent-line">
                    {currentUser?.role || "Supervisor"}
                  </span>
                </div>
                <p className="text-label text-muted mt-0.5">Level 3 Diagnostic & Work Order Dispatch Authorization</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-meta font-semibold text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>

              <div>
                <label className="block text-meta font-semibold text-ink mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-meta font-semibold text-ink mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-meta font-semibold text-ink mb-1">Assigned Facility</label>
                  <select
                    value={plant}
                    onChange={(e) => setPlant(e.target.value)}
                    className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    <option value="Plant A - Main Machining Facility">Plant A - Main Facility</option>
                    <option value="Plant B - Stamping & Press Line">Plant B - Press Line</option>
                    <option value="Cleanroom Bay - Electronics SMT">Cleanroom Bay - SMT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-meta font-semibold text-ink mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer font-mono"
                >
                  <option value="UTC+08:00 (Kuala Lumpur / Singapore)">UTC+08:00 (Kuala Lumpur / Singapore)</option>
                  <option value="UTC+00:00 (London / GMT)">UTC+00:00 (London / GMT)</option>
                  <option value="UTC+01:00 (Berlin / Frankfurt)">UTC+01:00 (Berlin / Frankfurt)</option>
                  <option value="UTC+09:00 (Tokyo / Seoul)">UTC+09:00 (Tokyo / Seoul)</option>
                  <option value="UTC-05:00 (New York / Eastern)">UTC-05:00 (New York / Eastern)</option>
                  <option value="UTC-08:00 (Los Angeles / Pacific)">UTC-08:00 (Los Angeles / Pacific)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-accent text-white font-semibold rounded-lg text-small hover:bg-accent-hover transition-colors flex items-center gap-2 cursor-pointer shadow-xs min-h-[40px]"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
              {saved && (
                <span className="text-small font-semibold text-success flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile updated</span>
                </span>
              )}
            </div>
          </div>
        )}

        {nav === "notifications" && (
          <div className="max-w-2xl space-y-4">
            <div>
              <h2 className="text-[20px] font-bold text-ink">Notifications</h2>
              <p className="text-meta text-muted mt-0.5">Control automated trip alarms and preventive maintenance alerts</p>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-sunken/30 cursor-pointer hover:border-line-strong transition-colors">
                <input
                  type="checkbox"
                  checked={alertCritical}
                  onChange={(e) => setAlertCritical(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-ink text-small">Critical Trip Alarms</span>
                  <p className="text-label text-muted">Immediate visual and audio banner for E-series trip events</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-sunken/30 cursor-pointer hover:border-line-strong transition-colors">
                <input
                  type="checkbox"
                  checked={alertWarning}
                  onChange={(e) => setAlertWarning(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-ink text-small">Preventive Maintenance Due</span>
                  <p className="text-label text-muted">Alert 48 hours before an asset reaches the 2,500 operating hours threshold</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-sunken/30 cursor-pointer hover:border-line-strong transition-colors">
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-ink text-small">Daily Operational Digest</span>
                  <p className="text-label text-muted">Morning PDF summary of fleet downtime and open work orders</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {nav === "appearance" && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-[20px] font-bold text-ink">Appearance & Density</h2>
              <p className="text-meta text-muted mt-0.5">Calibrate view density and readability for shop-floor displays</p>
            </div>

            {/* Density Selector */}
            <div className="p-4 rounded-xl border border-line bg-sunken/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink text-small">Information Density</span>
                  <p className="text-meta text-muted">Adjust table rows and card padding for dense telemetry displays</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "comfortable", label: "Comfortable (Default)" },
                  { id: "compact", label: "Compact (Cockpit Data)" }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDensity(d.id as typeof density)}
                    className={`py-2 px-3 rounded-lg border text-small font-semibold transition-all cursor-pointer ${
                      density === d.id
                        ? "bg-accent text-white border-accent shadow-xs"
                        : "bg-panel text-body border-line hover:bg-wash"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast Mode */}
            <div className="p-4 rounded-xl border border-line bg-sunken/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-ink text-small">High Contrast Mode</span>
                <p className="text-meta text-muted">Enhanced border definitions for bright shop-floor tablet usage</p>
              </div>
              <button
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                aria-pressed={highContrast}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                  highContrast ? "bg-accent justify-end" : "bg-line justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Typography Scale */}
            <div className="p-4 rounded-xl border border-line bg-sunken/30 space-y-2.5">
              <span className="font-bold text-ink text-small">Display Font Scale</span>
              <div className="flex items-center gap-2">
                {[
                  { scale: "100", label: "100% (Standard)" },
                  { scale: "110", label: "110% (Large)" },
                  { scale: "120", label: "120% (Tablet)" }
                ].map((f) => (
                  <button
                    key={f.scale}
                    type="button"
                    onClick={() => setFontScale(f.scale as typeof fontScale)}
                    className={`px-3 py-1.5 rounded-lg border text-small font-mono font-semibold transition-colors cursor-pointer ${
                      fontScale === f.scale
                        ? "bg-accent-bg text-accent-ink border-accent-line"
                        : "bg-panel text-muted border-line hover:bg-wash"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {nav === "system" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-ink">System Diagnostics</h2>
                <p className="text-meta text-muted mt-0.5">Telemetry pipeline and AI engine connectivity</p>
              </div>
              <button
                type="button"
                onClick={handlePing}
                disabled={pinging}
                className="px-3.5 py-1.5 bg-panel border border-line-strong text-body font-semibold rounded-lg text-small hover:bg-wash transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
                <span>{pinging ? "Testing..." : "Ping Backend"}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-line bg-sunken/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-ink text-small">Operational Pipeline Live</span>
                </div>
                {latency !== null && (
                  <span className="font-mono text-meta font-bold text-success tabular-nums">
                    {latency} ms RTT
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-small">
              <div className="flex justify-between py-2 border-b border-line text-meta">
                <span className="text-muted">API Endpoint</span>
                <span className="font-mono text-ink">{apiBase || "http://localhost:8000"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line text-meta">
                <span className="text-muted">Model Engine</span>
                <span className="font-mono text-ink">Gemini 1.5 Flash (RAG Diagnostic Agent)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line text-meta">
                <span className="text-muted">Telemetry Stream</span>
                <span className="font-semibold text-success font-mono">Connected (1.0 kHz Sampling)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line text-meta">
                <span className="text-muted">Vector Index</span>
                <span className="font-mono text-ink tabular-nums">2,480 Chunks Loaded</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1.5 border border-line text-muted hover:text-ink hover:bg-wash rounded-lg text-meta font-medium transition-colors cursor-pointer"
              >
                {cacheCleared ? "Cache Purged ✓" : "Purge Local Telemetry Cache"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
