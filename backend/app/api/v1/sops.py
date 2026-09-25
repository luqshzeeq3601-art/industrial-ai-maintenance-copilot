"""SOP catalogue REST endpoints for API v1."""
from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from backend.app.auth.security import require_roles, verify_csrf
from backend.app.services import sop_service

router = APIRouter(prefix="/sops", tags=["SOPs v1"])

Category = Literal["safety", "maintenance", "troubleshooting", "operation"]


class SopCreate(BaseModel):
    id: str = Field(..., pattern=r"^SOP-[A-Z0-9\-]{2,30}$")
    title: str = Field(..., min_length=3, max_length=150)
    category: Category
    assets: List[str] = Field(default_factory=list, max_length=20)
    body: str = Field(..., min_length=20, max_length=50_000)


@router.get("")
def list_sops(
    q: Optional[str] = Query(default=None, max_length=100),
    category: Optional[Category] = None,
    asset: Optional[str] = Query(default=None, max_length=100),
    status: Optional[Literal["active", "review", "draft"]] = None,
):
    """Search the SOP catalogue."""
    sops = sop_service.list_sops(q=q, category=category, asset=asset, status=status)
    return {"count": len(sops), "sops": sops}


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_sop(payload: SopCreate, _: Dict[str, Any] = Depends(require_roles(["admin"]))):
    """Add a draft SOP (admin only). Rebuild the document index for the copilot to cite it."""
    try:
        return sop_service.create_sop(payload.id, payload.title.strip(), payload.category,
                                      [a.strip() for a in payload.assets if a.strip()], payload.body)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err))
