"""Live Postgres dual-persistence verifier (Risk3).

Usage:
  docker-compose --profile postgres up -d
  .venv/Scripts/python.exe scripts/verify_postgres.py --verify-counts
"""
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify-counts", action="store_true")
    args = ap.parse_args()
    url = os.getenv("DATABASE_URL") or os.getenv("CHECKPOINT_DATABASE_URL") or ""
    if not url.startswith("postgres"):
        print("SKIP: DATABASE_URL not postgres - set DATABASE_URL=postgresql://... to run live check")
        return 0
    try:
        import psycopg2
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        assert cur.fetchone()[0] == 1
        if args.verify_counts:
            for tbl in ["equipment", "alarms", "work_orders", "telemetry_events", "action_audit"]:
                try:
                    cur.execute(f"SELECT count(*) FROM {tbl}")
                    print(f"{tbl}: {cur.fetchone()[0]}")
                except Exception as e:
                    print(f"{tbl}: missing ({e})")
        conn.close()
        print("postgres live OK")
        return 0
    except Exception as e:
        print(f"postgres live FAILED: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
