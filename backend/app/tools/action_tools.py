"""State-changing action tools that require Human-in-the-Loop supervisor approval."""
from typing import Optional, Literal
from langchain_core.tools import tool
from backend.app.services.equipment_service import EquipmentService
from backend.app.tools.schemas import CreateWorkOrderInput, AcknowledgeAlarmInput, ScheduleInspectionInput

service = EquipmentService()

@tool(args_schema=CreateWorkOrderInput)
def create_work_order(
    machine_id: str,
    title: str,
    description: str,
    priority: Literal["low", "medium", "high", "critical"] = "medium",
    assigned_to: Optional[str] = None
) -> dict:
    """Request creation of an official maintenance work order for a plant machine.
    Requires supervisor approval before executing.
    
    Args:
        machine_id: Target equipment ID (e.g. 'EQ-1000').
        title: Short title of the work order.
        description: Specific corrective repair instructions or fault symptoms.
        priority: Work order priority ('low', 'medium', 'high', 'critical').
        assigned_to: Optional assigned technician name.
    """
    # Pre-validation check: machine must exist in plant database
    eq = service.repo.get_equipment_by_id(machine_id)
    if not eq:
        return {
            "error": f"Equipment '{machine_id}' does not exist in plant registry. Action rejected.",
            "success": False
        }

    return {
        "action_type": "create_work_order",
        "machine_id": machine_id.upper(),
        "title": title,
        "description": description,
        "priority": priority,
        "assigned_to": assigned_to,
        "requires_approval": True,
        "summary": f"Create {priority.upper()} priority work order for {machine_id.upper()}: '{title}'"
    }

@tool(args_schema=AcknowledgeAlarmInput)
def acknowledge_alarm(alarm_id: str) -> dict:
    """Acknowledge an active equipment fault alarm to take ownership of an incident.
    Requires supervisor approval before executing.
    
    Args:
        alarm_id: The alarm identifier (e.g. 'ALM-001', 'ALM-002').
    """
    alarm = service.alarms.get_alarm_by_id(alarm_id)
    if not alarm:
        return {
            "error": f"Alarm '{alarm_id}' was not found in plant alarm database.",
            "success": False
        }
    if alarm["status"] != "active":
        return {
            "error": f"Alarm '{alarm_id}' is already '{alarm['status']}'. Only active alarms can be acknowledged.",
            "success": False
        }

    return {
        "action_type": "acknowledge_alarm",
        "alarm_id": alarm_id.upper(),
        "machine_id": alarm["machine_id"],
        "code": alarm["code"],
        "severity": alarm["severity"],
        "requires_approval": True,
        "summary": f"Acknowledge {alarm['severity'].upper()} alarm {alarm_id.upper()} on machine {alarm['machine_id']}"
    }

@tool(args_schema=ScheduleInspectionInput)
def schedule_inspection(
    machine_id: str,
    inspection_type: Literal["routine", "preventive", "safety", "post_repair", "calibration"],
    scheduled_date: str,
    technician: str,
    notes: Optional[str] = None
) -> dict:
    """Schedule a preventive, routine, or safety inspection for a machine.
    Requires supervisor approval before executing.
    
    Args:
        machine_id: Equipment identifier (e.g. 'EQ-1000').
        inspection_type: Type of inspection ('routine', 'preventive', 'safety', 'post_repair', 'calibration').
        scheduled_date: Date to perform inspection in YYYY-MM-DD format.
        technician: Name of assigned technician.
        notes: Optional inspection guidelines or checks to perform.
    """
    eq = service.repo.get_equipment_by_id(machine_id)
    if not eq:
        return {
            "error": f"Equipment '{machine_id}' does not exist in plant registry. Action rejected.",
            "success": False
        }

    return {
        "action_type": "schedule_inspection",
        "machine_id": machine_id.upper(),
        "inspection_type": inspection_type,
        "scheduled_date": scheduled_date,
        "technician": technician,
        "notes": notes,
        "requires_approval": True,
        "summary": f"Schedule {inspection_type} inspection for {machine_id.upper()} on {scheduled_date} assigned to {technician}"
    }
