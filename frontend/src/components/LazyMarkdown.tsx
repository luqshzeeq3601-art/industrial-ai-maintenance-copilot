import { lazy, Suspense } from "react";

// The markdown parser is the largest dependency; it loads with the first answer or document, not the first paint.
const Markdown = lazy(() => import("./Markdown").then((m) => ({ default: m.Markdown })));

/** Markdown with a plain-text fallback while the renderer loads. */
export function LazyMarkdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <Suspense fallback={<p className={`whitespace-pre-wrap leading-relaxed text-copy text-body ${className}`}>{content}</p>}>
      <Markdown content={content} className={className} />
    </Suspense>
  );
}
