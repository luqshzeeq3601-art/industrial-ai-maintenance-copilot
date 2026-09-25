import { useState, type ReactNode } from "react";
import { API_BASE } from "../config";
import { useChat } from "../hooks/useChat";
import { DocumentViewer } from "../components/workspace/DocumentViewer";
import type { Citation } from "../components/workspace/types";
import { CopilotContext } from "./copilotContext";

/** One copilot conversation for the whole session, so it survives page changes, plus the shared document viewer. */
export function CopilotProvider({ children }: { children: ReactNode }) {
  const chat = useChat();
  const [document, setDocument] = useState<Citation | null>(null);
  return (
    <CopilotContext.Provider value={{ chat, openDocument: setDocument }}>
      {children}
      <DocumentViewer citation={document} apiBase={API_BASE} onClose={() => setDocument(null)} />
    </CopilotContext.Provider>
  );
}
