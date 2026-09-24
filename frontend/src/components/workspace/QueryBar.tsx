import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { Send, Loader2, X } from "lucide-react";

export const QUERY_MAX_LENGTH = 1800;
const COUNTER_FROM = 1500;
const MAX_ROWS_PX = 160;

interface QueryBarProps {
  input: string;
  onInputChange: (value: string) => void;
  loading: boolean;
  onSend: (text: string) => void;
  /** Selected asset, named in the placeholder so it is clear what questions are scoped to. */
  assetName?: string;
}

/** Question box for the selected asset. Enter sends, Shift+Enter adds a line; it grows up to ~6 lines. */
export function QueryBar({ input, onInputChange, loading, onSend, assetName }: QueryBarProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [input]);

  const submit = () => {
    const text = input.trim();
    if (loading || !text) return;
    onSend(text);
    onInputChange("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const remaining = QUERY_MAX_LENGTH - input.length;
  const subject = assetName ?? "this asset";

  return (
    <div className="px-4 @min-[560px]:px-6 pt-3 pb-4 shrink-0 bg-panel border-t border-line">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-1.5 p-1.5 rounded-xl bg-panel border border-line hover:border-line-strong focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-150 shadow-xs"
      >
        <label htmlFor="asset-query" className="sr-only">
          Ask about {subject}
        </label>
        <textarea
          ref={ref}
          id="asset-query"
          rows={1}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Answering… you can type your next question" : `Ask about ${subject}, alarms, SOPs, or work orders`}
          autoComplete="off"
          maxLength={QUERY_MAX_LENGTH}
          aria-describedby="asset-query-hint"
          className="flex-1 w-full min-w-0 resize-none bg-transparent pl-3 py-2 min-h-[40px] text-sm sm:text-base leading-6 text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none custom-scrollbar"
        />

        {input.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onInputChange("");
              ref.current?.focus();
            }}
            className="min-w-[36px] min-h-[36px] pointer-coarse:min-w-[44px] pointer-coarse:min-h-[44px] rounded-lg text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Clear question"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-busy={loading}
          className="inline-flex items-center justify-center gap-1.5 min-h-[38px] min-w-[38px] pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] sm:min-w-[76px] px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:bg-wash disabled:text-muted/60 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">Ask</span>
        </button>
      </form>
      <p id="asset-query-hint" className="mt-1.5 flex justify-between gap-3 text-meta text-muted">
        <span className="hidden sm:inline">Enter to send, Shift+Enter for a new line</span>
        {input.length >= COUNTER_FROM && (
          <span className={`ml-auto tabular-nums ${remaining <= 50 ? "text-danger font-semibold" : ""}`} aria-live="polite">
            {remaining} characters left
          </span>
        )}
      </p>
    </div>
  );
}
