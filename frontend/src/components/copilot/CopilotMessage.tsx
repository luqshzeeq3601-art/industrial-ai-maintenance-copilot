import { Link } from "react-router";
import { Box, CircleAlert, FileText } from "lucide-react";
import { API_BASE } from "../../config";
import { useSessionContext } from "../../app/sessionContext";
import { useCopilot } from "../../app/copilotContext";
import { ActionApprovalCard } from "../ActionApprovalCard";
import { LazyMarkdown as Markdown } from "../LazyMarkdown";
import { citationTitle, type Message } from "../workspace/types";

const ASSET_ID = /\bEQ-\d{4}\b/g;
const MAX_ASSET_LINKS = 3;

/** One turn. Contextual actions come only from real response fields: citations, a pending action, asset IDs. */
export function CopilotMessage({ message, knownAssets }: { message: Message; knownAssets: Set<string> }) {
  const { currentUser } = useSessionContext();
  const { openDocument } = useCopilot();

  if (message.role === "context") {
    return (
      <p role="separator" aria-label={message.content} className="flex items-center gap-3 text-label text-body">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        {message.content}
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </p>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="max-w-[88%] rounded-[var(--radius-control)] bg-accent-bg px-3.5 py-2 text-copy text-ink break-words whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="text-label text-body font-data">{message.timestamp}</span>
      </div>
    );
  }

  const assets = [...new Set(message.content.match(ASSET_ID) ?? [])].filter((id) => knownAssets.has(id)).slice(0, MAX_ASSET_LINKS);
  const citations = message.citations ?? [];

  return (
    <article aria-label={`Copilot answer at ${message.timestamp}`} className="rounded-[var(--radius-card)] border border-line bg-panel p-3.5">
      {message.error ? (
        <p role="alert" className="flex items-start gap-2 text-copy text-danger-ink">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0 text-danger" aria-hidden="true" />
          {message.content}
        </p>
      ) : (
        <Markdown content={message.content} className="text-copy [&_ol]:space-y-1.5" />
      )}

      {message.abstain && (
        <p role="note" className="mt-2 flex items-start gap-2 text-meta text-warn-ink">
          <CircleAlert className="w-4 h-4 mt-px shrink-0 text-warn" aria-hidden="true" />
          Not covered by verified plant documentation. Name the asset and fault code, or rephrase.
        </p>
      )}

      {(citations.length > 0 || assets.length > 0) && (
        <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-2">
          {citations.map((c, i) => (
            <button
              key={`${c.document || c.source}-${i}`}
              type="button"
              onClick={() => openDocument(c)}
              title={c.snippet}
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-meta font-semibold text-accent hover:bg-accent-bg cursor-pointer"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              Open {citationTitle(c)}
              {c.page != null && <span className="font-normal text-body">, p. {c.page}</span>}
            </button>
          ))}
          {assets.map((id) => (
            <Link key={id} to={`/assets/${id}`} className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-meta font-semibold text-accent hover:bg-accent-bg">
              <Box className="w-4 h-4" aria-hidden="true" />
              View <span className="font-data">{id}</span>
            </Link>
          ))}
        </div>
      )}

      {message.pending_action && (
        <div className="mt-3">
          <ActionApprovalCard action={message.pending_action} currentUser={currentUser} apiBase={API_BASE} />
        </div>
      )}
      <p className="mt-2 text-label text-body font-data">{message.timestamp}</p>
    </article>
  );
}
