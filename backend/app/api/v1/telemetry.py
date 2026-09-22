"""Telemetry REST endpoints for API v1 with GMAC-SHA256 verification."""
import hashlib
import hmac
import logging
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Depends, Query, status
from pydantic import BaseModel, Field
from backend.app.config import settings
from backend.app.services.telemetry_service import TelemetryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["Telemetry v1"])
service = TelemetryService()

class TelemetryEventPayload(BaseModel):
    event_id: Optional[str] = Field(default=None, description="Unique UUID for idempotency")
    machine_id: str = Field(..., description="Target machine identifier, e.g. EQ-1001, EQ-2001")
    metric: str = Field(..., description="Telemetry metric name, e.g. vibration_rms, plasma_rf_forward_power")
    value: float = Field(..., description="Numeric measurement value")
    unit: str = Field(..., description="Measurement unit, e.g. mm/s, W, Torr")
    timestamp: Optional[str] = Field(default=None, description="ISO8601 timestamp")
    severity: Optional[str] = Field(default=None, description="Explicit severity override: normal, low, medium, high, critical")
    fault_code: Optional[str] = Field(default=None, description="Optional linked fault code")
    raw_payload: Optional[Dict[str, Any]] = Field(default=None, description="Arbitrary raw sensor context")

async def verify_hmac_signature(request: Request):
    sig = request.headers.get("X-Signature-SHA256") or request.headers.get("X-Signature")
    ts_header = request.headers.get("X-Timestamp")
    if sig or getattr(settings, "TELEMETRY_HMAC_REQUIRED", False):
        if not sig:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing required X-Signature-SHA256 header."
            )
        if not ts_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing required X-Timestamp header for HMAC validation."
            )
        try:
            req_ts = float(ts_header)
        except ValueError:
            try:
                dt = datetime.fromisoformat(ts_header.replace("Z", "+00:00"))
                req_ts = dt.timestamp()
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid X-Timestamp format. Must be Unix epoch seconds or ISO8601."
                )

        now_ts = time.time()
        if abs(now_ts - req_ts) > 300:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Timestamp drift {abs(now_ts - req_ts):.1f}s exceeds allowed 300s replay window."
            )

        body_bytes = await request.body()
        secret = getattr(settings, "TELEMETRY_HMAC_SECRET", "default_telemetry_secret_key_change_in_prod")
        canonical = f"{ts_header}.{body_bytes.decode('utf-8')}".encode("utf-8")
        expected_sig = hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_sig.lower(), sig.lower().replace("sha256=", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid HMAC SHA-256 signature."
            )
    return True

@router.post("/events", dependencies=[Depends(verify_hmac_signature)])
async def ingest_telemetry_event(payload: TelemetryEventPayload):
    try:
        result = service.process_telemetry_event(payload.dict())
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error("Telemetry ingestion failure: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process telemetry event."
        )

@router.get("/events")
def list_telemetry_events(
    machine_id: Optional[str] = Query(default=None, description="Filter by machine identifier"),
    limit: int = Query(default=50, ge=1, le=500, description="Maximum events to retrieve")
):
    events = service.telemetry.get_telemetry_events(machine_id=machine_id, limit=limit)
    return {"count": len(events), "events": events}
