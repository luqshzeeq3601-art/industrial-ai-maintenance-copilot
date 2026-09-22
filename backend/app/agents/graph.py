"""Multi-agent StateGraph assembly and compilation with persistent SQLite checkpointing."""
import sqlite3
from typing import Optional, Any
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
_postgres_saver = None
_graph_instance = None

def get_checkpointer():
    """Return persistent SQLite or PostgreSQL checkpointer based on configuration."""
    global _checkpointer_conn, _postgres_saver

    # Check for PostgreSQL persistence
    if getattr(settings, "PERSISTENCE_BACKEND", "sqlite") == "postgres" and getattr(settings, "CHECKPOINT_DATABASE_URL", None):
        if _postgres_saver is None:
            try:
                from langgraph.checkpoint.postgres import PostgresSaver
                from psycopg_pool import ConnectionPool
                pool = ConnectionPool(conninfo=settings.CHECKPOINT_DATABASE_URL, max_size=20, kwargs={"autocommit": True})
                _postgres_saver = PostgresSaver(pool)
                _postgres_saver.setup()
            except Exception as e:
                import logging as _logging
                _logging.getLogger("copilot.agents.graph").warning(
                    "Postgres checkpointer unavailable, falling back to SqliteSaver: %s", e)
        if _postgres_saver is not None:
            return _postgres_saver

    settings.CHECKPOINT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _checkpointer_conn is None:
        _checkpointer_conn = sqlite3.connect(str(settings.CHECKPOINT_DB_PATH), check_same_thread=False)
        _checkpointer_conn.execute("PRAGMA journal_mode=WAL;")
        _checkpointer_conn.execute("PRAGMA busy_timeout=5000;")
    return SqliteSaver(_checkpointer_conn)

def build_maintenance_graph(checkpointer: Optional[Any] = None):
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
