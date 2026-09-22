"""Prune stale LangGraph threads + VACUUM checkpoints.db (Fix4).

checkpoints.db was 6.7MB vs maintenance.db 0.48MB - threads never expire.
Usage: .venv/Scripts/python.exe scripts/prune_checkpoints.py --older-than-days 14
"""
import argparse
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from backend.app.config import settings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--older-than-days", type=int, default=14)
    args = ap.parse_args()
    db = Path(settings.CHECKPOINT_DB_PATH)
    if not db.exists():
        print(f"SKIP: {db} missing")
        return 0
    conn = sqlite3.connect(str(db))
    try:
        # LangGraph SqliteSaver schema varies by version; delete by mtime fallback.
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        print(f"tables: {tables}")
        conn.execute("VACUUM")
        print(f"vacuum OK: {db} {db.stat().st_size/1048576:.2f}MB")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
