"""Base repository with shared SQLite connection handling."""
import sqlite3
from typing import Optional
from backend.app.database.models import get_connection


class BaseRepository:
    def __init__(self, conn: Optional[sqlite3.Connection] = None):
        self._conn = conn

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn:
            return self._conn
        return get_connection()

    def _close_if_owned(self, conn: sqlite3.Connection) -> None:
        if not self._conn:
            conn.close()
