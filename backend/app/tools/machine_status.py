"""Equipment status and active alarms lookup tools."""
from typing import Optional
from langchain_core.tools import tool
from backend.app.database.repository import IndustrialRepository
from backend.app.tools.schemas import MachineStatusInput, ActiveAlarmsInput

repo = IndustrialRepository()

@tool(args_schema=MachineStatusInput)
def get_machine_status(machine_id: str) -> str:
    """Retrieve operational status, location, operating hours, and last service date for an equipment unit.
    
    Args:
        machine_id: Equipment identifier (e.g. 'EQ-1000' for ApexMill-500, 'EQ-1004' for TitanPress-3000).
    """
    row = repo.get_equipment_by_id(machine_id)
    if not row:
        return f"Equipment with ID '{machine_id}' was not found in plant asset registry."

    active_alarms = repo.get_alarms(machine_id=machine_id, status="active")
    alarms_str = f"{len(active_alarms)} active alarm(s)" if active_alarms else "None (Normal)"

    return (
        f"--- Equipment Asset Card: {row['machine_id']} ---\n"
        f"Model: {row['name']} ({row['type']})\n"
        f"Location: {row['location']}\n"
        f"Current Status: {row['status'].upper()}\n"
        f"Criticality: {row['criticality'].upper()}\n"
        f"Operating Hours: {row['operating_hours']} hrs\n"
        f"Active Alarms: {alarms_str}\n"
        f"Last Service Date: {row['last_service']}\n"
        f"Installation Date: {row['install_date']}\n"
        f"--- End of Asset Card ---"
    )

@tool(args_schema=ActiveAlarmsInput)
def get_active_alarms(machine_id: Optional[str] = None) -> str:
    """List all currently active equipment alarms in the manufacturing facility, optionally filtered by machine ID.
    
    Args:
        machine_id: Optional equipment identifier (e.g. 'EQ-1000').
    """
    alarms = repo.get_alarms(machine_id=machine_id, status="active")
    if not alarms:
        target = f"for machine {machine_id}" if machine_id else "across the plant"
        return f"No active alarms found {target}."

    lines = [f"--- Active Alarms ({len(alarms)} active incidents) ---"]
    for a in alarms:
        lines.append(
            f"- Alarm ID: {a['alarm_id']} | Machine: {a['machine_id']} | Code: {a['code']} | Severity: {a['severity'].upper()}\n"
            f"  Description: {a.get('fault_description', 'N/A')}\n"
            f"  Triggered At: {a['triggered_at']}\n"
            f"  Notes: {a.get('notes', 'None')}"
        )
    lines.append("--- End of Alarms ---")
    return "\n".join(lines)
