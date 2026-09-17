"""Retrieval Agent: Specialized in technical documentation and SOP search."""
import logging
from langchain_core.messages import HumanMessage, AIMessage
from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command
from backend.app.config import settings
from backend.app.agents.state import AgentState
from backend.app.tools.search_docs import search_technical_docs, get_last_citations
from backend.app.tools.query_db import query_fault_code

logger = logging.getLogger("copilot.agents.retrieval")

RETRIEVAL_PROMPT = """You are the Plant Retrieval Agent.
Your responsibility:
1. Search machine technical manuals, schematics, and Standard Operating Procedures (SOPs).
2. Answer questions about specifications, lubrication schedules, torque specs, and fault code definitions.
3. Ground EVERY fact in the retrieved documentation and include citations (document name, section).
4. If the documentation does not contain the answer, explicitly state that documentation is missing.
Be direct, precise, and safety-conscious.
"""

def create_retrieval_node():
    llm = ChatOllama(
        model=settings.LLM_MODEL,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=settings.LLM_TEMPERATURE,
        num_ctx=settings.LLM_CONTEXT_WINDOW
    )
    tools = [search_technical_docs, query_fault_code]
    agent = create_react_agent(llm, tools=tools, prompt=RETRIEVAL_PROMPT)

    def retrieval_node(state: AgentState) -> Command:
        messages = state["messages"]
        last_user_msg = next((m.content for m in reversed(messages) if isinstance(m, HumanMessage)), "")
        trace = list(state.get("workflow_trace", []))

        try:
            trimmed_state = dict(state)
            trimmed_state["messages"] = state["messages"][-6:]

            result = agent.invoke(trimmed_state)
            last_message = result["messages"][-1]

            citations = list(state.get("citations", []))
            new_citations = get_last_citations()
            citations.extend(new_citations)

            trace.append({
                "agent": "retrieval_agent",
                "action": "retrieved_technical_documentation",
                "summary": f"Searched manuals and fault records. Found {len(new_citations)} citations."
            })

            return Command(
                goto="supervisor",
                update={
                    "messages": [AIMessage(content=last_message.content, name="retrieval_agent")],
                    "workflow_trace": trace,
                    "citations": citations,
                    "status": "completed"
                }
            )
        except Exception as e:
            logger.error(f"Retrieval agent error: {e}", exc_info=True)
            # Reliable deterministic fallback
            doc_results = search_technical_docs.invoke({"query": last_user_msg})
            citations = list(state.get("citations", []))
            new_citations = get_last_citations()
            citations.extend(new_citations)

            trace.append({
                "agent": "retrieval_agent",
                "action": "fallback_retrieval",
                "summary": f"Retrieved technical documentation fallback with {len(new_citations)} citations."
            })

            return Command(
                goto="supervisor",
                update={
                    "messages": [AIMessage(content=f"**Technical Documentation Search Results**\n\n{doc_results}", name="retrieval_agent")],
                    "workflow_trace": trace,
                    "citations": citations,
                    "status": "completed"
                }
            )

    return retrieval_node
