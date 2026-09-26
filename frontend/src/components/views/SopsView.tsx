import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Upload,
  X
} from "lucide-react";
import type { Citation } from "../workspace/types";

interface SopsViewProps {
  onOpenSopDocument: (citation: Citation) => void;
}

interface SopItem {
  id: string;
  file: string;
  title: string;
  category: "Safety & LOTO" | "Mechanical" | "Electrical" | "Coolant & Fluid" | "Preventive";
  asset: string;
  lastUpdated: string;
  status: "Approved" | "Review Required" | "Draft";
  author: string;
}

const INITIAL_SOPS: SopItem[] = [
  {
    id: "SOP-SAF-001",
    file: "sop_loto.md",
    title: "Lockout / Tagout (LOTO) Zero Energy Protocol",
    category: "Safety & LOTO",
    asset: "All Plant Assets",
    lastUpdated: "Sep 15, 2026",
    status: "Approved",
    author: "EHS Lead"
  },
  {
    id: "SOP-ELE-104",
    file: "sop_inverter_bus.md",
    title: "Inverter DC Bus Undervoltage Diagnostics",
    category: "Electrical",
    asset: "ApexMill-500 (EQ-1000)",
    lastUpdated: "Sep 20, 2026",
    status: "Approved",
    author: "Electrical Dept"
  },
  {
    id: "SOP-MEC-202",
    file: "sop_spindle_bearing.md",
    title: "Spindle Bearing Inspection & Vibration Protocol",
    category: "Mechanical",
    asset: "ApexMill-500, AeroLathe-Pro",
    lastUpdated: "Aug 28, 2026",
    status: "Approved",
    author: "Mechanical Lead"
  },
  {
    id: "SOP-FLU-301",
    file: "sop_coolant.md",
    title: "Water-Soluble Coolant Concentration Audit",
    category: "Coolant & Fluid",
    asset: "All CNC Centers",
    lastUpdated: "Aug 10, 2026",
    status: "Approved",
    author: "Process Quality"
  },
  {
    id: "SOP-HYD-405",
    file: "sop_hydraulics.md",
    title: "Hydraulic System Filter Bleed & Service",
    category: "Mechanical",
    asset: "HydroPress-500",
    lastUpdated: "Jul 19, 2026",
    status: "Approved",
    author: "Hydraulics Lead"
  },
  {
    id: "SOP-PRV-501",
    file: "sop_pm_weekly.md",
    title: "Weekly Autonomous Slideway Lube Inspection",
    category: "Preventive",
    asset: "All Fleet Units",
    lastUpdated: "Sep 01, 2026",
    status: "Approved",
    author: "Operations"
  }
];

