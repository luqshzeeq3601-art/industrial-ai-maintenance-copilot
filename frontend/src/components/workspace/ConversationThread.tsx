import type { ReactNode, RefObject } from "react";
import { AlertTriangle, BookOpen, ChevronRight, CircleAlert, FileText, RotateCcw, Stethoscope } from "lucide-react";
import { ActionApprovalCard } from "../ActionApprovalCard";
import { LazyMarkdown as Markdown } from "../LazyMarkdown";
import type { AuthUser } from "../../api/auth";
import { citationTitle, type Citation, type Message } from "./types";

export interface Suggestion {
  label: string;
  detail: string;
  /** "alarm" marks the active-fault question. */
  tone?: "alarm";
  onClick: () => void;
}

interface ConversationThreadProps {
  messages: Message[];
  loading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  currentUser: AuthUser | null;
  apiBase: string;
  onOpenAuth: () => void;
  onNewConversation: () => void;
  onOpenCitation: (citation: Citation) => void;
  /** Named in the empty state so it is clear what questions are scoped to. */
  assetName: string;
  /** Rendered above the messages inside the same scroll region (fault banner). */
  lead?: ReactNode;
  /** One-click starter questions shown while the conversation is empty. */
  suggestions?: Suggestion[];
}

/** Copilot conversation for the selected asset; answers carry their sources and any approval request. */
export function ConversationThread({
  messages,
  loading,
  chatEndRef,
  currentUser,
  apiBase,
  onOpenAuth,
  onNewConversation,
  onOpenCitation,
  assetName,
  lead,
  suggestions = []
}: ConversationThreadProps) {
  const hasQuestions = messages.some((m) => m.role === "user");

  return (
    <div className="px-4 @min-[560px]:px-6 py-5">
      {lead && <div className="space-y-3 mb-4">{lead}</div>}
      {hasQuestions ? (
        <div className="flex items-center justify-between -mt-2 mb-2">
          <h2 className="sr-only">Conversation about {assetName}</h2>
          <span aria-hidden="true" />
          <button
            type="button"
            onClick={onNewConversation}
            disabled={loading}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 -mr-2 rounded-md text-small font-medium text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            New conversation
          </button>
        </div>
      ) : (
        !loading && (
          <div className="rounded-xl border border-line bg-panel p-4 sm:p-5 shadow-xs mb-2">
            <div className="flex items-center gap-2 text-label font-mono font-semibold uppercase tracking-wider text-muted">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
              <span>COPILOT DIAGNOSTIC DISPATCH • {assetName.toUpperCase()}</span>
            </div>
            <h2 className="mt-2 text-title sm:text-heading font-semibold text-ink">
              Ready for investigation. Select an automated procedure:
            </h2>

            {suggestions.length > 0 && (
              <ul className="mt-3.5 grid grid-cols-1 @min-[540px]:grid-cols-2 gap-2.5" aria-label="Suggested questions">
                {suggestions.map(({ label, detail, tone, onClick }) => {
                  const isAlarm = tone === "alarm";
                  const isCheck = label.toLowerCase().includes("check") || label.toLowerCase().includes("diagnostic");
                  const isSop = label.toLowerCase().includes("sop");
                  const Icon = isAlarm ? AlertTriangle : isCheck ? Stethoscope : isSop ? FileText : RotateCcw;

                  return (
                    <li key={label}>
                      <button
                        type="button"
                        onClick={onClick}
                        disabled={loading}
                        title={detail}
                        aria-description={detail}
                        className={`w-full h-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group ${
                          isAlarm
                            ? "border-red-200 bg-red-50/70 hover:border-red-400 hover:bg-red-50"
                            : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                              isAlarm
                                ? "bg-red-100 border-red-200 text-red-600"
                                : isCheck
                                ? "bg-blue-100 border-blue-200 text-blue-600"
                                : "bg-slate-100 border-slate-200 text-slate-600"
                            }`}
                          >
                            <Icon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-small sm:text-title font-semibold text-ink leading-tight truncate">
                              {label}
                            </span>
                            <span className="block text-meta text-muted truncate mt-0.5">
                              {detail}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-transform shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )
      )}

      {/* Only additions are announced; the in-progress status is announced separately below */}
      <div className="w-full space-y-5" role="log" aria-live="polite" aria-relevant="additions" aria-label="Copilot conversation">
        {messages.map((msg, idx) => {
          if (msg.role === "context") {
            return (
              <div key={idx} className="flex items-center gap-3 py-1 text-meta text-muted" role="separator" aria-label={msg.content}>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
                <span className="shrink-0">{msg.content}</span>
                <span className="font-mono tabular-nums shrink-0">{msg.timestamp}</span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>
            );
          }
          if (msg.role === "user") {
            return (
              <div key={idx} className="flex flex-col items-end gap-1">
                <p className="max-w-[85%] rounded-lg bg-wash px-3.5 py-2 text-copy text-ink leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                <span className="text-meta text-muted tabular-nums">You, {msg.timestamp}</span>
              </div>
            );
          }

          return (
            <article key={idx} aria-label={`Copilot answer at ${msg.timestamp}`}>
              <p className="flex items-baseline gap-2 mb-1.5 text-meta">
                <span className="font-semibold text-ink">Copilot</span>
                <span className="text-muted tabular-nums">{msg.timestamp}</span>
              </p>

              {msg.error ? (
                <p className="flex items-start gap-2 text-copy text-danger-ink" role="alert">
                  <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-danger" aria-hidden="true" />
                  {msg.content}
                </p>
              ) : (
                <Markdown content={msg.content} className="max-w-[65ch]" />
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-meta text-muted">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Sources</span>
                  {msg.citations.map((cit, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => onOpenCitation(cit)}
                      title={cit.snippet}
                      className="inline-flex items-center min-h-[28px] pointer-coarse:min-h-[36px] px-2 rounded-md border border-line bg-sunken text-body hover:border-accent-line hover:text-accent-ink cursor-pointer"
                    >
                      {citationTitle(cit)}
                      {cit.page != null && <span className="text-muted">, p. {cit.page}</span>}
                    </button>
                  ))}
                </div>
              )}

              {msg.abstain && (
                <p className="mt-2 flex items-start gap-2 text-small text-warn-ink" role="note">
                  <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-warn" aria-hidden="true" />
                  Not covered by verified plant documentation. Name the asset and fault code, or rephrase.
                </p>
              )}

              {msg.pending_action && (
                <ActionApprovalCard action={msg.pending_action} currentUser={currentUser} apiBase={apiBase} onOpenAuth={onOpenAuth} />
              )}
            </article>
          );
        })}
      </div>

      {loading && (
        <div role="status" className="mt-5">
          <p className="text-meta mb-2">
            <span className="font-semibold text-ink">Copilot</span>
            <span className="text-muted"> is checking manuals and history…</span>
          </p>
          <div className="space-y-2" aria-hidden="true">
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
}
