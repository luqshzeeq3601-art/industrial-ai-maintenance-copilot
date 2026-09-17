"""Work orders REST endpoints for API v1."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.services.equipment_service import EquipmentService

router = APIRouter(prefix="/work-orders", tags=["Work Orders v1"])
service = EquipmentService()

@router.get("")
def list_work_orders(
    machine_id: Optional[str] = Query(default=None, description="Filter by machine ID"),
    status: Optional[str] = Query(default=None, description="Filter by status: pending, approved, in_progress, completed, rejected")
):
    """List maintenance work orders with optional machine and status filtering."""
    orders = service.list_work_orders(machine_id=machine_id, status=status)
    return {"count": len(orders), "work_orders": orders}

@router.get("/{work_order_id}")
def get_work_order_detail(work_order_id: str):
    """Retrieve details of a specific maintenance work order."""
    wo = service.get_work_order(work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order '{work_order_id}' not found.")
    return wo
