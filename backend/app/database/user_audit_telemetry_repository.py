"""User + audit + telemetry repositories."""
import json
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository


class UserRepository(BaseRepository):
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
            self._close_if_owned(conn)

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
            self._close_if_owned(conn)

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
            self._close_if_owned(conn)

    def list_users(self) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT user_id, username, full_name, role, created_at FROM users ORDER BY created_at ASC")
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)


class AuditRepository(BaseRepository):
    def record_audit(self, action_id: str, action_type: str, user_id: str, user_role: str,
                     decision: str, payload: Dict[str, Any],
                     ip_address: Optional[str] = None) -> int:
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
            self._close_if_owned(conn)

    def list_pending_actions(self) -> List[Dict[str, Any]]:
        """Actions requested but with no approved/rejected/executed decision."""
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT audit_id, action_id, action_type, user_id, user_role, payload_json, timestamp
                FROM action_audit
                WHERE decision = 'requested'
                AND action_id NOT IN (
                    SELECT action_id FROM action_audit WHERE decision IN ('approved', 'rejected', 'executed')
                )
                ORDER BY timestamp DESC""")
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)

    def get_requested_action(self, action_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT action_id, action_type, user_id, payload_json FROM action_audit WHERE action_id = ? AND decision = 'requested'",
                (action_id.strip(),))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)

    def has_decision(self, action_id: str) -> bool:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT decision FROM action_audit WHERE action_id = ? AND decision IN ('approved', 'rejected', 'executed')",
                (action_id.strip(),))
            return cur.fetchone() is not None
        finally:
            self._close_if_owned(conn)


class TelemetryRepository(BaseRepository):
    def insert_telemetry_event(self, event_id: str, machine_id: str, metric: str, value: float,
                               unit: str, timestamp: str, severity: str = "normal",
                               fault_code: Optional[str] = None, message: Optional[str] = None,
                               raw_payload: Optional[str] = None, transport: str = "rest",
                               created_alarm_id: Optional[str] = None) -> Dict[str, Any]:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                now = datetime.utcnow().isoformat()
                cur.execute(
                    "INSERT INTO telemetry_events (event_id, machine_id, event_type, severity, observed_at, fault_code, value, unit, message, metadata_json, transport, ingested_at, created_alarm_id) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (event_id, machine_id.upper(), metric, severity, timestamp, fault_code, value, unit, message, raw_payload, transport, now, created_alarm_id)
                )
                return {"event_id": event_id, "machine_id": machine_id.upper(), "metric": metric,
                        "event_type": metric, "severity": severity, "value": value, "unit": unit,
                        "timestamp": timestamp, "observed_at": timestamp, "created_alarm_id": created_alarm_id}
        finally:
            self._close_if_owned(conn)

    def get_telemetry_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT event_id, machine_id, event_type, event_type as metric, severity, observed_at, observed_at as timestamp, fault_code, value, unit, message, metadata_json as raw_payload, transport, ingested_at, created_alarm_id "
                "FROM telemetry_events WHERE event_id = ?",
                (event_id.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)

    def get_telemetry_events(self, machine_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            query = (
                "SELECT event_id, machine_id, event_type, event_type as metric, severity, observed_at, observed_at as timestamp, fault_code, value, unit, message, metadata_json as raw_payload, transport, ingested_at, created_alarm_id "
                "FROM telemetry_events WHERE 1=1"
            )
            params = []
            if machine_id:
                query += " AND UPPER(machine_id) = UPPER(?)"
                params.append(machine_id.strip())
            query += " ORDER BY observed_at DESC LIMIT ?"
            params.append(limit)
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)
