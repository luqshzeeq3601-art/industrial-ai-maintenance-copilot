import { useEffect, useRef, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { LazyMarkdown as Markdown } from "../LazyMarkdown";
import { citationFile, citationTitle, type Citation } from "./types";

interface DocumentViewerProps {
  citation: Citation | null;
  apiBase: string;
  onClose: () => void;
}

/** Result for one file; a different file than the one shown reads as loading. */
type DocState = { file: string; status: "ready"; text: string } | { file: string; status: "error" };

/** Opens a cited manual or SOP and scrolls to the cited passage. */
export function DocumentViewer({ citation, apiBase, onClose }: DocumentViewerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const file = citation ? citationFile(citation) : null;
  const [doc, setDoc] = useState<DocState | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (citation && !dialog.open) dialog.showModal?.();
    if (!citation && dialog.open) dialog.close();
  }, [citation]);

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    fetch(`${apiBase}/api/documents/${encodeURIComponent(file)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => setDoc({ file, status: "ready", text }))
      .catch(() => {
        if (!controller.signal.aborted) setDoc({ file, status: "error" });
      });
    return () => controller.abort();
  }, [file, apiBase]);

  // Bring the cited passage into view and mark it
  const snippet = citation?.snippet?.replace(/\s+/g, " ").trim().slice(0, 60) ?? "";
  const ready = doc?.status === "ready" && doc.file === file;
  useEffect(() => {
    if (!ready || !snippet || !bodyRef.current) return;
    const needle = snippet.toLowerCase();
    const blocks = bodyRef.current.querySelectorAll<HTMLElement>("p, li, td, h3, h4, h5, h6");
    const hit = [...blocks].find((el) => el.textContent?.replace(/\s+/g, " ").toLowerCase().includes(needle.slice(0, 40)));
    if (hit) {
      hit.classList.add("bg-warn-bg", "rounded", "ring-4", "ring-warn-bg");
      hit.scrollIntoView({ block: "center" });
    }
  }, [ready, snippet]);

  const current = doc && doc.file === file ? doc : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="document-title"
      className="m-auto w-[min(760px,calc(100vw-32px))] h-[min(86dvh,900px)] rounded-lg border border-line bg-panel text-ink p-0 shadow-[var(--shadow-tinted-md)] backdrop:bg-deck/40"
    >
      <div className="h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <h2 id="document-title" className="text-title font-semibold truncate">
              {citation ? citationTitle(citation) : ""}
            </h2>
            <p className="text-meta text-muted">
              {citation?.doc_type === "sop" || /^sop_/i.test(file ?? "") ? "Standard operating procedure" : "Equipment manual"}
              {citation?.page != null ? `, page ${citation.page}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document"
            className="w-9 h-9 -mr-2 shrink-0 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-wash cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4">
          {!file ? (
            <div className="space-y-2">
              <p className="text-copy text-muted">This source can't be opened here. The cited passage:</p>
              {citation?.snippet && <blockquote className="pl-3 border-l-2 border-line-strong text-copy text-body">{citation.snippet}</blockquote>}
            </div>
          ) : !current ? (
            <div className="space-y-2.5" role="status" aria-label="Loading document">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-11/12" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ) : current.status === "error" ? (
            <p role="alert" className="flex items-start gap-2 text-copy text-danger-ink">
              <CircleAlert className="w-4 h-4 mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              The document couldn't be loaded. Try again in a moment.
            </p>
          ) : (
            <Markdown content={current.text} className="max-w-[70ch]" />
          )}
        </div>
      </div>
    </dialog>
  );
}
