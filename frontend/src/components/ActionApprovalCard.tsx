import { useState, type ReactNode } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle2,
  XCircle,
  Calendar,
  Wrench,
  Bell,
  Lock,
  Clock,
} from "lucide-react";
import { notifySessionExpired, type AuthUser } from "../api/auth";

export interface PendingActionPayload {
  action_id: string;
  action_type: "create_work_order" | "schedule_inspection" | "acknowledge_alarm" | string;
  summary?: string;
  arguments?: Record<string, any>;
  requester?: string;
  requester_role?: string;
  session_id?: string;
}

interface ActionApprovalCardProps {
  action: PendingActionPayload;
  currentUser: AuthUser | null;
  apiBase: string;
  onDecisionMade?: (actionId: string, decision: "approved" | "rejected", result?: any) => void;
  onOpenAuth?: () => void;
}

export function ActionApprovalCard({
  action,
  currentUser,
  apiBase,
  onDecisionMade,
  onOpenAuth,
}: ActionApprovalCardProps) {
  const [decisionState, setDecisionState] = useState<"pending" | "approved" | "rejected">("pending");
  const [approverName, setApproverName] = useState<string>("");
  const [actionResult, setActionResult] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReviewer = currentUser?.role === "supervisor" || currentUser?.role === "admin";
  // Segregation of duties: the requester never decides on their own action (enforced server-side too).
  const isOwnRequest = !!currentUser && action.requester === currentUser.username;
  const canDecide = isReviewer && !isOwnRequest;

  const args = action.arguments || {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (currentUser?.csrf_token) headers["X-CSRF-Token"] = currentUser.csrf_token;

  const handleApprove = async () => {
    if (!canDecide || !currentUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${apiBase}/api/v1/actions/${action.action_id}/approve`, {
        method: "POST",
        credentials: "include",
        headers,
      });

      if (resp.status === 401) {
        notifySessionExpired();
        throw new Error("Your session expired. Sign in again to record this decision.");
      }
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || `Approval failed (status ${resp.status})`);
      }

      const res = await resp.json();
      setDecisionState("approved");
      setApproverName(res.approver || currentUser.username);
      setActionResult(res.action_result);
      if (onDecisionMade) {
        onDecisionMade(action.action_id, "approved", res.action_result);
      }
    } catch (err) {
      // Never show an approval the server did not record.
      setError(err instanceof Error ? err.message : "Approval could not be recorded. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!canDecide || !currentUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${apiBase}/api/v1/actions/${action.action_id}/reject`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ reason: rejectionReason || "Declined by supervisor" }),
      });

      if (resp.status === 401) {
        notifySessionExpired();
        throw new Error("Your session expired. Sign in again to record this decision.");
      }
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || `Rejection failed (status ${resp.status})`);
      }

      const res = await resp.json();
      setDecisionState("rejected");
      setApproverName(res.approver || currentUser.username);
      setShowRejectInput(false);
      if (onDecisionMade) {
        onDecisionMade(action.action_id, "rejected", res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection could not be recorded. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getActionIcon = () => {
    switch (action.action_type) {
      case "create_work_order":
        return <Wrench className="w-4 h-4 text-accent" />;
      case "schedule_inspection":
        return <Calendar className="w-4 h-4 text-warn" />;
      case "acknowledge_alarm":
        return <Bell className="w-4 h-4 text-danger" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-ink" />;
    }
  };

  const formatActionTitle = () => {
    switch (action.action_type) {
      case "create_work_order":
        return "Work order authorization";
      case "schedule_inspection":
        return "Inspection booking";
      case "acknowledge_alarm":
        return "Alarm acknowledgment";
      default:
        return action.action_type.replace(/_/g, " ");
    }
  };

  const priority = typeof args.priority === "string" ? args.priority.toLowerCase() : "";
  const priorityTone = priority === "critical" ? "text-danger" : priority === "high" ? "text-warn" : "text-body";
  const fields = [
    args.machine_id && { label: "Asset", value: <span className="font-mono">{args.machine_id}</span> },
    args.priority && { label: "Priority", value: <span className={`capitalize ${priorityTone}`}>{priority}</span> },
    args.scheduled_date && { label: "Scheduled", value: args.scheduled_date },
    args.alarm_id && { label: "Alarm", value: <span className="font-mono text-danger">{args.alarm_id}</span> }
  ].filter(Boolean) as { label: string; value: ReactNode }[];

  return (
    <div
      className="my-2 rounded-lg bg-panel border border-line-strong/70 text-small text-ink"
    >
      <div className="px-4 pt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h4 className="flex items-center gap-2 text-copy font-semibold text-ink">
          <span aria-hidden="true">{getActionIcon()}</span>
          {formatActionTitle()}
        </h4>
        <span role="status" className="text-meta font-semibold">
          {decisionState === "pending" && (
            <span className="inline-flex items-center gap-1.5 text-warn">
              {canDecide ? (
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {canDecide ? "Needs your approval" : "Awaiting supervisor"}
            </span>
          )}
          {decisionState === "approved" && (
            <span className="inline-flex items-center gap-1.5 text-success">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Approved
            </span>
          )}
          {decisionState === "rejected" && (
            <span className="inline-flex items-center gap-1.5 text-danger">
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Rejected
            </span>
          )}
        </span>
      </div>

      <div className="px-4 pb-3 pt-2 space-y-3">
        {action.summary && <p className="text-copy text-body leading-relaxed max-w-[65ch]">{action.summary}</p>}

        {(fields.length > 0 || args.description) && (
          <dl className="grid grid-cols-2 @min-[480px]:grid-cols-4 gap-x-4 gap-y-2">
            {fields.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-meta text-muted">{label}</dt>
                <dd className="font-semibold text-ink truncate">{value}</dd>
              </div>
            ))}
            {args.description && (
              <div className="col-span-full">
                <dt className="text-meta text-muted">Scope</dt>
                <dd className="text-body leading-relaxed">{args.description}</dd>
              </div>
            )}
          </dl>
        )}

        <p className="text-meta text-muted">
          Requested by{" "}
          <span className="font-medium text-body">{isOwnRequest ? "you" : action.requester || "technician"}</span>
          {!isOwnRequest && action.requester_role ? ` (${action.requester_role})` : ""}
          <span className="text-subtle">, request </span>
          <span className="font-mono">{action.action_id}</span>
        </p>

        {error && (
          <p className="p-3 rounded-md bg-danger-bg border border-danger-line text-danger-ink" role="alert">
            {error}
          </p>
        )}

        {decisionState === "pending" && (
          <div className="pt-3 border-t border-line">
            {!currentUser ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-muted flex-1 min-w-[200px]">
                  <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Sign in to follow this request.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="min-h-[40px] px-4 rounded-md border border-accent text-accent-ink hover:bg-accent-bg text-small font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            ) : !canDecide ? (
              <p className="flex items-start gap-2 text-muted max-w-[65ch]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                {isOwnRequest && isReviewer
                  ? "You requested this, so another supervisor or admin must approve it."
                  : "Sent to the supervisor approval queue. Nothing runs until a supervisor or admin approves it."}
              </p>
            ) : showRejectInput ? (
              <div className="space-y-2">
                <label htmlFor={`reject-reason-${action.action_id}`} className="block text-small font-semibold text-body">
                  Reason for rejection
                </label>
                <input
                  id={`reject-reason-${action.action_id}`}
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, parts not in stock"
                  className="w-full min-h-[44px] px-3 bg-panel border border-line-strong rounded-md text-copy placeholder:text-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(false)}
                    disabled={submitting}
                    className="min-h-[40px] px-4 rounded-md text-small font-semibold text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={submitting}
                    className="min-h-[40px] px-4 rounded-md bg-danger-solid hover:bg-danger-solid-hover text-white text-small font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Rejecting…" : "Confirm rejection"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-md border border-line-strong text-danger hover:bg-danger-bg transition-colors font-semibold text-small cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" aria-hidden="true" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-md bg-success-solid hover:bg-success-solid-hover text-white font-semibold text-small transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  {submitting ? "Approving…" : "Approve and execute"}
                </button>
              </div>
            )}
          </div>
        )}

        {decisionState === "approved" && (
          <div className="pt-3 border-t border-line text-success-ink space-y-0.5">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              Approved by {approverName}
            </p>
            {actionResult && (
              <p className="text-meta pl-[22px]">
                {actionResult.work_order_id && `Work order ${actionResult.work_order_id} created`}
                {actionResult.inspection_id && `Inspection ${actionResult.inspection_id} booked`}
                {actionResult.alarm_id && `Alarm ${actionResult.alarm_id} acknowledged`}
                {actionResult.message && `. ${actionResult.message}`}
              </p>
            )}
          </div>
        )}

        {decisionState === "rejected" && (
          <div className="pt-3 border-t border-line text-danger-ink space-y-0.5">
            <p className="font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Rejected by {approverName}
            </p>
            {rejectionReason && <p className="text-meta pl-[22px]">Reason: {rejectionReason}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
