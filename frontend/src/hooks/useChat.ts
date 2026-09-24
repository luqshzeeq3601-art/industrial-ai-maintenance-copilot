import { useCallback, useRef, useState } from "react";
import { API_BASE } from "../config";
import { notifySessionExpired } from "../api/auth";
import type { Message } from "../components/workspace/types";

const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Copilot conversation: one in-flight question at a time, answers keep their sources and approval requests. */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  /** `display` is shown in the thread; `apiMessage` (default: display) is what the copilot receives. */
  const send = useCallback(async (display: string, apiMessage = display) => {
    if (!display.trim() || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: display, timestamp: timeNow() }]);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: apiMessage, session_id: sessionIdRef.current ?? undefined })
      });
      if (response.status === 401) notifySessionExpired();
      if (!response.ok) throw new Error(`status ${response.status}`);

      const data = await response.json();
      if (typeof data.session_id === "string") sessionIdRef.current = data.session_id;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          timestamp: timeNow(),
          workflow_trace: data.workflow_trace || [],
          citations: data.citations || [],
          abstain: data.abstain || false,
          pending_action: data.pending_action || null,
          action_result: data.action_result || null
        }
      ]);
    } catch (err: unknown) {
      const detail = err instanceof Error && err.message.startsWith("status") ? ` (${err.message})` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `The copilot didn't respond${detail}. Check your connection and ask again.`,
          timestamp: timeNow(),
          error: true
        }
      ]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
  }, []);

  /** Asset-switch divider; only inside an ongoing conversation, and consecutive switches replace it. */
  const markContext = useCallback((content: string) => {
    const marker: Message = { role: "context", content, timestamp: timeNow() };
    setMessages((prev) =>
      !prev.some((m) => m.role === "user")
        ? prev
        : prev[prev.length - 1]?.role === "context"
          ? [...prev.slice(0, -1), marker]
          : [...prev, marker]
    );
  }, []);

  return { messages, loading, send, reset, markContext };
}
