import type { FormEvent } from "react";
import { Send, Loader2, X } from "lucide-react";

interface QueryBarProps {
  input: string;
  onInputChange: (value: string) => void;
  loading: boolean;
  onSend: (text: string) => void;
  /** Selected asset, named in the placeholder so it is clear what questions are scoped to. */
  assetName?: string;
}

/** Question input for the selected asset. */
export function QueryBar({ input, onInputChange, loading, onSend, assetName }: QueryBarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (loading || !text) return;
    onSend(text);
    onInputChange("");
  };

  return (
    <div className="px-4 @min-[560px]:px-6 pt-3 pb-4 shrink-0 bg-panel border-t border-line">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 p-1 rounded-lg bg-panel border border-line-strong hover:border-faint focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition-colors duration-150"
      >
        <label htmlFor="asset-query" className="sr-only">
          Ask about {assetName ?? "this asset"}
        </label>
        <input
          id="asset-query"
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={loading ? "Answering… you can type your next question" : `Ask about ${assetName ?? "this asset"}, alarms, SOPs, or work orders`}
          autoComplete="off"
          maxLength={1800}
          className="flex-1 w-full min-w-0 bg-transparent pl-3 py-2 min-h-[40px] text-[14px] text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none"
        />

        {input.length > 0 && (
          <button
            type="button"
            onClick={() => onInputChange("")}
            className="min-w-[40px] min-h-[40px] pointer-coarse:min-w-[44px] pointer-coarse:min-h-[44px] rounded-md text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Clear question"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-busy={loading}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] sm:min-w-[80px] px-3 sm:px-4 bg-accent hover:bg-accent-hover active:bg-accent-press text-white rounded-md text-[14px] font-semibold transition-colors cursor-pointer disabled:bg-wash disabled:text-subtle disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          )}
          <span className="sr-only sm:not-sr-only">Ask</span>
        </button>
      </form>
    </div>
  );
}
