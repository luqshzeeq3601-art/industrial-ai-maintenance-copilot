"""Alarm repository."""
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository


class AlarmRepository(BaseRepository):
    def get_alarms(self, machine_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            query = (
                "SELECT a.alarm_id, a.machine_id, a.code, f.description as fault_description, "
                "a.severity, a.status, a.triggered_at, a.acknowledged_at, a.acknowledged_by, a.cleared_at, a.notes "
                "FROM alarms a LEFT JOIN fault_codes f ON a.code = f.code WHERE 1=1"
            )
            params = []
            if machine_id:
                query += " AND UPPER(a.machine_id) = UPPER(?)"
                params.append(machine_id.strip())
            if status:
                query += " AND a.status = ?"
                params.append(status.strip().lower())
            query += " ORDER BY a.triggered_at DESC"
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)

    def get_alarm_by_id(self, alarm_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT alarm_id, machine_id, code, severity, status, triggered_at, acknowledged_at, acknowledged_by, cleared_at, notes "
                "FROM alarms WHERE UPPER(alarm_id) = UPPER(?)",
                (alarm_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)

    def acknowledge_alarm(self, alarm_id: str, acknowledged_by: str) -> bool:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                cur.execute(
                    "UPDATE alarms SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? "
                    "WHERE UPPER(alarm_id) = UPPER(?) AND status = 'active'",
                    (now, acknowledged_by.strip(), alarm_id.strip())
                )
                return cur.rowcount > 0
        finally:
            self._close_if_owned(conn)

    def create_alarm(self, alarm_id: str, machine_id: str, code: str, severity: str,
                     status: str = "active", notes: Optional[str] = None,
                     triggered_at: Optional[str] = None) -> Dict[str, Any]:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = triggered_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                cur.execute(
                    "INSERT INTO alarms (alarm_id, machine_id, code, severity, status, triggered_at, notes) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (alarm_id, machine_id.upper(), code.upper(), severity.lower(), status.lower(), now, notes)
                )
                return {"alarm_id": alarm_id, "machine_id": machine_id.upper(), "code": code.upper(),
                        "severity": severity.lower(), "status": status.lower(),
                        "triggered_at": now, "notes": notes}
        finally:
            self._close_if_owned(conn)
