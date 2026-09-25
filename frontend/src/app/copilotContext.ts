import { createContext, useContext } from "react";
import type { useChat } from "../hooks/useChat";
import type { Citation } from "../components/workspace/types";

interface Copilot {
  chat: ReturnType<typeof useChat>;
  /** Open a manual or SOP in the document viewer. */
  openDocument: (citation: Citation) => void;
}

export const CopilotContext = createContext<Copilot | null>(null);

export function useCopilot(): Copilot {
  const copilot = useContext(CopilotContext);
  if (!copilot) throw new Error("useCopilot must be used inside CopilotProvider");
  return copilot;
}
