"""Maintenance Agent: Generates troubleshooting steps, SOP workflows, and action requests."""
import logging
import re
import uuid
from datetime import datetime, timedelta
from langchain_core.messages import HumanMessage, AIMessage
from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command
from backend.app.config import settings
from backend.app.agents.state import AgentState
from backend.app.services.equipment_service import EquipmentService
from backend.app.tools.search_docs import search_technical_docs, get_last_citations
from backend.app.tools.query_db import query_maintenance_history

logger = logging.getLogger("copilot.agents.maintenance")
service = EquipmentService()

MAINTENANCE_PROMPT = """You are the Maintenance & Repair Procedures Agent.
Your responsibility:
1. Formulate actionable, step-by-step repair and troubleshooting procedures.
2. Incorporate mandatory Lockout / Tagout (LOTO) and personal protective equipment (PPE) requirements.
3. Specify exact spare parts (with part numbers if cited in manuals), required lubricants, and torque limits.
4. Detail post-repair verification checks (e.g. runout tolerances, pressure leak checks, run-in cycles).
5. Format your output clearly with numbered steps and bulleted safety alerts.
"""

def create_maintenance_node():
    llm = ChatOllama(
        model=settings.LLM_MODEL,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=settings.LLM_TEMPERATURE,
        num_ctx=settings.LLM_CONTEXT_WINDOW
    )
    tools = [search_technical_docs, query_maintenance_history]
    agent = create_react_agent(llm, tools=tools, prompt=MAINTENANCE_PROMPT)

    def maintenance_node(state: AgentState) -> Command:
        messages = state["messages"]
        last_user_msg = next((m.content for m in reversed(messages) if isinstance(m, HumanMessage)), "")
        trace = list(state.get("workflow_trace", []))
        user_id = state.get("user_id")
        user_role = state.get("user_role")

        # 1. Check for Work Order Creation Intent
        if any(k in last_user_msg.lower() for k in ["create work order", "create wo", "open work order", "issue work order"]):
            if not user_id:
                trace.append({"agent": "maintenance_agent", "action": "auth_required", "summary": "Rejected work order request due to missing auth."})
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(content="🔒 **Authentication Required**: Creating maintenance work orders requires an authenticated technician or supervisor session. Please log in to proceed.", name="maintenance_agent")],
                        "workflow_trace": trace,
                        "status": "failed"
                    }
                )

            # Parse machine ID
            m_match = re.search(r"(EQ-\d{4})", last_user_msg, re.IGNORECASE)
            machine_id = m_match.group(1).upper() if m_match else "EQ-1000"
            eq = service.repo.get_equipment_by_id(machine_id)
            if not eq:
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(content=f"⚠️ Equipment '{machine_id}' does not exist in the plant registry. Cannot create work order.", name="maintenance_agent")],
                        "workflow_trace": trace
                    }
                )

            # Determine title & priority
            priority = "medium"
            if "critical" in last_user_msg.lower() or "emergency" in last_user_msg.lower():
                priority = "critical"
            elif "high" in last_user_msg.lower():
                priority = "high"
            elif "low" in last_user_msg.lower():
                priority = "low"

            title = f"Corrective Maintenance for {machine_id}"
            action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
            pending = {
                "action_id": action_id,
                "action_type": "create_work_order",
                "session_id": state.get("session_id"),
                "arguments": {
                    "machine_id": machine_id,
                    "title": title,
                    "description": last_user_msg[:300],
                    "priority": priority,
                    "assigned_to": user_id
                },
                "requester_id": user_id,
                "requester_role": user_role,
                "summary": f"Create {priority.upper()} priority work order for {machine_id}: '{title}'"
            }
            trace.append({
                "agent": "maintenance_agent",
                "action": "requested_work_order_creation",
                "summary": f"Created pending approval request {action_id} for work order on {machine_id}."
            })
            return Command(
                goto="approval",
                update={
                    "pending_action": pending,
                    "status": "approval_required",
                    "workflow_trace": trace
                }
            )

        # 2. Check for Inspection Scheduling Intent
        if any(k in last_user_msg.lower() for k in ["schedule inspection", "plan inspection", "book inspection"]):
            if not user_id:
                trace.append({"agent": "maintenance_agent", "action": "auth_required", "summary": "Rejected inspection schedule due to missing auth."})
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(content="🔒 **Authentication Required**: Scheduling equipment inspections requires an authenticated technician or supervisor session. Please log in to proceed.", name="maintenance_agent")],
                        "workflow_trace": trace,
                        "status": "failed"
                    }
                )

            m_match = re.search(r"(EQ-\d{4})", last_user_msg, re.IGNORECASE)
            machine_id = m_match.group(1).upper() if m_match else "EQ-1000"
            eq = service.repo.get_equipment_by_id(machine_id)
            if not eq:
                return Command(
                    goto="supervisor",
                    update={
                        "messages": [AIMessage(content=f"⚠️ Equipment '{machine_id}' does not exist in the plant registry. Cannot schedule inspection.", name="maintenance_agent")],
                        "workflow_trace": trace
                    }
                )

            # Determine scheduled date (default +7 days if unspecified)
            d_match = re.search(r"(\d{4}-\d{2}-\d{2})", last_user_msg)
            sched_date = d_match.group(1) if d_match else (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")

            ins_type = "preventive"
            if "safety" in last_user_msg.lower():
                ins_type = "safety"
            elif "routine" in last_user_msg.lower():
                ins_type = "routine"
            elif "calibration" in last_user_msg.lower():
                ins_type = "calibration"

            action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
            pending = {
                "action_id": action_id,
                "action_type": "schedule_inspection",
                "session_id": state.get("session_id"),
                "arguments": {
                    "machine_id": machine_id,
                    "inspection_type": ins_type,
                    "scheduled_date": sched_date,
                    "technician": user_id,
                    "notes": last_user_msg[:200]
                },
                "requester_id": user_id,
                "requester_role": user_role,
                "summary": f"Schedule {ins_type} inspection for {machine_id} on {sched_date}"
            }
            trace.append({
                "agent": "maintenance_agent",
                "action": "requested_inspection_schedule",
                "summary": f"Created pending approval request {action_id} for inspection on {machine_id}."
            })
            return Command(
                goto="approval",
                update={
                    "pending_action": pending,
                    "status": "approval_required",
                    "workflow_trace": trace
                }
            )

        # 3. Standard Maintenance Procedure Generation
        try:
            trimmed_state = dict(state)
            trimmed_state["messages"] = state["messages"][-6:]

            result = agent.invoke(trimmed_state)
            last_message = result["messages"][-1]

            citations = list(state.get("citations", []))
            new_citations = get_last_citations()
            citations.extend(new_citations)

            trace.append({
                "agent": "maintenance_agent",
                "action": "generated_repair_procedure",
                "summary": "Formulated step-by-step troubleshooting, LOTO safety guidelines, and verification checks."
            })

            return Command(
                goto="supervisor",
                update={
                    "messages": [AIMessage(content=last_message.content, name="maintenance_agent")],
                    "workflow_trace": trace,
                    "citations": citations,
                    "status": "completed"
                }
            )
        except Exception as e:
            logger.error(f"Maintenance agent execution error: {e}", exc_info=True)
            # Safe procedural fallback
            docs_summary = search_technical_docs.invoke({"query": last_user_msg})
            fallback_text = (
                f"### 🛠️ Maintenance & Repair Guidelines\n\n"
                f"{docs_summary}\n\n"
                f"**Mandatory Safety Protocols:**\n"
                f"- Follow OSHA 1910.147 Lockout / Tagout (LOTO) procedures.\n"
                f"- Verify zero-energy state on hydraulic pressure relief and 400V 3-phase mains.\n"
                f"- Wear EN 388 mechanical safety gloves and high-impact safety glasses."
            )
            citations = list(state.get("citations", []))
            citations.extend(get_last_citations())

            trace.append({
                "agent": "maintenance_agent",
                "action": "fallback_procedure",
                "summary": "Generated documentation-grounded repair protocol."
            })
            return Command(
                goto="supervisor",
                update={
                    "messages": [AIMessage(content=fallback_text, name="maintenance_agent")],
                    "workflow_trace": trace,
                    "citations": citations,
                    "status": "completed"
                }
            )

    return maintenance_node
