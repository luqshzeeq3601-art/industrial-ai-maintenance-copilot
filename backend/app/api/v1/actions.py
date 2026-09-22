"""Action approval and rejection REST endpoints for Human-in-the-Loop workflows."""
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from langgraph.types import Command
from backend.app.auth.security import get_current_user, require_roles
from backend.app.database.user_audit_telemetry_repository import AuditRepository
from backend.app.agents.graph import get_graph

router = APIRouter(prefix="/actions", tags=["Action Approvals v1"])
repo = AuditRepository()

class RejectPayload(BaseModel):
    reason: Optional[str] = Field(default="Rejected by supervisor", max_length=250)

def _forbid_self_approval(row: Dict[str, Any], current_user: Dict[str, Any]) -> None:
    """Segregation of duties: the person who requested an action cannot decide on it."""
    if row.get("user_id") == current_user["username"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You requested this action. Another supervisor or admin must decide on it.")

@router.get("/pending")
def list_pending_actions(
    current_user: Dict[str, Any] = Depends(require_roles(["supervisor", "admin"]))
):
    """List all actions currently awaiting supervisor approval."""
    pending = []
    for r in repo.list_pending_actions():
        payload = json.loads(r["payload_json"])
        pending.append({
            "action_id": r["action_id"],
            "action_type": r["action_type"],
            "requester": r["user_id"],
            "requester_role": r["user_role"],
            "requested_at": r["timestamp"],
            "session_id": payload.get("session_id"),
            "summary": payload.get("summary", f"{r['action_type']} on {payload.get('machine_id', 'plant')}"),
            "arguments": payload.get("arguments", payload)
        })
    return {"count": len(pending), "pending_actions": pending}

@router.post("/{action_id}/approve")
def approve_action(
    action_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["supervisor", "admin"]))
):
    """Approve a pending action and resume the LangGraph execution thread."""
    row = repo.get_requested_action(action_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Pending action '{action_id}' not found.")
    if repo.has_decision(action_id):
        raise HTTPException(status_code=400, detail=f"Action '{action_id}' has already been processed.")
    _forbid_self_approval(row, current_user)
    payload = json.loads(row["payload_json"])
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id for pending action thread.")
    graph = get_graph()
    config = {"configurable": {"thread_id": session_id}}
    resume_cmd = Command(resume={"approved": True, "approver_id": current_user["username"],
                                 "approver_role": current_user["role"]})
    final_state = graph.invoke(resume_cmd, config=config)
    return {"status": "approved", "action_id": action_id,
            "approver": current_user["username"], "action_result": final_state.get("action_result")}

@router.post("/{action_id}/reject")
def reject_action(
    action_id: str,
    payload: RejectPayload,
    current_user: Dict[str, Any] = Depends(require_roles(["supervisor", "admin"]))
):
    """Reject a pending action and resume the LangGraph execution thread."""
    row = repo.get_requested_action(action_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Pending action '{action_id}' not found.")
    if repo.has_decision(action_id):
        raise HTTPException(status_code=400, detail=f"Action '{action_id}' has already been processed.")
    _forbid_self_approval(row, current_user)
    action_data = json.loads(row["payload_json"])
    session_id = action_data.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id for pending action thread.")
    graph = get_graph()
    config = {"configurable": {"thread_id": session_id}}
    resume_cmd = Command(resume={"approved": False, "approver_id": current_user["username"],
                                 "approver_role": current_user["role"], "reason": payload.reason})
    final_state = graph.invoke(resume_cmd, config=config)
    return {"status": "rejected", "action_id": action_id,
            "approver": current_user["username"], "reason": payload.reason}