export function SopsView({ onOpenSopDocument }: SopsViewProps) {
  const [sopsList, setSopsList] = useState<SopItem[]>(INITIAL_SOPS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // New SOP Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<SopItem["category"]>("Safety & LOTO");
  const [newAsset, setNewAsset] = useState("All Fleet Units");
  const [newFile, setNewFile] = useState("sop_custom.md");

  const filteredSops = useMemo(() => {
    return sopsList.filter((sop) => {
      const matchSearch =
        !search.trim() ||
        sop.title.toLowerCase().includes(search.toLowerCase()) ||
        sop.id.toLowerCase().includes(search.toLowerCase()) ||
        sop.asset.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || sop.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [sopsList, search, categoryFilter]);

  const categories = [
    { id: "all", label: "All SOPs" },
    { id: "Safety & LOTO", label: "Safety & LOTO" },
    { id: "Mechanical", label: "Mechanical" },
    { id: "Electrical", label: "Electrical" },
    { id: "Coolant & Fluid", label: "Coolant" },
    { id: "Preventive", label: "Preventive" }
  ];

  const handleRegisterSop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSop: SopItem = {
      id: `SOP-${newCategory.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      file: newFile.endsWith(".md") ? newFile : `${newFile}.md`,
      title: newTitle.trim(),
      category: newCategory,
      asset: newAsset,
      lastUpdated: "Just Now",
      status: "Approved",
      author: "Plant Supervisor"
    };

    setSopsList((prev) => [newSop, ...prev]);
    setNewTitle("");
    setUploadModalOpen(false);
  };

  return (
    <div className="h-full w-full max-w-[1680px] mx-auto flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden animate-fade-in relative">
      {/* Streamlined Header */}
      <div className="p-4 sm:px-5 sm:py-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-panel">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-ink tracking-tight">SOPs Library</h1>
          <span className="text-meta font-mono font-medium px-2 py-0.5 bg-sunken border border-line rounded-md text-muted tabular-nums">
            {filteredSops.length} Manuals
          </span>
        </div>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="px-3.5 py-2 bg-accent text-white font-semibold rounded-lg text-small hover:bg-accent-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add SOP</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="px-4 sm:px-5 py-2.5 bg-sunken/60 border-b border-line flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search procedures or equipment…"
            className="w-full pl-9 pr-3 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((c) => {
            const on = categoryFilter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1 rounded-lg text-meta font-medium transition-all duration-150 cursor-pointer ${
                  on
                    ? "bg-accent text-white font-semibold shadow-xs"
                    : "bg-panel text-muted hover:text-ink hover:bg-wash border border-line"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {(search || categoryFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
            }}
            className="px-2.5 py-1 text-meta text-muted hover:text-ink inline-flex items-center gap-1 rounded-md hover:bg-wash transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* SOPs Table */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-sunken border-b border-line text-label font-semibold text-muted tracking-wide">
            <tr>
              <th className="py-2.5 px-4">SOP ID</th>
              <th className="py-2.5 px-3">Procedure Title</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Applicable Asset</th>
              <th className="py-2.5 px-3">Updated</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-small">
            {filteredSops.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted">
                  No matching SOP procedures found.
                </td>
              </tr>
            ) : (
              filteredSops.map((sop) => (
                <tr
                  key={sop.id}
                  onClick={() => onOpenSopDocument({ document: sop.file, source: sop.title })}
                  className="hover:bg-sunken group transition-colors duration-100 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-meta font-bold text-body px-2 py-0.5 bg-wash rounded border border-line tabular-nums">
                      {sop.id}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-semibold text-ink group-hover:text-accent transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                      <span>{sop.title}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md text-meta font-medium bg-wash text-body border border-line">
                      {sop.category}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-muted text-meta">{sop.asset}</td>

                  <td className="py-3 px-3 font-mono text-meta text-muted tabular-nums">{sop.lastUpdated}</td>

                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label font-semibold bg-success-bg text-success-ink border border-success-line">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span>{sop.status}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSopDocument({ document: sop.file, source: sop.title });
                      }}
                      className="px-3 py-1 bg-accent text-white font-semibold rounded-md text-meta hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Authentic SOP Upload & Registration Modal */}
      {uploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-sop-title"
          className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg bg-panel rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-sunken/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <h2 id="upload-sop-title" className="text-title font-bold text-ink">
                  Register Standard Operating Procedure
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-md text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSop} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-meta font-semibold text-ink mb-1">Procedure Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Servo Motor Encoder Alignment Protocol"
                  className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-meta font-semibold text-ink mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SopItem["category"])}
                    className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    <option value="Safety & LOTO">Safety & LOTO</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Coolant & Fluid">Coolant & Fluid</option>
                    <option value="Preventive">Preventive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-meta font-semibold text-ink mb-1">Applicable Asset</label>
                  <input
                    type="text"
                    value={newAsset}
                    onChange={(e) => setNewAsset(e.target.value)}
                    placeholder="e.g. ApexMill-500"
                    className="w-full px-3.5 py-2 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-meta font-semibold text-ink mb-1">Markdown Source File</label>
                <div className="border-2 border-dashed border-line-strong rounded-xl p-4 text-center bg-sunken/20 hover:bg-sunken/40 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 text-subtle mx-auto mb-1.5" />
                  <p className="text-small font-semibold text-ink">Click to upload or drag .md file</p>
                  <p className="text-label text-muted mt-0.5">Supports GitHub-flavored markdown with diagrams</p>
                  <input
                    type="text"
                    value={newFile}
                    onChange={(e) => setNewFile(e.target.value)}
                    className="mt-2.5 w-full text-center px-2 py-1 bg-panel border border-line rounded text-meta font-mono text-muted"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 border border-line text-body font-semibold rounded-lg text-small hover:bg-wash transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-white font-semibold rounded-lg text-small hover:bg-accent-hover transition-colors shadow-xs cursor-pointer"
                >
                  Save & Index SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
