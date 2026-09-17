import React, { useState } from "react";
import { Cpu, Search, Database, Wrench, ShieldCheck, ChevronRight, Activity, Info } from "lucide-react";

export interface WorkflowStep {
  agent: string;
  action: string;
  summary: string;
}

interface AgentWorkflowDagProps {
  workflowTrace?: WorkflowStep[];
  activeAgent?: string;
  isCompact?: boolean;
}

interface AgentNodeDef {
  id: string;
  label: string;
  role: string;
  type: "orchestrator" | "specialist" | "guardrail";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  pastelBg: string;
  pastelText: string;
  pastelBorder: string;
}

const AGENT_NODES: AgentNodeDef[] = [
  {
    id: "supervisor",
    label: "Supervisor",
    role: "LangGraph Router",
    type: "orchestrator",
    icon: Cpu,
    pastelBg: "bg-[#F4F4F2]",
    pastelText: "text-[#111111]",
    pastelBorder: "border-[#CCCCCC]"
  },
  {
    id: "retrieval",
    label: "Retrieval",
    role: "FAISS Manuals",
    type: "specialist",
    icon: Search,
    pastelBg: "bg-[#E1F3FE]",
    pastelText: "text-[#1F6C9F]",
    pastelBorder: "border-[#1F6C9F]/30"
  },
  {
    id: "diagnostic",
    label: "Diagnostic",
    role: "SQL Telemetry",
    type: "specialist",
    icon: Database,
    pastelBg: "bg-[#FBF3DB]",
    pastelText: "text-[#956400]",
    pastelBorder: "border-[#956400]/30"
  },
  {
    id: "maintenance",
    label: "Maintenance",
    role: "SOP & LOTO",
    type: "specialist",
    icon: Wrench,
    pastelBg: "bg-[#EDF3EC]",
    pastelText: "text-[#346538]",
    pastelBorder: "border-[#346538]/30"
  },
  {
    id: "guardrails",
    label: "Guardrails",
    role: "Domain Gate",
    type: "guardrail",
    icon: ShieldCheck,
    pastelBg: "bg-[#FDEBEC]",
    pastelText: "text-[#9F2F2D]",
    pastelBorder: "border-[#9F2F2D]/30"
  }
];

export function AgentWorkflowDag({ workflowTrace = [], activeAgent, isCompact = false }: AgentWorkflowDagProps) {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);

  const activeAgentsList = workflowTrace.map((t) => t.agent.toLowerCase());
  if (activeAgent) {
    activeAgentsList.push(activeAgent.toLowerCase());
  }

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#EAEAEA] rounded-md p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#111111]" strokeWidth={2.2} />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
            Multi-Agent Execution Pipeline
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#787774]">
          {workflowTrace.length > 0 ? `${workflowTrace.length} Step(s) Recorded` : "Standby"}
        </span>
      </div>

      {/* DAG Flow Visualizer */}
      <div className="relative overflow-x-auto py-1 custom-scrollbar">
        <div className="flex items-center justify-between min-w-[540px] gap-1.5">
          {AGENT_NODES.map((node, idx) => {
            const isExecuted = activeAgentsList.some((a) => a.includes(node.id));
            const isCurrentlyActive = activeAgent?.toLowerCase().includes(node.id);
            const traceStep = workflowTrace.find((t) => t.agent.toLowerCase().includes(node.id));

            return (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <button
                  type="button"
                  onClick={() => traceStep && setSelectedStep(traceStep)}
                  className={`relative flex flex-col items-center p-2 rounded-md border text-left transition-all ${
                    isCurrentlyActive
                      ? "ring-2 ring-[#111111] bg-[#FFFFFF] shadow-sm scale-105"
                      : isExecuted
                      ? `${node.pastelBg} ${node.pastelBorder} hover:border-[#111111]`
                      : "bg-[#FBFBFA] border-[#EAEAEA] opacity-45 hover:opacity-80"
                  } ${isCompact ? "w-24 min-h-[58px]" : "w-28 min-h-[64px]"}`}
                >
                  {/* Status Indicator Dot */}
                  <span
                    className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                      isCurrentlyActive
                        ? "bg-[#111111] animate-ping"
                        : isExecuted
                        ? "bg-[#346538]"
                        : "bg-[#CCCCCC]"
                    }`}
                  />

                  {/* Icon & Label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <node.icon
                      className={`w-3.5 h-3.5 ${isExecuted ? node.pastelText : "text-[#787774]"}`}
                      strokeWidth={2.2}
                    />
                    <span className="font-semibold text-xs text-[#111111] font-mono">
                      {node.label}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#787774] font-mono text-center truncate w-full">
                    {node.role}
                  </span>
                </button>

                {/* Arrow Connector */}
                {idx < AGENT_NODES.length - 1 && (
                  <div className="flex items-center justify-center px-0.5">
                    <div
                      className={`h-[1.5px] w-3 ${
                        isExecuted ? "bg-[#111111]" : "bg-[#EAEAEA]"
                      } transition-colors`}
                    />
                    <ChevronRight
                      className={`w-3 h-3 -ml-1 ${
                        isExecuted ? "text-[#111111]" : "text-[#CCCCCC]"
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Interactive Step Details Inspector */}
      {selectedStep && (
        <div className="mt-3 p-2.5 bg-[#FBFBFA] border border-[#EAEAEA] rounded text-xs animate-fadeIn">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#111111] font-mono uppercase text-[11px] flex items-center gap-1">
              <Info className="w-3 h-3 text-[#1F6C9F]" />
              Agent Step: {selectedStep.agent} ({selectedStep.action})
            </span>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-[10px] text-[#787774] hover:text-[#111111]"
            >
              Close
            </button>
          </div>
          <p className="text-[#2F3437] text-[11.5px] leading-relaxed">
            {selectedStep.summary}
          </p>
        </div>
      )}
    </div>
  );
}
