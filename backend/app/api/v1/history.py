"""Plant-wide history (audit timeline) REST endpoint for API v1."""
from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Query
from backend.app.database.activity_repository import ActivityRepository

router = APIRouter(prefix="/history", tags=["History v1"])
repo = ActivityRepository()

HistoryType = Literal["alarm", "diagnostic", "work_order", "maintenance", "approval", "sop", "settings"]


@router.get("")
def list_history(
    since: Optional[date] = Query(default=None, alias="from", description="Inclusive start date (YYYY-MM-DD)"),
    until: Optional[date] = Query(default=None, alias="to", description="Exclusive end date (YYYY-MM-DD)"),
    type: Optional[HistoryType] = None,
    machine_id: Optional[str] = Query(default=None, max_length=50),
    user: Optional[str] = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """Alarms, diagnostics, work orders, maintenance, approvals, SOP views, and settings changes, newest first."""
    events, total = repo.history(
        since=since.isoformat() if since else None, until=until.isoformat() if until else None,
        type=type, machine_id=machine_id, user=user,
        limit=page_size, offset=(page - 1) * page_size,
    )
    return {"total": total, "page": page, "page_size": page_size,
            "users": repo.history_users(), "events": events}
