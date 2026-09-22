"""Inspection repository."""
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository


class InspectionRepository(BaseRepository):
    def get_inspections(self, machine_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            query = (
                "SELECT inspection_id, machine_id, inspection_type, scheduled_date, status, technician, created_by, created_at, notes "
                "FROM scheduled_inspections WHERE 1=1"
            )
            params = []
            if machine_id:
                query += " AND UPPER(machine_id) = UPPER(?)"
                params.append(machine_id.strip())
            if status:
                query += " AND status = ?"
                params.append(status.strip().lower())
            query += " ORDER BY scheduled_date ASC"
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)

    def get_inspection_by_id(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT inspection_id, machine_id, inspection_type, scheduled_date, status, technician, created_by, created_at, notes "
                "FROM scheduled_inspections WHERE UPPER(inspection_id) = UPPER(?)",
                (inspection_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)

    def schedule_inspection(self, inspection_id: str, machine_id: str, inspection_type: str,
                            scheduled_date: str, technician: str, created_by: str,
                            notes: Optional[str] = None) -> Dict[str, Any]:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                cur.execute(
                    "INSERT INTO scheduled_inspections (inspection_id, machine_id, inspection_type, scheduled_date, status, technician, created_by, created_at, notes) "
                    "VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)",
                    (inspection_id, machine_id.upper(), inspection_type.lower(), scheduled_date, technician, created_by, now, notes)
                )
                return {"inspection_id": inspection_id, "machine_id": machine_id.upper(),
                        "inspection_type": inspection_type.lower(), "scheduled_date": scheduled_date,
                        "status": "scheduled", "technician": technician,
                        "created_by": created_by, "created_at": now, "notes": notes}
        finally:
            self._close_if_owned(conn)
