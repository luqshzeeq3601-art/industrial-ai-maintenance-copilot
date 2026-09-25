"""Work order repository."""
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any, Sequence, Tuple
from backend.app.database.base import BaseRepository

_COLUMNS = (
    "w.work_order_id, w.machine_id, e.name as machine_name, w.title, w.description, w.priority, w.status, "
    "w.assigned_to, w.created_by, w.created_at, w.approved_by, w.approved_at, w.rejection_reason, "
    "w.completed_at, w.due_date"
)
_FROM = " FROM work_orders w LEFT JOIN equipment e ON w.machine_id = e.machine_id"

_PRIORITY_RANK = "CASE w.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"
_SORTS = {
    "created_at": "w.created_at",
    "due_date": "w.due_date",
    "priority": _PRIORITY_RANK,
    "work_order_id": "w.work_order_id",
}


class WorkOrderRepository(BaseRepository):
    def get_work_orders(self, machine_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        orders, _ = self.search_work_orders(machine_id=machine_id, statuses=[status] if status else None)
        return orders

    def search_work_orders(self, machine_id: Optional[str] = None, statuses: Optional[Sequence[str]] = None,
                           priority: Optional[str] = None, q: Optional[str] = None,
                           sort: str = "created_at", descending: bool = True,
                           limit: Optional[int] = None, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        """Filtered, sorted, paginated work orders. Returns (page, total matching)."""
        where = " WHERE 1=1"
        params: List[Any] = []
        if machine_id:
            where += " AND UPPER(w.machine_id) = UPPER(?)"
            params.append(machine_id.strip())
        if statuses:
            where += f" AND w.status IN ({','.join('?' * len(statuses))})"
            params.extend(s.strip().lower() for s in statuses)
        if priority:
            where += " AND w.priority = ?"
            params.append(priority.strip().lower())
        if q:
            where += " AND (w.work_order_id LIKE ? OR w.title LIKE ? OR w.machine_id LIKE ? OR e.name LIKE ? OR w.assigned_to LIKE ?)"
            params.extend([f"%{q.strip()}%"] * 5)

        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT count(*)" + _FROM + where, params)
            total = cur.fetchone()[0]
            order = f" ORDER BY {_SORTS.get(sort, 'w.created_at')} {'DESC' if descending else 'ASC'}, w.work_order_id DESC"
            page = ""
            page_params: List[Any] = []
            if limit is not None:
                page = " LIMIT ? OFFSET ?"
                page_params = [limit, offset]
            cur.execute("SELECT " + _COLUMNS + _FROM + where + order + page, params + page_params)
            return [dict(r) for r in cur.fetchall()], total
        finally:
            self._close_if_owned(conn)

    def count_by_status(self) -> Dict[str, int]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT status, count(*) FROM work_orders GROUP BY status")
            return {row[0]: row[1] for row in cur.fetchall()}
        finally:
            self._close_if_owned(conn)

    def get_work_order_by_id(self, work_order_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT " + _COLUMNS + _FROM + " WHERE UPPER(w.work_order_id) = UPPER(?)",
                (work_order_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)

    def create_work_order(self, work_order_id: str, machine_id: str, title: str, description: str,
                          priority: str, created_by: str, assigned_to: Optional[str] = None,
                          status: str = "pending", due_date: Optional[str] = None) -> Dict[str, Any]:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                cur.execute(
                    "INSERT INTO work_orders (work_order_id, machine_id, title, description, priority, status, assigned_to, created_by, created_at, due_date) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (work_order_id, machine_id.upper(), title, description, priority.lower(), status, assigned_to, created_by, now, due_date)
                )
                return {"work_order_id": work_order_id, "machine_id": machine_id.upper(), "title": title,
                        "description": description, "priority": priority.lower(), "status": status,
                        "assigned_to": assigned_to, "created_by": created_by, "created_at": now,
                        "due_date": due_date}
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
                elif status == "completed":
                    cur.execute(
                        "UPDATE work_orders SET status = 'completed', completed_at = ? "
                        "WHERE UPPER(work_order_id) = UPPER(?)",
                        (now, work_order_id.strip())
                    )
                else:
                    cur.execute(
                        "UPDATE work_orders SET status = ? WHERE UPPER(work_order_id) = UPPER(?)",
                        (status, work_order_id.strip())
                    )
                return cur.rowcount > 0
        finally:
            self._close_if_owned(conn)

    def update_work_order_fields(self, work_order_id: str, fields: Dict[str, Any]) -> bool:
        """Update assignee / due date. Only whitelisted columns are written."""
        allowed = {k: v for k, v in fields.items() if k in ("assigned_to", "due_date")}
        if not allowed:
            return False
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                assignments = ", ".join(f"{k} = ?" for k in allowed)
                cur.execute(
                    f"UPDATE work_orders SET {assignments} WHERE UPPER(work_order_id) = UPPER(?)",
                    [*allowed.values(), work_order_id.strip()]
                )
                return cur.rowcount > 0
        finally:
            self._close_if_owned(conn)
