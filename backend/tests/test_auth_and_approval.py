"""Tests for RBAC authentication, LangGraph interrupt approvals, and SQLite persistence."""
import uuid
import pytest
from fastapi.testclient import TestClient
from langgraph.types import Command
from backend.app.main import app
from backend.app.agents.graph import get_graph, build_maintenance_graph
from backend.app.database.repository import IndustrialRepository

client = TestClient(app)
repo = IndustrialRepository()

def test_login_success_and_cookies():
    resp = client.post("/api/v1/auth/login", json={"username": "supervisor1", "password": "SupervisorPass123!"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "supervisor1"
    assert data["role"] == "supervisor"
    assert "csrf_token" in data
    assert "copilot_auth" in resp.cookies
    assert "copilot_csrf" in resp.cookies

def test_login_invalid_credentials():
    resp = client.post("/api/v1/auth/login", json={"username": "supervisor1", "password": "WrongPassword!"})
    assert resp.status_code == 401
    assert "Invalid username" in resp.json()["detail"]

def test_auth_me_authenticated():
    # Login as tech1
    login_resp = client.post("/api/v1/auth/login", json={"username": "tech1", "password": "TechPass123!"})
    cookies = login_resp.cookies

    me_resp = client.get("/api/v1/auth/me", cookies=cookies)
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["authenticated"] is True
    assert data["user"]["role"] == "technician"

def test_unauthenticated_user_cannot_approve():
    client.cookies.clear()
    resp = client.post("/api/v1/actions/ACT-NONEXISTENT/approve")
    assert resp.status_code == 401

def test_technician_forbidden_from_approving():
    client.cookies.clear()
    # Login as technician
    tech_login = client.post("/api/v1/auth/login", json={"username": "tech1", "password": "TechPass123!"})
    cookies = tech_login.cookies

    resp = client.post("/api/v1/actions/ACT-TEST-123/approve", cookies=cookies,
                       headers={"X-CSRF-Token": tech_login.json()["csrf_token"]})
    assert resp.status_code == 403
    assert "forbidden" in resp.json()["detail"].lower()

def test_human_in_the_loop_approval_flow():
    client.cookies.clear()
    # 1. Tech logs in
    tech_login = client.post("/api/v1/auth/login", json={"username": "tech1", "password": "TechPass123!"})
    tech_cookies = tech_login.cookies

    # 2. Tech requests a work order via chat
    session_id = f"test-wo-session-{uuid.uuid4().hex[:6]}"
    chat_resp = client.post(
        "/api/chat",
        json={"message": "Please create work order for EQ-1000 for critical spindle bearing overheating", "session_id": session_id},
        cookies=tech_cookies
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert data["status"] == "approval_required"
    assert data["pending_action"] is not None
    action_id = data["pending_action"]["action_id"]

    # 3. Supervisor logs in
    sup_login = client.post("/api/v1/auth/login", json={"username": "supervisor1", "password": "SupervisorPass123!"})
    sup_cookies = sup_login.cookies
    sup_csrf = {"X-CSRF-Token": sup_login.json()["csrf_token"]}

    # 4. Supervisor views pending actions
    pending_resp = client.get("/api/v1/actions/pending", cookies=sup_cookies)
    assert pending_resp.status_code == 200
    p_actions = pending_resp.json()["pending_actions"]
    assert any(a["action_id"] == action_id for a in p_actions)

    # 5. Supervisor approves action
    approve_resp = client.post(f"/api/v1/actions/{action_id}/approve", cookies=sup_cookies, headers=sup_csrf)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"
    wo_id = approve_resp.json()["action_result"]["work_order_id"]

    # 6. Verify work order exists in database and is marked approved
    wo_record = repo.get_work_order_by_id(wo_id)
    assert wo_record is not None
    assert wo_record["status"] == "approved"
    assert wo_record["approved_by"] == "supervisor1"

    # 7. Replay attack: attempting to approve again fails
    replay_resp = client.post(f"/api/v1/actions/{action_id}/approve", cookies=sup_cookies, headers=sup_csrf)
    assert replay_resp.status_code == 400

def test_sqlite_checkpoint_persistence_across_app_recreation():
    client.cookies.clear()
    # Ensure ALM-001 is in active state
    conn = repo._get_conn()
    with conn:
        conn.execute("UPDATE alarms SET status = 'active', acknowledged_by = NULL, acknowledged_at = NULL WHERE alarm_id = 'ALM-001'")

    # 1. Tech logs in and initiates an alarm acknowledgment that pauses at approval
    tech_login = client.post("/api/v1/auth/login", json={"username": "tech1", "password": "TechPass123!"})
    session_id = f"test-persist-{uuid.uuid4().hex[:6]}"
    chat_resp = client.post(
        "/api/chat",
        json={"message": "acknowledge alarm ALM-001", "session_id": session_id},
        cookies=tech_login.cookies
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert data["status"] == "approval_required"

    # 2. Recreate graph instance from scratch (simulating backend process restart)
    new_graph = build_maintenance_graph()
    config = {"configurable": {"thread_id": session_id}}

    # 3. Verify state persisted in SQLite checkpoints.db
    persisted_state = new_graph.get_state(config)
    assert persisted_state.tasks is not None
    assert any(t.interrupts for t in persisted_state.tasks)

    # 4. Resume from the persisted checkpoint with supervisor approval
    resume_cmd = Command(resume={"approved": True, "approver_id": "supervisor1", "approver_role": "supervisor"})
    final_state = new_graph.invoke(resume_cmd, config=config)
    assert final_state.get("status") == "completed"
    assert final_state.get("action_result")["success"] is True

    # 5. Check alarm is acknowledged in SQLite database
    alarm = repo.get_alarm_by_id("ALM-001")
    assert alarm["status"] == "acknowledged"
    assert alarm["acknowledged_by"] == "supervisor1"

def test_requester_cannot_approve_own_action():
    client.cookies.clear()
    sup_login = client.post("/api/v1/auth/login", json={"username": "supervisor1", "password": "SupervisorPass123!"})
    sup_cookies = sup_login.cookies
    sup_csrf = {"X-CSRF-Token": sup_login.json()["csrf_token"]}
    session_id = f"test-self-approve-{uuid.uuid4().hex[:6]}"
    chat_resp = client.post(
        "/api/chat",
        json={"message": "Please create work order for EQ-1000 for critical spindle bearing overheating", "session_id": session_id},
        cookies=sup_cookies
    )
    assert chat_resp.json()["status"] == "approval_required"
    action_id = chat_resp.json()["pending_action"]["action_id"]

    approve_resp = client.post(f"/api/v1/actions/{action_id}/approve", cookies=sup_cookies, headers=sup_csrf)
    assert approve_resp.status_code == 403
    assert "another supervisor" in approve_resp.json()["detail"].lower()

    reject_resp = client.post(f"/api/v1/actions/{action_id}/reject", json={"reason": "self"}, cookies=sup_cookies, headers=sup_csrf)
    assert reject_resp.status_code == 403


def test_approval_requires_csrf_header():
    client.cookies.clear()
    sup_login = client.post("/api/v1/auth/login", json={"username": "supervisor1", "password": "SupervisorPass123!"})
    resp = client.post("/api/v1/actions/ACT-TEST-123/approve", cookies=sup_login.cookies)
    assert resp.status_code == 403
    assert "csrf" in resp.json()["detail"].lower()
