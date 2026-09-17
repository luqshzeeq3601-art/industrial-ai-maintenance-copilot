"""Inspections REST endpoints for API v1."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.services.equipment_service import EquipmentService

router = APIRouter(prefix="/inspections", tags=["Inspections v1"])
service = EquipmentService()

@router.get("")
def list_inspections(
    machine_id: Optional[str] = Query(default=None, description="Filter by machine ID"),
    status: Optional[str] = Query(default=None, description="Filter by status: scheduled, in_progress, completed, cancelled")
):
    """List scheduled equipment inspections with optional filters."""
    inspections = service.list_inspections(machine_id=machine_id, status=status)
    return {"count": len(inspections), "inspections": inspections}

@router.get("/{inspection_id}")
def get_inspection_detail(inspection_id: str):
    """Retrieve details of a specific scheduled inspection."""
    ins = service.get_inspection(inspection_id)
    if not ins:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")
    return ins
