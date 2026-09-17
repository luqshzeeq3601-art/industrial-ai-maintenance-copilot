"""Database models and schema for industrial maintenance."""
import sqlite3
from pathlib import Path
from backend.app.config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS equipment (
    machine_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    install_date TEXT NOT NULL,
    last_service TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('operational', 'maintenance', 'fault', 'offline')),
    operating_hours INTEGER DEFAULT 0,
    criticality TEXT CHECK(criticality IN ('low', 'medium', 'high', 'critical'))
);

CREATE TABLE IF NOT EXISTS fault_codes (
    code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('electrical', 'mechanical', 'hydraulic', 'pneumatic', 'software')),
    typical_cause TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    fault_code TEXT,
    fault_description TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    technician TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    duration_mins INTEGER NOT NULL,
    parts_replaced TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    FOREIGN KEY(machine_id) REFERENCES equipment(machine_id),
    FOREIGN KEY(fault_code) REFERENCES fault_codes(code)
);

CREATE INDEX IF NOT EXISTS idx_logs_machine ON maintenance_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_logs_fault ON maintenance_logs(fault_code);
CREATE INDEX IF NOT EXISTS idx_logs_started ON maintenance_logs(started_at);
"""

def get_connection() -> sqlite3.Connection:
    """Return a connection to the SQLite maintenance database with WAL mode and busy timeout."""
    settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(settings.DATABASE_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initialize database tables and run migrations."""
    from backend.app.database.migrations import run_migrations
    conn = get_connection()
    try:
        run_migrations(conn)
    finally:
        conn.close()
