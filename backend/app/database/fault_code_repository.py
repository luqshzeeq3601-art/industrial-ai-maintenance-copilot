"""Fault code repository."""
import sqlite3
from typing import List, Optional, Dict, Any
from backend.app.database.base import BaseRepository


class FaultCodeRepository(BaseRepository):
    def get_all_fault_codes(self) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT code, description, category, typical_cause, recommended_action, severity FROM fault_codes ORDER BY code")
            return [dict(r) for r in cur.fetchall()]
        finally:
            self._close_if_owned(conn)

    def get_fault_code(self, code: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT code, description, category, typical_cause, recommended_action, severity FROM fault_codes WHERE UPPER(code) = UPPER(?)",
                (code.strip(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            self._close_if_owned(conn)
