"""Work order repository."""
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository


class WorkOrderRepository(BaseRepository):
    def get_work_orders(self, machine_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            query = (
                "SELECT work_order_id, machine_id, title, description, priority, status, assigned_to, "
                "created_by, created_at, approved_by, approved_at, rejection_reason, completed_at "
                "FROM work_orders WHERE 1=1"
            )
            params = []
            if machine_id:
                query += " AND UPPER(machine_id) = UPPER(?)"
                params.append(machine_id.strip())
            if status:
                query += " AND status = ?"
                params.append(status.strip().lower())
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)

    def get_work_order_by_id(self, work_order_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT work_order_id, machine_id, title, description, priority, status, assigned_to, "
                "created_by, created_at, approved_by, approved_at, rejection_reason, completed_at "
                "FROM work_orders WHERE UPPER(work_order_id) = UPPER(?)",
                (work_order_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)

    def create_work_order(self, work_order_id: str, machine_id: str, title: str, description: str,
                          priority: str, created_by: str, assigned_to: Optional[str] = None,
                          status: str = "pending") -> Dict[str, Any]:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                cur.execute(
                    "INSERT INTO work_orders (work_order_id, machine_id, title, description, priority, status, assigned_to, created_by, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (work_order_id, machine_id.upper(), title, description, priority.lower(), status, assigned_to, created_by, now)
                )
                return {"work_order_id": work_order_id, "machine_id": machine_id.upper(), "title": title,
                        "description": description, "priority": priority.lower(), "status": status,
                        "assigned_to": assigned_to, "created_by": created_by, "created_at": now}
        finally:
            self._close_if_owned(conn)

    def update_work_order_status(self, work_order_id: str, status: str,
                                 approved_by: Optional[str] = None,
                                 rejection_reason: Optional[str] = None) -> bool:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                if status == "approved":
                    cur.execute(
                        "UPDATE work_orders SET status = 'approved', approved_by = ?, approved_at = ? "
                        "WHERE UPPER(work_order_id) = UPPER(?)",
                        (approved_by, now, work_order_id.strip())
                    )
                elif status == "rejected":
                    cur.execute(
                        "UPDATE work_orders SET status = 'rejected', rejection_reason = ? "
                        "WHERE UPPER(work_order_id) = UPPER(?)",
                        (rejection_reason, work_order_id.strip())
                    )
                else:
                    cur.execute(
                        "UPDATE work_orders SET status = ? WHERE UPPER(work_order_id) = UPPER(?)",
                        (status, work_order_id.strip())
                    )
                return cur.rowcount > 0
        finally:
            self._close_if_owned(conn)
