import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * Copilot answers and manuals are markdown. Raw HTML is never rendered (react-markdown escapes it by default),
 * links open in a new tab, and headings are demoted so an answer never outranks the page's own h1/h2.
 */
const components: Components = {
  h1: ({ children }) => <h3 className="text-title font-semibold text-ink mt-4 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="text-copy font-semibold text-ink mt-4 first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="text-copy font-semibold text-ink mt-3 first:mt-0">{children}</h5>,
  h4: ({ children }) => <h6 className="text-small font-semibold text-ink mt-3 first:mt-0">{children}</h6>,
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 marker:text-subtle">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 marker:text-subtle marker:tabular-nums">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-accent underline underline-offset-2 hover:text-accent-hover">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="px-1 py-px rounded bg-wash border border-line font-mono text-small text-ink">{children}</code>,
  pre: ({ children }) => <pre className="p-3 rounded-md bg-sunken border border-line overflow-x-auto text-small [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="pl-3 border-l-2 border-line-strong text-muted">{children}</blockquote>,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-small border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="text-left font-semibold text-ink px-2 py-1.5 border-b border-line-strong">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 border-b border-line align-top">{children}</td>,
  hr: () => <hr className="border-line" />
};

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`space-y-3 leading-relaxed text-copy text-body break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
