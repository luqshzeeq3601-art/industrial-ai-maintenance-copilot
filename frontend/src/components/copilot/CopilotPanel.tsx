import { useEffect, useRef } from "react";
import { ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import { useCopilot } from "../../app/copilotContext";
import { useCurrentUser } from "../../app/sessionContext";
import { cn } from "../../lib/cn";
import { ProductMark } from "../auth/SignInArt";
import { IconButton } from "../ui/Button";
import { ChatInput } from "./ChatInput";
import { CopilotMessage } from "./CopilotMessage";

interface CopilotPanelProps {
  /** Starter questions; built by the page from real data. */
  prompts: string[];
  /** Asset IDs that exist, so "View asset" links never point nowhere. */
  knownAssets: Set<string>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  className?: string;
}

/** Persistent copilot beside the asset table. Quiet when idle: a greeting, one line, and starter prompts. */
export function CopilotPanel({ prompts, knownAssets, collapsed, onToggleCollapsed, className }: CopilotPanelProps) {
  const { chat } = useCopilot();
  const user = useCurrentUser();
  const endRef = useRef<HTMLDivElement>(null);
  const firstName = user.full_name.split(/\s+/)[0];
  const hasQuestions = chat.messages.some((m) => m.role === "user");

  useEffect(() => {
    if (chat.messages.length || chat.loading) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat.messages, chat.loading]);


  return (
    <section
      aria-labelledby="copilot-heading"
      className={cn("flex flex-col bg-panel border border-line rounded-[var(--radius-card)] min-h-0", className)}
    >
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-line shrink-0">
        <ProductMark className="w-6 h-6 shrink-0" />
        <h2 id="copilot-heading" className="text-title font-semibold flex-1">
          Copilot assistant
        </h2>
        {hasQuestions && !collapsed && <IconButton label="New conversation" icon={RotateCcw} size="sm" onClick={chat.reset} disabled={chat.loading} />}
        <IconButton
          label={collapsed ? "Expand copilot" : "Collapse copilot"}
          icon={collapsed ? Plus : Minus}
          size="sm"
          aria-expanded={!collapsed}
          aria-controls="copilot-body"
          onClick={onToggleCollapsed}
        />
      </div>

      <div id="copilot-body" hidden={collapsed} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
          {!hasQuestions && (
            <div>
              <p className="text-copy font-semibold text-ink">Hi {firstName},</p>
              <p className="mt-1 text-copy text-body">Ask about assets, alarms, maintenance procedures, or work orders.</p>
              <ul className="mt-4 space-y-2" aria-label="Suggested questions">
                {prompts.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      disabled={chat.loading}
                      onClick={() => void chat.send(p)}
                      className="w-full flex items-center gap-2 min-h-11 px-3 py-2 rounded-[var(--radius-control)] border border-line text-left text-meta font-medium text-ink hover:border-accent-line hover:bg-accent-bg cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex-1">{p}</span>
                      <ChevronRight className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Copilot conversation" className="space-y-4">
            {chat.messages.map((m, i) => (
              <CopilotMessage key={i} message={m} knownAssets={knownAssets} />
            ))}
          </div>

          {chat.loading && (
            <div role="status" className="space-y-2">
              <p className="text-meta text-body">Checking manuals and maintenance history…</p>
              <div className="skeleton h-3 w-3/4" aria-hidden="true" />
              <div className="skeleton h-3 w-1/2" aria-hidden="true" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-4 py-3 border-t border-line shrink-0">
          <ChatInput busy={chat.loading} onSend={(text) => void chat.send(text)} placeholder="Ask about assets, maintenance…" />
        </div>
      </div>
    </section>
  );
}
