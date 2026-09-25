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

MIGRATION_V5_SQL = """
ALTER TABLE equipment ADD COLUMN service_interval_hours INTEGER;
ALTER TABLE equipment ADD COLUMN hours_at_last_service INTEGER;
ALTER TABLE work_orders ADD COLUMN due_date TEXT;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN plant TEXT;

CREATE TABLE IF NOT EXISTS telemetry_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    metric TEXT NOT NULL CHECK(metric IN ('spindle_speed', 'temperature', 'vibration_rms', 'motor_current')),
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    ingested_at TEXT NOT NULL,
    FOREIGN KEY(machine_id) REFERENCES equipment(machine_id)
);
CREATE INDEX IF NOT EXISTS idx_samples_machine_metric_time ON telemetry_samples(machine_id, metric, observed_at);

CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('sop', 'settings')),
    machine_id TEXT,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    ref TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events(created_at);
"""

# Service interval by criticality: more critical assets are serviced more often.
SERVICE_INTERVAL_BY_CRITICALITY = {"critical": 1500, "high": 2000, "medium": 3000, "low": 4000}
# Seed estimate of run hours per calendar day since last service (two shifts).
SEED_HOURS_PER_DAY = 16


def backfill_service_intervals(conn: sqlite3.Connection) -> None:
    """Estimate service fields for rows that lack them (simulated platform data only).

    hours_at_last_service = operating_hours - days since last_service * SEED_HOURS_PER_DAY,
    clamped to [0, operating_hours]. Real deployments overwrite these from the CMMS.
    """
    rows = conn.execute(
        "SELECT machine_id, last_service, operating_hours, criticality FROM equipment "
        "WHERE service_interval_hours IS NULL OR hours_at_last_service IS NULL"
    ).fetchall()
    today = datetime.utcnow().date()
    for machine_id, last_service, hours, criticality in rows:
        hours = hours or 0
        try:
            days = max((today - datetime.strptime(last_service[:10], "%Y-%m-%d").date()).days, 0)
        except (TypeError, ValueError):
            days = 0
        at_service = min(max(hours - days * SEED_HOURS_PER_DAY, 0), hours)
        conn.execute(
            "UPDATE equipment SET service_interval_hours = COALESCE(service_interval_hours, ?), "
            "hours_at_last_service = COALESCE(hours_at_last_service, ?) WHERE machine_id = ?",
            (SERVICE_INTERVAL_BY_CRITICALITY.get(criticality or "medium", 3000), at_service, machine_id),
        )


def normalize_epoch_timestamps(conn: sqlite3.Connection) -> None:
    """Rewrite epoch-second timestamps (stored by older telemetry ingestion) as UTC ISO text, idempotently."""
    for table, column in (("alarms", "triggered_at"), ("telemetry_events", "observed_at")):
        conn.execute(
            f"UPDATE {table} SET {column} = strftime('%Y-%m-%dT%H:%M:%S', CAST({column} AS REAL), 'unixepoch') "
            f"WHERE {column} GLOB '[0-9]*' AND {column} NOT GLOB '*-*'"
        )


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

        if 5 not in applied:
            logger.info("Applying migration v5 (service intervals, WO due dates, user profile, telemetry samples, activity events)...")
            conn.executescript(MIGRATION_V5_SQL)
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)",
                (5, datetime.utcnow().isoformat(), "Service intervals, work-order due dates, user profile fields, telemetry samples, activity events")
            )
            logger.info("Migration v5 applied successfully.")

        # Always run idempotent seed check to guarantee tables are seeded
        seed_initial_simulated_platform(conn)
        backfill_service_intervals(conn)
        normalize_epoch_timestamps(conn)

