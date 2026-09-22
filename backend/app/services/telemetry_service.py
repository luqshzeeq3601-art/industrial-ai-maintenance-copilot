"""Telemetry service for validating and processing industrial & semiconductor telemetry events."""
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Union
from backend.app.database.equipment_repository import EquipmentRepository
from backend.app.database.alarm_repository import AlarmRepository
from backend.app.database.user_audit_telemetry_repository import TelemetryRepository
from backend.app.database.repository import IndustrialRepository

logger = logging.getLogger(__name__)

# Default threshold rules mapping metrics to fault codes and severities
METRIC_FAULT_RULES = {
    "vibration_rms": {
        "critical_threshold": 7.5,
        "warning_threshold": 4.5,
        "fault_code": "M-102",
        "description": "Spindle Bearing Vibration / Wear"
    },
    "bearing_temp": {
        "critical_threshold": 85.0,
        "warning_threshold": 70.0,
        "fault_code": "E-402",
        "description": "Spindle / Bearing Thermal Overload"
    },
    "coolant_pressure": {
        "critical_low_threshold": 2.0,
        "fault_code": "E-308",
        "description": "Coolant Loop Pressure Loss"
    },
    "feeder_cycle_time": {
        "critical_threshold": 3.0,
        "warning_threshold": 1.8,
        "fault_code": "E-501",
        "description": "Pneumatic Feeder Sticking/Jam"
    },
    "plasma_rf_forward_power": {
        "critical_deviation_pct": 10.0,
        "nominal": 1500.0,
        "fault_code": "S-101",
        "description": "RF Generator Forward Power Deviation"
    },
    "chamber_pressure_torr": {
        "critical_threshold": 0.05,
        "warning_threshold": 0.01,
        "fault_code": "S-204",
        "description": "Chamber Vacuum Leak"
    },
    "stage_position_error_um": {
        "critical_threshold": 0.05,
        "warning_threshold": 0.02,
        "fault_code": "S-305",
        "description": "Wafer Stage Positioning / Alignment Anomaly"
    },
    "slurry_ph": {
        "critical_low_threshold": 9.5,
        "critical_high_threshold": 11.5,
        "fault_code": "S-402",
        "description": "CMP Slurry pH Deviation"
    }
}

EVENT_TYPE_MAP = {
    "feeder_cycle_time": "feeder_jam",
    "feeder_jam": "feeder_jam",
    "bearing_temp": "thermal_spike",
    "thermal_spike": "thermal_spike",
    "vibration_rms": "vibration_alert",
    "vibration_alert": "vibration_alert",
}

def normalize_event_type(metric: str) -> str:
    return EVENT_TYPE_MAP.get(metric.lower(), "equipment_fault")

def normalize_severity(severity: str) -> str:
    sev = severity.lower()
    if sev in ("low", "medium", "high", "critical"):
        return sev
    if sev in ("normal", "ok", "info"):
        return "low"
    if sev in ("warn", "warning"):
        return "medium"
    return "low"

