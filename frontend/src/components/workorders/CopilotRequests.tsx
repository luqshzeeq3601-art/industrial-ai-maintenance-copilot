import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "../../config";
import { usePendingActions } from "../../api/queries";
import { useSessionContext } from "../../app/sessionContext";
import { formatShortDateTime } from "../../lib/format";
import { ActionApprovalCard } from "../ActionApprovalCard";
import { ErrorState } from "../ui/States";

/** Actions technicians asked the copilot to take (work orders, inspections, alarm acknowledgments), oldest first. */
export function CopilotRequests() {
  const session = useSessionContext();
  const queue = usePendingActions(session.isApprover);
  const client = useQueryClient();

  if (queue.error) return <ErrorState compact title="Copilot requests didn't load" message={queue.error.message} onRetry={() => void queue.refetch()} />;
  if (!queue.data || queue.data.length === 0) return null;

  return (
    <section aria-labelledby="copilot-requests-heading" className="p-4 border-b border-line space-y-3">
      <h2 id="copilot-requests-heading" className="text-title font-semibold">
        Copilot requests <span className="font-data text-body">({queue.data.length})</span>
      </h2>
      <ul className="grid gap-3 xl:grid-cols-2">
        {queue.data.map((action) => (
          <li key={action.action_id}>
            {action.requested_at && (
              <p className="mb-1 text-label text-body">
                Requested <span className="font-data">{formatShortDateTime(action.requested_at)}</span>
                {action.requester && <> by {action.requester}</>}
              </p>
            )}
            <ActionApprovalCard
              action={action}
              currentUser={session.currentUser}
              apiBase={API_BASE}
              onDecisionMade={() => {
                session.setPendingApprovals((n) => Math.max(n - 1, 0));
                void client.invalidateQueries({ queryKey: ["work-orders"] });
                void client.invalidateQueries({ queryKey: ["history"] });
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
