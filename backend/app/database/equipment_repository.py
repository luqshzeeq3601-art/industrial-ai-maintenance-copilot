"""Equipment + maintenance history repository."""
import sqlite3
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository


_COLUMNS = ("machine_id, name, type, location, install_date, last_service, status, operating_hours, criticality, "
            "service_interval_hours, hours_at_last_service")


def _with_service(row: sqlite3.Row) -> Dict[str, Any]:
    """Add next_service_in_hours: hours left until the service interval elapses (negative = overdue)."""
    eq = dict(row)
    interval, at_service = eq.get("service_interval_hours"), eq.get("hours_at_last_service")
    eq["next_service_in_hours"] = (
        interval - ((eq.get("operating_hours") or 0) - at_service)
        if interval is not None and at_service is not None else None
    )
    return eq


class EquipmentRepository(BaseRepository):
    def get_all_equipment(self) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT " + _COLUMNS + " "
                "FROM equipment ORDER BY machine_id"
            )
            return [_with_service(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)

    def get_equipment_by_id(self, machine_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT " + _COLUMNS + " "
                "FROM equipment WHERE UPPER(machine_id) = UPPER(?)",
                (machine_id.strip(),)
            )
            row = cur.fetchone()
            return _with_service(row) if row else None
        finally:
            self._close_if_owned(conn)

    def update_equipment_status(self, machine_id: str, status: str) -> bool:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "UPDATE equipment SET status = ? WHERE UPPER(machine_id) = UPPER(?)",
                    (status.strip().lower(), machine_id.strip())
                )
                return cur.rowcount > 0
        finally:
            self._close_if_owned(conn)

    def get_maintenance_history(self, machine_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, machine_id, fault_code, fault_description, action_taken, technician, "
                "started_at, completed_at, duration_mins, parts_replaced, severity "
                "FROM maintenance_logs WHERE UPPER(machine_id) = UPPER(?) ORDER BY started_at DESC LIMIT ?",
                (machine_id.strip(), limit)
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)
