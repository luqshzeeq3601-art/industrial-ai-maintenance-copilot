import { useState } from "react";
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
} from "lucide-react";
import type { AuthUser } from "./AuthModal";

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

  const isSupervisorOrAdmin =
    currentUser && (currentUser.role === "supervisor" || currentUser.role === "admin");

  const args = action.arguments || {};

  const handleApprove = async () => {
    if (!isSupervisorOrAdmin) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${apiBase}/api/v1/actions/${action.action_id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

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
    } catch (err: any) {
      setError(err.message || "Failed to submit approval.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!isSupervisorOrAdmin) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${apiBase}/api/v1/actions/${action.action_id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason || "Declined by supervisor" }),
      });

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
    } catch (err: any) {
      setError(err.message || "Failed to submit rejection.");
    } finally {
      setSubmitting(false);
    }
  };

  const getActionIcon = () => {
    switch (action.action_type) {
      case "create_work_order":
        return <Wrench className="w-4 h-4 text-[#1F6C9F]" />;
      case "schedule_inspection":
        return <Calendar className="w-4 h-4 text-[#956400]" />;
      case "acknowledge_alarm":
        return <Bell className="w-4 h-4 text-[#9F2F2D]" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-[#111111]" />;
    }
  };

  const formatActionTitle = () => {
    switch (action.action_type) {
      case "create_work_order":
        return "Maintenance Work Order Authorization";
      case "schedule_inspection":
        return "Scheduled Inspection Booking";
      case "acknowledge_alarm":
        return "Safety Alarm Acknowledgment";
      default:
        return action.action_type.replace(/_/g, " ").toUpperCase();
    }
  };

  return (
    <div className="my-3 border-2 border-[#111111]/15 rounded-lg bg-[#FFFFFF] shadow-sm overflow-hidden text-xs text-[#111111]">
      {/* Header Banner */}
      <div className="bg-[#FBFBFA] border-b border-[#EAEAEA] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-white border border-[#EAEAEA] shadow-xs">
            {getActionIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-[#111111] font-mono">
                {formatActionTitle()}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#F4F4F2] border border-[#EAEAEA] rounded text-[#787774]">
                {action.action_id}
              </span>
            </div>
            <p className="text-[10.5px] text-[#787774]">
              Human-in-the-Loop Gateway • LangGraph Interrupt Protocol
            </p>
          </div>
        </div>

        {decisionState === "pending" && (
          <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#FBF3DB] text-[#956400] border border-[#956400]/25 font-mono font-medium animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            Pending Approval
          </span>
        )}
        {decisionState === "approved" && (
          <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#EDF3EC] text-[#346538] border border-[#346538]/25 font-mono font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        )}
        {decisionState === "rejected" && (
          <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#FDEBEC] text-[#9F2F2D] border border-[#9F2F2D]/25 font-mono font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )}
      </div>

      {/* Body / Action Parameters */}
      <div className="p-4 space-y-3">
        {action.summary && (
          <p className="font-medium text-[13px] text-[#111111] leading-snug">
            {action.summary}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 bg-[#FBFBFA] p-3 rounded-md border border-[#EAEAEA] text-[11.5px] font-mono">
          {args.machine_id && (
            <div>
              <span className="text-[#787774] block text-[10px] uppercase">Target Asset:</span>
              <span className="font-semibold text-[#111111]">{args.machine_id}</span>
            </div>
          )}
          {args.priority && (
            <div>
              <span className="text-[#787774] block text-[10px] uppercase">Priority:</span>
              <span
                className={`font-semibold uppercase ${
                  args.priority.toLowerCase() === "critical"
                    ? "text-[#9F2F2D]"
                    : args.priority.toLowerCase() === "high"
                    ? "text-[#956400]"
                    : "text-[#346538]"
                }`}
              >
                {args.priority}
              </span>
            </div>
          )}
          {args.scheduled_date && (
            <div>
              <span className="text-[#787774] block text-[10px] uppercase">Scheduled For:</span>
              <span className="font-semibold text-[#111111]">{args.scheduled_date}</span>
            </div>
          )}
          {args.alarm_id && (
            <div>
              <span className="text-[#787774] block text-[10px] uppercase">Alarm ID:</span>
              <span className="font-semibold text-[#9F2F2D]">{args.alarm_id}</span>
            </div>
          )}
          {args.description && (
            <div className="col-span-2 pt-1 border-t border-[#EAEAEA] mt-1">
              <span className="text-[#787774] block text-[10px] uppercase">Description:</span>
              <span className="text-[#2F3437] font-sans text-xs">{args.description}</span>
            </div>
          )}
        </div>

        {/* Requester Trace */}
        <div className="flex items-center justify-between text-[10.5px] text-[#787774] font-mono pt-1">
          <span>
            Initiated by:{" "}
            <strong className="text-[#111111]">{action.requester || "technician"}</strong> (
            {action.requester_role || "technician"})
          </span>
          {action.session_id && <span>Thread: {action.session_id.slice(0, 16)}...</span>}
        </div>

        {error && (
          <div className="p-2.5 rounded bg-[#FDEBEC] border border-[#9F2F2D]/20 text-[#9F2F2D] text-xs">
            {error}
          </div>
        )}

        {/* Action Controls when Pending */}
        {decisionState === "pending" && (
          <div className="pt-2 border-t border-[#EAEAEA] space-y-2">
            {!isSupervisorOrAdmin ? (
              <div className="flex items-center justify-between p-2.5 rounded bg-[#FBF3DB]/40 border border-[#956400]/20 text-xs">
                <div className="flex items-center gap-2 text-[#956400]">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Authorization requires <strong>Supervisor</strong> or <strong>Admin</strong> privileges.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-2.5 py-1 bg-[#111111] text-white rounded text-[11px] font-medium hover:bg-[#262626] transition-colors"
                >
                  Log In as Supervisor
                </button>
              </div>
            ) : (
              <div>
                {showRejectInput ? (
                  <div className="space-y-2 bg-[#FBFBFA] p-2.5 rounded border border-[#EAEAEA]">
                    <label className="block text-[11px] font-medium text-[#787774]">
                      Reason for Rejection:
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Schedule conflict, insufficient parts inventory..."
                      className="w-full px-2.5 py-1.5 bg-white border border-[#EAEAEA] rounded text-xs focus:outline-none focus:border-[#111111]"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(false)}
                        disabled={submitting}
                        className="px-2.5 py-1 rounded text-xs text-[#787774] hover:bg-[#F4F4F2]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={submitting}
                        className="px-3 py-1 rounded bg-[#9F2F2D] text-white text-xs font-medium hover:bg-[#852624] disabled:opacity-50"
                      >
                        {submitting ? "Rejecting..." : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#EAEAEA] hover:border-[#9F2F2D]/40 text-[#9F2F2D] hover:bg-[#FDEBEC]/30 transition-colors font-medium text-xs disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#346538] hover:bg-[#2b542e] text-white shadow-xs font-medium text-xs transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{submitting ? "Authorizing..." : "Approve & Execute"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* State Post-Decision Details */}
        {decisionState === "approved" && (
          <div className="p-2.5 rounded bg-[#EDF3EC] border border-[#346538]/20 text-[#346538] text-[11.5px] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Authorized by supervisor: <strong>{approverName}</strong>
              </span>
            </p>
            {actionResult && (
              <p className="font-mono text-[11px] opacity-90">
                {actionResult.work_order_id && `Created Work Order: ${actionResult.work_order_id}`}
                {actionResult.inspection_id && `Created Inspection: ${actionResult.inspection_id}`}
                {actionResult.alarm_id && `Acknowledged Alarm: ${actionResult.alarm_id}`}
                {actionResult.message && ` • ${actionResult.message}`}
              </p>
            )}
          </div>
        )}

        {decisionState === "rejected" && (
          <div className="p-2.5 rounded bg-[#FDEBEC] border border-[#9F2F2D]/20 text-[#9F2F2D] text-[11.5px]">
            <p className="font-semibold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              <span>
                Rejected by supervisor: <strong>{approverName}</strong>
              </span>
            </p>
            {rejectionReason && (
              <p className="mt-0.5 text-[11px] opacity-90">Reason: {rejectionReason}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
