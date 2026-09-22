import type { RefObject } from "react";
import { CircleAlert, BookOpen } from "lucide-react";
import { AgentWorkflowDag } from "../visualization/AgentWorkflowDag";
import { ActionApprovalCard } from "../ActionApprovalCard";
import type { AuthUser } from "../AuthModal";
import type { Message } from "./types";

function renderInlineFormatted(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-[#0F172A]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] font-mono text-xs text-[#0F172A]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function FormattedContent({ content }: { content: string }) {
  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-3 leading-relaxed text-[14px] text-[#334155] max-w-[65ch]">
      {paragraphs.map((para, pIdx) => {
        // Bullet list
        if (para.trim().startsWith("- ") || para.trim().startsWith("* ")) {
          const lines = para.split("\n");
          return (
            <ul key={pIdx} className="space-y-2 pl-2">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#475569] mt-2.5 shrink-0" aria-hidden="true" />
                  <span>{renderInlineFormatted(line.replace(/^[-*]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list with circular dark number badges
        if (/^\d+[.)]\s+/.test(para.trim())) {
          const lines = para.split("\n");
          return (
            <div key={pIdx} className="space-y-2.5 pl-0.5 pt-1">
              {lines.map((line, lIdx) => {
                const match = line.match(/^(\d+)[.)]\s+(.*)/);
                if (match) {
                  const num = match[1];
                  const itemText = match[2];
                  return (
                    <div key={lIdx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#1E293B] text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                        {num}
                      </span>
                      <span className="leading-relaxed text-[14px] text-[#1E293B]">
                        {renderInlineFormatted(itemText)}
                      </span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="text-[14px] text-[#334155]">
                    {renderInlineFormatted(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        // Heading or bold highlight
        if (para.trim().startsWith("Recommended next steps:")) {
          return (
            <p key={pIdx} className="font-bold text-[#0F172A] text-[14px] mt-1">
              {para}
            </p>
          );
        }

        return <p key={pIdx}>{renderInlineFormatted(para)}</p>;
      })}
    </div>
  );
}

interface ConversationThreadProps {
  messages: Message[];
  loading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  currentUser: AuthUser | null;
  apiBase: string;
  onOpenAuth: () => void;
}

/** Diagnostic conversation matching the reference layout. */
export function ConversationThread({
  messages,
  loading,
  chatEndRef,
  currentUser,
  apiBase,
  onOpenAuth
}: ConversationThreadProps) {
  // Find latest workflow trace to display at bottom
  const latestTrace = [...messages].reverse().find((m) => m.workflow_trace && m.workflow_trace.length > 0)?.workflow_trace;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar">
      <div className="w-full space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";

          return (
            <div key={idx} className="space-y-2">
              {isUser ? (
                /* User Message matching screenshot */
                <div className="flex items-center gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#334155] font-bold text-[12px] flex items-center justify-center shrink-0" aria-hidden="true">
                    U
                  </div>
                  <div className="flex-1 min-w-0 rounded-xl bg-[#F1F5F9] px-4 py-3 flex items-center justify-between gap-3 text-[14px] text-[#0F172A] font-medium leading-relaxed">
                    <span>{msg.content}</span>
                    <span className="text-[12px] text-[#475569] font-mono tabular-nums shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ) : (
                /* AI Message */
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1E293B] text-white font-bold text-[12px] flex items-center justify-center shrink-0" aria-hidden="true">
                        AI
                      </div>
                      <span className="text-[14px] font-bold text-[#0F172A]">
                        Maintenance Copilot
                      </span>
                    </div>
                    <span className="text-[12px] text-[#475569] font-mono tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className="pl-10">
                    <FormattedContent content={msg.content} />

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex flex-wrap gap-2">
                        {msg.citations.map((cit, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] text-[12px] font-mono text-[#334155]"
                            title={cit.snippet}
                          >
                            <BookOpen className="w-3.5 h-3.5 inline mr-1 text-[#0369A1]" aria-hidden="true" />
                            {cit.document || cit.source || "OEM Manual"}
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.abstain && (
                      <div className="mt-2.5 flex items-start gap-2 text-[13px] bg-[#FEF2F2] border border-[#FECACA] text-[#7F1D1D] p-3 rounded-lg" role="alert">
                        <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#B91C1C]" aria-hidden="true" />
                        <div>
                          <p className="font-bold">Deterministic abstention enforced</p>
                          <p className="text-[12px] mt-0.5">
                            Query resolved as outside verified industrial maintenance documentation.
                          </p>
                        </div>
                      </div>
                    )}

                    {msg.pending_action && (
                      <div className="mt-2">
                        <ActionApprovalCard
                          action={msg.pending_action}
                          currentUser={currentUser}
                          apiBase={apiBase}
                          onOpenAuth={onOpenAuth}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="space-y-2" role="status" aria-label="Coordinating multi-agent diagnostics">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1E293B] text-white font-bold text-[12px] flex items-center justify-center shrink-0" aria-hidden="true">
                AI
              </div>
              <span className="text-[13px] font-mono text-[#475569]">
                Coordinating multi-agent diagnostics...
              </span>
            </div>
            <div className="ml-10 space-y-2" aria-hidden="true">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        )}

        {/* Workflow Strip at the bottom of the conversation matching screenshot */}
        <div className="pt-2">
          <AgentWorkflowDag workflowTrace={latestTrace || []} />
        </div>

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
