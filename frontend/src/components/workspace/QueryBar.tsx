import { useState, useRef } from "react";
import { MessageSquare, Paperclip, Send, Loader2, X, FileCode } from "lucide-react";

interface QueryBarProps {
  input: string;
  onInputChange: (value: string) => void;
  loading: boolean;
  onSend: (overrideText?: string) => void;
}

/** Diagnostic dispatch console matching reference screenshot. */
export function QueryBar({ input, onInputChange, loading, onSend }: QueryBarProps) {
  const [focused, setFocused] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file.name);
      if (!input.trim()) {
        onInputChange(`Analyze attached telemetry/log file: ${file.name}`);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && (input.trim() || attachedFile)) {
      const fullQuery = attachedFile
        ? `[Attachment: ${attachedFile}] ${input.trim()}`
        : input.trim();
      onSend(fullQuery);
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="px-4 py-3 shrink-0 bg-[#FFFFFF] border-t border-[#E2E8F0]">
      <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.log,.csv,.json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div
          className={`relative flex-1 flex items-center rounded-lg bg-[#FFFFFF] border transition-all duration-150 ${
            focused
              ? "border-[#0F172A] ring-2 ring-[#0F172A]/20"
              : "border-[#CBD5E1] hover:border-[#94A3B8]"
          }`}
        >
          <div className="pl-4 pr-2 flex items-center justify-center text-[#475569]">
            <MessageSquare className="w-5 h-5 text-[#475569]" strokeWidth={2} aria-hidden="true" />
          </div>

          {attachedFile && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 mr-1.5 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] text-[12px] font-mono text-[#0F172A]">
              <FileCode className="w-4 h-4 text-[#0369A1]" aria-hidden="true" />
              <span className="max-w-[120px] truncate" title={attachedFile}>{attachedFile}</span>
              <button
                type="button"
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="min-w-[32px] min-h-[32px] p-1.5 rounded-md hover:text-[#B91C1C] cursor-pointer ml-0.5 flex items-center justify-center"
                title="Remove attachment"
                aria-label="Remove attachment"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </span>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={attachedFile ? "Add query notes..." : "Ask about alarms, SOPs, or work orders..."}
            disabled={loading}
            aria-label="Diagnostic query input"
            autoComplete="off"
            className="w-full bg-transparent py-3 min-h-[44px] text-[14px] text-[#0F172A] placeholder-[#475569] focus:outline-none disabled:opacity-50"
          />

          {/* Clear Button if text present */}
          {input.length > 0 && (
            <button
              type="button"
              onClick={() => onInputChange("")}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-md text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors mr-1 cursor-pointer flex items-center justify-center"
              title="Clear input"
              aria-label="Clear query text"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Attachment Icon Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-md text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors mr-1 cursor-pointer flex items-center justify-center"
            title="Attach technical manual or log file"
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Query Button */}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[96px] px-5 py-3 bg-[#1E293B] hover:bg-[#0F172A] active:bg-[#020617] text-white rounded-lg text-[14px] font-bold tracking-wide transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
              <span>Query</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-white" strokeWidth={2} aria-hidden="true" />
              <span>Query</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
