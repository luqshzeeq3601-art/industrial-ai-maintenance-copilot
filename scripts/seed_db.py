"""Database seeding script generating 500+ realistic maintenance logs."""
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database.models import get_connection, init_db

FAULT_CODES = [
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
    ("S-303", "Part Program G-Code Syntax Out of Range", "software", "Post-processor version mismatch or arc radius I/J calculation error", "Verify CAM post-processor and check program syntax", "low")
]

EQUIPMENT_TYPES = [
    ("ApexMill-500", "5-Axis CNC Milling Center", "Machining Bay 1"),
    ("ApexMill-750", "Heavy 5-Axis Milling Center", "Machining Bay 1"),
    ("Lathe-X200", "High-Precision CNC Lathe", "Turning Cell A"),
    ("Lathe-X400", "Heavy Duty CNC Lathe", "Turning Cell B"),
    ("TitanPress-3000", "3000T Forging Hydraulic Press", "Press Shop 1"),
    ("Hydropress-1200", "1200T Stamping Hydraulic Press", "Press Shop 2"),
    ("Extruder-E40", "Continuous Feed Extrusion Press", "Extrusion Bay"),
    ("RoboWelder-01", "6-Axis Robotic Welding Cell", "Fabrication Line"),
    ("RoboWelder-02", "6-Axis Robotic Welding Cell", "Fabrication Line"),
    ("CoolingTower-CT1", "Industrial Evaporative Cooling Tower", "Utility Plant")
]

TECHNICIANS = [
    "David Chen (Senior Mechanical)",
    "Sarah Jenkins (Hydraulics Specialist)",
    "Marcus Wong (Electrical & Automation)",
    "Elena Rostova (CNC Technician)",
    "Amir Patel (Reliability Engineer)",
    "Kenji Sato (Precision Tooling)"
]

PARTS_POOL = [
    "SKF 7014-ACD/P4A Spindle Bearings",
    "Rexroth 4WRPEH 6-C Proportional Valve",
    "Rexroth 2.0040 H3XL High-Pressure Filter",
    "Mobil Vactra Oil No. 2 (20L)",
    "Shell Tellus S2 MX 46 (200L)",
    "Proximity Sensor Omron E2E-X5",
    "SMC Pneumatic Silencer AN20-02",
    "Hydraulic Ram Chevron Packing Kit",
    "Ball Screw Thrust Bearing 30TAC62B",
    "Siemens 24V Safety Relay 3SK1",
    "EtherCAT Shielded RJ45 Cable (5m)",
    "Klüber Isoflex NBU 15 Grease Tube (50g)"
]

def seed():
    init_db()
    conn = get_connection()
    cur = conn.cursor()

    print("Seeding equipment...")
    # Children-first delete order (Fix5: was parents-first -> FK fail).
    for tbl in ["telemetry_events", "action_audit", "maintenance_logs",
                "scheduled_inspections", "alarms", "work_orders",
                "equipment", "fault_codes"]:
        try:
            cur.execute(f"DELETE FROM {tbl}")
        except Exception:
            pass

    # Insert Fault Codes
    for code, desc, cat, cause, action, sev in FAULT_CODES:
        cur.execute(
            "INSERT INTO fault_codes VALUES (?, ?, ?, ?, ?, ?)",
            (code, desc, cat, cause, action, sev)
        )

    # Insert Equipment
    equipment_ids = []
    base_date = datetime(2022, 1, 15)
    for i, (model, type_desc, location) in enumerate(EQUIPMENT_TYPES):
        eq_id = f"EQ-{1000 + i}"
        equipment_ids.append(eq_id)
        install_date = (base_date + timedelta(days=i*45)).strftime("%Y-%m-%d")
        last_service = (datetime.now() - timedelta(days=random.randint(3, 40))).strftime("%Y-%m-%d")
        status = random.choices(["operational", "maintenance", "fault", "operational"], weights=[0.75, 0.1, 0.05, 0.1])[0]
        hours = random.randint(3200, 18500)
        crit = random.choices(["low", "medium", "high", "critical"], weights=[0.1, 0.3, 0.4, 0.2])[0]
        cur.execute(
            "INSERT INTO equipment VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (eq_id, model, type_desc, location, install_date, last_service, status, hours, crit)
        )

    print(f"Inserted {len(equipment_ids)} equipment units and {len(FAULT_CODES)} fault codes.")

    print("Generating 550+ realistic maintenance logs...")
    start_window = datetime.now() - timedelta(days=720) # 2 years of history
    
    logs_count = 0
    for _ in range(560):
        eq_id = random.choice(equipment_ids)
        fault = random.choice(FAULT_CODES)
        code, desc, cat, cause, action_rec, sev = fault
        
        # Random event date
        log_date = start_window + timedelta(days=random.randint(0, 719), hours=random.randint(6, 21), minutes=random.randint(0, 59))
        duration = random.randint(25, 360) # 25 mins to 6 hours
        comp_date = log_date + timedelta(minutes=duration)
        
        technician = random.choice(TECHNICIANS)
        
        # Tailor action taken
        action_variations = [
            f"Diagnosed symptom according to manual. {action_rec}. Cleared fault code and verified test run.",
            f"Investigated trip alarm. Found {cause.lower()}. Executed corrective repair: {action_rec}.",
            f"Emergency dispatch: confirmed {desc}. Cleaned components, adjusted tolerances, and logged sensor values.",
            f"Scheduled corrective action: replaced defective subcomponent. Calibration and alignment within specs."
        ]
        action_taken = random.choice(action_variations)
        
        parts_used = None
        if random.random() > 0.4:
            parts_used = ", ".join(random.sample(PARTS_POOL, k=random.randint(1, 2)))

        cur.execute(
            """
            INSERT INTO maintenance_logs 
            (machine_id, fault_code, fault_description, action_taken, technician, started_at, completed_at, duration_mins, parts_replaced, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                eq_id,
                code,
                desc,
                action_taken,
                technician,
                log_date.strftime("%Y-%m-%d %H:%M:%S"),
                comp_date.strftime("%Y-%m-%d %H:%M:%S"),
                duration,
                parts_used,
                sev
            )
        )
        logs_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully seeded database with {logs_count} maintenance records!")

if __name__ == "__main__":
    seed()
