import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Inbox, RefreshCw } from "lucide-react";
import { ActionApprovalCard, type PendingActionPayload } from "../ActionApprovalCard";
import { notifySessionExpired, type AuthUser } from "../../api/auth";

interface QueuedAction extends PendingActionPayload {
  requested_at?: string;
}

interface ApprovalsQueueViewProps {
  apiBase: string;
  currentUser: AuthUser;
  onCountChange?: (count: number) => void;
}

function formatRequestedAt(iso?: string): string {
  if (!iso) return "";
  // Audit timestamps are stored as naive UTC
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Supervisor/admin inbox of actions waiting for a decision, oldest first. */
export function ApprovalsQueueView({ apiBase, currentUser, onCountChange }: ApprovalsQueueViewProps) {
  const [actions, setActions] = useState<QueuedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Decided cards stay visible until the next refresh so the reviewer sees the outcome
  const [decided, setDecided] = useState<Set<string>>(new Set());

  const fetchQueue = useCallback(async () => {
    try {
      const resp = await fetch(`${apiBase}/api/v1/actions/pending`, { credentials: "include" });
      if (resp.status === 401) {
        notifySessionExpired();
        throw new Error("Your session expired. Sign in again to see the approval queue.");
      }
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || `Couldn't load the approval queue (status ${resp.status}).`);
      }
      const data: { pending_actions?: QueuedAction[] } = await resp.json();
      const list = [...(data.pending_actions ?? [])].sort((a, b) =>
        (a.requested_at ?? "").localeCompare(b.requested_at ?? "")
      );
      setActions(list);
      setDecided(new Set());
      setError(null);
      onCountChange?.(list.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the approval queue.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, onCountChange]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const refresh = () => {
    setLoading(true);
    fetchQueue();
  };

  const handleDecision = (actionId: string) => {
    const next = new Set(decided).add(actionId);
    setDecided(next);
    onCountChange?.(actions.length - next.size);
  };

  const waiting = actions.length - decided.size;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-[880px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-heading font-semibold text-ink tracking-tight">Approvals</h1>
            <p className="text-copy text-muted">
              {loading
                ? "Loading requests…"
                : waiting === 0
                ? "Nothing is waiting for a decision."
                : `${waiting} ${waiting === 1 ? "request is" : "requests are"} waiting for a decision, oldest first.`}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 min-h-[40px] pointer-coarse:min-h-[44px] px-3 rounded-md border border-line-strong bg-panel text-small font-semibold text-body hover:bg-wash hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error && (
          <p className="flex items-start gap-2 p-3 mb-4 rounded-md bg-danger-bg border border-danger-line text-danger-ink text-copy" role="alert">
            <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </p>
        )}

        {!loading && !error && actions.length === 0 && (
          <div className="flex flex-col items-center text-center gap-2 py-16 px-4 bg-panel border border-line-strong/70 rounded-lg">
            <Inbox className="w-8 h-8 text-subtle" aria-hidden="true" />
            <p className="text-copy font-semibold text-ink">No requests waiting</p>
            <p className="text-copy text-muted max-w-[48ch]">
              When a technician asks the copilot to create a work order, book an inspection, or acknowledge an alarm, the
              request appears here.
            </p>
          </div>
        )}

        <ul className="@container space-y-3">
          {actions.map((action) => (
            <li key={action.action_id}>
              {action.requested_at && (
                <p className="text-meta text-muted tabular-nums mb-1">
                  Requested {formatRequestedAt(action.requested_at)}
                </p>
              )}
              <ActionApprovalCard
                action={action}
                currentUser={currentUser}
                apiBase={apiBase}
                onDecisionMade={handleDecision}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
