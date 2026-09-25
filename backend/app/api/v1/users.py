"""Current-user profile REST endpoints for API v1."""
from typing import Any, Dict, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from backend.app.auth.security import get_current_user, verify_csrf
from backend.app.database.activity_repository import ActivityRepository
from backend.app.database.user_audit_telemetry_repository import UserRepository

router = APIRouter(prefix="/users", tags=["Users v1"])
users = UserRepository()
activity = ActivityRepository()

PROFILE_FIELDS = ("user_id", "username", "full_name", "role", "email", "department", "plant")


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    email: Optional[str] = Field(default=None, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    department: Optional[str] = Field(default=None, max_length=100)
    plant: Optional[str] = Field(default=None, max_length=100)
    role: Optional[Literal["technician", "supervisor", "admin"]] = None


def _profile(user: Dict[str, Any]) -> Dict[str, Any]:
    return {k: user.get(k) for k in PROFILE_FIELDS}


@router.get("/me")
def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return _profile(current_user)


@router.patch("/me", dependencies=[Depends(verify_csrf)])
def update_profile(payload: ProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Update your own profile. Only admins may change a role."""
    fields = payload.model_dump(exclude_unset=True)
    if "role" in fields and fields["role"] != current_user["role"] and current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can change a role.")
    if "full_name" in fields and fields["full_name"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Full name is required.")
    changed = [k for k, v in fields.items() if current_user.get(k) != v]
    if changed:
        users.update_profile(current_user["user_id"], {k: fields[k] for k in changed})
        activity.record("settings", current_user["username"],
                        f"Profile updated: {', '.join(k.replace('_', ' ') for k in changed)}")
    return _profile(users.get_user_by_id(current_user["user_id"]))
