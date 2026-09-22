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
CREATE INDEX IF NOT EXISTS idx_alarms_machine_status ON alarms(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_alarms_status ON alarms(status);
CREATE INDEX IF NOT EXISTS idx_wo_machine_status ON work_orders(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_telemetry_machine_observed ON telemetry_events(machine_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_audit_action_decision ON action_audit(action_id, decision);
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

# --- SQLAlchemy 2.0 Dual-Persistence Models (PostgreSQL & SQLite) ---
from sqlalchemy import (
    Column, Integer, String, Float, Text, ForeignKey, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

class EquipmentModel(Base):
    __tablename__ = "equipment"
    machine_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    install_date = Column(String(50), nullable=False)
    last_service = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="operational")
    operating_hours = Column(Integer, default=0)
    criticality = Column(String(50), nullable=False, default="medium")

class FaultCodeModel(Base):
    __tablename__ = "fault_codes"
    code = Column(String(50), primary_key=True)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    typical_cause = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)

class MaintenanceLogModel(Base):
    __tablename__ = "maintenance_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("equipment.machine_id"), nullable=False)
    fault_code = Column(String(50), ForeignKey("fault_codes.code"), nullable=True)
    fault_description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=False)
    technician = Column(String(100), nullable=False)
    started_at = Column(String(50), nullable=False)
    completed_at = Column(String(50), nullable=False)
    duration_mins = Column(Integer, nullable=False)
    parts_replaced = Column(Text, nullable=True)
    severity = Column(String(50), nullable=False)

class AlarmModel(Base):
    __tablename__ = "alarms"
    alarm_id = Column(String(100), primary_key=True)
    machine_id = Column(String(50), ForeignKey("equipment.machine_id"), nullable=False)
    code = Column(String(50), ForeignKey("fault_codes.code"), nullable=False)
    severity = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="active")
    triggered_at = Column(String(50), nullable=False)
    acknowledged_at = Column(String(50), nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    cleared_at = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

class WorkOrderModel(Base):
    __tablename__ = "work_orders"
    work_order_id = Column(String(100), primary_key=True)
    machine_id = Column(String(50), ForeignKey("equipment.machine_id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    assigned_to = Column(String(100), nullable=True)
    created_by = Column(String(100), nullable=False)
    created_at = Column(String(50), nullable=False)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(String(50), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    completed_at = Column(String(50), nullable=True)

class ScheduledInspectionModel(Base):
    __tablename__ = "scheduled_inspections"
    inspection_id = Column(String(100), primary_key=True)
    machine_id = Column(String(50), ForeignKey("equipment.machine_id"), nullable=False)
    inspection_type = Column(String(50), nullable=False)
    scheduled_date = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="scheduled")
    technician = Column(String(100), nullable=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)

class UserModel(Base):
    __tablename__ = "users"
    user_id = Column(String(100), primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False)
    created_at = Column(String(50), nullable=False)

class ActionAuditModel(Base):
    __tablename__ = "action_audit"
    audit_id = Column(Integer, primary_key=True, autoincrement=True)
    action_id = Column(String(100), nullable=False)
    action_type = Column(String(100), nullable=False)
    user_id = Column(String(100), nullable=False)
    user_role = Column(String(50), nullable=False)
    decision = Column(String(50), nullable=False)
    payload_json = Column(Text, nullable=False)
    timestamp = Column(String(50), nullable=False)
    ip_address = Column(String(100), nullable=True)

class TelemetryEventModel(Base):
    __tablename__ = "telemetry_events"
    event_id = Column(String(100), primary_key=True)
    machine_id = Column(String(50), ForeignKey("equipment.machine_id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    observed_at = Column(String(50), nullable=False)
    fault_code = Column(String(50), nullable=True)
    value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    transport = Column(String(50), nullable=False, default="rest")
    ingested_at = Column(String(50), nullable=False)
    created_alarm_id = Column(String(100), ForeignKey("alarms.alarm_id"), nullable=True)

_engine = None
_session_factory = None

def get_engine():
    """Get or create SQLAlchemy engine based on configuration."""
    global _engine
    if _engine is not None:
        return _engine

    if getattr(settings, "PERSISTENCE_BACKEND", "sqlite") == "postgres" and settings.DATABASE_URL:
        _engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
    else:
        sqlite_url = f"sqlite:///{settings.DATABASE_PATH}"
        _engine = create_engine(sqlite_url, connect_args={"timeout": 10.0})
    return _engine

def get_session_factory():
    """Get SQLAlchemy SessionLocal factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _session_factory
