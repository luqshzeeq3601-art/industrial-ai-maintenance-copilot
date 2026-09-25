"""Plant-wide alarm REST endpoints for API v1."""
from typing import Any, Dict, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.auth.security import get_current_user, verify_csrf
from backend.app.services.equipment_service import EquipmentService

router = APIRouter(prefix="/alarms", tags=["Alarms v1"])
service = EquipmentService()


@router.get("")
def list_alarms(
    machine_id: Optional[str] = Query(default=None),
    status: Optional[Literal["active", "acknowledged", "cleared"]] = None,
):
    """List alarms across the plant, newest first."""
    alarms = service.alarms.get_alarms(machine_id=machine_id, status=status)
    return {"count": len(alarms), "alarms": alarms}


@router.post("/{alarm_id}/acknowledge", dependencies=[Depends(verify_csrf)])
def acknowledge_alarm(alarm_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Acknowledge an active alarm. Recorded in the audit log."""
    try:
        return service.acknowledge_alarm(alarm_id, user_id=current_user["username"], user_role=current_user["role"])
    except ValueError as err:
        code = status.HTTP_404_NOT_FOUND if "does not exist" in str(err) else status.HTTP_409_CONFLICT
        raise HTTPException(status_code=code, detail=str(err))
