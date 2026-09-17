"""Multi-agent StateGraph assembly and compilation with persistent SQLite checkpointing."""
import sqlite3
from typing import Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from backend.app.config import settings
from backend.app.agents.state import AgentState
from backend.app.agents.supervisor import create_supervisor_node
from backend.app.agents.retrieval_agent import create_retrieval_node
from backend.app.agents.diagnostic_agent import create_diagnostic_node
from backend.app.agents.maintenance_agent import create_maintenance_node
from backend.app.agents.approval import create_approval_node

# Singleton instances
_checkpointer_conn = None
_graph_instance = None

def get_checkpointer() -> SqliteSaver:
    """Return persistent SQLite checkpointer with WAL mode and 5000ms busy timeout."""
    global _checkpointer_conn
    settings.CHECKPOINT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _checkpointer_conn is None:
        _checkpointer_conn = sqlite3.connect(str(settings.CHECKPOINT_DB_PATH), check_same_thread=False)
        _checkpointer_conn.execute("PRAGMA journal_mode=WAL;")
        _checkpointer_conn.execute("PRAGMA busy_timeout=5000;")
    return SqliteSaver(_checkpointer_conn)

def build_maintenance_graph(checkpointer: Optional[SqliteSaver] = None):
    """Build and compile the multi-agent industrial maintenance graph."""
    workflow = StateGraph(AgentState)

    # 1. Add Specialist & Control Nodes
    workflow.add_node("supervisor", create_supervisor_node())
    workflow.add_node("retrieval", create_retrieval_node())
    workflow.add_node("diagnostic", create_diagnostic_node())
    workflow.add_node("maintenance", create_maintenance_node())
    workflow.add_node("approval", create_approval_node())

    # 2. Add Graph Edges
    workflow.add_edge(START, "supervisor")

    # 3. Checkpointer for conversation state and interrupt persistence
    saver = checkpointer or get_checkpointer()

    # 4. Compile Graph
    graph = workflow.compile(checkpointer=saver)
    return graph

def get_graph():
    """Return graph singleton instance."""
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = build_maintenance_graph()
    return _graph_instance
