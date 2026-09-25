"""Activity events, continuous telemetry samples, and the plant-wide history feed."""
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from backend.app.database.base import BaseRepository

SAMPLE_METRICS = {
    "spindle_speed": "rpm",
    "temperature": "°C",
    "vibration_rms": "mm/s",
    "motor_current": "A",
}

# Each branch of the history UNION normalises one source table to
# (time, type, machine_id, description, user, ref). `time` is normalised with
# datetime() so ISO "T" timestamps and "YYYY-MM-DD HH:MM:SS" sort together.
_HISTORY_UNION = """
SELECT datetime(a.triggered_at) AS time, 'alarm' AS type, a.machine_id AS machine_id,
       a.code || ' ' || COALESCE(f.description, '') AS description, 'System' AS user, a.alarm_id AS ref
  FROM alarms a LEFT JOIN fault_codes f ON a.code = f.code
UNION ALL
SELECT datetime(a.acknowledged_at), 'alarm', a.machine_id, a.code || ' acknowledged', a.acknowledged_by, a.alarm_id
  FROM alarms a WHERE a.acknowledged_at IS NOT NULL
UNION ALL
SELECT datetime(t.observed_at), 'diagnostic', t.machine_id,
       COALESCE(t.message, replace(t.event_type, '_', ' ')), 'System', t.event_id
  FROM telemetry_events t
UNION ALL
SELECT datetime(w.created_at), 'work_order', w.machine_id, w.work_order_id || ' created: ' || w.title, w.created_by, w.work_order_id
  FROM work_orders w
UNION ALL
SELECT datetime(w.approved_at), 'work_order', w.machine_id, w.work_order_id || ' approved', w.approved_by, w.work_order_id
  FROM work_orders w WHERE w.approved_at IS NOT NULL
UNION ALL
SELECT datetime(w.completed_at), 'work_order', w.machine_id, w.work_order_id || ' completed', COALESCE(w.assigned_to, w.created_by), w.work_order_id
  FROM work_orders w WHERE w.completed_at IS NOT NULL
UNION ALL
SELECT datetime(m.completed_at), 'maintenance', m.machine_id, m.action_taken, m.technician, CAST(m.id AS TEXT)
  FROM maintenance_logs m
UNION ALL
SELECT datetime(x.timestamp), 'approval', json_extract(x.payload_json, '$.machine_id'),
       replace(x.action_type, '_', ' ') || ' ' || x.decision, x.user_id, x.action_id
  FROM action_audit x
UNION ALL
SELECT datetime(v.created_at), v.type, v.machine_id, v.description, v.user_id, v.ref
  FROM activity_events v
"""

HISTORY_TYPES = ("alarm", "diagnostic", "work_order", "maintenance", "approval", "sop", "settings")


class ActivityRepository(BaseRepository):
    def record(self, type: str, user_id: str, description: str,
               machine_id: Optional[str] = None, ref: Optional[str] = None) -> int:
        conn = self._get_conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO activity_events (type, machine_id, user_id, description, ref, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (type, machine_id, user_id, description, ref, datetime.utcnow().isoformat())
                )
                return cur.lastrowid
        finally:
            self._close_if_owned(conn)

    def history(self, since: Optional[str] = None, until: Optional[str] = None,
                type: Optional[str] = None, machine_id: Optional[str] = None,
                user: Optional[str] = None, limit: int = 20, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        where = " WHERE time IS NOT NULL"
        params: List[Any] = []
        if since:
            where += " AND time >= datetime(?)"
            params.append(since)
        if until:
            where += " AND time < datetime(?)"
            params.append(until)
        if type:
            where += " AND type = ?"
            params.append(type)
        if machine_id:
            where += " AND UPPER(machine_id) = UPPER(?)"
            params.append(machine_id.strip())
        if user:
            where += " AND user = ?"
            params.append(user)
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            base = f"FROM ({_HISTORY_UNION}){where}"
            cur.execute(f"SELECT count(*) {base}", params)
            total = cur.fetchone()[0]
            cur.execute(f"SELECT time, type, machine_id, description, user, ref {base} "
                        "ORDER BY time DESC LIMIT ? OFFSET ?", params + [limit, offset])
            return [dict(r) for r in cur.fetchall()], total
        finally:
            self._close_if_owned(conn)

    def history_users(self) -> List[str]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT DISTINCT user FROM ({_HISTORY_UNION}) WHERE user IS NOT NULL ORDER BY user")
            return [r[0] for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)


class SampleRepository(BaseRepository):
    def insert_samples(self, machine_id: str, samples: List[Dict[str, Any]]) -> int:
        conn = self._get_conn()
        try:
            with conn:
                now = datetime.utcnow().isoformat()
                conn.executemany(
                    "INSERT INTO telemetry_samples (machine_id, metric, value, unit, observed_at, ingested_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    [(machine_id.upper(), s["metric"], s["value"], SAMPLE_METRICS[s["metric"]],
                      s["observed_at"], now) for s in samples]
                )
                return len(samples)
        finally:
            self._close_if_owned(conn)

    def get_samples(self, machine_id: str, metric: Optional[str] = None, since: Optional[str] = None,
                    limit: int = 2000) -> List[Dict[str, Any]]:
        """Most recent `limit` samples in the window, returned oldest first."""
        query = ("SELECT metric, value, unit, observed_at FROM telemetry_samples "
                 "WHERE UPPER(machine_id) = UPPER(?)")
        params: List[Any] = [machine_id.strip()]
        if metric:
            query += " AND metric = ?"
            params.append(metric)
        if since:
            query += " AND datetime(observed_at) >= datetime(?)"
            params.append(since)
        query += " ORDER BY observed_at DESC LIMIT ?"
        params.append(limit)
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(query, params)
            return [dict(r) for r in reversed(cur.fetchall())]
        finally:
            self._close_if_owned(conn)
