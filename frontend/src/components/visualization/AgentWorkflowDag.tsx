import { useState } from "react";
import { AppWindow, Search, Settings, ChevronRight, CheckCircle2, ArrowRight } from "lucide-react";

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

const PIPELINE_STEPS = [
  { id: "supervisor", label: "Supervisor", sub: "Classify & plan", icon: null },
  { id: "retrieval", label: "Retrieval", sub: "Search SOPs & history", icon: Search },
  { id: "diagnostic", label: "Diagnostic", sub: "Analyze & recommend", icon: Settings }
];

export function AgentWorkflowDag({ workflowTrace = [], activeAgent }: AgentWorkflowDagProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);

  const activeList = workflowTrace.map((t) => t.agent.toLowerCase());
  if (activeAgent) activeList.push(activeAgent.toLowerCase());
  const hasTrace = workflowTrace.length > 0;

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-sm p-3 my-2">
      <div className="flex items-center justify-between pb-2 mb-1">
        <span className="text-[14px] font-bold text-[#0F172A]">Agent workflow</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 text-[13px] text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg font-medium transition-colors cursor-pointer"
        >
          {expanded ? "Hide details" : "View details"}
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
        {/* Leading Card / AppWindow Icon */}
        <div className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center shrink-0 text-[#475569]" aria-hidden="true">
          <AppWindow className="w-4 h-4 text-[#0F172A]" strokeWidth={2} />
        </div>

        <ArrowRight className="w-4 h-4 text-[#64748B] shrink-0" aria-hidden="true" />

        {/* Steps */}
        {PIPELINE_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = hasTrace ? activeList.some((a) => a.includes(step.id)) : true;
          const traceStep = workflowTrace.find((t) => t.agent.toLowerCase().includes(step.id));

          return (
            <div key={step.id} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => traceStep && setSelectedStep(traceStep)}
                aria-label={`${step.label}: ${step.sub}${traceStep ? ". Activate for details." : ""}`}
                className="flex items-center gap-2 text-left rounded-lg p-2 min-h-[44px] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#0F172A] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  {StepIcon && <StepIcon className="w-4 h-4 text-[#475569]" strokeWidth={2} aria-hidden="true" />}
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-[#15803D] fill-[#DCFCE7]" aria-hidden="true" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-[#94A3B8]" aria-hidden="true" />
                  )}
                </div>
                <div className="leading-tight">
                  <span className="block text-[13px] font-bold text-[#0F172A] whitespace-nowrap">
                    {step.label}
                  </span>
                  <span className="block text-[12px] text-[#475569] whitespace-nowrap">
                    {step.sub}
                  </span>
                </div>
              </button>

              {idx < PIPELINE_STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-[#64748B] shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {(expanded || selectedStep) && (
        <div className="mx-2 mb-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] animate-fade-in">
          {selectedStep ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#0F172A] capitalize">
                  {selectedStep.agent} · {selectedStep.action}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStep(null)}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-[13px] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg"
                >
                  Close
                </button>
              </div>
              <p className="text-[#334155] leading-relaxed">{selectedStep.summary}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {workflowTrace.length === 0 && (
                <p className="text-[#475569] leading-relaxed">
                  Supervisor classified the request and dispatched retrieval and diagnostic specialists.
                </p>
              )}
              {workflowTrace.map((t, i) => (
                <p key={i} className="text-[#334155] leading-relaxed">
                  <strong className="capitalize text-[#0F172A]">{t.agent}</strong>
                  <span className="text-[#475569]"> · {t.action} — </span>
                  {t.summary}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
