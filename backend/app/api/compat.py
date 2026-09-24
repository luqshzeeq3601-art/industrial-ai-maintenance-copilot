"""Backward-compatibility REST wrappers extracted from main.py (P0-3)."""
import json
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from backend.app.config import settings
from backend.app.database.models import get_connection
from backend.app.database.equipment_repository import EquipmentRepository
from backend.app.database.fault_code_repository import FaultCodeRepository

router = APIRouter(tags=["Compatibility"])
equipment_repo = EquipmentRepository()
fault_repo = FaultCodeRepository()


@router.get("/api/equipment")
def list_equipment_legacy():
    return {"equipment": equipment_repo.get_all_equipment()}


@router.get("/api/fault-codes")
def list_fault_codes_legacy():
    return {"fault_codes": fault_repo.get_all_fault_codes()}


@router.get("/api/equipment/{machine_id}/history")
def machine_history_legacy(machine_id: str):
    logs = equipment_repo.get_maintenance_history(machine_id=machine_id, limit=10)
    return {"machine_id": machine_id.upper(), "logs": logs}


@router.get("/api/stats")
def system_stats():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM maintenance_logs")
        log_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM equipment")
        eq_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM alarms WHERE status = 'active'")
        alarm_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM work_orders WHERE status = 'pending'")
        pending_wo_count = cur.fetchone()[0]
    finally:
        conn.close()
    cache_path = settings.VECTOR_STORE_DIR / "chunks_cache.json"
    chunk_count = len(json.loads(cache_path.read_text(encoding="utf-8"))) if cache_path.exists() else 0
    return {"equipment_count": eq_count, "maintenance_logs_count": log_count,
            "active_alarms_count": alarm_count, "pending_work_orders_count": pending_wo_count,
            "indexed_chunks": chunk_count, "llm_model": settings.LLM_MODEL,
            "embedding_model": settings.EMBEDDING_MODEL_NAME}


def _log_window(days: Optional[int], previous: bool = False) -> tuple[str, list]:
    """SQL filter on maintenance_logs.started_at for the last `days` days, or the period before it."""
    if not days:
        return "", []
    if previous:
        return (" WHERE datetime(started_at) >= datetime('now', ?) AND datetime(started_at) < datetime('now', ?)",
                [f"-{2 * days} days", f"-{days} days"])
    return " WHERE datetime(started_at) >= datetime('now', ?)", [f"-{days} days"]


@router.get("/api/analytics/fleet-health")
def fleet_health_analytics(days: Optional[int] = Query(None, ge=1, le=3650)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT status, count(*) as count FROM equipment GROUP BY status")
        status_distribution = {row["status"]: row["count"] for row in cur.fetchall()}
        cur.execute("SELECT criticality, count(*) as count FROM equipment GROUP BY criticality")
        criticality_distribution = {row["criticality"]: row["count"] for row in cur.fetchall()}
        cur.execute("SELECT sum(operating_hours) as total, avg(operating_hours) as avg, count(*) as count FROM equipment")
        stats_row = cur.fetchone()
        where, params = _log_window(days)
        cur.execute("SELECT sum(duration_mins) as total_downtime, count(*) as repairs FROM maintenance_logs" + where, params)
        downtime_row = cur.fetchone()
        previous_row = None
        if days:
            where, params = _log_window(days, previous=True)
            cur.execute("SELECT sum(duration_mins) as total_downtime, count(*) as repairs FROM maintenance_logs" + where, params)
            previous_row = cur.fetchone()
    finally:
        conn.close()
    total_units = stats_row["count"] or 0
    uptime_pct = round((status_distribution.get("operational", 0) / total_units * 100), 1) if total_units else 0.0
    return {"total_units": total_units, "uptime_percentage": uptime_pct,
            "total_operating_hours": stats_row["total"] or 0,
            "avg_operating_hours": round(stats_row["avg"] or 0, 1),
            "total_downtime_hours": round((downtime_row["total_downtime"] or 0) / 60, 1),
            "repairs_logged": downtime_row["repairs"] or 0,
            "period_days": days,
            "previous_downtime_hours": round((previous_row["total_downtime"] or 0) / 60, 1) if previous_row else None,
            "previous_repairs_logged": (previous_row["repairs"] or 0) if previous_row else None,
            "status_distribution": status_distribution,
            "criticality_distribution": criticality_distribution}


@router.get("/api/analytics/fault-categories")
def fault_category_analytics(days: Optional[int] = Query(None, ge=1, le=3650)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT category, count(*) as count FROM fault_codes GROUP BY category")
        category_counts = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT severity, count(*) as count FROM fault_codes GROUP BY severity")
        severity_counts = [dict(r) for r in cur.fetchall()]
        window = " WHERE datetime(m.started_at) >= datetime('now', ?)" if days else ""
        cur.execute(f"""
            SELECT f.category, count(m.id) as occurrences, sum(m.duration_mins) as total_downtime_mins
            FROM maintenance_logs m JOIN fault_codes f ON m.fault_code = f.code{window}
            GROUP BY f.category ORDER BY occurrences DESC""", [f"-{days} days"] if days else [])
        incident_breakdown = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()
    return {"fault_categories": category_counts, "severity_distribution": severity_counts,
            "incident_breakdown": incident_breakdown}


_DOC_NAME = re.compile(r"^[A-Za-z0-9_\-]+\.md$")


@router.get("/api/documents/{name}", response_class=PlainTextResponse)
def read_document(name: str):
    """Markdown source of a cited manual or SOP. Only plain file names inside data/manuals and data/sops resolve."""
    if not _DOC_NAME.match(name):
        raise HTTPException(status_code=404, detail="Document not found")
    for folder in ("manuals", "sops"):
        path = settings.DOCS_DIR / folder / name
        if path.is_file():
            return PlainTextResponse(path.read_text(encoding="utf-8"), media_type="text/markdown; charset=utf-8")
    raise HTTPException(status_code=404, detail="Document not found")
