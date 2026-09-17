"""Equipment REST endpoints for API v1."""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from backend.app.services.equipment_service import EquipmentService

router = APIRouter(prefix="/equipment", tags=["Equipment v1"])
service = EquipmentService()

@router.get("")
def list_equipment():
    """Retrieve all registered plant equipment units."""
    equipment = service.get_equipment_list()
    return {"count": len(equipment), "equipment": equipment}

@router.get("/{machine_id}")
def get_equipment_detail(machine_id: str):
    """Retrieve specification and operational details for a specific equipment unit."""
    eq = service.get_equipment_detail(machine_id)
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment '{machine_id}' not found.")
    return eq

@router.get("/{machine_id}/status")
def get_equipment_status(machine_id: str):
    """Retrieve operational status, active alarms, and recent maintenance summary."""
    status_data = service.get_equipment_status_summary(machine_id)
    if not status_data:
        raise HTTPException(status_code=404, detail=f"Equipment '{machine_id}' not found.")
    return status_data

@router.get("/{machine_id}/alarms")
def get_equipment_alarms(
    machine_id: str,
    status: Optional[str] = Query(default=None, description="Filter by alarm status: active, acknowledged, cleared")
):
    """Retrieve active or historical alarms for a specific machine."""
    eq = service.get_equipment_detail(machine_id)
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment '{machine_id}' not found.")
    alarms = service.get_alarms_for_equipment(machine_id=machine_id, status=status)
    return {"machine_id": machine_id.upper(), "count": len(alarms), "alarms": alarms}

@router.get("/{machine_id}/maintenance-history")
def get_equipment_maintenance_history(
    machine_id: str,
    limit: int = Query(default=10, ge=1, le=100, description="Max records to return")
):
    """Retrieve historical maintenance logs for an equipment unit."""
    eq = service.get_equipment_detail(machine_id)
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment '{machine_id}' not found.")
    history = service.repo.get_maintenance_history(machine_id=machine_id, limit=limit)
    return {"machine_id": machine_id.upper(), "count": len(history), "logs": history}
