import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_fleet_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/analytics/fleet-health")
        assert response.status_code == 200
        data = response.json()
        assert "total_units" in data
        assert "uptime_percentage" in data
        assert "status_distribution" in data
        assert data["total_units"] >= 10
        assert data["uptime_percentage"] > 0

@pytest.mark.asyncio
async def test_fault_categories_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/analytics/fault-categories")
        assert response.status_code == 200
        data = response.json()
        assert "fault_categories" in data
        assert "severity_distribution" in data
        assert len(data["fault_categories"]) >= 5

@pytest.mark.asyncio
async def test_machine_history_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/equipment/EQ-1000/history")
        assert response.status_code == 200
        data = response.json()
        assert data["machine_id"] == "EQ-1000"
        assert "logs" in data
        assert len(data["logs"]) > 0

@pytest.mark.asyncio
async def test_fleet_health_period_window():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        all_time = (await client.get("/api/analytics/fleet-health")).json()
        response = await client.get("/api/analytics/fleet-health?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 30
        assert data["previous_downtime_hours"] is not None
        assert data["repairs_logged"] <= all_time["repairs_logged"]
        assert all_time["previous_downtime_hours"] is None

@pytest.mark.asyncio
async def test_analytics_rejects_bad_window():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/api/analytics/fleet-health?days=0")).status_code == 422
        assert (await client.get("/api/analytics/fault-categories?days=-5")).status_code == 422
        response = await client.get("/api/analytics/fault-categories?days=90")
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_document_endpoint_serves_only_known_markdown():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        ok = await client.get("/api/documents/sop_spindle_bearing_replacement.md")
        assert ok.status_code == 200
        assert ok.headers["content-type"].startswith("text/markdown")
        assert len(ok.text) > 50
        assert (await client.get("/api/documents/..%2F..%2F.env")).status_code == 404
        assert (await client.get("/api/documents/missing.md")).status_code == 404
        assert (await client.get("/api/documents/config.py")).status_code == 404
