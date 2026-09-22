"""Backward-compatibility REST wrappers extracted from main.py (P0-3)."""
import json
from fastapi import APIRouter
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


@router.get("/api/analytics/fleet-health")
def fleet_health_analytics():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT status, count(*) as count FROM equipment GROUP BY status")
        status_distribution = {row["status"]: row["count"] for row in cur.fetchall()}
        cur.execute("SELECT criticality, count(*) as count FROM equipment GROUP BY criticality")
        criticality_distribution = {row["criticality"]: row["count"] for row in cur.fetchall()}
        cur.execute("SELECT sum(operating_hours) as total, avg(operating_hours) as avg, count(*) as count FROM equipment")
        stats_row = cur.fetchone()
        cur.execute("SELECT sum(duration_mins) as total_downtime FROM maintenance_logs")
        downtime_row = cur.fetchone()
    finally:
        conn.close()
    total_units = stats_row["count"] or 0
    uptime_pct = round((status_distribution.get("operational", 0) / total_units * 100), 1) if total_units else 0.0
    return {"total_units": total_units, "uptime_percentage": uptime_pct,
            "total_operating_hours": stats_row["total"] or 0,
            "avg_operating_hours": round(stats_row["avg"] or 0, 1),
            "total_downtime_hours": round((downtime_row["total_downtime"] or 0) / 60, 1),
            "status_distribution": status_distribution,
            "criticality_distribution": criticality_distribution}


@router.get("/api/analytics/fault-categories")
def fault_category_analytics():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT category, count(*) as count FROM fault_codes GROUP BY category")
        category_counts = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT severity, count(*) as count FROM fault_codes GROUP BY severity")
        severity_counts = [dict(r) for r in cur.fetchall()]
        cur.execute("""
            SELECT f.category, count(m.id) as occurrences, sum(m.duration_mins) as total_downtime_mins
            FROM maintenance_logs m JOIN fault_codes f ON m.fault_code = f.code
            GROUP BY f.category ORDER BY occurrences DESC""")
        incident_breakdown = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()
    return {"fault_categories": category_counts, "severity_distribution": severity_counts,
            "incident_breakdown": incident_breakdown}