def seed_initial_simulated_platform(conn: sqlite3.Connection):
    """Seed sample alarms, work orders, inspections, and default users without touching existing data."""
    cur = conn.cursor()
    ph = PasswordHasher()

    # Bootstrap FK parents on fresh databases: the v2 seeds below reference
    # equipment + fault codes, which the standalone migration path never
    # inserted (only scripts/seed_db.py did). INSERT OR IGNORE keeps this
    # a no-op when real data already exists.
    cur.execute("SELECT count(*) FROM fault_codes")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT OR IGNORE INTO fault_codes (code, description, category, typical_cause, recommended_action, severity) VALUES (?, ?, ?, ?, ?, ?)",
            [
                ("E-402", "Spindle Drive Thermal Overload", "electrical", "Chiller fluid degradation or dull cutting inserts", "Inspect chiller flow rate and check spindle bearing preload", "high"),
                ("E-501", "Tool Magazine Indexing Timeout", "mechanical", "Geneva gear chip jam or proximity sensor misalignment", "Reset tool carousel, clear chip debris, calibrate proximity sensor SQ14", "medium"),
                ("E-210", "Axis Z Drive / Follow-up Error", "electrical", "Brake coil disengage failure or optical linear scale contamination", "Verify 24V brake coil signal and clean optical scale", "high"),
                ("E-105", "Emergency Stop Circuit Interrupted", "electrical", "Emergency stop pushbutton stuck or safety relay tripped", "Inspect safety gate interlocks and reset safety relay K1", "critical"),
                ("E-308", "Inverter Bus Undervoltage Alarm", "electrical", "Main incoming line drop or DC bus capacitor aging", "Measure 400V 3-phase incoming supply and DC bus bar voltage", "critical"),
                ("H-104", "Main Hydraulic Pump Discharge Pressure Drop", "hydraulic", "Prefill poppet valve stuck open or suction strainer cavitation", "Check pilot pressure at G-02 and clean suction strainer", "critical"),
                ("H-208", "Excessive Hydraulic Fluid Temperature Trip (>68C)", "hydraulic", "Plate heat exchanger clogged or relief valve blowing", "Inspect cooling water flow (min 120 L/min) and touch relief bypass line", "high"),
                ("H-312", "Main Ram Cylinder Chevron Seal Weep", "hydraulic", "V-packing degradation from particle contamination", "Tighten gland ring or schedule complete ram chevron seal replacement", "medium"),
                ("H-415", "Proportional Directional Valve Coil Open Circuit", "hydraulic", "Solenoid coil burnout from thermal stress or loose Hirschmann connector", "Measure coil resistance (nominal 28 ohms) and replace cartridge", "high"),
                ("P-101", "Main Pneumatic Header Pressure Low (<0.45 MPa)", "pneumatic", "Compressor station unloaded or main FRL filter element clogged", "Check central air receiver and drain auto-drain water separator", "medium"),
                ("P-202", "Pneumatic Clamping Cylinder Slow Travel", "pneumatic", "Exhaust needle throttle silencer clogged with oil mist", "Clean or replace bronze exhaust muffler and grease cylinder bore", "low"),
                ("M-102", "Spindle Radial Vibration Exceeds ISO Limit (>4.5 mm/s)", "mechanical", "Dynamic unbalance from broken cutter or bearing raceway pitting", "Perform FFT spectrum vibration test and check ISO 40 taper runout", "high"),
                ("M-205", "X-Axis Ball Screw Backlash Alarm (>0.012 mm)", "mechanical", "Preload nut disc spring fatigue or thrust bearing wear", "Measure axial backlash with dial indicator and adjust double-nut preload", "medium"),
                ("M-301", "Slideway Automatic Lubrication Fault", "mechanical", "Lube distribution metering valve blocked or low oil level", "Refill Mobil Vactra No 2 and cycle manual priming lever", "medium"),
                ("M-404", "Conveyor Chip Jam / Torque Limiter Slipped", "mechanical", "Stringy chips wound around drive sprocket", "Clear swarf bundle and reset mechanical friction clutch", "low"),
                ("S-101", "CNC Controller Memory Parity Error", "software", "Backup lithium battery low or corrupted work coordinate register", "Replace 3.6V memory battery and reload parameter backup", "high"),
                ("S-202", "Safety Interlock PLC Communication Timeout", "software", "EtherCAT fieldbus patch cable EMI interference or loose RJ45 connector", "Re-terminate fieldbus cable with shielded connectors", "high"),
                ("S-303", "Part Program G-Code Syntax Out of Range", "software", "Post-processor version mismatch or arc radius I/J calculation error", "Verify CAM post-processor and check program syntax", "low"),
            ],
        )
        logger.info("Bootstrapped 18 fault codes for migration seeds.")
    cur.execute("SELECT count(*) FROM equipment")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT OR IGNORE INTO equipment (machine_id, name, type, location, install_date, last_service, status, operating_hours, criticality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                ("EQ-1000", "ApexMill-500", "5-Axis CNC Mill", "Plant A Cell 1", "2020-03-10", "2026-09-01", "fault", 12450, "high"),
                ("EQ-1001", "RoboArm-X2", "Articulated Welder", "Plant A Cell 2", "2020-06-22", "2026-08-20", "operational", 8320, "high"),
                ("EQ-1002", "LaserCut-9000", "Fiber Laser Cutter", "Plant B Cell 1", "2021-02-11", "2026-08-25", "operational", 11206, "medium"),
                ("EQ-1003", "HydroPress-500", "Hydraulic Press", "Plant B Cell 2", "2020-09-05", "2026-08-18", "maintenance", 7540, "high"),
                ("EQ-1004", "TitanPress-3000", "Stamping Press", "Plant A Cell 3", "2020-01-15", "2026-08-14", "operational", 9118, "critical"),
                ("EQ-1005", "AeroLathe-Pro", "Precision Lathe", "Plant C Cell 1", "2021-06-19", "2026-07-29", "operational", 6982, "medium"),
                ("EQ-1006", "WeldBot-200", "Welding Robot", "Plant C Cell 2", "2021-03-27", "2026-08-02", "operational", 10421, "medium"),
                ("EQ-1007", "PackLine-100", "Packaging System", "Plant B Cell 3", "2021-04-02", "2026-07-30", "operational", 5390, "low"),
                ("EQ-1008", "CoolantSys-1", "Coolant Station", "Plant A Utility", "2019-11-12", "2026-06-21", "operational", 14230, "high"),
                ("EQ-1009", "InspectCam-7", "Vision QC System", "Plant C Cell 3", "2022-02-08", "2026-09-05", "operational", 4865, "low"),
            ],
        )
        logger.info("Bootstrapped 10 fleet equipment rows for migration seeds.")

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
