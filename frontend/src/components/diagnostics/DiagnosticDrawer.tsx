import { useMemo } from "react";
import type { Equipment } from "../../api/models";
import { useCopilot } from "../../app/copilotContext";
import { ChatInput } from "../copilot/ChatInput";
import { CopilotMessage } from "../copilot/CopilotMessage";
import { Dialog } from "../ui/Dialog";

interface DiagnosticDrawerProps {
  open: boolean;
  onClose: () => void;
  asset: Equipment;
  /** Index in the shared conversation where this diagnostic run started. */
  fromIndex: number;
  knownAssets: Set<string>;
}

/** Copilot diagnostic result for one asset, with room for follow-up questions. */
export function DiagnosticDrawer({ open, onClose, asset, fromIndex, knownAssets }: DiagnosticDrawerProps) {
  const { chat } = useCopilot();
  const messages = useMemo(() => chat.messages.slice(fromIndex), [chat.messages, fromIndex]);

  return (
    <Dialog open={open} onClose={onClose} variant="drawer" title={`Diagnostic: ${asset.name}`} description={`${asset.machine_id} · ${asset.location}`}>
      <div className="flex flex-col gap-4 min-h-full">
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Diagnostic conversation" className="space-y-4">
          {messages.map((m, i) => (
            <CopilotMessage key={fromIndex + i} message={m} knownAssets={knownAssets} />
          ))}
        </div>
        {chat.loading && (
          <div role="status" className="space-y-2">
            <p className="text-meta text-body">Checking alarms, maintenance history, and manuals…</p>
            <div className="skeleton h-3 w-3/4" aria-hidden="true" />
            <div className="skeleton h-3 w-1/2" aria-hidden="true" />
          </div>
        )}
        <div className="mt-auto pt-2">
          <ChatInput busy={chat.loading} onSend={(t) => void chat.send(t)} placeholder={`Ask a follow-up about ${asset.name}…`} />
        </div>
      </div>
    </Dialog>
  );
}
