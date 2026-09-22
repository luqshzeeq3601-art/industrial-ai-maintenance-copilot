"""Diagnostic Agent: Analyzes symptoms, past failures, equipment health, and alarm acknowledgment."""
import logging
import re
import uuid
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command
from backend.app.config import settings
from backend.app.agents.state import AgentState
from backend.app.services.equipment_service import EquipmentService
from backend.app.tools.query_db import query_maintenance_history, query_fault_code
from backend.app.tools.machine_status import get_machine_status, get_active_alarms
from backend.app.llm.factory import get_chat_model

logger = logging.getLogger("copilot.agents.diagnostic")
service = EquipmentService()

DIAGNOSTIC_PROMPT = """You are the Senior Fault Diagnostic Agent.
Your responsibility:
1. Analyze reported machine fault symptoms, overheating, vibration, or error codes.
2. Query the equipment status (operating hours, criticality, current state) and active alarms.
3. Cross-reference the machine's maintenance history to identify recurring patterns or repeat failures.
4. Synthesize a structured diagnostic assessment:
   - Primary Suspected Root Cause
   - Contributing Factors (e.g. high operating hours, recent similar faults)
   - Severity Level (Low / Medium / High / Critical)
5. Keep findings objective and data-driven based on database records.
"""

def create_diagnostic_node():
    llm = get_chat_model(
        temperature=settings.LLM_TEMPERATURE,
        num_ctx=settings.LLM_CONTEXT_WINDOW
    )
    tools = [query_maintenance_history, get_machine_status, get_active_alarms, query_fault_code]
    agent = create_react_agent(llm, tools=tools, prompt=DIAGNOSTIC_PROMPT)

    def diagnostic_node(state: AgentState) -> Command:
        messages = state["messages"]
        last_user_msg = next((m.content for m in reversed(messages) if isinstance(m, HumanMessage)), "")
        trace = list(state.get("workflow_trace", []))

        # Check for alarm acknowledgment intent
        alm_match = re.search(r"acknowledge\s+(?:alarm\s+)?(ALM-\d+)", last_user_msg, re.IGNORECASE)
        if alm_match:
            alarm_id = alm_match.group(1).upper()
            user_id = state.get("user_id")
            user_role = state.get("user_role")

            if not user_id:
                trace.append({
                    "agent": "diagnostic_agent",
                    "action": "auth_required",
                    "summary": f"Rejected alarm acknowledgment request for {alarm_id} due to missing authentication."
                })
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(
                            content="🔒 **Authentication Required**: Acknowledging equipment alarms requires an authenticated technician or supervisor session. Please log in to proceed.",
                            name="diagnostic_agent"
                        )],
                        "workflow_trace": trace,
                        "status": "failed"
                    }
                )

            # Validate alarm existence
            alarm = service.alarms.get_alarm_by_id(alarm_id)
            if not alarm:
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(content=f"⚠️ Alarm '{alarm_id}' was not found in the active alarm registry.", name="diagnostic_agent")],
                        "workflow_trace": trace
                    }
                )
            if alarm["status"] != "active":
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(content=f"ℹ️ Alarm '{alarm_id}' is already {alarm['status']} (acknowledged by {alarm.get('acknowledged_by', 'N/A')}).", name="diagnostic_agent")],
                        "workflow_trace": trace
                    }
                )

            # Route to Human-in-the-Loop Approval Node
            action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
            pending = {
                "action_id": action_id,
                "action_type": "acknowledge_alarm",
                "session_id": state.get("session_id"),
                "arguments": {"alarm_id": alarm_id, "machine_id": alarm["machine_id"]},
                "requester_id": user_id,
                "requester_role": user_role,
                "summary": f"Acknowledge {alarm['severity'].upper()} alarm {alarm_id} on machine {alarm['machine_id']}"
            }
            trace.append({
                "agent": "diagnostic_agent",
                "action": "requested_alarm_acknowledgment",
                "summary": f"Created pending approval request {action_id} to acknowledge alarm {alarm_id}."
            })
            return Command(
                goto="approval",
                update={
                    "pending_action": pending,
                    "status": "approval_required",
                    "workflow_trace": trace
                }
            )

        # Standard diagnostic analysis
        try:
            trimmed_state = dict(state)
            trimmed_state["messages"] = state["messages"][-6:]

            result = agent.invoke(trimmed_state)
            last_message = result["messages"][-1]

            trace.append({
                "agent": "diagnostic_agent",
                "action": "analyzed_fault_history_and_status",
                "summary": "Queried equipment records, historical downtime logs, and fault codes."
            })

            return Command(
                goto="supervisor",
                update={
                    "messages": [AIMessage(content=last_message.content, name="diagnostic_agent")],
                    "workflow_trace": trace,
                    "status": "completed"
                }
            )
        except Exception as e:
            logger.error(f"Diagnostic agent execution error: {e}", exc_info=True)
            # Reliable deterministic fallback
            m_match = re.search(r"(EQ-\d{4})", last_user_msg, re.IGNORECASE)
            fallback_text = ""
            if m_match:
                eq_id = m_match.group(1).upper()
                history = query_maintenance_history.invoke({"machine_id": eq_id, "limit": 3})
                status_card = get_machine_status.invoke({"machine_id": eq_id})
                fallback_text = f"**Diagnostic Assessment for {eq_id}**\n\n{status_card}\n\n{history}"
            else:
                fallback_text = f"⚠️ Diagnostic Agent encountered an execution error: {str(e)[:150]}. Please verify machine ID or try again."

            trace.append({
                "agent": "diagnostic_agent",
                "action": "fallback_diagnosis",
                "summary": "Generated direct database diagnostic summary."
            })
            return Command(
                goto="supervisor",
                update={
                    "messages": [AIMessage(content=fallback_text, name="diagnostic_agent")],
                    "workflow_trace": trace,
                    "status": "completed"
                }
            )

    return diagnostic_node
