"""Contract tests for the endpoints added for the design-spec v2 frontend.

Covers CSRF enforcement, work-order create/update transitions and RBAC, alarms,
the SOP catalogue, the history feed, profile updates, search, telemetry
samples, fleet-health additions, and migration v5 idempotency.
"""
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.database.migrations import run_migrations
from backend.app.database.models import get_connection, init_db
from backend.app.main import app

init_db()

PASSWORDS = {"tech1": "TechPass123!", "supervisor1": "SupervisorPass123!", "admin1": "AdminPass123!"}


def signed_in(username: str) -> TestClient:
    """A client holding the user's auth cookies and sending their CSRF header."""
    client = TestClient(app)
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": PASSWORDS[username]})
    assert resp.status_code == 200
    client.headers["X-CSRF-Token"] = resp.json()["csrf_token"]
    return client


def new_work_order(client: TestClient, **overrides) -> dict:
    body = {"machine_id": "EQ-1000", "title": f"Test order {uuid.uuid4().hex[:6]}", "priority": "high",
            "due_date": "2026-10-01", **overrides}
    resp = client.post("/api/v1/work-orders", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


# --- CSRF ---

def test_mutation_without_csrf_header_is_rejected():
    client = signed_in("tech1")
    del client.headers["X-CSRF-Token"]
    resp = client.post("/api/v1/work-orders", json={"machine_id": "EQ-1000", "title": "No token"})
    assert resp.status_code == 403
    assert "csrf" in resp.json()["detail"].lower()


def test_mutation_with_wrong_csrf_header_is_rejected():
    client = signed_in("tech1")
    client.headers["X-CSRF-Token"] = "forged"
    resp = client.patch("/api/v1/users/me", json={"department": "Maintenance"})
    assert resp.status_code == 403


def test_unauthenticated_mutation_is_401():
    resp = TestClient(app).post("/api/v1/work-orders", json={"machine_id": "EQ-1000", "title": "Anon"})
    assert resp.status_code == 401


def test_auth_me_reissues_missing_csrf_cookie():
    client = signed_in("tech1")
    client.cookies.delete("copilot_csrf")
    resp = client.get("/api/v1/auth/me")
    assert resp.json()["authenticated"] is True
    assert resp.cookies.get("copilot_csrf") == resp.json()["csrf_token"]


# --- Work orders ---

def test_create_work_order_starts_pending_with_due_date():
    wo = new_work_order(signed_in("tech1"))
    assert wo["status"] == "pending"
    assert wo["created_by"] == "tech1"
    assert wo["due_date"] == "2026-10-01"


def test_create_work_order_validates_input():
    client = signed_in("tech1")
    assert client.post("/api/v1/work-orders", json={"machine_id": "EQ-1000", "title": "x"}).status_code == 422
    assert client.post("/api/v1/work-orders", json={"machine_id": "EQ-1000", "title": "Valid title",
                                                    "due_date": "10/01/2026"}).status_code == 422
    assert client.post("/api/v1/work-orders", json={"machine_id": "EQ-9999", "title": "Unknown asset"}).status_code == 422


def test_technician_cannot_approve_work_order():
    wo = new_work_order(signed_in("tech1"))
    resp = signed_in("tech1").patch(f"/api/v1/work-orders/{wo['work_order_id']}", json={"status": "approved"})
    assert resp.status_code == 403


def test_creator_cannot_approve_own_work_order():
    sup = signed_in("supervisor1")
    wo = new_work_order(sup)
    resp = sup.patch(f"/api/v1/work-orders/{wo['work_order_id']}", json={"status": "approved"})
    assert resp.status_code == 403
    assert "another supervisor" in resp.json()["detail"].lower()


def test_work_order_lifecycle_and_invalid_transition():
    tech, sup = signed_in("tech1"), signed_in("supervisor1")
    wo_id = new_work_order(tech)["work_order_id"]

    assert tech.patch(f"/api/v1/work-orders/{wo_id}", json={"status": "completed"}).status_code == 409

    approved = sup.patch(f"/api/v1/work-orders/{wo_id}", json={"status": "approved", "assigned_to": "David Chen"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["approved_by"] == "supervisor1"
    assert approved.json()["assigned_to"] == "David Chen"

    assert tech.patch(f"/api/v1/work-orders/{wo_id}", json={"status": "in_progress"}).json()["status"] == "in_progress"
    done = tech.patch(f"/api/v1/work-orders/{wo_id}", json={"status": "completed"}).json()
    assert done["status"] == "completed"
    assert done["completed_at"] is not None


def test_list_work_orders_filters_and_paginates():
    tech = signed_in("tech1")
    marker = uuid.uuid4().hex[:8]
    for _ in range(3):
        new_work_order(tech, title=f"Paginate {marker}", priority="low")
    page1 = tech.get("/api/v1/work-orders", params={"q": marker, "page_size": 2, "page": 1}).json()
    page2 = tech.get("/api/v1/work-orders", params={"q": marker, "page_size": 2, "page": 2}).json()
    assert page1["total"] == 3 and page1["count"] == 2 and page2["count"] == 1
    assert {w["work_order_id"] for w in page1["work_orders"]}.isdisjoint(w["work_order_id"] for w in page2["work_orders"])

    by_status = tech.get("/api/v1/work-orders", params={"q": marker, "status": "pending,approved"}).json()
    assert by_status["total"] == 3
    assert tech.get("/api/v1/work-orders", params={"q": marker, "priority": "high"}).json()["total"] == 0
    assert "pending" in by_status["status_counts"]


def test_list_work_orders_backward_compatible_without_pagination():
    data = TestClient(app).get("/api/v1/work-orders").json()
    assert data["count"] == data["total"] == len(data["work_orders"])


# --- Alarms ---

def test_alarm_acknowledge_flow_and_conflict():
    conn = get_connection()
    alarm_id = f"ALM-T-{uuid.uuid4().hex[:6]}"
    with conn:
        conn.execute("INSERT INTO alarms (alarm_id, machine_id, code, severity, status, triggered_at) "
                     "VALUES (?, 'EQ-1000', 'E-105', 'critical', 'active', ?)",
                     (alarm_id, datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")))
    conn.close()
    tech = signed_in("tech1")
    active = tech.get("/api/v1/alarms", params={"status": "active", "machine_id": "EQ-1000"}).json()["alarms"]
    assert any(a["alarm_id"] == alarm_id for a in active)

    resp = tech.post(f"/api/v1/alarms/{alarm_id}/acknowledge")
    assert resp.status_code == 200 and resp.json()["status"] == "acknowledged"
    assert tech.post(f"/api/v1/alarms/{alarm_id}/acknowledge").status_code == 409
    assert tech.post("/api/v1/alarms/ALM-NOPE/acknowledge").status_code == 404


# --- SOPs ---

def test_sop_catalogue_lists_and_filters():
    client = TestClient(app)
    all_sops = client.get("/api/v1/sops").json()
    assert all_sops["count"] >= 4
    assert all({"id", "title", "category", "assets", "status", "updated", "file"} <= s.keys() for s in all_sops["sops"])
    spindle = client.get("/api/v1/sops", params={"q": "spindle"}).json()["sops"]
    assert [s["id"] for s in spindle] == ["SOP-MNT-CNC-014"]
    assert client.get("/api/v1/sops", params={"asset": "ApexMill-500"}).json()["count"] >= 1
    assert client.get("/api/v1/sops", params={"category": "troubleshooting"}).json()["sops"][0]["id"] == "SOP-VAC-002"


def test_create_sop_is_admin_only(tmp_path, monkeypatch):
    (tmp_path / "sops").mkdir()
    monkeypatch.setattr(settings, "DOCS_DIR", tmp_path)
    body = {"id": "SOP-TEST-01", "title": "Guard door check", "category": "safety",
            "assets": ["ApexMill-500"], "body": "1. Lock out the machine before opening the guard door."}
    assert signed_in("tech1").post("/api/v1/sops", json=body).status_code == 403

    admin = signed_in("admin1")
    created = admin.post("/api/v1/sops", json=body)
    assert created.status_code == 201 and created.json()["status"] == "draft"
    assert (tmp_path / "sops" / created.json()["file"]).is_file()
    assert admin.post("/api/v1/sops", json=body).status_code == 409


def test_viewing_sop_signed_in_is_recorded_in_history():
    tech = signed_in("tech1")
    assert tech.get("/api/documents/sop_spindle_bearing_replacement.md").status_code == 200
    events = tech.get("/api/v1/history", params={"type": "sop", "user": "tech1"}).json()["events"]
    assert events and events[0]["description"].startswith("SOP-MNT-CNC-014 viewed")


# --- History ---

def test_history_is_newest_first_and_filters_by_type():
    client = TestClient(app)
    data = client.get("/api/v1/history", params={"page_size": 50}).json()
    times = [e["time"] for e in data["events"]]
    assert times == sorted(times, reverse=True)
    assert {"time", "type", "machine_id", "description", "user", "ref"} <= data["events"][0].keys()
    alarms = client.get("/api/v1/history", params={"type": "alarm"}).json()
    assert alarms["total"] > 0 and all(e["type"] == "alarm" for e in alarms["events"])
    assert client.get("/api/v1/history", params={"type": "bogus"}).status_code == 422


def test_history_records_created_work_order_and_date_window():
    wo = new_work_order(signed_in("tech1"))
    today = datetime.utcnow().date()
    data = TestClient(app).get("/api/v1/history", params={
        "type": "work_order", "from": today.isoformat(), "to": (today + timedelta(days=1)).isoformat(),
        "page_size": 100}).json()
    assert any(e["ref"] == wo["work_order_id"] for e in data["events"])


# --- Profile ---

def test_profile_update_and_role_guard():
    tech = signed_in("tech1")
    resp = tech.patch("/api/v1/users/me", json={"email": "david.chen@plant.example", "department": "Maintenance"})
    assert resp.status_code == 200
    assert resp.json()["department"] == "Maintenance"
    assert "password_hash" not in resp.json()
    assert tech.patch("/api/v1/users/me", json={"email": "not-an-email"}).status_code == 422
    assert tech.patch("/api/v1/users/me", json={"role": "admin"}).status_code == 403
    settings_events = tech.get("/api/v1/history", params={"type": "settings", "user": "tech1"}).json()["events"]
    assert settings_events


# --- Search ---

def test_global_search_groups_results():
    data = TestClient(app).get("/api/v1/search", params={"q": "EQ-1000"}).json()
    assert data["assets"][0]["machine_id"] == "EQ-1000"
    assert set(data) == {"assets", "work_orders", "sops"}
    assert TestClient(app).get("/api/v1/search", params={"q": "x"}).status_code == 422


# --- Telemetry samples ---

def test_telemetry_samples_round_trip():
    client = TestClient(app)
    now = datetime.now(timezone.utc)
    batch = {"machine_id": "EQ-1000", "samples": [
        {"metric": "spindle_speed", "value": 1250 + i, "observed_at": (now - timedelta(minutes=5 - i)).isoformat()}
        for i in range(5)
    ] + [{"metric": "temperature", "value": 32.4, "observed_at": now.isoformat()}]}
    resp = client.post("/api/v1/telemetry/samples", json=batch)
    assert resp.status_code == 200 and resp.json()["ingested"] == 6

    speed = client.get("/api/v1/telemetry/samples", params={
        "machine_id": "EQ-1000", "metric": "spindle_speed",
        "from": (now - timedelta(minutes=10)).isoformat(), "limit": 5}).json()
    assert speed["units"]["spindle_speed"] == "rpm"
    values = [s["value"] for s in speed["samples"]]
    assert values == sorted(values)  # oldest first
    assert client.post("/api/v1/telemetry/samples", json={"machine_id": "EQ-1000", "samples": [
        {"metric": "pressure", "value": 1, "observed_at": now.isoformat()}]}).status_code == 422


# --- Equipment + analytics ---

def test_equipment_includes_next_service():
    eq = TestClient(app).get("/api/v1/equipment/EQ-1000").json()
    assert eq["service_interval_hours"] > 0
    assert eq["next_service_in_hours"] == eq["service_interval_hours"] - (eq["operating_hours"] - eq["hours_at_last_service"])


def test_fleet_health_reports_active_work_orders_and_daily_downtime():
    data = TestClient(app).get("/api/analytics/fleet-health", params={"days": 3650}).json()
    assert isinstance(data["active_work_orders"], int)
    assert isinstance(data["daily_downtime_hours"], list)


# --- Migration ---

def test_migration_v5_is_idempotent(tmp_path):
    conn = sqlite3.connect(tmp_path / "fresh.db")
    run_migrations(conn)
    run_migrations(conn)
    versions = [r[0] for r in conn.execute("SELECT version FROM schema_migrations ORDER BY version")]
    assert versions == [1, 2, 3, 4, 5]
    cols = {r[1] for r in conn.execute("PRAGMA table_info(equipment)")}
    assert {"service_interval_hours", "hours_at_last_service"} <= cols
    assert conn.execute("SELECT count(*) FROM equipment WHERE service_interval_hours IS NULL").fetchone()[0] == 0
    conn.close()
