import type { PendingActionPayload } from "../ActionApprovalCard";

/** One agent step behind a copilot answer. */
export interface WorkflowStep {
  agent: string;
  action: string;
  summary: string;
}

export interface Citation {
  source?: string;
  document?: string;
  page?: number | string;
  snippet?: string;
  doc_type?: string;
}

/** Cited file name ("sop_x.md") → readable title ("SOP x"); other sources pass through. */
export function citationTitle(c: Citation): string {
  const raw = c.document || c.source || "OEM manual";
  if (!/\.md$/i.test(raw)) return raw;
  const words = raw.replace(/\.md$/i, "").replace(/^sop_/i, "SOP ").replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Only plain markdown file names can be opened from /api/documents. */
export function citationFile(c: Citation): string | null {
  const raw = c.document || c.source || "";
  return /^[A-Za-z0-9_-]+\.md$/.test(raw) ? raw : null;
}

export interface Message {
  /** "context" renders as an asset-switch divider and is never sent to the API. */
  role: "user" | "assistant" | "context";
  content: string;
  timestamp: string;
  workflow_trace?: WorkflowStep[];
  citations?: Citation[];
  abstain?: boolean;
  /** Client-side delivery failure (API unreachable); not a backend answer. */
  error?: boolean;
  pending_action?: PendingActionPayload | null;
  action_result?: Record<string, unknown> | null;
}
