"""Comprehensive unit and integration tests for Telemetry REST, HMAC, and Services."""
import hashlib
import hmac
import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.database.models import get_connection
from backend.app.database.repository import IndustrialRepository
from backend.app.services.telemetry_service import TelemetryService

client = TestClient(app)

def create_hmac_headers(payload: dict, secret: str, timestamp_offset: float = 0.0, tamper_body: bool = False):
    body_str = json.dumps(payload)
    ts = str(int(time.time() + timestamp_offset))
    canonical = f"{ts}.{body_str}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
    if tamper_body:
        body_str = json.dumps({**payload, "value": 9999.0})
    return {
        "Content-Type": "application/json",
        "X-Signature-SHA256": f"sha256={sig}",
        "X-Timestamp": ts
    }, body_str

def test_telemetry_hmac_valid():
    """Test successful telemetry ingestion with valid HMAC signature."""
    event_id = str(uuid.uuid4())
    payload = {
        "event_id": event_id,
        "machine_id": "EQ-1001",
        "metric": "bearing_temp",
        "value": 55.0,
        "unit": "C",
        "severity": "normal"
    }
    headers, body = create_hmac_headers(payload, settings.TELEMETRY_HMAC_SECRET)
    response = client.post("/api/v1/telemetry/events", data=body, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["event_id"] == event_id
    assert data["machine_id"] == "EQ-1001"

def test_telemetry_hmac_tampered_payload_rejected():
    """Test HMAC signature failure when body is tampered with."""
    payload = {
        "event_id": str(uuid.uuid4()),
        "machine_id": "EQ-1001",
        "metric": "bearing_temp",
        "value": 55.0,
        "unit": "C"
    }
    headers, tampered_body = create_hmac_headers(payload, settings.TELEMETRY_HMAC_SECRET, tamper_body=True)
    response = client.post("/api/v1/telemetry/events", data=tampered_body, headers=headers)
    assert response.status_code == 401
    assert "Invalid HMAC SHA-256 signature" in response.json()["detail"]

def test_telemetry_replay_attack_rejected():
    """Test HMAC validation rejects timestamps outside 300s replay window."""
    payload = {
        "event_id": str(uuid.uuid4()),
        "machine_id": "EQ-1001",
        "metric": "bearing_temp",
        "value": 55.0,
        "unit": "C"
    }
    # 400s in past
    headers, body = create_hmac_headers(payload, settings.TELEMETRY_HMAC_SECRET, timestamp_offset=-400.0)
    response = client.post("/api/v1/telemetry/events", data=body, headers=headers)
    assert response.status_code == 401
    assert "replay window" in response.json()["detail"]

def test_telemetry_idempotency():
    """Test duplicate event_id is safely recognized and deduplicated."""
    event_id = str(uuid.uuid4())
    payload = {
        "event_id": event_id,
        "machine_id": "EQ-1002",
        "metric": "feeder_cycle_time",
        "value": 1.2,
        "unit": "s",
        "severity": "normal"
    }
    headers, body = create_hmac_headers(payload, settings.TELEMETRY_HMAC_SECRET)
    res1 = client.post("/api/v1/telemetry/events", data=body, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "processed"

    # Send again with fresh timestamp but same event_id
    headers2, body2 = create_hmac_headers(payload, settings.TELEMETRY_HMAC_SECRET)
    res2 = client.post("/api/v1/telemetry/events", data=body2, headers=headers2)
    assert res2.status_code == 200
    assert res2.json()["status"] == "duplicate"

def test_telemetry_alarm_and_status_update():
    """Test critical threshold breach triggers alarm and updates machine status to fault."""
    repo = IndustrialRepository()
    initial_orders_count = len(repo.get_work_orders(machine_id="EQ-2001"))

    event_id = str(uuid.uuid4())
    payload = {
        "event_id": event_id,
        "machine_id": "EQ-2001",
        "metric": "plasma_rf_forward_power",
        "value": 1250.0,
        "unit": "W",
        "severity": "critical"
    }
    headers, body = create_hmac_headers(payload, settings.TELEMETRY_HMAC_SECRET)
    response = client.post("/api/v1/telemetry/events", data=body, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["alarm_created"] is not None
    assert data["equipment_status_updated"] == "fault"

    # Check equipment status in database
    eq = repo.get_equipment_by_id("EQ-2001")
    assert eq["status"] == "fault"

    # STRICT BOUNDARY: Verify NO work order was created
    current_orders_count = len(repo.get_work_orders(machine_id="EQ-2001"))
    assert current_orders_count == initial_orders_count, "Telemetry ingestion MUST NEVER create work orders autonomously"

def test_list_telemetry_events():
    """Test querying telemetry events endpoint."""
    response = client.get("/api/v1/telemetry/events?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "events" in data
    assert isinstance(data["events"], list)
