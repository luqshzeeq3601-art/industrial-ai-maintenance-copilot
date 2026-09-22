"""Tests for SQLAlchemy ORM persistence, dual checkpointers, and database migrations."""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from backend.app.database.models import (
    get_engine,
    get_session_factory,
    EquipmentModel,
    FaultCodeModel,
    MaintenanceLogModel,
    AlarmModel,
    TelemetryEventModel,
    ScheduledInspectionModel,
    Base,
)
from backend.app.agents.graph import get_checkpointer
from langgraph.checkpoint.sqlite import SqliteSaver


def test_sqlalchemy_engine_and_session():
    """Verify SQLAlchemy engine and session factory initialize properly."""
    engine = get_engine()
    assert engine is not None
    SessionFactory = get_session_factory()
    session = SessionFactory()
    try:
        assert isinstance(session, Session)
        # Query equipment via ORM
        equipment_list = session.query(EquipmentModel).all()
        assert len(equipment_list) >= 10
        first_eq = equipment_list[0]
        assert hasattr(first_eq, "machine_id")
        assert hasattr(first_eq, "name")
        assert hasattr(first_eq, "status")
    finally:
        session.close()


def test_sqlalchemy_fault_codes_and_logs():
    """Verify ORM models for fault codes and maintenance logs."""
    SessionFactory = get_session_factory()
    session = SessionFactory()
    try:
        fault_codes = session.query(FaultCodeModel).all()
        assert len(fault_codes) >= 18

        logs = session.query(MaintenanceLogModel).limit(5).all()
        assert len(logs) > 0
        assert logs[0].machine_id is not None
    finally:
        session.close()


def test_sqlalchemy_telemetry_events():
    """Verify ORM query on telemetry_events table."""
    SessionFactory = get_session_factory()
    session = SessionFactory()
    try:
        events = session.query(TelemetryEventModel).limit(5).all()
        assert isinstance(events, list)
    finally:
        session.close()


def test_checkpointer_sqlite_default():
    """Verify default checkpointer is SqliteSaver."""
    checkpointer = get_checkpointer()
    assert isinstance(checkpointer, SqliteSaver)


def test_checkpointer_postgres_configured():
    """Verify PostgresSaver configuration path when backend is postgres."""
    import sys
    from backend.app.config import settings

    mock_pool_module = MagicMock()
    mock_postgres_module = MagicMock()
    mock_saver = MagicMock()
    mock_postgres_module.PostgresSaver.return_value = mock_saver

    with patch.dict(sys.modules, {
        "psycopg_pool": mock_pool_module,
        "langgraph.checkpoint.postgres": mock_postgres_module,
    }):
        with patch.object(settings, "PERSISTENCE_BACKEND", "postgres"), \
             patch.object(settings, "CHECKPOINT_DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb"):

            import backend.app.agents.graph as graph_module
            graph_module._postgres_saver = None
            checkpointer = graph_module.get_checkpointer()

            assert checkpointer == mock_saver
            mock_saver.setup.assert_called_once()
            # Reset back to None
            graph_module._postgres_saver = None
