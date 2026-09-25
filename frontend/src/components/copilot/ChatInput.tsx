import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "../../lib/cn";

export const QUERY_MAX_LENGTH = 1800;
const MAX_HEIGHT_PX = 132;

/** Compact question box: grows to ~5 lines. Enter sends, Shift+Enter adds a line. */
export function ChatInput({ onSend, busy, placeholder }: { onSend: (text: string) => void; busy: boolean; placeholder: string }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2"
    >
      <label className="flex-1 min-w-0">
        <span className="sr-only">Ask the copilot</span>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={QUERY_MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="block w-full min-h-11 resize-none rounded-[var(--radius-control)] border border-line-strong bg-panel px-3 py-[11px] text-copy leading-[20px] text-ink placeholder:text-subtle custom-scrollbar focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !value.trim()}
        aria-label="Send question"
        className={cn(
          "w-11 h-11 shrink-0 rounded-[var(--radius-control)] flex items-center justify-center cursor-pointer transition-colors",
          "bg-accent-solid text-white hover:bg-accent-solid-hover disabled:bg-wash disabled:text-subtle disabled:cursor-not-allowed"
        )}
      >
        <SendHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
      </button>
    </form>
  );
}
