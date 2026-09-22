import type { ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, BookOpen, RotateCcw } from "lucide-react";
import { ActionApprovalCard } from "../ActionApprovalCard";
import type { AuthUser } from "../../api/auth";
import type { Message } from "./types";

function renderInlineFormatted(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-wash border border-line font-mono text-xs text-ink"
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
    <div className="space-y-3 leading-relaxed text-[14px] text-body max-w-[65ch]">
      {paragraphs.map((para, pIdx) => {
        // Bullet list
        if (para.trim().startsWith("- ") || para.trim().startsWith("* ")) {
          const lines = para.split("\n");
          return (
            <ul key={pIdx} className="space-y-2 pl-2">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted mt-2.5 shrink-0" aria-hidden="true" />
                  <span>{renderInlineFormatted(line.replace(/^[-*]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list: steps are a real sequence, so the numerals stay
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
                      <span className="w-4 shrink-0 text-right text-[14px] leading-relaxed text-subtle tabular-nums" aria-hidden="true">
                        {num}.
                      </span>
                      <span className="leading-relaxed text-[14px] text-body">
                        {renderInlineFormatted(itemText)}
                      </span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="text-[14px] text-body">
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
            <p key={pIdx} className="font-bold text-ink text-[14px] mt-1">
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
  onNewConversation: () => void;
  /** Named in the empty state so it is clear what questions are scoped to. */
  assetName: string;
  /** Rendered above the messages inside the same scroll region (fault banner, metadata). */
  lead?: ReactNode;
  /** One-click starter questions shown while the conversation is empty. */
  suggestions?: { label: string; icon: LucideIcon; onClick: () => void }[];
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
  assetName,
  lead,
  suggestions = []
}: ConversationThreadProps) {
  const hasQuestions = messages.some((m) => m.role === "user");

  return (
    <div className="px-4 @min-[560px]:px-6 py-5">
      {lead && <div className="space-y-3 mb-4">{lead}</div>}
      {hasQuestions ? (
        <div className="flex justify-end -mt-2 mb-2">
          <button
            type="button"
            onClick={onNewConversation}
            disabled={loading}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2 -mr-2 rounded-md text-[13px] font-medium text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            New conversation
          </button>
        </div>
      ) : (
        !loading && (
          <div className="py-6">
            <p className="text-[15px] font-semibold text-ink">Ask about {assetName}</p>
            <p className="mt-1 text-[13px] text-muted">Answers cite manuals and work orders. Drafted work orders need approval.</p>
            {suggestions.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Suggested questions">
                {suggestions.map(({ label, icon: Icon, onClick }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={onClick}
                      className="inline-flex items-center gap-2 min-h-[36px] pointer-coarse:min-h-[44px] px-3 rounded-lg border border-line bg-panel text-[13px] font-medium text-body hover:border-accent-line hover:bg-accent-bg hover:text-accent-ink transition-colors cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
      <div className="w-full space-y-5" role="log" aria-live="polite" aria-label="Diagnostic conversation">
        {messages.map((msg, idx) => {
          if (msg.role === "context") {
            return (
              <div key={idx} className="flex items-center gap-3 py-1 text-[12px] text-muted" role="separator" aria-label={msg.content}>
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
                <p className="max-w-[85%] rounded-lg bg-wash px-3.5 py-2 text-[14px] text-ink leading-relaxed break-words">
                  {msg.content}
                </p>
                <span className="text-[11px] text-muted tabular-nums">You, {msg.timestamp}</span>
              </div>
            );
          }

          return (
            <article key={idx} aria-label={`Copilot answer at ${msg.timestamp}`}>
              <p className="flex items-baseline gap-2 mb-1.5 text-[12px]">
                <span className="font-semibold text-ink">Copilot</span>
                <span className="text-muted tabular-nums">{msg.timestamp}</span>
              </p>

              {msg.error ? (
                <p className="flex items-start gap-2 text-[14px] text-danger-ink" role="alert">
                  <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-danger" aria-hidden="true" />
                  {msg.content}
                </p>
              ) : (
                <FormattedContent content={msg.content} />
              )}

              {msg.citations && msg.citations.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Sources:</span>
                  {msg.citations.map((cit, cIdx) => (
                    <span key={cIdx} className="text-body" title={cit.snippet}>
                      {cit.document || cit.source || "OEM manual"}
                      {cIdx < msg.citations!.length - 1 ? "," : ""}
                    </span>
                  ))}
                </p>
              )}

              {msg.abstain && (
                <p className="mt-2 flex items-start gap-2 text-[13px] text-warn-ink" role="note">
                  <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-warn" aria-hidden="true" />
                  Not covered by verified plant documentation. Name the asset and fault code, or rephrase.
                </p>
              )}

              {msg.pending_action && (
                <ActionApprovalCard
                  action={msg.pending_action}
                  currentUser={currentUser}
                  apiBase={apiBase}
                  onOpenAuth={onOpenAuth}
                />
              )}
            </article>
          );
        })}

        {loading && (
          <div role="status" aria-label="Copilot is analyzing">
            <p className="text-[12px] mb-2">
              <span className="font-semibold text-ink">Copilot</span>
              <span className="text-muted"> is analyzing…</span>
            </p>
            <div className="space-y-2" aria-hidden="true">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
