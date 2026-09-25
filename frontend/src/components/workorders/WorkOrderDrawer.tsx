import { useState } from "react";
import { Link } from "react-router";
import { Check, CircleCheck, Play, X } from "lucide-react";
import { isApproverRole } from "../../api/auth";
import type { WorkOrderStatus } from "../../api/models";
import { useUpdateWorkOrder, useWorkOrder, type WorkOrderChange } from "../../api/queries";
import { useCurrentUser } from "../../app/sessionContext";
import { formatDateTime } from "../../lib/format";
import { WORK_ORDER_STATUS } from "../../lib/status";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { TextField } from "../ui/Field";
import { ErrorState } from "../ui/States";
import { PriorityTag, StatusLabel } from "../ui/StatusLabel";
import { DueDate } from "./WorkOrderTable";

/** Detail drawer: the work order, its trail, and the status changes this user may make. */
export function WorkOrderDrawer({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  return <WorkOrderDetail key={id ?? "none"} id={id} onClose={onClose} />;
}

function WorkOrderDetail({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const user = useCurrentUser();
  const wo = useWorkOrder(id);
  const update = useUpdateWorkOrder();
  // Keyed by id in the parent, so this state starts fresh for each work order but survives refetches
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const change = (c: WorkOrderChange, done: string) =>
    update.mutate(
      { id: id!, change: c },
      {
        onSuccess: () => setMessage({ tone: "ok", text: done }),
        onError: (err) => setMessage({ tone: "error", text: err.message })
      }
    );

  const w = wo.data;
  const canDecide = !!w && w.status === "pending" && isApproverRole(user.role) && w.created_by !== user.username;
  const next: { status: WorkOrderStatus; label: string; icon: typeof Play; done: string }[] = !w
    ? []
    : w.status === "approved"
      ? [
          { status: "in_progress", label: "Start work", icon: Play, done: "Work started." },
          { status: "completed", label: "Mark complete", icon: CircleCheck, done: "Work order closed." }
        ]
      : w.status === "in_progress"
        ? [{ status: "completed", label: "Mark complete", icon: CircleCheck, done: "Work order closed." }]
        : [];
  const editable = !!w && ["pending", "approved", "in_progress"].includes(w.status);

  return (
    <Dialog open={!!id} onClose={onClose} variant="drawer" title={w ? w.title : "Work order"} description={id}>
      {wo.error ? (
        <ErrorState title="This work order didn't load" message={wo.error.message} onRetry={() => void wo.refetch()} />
      ) : !w ? (
        <div className="space-y-3" aria-hidden="true">
          <div className="skeleton h-5 w-1/2" />
          <div className="skeleton h-24" />
        </div>
      ) : (
        <div className="space-y-6">
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`p-3 rounded-[var(--radius-control)] text-meta font-medium ${message.tone === "error" ? "bg-danger-bg text-danger-ink" : "bg-success-bg text-success-ink"}`}>
              {message.text}
            </p>
          )}
          <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-meta">
            <dt className="text-body">Status</dt>
            <dd>
              <StatusLabel meta={WORK_ORDER_STATUS[w.status]} />
            </dd>
            <dt className="text-body">Priority</dt>
            <dd>
              <PriorityTag priority={w.priority} />
            </dd>
            <dt className="text-body">Asset</dt>
            <dd>
              <Link to={`/assets/${w.machine_id}`} className="font-data font-semibold text-accent">
                {w.machine_id}
              </Link>{" "}
              {w.machine_name}
            </dd>
            <dt className="text-body">Due date</dt>
            <dd>
              <DueDate order={w} />
            </dd>
            <dt className="text-body">Created</dt>
            <dd>
              <span className="font-data">{formatDateTime(w.created_at)}</span> by {w.created_by}
            </dd>
            {w.approved_by && (
              <>
                <dt className="text-body">Approved</dt>
                <dd>
                  <span className="font-data">{formatDateTime(w.approved_at)}</span> by {w.approved_by}
                </dd>
              </>
            )}
            {w.rejection_reason && (
              <>
                <dt className="text-body">Rejected</dt>
                <dd>{w.rejection_reason}</dd>
              </>
            )}
            {w.completed_at && (
              <>
                <dt className="text-body">Closed</dt>
                <dd className="font-data">{formatDateTime(w.completed_at)}</dd>
              </>
            )}
          </dl>
          {w.description && <p className="text-copy text-ink whitespace-pre-wrap">{w.description}</p>}

          {canDecide && (
            <section aria-labelledby="decision-heading" className="space-y-3 p-4 rounded-[var(--radius-card)] border border-warn-line bg-warn-bg">
              <h3 id="decision-heading" className="text-small font-semibold">
                Waiting for your decision
              </h3>
              {rejecting && <TextField label="Reason for rejecting" maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} />}
              <div className="flex flex-wrap gap-2">
                {!rejecting ? (
                  <>
                    <Button variant="primary" icon={Check} loading={update.isPending} onClick={() => change({ status: "approved" }, "Work order approved.")}>
                      Approve
                    </Button>
                    <Button icon={X} onClick={() => setRejecting(true)}>
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="danger" loading={update.isPending} onClick={() => change({ status: "rejected", rejection_reason: reason.trim() || undefined }, "Work order rejected.")}>
                      Reject work order
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(false)}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </section>
          )}
          {w.status === "pending" && !canDecide && (
            <p className="text-meta text-body">{isApproverRole(user.role) && w.created_by === user.username ? "Another supervisor or admin must approve work you created." : "A supervisor or admin approves this before work starts."}</p>
          )}

          {next.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {next.map((n) => (
                <Button key={n.status} variant={n.status === "completed" ? "secondary" : "primary"} icon={n.icon} loading={update.isPending && update.variables?.change.status === n.status} disabled={update.isPending} onClick={() => change({ status: n.status }, n.done)}>
                  {n.label}
                </Button>
              ))}
            </div>
          )}

          {editable && (
            <AssignmentForm
              key={`${w.assigned_to}|${w.due_date}`}
              assignedTo={w.assigned_to}
              dueDate={w.due_date}
              saving={update.isPending && !update.variables?.change.status}
              onSave={(c) => change(c, "Changes saved.")}
            />
          )}
        </div>
      )}
    </Dialog>
  );
}

function AssignmentForm({ assignedTo, dueDate, saving, onSave }: { assignedTo: string | null; dueDate: string | null; saving: boolean; onSave: (c: WorkOrderChange) => void }) {
  const [assignee, setAssignee] = useState(assignedTo ?? "");
  const [due, setDue] = useState(dueDate ?? "");
  const dirty = assignee.trim() !== (assignedTo ?? "") || due !== (dueDate ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ assigned_to: assignee.trim() || null, due_date: due || null });
      }}
      className="space-y-4 pt-4 border-t border-line"
    >
      <TextField label="Assignee" value={assignee} maxLength={100} onChange={(e) => setAssignee(e.target.value)} placeholder="Unassigned" />
      <TextField label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <Button type="submit" disabled={!dirty} loading={saving}>
        Save changes
      </Button>
    </form>
  );
}
