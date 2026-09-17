"""Database query tools for maintenance history and fault codes."""
from typing import Optional
from langchain_core.tools import tool
from backend.app.database.repository import IndustrialRepository
from backend.app.tools.schemas import MaintenanceHistoryInput, FaultCodeInput

repo = IndustrialRepository()

@tool(args_schema=MaintenanceHistoryInput)
def query_maintenance_history(machine_id: str, limit: int = 5) -> str:
    """Query recent maintenance history, corrective actions, and parts replaced for a machine.
    
    Args:
        machine_id: The unique identifier of the equipment (e.g. 'EQ-1000', 'EQ-1001', 'EQ-1004').
        limit: Number of recent maintenance records to fetch (default is 5, max 20).
    """
    rows = repo.get_maintenance_history(machine_id, limit=limit)
    if not rows:
        return f"No maintenance history found in database for machine '{machine_id}'."

    lines = [f"--- Maintenance History for {machine_id.upper()} ({len(rows)} recent records) ---"]
    for r in rows:
        parts_str = f" | Parts: {r['parts_replaced']}" if r.get("parts_replaced") else ""
        lines.append(
            f"- [{r['started_at']}] Fault {r['fault_code']} ({r['severity'].upper()}): {r['fault_description']}\n"
            f"  Action: {r['action_taken']}\n"
            f"  Tech: {r['technician']} ({r['duration_mins']} mins){parts_str}"
        )
    lines.append("--- End of History ---")
    return "\n".join(lines)

@tool(args_schema=FaultCodeInput)
def query_fault_code(code: str) -> str:
    """Look up an industrial fault code definition, category, typical root cause, and standard action.
    
    Args:
        code: The fault alarm code (e.g., 'E-402', 'H-104', 'E-501', 'H-208', 'M-102').
    """
    row = repo.get_fault_code(code)
    if not row:
        return f"Fault code '{code}' not found in standard fault database."

    return (
        f"--- Fault Code Record: {row['code']} ---\n"
        f"Description: {row['description']}\n"
        f"Category: {row['category'].upper()} | Severity: {row['severity'].upper()}\n"
        f"Typical Root Cause: {row['typical_cause']}\n"
        f"Standard Recommended Action: {row['recommended_action']}\n"
        f"--- End of Record ---"
    )
