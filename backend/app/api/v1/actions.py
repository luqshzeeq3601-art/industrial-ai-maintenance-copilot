"""Action approval and rejection REST endpoints for Human-in-the-Loop workflows."""
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from langgraph.types import Command
from backend.app.auth.security import get_current_user, require_roles
from backend.app.database.repository import IndustrialRepository
from backend.app.agents.graph import get_graph

router = APIRouter(prefix="/actions", tags=["Action Approvals v1"])
repo = IndustrialRepository()

class RejectPayload(BaseModel):
    reason: Optional[str] = Field(default="Rejected by supervisor", max_length=250)

@router.get("/pending")
def list_pending_actions(
    current_user: Dict[str, Any] = Depends(require_roles(["supervisor", "admin"]))
):
    """List all actions currently awaiting supervisor approval."""
    conn = repo._get_conn()
    try:
        cur = conn.cursor()
        # Find actions with 'requested' but no subsequent 'approved', 'executed', or 'rejected'
        cur.execute("""
            SELECT a.audit_id, a.action_id, a.action_type, a.user_id, a.user_role, a.payload_json, a.timestamp
            FROM action_audit a
            WHERE a.decision = 'requested'
            AND a.action_id NOT IN (
                SELECT action_id FROM action_audit WHERE decision IN ('approved', 'rejected', 'executed')
            )
            ORDER BY a.timestamp DESC
        """)
        rows = cur.fetchall()
        pending = []
        for r in rows:
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
    finally:
        if not repo._conn:
            conn.close()

@router.post("/{action_id}/approve")
def approve_action(
    action_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["supervisor", "admin"]))
):
    """Approve a pending action and resume the LangGraph execution thread."""
    conn = repo._get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT action_id, action_type, payload_json FROM action_audit WHERE action_id = ? AND decision = 'requested'",
            (action_id.strip(),)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Pending action '{action_id}' not found.")

        # Check if already decided
        cur.execute(
            "SELECT decision FROM action_audit WHERE action_id = ? AND decision IN ('approved', 'rejected', 'executed')",
            (action_id.strip(),)
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Action '{action_id}' has already been processed.")

        payload = json.loads(row["payload_json"])
        session_id = payload.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id for pending action thread.")

        # Resume LangGraph thread via Command(resume=...)
        graph = get_graph()
        config = {"configurable": {"thread_id": session_id}}
        resume_cmd = Command(
            resume={
                "approved": True,
                "approver_id": current_user["username"],
                "approver_role": current_user["role"]
            }
        )
        final_state = graph.invoke(resume_cmd, config=config)

        return {
            "status": "approved",
            "action_id": action_id,
            "approver": current_user["username"],
            "action_result": final_state.get("action_result")
        }
    finally:
        if not repo._conn:
            conn.close()

@router.post("/{action_id}/reject")
def reject_action(
    action_id: str,
    payload: RejectPayload,
    current_user: Dict[str, Any] = Depends(require_roles(["supervisor", "admin"]))
):
    """Reject a pending action and resume the LangGraph execution thread."""
    conn = repo._get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT action_id, payload_json FROM action_audit WHERE action_id = ? AND decision = 'requested'",
            (action_id.strip(),)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Pending action '{action_id}' not found.")

        # Check if already decided
        cur.execute(
            "SELECT decision FROM action_audit WHERE action_id = ? AND decision IN ('approved', 'rejected', 'executed')",
            (action_id.strip(),)
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Action '{action_id}' has already been processed.")

        action_data = json.loads(row["payload_json"])
        session_id = action_data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id for pending action thread.")

        # Resume LangGraph thread with rejection
        graph = get_graph()
        config = {"configurable": {"thread_id": session_id}}
        resume_cmd = Command(
            resume={
                "approved": False,
                "approver_id": current_user["username"],
                "approver_role": current_user["role"],
                "reason": payload.reason
            }
        )
        final_state = graph.invoke(resume_cmd, config=config)

        return {
            "status": "rejected",
            "action_id": action_id,
            "approver": current_user["username"],
            "reason": payload.reason
        }
    finally:
        if not repo._conn:
            conn.close()
