"""Repository facade preserving backward compat, composing focused sub-repositories.

Split of god object `IndustrialRepository` (48 edges) into:
- EquipmentRepository, AlarmRepository, FaultCodeRepository,
  WorkOrderRepository, InspectionRepository,
  UserRepository, AuditRepository, TelemetryRepository
See `backend/app/database/*_repository.py` + `base.py`.
"""
import sqlite3
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository
from backend.app.database.equipment_repository import EquipmentRepository
from backend.app.database.alarm_repository import AlarmRepository
from backend.app.database.fault_code_repository import FaultCodeRepository
from backend.app.database.work_order_repository import WorkOrderRepository
from backend.app.database.inspection_repository import InspectionRepository
from backend.app.database.user_audit_telemetry_repository import (
    UserRepository, AuditRepository, TelemetryRepository,
)

__all__ = [
    "IndustrialRepository",
    "EquipmentRepository",
    "AlarmRepository",
    "FaultCodeRepository",
    "WorkOrderRepository",
    "InspectionRepository",
    "UserRepository",
    "AuditRepository",
    "TelemetryRepository",
    "BaseRepository",
]


class IndustrialRepository(BaseRepository):
    """Facade delegating to sub-repositories. All 24 methods preserved."""

    def __init__(self, conn: Optional[sqlite3.Connection] = None):
        super().__init__(conn)
        self.equipment = EquipmentRepository(conn)
        self.alarms = AlarmRepository(conn)
        self.fault_codes = FaultCodeRepository(conn)
        self.work_orders = WorkOrderRepository(conn)
        self.inspections = InspectionRepository(conn)
        self.users = UserRepository(conn)
        self.audit = AuditRepository(conn)
        self.telemetry = TelemetryRepository(conn)

    # --- Equipment ---
    def get_all_equipment(self): return self.equipment.get_all_equipment()
    def get_equipment_by_id(self, machine_id: str): return self.equipment.get_equipment_by_id(machine_id)
    def update_equipment_status(self, machine_id: str, status: str): return self.equipment.update_equipment_status(machine_id, status)
    def get_maintenance_history(self, machine_id: str, limit: int = 10): return self.equipment.get_maintenance_history(machine_id, limit)

    # --- Alarms ---
    def get_alarms(self, machine_id: Optional[str] = None, status: Optional[str] = None): return self.alarms.get_alarms(machine_id, status)
    def get_alarm_by_id(self, alarm_id: str): return self.alarms.get_alarm_by_id(alarm_id)
    def acknowledge_alarm(self, alarm_id: str, acknowledged_by: str): return self.alarms.acknowledge_alarm(alarm_id, acknowledged_by)
    def create_alarm(self, alarm_id: str, machine_id: str, code: str, severity: str, status: str = "active",
                     notes: Optional[str] = None, triggered_at: Optional[str] = None): return self.alarms.create_alarm(alarm_id, machine_id, code, severity, status, notes, triggered_at)

    # --- Fault Codes ---
    def get_all_fault_codes(self): return self.fault_codes.get_all_fault_codes()
    def get_fault_code(self, code: str): return self.fault_codes.get_fault_code(code)

    # --- Work Orders ---
    def get_work_orders(self, machine_id: Optional[str] = None, status: Optional[str] = None): return self.work_orders.get_work_orders(machine_id, status)
    def get_work_order_by_id(self, work_order_id: str): return self.work_orders.get_work_order_by_id(work_order_id)
    def create_work_order(self, work_order_id: str, machine_id: str, title: str, description: str, priority: str,
                          created_by: str, assigned_to: Optional[str] = None, status: str = "pending"): return self.work_orders.create_work_order(work_order_id, machine_id, title, description, priority, created_by, assigned_to, status)
    def update_work_order_status(self, work_order_id: str, status: str, approved_by: Optional[str] = None,
                                 rejection_reason: Optional[str] = None): return self.work_orders.update_work_order_status(work_order_id, status, approved_by, rejection_reason)

    # --- Inspections ---
    def get_inspections(self, machine_id: Optional[str] = None, status: Optional[str] = None): return self.inspections.get_inspections(machine_id, status)
    def get_inspection_by_id(self, inspection_id: str): return self.inspections.get_inspection_by_id(inspection_id)
    def schedule_inspection(self, inspection_id: str, machine_id: str, inspection_type: str, scheduled_date: str,
                            technician: str, created_by: str, notes: Optional[str] = None): return self.inspections.schedule_inspection(inspection_id, machine_id, inspection_type, scheduled_date, technician, created_by, notes)

    # --- Users ---
    def get_user_by_username(self, username: str): return self.users.get_user_by_username(username)
    def get_user_by_id(self, user_id: str): return self.users.get_user_by_id(user_id)
    def create_user(self, user_id: str, username: str, password_hash: str, full_name: str, role: str): return self.users.create_user(user_id, username, password_hash, full_name, role)

    # --- Audit ---
    def record_audit(self, action_id: str, action_type: str, user_id: str, user_role: str, decision: str,
                     payload: Dict[str, Any], ip_address: Optional[str] = None): return self.audit.record_audit(action_id, action_type, user_id, user_role, decision, payload, ip_address)

    # --- Telemetry ---
    def insert_telemetry_event(self, event_id: str, machine_id: str, metric: str, value: float, unit: str,
                               timestamp: str, severity: str = "normal", fault_code: Optional[str] = None,
                               message: Optional[str] = None, raw_payload: Optional[str] = None,
                               transport: str = "rest", created_alarm_id: Optional[str] = None): return self.telemetry.insert_telemetry_event(event_id, machine_id, metric, value, unit, timestamp, severity, fault_code, message, raw_payload, transport, created_alarm_id)
    def get_telemetry_event_by_id(self, event_id: str): return self.telemetry.get_telemetry_event_by_id(event_id)
    def get_telemetry_events(self, machine_id: Optional[str] = None, limit: int = 100): return self.telemetry.get_telemetry_events(machine_id, limit)
