"""Run the test suite against a throwaway database, never the dev maintenance.db.

pytest imports this file before any test module, so the environment is set before
`backend.app.config.settings` is created. Environment variables take precedence over
`.env`, so DATABASE_PATH / CHECKPOINT_DB_PATH from `.env` are overridden here.
"""
import os
import shutil
import tempfile
from pathlib import Path

import pytest

_PREFIX = "copilot-tests-"
# Windows can keep SQLite files locked until the process exits; sweep directories earlier runs left behind
for _stale in Path(tempfile.gettempdir()).glob(f"{_PREFIX}*"):
    shutil.rmtree(_stale, ignore_errors=True)
_TEST_DIR = Path(tempfile.mkdtemp(prefix=_PREFIX))
os.environ["DATABASE_PATH"] = str(_TEST_DIR / "maintenance.db")
os.environ["CHECKPOINT_DB_PATH"] = str(_TEST_DIR / "checkpoints.db")
os.environ["PERSISTENCE_BACKEND"] = "sqlite"

from backend.app.config import settings  # noqa: E402  (must follow the env overrides)
from backend.app.database.models import init_db  # noqa: E402

# Guard: fail loudly rather than silently writing to the dev database
assert settings.DATABASE_PATH.resolve().is_relative_to(_TEST_DIR.resolve()), settings.DATABASE_PATH

# Seed the isolated database through the normal migrations before test modules import the app
init_db()


def _seed_maintenance_logs() -> None:
    """Deterministic repair history. Migrations don't seed maintenance_logs (only scripts/seed_db.py does, randomly)."""
    from datetime import datetime, timedelta
    from backend.app.database.models import get_connection

    now = datetime.utcnow()
    rows = [
        # (machine, fault, description, action, technician, days ago, minutes, parts, severity)
        ("EQ-1000", "E-402", "Spindle drive thermal overload", "Cleaned chiller filter, re-set bearing preload", "David Chen", 3, 150, "Chiller filter cartridge", "high"),
        ("EQ-1000", "M-102", "Spindle radial vibration above ISO limit", "Balanced tool holder, replaced drawbar spring", "Sarah Jenkins", 20, 240, "Drawbar spring set", "high"),
        ("EQ-1001", "E-501", "Tool magazine indexing timeout", "Cleared chip jam, recalibrated SQ14", "David Chen", 8, 90, None, "medium"),
        ("EQ-1002", "S-303", "G-code arc radius out of range", "Corrected post-processor output", "Marcus Wong", 40, 45, None, "low"),
        ("EQ-1003", "H-104", "Main hydraulic pump pressure drop", "Cleaned suction strainer, checked pilot pressure", "Sarah Jenkins", 12, 300, "Suction strainer gasket", "critical"),
        ("EQ-1004", "H-208", "Hydraulic fluid over-temperature trip", "Flushed plate heat exchanger", "David Chen", 65, 210, None, "high"),
    ]
    conn = get_connection()
    try:
        with conn:
            conn.executemany(
                "INSERT INTO maintenance_logs (machine_id, fault_code, fault_description, action_taken, technician, "
                "started_at, completed_at, duration_mins, parts_replaced, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (m, f, d, a, t, (now - timedelta(days=ago)).strftime("%Y-%m-%d %H:%M:%S"),
                     (now - timedelta(days=ago, minutes=-mins)).strftime("%Y-%m-%d %H:%M:%S"), mins, parts, sev)
                    for m, f, d, a, t, ago, mins, parts, sev in rows
                ],
            )
    finally:
        conn.close()


_seed_maintenance_logs()


@pytest.fixture(scope="session", autouse=True)
def _isolated_database():
    """Expose the temp directory and remove it when the session ends."""
    yield _TEST_DIR
    import gc
    from backend.app.agents import graph
    from backend.app.database import models

    conn = getattr(graph, "_checkpointer_conn", None)
    if conn is not None:
        conn.close()
    if models._engine is not None:
        models._engine.dispose()
    gc.collect()  # closes connections held only by collected repository objects
    shutil.rmtree(_TEST_DIR, ignore_errors=True)
