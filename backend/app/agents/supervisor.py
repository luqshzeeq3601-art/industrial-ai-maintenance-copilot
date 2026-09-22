"""Supervisor Agent: Orchestrates workflow routing across specialist agents."""
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.types import Command
from langgraph.graph import END
from backend.app.config import settings
from backend.app.agents.state import AgentState
from backend.app.guardrails.abstention import check_query_domain
from backend.app.llm.factory import get_chat_model

class SupervisorDecision(BaseModel):
    next_agent: Literal["retrieval", "diagnostic", "maintenance", "FINISH"] = Field(
        description="Select 'retrieval' for manual/SOP questions; 'diagnostic' for faults/symptoms/history; 'maintenance' for repair steps/procedures; or 'FINISH' if ready to respond to user."
    )
    reasoning: str = Field(description="Explanation of routing choice.")
    instructions: str = Field(description="Direct guidance for the selected agent.")

SUPERVISOR_SYSTEM_PROMPT = """You are the Industrial Maintenance Supervisor.
You manage three specialist agents in a manufacturing facility:
1. 'retrieval': Searches machine manuals, specifications, lubrication specs, and OEM fault code definitions.
2. 'diagnostic': Queries equipment status, active machine alarms, alarm acknowledgments, telemetry/operating hours, and historical failure logs.
3. 'maintenance': Formulates step-by-step repair procedures, LOTO safety guidelines, creates work orders, and schedules inspections.

Routing Rules:
- If the user asks to acknowledge an alarm, clear an alarm, inspect active alarms, check machine operating hours, or review past failure logs -> route to 'diagnostic'.
- If the user asks to create a work order, schedule an inspection, or repair/overhaul a component -> route to 'maintenance'.
- If the user asks for manual specs, torque ratings, lubrication intervals, or OEM fault code definitions -> route to 'retrieval'.
- Once the worker agents have answered the user question comprehensively, or if no further agent is needed -> select 'FINISH'.
- Never loop endlessly. If an agent has already answered, choose 'FINISH'.
"""

def create_supervisor_node():
    llm = get_chat_model(temperature=0.0)

    def supervisor_node(state: AgentState) -> Command:
        messages = state["messages"]
        last_user_msg = next((m.content for m in reversed(messages) if isinstance(m, HumanMessage)), "")

        # 1. Guardrail Domain Check
        is_in_domain, refusal = check_query_domain(last_user_msg)
        if not is_in_domain:
            trace = list(state.get("workflow_trace", []))
            trace.append({
                "agent": "supervisor",
                "action": "abstain_out_of_domain",
                "summary": "Detected non-industrial query pattern."
            })
            return Command(
                goto=END,
                update={
                    "messages": [AIMessage(content=refusal, name="supervisor")],
                    "abstain": True,
                    "confidence": 0.0,
                    "workflow_trace": trace
                }
            )

        # 2. Cycle Limit Check (prevent infinite routing)
        trace = list(state.get("workflow_trace", []))
        worker_steps = [t for t in trace if t.get("agent") != "supervisor"]
        if len(worker_steps) >= 3:
            # Force finish
            return Command(goto=END)

        # If a worker has just executed, check if we should finish or chain
        if worker_steps:
            last_worker = worker_steps[-1]["agent"]
            # If diagnostic just completed and user asked for repair steps, route to maintenance
            if last_worker == "diagnostic_agent" and any(k in last_user_msg.lower() for k in ["fix", "repair", "replace", "how to"]):
                trace.append({"agent": "supervisor", "action": "chain_to_maintenance", "summary": "Chaining from diagnosis to repair procedures."})
                return Command(
                    goto="maintenance",
                    update={"workflow_trace": trace}
                )
            # Otherwise we have enough to finish
            return Command(goto=END)

        # 3. Direct operational intent fast-path (safety-critical determinism in plant operations)
        q_lower = last_user_msg.lower()
        if any(w in q_lower for w in ["acknowledge alarm", "clear alarm", "ack alarm", "silence alarm"]):
            next_agent = "diagnostic"
            reasoning = "Deterministic priority: Direct alarm acknowledgment operational request."
        elif any(w in q_lower for w in ["create work order", "schedule inspection", "open work order", "new work order"]):
            next_agent = "maintenance"
            reasoning = "Deterministic priority: Direct work order or inspection operational request."
        else:
            # LLM Router Decision for general inquiries
            try:
                structured_llm = llm.with_structured_output(SupervisorDecision)
                decision: SupervisorDecision = structured_llm.invoke(
                    [SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT)] + list(messages)
                )
                next_agent = decision.next_agent
                reasoning = decision.reasoning
            except Exception:
                # Fallback deterministic keyword router for extreme reliability
                if any(w in q_lower for w in ["work order", "schedule inspection", "inspection", "how to", "replace", "step", "procedure", "sop", "repair", "overhaul"]):
                    next_agent = "maintenance"
                    reasoning = "Rule-based match: Request requires maintenance procedure, work order, or inspection."
                elif any(w in q_lower for w in ["alarm", "acknowledge", "history", "log", "frequent", "status", "overheating", "vibration", "fault code"]):
                    next_agent = "diagnostic"
                    reasoning = "Rule-based match: Equipment health, alarm management, or failure diagnostics."
                else:
                    next_agent = "retrieval"
                    reasoning = "Rule-based match: Technical documentation or specification inquiry."

        trace.append({
            "agent": "supervisor",
            "action": f"routed_to_{next_agent}",
            "summary": reasoning
        })

        if next_agent == "FINISH":
            return Command(goto=END, update={"workflow_trace": trace})

        return Command(
            goto=next_agent,
            update={"workflow_trace": trace}
        )

    return supervisor_node
