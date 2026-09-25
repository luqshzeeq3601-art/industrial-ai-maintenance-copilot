"""Work orders REST endpoints for API v1."""
from datetime import date
from typing import Any, Dict, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from backend.app.auth.security import get_current_user, verify_csrf
from backend.app.services.equipment_service import EquipmentService

router = APIRouter(prefix="/work-orders", tags=["Work Orders v1"])
service = EquipmentService()

Priority = Literal["low", "medium", "high", "critical"]
WorkOrderStatus = Literal["pending", "approved", "in_progress", "completed", "rejected"]

# Allowed status transitions. Approval decisions are reserved for supervisors/admins.
TRANSITIONS: Dict[str, set] = {
    "pending": {"approved", "rejected"},
    "approved": {"in_progress", "completed"},
    "in_progress": {"completed"},
    "completed": set(),
    "rejected": set(),
}
APPROVAL_STATUSES = {"approved", "rejected"}
APPROVER_ROLES = {"supervisor", "admin"}


def _valid_date(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError:
        raise ValueError("Due date must be YYYY-MM-DD.")


class WorkOrderCreate(BaseModel):
    machine_id: str = Field(..., min_length=3, max_length=50)
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(default="", max_length=2000)
    priority: Priority = "medium"
    assigned_to: Optional[str] = Field(default=None, max_length=100)
    due_date: Optional[str] = None

    _check_due = field_validator("due_date")(_valid_date)


class WorkOrderUpdate(BaseModel):
    status: Optional[WorkOrderStatus] = None
    assigned_to: Optional[str] = Field(default=None, max_length=100)
    due_date: Optional[str] = None
    rejection_reason: Optional[str] = Field(default=None, max_length=250)

    _check_due = field_validator("due_date")(_valid_date)


@router.get("")
def list_work_orders(
    machine_id: Optional[str] = Query(default=None, description="Filter by machine ID"),
    status: Optional[str] = Query(default=None, description="Comma-separated statuses: pending, approved, in_progress, completed, rejected"),
    priority: Optional[Priority] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100, description="Search ID, title, asset, or assignee"),
    sort: Literal["created_at", "due_date", "priority", "work_order_id"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(default=1, ge=1),
    page_size: Optional[int] = Query(default=None, ge=1, le=100, description="Omit to return all matches"),
):
    """List maintenance work orders with filtering, sorting, and optional pagination."""
    statuses = [s for s in (status or "").split(",") if s.strip()] or None
    limit = page_size
    offset = (page - 1) * page_size if page_size else 0
    orders, total = service.work_orders.search_work_orders(
        machine_id=machine_id, statuses=statuses, priority=priority, q=q,
        sort=sort, descending=order == "desc", limit=limit, offset=offset,
    )
    return {"count": len(orders), "total": total, "page": page, "page_size": page_size,
            "status_counts": service.work_orders.count_by_status(), "work_orders": orders}


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_work_order(payload: WorkOrderCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Create a work order. It starts as `pending` until a supervisor approves it."""
    try:
        return service.create_work_order(
            machine_id=payload.machine_id, title=payload.title.strip(),
            description=payload.description.strip(), priority=payload.priority,
            created_by=current_user["username"], assigned_to=payload.assigned_to,
            status="pending", due_date=payload.due_date,
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))


@router.patch("/{work_order_id}", dependencies=[Depends(verify_csrf)])
def update_work_order(work_order_id: str, payload: WorkOrderUpdate,
                      current_user: Dict[str, Any] = Depends(get_current_user)):
    """Change status (allowed transitions only), assignee, or due date."""
    wo = service.get_work_order(work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order '{work_order_id}' not found.")

    if payload.status and payload.status != wo["status"]:
        if payload.status not in TRANSITIONS[wo["status"]]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail=f"Cannot move a work order from '{wo['status']}' to '{payload.status}'.")
        if payload.status in APPROVAL_STATUSES:
            if current_user.get("role") not in APPROVER_ROLES:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="Only a supervisor or admin can approve or reject work orders.")
            if wo["created_by"] == current_user["username"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="You created this work order. Another supervisor or admin must decide on it.")
        service.work_orders.update_work_order_status(
            work_order_id, payload.status, approved_by=current_user["username"],
            rejection_reason=payload.rejection_reason,
        )

    fields = payload.model_dump(exclude_unset=True, include={"assigned_to", "due_date"})
    if fields:
        service.work_orders.update_work_order_fields(work_order_id, fields)
    return service.get_work_order(work_order_id)


@router.get("/{work_order_id}")
def get_work_order_detail(work_order_id: str):
    """Retrieve details of a specific maintenance work order."""
    wo = service.get_work_order(work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order '{work_order_id}' not found.")
    return wo
