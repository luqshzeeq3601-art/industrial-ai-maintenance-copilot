"""Idempotent SQLite schema migrations and initial seeding for simulated plant platform."""
import logging
import sqlite3
from datetime import datetime
from typing import Optional
from argon2 import PasswordHasher
from backend.app.config import settings

logger = logging.getLogger("copilot.migrations")

SCHEMA_MIGRATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL,
    description TEXT NOT NULL
);
"""

MIGRATION_V1_SQL = """
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

MIGRATION_V2_SQL = """
-- Active and historical alarms
CREATE TABLE IF NOT EXISTS alarms (
    alarm_id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK(status IN ('active', 'acknowledged', 'cleared')),
    triggered_at TEXT NOT NULL,
    acknowledged_at TEXT,
    acknowledged_by TEXT,
    cleared_at TEXT,
    notes TEXT,
    FOREIGN KEY(machine_id) REFERENCES equipment(machine_id),
    FOREIGN KEY(code) REFERENCES fault_codes(code)
);

CREATE INDEX IF NOT EXISTS idx_alarms_machine ON alarms(machine_id);
CREATE INDEX IF NOT EXISTS idx_alarms_status ON alarms(status);
CREATE INDEX IF NOT EXISTS idx_alarms_code ON alarms(code);

-- Maintenance work orders with approval status
CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    completed_at TEXT,
    FOREIGN KEY(machine_id) REFERENCES equipment(machine_id)
);

CREATE INDEX IF NOT EXISTS idx_wo_machine ON work_orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);

-- Scheduled preventive and routine inspections
CREATE TABLE IF NOT EXISTS scheduled_inspections (
    inspection_id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    inspection_type TEXT NOT NULL CHECK(inspection_type IN ('routine', 'preventive', 'safety', 'post_repair', 'calibration')),
    scheduled_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    technician TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY(machine_id) REFERENCES equipment(machine_id)
);

CREATE INDEX IF NOT EXISTS idx_inspections_machine ON scheduled_inspections(machine_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON scheduled_inspections(scheduled_date);

-- System users for authentication and RBAC
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('technician', 'supervisor', 'admin')),
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Immutable audit log for all actions and approvals
CREATE TABLE IF NOT EXISTS action_audit (
    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_role TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('requested', 'approved', 'rejected', 'executed')),
    payload_json TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON action_audit(action_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON action_audit(user_id);
"""

MIGRATION_V3_SQL = """
-- Normalized industrial telemetry events table
CREATE TABLE IF NOT EXISTS telemetry_events (
    event_id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('feeder_jam', 'thermal_spike', 'vibration_alert', 'equipment_fault')),
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    observed_at TEXT NOT NULL,
    fault_code TEXT,
    value REAL,
    unit TEXT,
    message TEXT,
    metadata_json TEXT,
    transport TEXT NOT NULL DEFAULT 'rest',
    ingested_at TEXT NOT NULL,
    created_alarm_id TEXT,
    FOREIGN KEY(machine_id) REFERENCES equipment(machine_id),
    FOREIGN KEY(created_alarm_id) REFERENCES alarms(alarm_id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_machine ON telemetry_events(machine_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry_events(observed_at);
"""

MIGRATION_V4_SQL = """
-- Semiconductor and Electronics Manufacturing Assets
INSERT OR IGNORE INTO equipment (machine_id, name, type, location, install_date, last_service, status, operating_hours, criticality) VALUES
('EQ-2001', 'Yamaha-YSM20R', 'SMT Pick-and-Place', 'Cleanroom-Bay-A', '2023-01-15', '2026-08-10', 'operational', 12450, 'critical'),
('EQ-2002', 'Heller-1809MK5', 'Reflow Soldering Oven', 'Cleanroom-Bay-A', '2023-02-01', '2026-08-14', 'operational', 11980, 'high'),
('EQ-2003', 'KohYoung-Zenith2', '3D Automated Optical Inspection', 'Cleanroom-Bay-B', '2023-03-10', '2026-08-20', 'operational', 9850, 'high'),
('EQ-2004', 'Camfil-CleanFan400', 'Cleanroom FFU Air Handler', 'Cleanroom-Plenum', '2022-11-20', '2026-07-25', 'operational', 24600, 'medium');

-- Semiconductor Fault Codes
INSERT OR IGNORE INTO fault_codes (code, description, category, typical_cause, recommended_action, severity) VALUES
('S-101', 'Nozzle Pickup Vacuum Loss', 'pneumatic', 'Clogged suction nozzle or solenoid valve pressure drop', 'Clean nozzle orifice with solvent bath, verify 0.06MPa vacuum', 'high'),
('S-204', 'Zone 4 Reflow Convection Temp Deviation', 'electrical', 'Thermocouple drift or heater element degradation', 'Recalibrate zone thermocouple and execute thermal profile sweep', 'high'),
('S-305', 'AOI Coplanarity & Solder Bridge Anomaly', 'software', 'Excessive paste volume or PCB warpage during reflow', 'Inspect stencil aperture and review 3D height threshold', 'medium'),
('S-402', 'HEPA Filter Differential Pressure High', 'mechanical', 'HEPA filter dust loading or pre-filter saturation', 'Inspect pre-filter resistance, replace primary HEPA module', 'medium');
"""

