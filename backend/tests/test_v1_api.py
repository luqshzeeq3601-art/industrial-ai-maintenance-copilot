"""Tests for REST API v1 resources and compatibility wrappers."""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.models import init_db

init_db()
client = TestClient(app)

def test_list_equipment_v1():
    resp = client.get("/api/v1/equipment")
    assert resp.status_code == 200
    data = resp.json()
    assert "equipment" in data
    assert data["count"] >= 10
    first = data["equipment"][0]
    assert "machine_id" in first
    assert "name" in first
    assert "status" in first

def test_get_equipment_detail():
    resp = client.get("/api/v1/equipment/EQ-1000")
    assert resp.status_code == 200
    data = resp.json()
    assert data["machine_id"] == "EQ-1000"
    assert data["name"] == "ApexMill-500"

def test_get_nonexistent_equipment():
    resp = client.get("/api/v1/equipment/EQ-9999")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

def test_equipment_status_summary():
    resp = client.get("/api/v1/equipment/EQ-1000/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "equipment" in data
    assert "active_alarms" in data
    assert "recent_maintenance" in data

def test_equipment_alarms():
    resp = client.get("/api/v1/equipment/EQ-1000/alarms")
    assert resp.status_code == 200
    data = resp.json()
    assert data["machine_id"] == "EQ-1000"
    assert isinstance(data["alarms"], list)

def test_fault_codes_v1():
    resp = client.get("/api/v1/fault-codes")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 18
    assert any(fc["code"] == "E-402" for fc in data["fault_codes"])

def test_fault_code_detail():
    resp = client.get("/api/v1/fault-codes/E-402")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "E-402"
    assert "Spindle Drive" in data["description"]

def test_work_orders_v1():
    resp = client.get("/api/v1/work-orders")
    assert resp.status_code == 200
    data = resp.json()
    assert "work_orders" in data
    assert data["count"] >= 1

def test_inspections_v1():
    resp = client.get("/api/v1/inspections")
    assert resp.status_code == 200
    data = resp.json()
    assert "inspections" in data
    assert data["count"] >= 1

def test_legacy_compatibility_wrappers():
    # /api/equipment
    r1 = client.get("/api/equipment")
    assert r1.status_code == 200
    assert len(r1.json()["equipment"]) >= 10

    # /api/fault-codes
    r2 = client.get("/api/fault-codes")
    assert r2.status_code == 200
    assert len(r2.json()["fault_codes"]) >= 18

    # /api/stats
    r3 = client.get("/api/stats")
    assert r3.status_code == 200
    assert r3.json()["equipment_count"] >= 10

    # /api/analytics/fleet-health
    r4 = client.get("/api/analytics/fleet-health")
    assert r4.status_code == 200
    assert r4.json()["total_units"] >= 10
