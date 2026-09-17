"""Repository layer providing strictly parameterized SQL operations."""
import json
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.app.database.models import get_connection

class IndustrialRepository:
    def __init__(self, conn: Optional[sqlite3.Connection] = None):
        self._conn = conn

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn:
            return self._conn
        return get_connection()

    # --- Equipment ---
    def get_all_equipment(self) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT machine_id, name, type, location, install_date, last_service, status, operating_hours, criticality "
                "FROM equipment ORDER BY machine_id"
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            if not self._conn:
                conn.close()

    def get_equipment_by_id(self, machine_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT machine_id, name, type, location, install_date, last_service, status, operating_hours, criticality "
                "FROM equipment WHERE UPPER(machine_id) = UPPER(?)",
                (machine_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            if not self._conn:
                conn.close()

    # --- Alarms ---
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
            if not self._conn:
                conn.close()

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
            if not self._conn:
                conn.close()

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
            if not self._conn:
                conn.close()

    # --- Fault Codes ---
    def get_all_fault_codes(self) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT code, description, category, typical_cause, recommended_action, severity FROM fault_codes ORDER BY code")
            return [dict(r) for r in cur.fetchall()]
        finally:
            if not self._conn:
                conn.close()

    def get_fault_code(self, code: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT code, description, category, typical_cause, recommended_action, severity FROM fault_codes WHERE UPPER(code) = UPPER(?)",
                (code.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            if not self._conn:
                conn.close()

    # --- Maintenance History ---
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
            if not self._conn:
                conn.close()

    # --- Work Orders ---
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
            if not self._conn:
                conn.close()

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
            if not self._conn:
                conn.close()

    def create_work_order(
        self,
        work_order_id: str,
        machine_id: str,
        title: str,
        description: str,
        priority: str,
        created_by: str,
        assigned_to: Optional[str] = None,
        status: str = "pending"
    ) -> Dict[str, Any]:
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
                return {
                    "work_order_id": work_order_id,
                    "machine_id": machine_id.upper(),
                    "title": title,
                    "description": description,
                    "priority": priority.lower(),
                    "status": status,
                    "assigned_to": assigned_to,
                    "created_by": created_by,
                    "created_at": now
                }
        finally:
            if not self._conn:
                conn.close()

    def update_work_order_status(
        self,
        work_order_id: str,
        status: str,
        approved_by: Optional[str] = None,
        rejection_reason: Optional[str] = None
    ) -> bool:
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
            if not self._conn:
                conn.close()

    # --- Scheduled Inspections ---
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
            if not self._conn:
                conn.close()

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
            if not self._conn:
                conn.close()

    def schedule_inspection(
        self,
        inspection_id: str,
        machine_id: str,
        inspection_type: str,
        scheduled_date: str,
        technician: str,
        created_by: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
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
                return {
                    "inspection_id": inspection_id,
                    "machine_id": machine_id.upper(),
                    "inspection_type": inspection_type.lower(),
                    "scheduled_date": scheduled_date,
                    "status": "scheduled",
                    "technician": technician,
                    "created_by": created_by,
                    "created_at": now,
                    "notes": notes
                }
        finally:
            if not self._conn:
                conn.close()

    # --- Users & Auth ---
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT user_id, username, password_hash, full_name, role, created_at FROM users WHERE LOWER(username) = LOWER(?)",
                (username.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            if not self._conn:
                conn.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT user_id, username, password_hash, full_name, role, created_at FROM users WHERE user_id = ?",
                (user_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            if not self._conn:
                conn.close()

    def create_user(self, user_id: str, username: str, password_hash: str, full_name: str, role: str) -> Dict[str, Any]:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().isoformat()
                cur.execute(
                    "INSERT INTO users (user_id, username, password_hash, full_name, role, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, username.strip(), password_hash, full_name.strip(), role.strip().lower(), now)
                )
                return {"user_id": user_id, "username": username, "full_name": full_name, "role": role}
        finally:
            if not self._conn:
                conn.close()

    # --- Audit Log ---
    def record_audit(
        self,
        action_id: str,
        action_type: str,
        user_id: str,
        user_role: str,
        decision: str,
        payload: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> int:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().isoformat()
                cur.execute(
                    "INSERT INTO action_audit (action_id, action_type, user_id, user_role, decision, payload_json, timestamp, ip_address) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (action_id, action_type, user_id, user_role, decision, json.dumps(payload), now, ip_address)
                )
                return cur.lastrowid
        finally:
            if not self._conn:
                conn.close()
