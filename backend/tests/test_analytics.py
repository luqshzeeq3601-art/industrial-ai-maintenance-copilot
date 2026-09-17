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
