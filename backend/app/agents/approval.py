"""Approval Node implementing LangGraph Human-in-the-Loop contract via interrupt()."""
import logging
import uuid
from typing import Dict, Any, Optional
from langchain_core.messages import AIMessage
from langgraph.types import interrupt, Command
from langgraph.graph import END
from backend.app.agents.state import AgentState
from backend.app.services.equipment_service import EquipmentService

logger = logging.getLogger("copilot.agents.approval")
service = EquipmentService()

def execute_approved_mutation(action: Dict[str, Any], approver_id: str) -> Dict[str, Any]:
    """Execute a validated state-changing action in a database transaction."""
    action_type = action["action_type"]
    args = action.get("arguments", {})
    action_id = action.get("action_id", str(uuid.uuid4()))
    requester = action.get("requester_id", "technician")
    requester_role = action.get("requester_role", "technician")

    if action_type == "create_work_order":
        result = service.create_work_order(
            machine_id=args["machine_id"],
            title=args["title"],
            description=args["description"],
            priority=args.get("priority", "medium"),
            created_by=requester,
            assigned_to=args.get("assigned_to"),
            status="approved"
        )
        service.repo.update_work_order_status(
            work_order_id=result["work_order_id"],
            status="approved",
            approved_by=approver_id
        )
        service.repo.record_audit(
            action_id=action_id,
            action_type=action_type,
            user_id=approver_id,
            user_role="supervisor",
            decision="executed",
            payload={"work_order_id": result["work_order_id"], **args}
        )
        return {
            "success": True,
            "action_id": action_id,
            "work_order_id": result["work_order_id"],
            "summary": f"Work Order {result['work_order_id']} created and approved for {args['machine_id'].upper()}."
        }

    elif action_type == "acknowledge_alarm":
        result = service.acknowledge_alarm(
            alarm_id=args["alarm_id"],
            user_id=approver_id,
            user_role="supervisor"
        )
        return {
            "success": True,
            "action_id": action_id,
            "alarm_id": args["alarm_id"],
            "summary": f"Alarm {args['alarm_id'].upper()} acknowledged by supervisor {approver_id}."
        }

    elif action_type == "schedule_inspection":
        result = service.schedule_inspection(
            machine_id=args["machine_id"],
            inspection_type=args["inspection_type"],
            scheduled_date=args["scheduled_date"],
            technician=args["technician"],
            created_by=requester,
            notes=args.get("notes")
        )
        service.repo.record_audit(
            action_id=action_id,
            action_type=action_type,
            user_id=approver_id,
            user_role="supervisor",
            decision="executed",
            payload={"inspection_id": result["inspection_id"], **args}
        )
        return {
            "success": True,
            "action_id": action_id,
            "inspection_id": result["inspection_id"],
            "summary": f"Inspection {result['inspection_id']} scheduled for {args['machine_id'].upper()} on {args['scheduled_date']}."
        }

    else:
        raise ValueError(f"Unknown action type: '{action_type}'")

