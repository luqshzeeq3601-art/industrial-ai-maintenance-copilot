"""Fault codes REST endpoints for API v1."""
from fastapi import APIRouter, HTTPException
from backend.app.database.fault_code_repository import FaultCodeRepository

router = APIRouter(prefix="/fault-codes", tags=["Fault Codes v1"])
repo = FaultCodeRepository()

@router.get("")
def list_fault_codes():
    """Retrieve all standard plant fault codes and specifications."""
    codes = repo.get_all_fault_codes()
    return {"count": len(codes), "fault_codes": codes}

@router.get("/{code}")
def get_fault_code_detail(code: str):
    """Look up definition, root cause, and standard recovery action for a fault code."""
    fc = repo.get_fault_code(code)
    if not fc:
        raise HTTPException(status_code=404, detail=f"Fault code '{code}' not found.")
    return fc
