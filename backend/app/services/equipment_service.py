"""Service layer for equipment, alarms, work orders, and scheduled inspections."""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from backend.app.database.equipment_repository import EquipmentRepository
from backend.app.database.alarm_repository import AlarmRepository
from backend.app.database.work_order_repository import WorkOrderRepository
from backend.app.database.inspection_repository import InspectionRepository
from backend.app.database.user_audit_telemetry_repository import AuditRepository
from backend.app.database.repository import IndustrialRepository

class EquipmentService:
    def __init__(self, repo: Optional[Union[IndustrialRepository, EquipmentRepository]] = None,
                 alarms: Optional[AlarmRepository] = None,
                 work_orders: Optional[WorkOrderRepository] = None,
                 inspections: Optional[InspectionRepository] = None,
                 audit: Optional[AuditRepository] = None):
        # Backward compat: accept facade (duck-typed) or focused repos.
        self.repo = repo or EquipmentRepository()
        conn = getattr(self.repo, "_conn", None)
        self.alarms = alarms or AlarmRepository(conn)
        self.work_orders = work_orders or WorkOrderRepository(conn)
        self.inspections = inspections or InspectionRepository(conn)
        self.audit = audit or AuditRepository(conn)

    # --- Equipment ---
    def get_equipment_list(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_equipment()

    def get_equipment_detail(self, machine_id: str) -> Optional[Dict[str, Any]]:
        return self.repo.get_equipment_by_id(machine_id)

    def get_equipment_status_summary(self, machine_id: str) -> Optional[Dict[str, Any]]:
        eq = self.repo.get_equipment_by_id(machine_id)
        if not eq:
            return None
        alarms = self.alarms.get_alarms(machine_id=machine_id, status="active")
        recent_history = self.repo.get_maintenance_history(machine_id=machine_id, limit=3)
        return {
            "equipment": eq,
            "active_alarms_count": len(alarms),
            "active_alarms": alarms,
            "recent_maintenance": recent_history
        }

    # --- Alarms ---
    def get_alarms_for_equipment(self, machine_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.alarms.get_alarms(machine_id=machine_id, status=status)

    def acknowledge_alarm(self, alarm_id: str, user_id: str, user_role: str) -> Dict[str, Any]:
        alarm = self.alarms.get_alarm_by_id(alarm_id)
        if not alarm:
            raise ValueError(f"Alarm '{alarm_id}' does not exist.")
        if alarm["status"] != "active":
            raise ValueError(f"Alarm '{alarm_id}' is already {alarm['status']}.")
        
        success = self.alarms.acknowledge_alarm(alarm_id=alarm_id, acknowledged_by=user_id)
        if not success:
            raise RuntimeError(f"Failed to acknowledge alarm '{alarm_id}'.")

        self.audit.record_audit(
            action_id=str(uuid.uuid4()),
            action_type="acknowledge_alarm",
            user_id=user_id,
            user_role=user_role,
            decision="executed",
            payload={"alarm_id": alarm_id, "machine_id": alarm["machine_id"]}
        )
        return {"alarm_id": alarm_id, "status": "acknowledged", "acknowledged_by": user_id}

    # --- Work Orders ---
    def list_work_orders(self, machine_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.work_orders.get_work_orders(machine_id=machine_id, status=status)

    def get_work_order(self, work_order_id: str) -> Optional[Dict[str, Any]]:
        return self.work_orders.get_work_order_by_id(work_order_id)

    def create_work_order(
        self,
        machine_id: str,
        title: str,
        description: str,
        priority: str,
        created_by: str,
        assigned_to: Optional[str] = None,
        status: str = "pending"
    ) -> Dict[str, Any]:
        eq = self.repo.get_equipment_by_id(machine_id)
        if not eq:
            raise ValueError(f"Equipment with ID '{machine_id}' does not exist.")

        wo_id = f"WO-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        wo = self.work_orders.create_work_order(
            work_order_id=wo_id,
            machine_id=machine_id,
            title=title,
            description=description,
            priority=priority,
            created_by=created_by,
            assigned_to=assigned_to,
            status=status
        )
        return wo

    # --- Inspections ---
    def list_inspections(self, machine_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.inspections.get_inspections(machine_id=machine_id, status=status)

    def get_inspection(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        return self.inspections.get_inspection_by_id(inspection_id)

    def schedule_inspection(
        self,
        machine_id: str,
        inspection_type: str,
        scheduled_date: str,
        technician: str,
        created_by: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        eq = self.repo.get_equipment_by_id(machine_id)
        if not eq:
            raise ValueError(f"Equipment with ID '{machine_id}' does not exist.")

        # Validate date format (YYYY-MM-DD)
        try:
            datetime.strptime(scheduled_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid scheduled date '{scheduled_date}'. Must be YYYY-MM-DD.")

        ins_id = f"INS-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        ins = self.inspections.schedule_inspection(
            inspection_id=ins_id,
            machine_id=machine_id,
            inspection_type=inspection_type,
            scheduled_date=scheduled_date,
            technician=technician,
            created_by=created_by,
            notes=notes
        )
        return ins