class TelemetryService:
    def __init__(self, repo: Optional[Union[IndustrialRepository, EquipmentRepository]] = None,
                 alarms: Optional[AlarmRepository] = None,
                 telemetry: Optional[TelemetryRepository] = None):
        self.repo = repo or EquipmentRepository()
        conn = getattr(self.repo, "_conn", None)
        self.alarms = alarms or AlarmRepository(conn)
        self.telemetry = telemetry or TelemetryRepository(conn)

    def process_telemetry_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        event_id = str(event_data.get("event_id") or uuid.uuid4())
        machine_id = str(event_data.get("machine_id", "")).strip().upper()
        metric = str(event_data.get("metric") or event_data.get("metric_name") or event_data.get("event_type") or "").strip().lower()
        value = float(event_data.get("value", 0.0))
        unit = str(event_data.get("unit", "")).strip()
        timestamp = str(event_data.get("timestamp") or datetime.utcnow().isoformat())
        raw_payload = event_data.get("raw_payload")
        if isinstance(raw_payload, dict):
            import json
            raw_payload = json.dumps(raw_payload)

        # 1. Idempotency check: duplicate event_id
        existing_event = self.telemetry.get_telemetry_event_by_id(event_id)
        if existing_event:
            logger.info("Duplicate telemetry event received: %s", event_id)
            return {
                "status": "duplicate",
                "event_id": event_id,
                "machine_id": machine_id,
                "message": "Event already processed",
                "alarm_created": None,
                "equipment_status_updated": None
            }

        # 2. Check if machine exists
        equipment = self.repo.get_equipment_by_id(machine_id)
        if not equipment:
            logger.warning("Telemetry event for unknown machine: %s", machine_id)
            raise ValueError(f"Equipment '{machine_id}' does not exist in registry.")

        # 3. Determine anomaly / alarm triggering
        severity_override = event_data.get("severity")
        fault_code_override = event_data.get("fault_code")
        alarm_id = None
        new_equip_status = None

        rule = METRIC_FAULT_RULES.get(metric)
        is_critical = False
        is_warning = False
        fault_code = fault_code_override
        event_severity = "normal"

        if severity_override:
            sev = severity_override.lower()
            if sev in ("critical", "high"):
                is_critical = True
                event_severity = sev
                fault_code = fault_code or (rule["fault_code"] if rule else "E-101")
            elif sev in ("medium", "warning"):
                is_warning = True
                event_severity = "medium"
                fault_code = fault_code or (rule["fault_code"] if rule else "E-101")
            else:
                event_severity = sev
        elif rule:
            if "critical_threshold" in rule and value >= rule["critical_threshold"]:
                is_critical = True
                event_severity = "critical"
                fault_code = rule["fault_code"]
            elif "critical_low_threshold" in rule and value <= rule["critical_low_threshold"]:
                is_critical = True
                event_severity = "critical"
                fault_code = rule["fault_code"]
            elif "critical_deviation_pct" in rule:
                nominal = rule.get("nominal", 1500.0)
                deviation = abs(value - nominal) / nominal * 100.0
                if deviation >= rule["critical_deviation_pct"]:
                    is_critical = True
                    event_severity = "critical"
                    fault_code = rule["fault_code"]
            elif "warning_threshold" in rule and value >= rule["warning_threshold"]:
                is_warning = True
                event_severity = "medium"
                fault_code = rule["fault_code"]

        # 4. Alarm generation & equipment status update
        if is_critical and fault_code:
            alarm_id = fault_code + "-" + uuid.uuid4().hex[:8].upper()
            alarm_note = f"Automated alarm from telemetry: {metric}={value} {unit}"
            self.alarms.create_alarm(
                alarm_id=alarm_id,
                machine_id=machine_id,
                code=fault_code,
                severity="critical" if event_severity == "critical" else "high",
                status="active",
                notes=alarm_note,
                triggered_at=timestamp
            )
            self.repo.update_equipment_status(machine_id, "fault")
            new_equip_status = "fault"
            logger.warning("Telemetry alarm generated: %s for %s (%s)", alarm_id, machine_id, fault_code)
        elif is_warning:
            if equipment["status"] != "fault":
                self.repo.update_equipment_status(machine_id, "maintenance")
                new_equip_status = "maintenance"

        # 5. Insert telemetry event
        self.telemetry.insert_telemetry_event(
            event_id=event_id,
            machine_id=machine_id,
            metric=normalize_event_type(metric),
            value=value,
            unit=unit,
            timestamp=timestamp,
            severity=normalize_severity(event_severity),
            fault_code=fault_code,
            message=event_data.get("message") or f"{metric}={value}{unit}",
            raw_payload=raw_payload,
            transport=event_data.get("transport", "rest"),
            created_alarm_id=alarm_id
        )

        return {
            "status": "processed",
            "event_id": event_id,
            "machine_id": machine_id,
            "metric": metric,
            "value": value,
            "unit": unit,
            "alarm_created": alarm_id,
            "equipment_status_updated": new_equip_status
        }