def run_migrations(conn: sqlite3.Connection):
    """Run pending SQLite migrations idempotently."""
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA foreign_keys=ON;")

    with conn:
        conn.executescript(SCHEMA_MIGRATIONS_TABLE)
        applied = {row[0] for row in conn.execute("SELECT version FROM schema_migrations").fetchall()}

        if 1 not in applied:
            logger.info("Applying migration v1 (core schema)...")
            conn.executescript(MIGRATION_V1_SQL)
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)",
                (1, datetime.utcnow().isoformat(), "Core equipment, fault codes, and maintenance logs schema")
            )

        if 2 not in applied:
            logger.info("Applying migration v2 (alarms, work orders, inspections, users, audit)...")
            conn.executescript(MIGRATION_V2_SQL)
            seed_initial_simulated_platform(conn)
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)",
                (2, datetime.utcnow().isoformat(), "Alarms, work orders, inspections, users, and audit tables")
            )
            logger.info("Migration v2 applied successfully.")

        if 3 not in applied:
            logger.info("Applying migration v3 (telemetry events table)...")
            conn.executescript(MIGRATION_V3_SQL)
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)",
                (3, datetime.utcnow().isoformat(), "Telemetry events table for REST and MQTT connectivity")
            )
            logger.info("Migration v3 applied successfully.")

        if 4 not in applied:
            logger.info("Applying migration v4 (semiconductor domain equipment and fault codes)...")
            conn.executescript(MIGRATION_V4_SQL)
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)",
                (4, datetime.utcnow().isoformat(), "Semiconductor assets (EQ-2001 to EQ-2004) and fault codes (S-101 to S-402)")
            )
            logger.info("Migration v4 applied successfully.")

def seed_initial_simulated_platform(conn: sqlite3.Connection):
    """Seed sample alarms, work orders, inspections, and default users without touching existing data."""
    cur = conn.cursor()
    ph = PasswordHasher()

    # Seed Default Users if empty
    cur.execute("SELECT count(*) FROM users")
    if cur.fetchone()[0] == 0:
        users = [
            ("USR-SUP-01", "supervisor1", ph.hash("SupervisorPass123!"), "Sarah Jenkins", "supervisor"),
            ("USR-TEC-01", "tech1", ph.hash("TechPass123!"), "David Chen", "technician"),
            ("USR-ADM-01", "admin1", ph.hash("AdminPass123!"), "Marcus Wong", "admin")
        ]
        cur.executemany(
            "INSERT INTO users (user_id, username, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [(u[0], u[1], u[2], u[3], u[4], datetime.utcnow().isoformat()) for u in users]
        )
        logger.info(f"Seeded {len(users)} initial system users.")

    # Seed initial active & acknowledged alarms if empty
    cur.execute("SELECT count(*) FROM alarms")
    if cur.fetchone()[0] == 0:
        alarms = [
            ("ALM-001", "EQ-1000", "E-402", "high", "active", "2026-09-17 08:30:00", None, None, None, "Spindle drive temperature warning sensor SQ-12"),
            ("ALM-002", "EQ-1004", "H-104", "critical", "active", "2026-09-17 09:15:00", None, None, None, "Main hydraulic pump discharge pressure drop below 180 bar"),
            ("ALM-003", "EQ-1001", "E-501", "medium", "acknowledged", "2026-09-16 14:20:00", "2026-09-16 14:45:00", "David Chen", None, "Tool carousel indexing timeout - swarf buildup suspected"),
            ("ALM-004", "EQ-1007", "M-102", "high", "active", "2026-09-17 11:00:00", None, None, None, "Excessive radial vibration on robot wrist joint J4")
        ]
        cur.executemany(
            "INSERT INTO alarms (alarm_id, machine_id, code, severity, status, triggered_at, acknowledged_at, acknowledged_by, cleared_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            alarms
        )
        logger.info(f"Seeded {len(alarms)} simulated equipment alarms.")

    # Seed initial work orders if empty
    cur.execute("SELECT count(*) FROM work_orders")
    if cur.fetchone()[0] == 0:
        work_orders = [
            ("WO-101", "EQ-1000", "Spindle Bearing Preload Calibration", "Inspect chiller flow rate and check spindle bearing preload due to E-402 alarm.", "high", "pending", "David Chen", "David Chen", "2026-09-17 08:45:00", None, None, None, None),
            ("WO-102", "EQ-1004", "Hydraulic Suction Strainer Cleaning", "Emergency cleaning of pump suction strainer and pilot pressure valve check.", "critical", "approved", "Sarah Jenkins", "David Chen", "2026-09-17 09:30:00", "Sarah Jenkins", "2026-09-17 09:40:00", None, None)
        ]
        cur.executemany(
            "INSERT INTO work_orders (work_order_id, machine_id, title, description, priority, status, assigned_to, created_by, created_at, approved_by, approved_at, rejection_reason, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            work_orders
        )
        logger.info(f"Seeded {len(work_orders)} initial work orders.")

    # Seed initial scheduled inspections if empty
    cur.execute("SELECT count(*) FROM scheduled_inspections")
    if cur.fetchone()[0] == 0:
        inspections = [
            ("INS-101", "EQ-1000", "preventive", "2026-09-25", "scheduled", "David Chen", "supervisor1", "2026-09-15 10:00:00", "Quarterly spindle runout and lubrication check"),
            ("INS-102", "EQ-1004", "safety", "2026-09-22", "scheduled", "Sarah Jenkins", "supervisor1", "2026-09-15 10:00:00", "Hydraulic relief valve pressure calibration and emergency stop circuit test"),
            ("INS-103", "EQ-1007", "routine", "2026-09-28", "scheduled", "David Chen", "supervisor1", "2026-09-16 11:30:00", "Robotic welding cell cable harness and axis backlash check")
        ]
        cur.executemany(
            "INSERT INTO scheduled_inspections (inspection_id, machine_id, inspection_type, scheduled_date, status, technician, created_by, created_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            inspections
        )
        logger.info(f"Seeded {len(inspections)} scheduled inspections.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    conn = sqlite3.connect(settings.DATABASE_PATH)
    run_migrations(conn)
    conn.close()
