import { useEffect, useState } from "react";
import { X, Wrench, Clock, User, ArrowRight } from "lucide-react";
import type { EquipmentData } from "./OperatingHoursBarChart";

interface WorkOrderLog {
  id: number;
  machine_id: string;
  fault_code: string;
  fault_description: string;
  action_taken: string;
  technician: string;
  started_at: string;
  completed_at: string;
  duration_mins: number;
  parts_replaced: string;
  severity: string;
}

interface AssetDetailDrawerProps {
  equipment: EquipmentData | null;
  isOpen: boolean;
  onClose: () => void;
  onDiagnose: (machineId: string, name: string) => void;
  apiBase: string;
}

export function AssetDetailDrawer({
  equipment,
  isOpen,
  onClose,
  onDiagnose,
  apiBase
}: AssetDetailDrawerProps) {
  const [logs, setLogs] = useState<WorkOrderLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (isOpen && equipment) {
      fetch(`${apiBase}/api/equipment/${equipment.machine_id}/history`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            setLogs(data.logs || []);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error loading logs:", err);
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, equipment, apiBase]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !equipment) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="relative w-full max-w-lg bg-[#FFFFFF] border-l border-[#EAEAEA] shadow-xl flex flex-col h-full z-10 animate-slideLeft">
        {/* Header */}
        <div className="p-4 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFA]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#111111] font-mono">
              {equipment.machine_id}
            </span>
            <span className="text-xs text-[#787774]">•</span>
            <span className="text-xs text-[#787774] truncate max-w-[200px]">
              {equipment.name}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#787774] hover:text-[#111111] hover:bg-[#EAEAEA] transition-colors"
            title="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Specifications Bento Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA]">
              <span className="text-[10px] text-[#787774] uppercase font-mono font-medium block">
                Equipment Type
              </span>
              <span className="text-xs font-semibold text-[#111111] mt-0.5 block font-mono">
                {equipment.type}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA]">
              <span className="text-[10px] text-[#787774] uppercase font-mono font-medium block">
                Facility Bay
              </span>
              <span className="text-xs font-semibold text-[#111111] mt-0.5 block font-mono">
                {equipment.location}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA]">
              <span className="text-[10px] text-[#787774] uppercase font-mono font-medium block">
                Total Operating Hours
              </span>
              <span className="text-xs font-semibold text-[#111111] mt-0.5 block font-mono">
                {equipment.operating_hours.toLocaleString()} hrs
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA]">
              <span className="text-[10px] text-[#787774] uppercase font-mono font-medium block">
                Plant Criticality
              </span>
              <span className="text-xs font-semibold text-[#111111] mt-0.5 block font-mono uppercase">
                {equipment.criticality}
              </span>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => onDiagnose(equipment.machine_id, equipment.name)}
            className="w-full flex items-center justify-between p-3 rounded-md bg-[#111111] text-white hover:bg-[#262626] transition-all active:scale-[0.98] text-xs font-medium shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" />
              Initiate Multi-Agent Diagnostic Query
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Historical Work Orders Header */}
          <div className="pt-2 border-t border-[#EAEAEA]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                Recent Work Order Records
              </span>
              <span className="text-[11px] font-mono text-[#787774]">
                {logs.length} Recorded
              </span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-xs text-[#787774] font-mono">
                Loading maintenance work orders...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#787774] font-mono bg-[#FBFBFA] rounded border border-[#EAEAEA]">
                No recent maintenance logs found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-md bg-[#FBFBFA] border border-[#EAEAEA] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111111] font-mono">
                        {log.fault_code}
                      </span>
                      <span className="text-[10px] text-[#787774] font-mono">
                        {log.started_at}
                      </span>
                    </div>

                    <p className="text-[#2F3437] font-medium leading-tight">
                      {log.fault_description}
                    </p>

                    <div className="text-[11px] text-[#787774] bg-[#FFFFFF] p-2 rounded border border-[#EAEAEA] space-y-1">
                      <p>
                        <strong className="text-[#111111]">Action Taken:</strong> {log.action_taken}
                      </p>
                      {log.parts_replaced && (
                        <p>
                          <strong className="text-[#111111]">Parts Replaced:</strong> {log.parts_replaced}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-[#787774] font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.technician}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.duration_mins} mins downtime
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