def create_approval_node():
    """Create the approval node with LangGraph interrupt() pausing."""
    def approval_node(state: AgentState) -> Command:
        pending = state.get("pending_action")
        trace = list(state.get("workflow_trace", []))

        if not pending:
            return Command(goto="supervisor")

        action_id = pending.get("action_id", str(uuid.uuid4()))
        pending["action_id"] = action_id

        # Record pending request in audit log
        session_id = state.get("session_id") or pending.get("session_id")
        audit_payload = {
            "session_id": session_id,
            "action_id": action_id,
            "action_type": pending["action_type"],
            "summary": pending.get("summary", ""),
            "arguments": pending.get("arguments", {}),
            **pending.get("arguments", {})
        }
        service.repo.record_audit(
            action_id=action_id,
            action_type=pending["action_type"],
            user_id=pending.get("requester_id") or "unauthenticated",
            user_role=pending.get("requester_role") or "unauthenticated",
            decision="requested",
            payload=audit_payload
        )

        trace.append({
            "agent": "approval",
            "action": "pause_for_approval",
            "summary": f"Paused workflow for supervisor approval of '{pending['action_type']}' (ID: {action_id})."
        })

        # Official LangGraph Human-In-The-Loop contract:
        # interrupt() surfaces the action payload and halts graph execution
        interrupt_payload = {
            "action_id": action_id,
            "action_type": pending["action_type"],
            "arguments": pending.get("arguments", {}),
            "summary": pending.get("summary", ""),
            "requester": pending.get("requester_id", "technician"),
            "requester_role": pending.get("requester_role", "technician")
        }

        resume_decision = interrupt(interrupt_payload)

        # When resumed via Command(resume={...}):
        # Verify approval decision
        is_approved = bool(resume_decision.get("approved", False))
        approver = resume_decision.get("approver_id") or resume_decision.get("approver") or "supervisor1"
        approver_role = resume_decision.get("approver_role") or "supervisor"
        reason = resume_decision.get("reason", "")

        if is_approved:
            # Technicians are NOT permitted to approve!
            if approver_role == "technician":
                err_msg = f"Security Violation: User '{approver}' with role 'technician' is not authorized to approve actions."
                service.repo.record_audit(
                    action_id=action_id,
                    action_type=pending["action_type"],
                    user_id=approver,
                    user_role=approver_role,
                    decision="rejected",
                    payload={"error": err_msg}
                )
                trace.append({"agent": "approval", "action": "unauthorized_approval_attempt", "summary": err_msg})
                return Command(
                    goto="supervisor",
                    update={
                        "pending_action": None,
                        "status": "failed",
                        "error": err_msg,
                        "messages": [AIMessage(content=f"🚫 **Authorization Failure**: {err_msg}", name="approval")],
                        "workflow_trace": trace
                    }
                )

            try:
                exec_result = execute_approved_mutation(pending, approver_id=approver)
                service.repo.record_audit(
                    action_id=action_id,
                    action_type=pending["action_type"],
                    user_id=approver,
                    user_role=approver_role,
                    decision="approved",
                    payload=pending.get("arguments", {})
                )
                trace.append({
                    "agent": "approval",
                    "action": "action_approved_and_executed",
                    "summary": f"Action approved by {approver}. {exec_result.get('summary', '')}"
                })
                return Command(
                    goto="supervisor",
                    update={
                        "pending_action": None,
                        "action_result": exec_result,
                        "status": "completed",
                        "messages": [AIMessage(
                            content=f"✅ **Action Approved & Executed**\n\n{exec_result.get('summary', '')}\n\n*Approved by: {approver}*",
                            name="approval"
                        )],
                        "workflow_trace": trace
                    }
                )
            except Exception as ex:
                logger.error(f"Error executing approved action: {ex}", exc_info=True)
                return Command(
                    goto="supervisor",
                    update={
                        "pending_action": None,
                        "status": "failed",
                        "error": str(ex),
                        "messages": [AIMessage(content=f"⚠️ Failed to execute approved action: {str(ex)}", name="approval")],
                        "workflow_trace": trace
                    }
                )
        else:
            # Action Rejected
            service.repo.record_audit(
                action_id=action_id,
                action_type=pending["action_type"],
                user_id=approver,
                user_role=approver_role,
                decision="rejected",
                payload={"reason": reason}
            )
            rejection_text = f"Action was rejected by supervisor {approver}."
            if reason:
                rejection_text += f" Reason: {reason}"

            trace.append({
                "agent": "approval",
                "action": "action_rejected",
                "summary": rejection_text
            })
            return Command(
                goto="supervisor",
                update={
                    "pending_action": None,
                    "status": "rejected",
                    "messages": [AIMessage(content=f"❌ **Action Rejected**\n\n{rejection_text}", name="approval")],
                    "workflow_trace": trace
                }
            )

    return approval_node
